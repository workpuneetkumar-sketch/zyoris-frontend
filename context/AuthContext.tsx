"use client";

import { loginApi, registerApi, AuthResponse, logoutApi, getMeApi, LoginType } from "@/lib/api/authApi";
import { getRbacMe } from "@/lib/api/rbacApi";
import { getFrontendPermissions, SidebarItem, DashboardItem } from "@/lib/api/frontendApi";
import { setAuthToken, sanitizeBearerToken, getCookie } from "@/lib/api/api";
import { getAuthErrorMessage } from "@/lib/utils/authError";
import { validateReturnTo } from "@/lib/utils/validateReturnTo";
// Re-export so existing callers (DashboardLayout, login page) keep working
// without changing their import path.
export { validateReturnTo } from "@/lib/utils/validateReturnTo";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { useRouter } from "next/navigation";

export type Role = string;

export interface UserMembership {
  id: string;
  role: string;
  organization: {
    id: string;
    name: string;
    slug?: string;
  };
}

/**
 * User shape as returned by GET /auth/me (confirmed flat response).
 * All fields beyond the core set are optional so consumers that only
 * use id/email/name/role continue to compile without changes.
 */
export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  organizationId?: string | null;
  organizationName?: string | null;
  organizationSlug?: string | null;
  avatarUrl?: string | null;
  /** Flat permission keys granted to this user (from /auth/me). */
  permissions?: string[];
  /** Organization memberships (from /auth/me). */
  memberships?: UserMembership[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Typed session status — the single signal for gates and redirect logic.
 *
 * 'checking'       — session restore is in progress; do not redirect yet.
 * 'authenticated'  — a valid session exists; user and token are populated.
 * 'unauthenticated'— session restore completed with no valid session found.
 */
export type SessionStatus = "checking" | "authenticated" | "unauthenticated";
export type RoleVerificationStatus = "checking" | "verified" | "unverified";

// ── Return-to (next) path helpers ─────────────────────────────────────────────
// validateReturnTo is defined in lib/utils/validateReturnTo.ts and re-exported
// above so all existing callers continue to work without path changes.

// ─────────────────────────────────────────────────────────────────────────────

interface AuthContextValue {
    user: User | null;
    token: string | null;
    userPermissions: Record<string, boolean>;
    sidebarItems: SidebarItem[];
    visibleDashboards: DashboardItem[];
    visibleModules: string[];
    hasPermission: (permission: string) => boolean;
    login: (email: string, password: string, loginType?: LoginType) => Promise<AuthResponse>;
    /** Clear the last auth error (e.g. when the user edits a field or switches screens). */
    clearError: () => void;
    register: (data: {
        name: string;
        email: string;
        password: string;
        role: string;
        designation: string;
    }) => Promise<User>;
    logout: () => Promise<void>;
    /** Single unambiguous session loading signal. Prefer over isInitializing in new code. */
    sessionStatus: SessionStatus;
    roleVerificationStatus: RoleVerificationStatus;
    isInitializing: boolean;
    permissionsLoaded: boolean;
    isLoading: boolean; // Backward-compatibility alias for isInitializing
    isAuthenticated: boolean;
    /** Last auth error message from login() or register(). Cleared on the next attempt. */
    error: string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "zyoris-auth";
// Cookie name must match the one read by middleware.ts
const TOKEN_COOKIE = "zyoris-token";

// ── Cookie helpers (client-side only) ─────────────────────────────────────────

function setTokenCookie(token: string) {
  // Not HttpOnly — needed for client-side token rotation.
  document.cookie = `${TOKEN_COOKIE}=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

function clearTokenCookie() {
  if (typeof document === "undefined") return;
  const keys = [TOKEN_COOKIE, "token", "accessToken"];
  keys.forEach((k) => {
    document.cookie = `${k}=; path=/; max-age=0; SameSite=Lax`;
    document.cookie = `${k}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
  });
}

function clearAuthStorage() {
  setAuthToken(null);
  const keys = [
    STORAGE_KEY,
    "zyoris-token",
    "token",
    "accessToken",
    "zyoris-refresh-token",
    "refreshToken",
    "zyoris-register-userId",
  ];
  keys.forEach((key) => {
    try { localStorage.removeItem(key); } catch {}
    try { sessionStorage.removeItem(key); } catch {}
  });
  clearTokenCookie();
}

