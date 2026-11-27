import { StructuredAiValidationError } from "../schemas/marketingAiSchemas.ts";

export type MarketingAiErrorCode =
  | "RATE_LIMITED"
  | "ENDPOINT_UNAVAILABLE"
  | "PERMISSION_DENIED"
  | "UNAUTHORIZED"
  | "VALIDATION_ERROR"
  | "SERVICE_UNAVAILABLE"
  | "UNKNOWN_ERROR";

export interface NormalizedMarketingAiError {
  code: MarketingAiErrorCode;
  title: string;
  message: string;
  retryable: boolean;
  resetAt?: string | null;
  statusCode?: number;
  validationIssues?: string[];
}

export function normalizeMarketingAiError(err: unknown): NormalizedMarketingAiError {
  if (err instanceof StructuredAiValidationError) {
    return {
      code: "VALIDATION_ERROR",
      title: "AI output could not be verified",
      message: err.message,
      retryable: true,
      validationIssues: err.issues,
    };
  }

  const anyErr = err as {
    response?: {
      status?: number;
      data?: {
        message?: string;
        error?: string;
        code?: string;
        resetAt?: string;
      };
    };
    code?: string;
    message?: string;
  };

  const status = anyErr?.response?.status;
  const serverData = anyErr?.response?.data;
  const serverMsg = serverData?.message || serverData?.error;
  const serverCode = serverData?.code;

  if (status === 429 || serverCode === "AI_USAGE_LIMIT_EXCEEDED") {
    return {
      code: "RATE_LIMITED",
      title: "AI generation limit reached",
      message:
        serverMsg ||
        "You have reached your AI Marketing generation limit for this period. Please wait for the limit to reset or contact your workspace admin.",
      retryable: false,
      resetAt: serverData?.resetAt ?? null,
      statusCode: status ?? 429,
    };
  }

  if (status === 404 || status === 501) {
    return {
      code: "ENDPOINT_UNAVAILABLE",
      title: "Backend AI endpoint not deployed yet",
      message:
        serverMsg ||
        "This Marketing AI endpoint is not live on the backend server yet. Share the API specification with your backend team to enable live generation.",
      retryable: true,
      statusCode: status,
    };
  }

  if (status === 403) {
    return {
      code: "PERMISSION_DENIED",
      title: "Permission required",
      message:
        serverMsg ||
        "You do not have permission to run this Marketing AI action. Ask your administrator to grant marketing or AI access.",
      retryable: false,
      statusCode: 403,
    };
  }

  if (status === 401) {
    return {
      code: "UNAUTHORIZED",
      title: "Session expired",
      message: "Please sign in again to continue using Zyoris Marketing AI.",
      retryable: false,
      statusCode: 401,
    };
  }

  if (status === 400 || status === 422) {
    return {
      code: "VALIDATION_ERROR",
      title: "Please check your inputs",
      message:
        serverMsg || "Some fields in your brief are missing or invalid.",
      retryable: false,
      statusCode: status,
    };
  }

  if (
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    anyErr?.code === "ECONNABORTED" ||
    anyErr?.code === "ERR_NETWORK"
  ) {
    return {
      code: "SERVICE_UNAVAILABLE",
      title: "AI service temporarily unavailable",
      message:
        serverMsg ||
        "The AI service took too long or is temporarily unavailable. Your brief is preserved — please try again.",
      retryable: true,
      statusCode: status,
    };
  }

  return {
    code: "UNKNOWN_ERROR",
    title: "Could not complete AI request",
    message:
      serverMsg ||
      anyErr?.message ||
      "An unexpected error occurred. Please try again.",
    retryable: true,
    statusCode: status,
  };
}
