/**
 * authError.ts
 *
 * Single source of truth for converting raw Axios / network errors from auth
 * endpoints into user-safe, display-ready strings.
 *
 * Rules:
 *  - Never expose raw backend messages, stack traces, or internal API details.
 *  - Check the backend `error` code field FIRST (most specific), then HTTP
 *    status code, then raw message keywords (legacy fallback).
 *  - Always provide a generic fallback so callers never show `undefined`.
 *
 * Confirmed backend error codes:
 *   Day 1 (login/register/session):
 *     INVALID_CREDENTIALS      – 401, wrong email or password
 *     TOKEN_EXPIRED            – 401, access token is expired
 *     INVALID_REFRESH_TOKEN    – 401, refresh token is expired or revoked
 *     VALIDATION_ERROR         – 400, missing / malformed fields
 *
 *   Day 2 (OTP / email verification / password recovery):
 *     OTP_INVALID              – OTP does not match stored value
 *     OTP_EXPIRED              – OTP has passed its 5-minute window
 *     TOO_MANY_ATTEMPTS        – failed attempts threshold exceeded
 *     RATE_LIMIT_EXCEEDED      – too many requests in a time window (429)
 *     USER_NOT_FOUND           – email not registered (only on reset flow)
 *     ALREADY_VERIFIED         – email has already been verified
 *     PASSWORD_TOO_WEAK        – new password does not meet strength rules
 *
 *   Day 3 (account state):
 *     ACCOUNT_DISABLED         – account has been administratively disabled
 *     ACCOUNT_INACTIVE         – account is pending activation / not yet active
 *     ACCOUNT_SUSPENDED        – account has been suspended
 *     EMAIL_NOT_VERIFIED       – login blocked because email hasn't been verified
 *
 * Consumed by:
 *  - context/AuthContext.tsx
 *  - app/forgot-password/page.tsx
 *  - app/verify-email/page.tsx
 *  - app/reset-password/page.tsx
 *  - app/login/page.tsx
 *  - components/auth/loginForm.tsx
 */

export type AuthErrorKind =
  // ── Day 1 ──────────────────────────────────────────────────────────────────
  | "invalid_credentials"
  | "token_expired"
  | "invalid_refresh_token"
  | "not_found"
  | "conflict"
  | "validation"
  | "network"
  | "server"
  | "unknown"
  // ── Day 2 ──────────────────────────────────────────────────────────────────
  | "otp_invalid"          // OTP entered is wrong
  | "otp_expired"          // OTP has passed its expiry window
  | "too_many_attempts"    // too many failed OTP tries
  | "rate_limited"         // too many requests (429)
  | "already_verified"     // email already verified — not an error for users
  | "password_too_weak"    // new password fails strength requirements
  // ── Day 3 ──────────────────────────────────────────────────────────────────
  | "account_disabled"     // admin disabled this account
  | "account_inactive"     // account not yet activated
  | "email_not_verified";  // login blocked — email must be verified first

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
  const errorCode =
    typeof data?.error === "string" ? data.error.toUpperCase() : "";

  // ── Day 2 error codes ───────────────────────────────────────────────────────

  if (errorCode === "OTP_INVALID") {
    return {
      kind: "otp_invalid",
      message: "The code you entered is incorrect. Please check and try again.",
    };
  }

  if (errorCode === "OTP_EXPIRED") {
    return {
      kind: "otp_expired",
      message: "This code has expired. Please request a new one.",
    };
  }

  if (
    errorCode === "TOO_MANY_ATTEMPTS" ||
    errorCode === "MAX_ATTEMPTS_EXCEEDED"
  ) {
    return {
      kind: "too_many_attempts",
      message:
        "Too many failed attempts. Please wait a few minutes before trying again.",
    };
  }

  if (
    errorCode === "RATE_LIMIT_EXCEEDED" ||
    errorCode === "RATE_LIMITED" ||
    status === 429
  ) {
    return {
      kind: "rate_limited",
      message:
        "Too many requests. Please wait a moment before trying again.",
    };
  }

  if (errorCode === "ALREADY_VERIFIED") {
    return {
      kind: "already_verified",
      message: "This email address has already been verified.",
    };
  }

  if (
    errorCode === "PASSWORD_TOO_WEAK" ||
    errorCode === "WEAK_PASSWORD"
  ) {
    return {
      kind: "password_too_weak",
      message:
        "Password does not meet the requirements. Please choose a stronger password.",
    };
  }

  // ── Day 3 error codes ───────────────────────────────────────────────────────

  if (
    errorCode === "ACCOUNT_DISABLED" ||
    errorCode === "ACCOUNT_SUSPENDED" ||
    errorCode === "USER_DISABLED" ||
    errorCode === "USER_SUSPENDED"
  ) {
    return {
      kind: "account_disabled",
      message:
        "This account has been disabled. Please contact your administrator.",
    };
  }

  if (
    errorCode === "ACCOUNT_INACTIVE" ||
    errorCode === "ACCOUNT_NOT_ACTIVE" ||
    errorCode === "USER_INACTIVE" ||
    errorCode === "USER_NOT_ACTIVE"
  ) {
    return {
      kind: "account_inactive",
      message:
        "This account is not yet active. Please contact your administrator.",
    };
  }

  if (
    errorCode === "EMAIL_NOT_VERIFIED" ||
    errorCode === "EMAIL_UNVERIFIED" ||
    errorCode === "UNVERIFIED_EMAIL"
  ) {
    return {
      kind: "email_not_verified",
      message:
        "Please verify your email address before signing in. Check your inbox for a verification code.",
    };
  }

  // ── Day 1 error codes ───────────────────────────────────────────────────────

  if (errorCode === "INVALID_CREDENTIALS") {
    return {
      kind: "invalid_credentials",
      message: "Invalid email or password. Please try again.",
    };
  }

  if (errorCode === "TOKEN_EXPIRED") {
    return {
      kind: "token_expired",
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
    return {
      kind: "validation",
      message: "Please check your details and try again.",
    };
  }

  // ── Status-code fallbacks ────────────────────────────────────────────────────
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
    // Account-state messages that arrive as 401 must be surfaced, not swallowed
    if (
      rawMessage.includes("disabled") ||
      rawMessage.includes("suspended")
    ) {
      return {
        kind: "account_disabled",
        message: "This account has been disabled. Please contact your administrator.",
      };
    }
    if (rawMessage.includes("inactive") || rawMessage.includes("not active")) {
      return {
        kind: "account_inactive",
        message: "This account is not yet active. Please contact your administrator.",
      };
    }
    if (rawMessage.includes("not verified") || rawMessage.includes("verify your email")) {
      return {
        kind: "email_not_verified",
        message:
          "Please verify your email address before signing in. Check your inbox for a verification code.",
      };
    }
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
