"use client";

import React, { Suspense, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import EmployeeLoginScreen from "../../components/auth/screens/EmployeeLoginScreen";
import FeatureFooter from "../../components/auth/ui/FeatureFooter";
import { useAuth, validateReturnTo } from "../../context/AuthContext";

const DEFAULT_DESTINATION = "/dashboard";

function LoginPageInner() {
  const [isLoading, setIsLoading] = useState(false);
  const loginRedirectHandledRef = useRef(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionExpired = searchParams?.get("reason") === "session_expired";
  const nextParam = validateReturnTo(searchParams?.get("next") ?? "");
  const {
    login,
    user,
    roleVerificationStatus,
    sessionStatus,
    error: authError,
  } = useAuth();

  React.useEffect(() => {
    if (
      loginRedirectHandledRef.current ||
      sessionStatus !== "authenticated" ||
      roleVerificationStatus === "checking"
    ) {
      return;
    }

    const defaultDestination =
      roleVerificationStatus === "verified" &&
      user?.role?.toUpperCase() === "ADMIN"
        ? "/admin"
        : DEFAULT_DESTINATION;
    router.replace(nextParam ?? defaultDestination);
  }, [sessionStatus, roleVerificationStatus, user, nextParam, router]);

  const handleEmployeeLogin = async (
    email: string,
    password: string
  ): Promise<void> => {
    loginRedirectHandledRef.current = true;
    setIsLoading(true);
    try {
      const res = await login(email, password);
      const role = res.user.role;

      if (!res.user.organizationId && (role === "CEO" || role === "CFO")) {
        localStorage.setItem("zyoris-register-userId", res.user.id);
        router.push("/register");
        return;
      }

      if (!res.user.organizationId) {
        toast.error(
          "No organization assigned. Please contact your administrator."
        );
        return;
      }

      router.push(nextParam ?? DEFAULT_DESTINATION);
    } catch {
      // AuthContext.login() supplies the sanitized error shown by the form.
    } finally {
      setIsLoading(false);
    }
  };

  if (
    sessionStatus === "checking" ||
    (sessionStatus === "authenticated" &&
      roleVerificationStatus === "checking")
  ) {
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

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#F8FAFC] relative overflow-y-auto">
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

      <div className="flex-1 flex flex-col justify-center w-full max-w-7xl mx-auto px-4 py-6 sm:py-10 z-10">
        <div className="flex items-center justify-center transition-all duration-300 ease-in-out">
          <EmployeeLoginScreen
            onLogin={handleEmployeeLogin}
            isLoading={isLoading}
            authError={authError}
            sessionExpired={sessionExpired}
          />
        </div>
        <p className="mt-5 text-center text-sm text-gray-600">
          Need a different sign-in?{" "}
          <Link
            href="/admin/login"
            className="font-semibold text-[#002B7F] hover:underline"
          >
            Administrator Sign In
          </Link>
          <span className="mx-2 text-gray-300" aria-hidden="true">|</span>
          <Link
            href="/register"
            className="font-semibold text-[#002B7F] hover:underline"
          >
            Create an account
          </Link>
        </p>
        <div className="mt-8 sm:mt-12">
          <FeatureFooter />
        </div>
      </div>
    </div>
  );
}

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
