"use client";

import { loginApi, registerApi, AuthResponse } from "@/lib/auth.service";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

type Role = "ADMIN" | "CEO" | "CFO" | "SALES_HEAD" | "OPERATIONS_HEAD";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  organizationId?: string | null;
  organizationName?: string | null;
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
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "zyoris-auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        })
      );

      return res; // Return the response
    } catch (e: any) {
      setError(e?.response?.data?.message || "Login failed");
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // REGISTER  IMPORTANT
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
        })
      );

      return res.user;
    } catch (e: any) {
      setError(e?.response?.data?.message || "Register failed");
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

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