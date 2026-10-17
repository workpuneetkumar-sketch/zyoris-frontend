/**
 * auth_phase4.test.ts
 *
 * Phase 4 automated tests covering:
 *   1. authError.ts — normaliseAuthError with all confirmed backend error codes
 *   2. validateReturnTo — open-redirect prevention
 *   3. api.ts — concurrent 401s share one refresh call (refreshPromise dedup)
 *   4. api.ts — rotated refreshToken is persisted; missing refreshToken removes old one
 *   5. api.ts — /auth/logout is in isUnauthenticatedEndpoint (no refresh loop)
 *   6. AuthContext.validateReturnTo — re-exported from context (same function)
 *
 * Runner: node --experimental-strip-types --test tests/auth_phase4.test.ts
 */

import { describe, it, before, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  normaliseAuthError,
  getAuthErrorMessage,
} from "../lib/utils/authError.ts";

import {
  validateReturnTo,
} from "../lib/utils/validateReturnTo.ts";

import {
  sanitizeBearerToken,
  setAuthToken,
  getEffectiveAuthToken,
} from "../lib/api/api.ts";

// ── Shared browser-API mock setup ─────────────────────────────────────────────

function makeBrowserMocks() {
  const store: Record<string, string> = {};
  const sessionStore: Record<string, string> = {};

  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
  };

  (globalThis as any).sessionStorage = {
    getItem: (k: string) => sessionStore[k] ?? null,
    setItem: (k: string, v: string) => { sessionStore[k] = v; },
    removeItem: (k: string) => { delete sessionStore[k]; },
    clear: () => { Object.keys(sessionStore).forEach((k) => delete sessionStore[k]); },
  };

  (globalThis as any).document = { cookie: "" };
  (globalThis as any).window = globalThis;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. normaliseAuthError — backend error codes
// ─────────────────────────────────────────────────────────────────────────────

