/**
 * session.ts
 *
 * Session lifecycle management:
 * - 4-hour automatic session expiration tracking
 * - Tab/browser close detection via tab-scoped sessionStorage
 * - Complete storage & cookie purging upon logout or expiry
 */

import { setAuthToken } from "../api/api.ts";

export const STORAGE_KEY = "zyoris-auth";
export const TOKEN_COOKIE = "zyoris-token";

export const SESSION_MAX_DURATION_MS = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
export const SESSION_ACTIVE_KEY = "zyoris-session-active";
export const SESSION_START_KEY = "zyoris-session-start";

/**
 * Returns true if the session timestamp is older than maxDurationMs (default 4 hours).
 */
export function isSessionExpired(
  startTimeMs: number | null | undefined,
  maxDurationMs: number = SESSION_MAX_DURATION_MS
): boolean {
  if (!startTimeMs || isNaN(startTimeMs) || startTimeMs <= 0) return true;
  return Date.now() - startTimeMs >= maxDurationMs;
}

/**
 * Checks whether this browser tab has an active session.
 * sessionStorage is isolated to the tab/window and is discarded when the tab/browser is closed.
 */
export function isSessionActiveInTab(): boolean {
  if (typeof window === "undefined" || typeof sessionStorage === "undefined") {
    return false;
  }
  try {
    return sessionStorage.getItem(SESSION_ACTIVE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Marks this tab as active and records session start timestamp in sessionStorage and localStorage.
 */
export function markSessionActive(): void {
  const nowStr = String(Date.now());
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(SESSION_ACTIVE_KEY, "1");
      sessionStorage.setItem(SESSION_START_KEY, nowStr);
      sessionStorage.setItem("zyoris-had-session", "1");
    }
  } catch {}
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(SESSION_START_KEY, nowStr);
    }
  } catch {}
}

/**
 * Clears all authentication-related cookies.
 */
export function clearTokenCookie(): void {
  if (typeof document === "undefined") return;
  const keys = [TOKEN_COOKIE, "token", "accessToken", "refreshToken", "zyoris-refresh-token"];
  keys.forEach((k) => {
    document.cookie = `${k}=; path=/; max-age=0; SameSite=Lax`;
    document.cookie = `${k}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
  });
}

/**
 * Completely purges all stored tokens, user profile, and session metadata from:
 * - localStorage
 * - sessionStorage
 * - cookies
 * - Axios memory token
 *
 * @param keepHadSession When true (e.g. session timeout), preserves 'zyoris-had-session'
 *                       so the login page can display the "Session expired" banner.
 */
export function clearAuthStorage(keepHadSession = false): void {
  try {
    setAuthToken(null);
  } catch {}

  const storageKeys = [
    STORAGE_KEY,
    "zyoris-token",
    "token",
    "accessToken",
    "zyoris-refresh-token",
    "refreshToken",
    "zyoris-register-userId",
    "user",
    "userRole",
    SESSION_START_KEY,
    SESSION_ACTIVE_KEY,
  ];

  storageKeys.forEach((key) => {
    try {
      if (typeof localStorage !== "undefined") localStorage.removeItem(key);
    } catch {}
    try {
      if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(key);
    } catch {}
  });

  if (!keepHadSession) {
    try {
      if (typeof sessionStorage !== "undefined") sessionStorage.removeItem("zyoris-had-session");
    } catch {}
  }

  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.clear();
      if (keepHadSession) {
        sessionStorage.setItem("zyoris-had-session", "1");
      }
    }
  } catch {}

  clearTokenCookie();
}
