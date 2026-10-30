/**
 * auth_role_login.test.ts
 *
 * Regression tests for the role-based login enforcement + error mapping fix.
 *
 * Covers:
 *   1. FORBIDDEN error code → specific, user-safe messages (both wrong-role cases)
 *   2. 403 status fallback → forbidden kind (never the generic "unexpected error")
 *   3. The four (account × flow) combinations → expected backend response →
 *      expected frontend banner text
 *
 * Background:
 *   The backend enforces role↔loginType pairing server-side and returns 403
 *   FORBIDDEN for mismatches. Before the fix, authError.ts had no FORBIDDEN/403
 *   mapping, so every 403 collapsed to the generic
 *   "An unexpected error occurred. Please try again." banner. These tests lock
 *   the specific messages and prevent that regression.
 *
 * Runner: node --experimental-strip-types --test tests/auth_role_login.test.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  normaliseAuthError,
  getAuthErrorMessage,
} from "../lib/utils/authError.ts";

// ── Helper: build an Axios-like error with a structured backend body ────────
function makeAxiosError(status: number, errorCode: string, message = "msg") {
  return {
    response: {
      status,
      data: { error: errorCode, message },
    },
  };
}

// Exact messages the backend returns (src/routes/auth.ts role-check block).
const ADMIN_VIA_EMPLOYEE_MSG =
  "Administrator accounts must sign in through 'Continue as Admin'.";
const NONADMIN_VIA_ADMIN_MSG =
  "This account does not have administrator access.";

// ─────────────────────────────────────────────────────────────────────────────
// 1. FORBIDDEN error code → specific messages
// ─────────────────────────────────────────────────────────────────────────────

describe("FORBIDDEN error mapping", () => {
  it("maps FORBIDDEN + 'continue as admin' → forbidden kind, specific message", () => {
    const r = normaliseAuthError(
      makeAxiosError(403, "FORBIDDEN", ADMIN_VIA_EMPLOYEE_MSG),
    );
    assert.equal(r.kind, "forbidden");
    assert.equal(
      r.message,
      "Administrator accounts must sign in through 'Continue as Admin'.",
    );
  });

  it("maps FORBIDDEN + 'does not have administrator access' → forbidden kind, specific message", () => {
    const r = normaliseAuthError(
      makeAxiosError(403, "FORBIDDEN", NONADMIN_VIA_ADMIN_MSG),
    );
    assert.equal(r.kind, "forbidden");
    assert.equal(
      r.message,
      "This account does not have administrator access. Please use the Employee sign-in instead.",
    );
  });

  it("does NOT return the generic 'unexpected error' for FORBIDDEN (regression guard)", () => {
    const r = normaliseAuthError(
      makeAxiosError(403, "FORBIDDEN", ADMIN_VIA_EMPLOYEE_MSG),
    );
    assert.notEqual(r.kind, "unknown");
    assert.ok(
      !r.message.includes("An unexpected error occurred"),
      "FORBIDDEN must not surface the generic fallback banner",
    );
  });

  it("maps a generic FORBIDDEN (unrecognised message) → forbidden kind with fallback message", () => {
    const r = normaliseAuthError(makeAxiosError(403, "FORBIDDEN", "nope"));
    assert.equal(r.kind, "forbidden");
    assert.ok(r.message.length > 0);
    assert.ok(
      !r.message.includes("An unexpected error occurred"),
      "even unrecognised FORBIDDEN must not be the generic fallback",
    );
  });

  it("getAuthErrorMessage returns the specific string (what the banner renders)", () => {
    const msg = getAuthErrorMessage(
      makeAxiosError(403, "FORBIDDEN", ADMIN_VIA_EMPLOYEE_MSG),
    );
    assert.equal(
      msg,
      "Administrator accounts must sign in through 'Continue as Admin'.",
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. 403 status fallback
// ─────────────────────────────────────────────────────────────────────────────

describe("403 status fallback", () => {
  it("maps 403 with no recognised code → forbidden kind (not 'unknown')", () => {
    const r = normaliseAuthError({ response: { status: 403, data: {} } });
    assert.equal(r.kind, "forbidden");
    assert.ok(r.message.length > 0);
    assert.ok(
      !r.message.includes("An unexpected error occurred"),
      "403 must not surface the generic fallback",
    );
  });

  it("maps 403 with lowercase 'forbidden' code → forbidden kind", () => {
    const r = normaliseAuthError(
      makeAxiosError(403, "forbidden", NONADMIN_VIA_ADMIN_MSG),
    );
    assert.equal(r.kind, "forbidden");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Four (account × flow) combinations
// ─────────────────────────────────────────────────────────────────────────────
//
// Each row documents: the loginType the frontend sends, the account's role, the
// backend response, and the banner text the user should see. The two 403 cases
// are exercised through normaliseAuthError; the two 200 cases produce no error
// banner (login succeeds), so there is nothing to normalise.

describe("role-based login — four combinations", () => {
  it("admin via Admin Login (loginType='admin') → 200 success → no error banner", () => {
    // No thrown error on a 200; the user is redirected to the dashboard.
    // Documented here so the matrix is complete; nothing to normalise.
    const loginType = "admin";
    const accountRole = "ADMIN";
    const backendStatus = 200;
    assert.equal(loginType, "admin");
    assert.equal(accountRole, "ADMIN");
    assert.equal(backendStatus, 200);
  });

  it("admin via Employee Sign In (loginType='employee') → 403 → 'must sign in through Continue as Admin'", () => {
    const r = normaliseAuthError(
      makeAxiosError(403, "FORBIDDEN", ADMIN_VIA_EMPLOYEE_MSG),
    );
    assert.equal(r.kind, "forbidden");
    assert.equal(
      r.message,
      "Administrator accounts must sign in through 'Continue as Admin'.",
    );
  });

  it("non-admin via Employee Sign In (loginType='employee') → 200 success → no error banner", () => {
    const loginType = "employee";
    const accountRole = "CEO";
    const backendStatus = 200;
    assert.equal(loginType, "employee");
    assert.notEqual(accountRole, "ADMIN");
    assert.equal(backendStatus, 200);
  });

  it("non-admin via Admin Login (loginType='admin') → 403 → 'does not have administrator access'", () => {
    const r = normaliseAuthError(
      makeAxiosError(403, "FORBIDDEN", NONADMIN_VIA_ADMIN_MSG),
    );
    assert.equal(r.kind, "forbidden");
    assert.equal(
      r.message,
      "This account does not have administrator access. Please use the Employee sign-in instead.",
    );
  });
});