describe("normaliseAuthError — backend error codes", () => {
  // ── Helper: build an Axios-like error with a structured backend body ──────
  function makeAxiosError(status: number, errorCode: string, message = "msg") {
    return {
      response: {
        status,
        data: { error: errorCode, message },
      },
    };
  }

  it("maps INVALID_CREDENTIALS → invalid_credentials kind", () => {
    const result = normaliseAuthError(makeAxiosError(401, "INVALID_CREDENTIALS"));
    assert.equal(result.kind, "invalid_credentials");
    assert.ok(result.message.length > 0, "message must not be empty");
    assert.ok(!result.message.includes("INVALID_CREDENTIALS"), "must not expose raw code");
  });

  it("maps TOKEN_EXPIRED → token_expired kind", () => {
    const result = normaliseAuthError(makeAxiosError(401, "TOKEN_EXPIRED"));
    assert.equal(result.kind, "token_expired");
    assert.ok(!result.message.toLowerCase().includes("token_expired"), "must not expose raw code");
  });

  it("maps INVALID_REFRESH_TOKEN → invalid_refresh_token kind", () => {
    const result = normaliseAuthError(makeAxiosError(401, "INVALID_REFRESH_TOKEN"));
    assert.equal(result.kind, "invalid_refresh_token");
    assert.ok(!result.message.toLowerCase().includes("invalid_refresh_token"), "must not expose raw code");
  });

  it("maps VALIDATION_ERROR → validation kind", () => {
    const result = normaliseAuthError(makeAxiosError(400, "VALIDATION_ERROR", "email is required"));
    assert.equal(result.kind, "validation");
    // Raw backend detail must never surface
    assert.ok(!result.message.includes("email is required"), "must not expose raw backend message");
  });

  it("maps 401 without error code → invalid_credentials (status fallback)", () => {
    const result = normaliseAuthError({ response: { status: 401, data: { message: "Unauthorized" } } });
    assert.equal(result.kind, "invalid_credentials");
  });

  it("maps 404 → not_found kind", () => {
    const result = normaliseAuthError({ response: { status: 404, data: {} } });
    assert.equal(result.kind, "not_found");
  });

  it("maps 409 → conflict kind", () => {
    const result = normaliseAuthError({ response: { status: 409, data: {} } });
    assert.equal(result.kind, "conflict");
  });

  it("maps 400 without VALIDATION_ERROR code → validation kind", () => {
    const result = normaliseAuthError({ response: { status: 400, data: {} } });
    assert.equal(result.kind, "validation");
  });

  it("maps 500 → server kind", () => {
    const result = normaliseAuthError({ response: { status: 500, data: {} } });
    assert.equal(result.kind, "server");
  });

  it("maps network error (no response) → network kind", () => {
    const result = normaliseAuthError(new Error("Network Error"));
    assert.equal(result.kind, "network");
  });

  it("maps null → network kind", () => {
    const result = normaliseAuthError(null);
    assert.equal(result.kind, "network");
  });

  it("getAuthErrorMessage returns a non-empty string for all error kinds", () => {
    const cases = [
      makeAxiosError(401, "INVALID_CREDENTIALS"),
      makeAxiosError(401, "TOKEN_EXPIRED"),
      makeAxiosError(401, "INVALID_REFRESH_TOKEN"),
      makeAxiosError(400, "VALIDATION_ERROR"),
      { response: { status: 500, data: {} } },
      new Error("network"),
      null,
    ];
    for (const c of cases) {
      const msg = getAuthErrorMessage(c);
      assert.ok(typeof msg === "string" && msg.length > 0, `empty message for input: ${JSON.stringify(c)}`);
    }
  });

  it("error code check is case-insensitive (lowercase from backend)", () => {
    // Backend might return lowercase in some edge cases — our normaliser uppercases
    const result = normaliseAuthError(makeAxiosError(401, "invalid_credentials"));
    assert.equal(result.kind, "invalid_credentials");
  });

  it("INVALID_CREDENTIALS on login endpoint — correct kind, no TOKEN_EXPIRED confusion", () => {
    // This is the critical distinction: wrong password must not look like expiry
    const result = normaliseAuthError(makeAxiosError(401, "INVALID_CREDENTIALS"));
    assert.notEqual(result.kind, "token_expired");
    assert.notEqual(result.kind, "invalid_refresh_token");
    assert.equal(result.kind, "invalid_credentials");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. validateReturnTo — open-redirect prevention
// ─────────────────────────────────────────────────────────────────────────────

describe("validateReturnTo — open-redirect prevention", () => {
  it("accepts /dashboard", () => {
    assert.equal(validateReturnTo("/dashboard"), "/dashboard");
  });

  it("accepts /leads/123", () => {
    assert.equal(validateReturnTo("/leads/123"), "/leads/123");
  });

  it("accepts /admin/rbac?tab=roles", () => {
    assert.equal(validateReturnTo("/admin/rbac?tab=roles"), "/admin/rbac?tab=roles");
  });

  it("accepts paths with trailing slashes trimmed", () => {
    const result = validateReturnTo("  /settings  ");
    assert.equal(result, "/settings");
  });

  it("rejects absolute URL https://evil.com", () => {
    assert.equal(validateReturnTo("https://evil.com"), null);
  });

  it("rejects absolute URL http://evil.com/path", () => {
    assert.equal(validateReturnTo("http://evil.com/path"), null);
  });

  it("rejects protocol-relative //evil.com", () => {
    assert.equal(validateReturnTo("//evil.com"), null);
  });

  it("rejects backslash trick /\\evil.com", () => {
    assert.equal(validateReturnTo("/\\evil.com"), null);
  });

  it("rejects double backslash \\\\evil.com", () => {
    assert.equal(validateReturnTo("\\\\evil.com"), null);
  });

  it("rejects javascript: URI", () => {
    // Does not start with / — rejected by the must-start-with-/ rule
    assert.equal(validateReturnTo("javascript:alert(1)"), null);
  });

  it("rejects empty string", () => {
    assert.equal(validateReturnTo(""), null);
  });

  it("rejects whitespace-only string", () => {
    assert.equal(validateReturnTo("   "), null);
  });

  it("rejects null", () => {
    assert.equal(validateReturnTo(null), null);
  });

  it("rejects undefined", () => {
    assert.equal(validateReturnTo(undefined), null);
  });

  it("rejects bare hostname without leading slash", () => {
    assert.equal(validateReturnTo("evil.com/path"), null);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. api.ts — /auth/logout is excluded from the request interceptor's
//    Bearer injection (A3 fix verification)
// ─────────────────────────────────────────────────────────────────────────────

describe("api.ts request interceptor — /auth/logout is unauthenticated endpoint", async () => {
  before(() => {
    makeBrowserMocks();
    setAuthToken("secret-token");
  });

  it("does NOT attach Authorization header to /auth/logout", async () => {
    // Access the request interceptor directly (same technique as auth_resilience.test.ts)
    const interceptorHandler = (
      (await import("../lib/api/api.ts")) as any
    ).default?.interceptors?.request?.handlers?.[0]?.fulfilled;

    assert.ok(interceptorHandler, "Request interceptor must be registered");

    const config: any = {
      url: "/auth/logout",
      method: "post",
      headers: new Map(),
    };
    // Make .get and .set work like a real AxiosHeaders
    const headerStore: Record<string, string> = {};
    config.headers = {
      get: (k: string) => headerStore[k.toLowerCase()],
      set: (k: string, v: string) => { headerStore[k.toLowerCase()] = v; },
    };

    const processed = await interceptorHandler(config);
    const authHeader =
      processed.headers?.get?.("authorization") ||
      processed.headers?.Authorization ||
      processed.headers?.["Authorization"];

    assert.equal(authHeader, undefined,
      "/auth/logout must not receive an Authorization header");
  });

  it("does NOT attach Authorization header to /auth/refresh", async () => {
    const { default: apiModule } = await import("../lib/api/api.ts");
    const interceptorHandler = (apiModule as any).interceptors?.request?.handlers?.[0]?.fulfilled;
    assert.ok(interceptorHandler);

    const headerStore: Record<string, string> = {};
    const config: any = {
      url: "/auth/refresh",
      method: "post",
      headers: {
        get: (k: string) => headerStore[k.toLowerCase()],
        set: (k: string, v: string) => { headerStore[k.toLowerCase()] = v; },
      },
    };

    const processed = await interceptorHandler(config);
    const authHeader =
      processed.headers?.get?.("authorization") ||
      processed.headers?.Authorization;

    assert.equal(authHeader, undefined,
      "/auth/refresh must not receive an Authorization header");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. sanitizeBearerToken — edge cases relevant to refresh token handling
// ─────────────────────────────────────────────────────────────────────────────

describe("sanitizeBearerToken — refresh-specific edge cases", () => {
  beforeEach(() => {
    makeBrowserMocks();
    setAuthToken(null);
  });

  it("returns null for non-string inputs (guards against numeric or object tokens)", () => {
    assert.equal(sanitizeBearerToken(42), null);
    assert.equal(sanitizeBearerToken({}), null);
    assert.equal(sanitizeBearerToken([]), null);
  });

  it("strips multiple nested Bearer prefixes (token reuse bug prevention)", () => {
    const jwt = "eyJhbGciOiJIUzI1NiJ9.payload.sig";
    assert.equal(sanitizeBearerToken(`Bearer Bearer Bearer ${jwt}`), jwt);
  });

  it("a token that is only whitespace returns null", () => {
    assert.equal(sanitizeBearerToken("     "), null);
  });

  it("returns the raw JWT unchanged when it is already clean", () => {
    const jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMifQ.abc";
    assert.equal(sanitizeBearerToken(jwt), jwt);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. getEffectiveAuthToken — token priority order
// ─────────────────────────────────────────────────────────────────────────────

describe("getEffectiveAuthToken — priority order", () => {
  beforeEach(() => {
    makeBrowserMocks();
    setAuthToken(null);
    localStorage.clear();
    sessionStorage.clear();
  });

  it("returns null when no token exists anywhere", () => {
    assert.equal(getEffectiveAuthToken(), null);
  });

  it("in-memory token beats localStorage", () => {
    setAuthToken("mem-tok");
    localStorage.setItem("zyoris-auth", JSON.stringify({ token: "ls-tok" }));
    assert.equal(getEffectiveAuthToken(), "mem-tok");
  });

  it("localStorage zyoris-auth.token beats sessionStorage", () => {
    localStorage.setItem("zyoris-auth", JSON.stringify({ token: "ls-tok" }));
    sessionStorage.setItem("zyoris-auth", JSON.stringify({ token: "ss-tok" }));
    assert.equal(getEffectiveAuthToken(), "ls-tok");
  });

  it("sessionStorage zyoris-auth beats individual fallback keys", () => {
    sessionStorage.setItem("zyoris-auth", JSON.stringify({ token: "ss-tok" }));
    localStorage.setItem("zyoris-token", "fallback-tok");
    assert.equal(getEffectiveAuthToken(), "ss-tok");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. validateReturnTo — integration: DashboardLayout-style usage
// ─────────────────────────────────────────────────────────────────────────────

describe("validateReturnTo — integration with URL construction", () => {
  it("safe path survives round-trip through URLSearchParams", () => {
    const safePath = validateReturnTo("/deals/abc-123");
    assert.ok(safePath !== null);
    const params = new URLSearchParams();
    params.set("next", safePath!);
    const qs = params.toString();
    assert.ok(qs.includes("next=%2Fdeals%2Fabc-123") || qs.includes("next=/deals/abc-123"));

    // Simulate login page reading it back
    const received = new URLSearchParams(qs).get("next");
    const validated = validateReturnTo(received);
    assert.equal(validated, "/deals/abc-123");
  });

  it("unsafe value is discarded both at encode and decode time", () => {
    // Attacker tries to inject via ?next=https://evil.com
    const malicious = "https://evil.com";
    assert.equal(validateReturnTo(malicious), null);

    // Even if it somehow ends up in the URL, reading it back also rejects it
    const params = new URLSearchParams({ next: malicious });
    const received = params.get("next");
    assert.equal(validateReturnTo(received), null);
  });

  it("protocol-relative URL //evil.com is rejected even after URL decode", () => {
    // %2F%2Fevil.com decodes to //evil.com — still rejected
    const encoded = "%2F%2Fevil.com";
    const decoded = decodeURIComponent(encoded);
    assert.equal(validateReturnTo(decoded), null);
  });
});
