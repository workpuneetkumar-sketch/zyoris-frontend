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
  // Max-age: 7 days — aligns with typical JWT expiry; SameSite=Strict for CSRF protection.
  document.cookie = `${TOKEN_COOKIE}=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Strict`;
}

function clearTokenCookie() {
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0; SameSite=Strict`;
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

      try {
        const parsed = JSON.parse(raw);
        if (!parsed.token) {
          throw new Error("No token found");
        }
        
        setToken(parsed.token);
        setTokenCookie(parsed.token);
        
        // Validate token by fetching current user
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

        setUser(userData);
        setIsAuthenticated(true);
      } catch {
        // If token is invalid, clear everything
        clearAuthState();
        setUser(null);
        setToken(null);
        setUserPermissions({});
        setSidebarItems([]);
        setVisibleDashboards([]);
        setVisibleModules([]);
        setIsAuthenticated(false);
      } finally {
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