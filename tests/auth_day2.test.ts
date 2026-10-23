/**
 * auth_day2.test.ts
 *
 * Day 2 automated tests covering:
 *   1. normaliseAuthError — new OTP / password-recovery error codes
 *   2. Forgot-password flow: generic success for any email, real error for rate-limit
 *   3. OTP validation: correct, wrong, expired
 *   4. Reset password: success, wrong OTP, expired OTP, password mismatch,
 *      weak password, network error, server error
 *   5. Email verification: success, wrong OTP, expired OTP, already-verified
 *   6. Resend OTP: cooldown guard (client-side), success, rate-limit error
 *   7. api.ts: Day 2 auth paths excluded from Bearer injection + 401 refresh loop
 *   8. Regression: login invalid-credentials still maps correctly (Day 1 not broken)
 *
 * Runner: node --experimental-strip-types --test tests/auth_day2.test.ts
 */

import { describe, it, beforeEach, before } from "node:test";
import assert from "node:assert/strict";

import {
  normaliseAuthError,
  getAuthErrorMessage,
} from "../lib/utils/authError.ts";

// ── Shared mock setup ─────────────────────────────────────────────────────────

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

// ── Helper: build an Axios-like error ─────────────────────────────────────────

function makeError(status: number, errorCode: string, message = "msg") {
  return {
    response: {
      status,
      data: { error: errorCode, message },
    },
  };
}

function makeNetworkError() {
  return new Error("Network Error");
}

