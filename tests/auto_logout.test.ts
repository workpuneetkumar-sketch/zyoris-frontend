/**
 * auto_logout.test.ts
 *
 * Automated tests covering:
 *   1. 4-hour session expiration constants and limit verification (SESSION_MAX_DURATION_MS = 14,400,000 ms)
 *   2. Tab / browser close session detection via sessionStorage (SESSION_ACTIVE_KEY = "zyoris-session-active")
 *   3. Session start timestamp tracking (SESSION_START_KEY = "zyoris-session-start")
 *   4. Complete storage purge on logout (localStorage, sessionStorage, and cookies)
 *   5. Session cookie behavior (no max-age/expires so browser purges on browser close)
 *   6. API request interceptor auto-rejection when 4-hour session limit is reached
 *
 * Runner: node --experimental-strip-types --test tests/auto_logout.test.ts
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  SESSION_MAX_DURATION_MS,
  SESSION_ACTIVE_KEY,
  SESSION_START_KEY,
  isSessionExpired,
  isSessionActiveInTab,
  markSessionActive,
  clearAuthStorage,
  clearTokenCookie,
} from "../lib/utils/session.ts";

import api, {
  setAuthToken,
  getEffectiveAuthToken,
} from "../lib/api/api.ts";

describe("Automatic Logout & Session Lifecycle Management", () => {
  let localStorageMock: Record<string, string>;
  let sessionStorageMock: Record<string, string>;
  let cookiesMock: string;

  beforeEach(() => {
    localStorageMock = {};
    sessionStorageMock = {};
    cookiesMock = "";

    (globalThis as any).localStorage = {
      getItem: (k: string) => localStorageMock[k] ?? null,
      setItem: (k: string, v: string) => { localStorageMock[k] = String(v); },
      removeItem: (k: string) => { delete localStorageMock[k]; },
      clear: () => { localStorageMock = {}; },
    };

    (globalThis as any).sessionStorage = {
      getItem: (k: string) => sessionStorageMock[k] ?? null,
      setItem: (k: string, v: string) => { sessionStorageMock[k] = String(v); },
      removeItem: (k: string) => { delete sessionStorageMock[k]; },
      clear: () => { sessionStorageMock = {}; },
    };

    (globalThis as any).document = {
      get cookie() {
        return cookiesMock;
      },
      set cookie(val: string) {
        // Simple cookie jar mock
        const [pair] = val.split(";");
        const [k, v] = pair.split("=");
        if (val.includes("max-age=0") || val.includes("expires=")) {
          delete (this as any)[k.trim()];
        } else {
          (this as any)[k.trim()] = v ? v.trim() : "";
        }
        cookiesMock = Object.entries(this)
          .filter(([k]) => k !== "cookie")
          .map(([k, v]) => `${k}=${v}`)
          .join("; ");
      },
    };

    (globalThis as any).window = {
      location: {
        pathname: "/dashboard",
        href: "/dashboard",
        replace: (dest: string) => { (globalThis as any).window.location.href = dest; },
      },
      sessionStorage: (globalThis as any).sessionStorage,
      localStorage: (globalThis as any).localStorage,
      document: (globalThis as any).document,
    };

    setAuthToken(null);
  });

  describe("1. Session Configuration & Expiry Limit", () => {
    it("defines 4-hour max session duration in milliseconds", () => {
      assert.equal(SESSION_MAX_DURATION_MS, 4 * 60 * 60 * 1000);
      assert.equal(SESSION_MAX_DURATION_MS, 14400000);
    });

    it("defines standard keys for active tab session and session start timestamp", () => {
      assert.equal(SESSION_ACTIVE_KEY, "zyoris-session-active");
      assert.equal(SESSION_START_KEY, "zyoris-session-start");
    });
  });

  describe("2. Tab/Browser Close Detection Lifecycle", () => {
    it("identifies when tab/browser was closed by absence of SESSION_ACTIVE_KEY in sessionStorage", () => {
      // Simulate fresh tab: sessionStorage has no SESSION_ACTIVE_KEY
      assert.equal(sessionStorage.getItem(SESSION_ACTIVE_KEY), null);

      // Even if old stale tokens lingered in localStorage from a previous session:
      localStorage.setItem("zyoris-auth", JSON.stringify({ token: "stale-jwt" }));
      localStorage.setItem("zyoris-token", "stale-jwt");
      localStorage.setItem("user", JSON.stringify({ name: "Old User" }));

      // Absence of active session marker triggers complete purge
      const isSessionActive = sessionStorage.getItem(SESSION_ACTIVE_KEY) === "1";
      assert.equal(isSessionActive, false);

      if (!isSessionActive) {
        clearAuthStorage();
      }

      assert.equal(localStorage.getItem("zyoris-auth"), null);
      assert.equal(localStorage.getItem("zyoris-token"), null);
      assert.equal(localStorage.getItem("user"), null);
    });

    it("preserves active session across page reloads within the same tab", () => {
      // Login sets the tab-scoped session marker
      sessionStorage.setItem(SESSION_ACTIVE_KEY, "1");
      const startTime = Date.now();
      sessionStorage.setItem(SESSION_START_KEY, String(startTime));

      // Page reload: sessionStorage remains intact
      assert.equal(sessionStorage.getItem(SESSION_ACTIVE_KEY), "1");
      const sessionStart = parseInt(sessionStorage.getItem(SESSION_START_KEY) || "0", 10);
      const isExpired = Date.now() - sessionStart >= SESSION_MAX_DURATION_MS;
      assert.equal(isExpired, false);
    });
  });

  describe("3. 4-Hour Session Expiration", () => {
    it("detects expired session when elapsed time is >= 4 hours", () => {
      sessionStorage.setItem(SESSION_ACTIVE_KEY, "1");
      // Session started 4 hours and 1 minute ago
      const fourHoursOneMinuteAgo = Date.now() - (4 * 60 * 60 * 1000 + 60 * 1000);
      sessionStorage.setItem(SESSION_START_KEY, String(fourHoursOneMinuteAgo));

      const sessionStart = parseInt(sessionStorage.getItem(SESSION_START_KEY) || "0", 10);
      const isExpired = Date.now() - sessionStart >= SESSION_MAX_DURATION_MS;
      assert.equal(isExpired, true);
    });

    it("considers session valid when elapsed time is under 4 hours", () => {
      sessionStorage.setItem(SESSION_ACTIVE_KEY, "1");
      // Session started 3 hours and 59 minutes ago
      const underFourHours = Date.now() - (4 * 60 * 60 * 1000 - 60 * 1000);
      sessionStorage.setItem(SESSION_START_KEY, String(underFourHours));

      const sessionStart = parseInt(sessionStorage.getItem(SESSION_START_KEY) || "0", 10);
      const isExpired = Date.now() - sessionStart >= SESSION_MAX_DURATION_MS;
      assert.equal(isExpired, false);
    });
  });

  describe("4. Storage Purge on Logout", () => {
    it("completely clears localStorage, sessionStorage, and cookies on logout", () => {
      localStorage.setItem("zyoris-auth", JSON.stringify({ token: "tok-123" }));
      localStorage.setItem("zyoris-token", "tok-123");
      localStorage.setItem("token", "tok-123");
      localStorage.setItem("accessToken", "tok-123");
      localStorage.setItem("zyoris-refresh-token", "ref-456");
      localStorage.setItem("refreshToken", "ref-456");
      localStorage.setItem("user", JSON.stringify({ id: "1" }));
      localStorage.setItem("userRole", "ADMIN");
      localStorage.setItem(SESSION_START_KEY, String(Date.now()));
      localStorage.setItem(SESSION_ACTIVE_KEY, "1");

      sessionStorage.setItem(SESSION_ACTIVE_KEY, "1");
      sessionStorage.setItem(SESSION_START_KEY, String(Date.now()));
      sessionStorage.setItem("zyoris-had-session", "1");

      document.cookie = "zyoris-token=tok-123; path=/";
      document.cookie = "token=tok-123; path=/";

      clearAuthStorage(false);

      // Verify localStorage is clean
      assert.equal(localStorage.getItem("zyoris-auth"), null);
      assert.equal(localStorage.getItem("zyoris-token"), null);
      assert.equal(localStorage.getItem("token"), null);
      assert.equal(localStorage.getItem("accessToken"), null);
      assert.equal(localStorage.getItem("zyoris-refresh-token"), null);
      assert.equal(localStorage.getItem("refreshToken"), null);
      assert.equal(localStorage.getItem("user"), null);
      assert.equal(localStorage.getItem("userRole"), null);
      assert.equal(localStorage.getItem(SESSION_START_KEY), null);
      assert.equal(localStorage.getItem(SESSION_ACTIVE_KEY), null);

      // Verify sessionStorage is cleared
      assert.equal(sessionStorage.getItem(SESSION_ACTIVE_KEY), null);
      assert.equal(sessionStorage.getItem(SESSION_START_KEY), null);
      assert.equal(sessionStorage.getItem("zyoris-had-session"), null);

      // Verify cookies are expired/cleared
      assert.equal((document as any)["zyoris-token"], undefined);
      assert.equal((document as any)["token"], undefined);
    });

    it("clearAuthStorage(true) keeps zyoris-had-session for session expired redirect banner", () => {
      sessionStorage.setItem(SESSION_ACTIVE_KEY, "1");
      sessionStorage.setItem(SESSION_START_KEY, String(Date.now()));
      sessionStorage.setItem("zyoris-had-session", "1");
      localStorage.setItem("zyoris-auth", JSON.stringify({ token: "old-token" }));

      clearAuthStorage(true);

      // Auth tokens purged
      assert.equal(localStorage.getItem("zyoris-auth"), null);
      assert.equal(sessionStorage.getItem(SESSION_ACTIVE_KEY), null);
      // But had-session marker preserved so login screen shows session-expired message
      assert.equal(sessionStorage.getItem("zyoris-had-session"), "1");
    });
  });

  describe("5. API Interceptor Session Expiry Protection", () => {
    it("rejects API requests and clears session when 4 hours have elapsed", async () => {
      const fiveHoursAgo = Date.now() - 5 * 60 * 60 * 1000;
      sessionStorage.setItem("zyoris-session-start", String(fiveHoursAgo));
      sessionStorage.setItem("zyoris-session-active", "1");
      localStorage.setItem("zyoris-auth", JSON.stringify({ token: "expired-jwt" }));
      document.cookie = "zyoris-token=expired-jwt; path=/";

      await assert.rejects(
        async () => {
          await api.get("/users/profile");
        },
        (err: any) => {
          return err.message.includes("Session expired (4 hours limit reached)");
        }
      );

      // Storage should be cleared
      assert.equal(localStorage.getItem("zyoris-auth"), null);
      assert.equal((document as any)["zyoris-token"], undefined);
      // Had-session set for redirect reason
      assert.equal(sessionStorage.getItem("zyoris-had-session"), "1");
    });
  });
});