// ─────────────────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<Record<string, boolean>>({});
  const [sidebarItems, setSidebarItems] = useState<SidebarItem[]>([]);
  const [visibleDashboards, setVisibleDashboards] = useState<DashboardItem[]>([]);
  const [visibleModules, setVisibleModules] = useState<string[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("checking");
  const [roleVerificationStatus, setRoleVerificationStatus] =
    useState<RoleVerificationStatus>("checking");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const hasPermission = useCallback(
    (permission: string): boolean => userPermissions[permission] === true,
    [userPermissions]
  );

  // ── Wipe all React auth state (does NOT touch storage — caller handles that) ──
  const wipeReactState = useCallback(() => {
    setUser(null);
    setToken(null);
    setAuthToken(null);
    setUserPermissions({});
    setSidebarItems([]);
    setVisibleDashboards([]);
    setVisibleModules([]);
    setIsAuthenticated(false);
    setSessionStatus("unauthenticated");
    setRoleVerificationStatus("unverified");
    setPermissionsLoaded(false);
  }, []);

  // ── Cross-tab logout ────────────────────────────────────────────────────────
  // Two complementary mechanisms keep all tabs in sync when any tab logs out:
  //
  // 1. BroadcastChannel (preferred): fires in ALL tabs including the sender's,
  //    but we guard against self-handling in the logout() function by only
  //    posting the message AFTER wipeReactState() has already run locally.
  //    Falls back gracefully if BroadcastChannel is unavailable (e.g. in tests).
  //
  // 2. storage event (fallback): fires in every OTHER tab when localStorage
  //    changes. Catches any logout that bypasses the BroadcastChannel path
  //    (e.g. direct localStorage.removeItem in devtools, or an old tab that
  //    hasn't yet registered the channel listener).
  useEffect(() => {
    if (typeof window === "undefined") return;

    // ── BroadcastChannel ──────────────────────────────────────────────────────
    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel("zyoris-auth");
      channel.onmessage = (event: MessageEvent) => {
        if (event.data?.type === "LOGOUT") {
          wipeReactState();
          window.location.href = "/login";
        }
      };
    }

    // ── storage event (fallback) ──────────────────────────────────────────────
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue === null) {
        wipeReactState();
        window.location.href = "/login";
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
      channel?.close();
    };
  }, [wipeReactState]);

  // ── Session restore on mount ───────────────────────────────────────────────
  useEffect(() => {
    const restoreSession = async () => {
      const raw = localStorage.getItem(STORAGE_KEY);
      let parsed: any = null;
      if (raw) {
        try {
          parsed = JSON.parse(raw);
        } catch {
          if (typeof raw === "string" && raw.trim().length > 10) {
            parsed = { token: raw.trim() };
          }
        }
      }

      const candidateToken =
        parsed?.token ||
        parsed?.accessToken ||
        parsed?.data?.token ||
        parsed?.data?.accessToken ||
        parsed?.user?.token ||
        (typeof parsed === "string" ? parsed : null) ||
        getCookie(TOKEN_COOKIE) ||
        localStorage.getItem("zyoris-token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken");

      const effectiveToken = sanitizeBearerToken(candidateToken);

      if (!effectiveToken) {
        clearAuthStorage();
        setPermissionsLoaded(true);
        setIsInitializing(false);
        setSessionStatus("unauthenticated");
        setRoleVerificationStatus("unverified");
        return;
      }

      setRoleVerificationStatus("checking");

      // Optimistic restore: unblock UI immediately if we have a cached user,
      // unless we are on a public auth page (stale token would cause a redirect
      // loop: /login → /dashboard → 401 → /login).
      const isPublicAuthPage =
        typeof window !== "undefined" &&
        (window.location.pathname.startsWith("/login") ||
          window.location.pathname.startsWith("/admin/login") ||
          window.location.pathname.startsWith("/register"));

      const cachedUser: User | null = parsed?.user ?? null;
      if (cachedUser) {
        const isAdmin = (cachedUser.role || "").toUpperCase() === "ADMIN";
        if (isAdmin && (!cachedUser.name || cachedUser.name.trim().toLowerCase() === "user")) {
          cachedUser.name = "Admin";
        }
      }

      setToken(effectiveToken);
      setTokenCookie(effectiveToken);
      setAuthToken(effectiveToken);
      setPermissionsLoaded(false);

      if (cachedUser && !isPublicAuthPage) {
        setUser(cachedUser);
        setIsAuthenticated(true);
        setSessionStatus("authenticated");
        setIsInitializing(false);
      }

      try {
        // Validate token + load authoritative fresh profile from backend.
        const rawUserData = await getMeApi();
        let roleVerified = Boolean(rawUserData.role);
        const isUserDataAdmin = (rawUserData.role || "").toUpperCase() === "ADMIN";

        const userData: User = {
          ...rawUserData,
          email: rawUserData.email || cachedUser?.email || "",
          name:
            rawUserData.name &&
            rawUserData.name.trim().length > 0 &&
            rawUserData.name.trim().toLowerCase() !== "user"
              ? rawUserData.name.trim()
              : cachedUser?.name && cachedUser.name.toLowerCase() !== "user"
                ? cachedUser.name
                : isUserDataAdmin
                  ? "Admin"
                  : (rawUserData.email || cachedUser?.email || "").split("@")[0] || "User",
          role: rawUserData.role || "USER",
        };

        try {
          const [rbacMe, frontendPerms] = await Promise.all([
            getRbacMe(),
            getFrontendPermissions(),
          ]);
          setUserPermissions(rbacMe.permissions || {});
          setSidebarItems(frontendPerms.sidebar || []);
          setVisibleDashboards(frontendPerms.dashboards || []);
          setVisibleModules(frontendPerms.modules || []);
          if (rbacMe.role?.name) {
            userData.role = rbacMe.role.name;
            roleVerified = true;
          }
        } catch {
          // Permission load failed — auth session is still valid; the user
          // will see reduced sidebar items until the next page reload.
          // Do not log the error object — it may contain response data.
        }

        setRoleVerificationStatus(roleVerified ? "verified" : "unverified");
        setUser(userData);
        setIsAuthenticated(true);
        setSessionStatus("authenticated");
      } catch (err: any) {
        const status = err?.response?.status;

        if (status === 401) {
          // Token is genuinely expired — clear everything and let DashboardLayout
          // redirect via the session-expired path.
          clearAuthStorage();
          wipeReactState();
        } else {
      // Network / 5xx — keep the optimistic session alive so the user
          // is not logged out on a flaky connection.
          if (process.env.NODE_ENV === "development") {
            // Only log in dev; never log the raw error object in production.
            console.warn("[auth] Session validation failed (non-auth error), keeping session.");
          }
        }
      } finally {
        setRoleVerificationStatus((prev) =>
          prev === "checking" ? "unverified" : prev
        );
        setPermissionsLoaded(true);
        setIsInitializing(false);
        setSessionStatus((prev) => (prev === "checking" ? "unauthenticated" : prev));
      }
    };

    restoreSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  const clearError = useCallback(() => setError(null), []);

  const login = useCallback(async (email: string, password: string, loginType?: LoginType) => {
    setError(null);
    setPermissionsLoaded(false);

    let res: AuthResponse;
    try {
      res = await loginApi(email, password, loginType);
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err));
      throw err;
    }

    const effectiveToken = sanitizeBearerToken(res.token) || "";
    setRoleVerificationStatus("checking");
    setToken(effectiveToken);
    setTokenCookie(effectiveToken);
    setAuthToken(effectiveToken);

    const normalizedEmail = email.trim();
    let roleVerified = Boolean(res.user?.role);
    const isLoginAdmin = (res.user?.role || "").toUpperCase() === "ADMIN";

    const safeUser: User = {
      ...res.user,
      email: res.user?.email || normalizedEmail,
      name:
        res.user?.name &&
        res.user.name.trim().length > 0 &&
        res.user.name.trim().toLowerCase() !== "user"
          ? res.user.name.trim()
          : isLoginAdmin
            ? "Admin"
            : normalizedEmail.split("@")[0] || "User",
      role: res.user?.role || "USER",
    };

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        user: safeUser,
        token: effectiveToken,
        refreshToken: res.refreshToken,
      })
    );

    try {
      const [rbacMe, frontendPerms] = await Promise.all([
        getRbacMe(),
        getFrontendPermissions(),
      ]);
      setUserPermissions(rbacMe.permissions || {});
      setSidebarItems(frontendPerms.sidebar || []);
      setVisibleDashboards(frontendPerms.dashboards || []);
      setVisibleModules(frontendPerms.modules || []);
      if (rbacMe.role?.name) {
        safeUser.role = rbacMe.role.name;
        roleVerified = true;
      }
    } catch {
      // Permission load failed — non-fatal, session is still valid.
    }

    setRoleVerificationStatus(roleVerified ? "verified" : "unverified");
    setUser(safeUser);
    setIsAuthenticated(true);
    setSessionStatus("authenticated");
    setPermissionsLoaded(true);

    // Mark that this browser has had a session so DashboardLayout can
    // distinguish a session-expiry redirect from a fresh unauthenticated visit.
    try { sessionStorage.setItem("zyoris-had-session", "1"); } catch {}

    return { ...res, user: safeUser };
  }, []);

  // ── REGISTER ───────────────────────────────────────────────────────────────
  const register = useCallback(async (data: {
    name: string;
    email: string;
    password: string;
    role: string;
    designation: string;
  }) => {
    setError(null);
    setPermissionsLoaded(false);

    let res: AuthResponse;
    try {
      res = await registerApi(data);
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err));
      throw err;
    }

    const effectiveToken = sanitizeBearerToken(res.token) || "";
    setRoleVerificationStatus("checking");
    setToken(effectiveToken);
    setTokenCookie(effectiveToken);
    setAuthToken(effectiveToken);

    const normalizedEmail = data.email.trim();
    let roleVerified = Boolean(res.user?.role);
    const isLoginAdmin = (res.user?.role || "").toUpperCase() === "ADMIN";

    const safeUser: User = {
      ...res.user,
      email: res.user?.email || normalizedEmail,
      name:
        res.user?.name &&
        res.user.name.trim().length > 0 &&
        res.user.name.trim().toLowerCase() !== "user"
          ? res.user.name.trim()
          : data.name?.trim() || (isLoginAdmin ? "Admin" : normalizedEmail.split("@")[0] || "User"),
      role: res.user?.role || "USER",
    };

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        user: safeUser,
        token: effectiveToken,
        refreshToken: res.refreshToken,
      })
    );

    try {
      const [rbacMe, frontendPerms] = await Promise.all([
        getRbacMe(),
        getFrontendPermissions(),
      ]);
      setUserPermissions(rbacMe.permissions || {});
      setSidebarItems(frontendPerms.sidebar || []);
      setVisibleDashboards(frontendPerms.dashboards || []);
      setVisibleModules(frontendPerms.modules || []);
      if (rbacMe.role?.name) {
        safeUser.role = rbacMe.role.name;
        roleVerified = true;
      }
    } catch {
      // Permission load failed — non-fatal, session is still valid.
    }

    setRoleVerificationStatus(roleVerified ? "verified" : "unverified");
    setUser(safeUser);
    setIsAuthenticated(true);
    setSessionStatus("authenticated");
    setPermissionsLoaded(true);

    return res.user;
  }, []);

  // ── LOGOUT ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    // 1. Read the refresh token BEFORE touching storage — the backend needs
    //    it to revoke the session.  After clearAuthStorage() it would be gone.
    let refreshToken: string | null = null;
    try {
      const raw =
        typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        refreshToken =
          parsed?.refreshToken || parsed?.data?.refreshToken || null;
      }
    } catch {}

    // 2. Call POST /auth/logout BEFORE clearing local state.
    //    The backend revokes the refresh token here.
    //    Race against a 5-second timeout so an offline user or a slow server
    //    cannot leave the UI frozen on the logout button indefinitely.
    //    On timeout or failure we still clear local state and redirect —
    //    the worst case is a dangling refresh token on the server that will
    //    expire on its own.
    if (refreshToken) {
      const LOGOUT_TIMEOUT_MS = 5000;
      try {
        await Promise.race([
          logoutApi(refreshToken),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Logout request timed out")), LOGOUT_TIMEOUT_MS)
          ),
        ]);
      } catch {
        // Logout API failed — proceed with local cleanup regardless.
        // The refresh token will expire naturally on the server.
      }
    }

    // 3. Wipe React state.
    wipeReactState();

    // 4. Wipe storage + cookies.
    clearAuthStorage();

    // 5. Clear the session marker so a deliberate logout does not show the
    //    "session expired" banner the next time the user visits /login.
    try { sessionStorage.removeItem("zyoris-had-session"); } catch {}

    // 6. Notify other tabs via BroadcastChannel so they sign out immediately.
    //    This runs AFTER wipeReactState() so the current tab does not react
    //    to its own broadcast.
    try {
      if (typeof BroadcastChannel !== "undefined") {
        const ch = new BroadcastChannel("zyoris-auth");
        ch.postMessage({ type: "LOGOUT" });
        // Give the message a tick to deliver before closing the channel.
        setTimeout(() => ch.close(), 200);
      }
    } catch {}

    // 7. Hard-navigate so the back-button cannot restore protected React state
    //    from the component tree (React keeps it in memory until a full unload).
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    } else {
      router.replace("/login");
    }
  }, [router, wipeReactState]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        userPermissions,
        sidebarItems,
        visibleDashboards,
        visibleModules,
        hasPermission,
        login,
        register,
        logout,
        sessionStatus,
        roleVerificationStatus,
        isInitializing,
        permissionsLoaded,
        isLoading: isInitializing,
        isAuthenticated,
        error,
        clearError,
      }}
    >
      {children}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
