"use client";

import { loginApi, registerApi, AuthResponse, logoutApi } from "@/lib/api/authApi";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

import { useRouter } from "next/navigation";

type Role = "ADMIN" | "CEO" | "CFO" | "SALES_HEAD" | "OPERATIONS_HEAD";

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
  isLoading: boolean;
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

// ─────────────────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Restore session
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setIsLoading(false);
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      setUser(parsed.user);
      setToken(parsed.token);
      // Re-sync the cookie in case it was cleared (e.g. browser restart)
      if (parsed.token) {
        setTokenCookie(parsed.token);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // LOGIN
  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await loginApi(email, password);

      setUser(res.user);
      setToken(res.token);

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          user: res.user,
          token: res.token,
          refreshToken: res.refreshToken,
        })
      );

      // Set cookie so middleware can verify authentication on navigation
      setTokenCookie(res.token);

      return res;
    } catch (e: any) {
      setError(e?.response?.data?.message || "Login failed");
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // REGISTER
  const register = useCallback(async (data: {
    name: string;
    email: string;
    password: string;
    role: string;
    designation: string;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await registerApi(data);

      setUser(res.user);
      setToken(res.token);

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          user: res.user,
          token: res.token,
          refreshToken: res.refreshToken,
        })
      );

      setTokenCookie(res.token);

      return res.user;
    } catch (e: any) {
      setError(e?.response?.data?.message || "Register failed");
      throw e;
    } finally {
      setIsLoading(false);
    }
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
      localStorage.removeItem(STORAGE_KEY);
      clearTokenCookie();
      router.push("/login");
    }
  }, [router]);


  return (
    <AuthContext.Provider
      value={{ user, token, login, register, logout, isLoading, error }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}