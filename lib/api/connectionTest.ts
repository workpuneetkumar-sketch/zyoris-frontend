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

function classifyError(error: unknown, status?: number): ConnectionErrorCategory {
  const code = (error as { code?: unknown })?.code;
  const message = sanitizeText((error as { message?: unknown })?.message)?.toLowerCase() || "";

  if (code === "ECONNABORTED" || code === "ETIMEDOUT" || status === 408 || status === 504 || message.includes("timeout")) {
    return "TIMEOUT";
  }
  if (status === 401 || status === 403) return "AUTH";
  if (status === 429) return "RATE_LIMIT";
  if (status === 400 || status === 422) return "CONFIG";
  const networkCodes = new Set([
    "ERR_NETWORK",
    "ECONNRESET",
    "ECONNREFUSED",
    "ENOTFOUND",
    "EAI_AGAIN",
  ]);
  if (
    networkCodes.has(String(code)) ||
    /network|connect|reach|resolve|socket|dns/i.test(message)
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
  const records = response.recordsDetected ?? response.detectedRecords ?? response.recordsCount;
  const entities = response.entitiesDetected ?? response.entitiesCount;
  const diagnostics = sanitizeText(response.diagnostics) || sanitizeText(response.details?.message);

  return {
    success: true,
    statusCode: response.statusCode || response.httpStatus || 200,
    latencyMs: response.latencyMs ?? response.responseTime ?? latencyMs,
    message: sanitizeText(response.message) || "Connection established and verified successfully.",
    diagnostics,
    recordsDetected: typeof records === "number" ? records : undefined,
    entitiesDetected: typeof entities === "number" ? entities : undefined,
    testedAt: response.testedAt || response.timestamp || new Date().toISOString(),
  };
}

export function normalizeConnectionError(
  error: unknown,
  latencyMs?: number
): NormalizedConnectionTestResult {
  const statusCode = getStatus(error);
  const category = classifyError(error, statusCode);
  const responseData = (error as { response?: { data?: unknown } })?.response?.data;
  const message = responseData && typeof responseData === "object"
    ? sanitizeText((responseData as { message?: unknown }).message)
    : undefined;

  return {
    success: false,
    statusCode,
    latencyMs,
    message: message || connectionErrorMessages[category],
    errorCategory: category,
  };
}
