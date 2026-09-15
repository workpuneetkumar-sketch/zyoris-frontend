import {
  ConnectionErrorCategory,
  NormalizedConnectionTestResult,
  TestConnectionResponse,
} from "@/types/integrations";

export const connectionErrorMessages: Record<ConnectionErrorCategory, string> = {
  AUTH: "Authentication failed. Check the integration credentials and permissions.",
  TIMEOUT: "Connection timed out. The remote service did not respond in time.",
  NETWORK: "Network failure. Unable to reach the remote service.",
  RATE_LIMIT: "The remote service is rate limiting requests. Try again shortly.",
  CONFIG: "The integration configuration was rejected by the remote service.",
  SERVER: "The remote service encountered an internal error. Try again later.",
  UNKNOWN: "The connection test failed. Check the configuration and try again.",
};

const sensitiveFieldPattern = /(api[-_]?key|password|secret|client[-_]?secret|access[-_]?token|refresh[-_]?token|authorization|bearer|token|cookie|credentials?)/i;
const sensitiveJsonValuePattern = new RegExp(
  `(["']?\\b${sensitiveFieldPattern.source}["']?\\s*:\\s*)(?:"(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*'|\\{[^{}]*\\}|\\[[^\\[\\]]*\\]|[^,}\\s]+)`,
  "gi"
);
const sensitiveAssignmentPattern = new RegExp(
  `(["']?\\b${sensitiveFieldPattern.source}["']?\\s*[=:]\\s*)(?:"(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*'|[^,;&\\s]+)`,
  "gi"
);

function sanitizeText(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "object") {
    try {
      return sanitizeText(JSON.stringify(value));
    } catch {
      return undefined;
    }
  }
  if (typeof value !== "string" || !value.trim()) return undefined;
  if (/\n\s*at\s+|\b(?:Error|AxiosError):\s*[^\n]+\n/.test(value)) return undefined;

  return value
    .replace(/ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/g, "[REDACTED]")
    .replace(/Bearer\s+[A-Za-z0-9_\-.]+/gi, "Bearer [REDACTED]")
    .replace(sensitiveJsonValuePattern, "$1[REDACTED]")
    .replace(sensitiveAssignmentPattern, "$1[REDACTED]")
    .replace(/:\/\/[^:]+:[^@]+@/g, "://[REDACTED]@")
    .replace(/([a-zA-Z]:\\[^\s:<>|"?*]+|\/(var|etc|usr|home|app|root|tmp)\/[^\s:<>|"?*]+)/gi, "[SERVER_PATH]")
    .trim();
}

function getStatus(error: unknown): number | undefined {
  const status = (error as { response?: { status?: unknown } })?.response?.status;
  return typeof status === "number" ? status : undefined;
}

function mapBackendCategory(rawCat?: string): ConnectionErrorCategory | undefined {
  if (!rawCat) return undefined;
  const upper = rawCat.toUpperCase();
  if (upper === "AUTHENTICATION" || upper === "AUTH") return "AUTH";
  if (upper === "TIMEOUT") return "TIMEOUT";
  if (upper === "NETWORK") return "NETWORK";
  if (upper === "RATE_LIMIT") return "RATE_LIMIT";
  if (upper === "CONFIGURATION" || upper === "CONFIG") return "CONFIG";
  if (upper === "SERVER") return "SERVER";
  return "UNKNOWN";
}

function classifyError(error: unknown, status?: number): ConnectionErrorCategory {
  const responseData = (error as { response?: { data?: any } })?.response?.data;
  const backendCategory = mapBackendCategory(responseData?.error?.category || responseData?.category);
  if (backendCategory) return backendCategory;

  const code = (error as { code?: unknown })?.code;
  const message = sanitizeText((error as { message?: unknown })?.message)?.toLowerCase() || "";

  if (code === "ECONNABORTED" || code === "ETIMEDOUT" || status === 408 || status === 504 || message.includes("timeout")) {
    return "TIMEOUT";
  }
  if (status === 401 || status === 403) return "AUTH";
  if (status === 429) return "RATE_LIMIT";
  if (status === 400 || status === 404 || status === 422) return "CONFIG";
  const networkCodes = new Set([
    "ERR_NETWORK",
    "ECONNRESET",
    "ECONNREFUSED",
    "ENOTFOUND",
    "EAI_AGAIN",
  ]);
  if (
    networkCodes.has(String(code)) ||
    /\b(network error|econnrefused|econnreset|enotfound|dns|socket hang up|failed to fetch)\b/i.test(message)
  ) {
    return "NETWORK";
  }
  if (typeof status === "number" && status >= 500) return "SERVER";
  return "UNKNOWN";
}

export function normalizeConnectionSuccess(
  response: TestConnectionResponse,
  latencyMs: number
): NormalizedConnectionTestResult {
  const records = response.recordCount ?? response.recordsDetected ?? response.detectedRecords ?? response.recordsCount;
  const entities = response.entitiesDetected ?? response.entitiesCount;
  
  let diagnosticsText: string | undefined;
  if (typeof response.diagnostics === "string") {
    diagnosticsText = sanitizeText(response.diagnostics);
  } else if (response.diagnostics && typeof response.diagnostics === "object") {
    diagnosticsText = sanitizeText(
      `Provider: ${response.diagnostics.provider || response.provider || "-"} | Status: ${response.diagnostics.httpStatus || response.httpStatus || 200} | Latency: ${response.diagnostics.responseTimeMs ?? response.responseTimeMs ?? latencyMs}ms`
    );
  } else if (response.details?.message) {
    diagnosticsText = sanitizeText(response.details.message);
  }

  return {
    success: true,
    statusCode: response.httpStatus || response.statusCode || 200,
    latencyMs: response.responseTimeMs ?? response.latencyMs ?? response.responseTime ?? latencyMs,
    message: sanitizeText(response.message) || "Connection established and verified successfully.",
    diagnostics: diagnosticsText,
    recordsDetected: typeof records === "number" ? records : undefined,
    entitiesDetected: typeof entities === "number" ? entities : undefined,
    testedAt: response.testedAt || response.timestamp || new Date().toISOString(),
  };
}

export function normalizeConnectionError(
  error: unknown,
  latencyMs?: number
): NormalizedConnectionTestResult {
  const rawStatus = getStatus(error);
  const statusCode = typeof rawStatus === "number" && rawStatus >= 400 ? rawStatus : undefined;
  const category = classifyError(error, rawStatus);
  const responseData = (error as { response?: { data?: any } })?.response?.data;
  const rawMessage = (error as { message?: unknown })?.message;
  
  const backendError = responseData?.error;
  const backendErrorMsg = typeof backendError === "object" ? backendError?.message : undefined;
  const retryable = typeof backendError === "object" ? backendError?.retryable : undefined;
  const retryAfterSeconds = typeof backendError === "object" ? backendError?.retryAfterSeconds : undefined;

  const message = responseData && typeof responseData === "object"
    ? sanitizeText(backendErrorMsg || responseData.message || responseData.error)
    : (typeof rawMessage === "string" && !rawMessage.includes("AsyncRequestError") ? sanitizeText(rawMessage) : undefined);

  return {
    success: false,
    statusCode,
    latencyMs,
    message: message || connectionErrorMessages[category],
    errorCategory: category,
    retryable,
    retryAfterSeconds,
  };
}