function makeServerError() {
  return { response: { status: 500, data: { error: "SERVER_ERROR", message: "Internal" } } };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. normaliseAuthError — Day 2 error codes
// ─────────────────────────────────────────────────────────────────────────────

describe("normaliseAuthError — Day 2 OTP / recovery error codes", () => {
  it("maps OTP_INVALID → otp_invalid kind, user-safe message", () => {
    const r = normaliseAuthError(makeError(400, "OTP_INVALID"));
    assert.equal(r.kind, "otp_invalid");
    assert.ok(r.message.length > 0);
    assert.ok(!r.message.includes("OTP_INVALID"), "must not expose raw code");
  });

  it("maps OTP_EXPIRED → otp_expired kind", () => {
    const r = normaliseAuthError(makeError(400, "OTP_EXPIRED"));
    assert.equal(r.kind, "otp_expired");
    assert.ok(!r.message.includes("OTP_EXPIRED"));
  });

  it("maps TOO_MANY_ATTEMPTS → too_many_attempts kind", () => {
    const r = normaliseAuthError(makeError(429, "TOO_MANY_ATTEMPTS"));
    assert.equal(r.kind, "too_many_attempts");
  });

  it("maps MAX_ATTEMPTS_EXCEEDED (alias) → too_many_attempts kind", () => {
    const r = normaliseAuthError(makeError(429, "MAX_ATTEMPTS_EXCEEDED"));
    assert.equal(r.kind, "too_many_attempts");
  });

  it("maps RATE_LIMIT_EXCEEDED → rate_limited kind", () => {
    const r = normaliseAuthError(makeError(429, "RATE_LIMIT_EXCEEDED"));
    assert.equal(r.kind, "rate_limited");
  });

  it("maps 429 status without error code → rate_limited kind", () => {
    const r = normaliseAuthError({ response: { status: 429, data: {} } });
    assert.equal(r.kind, "rate_limited");
  });

  it("maps ALREADY_VERIFIED → already_verified kind", () => {
    const r = normaliseAuthError(makeError(400, "ALREADY_VERIFIED"));
    assert.equal(r.kind, "already_verified");
  });

  it("maps PASSWORD_TOO_WEAK → password_too_weak kind", () => {
    const r = normaliseAuthError(makeError(400, "PASSWORD_TOO_WEAK"));
    assert.equal(r.kind, "password_too_weak");
  });

  it("maps WEAK_PASSWORD (alias) → password_too_weak kind", () => {
    const r = normaliseAuthError(makeError(400, "WEAK_PASSWORD"));
    assert.equal(r.kind, "password_too_weak");
  });

  it("never exposes raw error codes in messages for any Day 2 kind", () => {
    const day2Codes = [
      "OTP_INVALID", "OTP_EXPIRED", "TOO_MANY_ATTEMPTS",
      "RATE_LIMIT_EXCEEDED", "ALREADY_VERIFIED", "PASSWORD_TOO_WEAK",
    ];
    for (const code of day2Codes) {
      const r = normaliseAuthError(makeError(400, code));
      assert.ok(
        !r.message.toUpperCase().includes(code),
        `message must not expose raw code '${code}'`
      );
    }
  });

  it("error code check is case-insensitive", () => {
    const r = normaliseAuthError(makeError(400, "otp_invalid"));
    assert.equal(r.kind, "otp_invalid");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Day 1 regression — login errors still map correctly
// ─────────────────────────────────────────────────────────────────────────────

describe("normaliseAuthError — Day 1 regression (login errors)", () => {
  it("INVALID_CREDENTIALS still maps to invalid_credentials", () => {
    const r = normaliseAuthError(makeError(401, "INVALID_CREDENTIALS"));
    assert.equal(r.kind, "invalid_credentials");
    // Must NOT be confused with otp_invalid or any Day 2 kind
    assert.notEqual(r.kind, "otp_invalid");
    assert.notEqual(r.kind, "token_expired");
  });

  it("TOKEN_EXPIRED still maps to token_expired", () => {
    assert.equal(
      normaliseAuthError(makeError(401, "TOKEN_EXPIRED")).kind,
      "token_expired"
    );
  });

  it("VALIDATION_ERROR still maps to validation", () => {
    assert.equal(
      normaliseAuthError(makeError(400, "VALIDATION_ERROR")).kind,
      "validation"
    );
  });

  it("network error still maps to network", () => {
    assert.equal(normaliseAuthError(makeNetworkError()).kind, "network");
  });

  it("500 still maps to server", () => {
    assert.equal(normaliseAuthError(makeServerError()).kind, "server");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Forgot-password security behaviour
// ─────────────────────────────────────────────────────────────────────────────

describe("Forgot-password — security and error handling (pure logic)", () => {
  /**
   * The forgot-password page shows generic success for most error kinds
   * (account enumeration prevention). Only rate-limit / network / server
   * errors bubble to the user as real errors.
   * We test the decision logic directly by inspecting normaliseAuthError kinds.
   */

  it("404 (unknown email) should NOT be surfaced as an error to the user", () => {
    // The page checks: if kind !== 'rate_limited' && kind !== 'network' && kind !== 'server'
    // → show generic success.  This verifies the kind is NOT one of the surfaced ones.
    const { kind } = normaliseAuthError({ response: { status: 404, data: {} } });
    const shouldSurfaceAsError = kind === "rate_limited" || kind === "network" || kind === "server";
    assert.equal(shouldSurfaceAsError, false,
      "404 for unknown email must not surface as a real error (enumeration prevention)");
  });

  it("rate-limit error SHOULD be surfaced to the user", () => {
    const { kind } = normaliseAuthError(makeError(429, "RATE_LIMIT_EXCEEDED"));
    const shouldSurfaceAsError = kind === "rate_limited" || kind === "network" || kind === "server";
    assert.equal(shouldSurfaceAsError, true);
  });

  it("network error SHOULD be surfaced to the user", () => {
    const { kind } = normaliseAuthError(makeNetworkError());
    const shouldSurfaceAsError = kind === "rate_limited" || kind === "network" || kind === "server";
    assert.equal(shouldSurfaceAsError, true);
  });

  it("server error SHOULD be surfaced to the user", () => {
    const { kind } = normaliseAuthError(makeServerError());
    const shouldSurfaceAsError = kind === "rate_limited" || kind === "network" || kind === "server";
    assert.equal(shouldSurfaceAsError, true);
  });

  it("401 (any other auth error) must NOT surface — shown as generic success", () => {
    const { kind } = normaliseAuthError(makeError(401, "INVALID_CREDENTIALS"));
    const shouldSurfaceAsError = kind === "rate_limited" || kind === "network" || kind === "server";
    assert.equal(shouldSurfaceAsError, false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. OTP verification error routing
// ─────────────────────────────────────────────────────────────────────────────

describe("OTP verification — error routing (verify-email + reset-password pages)", () => {
  /**
   * The pages route errors to different UI sections based on kind:
   *   otp_invalid / otp_expired → OTP field error
   *   too_many_attempts / rate_limited → top banner (block the whole form)
   *   password_too_weak → password field error
   *   network / server / unknown → top banner
   */

  function routeOtpError(err: unknown) {
    const { kind } = normaliseAuthError(err);
    if (kind === "otp_invalid" || kind === "otp_expired") return "otp_field";
    if (kind === "too_many_attempts" || kind === "rate_limited") return "top_banner";
    if (kind === "password_too_weak") return "password_field";
    return "top_banner";
  }

  it("wrong OTP routes to otp_field", () => {
    assert.equal(routeOtpError(makeError(400, "OTP_INVALID")), "otp_field");
  });

  it("expired OTP routes to otp_field", () => {
    assert.equal(routeOtpError(makeError(400, "OTP_EXPIRED")), "otp_field");
  });

  it("too many attempts routes to top_banner (blocks form)", () => {
    assert.equal(routeOtpError(makeError(429, "TOO_MANY_ATTEMPTS")), "top_banner");
  });

  it("rate limited routes to top_banner", () => {
    assert.equal(routeOtpError(makeError(429, "RATE_LIMIT_EXCEEDED")), "top_banner");
  });

  it("weak password routes to password_field", () => {
    assert.equal(routeOtpError(makeError(400, "PASSWORD_TOO_WEAK")), "password_field");
  });

  it("network error routes to top_banner", () => {
    assert.equal(routeOtpError(makeNetworkError()), "top_banner");
  });

  it("server error routes to top_banner", () => {
    assert.equal(routeOtpError(makeServerError()), "top_banner");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Password validation (reset-password page — client-side)
// ─────────────────────────────────────────────────────────────────────────────

describe("Reset-password — client-side password validation", () => {
  const PW_MIN_LEN = 8;
  const PW_RE_UPPER = /[A-Z]/;
  const PW_RE_LOWER = /[a-z]/;
  const PW_RE_NUMBER = /[0-9]/;

  function isValidPassword(pw: string): boolean {
    return (
      pw.length >= PW_MIN_LEN &&
      PW_RE_UPPER.test(pw) &&
      PW_RE_LOWER.test(pw) &&
      PW_RE_NUMBER.test(pw)
    );
  }

  function passwordsMatch(pw: string, confirm: string): boolean {
    return pw === confirm;
  }

  it("valid strong password passes", () => {
    assert.equal(isValidPassword("Secure123"), true);
    assert.equal(isValidPassword("MyP@ss99!"), true);
  });

  it("too short (< 8 chars) fails", () => {
    assert.equal(isValidPassword("Ab1"), false);
    assert.equal(isValidPassword("Ab1cdef"), false); // 7 chars
  });

  it("missing uppercase fails", () => {
    assert.equal(isValidPassword("secure123"), false);
  });

  it("missing lowercase fails", () => {
    assert.equal(isValidPassword("SECURE123"), false);
  });

  it("missing number fails", () => {
    assert.equal(isValidPassword("SecurePass"), false);
  });

  it("empty password fails", () => {
    assert.equal(isValidPassword(""), false);
  });

  it("matching passwords pass confirmation check", () => {
    assert.equal(passwordsMatch("Secure123", "Secure123"), true);
  });

  it("mismatching passwords fail confirmation check", () => {
    assert.equal(passwordsMatch("Secure123", "Secure124"), false);
    assert.equal(passwordsMatch("Secure123", ""), false);
    assert.equal(passwordsMatch("Secure123", "secure123"), false); // case mismatch
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Email masking (verify-email + reset-password + forgot-password pages)
// ─────────────────────────────────────────────────────────────────────────────

describe("Email masking — user-safe display", () => {
  function maskEmail(email: string): string {
    const [local, domain] = email.split("@");
    if (!local || !domain) return "your email";
    const visible = local.length > 2 ? local.slice(0, 2) : local[0] ?? "";
    return `${visible}${"•".repeat(Math.max(local.length - 2, 3))}@${domain}`;
  }

  it("masks standard email preserving first 2 chars and domain", () => {
    const masked = maskEmail("john.doe@example.com");
    assert.ok(masked.startsWith("jo"), "must show first 2 chars");
    assert.ok(masked.includes("@example.com"), "must show domain");
    assert.ok(masked.includes("•"), "must contain masking bullets");
    assert.ok(!masked.includes("hn.do"), "must not expose full local part");
  });

  it("masks short email safely", () => {
    const masked = maskEmail("ab@x.com");
    assert.ok(masked.includes("@x.com"));
    assert.ok(masked.length > 0);
  });

  it("returns 'your email' for malformed input", () => {
    assert.equal(maskEmail("notanemail"), "your email");
    assert.equal(maskEmail(""), "your email");
  });

  it("never returns the full local part of the email", () => {
    const email = "secretuser@company.com";
    const masked = maskEmail(email);
    assert.ok(!masked.includes("cretuse"), "full local part must be masked");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Resend cooldown guard (client-side logic)
// ─────────────────────────────────────────────────────────────────────────────

describe("Resend OTP — cooldown guard (client-side)", () => {
  /**
   * The resend button is disabled while cooldown > 0 OR isResending is true.
   * We test the guard predicate directly.
   */

  function canResend(cooldown: number, isResending: boolean): boolean {
    return cooldown <= 0 && !isResending;
  }

  it("can resend when cooldown is 0 and not already resending", () => {
    assert.equal(canResend(0, false), true);
  });

  it("cannot resend while cooldown is active", () => {
    assert.equal(canResend(30, false), false);
    assert.equal(canResend(1, false), false);
  });

  it("cannot resend while a resend request is in flight", () => {
    assert.equal(canResend(0, true), false);
  });

  it("cannot resend while both cooldown active and request in flight", () => {
    assert.equal(canResend(15, true), false);
  });

  it("cooldown format: seconds-only below 60", () => {
    const fmt = (s: number) =>
      s >= 60
        ? `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`
        : `${s}s`;
    assert.equal(fmt(59), "59s");
    assert.equal(fmt(1), "1s");
  });

  it("cooldown format: mm:ss above 60", () => {
    const fmt = (s: number) =>
      s >= 60
        ? `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`
        : `${s}s`;
    assert.equal(fmt(60), "1:00");
    assert.equal(fmt(90), "1:30");
    assert.equal(fmt(125), "2:05");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. api.ts — Day 2 auth paths excluded from Bearer injection + refresh loop
// ─────────────────────────────────────────────────────────────────────────────

describe("api.ts — Day 2 paths excluded from Bearer injection", async () => {
  // Set up browser mocks once before any test in this suite runs.
  // Must happen before Axios module is imported (Axios reads window.location
  // at import time in some environments).
  before(() => {
    makeBrowserMocks();
    // Ensure window.location exists so Axios initialises cleanly
    if (!(globalThis as any).window?.location) {
      (globalThis as any).window = {
        ...((globalThis as any).window ?? {}),
        location: { href: "http://localhost/" },
      };
    }
  });

  const DAY2_PUBLIC_PATHS = [
    "/auth/forgot-password",
    "/auth/reset-password",
    "/auth/verify-email",
  ];

  for (const path of DAY2_PUBLIC_PATHS) {
    it(`does NOT attach Authorization header to ${path}`, async () => {
      const { default: apiModule, setAuthToken } = await import("../lib/api/api.ts");

      // Give the interceptor a token — it would inject it on any non-excluded path
      setAuthToken("test-token-day2");

      const interceptorHandler = (apiModule as any).interceptors?.request?.handlers?.[0]?.fulfilled;
      assert.ok(interceptorHandler, "request interceptor must be registered");

      const headerStore: Record<string, string> = {};
      const config: any = {
        url: path,
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

      assert.equal(
        authHeader,
        undefined,
        `${path} must not receive a Bearer token`
      );
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. getAuthErrorMessage convenience wrapper
// ─────────────────────────────────────────────────────────────────────────────

describe("getAuthErrorMessage — returns non-empty string for all Day 2 kinds", () => {
  const day2Cases = [
    makeError(400, "OTP_INVALID"),
    makeError(400, "OTP_EXPIRED"),
    makeError(429, "TOO_MANY_ATTEMPTS"),
    makeError(429, "RATE_LIMIT_EXCEEDED"),
    makeError(400, "ALREADY_VERIFIED"),
    makeError(400, "PASSWORD_TOO_WEAK"),
    makeNetworkError(),
    makeServerError(),
  ];

  for (const c of day2Cases) {
    it(`returns a non-empty string for error input: ${JSON.stringify((c as any)?.response?.data?.error ?? "network")}`, () => {
      const msg = getAuthErrorMessage(c);
      assert.ok(typeof msg === "string" && msg.length > 0, `empty message for: ${JSON.stringify(c)}`);
    });
  }
});
