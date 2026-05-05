"use client";

import { loginApi } from "@/lib/auth.service";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

// 👤 User type
type Role = "ADMIN" | "CEO" | "CFO" | "SALES_HEAD" | "OPERATIONS_HEAD";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

// 📦 Auth context shape
interface AuthContextValue {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

// 🧠 Context
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// 💾 Storage key
const STORAGE_KEY = "zyoris-auth";

// 🚀 Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🔁 Restore session on refresh
  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setIsLoading(false);
      return;
    }

    try {
      const parsed = JSON.parse(raw);

      setUser(parsed.user);
      setToken(parsed.token);

      // optional: parsed.refreshToken (for future use)
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Login
  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await loginApi(email, password);

      setUser(res.user);
      setToken(res.token);

      //  store full auth data
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          user: res.user,
          token: res.token,
          refreshToken: res.refreshToken,
        })
      );
    } catch (e: any) {
      setError(
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        "Unable to login"
      );
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 🚪 Logout
  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value: AuthContextValue = {
    user,
    token,
    login,
    logout,
    isLoading,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// 🔌 Hook
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}