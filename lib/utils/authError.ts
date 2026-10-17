/**
 * authError.ts
 *
 * Single source of truth for converting raw Axios / network errors from auth
 * endpoints into user-safe, display-ready strings.
 *
 * Rules:
 *  - Never expose raw backend messages, stack traces, or internal field names.
 *  - Check the backend `error` code field FIRST (most specific), then HTTP
 *    status code, then raw message keywords (legacy fallback).
 *  - Always provide a generic fallback so callers never show `undefined`.
 *
 * Confirmed backend error codes (from backend lead, 2024):
 *   INVALID_CREDENTIALS      – 401, wrong email or password
 *   TOKEN_EXPIRED            – 401, access token is expired
 *   INVALID_REFRESH_TOKEN    – 401, refresh token is expired or revoked
 *   VALIDATION_ERROR         – 400, missing / malformed fields
 *
 * Consumed by:
 *  - context/AuthContext.tsx  (sets context.error on login / register failure)
 *  - app/login/page.tsx       (error banner on screens)
 *  - components/auth/loginForm.tsx
 */

export type AuthErrorKind =
  | "invalid_credentials"   // wrong email or password
  | "token_expired"         // access token expired (use refresh)
  | "invalid_refresh_token" // refresh token expired / revoked — must re-login
  | "not_found"             // no account with that email
  | "conflict"              // email already registered
  | "validation"            // 400 malformed request
  | "network"               // no response / timeout / CORS
  | "server"                // 5xx
  | "unknown";

export interface NormalisedAuthError {
  /** Stable machine-readable kind — safe to switch on in UI logic. */
  kind: AuthErrorKind;
  /** Human-readable message — safe to display directly to the user. */
  message: string;
}

/**
 * Normalise any thrown value from an auth API call into a `NormalisedAuthError`.
 */
export function normaliseAuthError(error: unknown): NormalisedAuthError {
  // ── No response: network / timeout / CORS ──────────────────────────────────
  if (!isAxiosLike(error) || !error.response) {
    return {
      kind: "network",
      message: "Connection failed. Please check your internet and try again.",
    };
  }

  const status = error.response.status as number;
  const data = error.response.data as Record<string, unknown> | undefined;

  // ── Backend structured error code — checked BEFORE status/message ──────────
  // The backend always sets `error` as a machine-readable constant string.
  const errorCode = typeof data?.error === "string" ? data.error.toUpperCase() : "";

  if (errorCode === "INVALID_CREDENTIALS") {
    return {
      kind: "invalid_credentials",
      message: "Invalid email or password. Please try again.",
    };
  }

  if (errorCode === "TOKEN_EXPIRED") {
    return {
      kind: "token_expired",
      // Keep user-safe — tell them their session expired, not technical details.
      message: "Your session has expired. Please sign in again.",
    };
  }

  if (errorCode === "INVALID_REFRESH_TOKEN") {
    return {
      kind: "invalid_refresh_token",
      message: "Your session is no longer valid. Please sign in again.",
    };
  }

  if (errorCode === "VALIDATION_ERROR") {
    // `details` may be a string, an array, or an object — do not render raw.
    return {
      kind: "validation",
      message: "Please check your details and try again.",
    };
  }

  // ── Status-code fallbacks (for backends that don't set `error` code) ────────
  const rawMessage = String(
    data?.message ?? data?.msg ?? ""
  ).toLowerCase();

  if (
    status === 401 ||
    rawMessage.includes("unauthorized") ||
    rawMessage.includes("invalid credentials") ||
    rawMessage.includes("invalid email or password") ||
    rawMessage.includes("incorrect password")
  ) {
    return {
      kind: "invalid_credentials",
      message: "Invalid email or password. Please try again.",
    };
  }

  if (
    status === 404 ||
    rawMessage.includes("user not found") ||
    rawMessage.includes("no sign up") ||
    rawMessage.includes("sign up first") ||
    rawMessage.includes("account not found")
  ) {
    return {
      kind: "not_found",
      message: "No account found with that email. Please sign up first.",
    };
  }

  if (
    status === 409 ||
    rawMessage.includes("already exists") ||
    rawMessage.includes("already registered") ||
    rawMessage.includes("duplicate")
  ) {
    return {
      kind: "conflict",
      message: "An account with this email already exists. Please sign in.",
    };
  }

  if (status === 400) {
    return {
      kind: "validation",
      message: "Please check your details and try again.",
    };
  }

  if (status >= 500) {
    return {
      kind: "server",
      message: "Something went wrong on our end. Please try again shortly.",
    };
  }

  return {
    kind: "unknown",
    message: "An unexpected error occurred. Please try again.",
  };
}

/**
 * Convenience wrapper — returns just the display string.
 */
export function getAuthErrorMessage(error: unknown): string {
  return normaliseAuthError(error).message;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

interface AxiosLikeError {
  response?: {
    status: number;
    data?: unknown;
  };
  code?: string;
  message?: string;
}

function isAxiosLike(err: unknown): err is AxiosLikeError {
  return typeof err === "object" && err !== null && "response" in err;
}
