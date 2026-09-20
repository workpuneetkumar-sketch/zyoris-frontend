import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import api, {
  sanitizeBearerToken,
  setAuthToken,
  getAuthToken,
  getEffectiveAuthToken,
} from "../lib/api/api.ts";

describe("Authentication Layer Resilience & Token Sanitization", () => {
  beforeEach(() => {
    // Reset in-memory token
    setAuthToken(null);
    // Mock global browser objects for testing
    const store: Record<string, string> = {};
    (globalThis as any).localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
    };

    const sessionStore: Record<string, string> = {};
    (globalThis as any).sessionStorage = {
      getItem: (k: string) => sessionStore[k] ?? null,
      setItem: (k: string, v: string) => { sessionStore[k] = v; },
      removeItem: (k: string) => { delete sessionStore[k]; },
      clear: () => { Object.keys(sessionStore).forEach((k) => delete sessionStore[k]); },
    };

    (globalThis as any).document = {
      cookie: "",
    };
    (globalThis as any).window = globalThis;
  });

  it("sanitizes plain JWT tokens correctly", () => {
    const raw = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMifQ.abc";
    assert.equal(sanitizeBearerToken(raw), raw);
  });

  it("strips wrapping double and single quotes", () => {
    const jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig";
    assert.equal(sanitizeBearerToken(`"${jwt}"`), jwt);
    assert.equal(sanitizeBearerToken(`'${jwt}'`), jwt);
  });

  it("strips whitespace and redundant Bearer prefixes", () => {
    const jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig";
    assert.equal(sanitizeBearerToken(`  ${jwt}  `), jwt);
    assert.equal(sanitizeBearerToken(`Bearer ${jwt}`), jwt);
    assert.equal(sanitizeBearerToken(`bearer ${jwt}`), jwt);
    assert.equal(sanitizeBearerToken(`Bearer  Bearer  ${jwt}`), jwt);
  });

  it("returns null for empty, whitespace, or invalid inputs", () => {
    assert.equal(sanitizeBearerToken(""), null);
    assert.equal(sanitizeBearerToken("   "), null);
    assert.equal(sanitizeBearerToken(null), null);
    assert.equal(sanitizeBearerToken(undefined), null);
    assert.equal(sanitizeBearerToken({}), null);
  });

  it("resolves token from in-memory store with highest priority", () => {
    setAuthToken("mem-token-123");
    localStorage.setItem("zyoris-auth", JSON.stringify({ token: "local-token-456" }));
    assert.equal(getEffectiveAuthToken(), "mem-token-123");
  });

  it("resolves token from localStorage 'zyoris-auth' containing .token", () => {
    setAuthToken(null);
    localStorage.setItem("zyoris-auth", JSON.stringify({ token: "jwt-token-abc" }));
    assert.equal(getEffectiveAuthToken(), "jwt-token-abc");
  });

  it("resolves token from localStorage 'zyoris-auth' containing .accessToken", () => {
    setAuthToken(null);
    localStorage.setItem("zyoris-auth", JSON.stringify({ accessToken: "access-token-def" }));
    assert.equal(getEffectiveAuthToken(), "access-token-def");
  });

  it("resolves token from localStorage 'zyoris-auth' containing nested data.token", () => {
    setAuthToken(null);
    localStorage.setItem("zyoris-auth", JSON.stringify({ data: { token: "nested-token-ghi" } }));
    assert.equal(getEffectiveAuthToken(), "nested-token-ghi");
  });

  it("resolves token from raw unparsed string in localStorage 'zyoris-auth'", () => {
    setAuthToken(null);
    localStorage.setItem("zyoris-auth", "raw-jwt-string-jkl");
    assert.equal(getEffectiveAuthToken(), "raw-jwt-string-jkl");
  });

  it("falls back to document.cookie 'zyoris-token' if localStorage is empty", () => {
    setAuthToken(null);
    localStorage.clear();
    document.cookie = "other_cookie=1; zyoris-token=cookie-token-xyz; test=2";
    assert.equal(getEffectiveAuthToken(), "cookie-token-xyz");
  });

  it("falls back to alternative keys in localStorage and sessionStorage", () => {
    setAuthToken(null);
    localStorage.clear();
    document.cookie = "";

    sessionStorage.setItem("zyoris-auth", JSON.stringify({ token: "session-token-111" }));
    assert.equal(getEffectiveAuthToken(), "session-token-111");

    sessionStorage.clear();
    localStorage.setItem("zyoris-token", "fallback-token-222");
    assert.equal(getEffectiveAuthToken(), "fallback-token-222");
  });

  it("attaches Authorization header with Bearer format in Axios request interceptor for workspace APIs", async () => {
    setAuthToken("test-workspace-jwt");

    // Test request config transformation via interceptor directly
    const interceptorHandler = (api.interceptors.request as any).handlers?.[0]?.fulfilled;
    assert.ok(interceptorHandler, "Request interceptor must be registered");

    // Case 1: Create Workspace Page
    const postConfig: any = {
      url: "/workspace/pages",
      method: "post",
      headers: new (api as any).defaults.headers.constructor(),
      data: { title: "New Folder", icon: "📁" },
    };
    const processedPost = await interceptorHandler(postConfig);
    const postAuth = processedPost.headers.get?.("Authorization") || processedPost.headers.Authorization;
    assert.equal(postAuth, "Bearer test-workspace-jwt");

    // Case 2: Load Workspace Page by ID
    const getConfig: any = {
      url: "/workspace/pages/cmu12345page",
      method: "get",
      headers: new (api as any).defaults.headers.constructor(),
    };
    const processedGet = await interceptorHandler(getConfig);
    const getAuth = processedGet.headers.get?.("Authorization") || processedGet.headers.Authorization;
    assert.equal(getAuth, "Bearer test-workspace-jwt");

    // Case 3: Workspace Page Tree
    const treeConfig: any = {
      url: "/workspace/pages/tree",
      method: "get",
      headers: new (api as any).defaults.headers.constructor(),
    };
    const processedTree = await interceptorHandler(treeConfig);
    const treeAuth = processedTree.headers.get?.("Authorization") || processedTree.headers.Authorization;
    assert.equal(treeAuth, "Bearer test-workspace-jwt");
  });

  it("skips Authorization header on public unauthenticated auth endpoints", async () => {
    setAuthToken("secret-token");
    const interceptorHandler = (api.interceptors.request as any).handlers?.[0]?.fulfilled;

    const loginConfig: any = {
      url: "/auth/login",
      method: "post",
      headers: new (api as any).defaults.headers.constructor(),
    };
    const processedLogin = await interceptorHandler(loginConfig);
    const authHeader = processedLogin.headers.get?.("Authorization") || processedLogin.headers.Authorization;
    assert.equal(authHeader, undefined);
  });
});
