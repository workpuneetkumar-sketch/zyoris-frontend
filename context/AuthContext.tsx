"use client";

import { loginApi, registerApi, AuthResponse, logoutApi, getMeApi } from "@/lib/api/authApi";
import { getRbacMe } from "@/lib/api/rbacApi";
import { getFrontendPermissions, SidebarItem, DashboardItem } from "@/lib/api/frontendApi";
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

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  organizationId?: string | null;
  organizationName?: string | null;
  avatarUrl?: string;
}

interface AuthContextValue {
    user: User | null;
    token: string | null;
    userPermissions: Record<string, boolean>;
    sidebarItems: SidebarItem[];
    visibleDashboards: DashboardItem[];
    visibleModules: string[];
    hasPermission: (permission: string) => boolean;
    login: (
        email: string,
        password: string
    ) => Promise<AuthResponse>;
    register: (data: {
        name: string;
        email: string;
        password: string;
        role: string;
        designation: string;
    }) => Promise<User>;
    logout: () => Promise<void>;
    isInitializing: boolean;
    isLoading: boolean; // Backward compatibility
    isAuthenticated: boolean;
    error: string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "zyoris-auth";
// Cookie name must match the one read by middleware.ts
const TOKEN_COOKIE = "zyoris-token";

// ── Cookie helpers (client-side only) ────────────────────────────────────────

function setTokenCookie(token: string) {
  // Max-age: 7 days. SameSite=Lax works for both HTTP and HTTPS.
  // Not HttpOnly so client-side JS can refresh it on token rotation.
  document.cookie = `${TOKEN_COOKIE}=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

function clearTokenCookie() {
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

function clearAuthState() {
  localStorage.removeItem(STORAGE_KEY);
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const hasPermission = useCallback((permission: string): boolean => {
    return userPermissions[permission] === true;
  }, [userPermissions]);

  // Restore session
  useEffect(() => {
    const restoreSession = async () => {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setIsInitializing(false);
        return;
      }

      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch {
        clearAuthState();
        setIsInitializing(false);
        return;
      }

      if (!parsed?.token) {
        clearAuthState();
        setIsInitializing(false);
        return;
      }

      // ── Optimistic restore ───────────────────────────────────────────────
      // Immediately mark as authenticated using the cached user from localStorage.
      // This prevents the layout from redirecting to /login while API calls are
      // in-flight on a hard refresh. The session will be invalidated below if the
      // token turns out to be expired.
      const cachedUser: User | null = parsed.user ?? null;
      setToken(parsed.token);
      setTokenCookie(parsed.token);

      if (cachedUser) {
        setUser(cachedUser);
        setIsAuthenticated(true);
        setIsInitializing(false); // ← unblock the UI immediately
      }
      // ────────────────────────────────────────────────────────────────────

      try {
        // Validate token + load fresh profile in the background
        const userData = await getMeApi();

        // Fetch RBAC & Frontend permissions
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
          }
        } catch (permError) {
          console.error("Failed to load permissions during session restore:", permError);
        }

        // Update with fresh server data (may differ from cached user)
        setUser(userData);
        setIsAuthenticated(true);
      } catch (err: any) {
        // Only clear the session on a definitive 401 Unauthorized.
        // Network errors, timeouts, 5xx backend errors, etc. should NOT
        // log the user out — keep the optimistic session alive.
        const status = err?.response?.status;
        const isDefinitelyUnauthorized = status === 401;

        if (isDefinitelyUnauthorized) {
          // Token is genuinely expired/invalid — clear and let layout redirect
          clearAuthState();
          setUser(null);
          setToken(null);
          setUserPermissions({});
          setSidebarItems([]);
          setVisibleDashboards([]);
          setVisibleModules([]);
          setIsAuthenticated(false);
        } else {
          // Network/server error — keep the optimistic session; user stays logged in
          console.warn("Session validation failed (non-auth error), keeping session:", err?.message || err);
        }
      } finally {
        // Always clear the initializing flag
        setIsInitializing(false);
      }
    };

    restoreSession();
  }, []);

  // LOGIN
  const login = useCallback(async (email: string, password: string) => {
    setError(null);

    const res = await loginApi(email, password);

    // Temp set user and token so interceptors can use them for next requests
    setToken(res.token);
    setTokenCookie(res.token);

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        user: res.user,
        token: res.token,
        refreshToken: res.refreshToken,
      })
    );

    // Fetch RBAC & Frontend permissions
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
        res.user.role = rbacMe.role.name;
      }
    } catch (permError) {
      console.error("Failed to load permissions during login:", permError);
    }

    setUser(res.user);
    setIsAuthenticated(true);

    return res;
  }, []);

  // REGISTER
  const register = useCallback(async (data: {
    name: string;
    email: string;
    password: string;
    role: string;
    designation: string;
  }) => {
    setError(null);

    const res = await registerApi(data);

    // Temp set token
    setToken(res.token);
    setTokenCookie(res.token);

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        user: res.user,
        token: res.token,
        refreshToken: res.refreshToken,
      })
    );

    // Fetch RBAC & Frontend permissions
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
        res.user.role = rbacMe.role.name;
      }
    } catch (permError) {
      console.error("Failed to load permissions during register:", permError);
    }

    setUser(res.user);
    setIsAuthenticated(true);

    return res.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const refreshToken = raw ? JSON.parse(raw).refreshToken : null;

      if (refreshToken) {
        await logoutApi(refreshToken);
      }
    } catch (err) {
      console.error("Logout API failed:", err);
    } finally {
      setUser(null);
      setToken(null);
      setUserPermissions({});
      setSidebarItems([]);
      setVisibleDashboards([]);
      setVisibleModules([]);
      setIsAuthenticated(false);
      clearAuthState();
      router.push("/login");
    }
  }, [router]);


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
                isInitializing, 
                isLoading: isInitializing, // Backward compatibility
                isAuthenticated, 
                error 
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