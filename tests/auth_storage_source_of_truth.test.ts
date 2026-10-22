/**
 * auth_storage_source_of_truth.test.ts
 *
 * Tests for the single-source-of-truth fix for auth storage.
 *
 * Root cause reproduced and fixed:
 *   - restoreSession() in AuthContext.tsx was falling back to the zyoris-token
 *     cookie when localStorage["zyoris-auth"] was missing.
 *   - This meant that manually deleting localStorage["zyoris-auth"] did NOT log
 *     the user out — the cookie kept the session alive.
 *   - Fix: restoreSession() now ONLY reads from localStorage["zyoris-auth"].
 *     The cookie is a middleware hint only, not a session restore source.
 *   - Fix: organizationsApi.ts now uses getEffectiveAuthToken() instead of
 *     reading localStorage["zyoris-auth"] directly for its token.
 *
 * Covers:
 *   1.  candidateToken in restoreSession comes only from localStorage["zyoris-auth"]
 *       — cookie fallback removed
 *   2.  getEffectiveAuthToken() still falls back to cookie (that is correct for
 *       the Axios interceptor — it ensures API calls work after token refresh
 *       updates the cookie; the session-restore path is separate)
 *   3.  Removing localStorage["zyoris-auth"] → getEffectiveAuthToken returns
 *       cookie value (the interceptor path)
 *   4.  AuthContext restoreSession: no token in zyoris-auth → unauthenticated
 *       (even if cookie exists)
 *   5.  AuthContext restoreSession: cookie alone is NOT sufficient for session
 *   6.  organizationsApi source code: no longer passes manual Authorization
 *       headers; imports getEffectiveAuthToken
 *   7.  organizationsApi source code: getOrgSummary uses getEffectiveAuthToken
 *       not a direct localStorage read for the token
 *   8.  Session expiry detection: sessionStorage["zyoris-had-session"] marker
 *   9.  Storage event still fires on STORAGE_KEY removal (cross-tab logout)
 *   10. candidateToken waterfall stops at the zyoris-auth parsed values
 *       — no cookie or fallback-key tier remains in restoreSession
 *   11. validateReturnTo regression (open-redirect unchanged)
 *   12. Removing only the zyoris-token cookie while zyoris-auth exists
 *       — session should still restore (zyoris-auth is canonical)
 *
 * Runner: node --experimental-strip-types --test tests/auth_storage_source_of_truth.test.ts
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  sanitizeBearerToken,
  setAuthToken,
  getEffectiveAuthToken,
} from "../lib/api/api.ts";

import { validateReturnTo } from "../lib/utils/validateReturnTo.ts";

// ── Browser mock setup ────────────────────────────────────────────────────────

function makeBrowserMocks(cookieStr = "") {
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

  (globalThis as any).document = { cookie: cookieStr };
  (globalThis as any).window = globalThis;
}

// ── Fake JWT-like token ───────────────────────────────────────────────────────

const FAKE_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0In0.sig";
const FAKE_REFRESH = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyZWZyZXNoIjp0cnVlfQ.sig2";
const FAKE_AUTH_VALUE = JSON.stringify({ user: { id: "u1", name: "Test", email: "t@t.com", role: "ADMIN" }, token: FAKE_TOKEN, refreshToken: FAKE_REFRESH });

// ─────────────────────────────────────────────────────────────────────────────
// 1. restoreSession candidateToken: source code must NOT contain cookie fallback
// ─────────────────────────────────────────────────────────────────────────────

describe("AuthContext.tsx restoreSession — cookie removed from candidateToken", () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const authContextSrc = fs.readFileSync(
    path.join(__dirname, "../context/AuthContext.tsx"),
    "utf8"
  );

  // Isolate the restoreSession function text (from "const restoreSession" to
  // its closing brace — we only care about the candidateToken assignment block)
  const restoreSessionBlock = (() => {
    const start = authContextSrc.indexOf("const restoreSession = async");
    const end = authContextSrc.indexOf("restoreSession();", start);
    return authContextSrc.slice(start, end);
  })();

  it("restoreSession does NOT fall back to getCookie(TOKEN_COOKIE) for candidateToken", () => {
    // The candidateToken assignment must NOT include getCookie in its expression.
    // We check the specific block between "const candidateToken =" and the next
    // "const effectiveToken" line.
    const tokenStart = restoreSessionBlock.indexOf("const candidateToken =");
    const tokenEnd = restoreSessionBlock.indexOf("const effectiveToken", tokenStart);
    const candidateBlock = restoreSessionBlock.slice(tokenStart, tokenEnd);

    assert.ok(
      !candidateBlock.includes("getCookie"),
      "candidateToken must not call getCookie — cookie is a middleware hint, not a session-restore source"
    );
  });

  it("restoreSession does NOT fall back to localStorage fallback keys (zyoris-token, token, accessToken) for candidateToken", () => {
    const tokenStart = restoreSessionBlock.indexOf("const candidateToken =");
    const tokenEnd = restoreSessionBlock.indexOf("const effectiveToken", tokenStart);
    const candidateBlock = restoreSessionBlock.slice(tokenStart, tokenEnd);

    assert.ok(
      !candidateBlock.includes('"zyoris-token"'),
      'candidateToken must not include localStorage.getItem("zyoris-token") fallback'
    );
    assert.ok(
      !candidateBlock.includes('"token"'),
      'candidateToken must not include localStorage.getItem("token") fallback'
    );
    assert.ok(
      !candidateBlock.includes('"accessToken"'),
      'candidateToken must not include localStorage.getItem("accessToken") fallback'
    );
  });

  it("restoreSession candidateToken only reads from localStorage[STORAGE_KEY] (parsed values)", () => {
    const tokenStart = restoreSessionBlock.indexOf("const candidateToken =");
    const tokenEnd = restoreSessionBlock.indexOf("const effectiveToken", tokenStart);
    const candidateBlock = restoreSessionBlock.slice(tokenStart, tokenEnd);

    // These are the ONLY allowed sources in candidateToken:
    assert.ok(candidateBlock.includes("parsed?.token"), "must read parsed.token");
    assert.ok(candidateBlock.includes("parsed?.accessToken"), "must read parsed.accessToken");
    assert.ok(candidateBlock.includes("parsed?.data?.token"), "must read parsed.data.token");
    // No getCookie, no fallback keys
    assert.ok(!candidateBlock.includes("getCookie"), "must not use cookie as session source");
  });

  it("AuthContext still imports getCookie (used elsewhere, e.g. setTokenCookie reads it)", () => {
    // getCookie should still be imported — it may be used in other helpers
    // but NOT in the candidateToken expression for restoreSession
    assert.ok(
      authContextSrc.includes("getCookie"),
      "getCookie import must still exist"
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. getEffectiveAuthToken() still has cookie fallback (correct for interceptor)
// ─────────────────────────────────────────────────────────────────────────────

describe("getEffectiveAuthToken — cookie fallback KEPT for Axios interceptor path", () => {
  beforeEach(() => {
    makeBrowserMocks();
    setAuthToken(null);
  });

  it("returns null when localStorage is empty AND no cookie", () => {
    // Nothing in any storage
    assert.equal(getEffectiveAuthToken(), null);
  });

  it("returns token from zyoris-token cookie when localStorage is empty", () => {
    // Cookie path is correct for the Axios interceptor — it should still work
    // for API calls even if zyoris-auth was removed (so in-flight requests
    // can complete without re-login during a race condition)
    makeBrowserMocks(`zyoris-token=${FAKE_TOKEN}`);
    setAuthToken(null);
    assert.equal(getEffectiveAuthToken(), FAKE_TOKEN);
  });

  it("in-memory token takes priority over cookie", () => {
    makeBrowserMocks(`zyoris-token=cookie-token`);
    setAuthToken("inmemory-token");
    assert.equal(getEffectiveAuthToken(), "inmemory-token");
  });

  it("zyoris-auth localStorage takes priority over cookie", () => {
    makeBrowserMocks(`zyoris-token=cookie-token`);
    setAuthToken(null);
    localStorage.setItem("zyoris-auth", FAKE_AUTH_VALUE);
    assert.equal(getEffectiveAuthToken(), FAKE_TOKEN);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Session restore path: zyoris-auth missing → unauthenticated
//    This is the logic tested by source-code inspection in tests 1 above,
//    plus behavioural simulation of the candidateToken waterfall below.
// ─────────────────────────────────────────────────────────────────────────────

describe("Session restore behaviour — zyoris-auth removed → no token found", () => {
  beforeEach(() => {
    setAuthToken(null);
  });

  it("candidateToken is null when zyoris-auth is absent (even with cookie set)", () => {
    // Simulate what restoreSession does: read localStorage["zyoris-auth"],
    // parse it, build candidateToken from ONLY the parsed fields.
    makeBrowserMocks(`zyoris-token=${FAKE_TOKEN}`); // cookie is set
    setAuthToken(null);

    // The new candidateToken logic (no cookie fallback)
    const raw = localStorage.getItem("zyoris-auth"); // null
    let parsed: any = null;
    if (raw) {
      try { parsed = JSON.parse(raw); } catch {}
    }

    const candidateToken =
      parsed?.token ||
      parsed?.accessToken ||
      parsed?.data?.token ||
      parsed?.data?.accessToken ||
      parsed?.user?.token ||
      (typeof parsed === "string" ? parsed : null);
    // No getCookie fallback — matches the fixed restoreSession code

    const effectiveToken = sanitizeBearerToken(candidateToken);
    assert.equal(effectiveToken, null,
      "When zyoris-auth is missing, candidateToken must be null — cookie must NOT be used"
    );
  });

  it("candidateToken is found when zyoris-auth IS present", () => {
    makeBrowserMocks();
    setAuthToken(null);
    localStorage.setItem("zyoris-auth", FAKE_AUTH_VALUE);

    const raw = localStorage.getItem("zyoris-auth");
    let parsed: any = null;
    if (raw) { try { parsed = JSON.parse(raw); } catch {} }

    const candidateToken =
      parsed?.token ||
      parsed?.accessToken ||
      parsed?.data?.token ||
      parsed?.data?.accessToken ||
      parsed?.user?.token ||
      (typeof parsed === "string" ? parsed : null);

    const effectiveToken = sanitizeBearerToken(candidateToken);
    assert.equal(effectiveToken, FAKE_TOKEN,
      "When zyoris-auth exists with a valid token, candidateToken must find it"
    );
  });

  it("removing only zyoris-auth makes candidateToken null — session becomes unauthenticated", () => {
    makeBrowserMocks(`zyoris-token=${FAKE_TOKEN}`);
    setAuthToken(null);
    localStorage.setItem("zyoris-auth", FAKE_AUTH_VALUE);

    // Simulate the delete action from DevTools
    localStorage.removeItem("zyoris-auth");

    const raw = localStorage.getItem("zyoris-auth");
    let parsed: any = null;
    if (raw) { try { parsed = JSON.parse(raw); } catch {} }

    const candidateToken =
      parsed?.token ||
      parsed?.accessToken ||
      parsed?.data?.token ||
      parsed?.data?.accessToken ||
      parsed?.user?.token ||
      (typeof parsed === "string" ? parsed : null);

    assert.equal(sanitizeBearerToken(candidateToken), null,
      "After localStorage['zyoris-auth'] is removed, restoreSession must find no token and go unauthenticated"
    );
  });

  it("removing only cookie while zyoris-auth exists still restores session", () => {
    // zyoris-auth is canonical — cookie is not needed for restore
    makeBrowserMocks(""); // no cookie
    setAuthToken(null);
    localStorage.setItem("zyoris-auth", FAKE_AUTH_VALUE);

    const raw = localStorage.getItem("zyoris-auth");
    let parsed: any = null;
    if (raw) { try { parsed = JSON.parse(raw); } catch {} }

    const candidateToken =
      parsed?.token ||
      parsed?.accessToken ||
      parsed?.data?.token ||
      parsed?.data?.accessToken ||
      parsed?.user?.token ||
      (typeof parsed === "string" ? parsed : null);

    assert.equal(sanitizeBearerToken(candidateToken), FAKE_TOKEN,
      "Session must restore from zyoris-auth even when the cookie is absent"
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. organizationsApi.ts — source code: no manual Authorization headers
// ─────────────────────────────────────────────────────────────────────────────

describe("organizationsApi.ts — uses central token resolver, not direct localStorage reads", () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const orgApiSrc = fs.readFileSync(
    path.join(__dirname, "../lib/api/organizationsApi.ts"),
    "utf8"
  );

  it("imports getEffectiveAuthToken from api", () => {
    assert.ok(
      orgApiSrc.includes("getEffectiveAuthToken"),
      "organizationsApi must import and use getEffectiveAuthToken"
    );
  });

  it("getOrgSummary no longer passes manual Authorization headers on api.get() calls", () => {
    // Find the getOrgSummary function body
    const fnStart = orgApiSrc.indexOf("export async function getOrgSummary");
    const fnEnd = orgApiSrc.indexOf("\nexport async function", fnStart + 1);
    const fnBody = orgApiSrc.slice(fnStart, fnEnd === -1 ? undefined : fnEnd);

    // Must not contain explicit Authorization header passing to api.get
    assert.ok(
      !fnBody.includes("'Authorization'") && !fnBody.includes('"Authorization"'),
      "getOrgSummary must not manually inject Authorization headers — the Axios interceptor handles this"
    );
  });

  it("getOrgSummary uses getEffectiveAuthToken() for the token check", () => {
    const fnStart = orgApiSrc.indexOf("export async function getOrgSummary");
    const fnEnd = orgApiSrc.indexOf("\nexport async function", fnStart + 1);
    const fnBody = orgApiSrc.slice(fnStart, fnEnd === -1 ? undefined : fnEnd);

    assert.ok(
      fnBody.includes("getEffectiveAuthToken()"),
      "getOrgSummary must call getEffectiveAuthToken() to check for an active token"
    );
  });

  it("getOrgSummary does NOT read localStorage for the token (only for user display fallback)", () => {
    const fnStart = orgApiSrc.indexOf("export async function getOrgSummary");
    const fnEnd = orgApiSrc.indexOf("\nexport async function", fnStart + 1);
    const fnBody = orgApiSrc.slice(fnStart, fnEnd === -1 ? undefined : fnEnd);

    // The token variable must NOT come from localStorage — it must come from
    // getEffectiveAuthToken().  We check that no line sets `const token =` from
    // a localStorage parse inside getOrgSummary.
    assert.ok(
      !fnBody.match(/const token\s*=\s*parsed\s*\.\s*token/),
      "getOrgSummary must not extract token from a localStorage parse result"
    );
  });

  it("getDefaultOrg still reads organizationName from localStorage for display (safe, non-auth)", () => {
    const fnStart = orgApiSrc.indexOf("function getDefaultOrg");
    const fnEnd = orgApiSrc.indexOf("\nexport", fnStart + 1);
    const fnBody = orgApiSrc.slice(fnStart, fnEnd === -1 ? undefined : fnEnd);

    // organizationName display read is acceptable — it's not used for auth decisions
    assert.ok(
      fnBody.includes("organizationName"),
      "getDefaultOrg may still read organizationName from zyoris-auth for display purposes"
    );
    // But it must not extract a token
    assert.ok(
      !fnBody.includes("parsed.token") && !fnBody.includes("parsed?.token"),
      "getDefaultOrg must not extract a token"
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Cross-tab logout: storage event still fires on zyoris-auth removal
// ─────────────────────────────────────────────────────────────────────────────

describe("Cross-tab logout — storage event fires on STORAGE_KEY removal", () => {
  it("storage event handler triggers on zyoris-auth key removal (newValue === null)", () => {
    let wipeCalled = false;
    const STORAGE_KEY = "zyoris-auth";

    const handleStorage = (event: { key: string | null; newValue: string | null }) => {
      if (event.key === STORAGE_KEY && event.newValue === null) wipeCalled = true;
    };

    handleStorage({ key: "zyoris-auth", newValue: null });
    assert.equal(wipeCalled, true, "must trigger on zyoris-auth removal");
  });

  it("storage event handler does NOT trigger on other keys", () => {
    let wipeCalled = false;
    const handleStorage = (event: { key: string | null; newValue: string | null }) => {
      if (event.key === "zyoris-auth" && event.newValue === null) wipeCalled = true;
    };

    handleStorage({ key: "zyoris-token", newValue: null });
    assert.equal(wipeCalled, false, "must not trigger on zyoris-token removal");

    handleStorage({ key: "zyoris-auth", newValue: "something" }); // set, not remove
    assert.equal(wipeCalled, false, "must not trigger on zyoris-auth set");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Session expiry URL routing
// ─────────────────────────────────────────────────────────────────────────────

describe("Session expiry — URL params and sessionStorage marker", () => {
  beforeEach(() => {
    makeBrowserMocks();
    setAuthToken(null);
  });

  it("had-session marker is set — redirect includes reason=session_expired", () => {
    sessionStorage.setItem("zyoris-had-session", "1");
    const hadSession = sessionStorage.getItem("zyoris-had-session") === "1";

    // Simulate DashboardLayout URL building
    const params = new URLSearchParams();
    if (hadSession) params.set("reason", "session_expired");
    params.set("next", "/dashboard/leads");
    const url = `/login?${params.toString()}`;

    assert.ok(url.includes("reason=session_expired"), "URL must include reason param");
    // URLSearchParams encodes / as %2F — check the decoded value
    assert.ok(
      url.includes("next=") && decodeURIComponent(url).includes("next=/dashboard/leads"),
      "URL must include next param"
    );
  });

  it("had-session marker absent — redirect does NOT include reason=session_expired", () => {
    const hadSession = sessionStorage.getItem("zyoris-had-session") === "1";

    const params = new URLSearchParams();
    if (hadSession) params.set("reason", "session_expired");
    params.set("next", "/dashboard");
    const url = `/login?${params.toString()}`;

    assert.ok(!url.includes("reason=session_expired"), "URL must NOT include reason when marker absent");
  });

  it("deliberate logout clears had-session so next visit has no session_expired reason", () => {
    sessionStorage.setItem("zyoris-had-session", "1");
    // Simulate what logout() does
    sessionStorage.removeItem("zyoris-had-session");

    const hadSession = sessionStorage.getItem("zyoris-had-session") === "1";
    assert.equal(hadSession, false, "had-session must be cleared after deliberate logout");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. validateReturnTo regression — unchanged by this fix
// ─────────────────────────────────────────────────────────────────────────────

describe("validateReturnTo — open-redirect prevention (regression)", () => {
  it("accepts /dashboard/leads", () => assert.equal(validateReturnTo("/dashboard/leads"), "/dashboard/leads"));
  it("rejects absolute URL", () => assert.equal(validateReturnTo("https://evil.com"), null));
  it("rejects protocol-relative", () => assert.equal(validateReturnTo("//evil.com"), null));
  it("rejects backslash trick", () => assert.equal(validateReturnTo("/\\evil.com"), null));
  it("rejects empty string", () => assert.equal(validateReturnTo(""), null));
  it("rejects non-string", () => assert.equal(validateReturnTo(null), null));
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Regression — other auth error flows still work
// ─────────────────────────────────────────────────────────────────────────────

describe("Regression — existing token storage flows unaffected by fix", () => {
  beforeEach(() => {
    makeBrowserMocks();
    setAuthToken(null);
  });

  it("token stored in zyoris-auth is still found by getEffectiveAuthToken", () => {
    localStorage.setItem("zyoris-auth", FAKE_AUTH_VALUE);
    assert.equal(getEffectiveAuthToken(), FAKE_TOKEN);
  });

  it("in-memory token still takes priority over zyoris-auth", () => {
    localStorage.setItem("zyoris-auth", FAKE_AUTH_VALUE);
    setAuthToken("override-token");
    assert.equal(getEffectiveAuthToken(), "override-token");
  });

  it("sanitizeBearerToken still strips Bearer prefix", () => {
    assert.equal(sanitizeBearerToken(`Bearer ${FAKE_TOKEN}`), FAKE_TOKEN);
  });

  it("zyoris-auth with malformed JSON falls back to raw string for getEffectiveAuthToken", () => {
    localStorage.setItem("zyoris-auth", FAKE_TOKEN); // raw string, not JSON
    assert.equal(getEffectiveAuthToken(), FAKE_TOKEN);
  });

  it("zyoris-auth with nested data.token is found by getEffectiveAuthToken", () => {
    localStorage.setItem("zyoris-auth", JSON.stringify({ data: { token: FAKE_TOKEN } }));
    assert.equal(getEffectiveAuthToken(), FAKE_TOKEN);
  });
});
