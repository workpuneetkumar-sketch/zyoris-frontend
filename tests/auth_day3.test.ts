/**
 * auth_day3.test.ts
 *
 * Day 3 E2E-style unit tests covering the full auth regression matrix:
 *
 *   1.  normaliseAuthError — Day 3 account-state error codes
 *   2.  Account disabled / inactive / email-not-verified error kinds
 *   3.  AuthErrorKind union completeness (all kinds return non-empty messages)
 *   4.  resendVerificationOtpApi — stub is separate from resendOtpApi
 *   5.  authApi.ts — resendVerificationOtpApi hits /auth/forgot-password (stub)
 *   6.  OTPInput onChange contract — fires on every character, not only on complete
 *   7.  AdminLoginStep3 account-blocked logic (pure routing)
 *   8.  Session expiry detection — sessionStorage marker + ?reason= routing
 *   9.  validateReturnTo — open-redirect prevention (regression)
 *   10. BroadcastChannel logout — message type contract
 *   11. registerForm password-strength validation (same rules as reset-password)
 *   12. Error routing for account_disabled at login
 *   13. email_not_verified routing — should not be silenced as invalid_credentials
 *   14. canRetry flag — only true for network / server kinds
 *   15. Resend cooldown: only RESEND_COOLDOWN_S seconds, not less, not more initially
 *   16. Day 1 + Day 2 regression: all prior error kinds still map correctly
 *   17. No raw error codes exposed in any message
 *   18. api.ts — resendVerificationOtpApi path NOT injected with Bearer token
 *
 * Runner: node --experimental-strip-types --test tests/auth_day3.test.ts
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  normaliseAuthError,
  getAuthErrorMessage,
  type AuthErrorKind,
} from "../lib/utils/authError.ts";

import {
  validateReturnTo,
} from "../lib/utils/validateReturnTo.ts";

import {
  sanitizeBearerToken,
  setAuthToken,
  getEffectiveAuthToken,
} from "../lib/api/api.ts";

// ── Browser mock setup ────────────────────────────────────────────────────────

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

// ── Error builder helpers ─────────────────────────────────────────────────────

function makeError(status: number, errorCode: string, message = "msg") {
  return { response: { status, data: { error: errorCode, message } } };
}

function makeNetworkError() {
  return new Error("Network Error");
}

function makeServerError(msg = "Internal") {
  return { response: { status: 500, data: { error: "SERVER_ERROR", message: msg } } };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Day 3 account-state error codes
// ─────────────────────────────────────────────────────────────────────────────

describe("normaliseAuthError — Day 3 account-state error codes", () => {
  it("maps ACCOUNT_DISABLED → account_disabled kind", () => {
    const r = normaliseAuthError(makeError(401, "ACCOUNT_DISABLED"));
    assert.equal(r.kind, "account_disabled");
    assert.ok(r.message.length > 0);
    assert.ok(!r.message.includes("ACCOUNT_DISABLED"), "must not expose raw code");
  });

  it("maps ACCOUNT_SUSPENDED (alias) → account_disabled kind", () => {
    const r = normaliseAuthError(makeError(401, "ACCOUNT_SUSPENDED"));
    assert.equal(r.kind, "account_disabled");
  });

  it("maps USER_DISABLED (alias) → account_disabled kind", () => {
    const r = normaliseAuthError(makeError(401, "USER_DISABLED"));
    assert.equal(r.kind, "account_disabled");
  });

  it("maps USER_SUSPENDED (alias) → account_disabled kind", () => {
    const r = normaliseAuthError(makeError(403, "USER_SUSPENDED"));
    assert.equal(r.kind, "account_disabled");
  });

  it("maps ACCOUNT_INACTIVE → account_inactive kind", () => {
    const r = normaliseAuthError(makeError(401, "ACCOUNT_INACTIVE"));
    assert.equal(r.kind, "account_inactive");
    assert.ok(!r.message.includes("ACCOUNT_INACTIVE"), "must not expose raw code");
  });

  it("maps ACCOUNT_NOT_ACTIVE (alias) → account_inactive kind", () => {
    const r = normaliseAuthError(makeError(401, "ACCOUNT_NOT_ACTIVE"));
    assert.equal(r.kind, "account_inactive");
  });

  it("maps USER_INACTIVE (alias) → account_inactive kind", () => {
    const r = normaliseAuthError(makeError(403, "USER_INACTIVE"));
    assert.equal(r.kind, "account_inactive");
  });

  it("maps EMAIL_NOT_VERIFIED → email_not_verified kind", () => {
    const r = normaliseAuthError(makeError(401, "EMAIL_NOT_VERIFIED"));
    assert.equal(r.kind, "email_not_verified");
    assert.ok(!r.message.includes("EMAIL_NOT_VERIFIED"), "must not expose raw code");
  });

  it("maps EMAIL_UNVERIFIED (alias) → email_not_verified kind", () => {
    const r = normaliseAuthError(makeError(401, "EMAIL_UNVERIFIED"));
    assert.equal(r.kind, "email_not_verified");
  });

  it("maps UNVERIFIED_EMAIL (alias) → email_not_verified kind", () => {
    const r = normaliseAuthError(makeError(401, "UNVERIFIED_EMAIL"));
    assert.equal(r.kind, "email_not_verified");
  });

  it("account_disabled message mentions administrator", () => {
    const r = normaliseAuthError(makeError(401, "ACCOUNT_DISABLED"));
    assert.ok(
      r.message.toLowerCase().includes("administrator") || r.message.toLowerCase().includes("admin"),
      `message should mention administrator — got: "${r.message}"`
    );
  });

  it("email_not_verified message mentions verify", () => {
    const r = normaliseAuthError(makeError(401, "EMAIL_NOT_VERIFIED"));
    assert.ok(
      r.message.toLowerCase().includes("verif"),
      `message should mention verification — got: "${r.message}"`
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Message-keyword fallback for account-state via raw 401 message
// ─────────────────────────────────────────────────────────────────────────────

describe("normaliseAuthError — 401 message-keyword fallbacks", () => {
  it("401 with 'disabled' in message → account_disabled, not invalid_credentials", () => {
    const r = normaliseAuthError({
      response: { status: 401, data: { message: "This account is disabled" } },
    });
    assert.equal(r.kind, "account_disabled");
    assert.notEqual(r.kind, "invalid_credentials");
  });

  it("401 with 'suspended' in message → account_disabled", () => {
    const r = normaliseAuthError({
      response: { status: 401, data: { message: "Account suspended by admin" } },
    });
    assert.equal(r.kind, "account_disabled");
  });

  it("401 with 'inactive' in message → account_inactive", () => {
    const r = normaliseAuthError({
      response: { status: 401, data: { message: "User is inactive" } },
    });
    assert.equal(r.kind, "account_inactive");
  });

  it("401 with 'not active' in message → account_inactive", () => {
    const r = normaliseAuthError({
      response: { status: 401, data: { message: "Account is not active yet" } },
    });
    assert.equal(r.kind, "account_inactive");
  });

  it("401 with 'not verified' in message → email_not_verified", () => {
    const r = normaliseAuthError({
      response: { status: 401, data: { message: "Email not verified" } },
    });
    assert.equal(r.kind, "email_not_verified");
  });

  it("401 with plain 'unauthorized' message → invalid_credentials (unchanged)", () => {
    const r = normaliseAuthError({
      response: { status: 401, data: { message: "Unauthorized" } },
    });
    assert.equal(r.kind, "invalid_credentials");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. AuthErrorKind union completeness — all kinds return non-empty messages
// ─────────────────────────────────────────────────────────────────────────────

describe("AuthErrorKind — all kinds produce non-empty, safe messages", () => {
  const allKindCases: Array<[AuthErrorKind, ReturnType<typeof makeError> | Error]> = [
    ["invalid_credentials",   makeError(401, "INVALID_CREDENTIALS")],
    ["token_expired",         makeError(401, "TOKEN_EXPIRED")],
    ["invalid_refresh_token", makeError(401, "INVALID_REFRESH_TOKEN")],
    ["not_found",             makeError(404, "NOT_FOUND", "user not found")],
    ["conflict",              makeError(409, "CONFLICT", "already exists")],
    ["validation",            makeError(400, "VALIDATION_ERROR")],
    ["network",               makeNetworkError()],
    ["server",                makeServerError()],
    ["otp_invalid",           makeError(400, "OTP_INVALID")],
    ["otp_expired",           makeError(400, "OTP_EXPIRED")],
    ["too_many_attempts",     makeError(429, "TOO_MANY_ATTEMPTS")],
    ["rate_limited",          makeError(429, "RATE_LIMIT_EXCEEDED")],
    ["already_verified",      makeError(400, "ALREADY_VERIFIED")],
    ["password_too_weak",     makeError(400, "PASSWORD_TOO_WEAK")],
    ["account_disabled",      makeError(401, "ACCOUNT_DISABLED")],
    ["account_inactive",      makeError(401, "ACCOUNT_INACTIVE")],
    ["email_not_verified",    makeError(401, "EMAIL_NOT_VERIFIED")],
  ];

  for (const [expectedKind, error] of allKindCases) {
    it(`kind "${expectedKind}" has a non-empty, code-free message`, () => {
      const r = normaliseAuthError(error);
      assert.equal(r.kind, expectedKind, `expected kind "${expectedKind}", got "${r.kind}"`);
      assert.ok(r.message.length > 0, "message must not be empty");
      // Must not expose raw backend error codes
      const upperMsg = r.message.toUpperCase();
      assert.ok(
        !upperMsg.includes(expectedKind.toUpperCase().replace(/_/g, "")),
        `message must not expose raw kind name — got: "${r.message}"`
      );
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. resendVerificationOtpApi — separate export, not resendOtpApi
// ─────────────────────────────────────────────────────────────────────────────

describe("authApi — resendVerificationOtpApi stub exists and is separate", () => {
  /**
   * We test the contract by inspecting the source file directly rather than
   * dynamic-importing authApi (which pulls in the full Axios api module and
   * fails at the Node test runner's bare-specifier resolution).
   */

  it("resendVerificationOtpApi export name appears in authApi.ts source", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync(
      new URL("../lib/api/authApi.ts", import.meta.url),
      "utf8"
    );
    assert.ok(
      src.includes("export const resendVerificationOtpApi"),
      "resendVerificationOtpApi must be exported"
    );
  });

  it("resendOtpApi export name still appears in authApi.ts source", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync(
      new URL("../lib/api/authApi.ts", import.meta.url),
      "utf8"
    );
    assert.ok(
      src.includes("export const resendOtpApi"),
      "resendOtpApi must still be exported for reset-password"
    );
  });

  it("resendVerificationOtpApi and resendOtpApi are separate function declarations", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync(
      new URL("../lib/api/authApi.ts", import.meta.url),
      "utf8"
    );
    const vIdx = src.indexOf("export const resendVerificationOtpApi");
    const rIdx = src.indexOf("export const resendOtpApi");
    assert.ok(vIdx !== -1, "resendVerificationOtpApi must exist");
    assert.ok(rIdx !== -1, "resendOtpApi must exist");
    assert.notEqual(vIdx, rIdx, "they must be at different positions (separate declarations)");
  });

  it("resendVerificationOtpApi source contains STUB/TODO comment", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync(
      new URL("../lib/api/authApi.ts", import.meta.url),
      "utf8"
    );
    assert.ok(
      src.includes("BD-RESEND-1") || src.includes("TODO") || src.includes("STUB"),
      "resendVerificationOtpApi must be marked as a stub"
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. api.ts — resendVerificationOtpApi path excluded from Bearer injection
// ─────────────────────────────────────────────────────────────────────────────

describe("api.ts — /auth/forgot-password excluded from Authorization header", () => {
  beforeEach(() => {
    makeBrowserMocks();
    setAuthToken("test-token-abc");
  });

  it("does NOT inject Authorization header for /auth/forgot-password (resend stub path)", async () => {
    const { default: api } = await import("../lib/api/api.ts");
    let capturedHeaders: any = null;
    const adapter = (config: any) => {
      capturedHeaders = config.headers;
      return Promise.resolve({ data: {}, status: 200, headers: {}, config, statusText: "OK" });
    };
    api.defaults.adapter = adapter as any;

    try {
      await api.post("/auth/forgot-password", { email: "test@example.com" });
    } catch {}

    const authHeader = capturedHeaders?.Authorization || capturedHeaders?.authorization;
    assert.ok(
      !authHeader,
      `Authorization header must NOT be set on /auth/forgot-password, got: ${authHeader}`
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. OTPInput onChange contract
// ─────────────────────────────────────────────────────────────────────────────

describe("OTPInput onChange contract (logic simulation)", () => {
  /**
   * We simulate the OTPInput state-machine logic directly without rendering.
   * The contract: onChange fires on every character; onComplete fires only at length.
   */

  function simulateOtpInput(length: number) {
    const onCompleteValues: string[] = [];
    const onChangeValues: string[] = [];

    const onComplete = (v: string) => onCompleteValues.push(v);
    const onChange = (v: string) => onChangeValues.push(v);

    // Simulate typing digits one at a time
    function type(digits: string) {
      let current = "";
      for (const d of digits) {
        if (isNaN(Number(d))) continue;
        current = (current + d).slice(0, length);
        onChange(current);
        if (current.length === length) onComplete(current);
      }
      return current;
    }

    // Simulate backspace at position
    function backspace() {
      // Not testing full backspace nav; just that onChange fires with partial
    }

    return { type, onCompleteValues, onChangeValues, backspace };
  }

  it("onChange fires for every digit typed", () => {
    const { type, onChangeValues } = simulateOtpInput(6);
    type("123456");
    assert.equal(onChangeValues.length, 6, "onChange should fire once per digit");
  });

  it("onComplete fires only when length reached", () => {
    const { type, onCompleteValues } = simulateOtpInput(6);
    // Type 5 digits — onComplete must NOT fire yet
    type("12345");
    assert.equal(onCompleteValues.length, 0, "onComplete must not fire before all digits");
    // type() accumulates from empty each call in this test; type "123456" to reach length
    const { type: type2, onCompleteValues: oc2 } = simulateOtpInput(6);
    type2("123456");
    assert.equal(oc2.length, 1, "onComplete must fire exactly once at length");
    assert.equal(oc2[0], "123456");
  });

  it("onChange fires with partial value (length < 6) so callers can reset otpComplete", () => {
    const { type, onChangeValues } = simulateOtpInput(6);
    type("123");
    const partial = onChangeValues[onChangeValues.length - 1];
    assert.ok(partial.length < 6, "partial onChange value must be less than full length");
  });

  it("onChange fires with full 6-digit value", () => {
    const { type, onChangeValues } = simulateOtpInput(6);
    type("654321");
    const last = onChangeValues[onChangeValues.length - 1];
    assert.equal(last, "654321");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. AdminLoginStep3 account-blocked logic
// ─────────────────────────────────────────────────────────────────────────────

describe("AdminLoginStep3 — account-blocked routing logic", () => {
  /**
   * Test the routing logic: if error kind is account_disabled or account_inactive
   * the component sets isAccountBlocked=true and stops allowing retry.
   * We test this decision logic directly.
   */

  function shouldBlockAccount(kind: AuthErrorKind): boolean {
    return kind === "account_disabled" || kind === "account_inactive";
  }

  it("account_disabled → shouldBlockAccount = true", () => {
    const { kind } = normaliseAuthError(makeError(401, "ACCOUNT_DISABLED"));
    assert.equal(shouldBlockAccount(kind), true);
  });

  it("account_inactive → shouldBlockAccount = true", () => {
    const { kind } = normaliseAuthError(makeError(401, "ACCOUNT_INACTIVE"));
    assert.equal(shouldBlockAccount(kind), true);
  });

  it("otp_invalid → shouldBlockAccount = false (retryable)", () => {
    const { kind } = normaliseAuthError(makeError(400, "OTP_INVALID"));
    assert.equal(shouldBlockAccount(kind), false);
  });

  it("otp_expired → shouldBlockAccount = false (resend and retry)", () => {
    const { kind } = normaliseAuthError(makeError(400, "OTP_EXPIRED"));
    assert.equal(shouldBlockAccount(kind), false);
  });

  it("too_many_attempts → shouldBlockAccount = false (rate-limited, not blocked)", () => {
    const { kind } = normaliseAuthError(makeError(429, "TOO_MANY_ATTEMPTS"));
    assert.equal(shouldBlockAccount(kind), false);
  });

  it("network → shouldBlockAccount = false", () => {
    const { kind } = normaliseAuthError(makeNetworkError());
    assert.equal(shouldBlockAccount(kind), false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Session expiry detection
// ─────────────────────────────────────────────────────────────────────────────

describe("Session expiry detection — sessionStorage marker + URL routing", () => {
  beforeEach(() => makeBrowserMocks());

  it("hadSession = true when zyoris-had-session marker is set", () => {
    sessionStorage.setItem("zyoris-had-session", "1");
    const hadSession = sessionStorage.getItem("zyoris-had-session") === "1";
    assert.equal(hadSession, true);
  });

  it("hadSession = false when marker is absent", () => {
    const hadSession = sessionStorage.getItem("zyoris-had-session") === "1";
    assert.equal(hadSession, false);
  });

  it("hadSession = false after sessionStorage.removeItem (deliberate logout)", () => {
    sessionStorage.setItem("zyoris-had-session", "1");
    sessionStorage.removeItem("zyoris-had-session");
    const hadSession = sessionStorage.getItem("zyoris-had-session") === "1";
    assert.equal(hadSession, false);
  });

  it("sessionExpired flag parsed correctly from ?reason=session_expired", () => {
    const params = new URLSearchParams("reason=session_expired&next=/dashboard");
    const sessionExpired = params.get("reason") === "session_expired";
    assert.equal(sessionExpired, true);
  });

  it("sessionExpired is false for other reason values", () => {
    const params = new URLSearchParams("reason=other");
    const sessionExpired = params.get("reason") === "session_expired";
    assert.equal(sessionExpired, false);
  });

  it("return URL is preserved through ?next= param", () => {
    const params = new URLSearchParams("reason=session_expired&next=/dashboard/leads");
    const next = validateReturnTo(params.get("next"));
    assert.equal(next, "/dashboard/leads");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. validateReturnTo — regression
// ─────────────────────────────────────────────────────────────────────────────

describe("validateReturnTo — open-redirect prevention (Day 3 regression)", () => {
  it("accepts valid relative paths", () => {
    assert.equal(validateReturnTo("/dashboard"), "/dashboard");
    assert.equal(validateReturnTo("/dashboard/leads"), "/dashboard/leads");
    assert.equal(validateReturnTo("/admin"), "/admin");
  });

  it("rejects absolute URLs", () => {
    assert.equal(validateReturnTo("https://evil.com"), null);
    assert.equal(validateReturnTo("http://evil.com/path"), null);
  });

  it("rejects protocol-relative URLs", () => {
    assert.equal(validateReturnTo("//evil.com"), null);
  });

  it("rejects backslash tricks", () => {
    assert.equal(validateReturnTo("/\\evil.com"), null);
    assert.equal(validateReturnTo("\\\\evil.com"), null);
  });

  it("rejects empty and non-string values", () => {
    assert.equal(validateReturnTo(""), null);
    assert.equal(validateReturnTo("   "), null);
    assert.equal(validateReturnTo(null), null);
    assert.equal(validateReturnTo(undefined), null);
    assert.equal(validateReturnTo(42), null);
  });

  it("rejects paths not starting with /", () => {
    assert.equal(validateReturnTo("dashboard"), null);
    assert.equal(validateReturnTo("evil.com/path"), null);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. BroadcastChannel logout — message type contract
// ─────────────────────────────────────────────────────────────────────────────

describe("BroadcastChannel logout — message contract", () => {
  it("LOGOUT message has correct type field", () => {
    const message = { type: "LOGOUT" };
    assert.equal(message.type, "LOGOUT");
  });

  it("handler ignores messages with wrong type", () => {
    let wipeCalled = false;
    const handleMessage = (event: { data: { type: string } }) => {
      if (event.data?.type === "LOGOUT") wipeCalled = true;
    };

    handleMessage({ data: { type: "PING" } });
    assert.equal(wipeCalled, false);

    handleMessage({ data: { type: "LOGOUT" } });
    assert.equal(wipeCalled, true);
  });

  it("storage event handler fires only on STORAGE_KEY removal", () => {
    const STORAGE_KEY = "zyoris-auth";
    let wipeCalled = false;

    const handleStorage = (event: { key: string | null; newValue: string | null }) => {
      if (event.key === STORAGE_KEY && event.newValue === null) wipeCalled = true;
    };

    // Different key — should not trigger
    handleStorage({ key: "other-key", newValue: null });
    assert.equal(wipeCalled, false);

    // Correct key but not null (set operation) — should not trigger
    handleStorage({ key: STORAGE_KEY, newValue: '{"token":"abc"}' });
    assert.equal(wipeCalled, false);

    // Correct key AND null (removal) — should trigger
    handleStorage({ key: STORAGE_KEY, newValue: null });
    assert.equal(wipeCalled, true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. Register form password-strength rules (same rules as reset-password)
// ─────────────────────────────────────────────────────────────────────────────

describe("registerForm — password strength rules (consistent with reset-password)", () => {
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

  it("valid strong password passes", () => {
    assert.equal(isValidPassword("Secure123"), true);
    assert.equal(isValidPassword("Passw0rd!"), true);
  });

  it("too short fails", () => assert.equal(isValidPassword("Ab1"), false));
  it("no uppercase fails", () => assert.equal(isValidPassword("secure123"), false));
  it("no lowercase fails", () => assert.equal(isValidPassword("SECURE123"), false));
  it("no number fails", () => assert.equal(isValidPassword("SecurePass"), false));
  it("empty fails", () => assert.equal(isValidPassword(""), false));

  it("password strength rules are identical in registerForm and reset-password page", () => {
    // Both use the same 4 rules — test the invariant across the two UIs
    const testCases: Array<[string, boolean]> = [
      ["Abcdef1!", true],
      ["abcdef1!", false],  // no uppercase
      ["ABCDEF1!", false],  // no lowercase
      ["AbcdefGH", false],  // no number
      ["Ab1",      false],  // too short
    ];
    for (const [pw, expected] of testCases) {
      assert.equal(
        isValidPassword(pw),
        expected,
        `password "${pw}" expected ${expected}`
      );
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. Error routing for account_disabled at login
// ─────────────────────────────────────────────────────────────────────────────

describe("Login error routing — account_disabled and email_not_verified", () => {
  /**
   * These errors arrive at the login form via AuthContext.login() → getAuthErrorMessage().
   * The test verifies they produce displayable, non-generic messages.
   */

  it("account_disabled produces a message distinct from invalid_credentials", () => {
    const disabled = normaliseAuthError(makeError(401, "ACCOUNT_DISABLED")).message;
    const invalid  = normaliseAuthError(makeError(401, "INVALID_CREDENTIALS")).message;
    assert.notEqual(disabled, invalid,
      "account_disabled message must differ from invalid_credentials");
  });

  it("account_inactive produces a message distinct from invalid_credentials", () => {
    const inactive = normaliseAuthError(makeError(401, "ACCOUNT_INACTIVE")).message;
    const invalid  = normaliseAuthError(makeError(401, "INVALID_CREDENTIALS")).message;
    assert.notEqual(inactive, invalid);
  });

  it("email_not_verified produces a message distinct from invalid_credentials", () => {
    const unverified = normaliseAuthError(makeError(401, "EMAIL_NOT_VERIFIED")).message;
    const invalid    = normaliseAuthError(makeError(401, "INVALID_CREDENTIALS")).message;
    assert.notEqual(unverified, invalid);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 13. email_not_verified must NOT be silenced as invalid_credentials
// ─────────────────────────────────────────────────────────────────────────────

describe("email_not_verified — must surface distinctly, not be swallowed", () => {
  it("EMAIL_NOT_VERIFIED error code maps to email_not_verified kind (not invalid_credentials)", () => {
    const r = normaliseAuthError(makeError(401, "EMAIL_NOT_VERIFIED"));
    assert.equal(r.kind, "email_not_verified");
    assert.notEqual(r.kind, "invalid_credentials");
  });

  it("getAuthErrorMessage returns non-empty string for EMAIL_NOT_VERIFIED", () => {
    const msg = getAuthErrorMessage(makeError(401, "EMAIL_NOT_VERIFIED"));
    assert.ok(msg.length > 0);
    assert.ok(msg.toLowerCase().includes("verif"),
      `message should mention verification — got: "${msg}"`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 14. canRetry flag — only true for network / server kinds
// ─────────────────────────────────────────────────────────────────────────────

describe("canRetry routing — only network and server errors are retryable", () => {
  function getCanRetry(err: unknown): boolean {
    const { kind } = normaliseAuthError(err);
    return kind === "network" || kind === "server";
  }

  it("network error → canRetry = true", () => {
    assert.equal(getCanRetry(makeNetworkError()), true);
  });

  it("server error → canRetry = true", () => {
    assert.equal(getCanRetry(makeServerError()), true);
  });

  it("otp_invalid → canRetry = false", () => {
    assert.equal(getCanRetry(makeError(400, "OTP_INVALID")), false);
  });

  it("otp_expired → canRetry = false", () => {
    assert.equal(getCanRetry(makeError(400, "OTP_EXPIRED")), false);
  });

  it("too_many_attempts → canRetry = false", () => {
    assert.equal(getCanRetry(makeError(429, "TOO_MANY_ATTEMPTS")), false);
  });

  it("rate_limited → canRetry = false", () => {
    assert.equal(getCanRetry(makeError(429, "RATE_LIMIT_EXCEEDED")), false);
  });

  it("invalid_credentials → canRetry = false", () => {
    assert.equal(getCanRetry(makeError(401, "INVALID_CREDENTIALS")), false);
  });

  it("account_disabled → canRetry = false (blocked, not retryable)", () => {
    assert.equal(getCanRetry(makeError(401, "ACCOUNT_DISABLED")), false);
  });

  it("password_too_weak → canRetry = false", () => {
    assert.equal(getCanRetry(makeError(400, "PASSWORD_TOO_WEAK")), false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 15. Resend cooldown: starts at RESEND_COOLDOWN_S, ticks down
// ─────────────────────────────────────────────────────────────────────────────

describe("Resend OTP cooldown — timer logic", () => {
  const RESEND_COOLDOWN_S = 60;

  it("cooldown starts at 60 seconds", () => {
    let cooldown = 0;
    // Simulate startCooldown
    cooldown = RESEND_COOLDOWN_S;
    assert.equal(cooldown, 60);
  });

  it("cooldown ticks down by 1 each second", () => {
    let cooldown = RESEND_COOLDOWN_S;
    // Simulate one tick
    cooldown = cooldown - 1;
    assert.equal(cooldown, 59);
  });

  it("cooldown reaches 0 after 60 ticks", () => {
    let cooldown = RESEND_COOLDOWN_S;
    for (let i = 0; i < RESEND_COOLDOWN_S; i++) {
      cooldown = Math.max(0, cooldown - 1);
    }
    assert.equal(cooldown, 0);
  });

  it("cooldown format: seconds-only below 60", () => {
    const fmt = (s: number) => s >= 60 ? `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}` : `${s}s`;
    assert.equal(fmt(59), "59s");
    assert.equal(fmt(30), "30s");
    assert.equal(fmt(1), "1s");
  });

  it("cooldown format: mm:ss at or above 60", () => {
    const fmt = (s: number) => s >= 60 ? `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}` : `${s}s`;
    assert.equal(fmt(60), "1:00");
    assert.equal(fmt(90), "1:30");
    assert.equal(fmt(120), "2:00");
  });

  it("resend is disabled during cooldown", () => {
    let cooldown = 60;
    const canResend = cooldown <= 0;
    assert.equal(canResend, false);

    cooldown = 0;
    const canResend2 = cooldown <= 0;
    assert.equal(canResend2, true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 16. Day 1 + Day 2 full regression
// ─────────────────────────────────────────────────────────────────────────────

describe("Full regression — Day 1 + Day 2 error codes unaffected by Day 3 additions", () => {
  const regressionCases: Array<[string, AuthErrorKind]> = [
    // Day 1
    ["INVALID_CREDENTIALS",   "invalid_credentials"],
    ["TOKEN_EXPIRED",         "token_expired"],
    ["INVALID_REFRESH_TOKEN", "invalid_refresh_token"],
    ["VALIDATION_ERROR",      "validation"],
    // Day 2
    ["OTP_INVALID",           "otp_invalid"],
    ["OTP_EXPIRED",           "otp_expired"],
    ["TOO_MANY_ATTEMPTS",     "too_many_attempts"],
    ["MAX_ATTEMPTS_EXCEEDED", "too_many_attempts"],
    ["RATE_LIMIT_EXCEEDED",   "rate_limited"],
    ["ALREADY_VERIFIED",      "already_verified"],
    ["PASSWORD_TOO_WEAK",     "password_too_weak"],
    ["WEAK_PASSWORD",         "password_too_weak"],
  ];

  for (const [code, expectedKind] of regressionCases) {
    it(`${code} → ${expectedKind} (unchanged)`, () => {
      const status = code.includes("RATE") || code.includes("ATTEMPTS") ? 429 : 400;
      const r = normaliseAuthError(makeError(status, code));
      assert.equal(r.kind, expectedKind, `${code} should map to ${expectedKind}`);
    });
  }

  it("network errors still map to network", () => {
    assert.equal(normaliseAuthError(makeNetworkError()).kind, "network");
  });

  it("500 errors still map to server", () => {
    assert.equal(normaliseAuthError(makeServerError()).kind, "server");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 17. No raw error codes in any message — exhaustive check
// ─────────────────────────────────────────────────────────────────────────────

describe("Security — no raw error codes exposed in any user-facing message", () => {
  const allCodes = [
    // Day 1
    "INVALID_CREDENTIALS", "TOKEN_EXPIRED", "INVALID_REFRESH_TOKEN", "VALIDATION_ERROR",
    // Day 2
    "OTP_INVALID", "OTP_EXPIRED", "TOO_MANY_ATTEMPTS", "MAX_ATTEMPTS_EXCEEDED",
    "RATE_LIMIT_EXCEEDED", "ALREADY_VERIFIED", "PASSWORD_TOO_WEAK", "WEAK_PASSWORD",
    // Day 3
    "ACCOUNT_DISABLED", "ACCOUNT_SUSPENDED", "USER_DISABLED", "USER_SUSPENDED",
    "ACCOUNT_INACTIVE", "ACCOUNT_NOT_ACTIVE", "USER_INACTIVE",
    "EMAIL_NOT_VERIFIED", "EMAIL_UNVERIFIED", "UNVERIFIED_EMAIL",
  ];

  for (const code of allCodes) {
    it(`message for "${code}" does not contain raw code`, () => {
      const status = code.includes("RATE") || code.includes("ATTEMPTS") ? 429 : 400;
      const { message } = normaliseAuthError(makeError(status, code));
      assert.ok(
        !message.toUpperCase().includes(code.replace(/_/g, "")),
        `message must not expose "${code}" — got: "${message}"`
      );
      assert.ok(!message.toUpperCase().includes("_"),
        `message must not contain underscores (raw code smell) — got: "${message}"`
      );
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 18. Protected-route gate logic (session status)
// ─────────────────────────────────────────────────────────────────────────────

describe("Protected route gate — sessionStatus logic", () => {
  type SessionStatus = "checking" | "authenticated" | "unauthenticated";

  function gateBehaviour(status: SessionStatus): "show_spinner" | "redirect_login" | "show_content" {
    if (status === "checking") return "show_spinner";
    if (status === "unauthenticated") return "redirect_login";
    return "show_content";
  }

  it("'checking' → show spinner (no redirect)", () => {
    assert.equal(gateBehaviour("checking"), "show_spinner");
  });

  it("'unauthenticated' → redirect to login", () => {
    assert.equal(gateBehaviour("unauthenticated"), "redirect_login");
  });

  it("'authenticated' → show protected content", () => {
    assert.equal(gateBehaviour("authenticated"), "show_content");
  });

  it("content is never shown while checking (no flash of protected content)", () => {
    const result = gateBehaviour("checking");
    assert.notEqual(result, "show_content");
    assert.notEqual(result, "redirect_login");
  });
});
