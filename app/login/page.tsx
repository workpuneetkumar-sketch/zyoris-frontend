"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import LandingScreen from "../../components/auth/screens/LandingScreen";
import EmployeeLoginScreen from "../../components/auth/screens/EmployeeLoginScreen";
import AdminLoginStep1 from "../../components/auth/screens/AdminLoginStep1";
import AdminLoginStep2 from "../../components/auth/screens/AdminLoginStep2";
import AdminLoginStep3 from "../../components/auth/screens/AdminLoginStep3";
import FeatureFooter from "../../components/auth/ui/FeatureFooter";
import { useAuth, validateReturnTo } from "../../context/AuthContext";

type AuthScreen = "landing" | "employee" | "admin-1" | "admin-2" | "admin-3";

const DEFAULT_DESTINATION = "/dashboard";

// ── Inner component (uses useSearchParams — must be inside Suspense) ──────────

function LoginPageInner() {
  const [screen, setScreen] = useState<AuthScreen>("landing");
  const [isLoading, setIsLoading] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const router = useRouter();
  const searchParams = useSearchParams();

  // ── Query-param parsing ───────────────────────────────────────────────────
  const sessionExpired = searchParams?.get("reason") === "session_expired";

  // Validate the ?next= return-to path.  validateReturnTo() rejects absolute
  // URLs, protocol-relative URLs (//host), and backslash tricks (/\host).
  const nextParam = validateReturnTo(searchParams?.get("next") ?? "");

  // Destructure everything needed at the top level — hooks must not be called
  // inside event handlers or async functions.
  const { login, logout, sessionStatus, error: authError } = useAuth();

  // ── Already authenticated: send to the intended destination immediately ───
  React.useEffect(() => {
    if (sessionStatus === "authenticated") {
      router.replace(nextParam ?? DEFAULT_DESTINATION);
    }
  }, [sessionStatus, nextParam, router]);

  // ── Navigate to a new screen, clearing stale loading state ───────────────
  const goTo = (next: AuthScreen) => {
    setIsLoading(false);
    setScreen(next);
  };

  const redirectAfterLogin = () => {
    router.push(nextParam ?? DEFAULT_DESTINATION);
  };

  // ── Employee login ────────────────────────────────────────────────────────

  const handleEmployeeLogin = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      const res = await login(email, password);

      // First-run CEO/CFO with no org → complete registration.
      const role = res.user.role;
      if (!res.user.organizationId && (role === "CEO" || role === "CFO")) {
        localStorage.setItem("zyoris-register-userId", res.user.id);
        router.push("/register");
        return;
      }

      if (!res.user.organizationId) {
        // Auth succeeded but no org assigned — show specific message.
        // Logout is NOT called here; the user stays on the login page and
        // can contact their admin.  The token in state is not useful without
        // an org, but it will expire naturally.
        toast.error(
          "No organization assigned. Please contact your administrator."
        );
        return;
      }

      redirectAfterLogin();
    } catch {
      // authError is already set by AuthContext.login() via getAuthErrorMessage.
      // EmployeeLoginScreen reads it via props — no extra toast to avoid duplication.
    } finally {
      setIsLoading(false);
    }
  };

  // ── Admin login ───────────────────────────────────────────────────────────

  const handleAdminStep2Next = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const res = await login(adminEmail, adminPassword);

      // Backend is authoritative on role — the frontend admin login screen is
      // purely a UX distinction.  If a non-admin successfully authenticates
      // through the Admin flow, their actual role determines access.
      const role = (res.user.role ?? "").toUpperCase();
      const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

      if (!isAdmin) {
        // Credentials are valid but this account is not an admin.
        // Log the session out immediately (prevents a partial authenticated
        // state from lingering) and show a user-safe, non-enumeration message.
        await logout();
        toast.error(
          "This account does not have admin access. " +
          "Please use the Employee sign-in instead."
        );
        goTo("landing");
        return;
      }

      // Credentials accepted and role confirmed — advance to the OTP step.
      // BD1: OTP endpoint not yet wired; AdminLoginStep3 has the TODO/warning.
      setScreen("admin-3");
    } catch {
      // authError is already set by AuthContext; AdminLoginStep2 reads it via props.
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLoginComplete = (): void => {
    // TODO (BD1): replace with real OTP verification once the backend endpoint
    // is confirmed.  Credentials were already validated at Step 2.
    toast.success("Admin signed in successfully!");
    redirectAfterLogin();
  };

  // ── Session-checking: show spinner, render nothing else ──────────────────
  if (sessionStatus === "checking") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#F8FAFC]">
        <span
          className="w-8 h-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"
          role="status"
          aria-label="Checking session…"
        />
      </div>
    );
  }

  // ── Screen renderer ───────────────────────────────────────────────────────

  const renderScreen = () => {
    switch (screen) {
      case "landing":
        return (
          <LandingScreen
            onSelectEmployee={() => goTo("employee")}
            onSelectAdmin={() => goTo("admin-1")}
          />
        );

      case "employee":
        return (
          <EmployeeLoginScreen
            onBack={() => goTo("landing")}
            onLogin={handleEmployeeLogin}
            isLoading={isLoading}
            authError={authError}
            sessionExpired={sessionExpired}
          />
        );

      case "admin-1":
        return (
          <AdminLoginStep1
            onBack={() => goTo("landing")}
            onNext={() => goTo("admin-2")}
            email={adminEmail}
            setEmail={setAdminEmail}
          />
        );

      case "admin-2":
        return (
          <AdminLoginStep2
            onBack={() => goTo("admin-1")}
            onNext={handleAdminStep2Next}
            password={adminPassword}
            setPassword={setAdminPassword}
            isLoading={isLoading}
            authError={authError}
          />
        );

      case "admin-3":
        return (
          <AdminLoginStep3
            onBack={() => goTo("admin-2")}
            onNext={handleAdminLoginComplete}
            isLoading={isLoading}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#F8FAFC] relative overflow-y-auto">
      {/* Abstract background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex justify-center items-center opacity-40">
        <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] rounded-full border-[1px] border-blue-200/50 blur-3xl" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[1000px] h-[1000px] rounded-full border-[1px] border-blue-200/50 blur-3xl" />
        <div
          className="absolute w-[120%] h-[120%] opacity-50 mix-blend-multiply"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxwYXR0ZXJuIGlkPSJwb2xrYSIgeD0iMCIgeT0iMCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48Y2lyY2xlIGZpbGw9IiNFMEU3RkYiIGN4PSIxMCIgY3k9IjEwIiByPSIxIj48L2NpcmNsZT48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjcG9sa2EpIj48L3JlY3Q+PC9zdmc+\")",
          }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center w-full max-w-7xl mx-auto px-4 py-6 sm:py-10 z-10">
        <div className="flex items-center justify-center transition-all duration-300 ease-in-out">
          {renderScreen()}
        </div>
        <div className="mt-8 sm:mt-12">
          <FeatureFooter />
        </div>
      </div>
    </div>
  );
}

// ── Page export — Suspense boundary required for useSearchParams ──────────────

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-[#F8FAFC]">
          <span
            className="w-8 h-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"
            role="status"
            aria-label="Loading…"
          />
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}
