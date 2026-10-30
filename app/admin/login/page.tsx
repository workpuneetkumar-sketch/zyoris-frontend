"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import BrandPanel from "@/components/auth/ui/BrandPanel";
import InputField from "@/components/auth/ui/InputField";
import PasswordField from "@/components/auth/ui/PasswordField";
import PrimaryButton from "@/components/auth/ui/PrimaryButton";
import { useAuth } from "@/context/AuthContext";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getLoginErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as any).response === "object" &&
    (error as any).response !== null
  ) {
    const status = (error as any).response.status as number;
    const code = String((error as any).response.data?.error ?? "").toUpperCase();
    const msg = String((error as any).response.data?.message ?? "").toLowerCase();

    if (status === 401 || status === 404) {
      return "Invalid email or password. Please try again.";
    }

    // Role/login-type mismatch — admin account reached via the wrong flow,
    // or non-admin account attempting admin sign-in.
    if (status === 403 || code === "FORBIDDEN") {
      if (msg.includes("continue as admin") || msg.includes("must sign in through")) {
        return "Administrator accounts must sign in through this page.";
      }
      if (msg.includes("does not have administrator") || msg.includes("administrator access")) {
        return "This account does not have administrator access. Please use Employee Sign In.";
      }
      return "You do not have permission to sign in here.";
    }
  }

  // No response at all — network / CORS / server down
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    !(error as any).response
  ) {
    return "Sign-in is unavailable. Check your connection and try again.";
  }

  return "We couldn't complete sign-in. Please try again shortly.";
}

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [formError, setFormError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const submittingRef = useRef(false);
  const router = useRouter();
  const {
    login,
    user,
    isAuthenticated,
    roleVerificationStatus,
    sessionStatus,
  } = useAuth();

  useEffect(() => {
    if (
      sessionStatus === "authenticated" &&
      roleVerificationStatus === "verified" &&
      user?.role?.toUpperCase() === "ADMIN"
    ) {
      router.replace("/admin");
    }
  }, [sessionStatus, roleVerificationStatus, user, router]);

  const validate = () => {
    const nextEmailError = !email.trim()
      ? "Email is required."
      : !EMAIL_RE.test(email.trim())
        ? "Please enter a valid email address."
        : "";
    const nextPasswordError = password ? "" : "Password is required.";
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    return !nextEmailError && !nextPasswordError;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    if (!validate() || submittingRef.current) return;

    submittingRef.current = true;
    setIsLoading(true);
    try {
      const response = await login(email.trim(), password, "admin");
      if (response.user.role?.trim().toUpperCase() !== "ADMIN") {
        setFormError(
          "This account does not have administrator access. Use Employee Sign In or contact your administrator."
        );
        return;
      }

      router.replace("/admin");
    } catch (error: unknown) {
      setFormError(getLoginErrorMessage(error));
    } finally {
      submittingRef.current = false;
      setIsLoading(false);
    }
  };

  if (
    sessionStatus === "checking" ||
    (sessionStatus === "authenticated" &&
      roleVerificationStatus === "checking")
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <span
          className="w-8 h-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"
          role="status"
          aria-label="Checking session"
        />
      </div>
    );
  }

  const signedInWithoutAdminAccess =
    isAuthenticated &&
    (roleVerificationStatus !== "verified" ||
      user?.role?.trim().toUpperCase() !== "ADMIN");

  return (
    <main className="min-h-screen flex flex-col bg-[#F8FAFC] relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-500/10" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-blue-400/10" />
      </div>

      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-4xl flex rounded-2xl overflow-hidden shadow-2xl shadow-blue-900/20 border border-gray-100 bg-white">
          <BrandPanel />
          <section className="flex-1 min-w-0 p-6 sm:p-10 md:p-12">
            <div className="mb-7">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#4970B8] mb-2">
                Zyoris Admin Portal
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#00194A]">
                Administrator Sign In
              </h1>
              <p className="mt-2 text-sm text-gray-500">
                Sign in with your administrator account to continue.
              </p>
            </div>

            {signedInWithoutAdminAccess && (
              <div
                role="status"
                className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
              >
                {roleVerificationStatus === "verified"
                  ? "This signed-in account does not have administrator access."
                  : "Your administrator access could not be verified. Sign in with an administrator account to continue."}
              </div>
            )}

            {formError && (
              <div
                role="alert"
                aria-live="assertive"
                className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {formError}
              </div>
            )}

            <form noValidate onSubmit={handleSubmit} className="space-y-5">
              <InputField
                id="administrator-email"
                label="Email"
                type="email"
                placeholder="Enter your administrator email"
                autoComplete="username email"
                icon={Mail}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (emailError) {
                    setEmailError(
                      !event.target.value.trim()
                        ? "Email is required."
                        : EMAIL_RE.test(event.target.value.trim())
                          ? ""
                          : "Please enter a valid email address."
                    );
                  }
                }}
                onBlur={() => {
                  if (!email.trim()) setEmailError("Email is required.");
                  else if (!EMAIL_RE.test(email.trim())) {
                    setEmailError("Please enter a valid email address.");
                  }
                }}
                error={emailError}
                disabled={isLoading}
              />
              <PasswordField
                id="administrator-password"
                label="Password"
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (event.target.value) setPasswordError("");
                }}
                onBlur={() => {
                  if (!password) setPasswordError("Password is required.");
                }}
                error={passwordError}
                disabled={isLoading}
              />
              <div className="flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-sm font-semibold text-[#002B7F] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <PrimaryButton
                type="submit"
                disabled={isLoading}
                aria-busy={isLoading}
              >
                {isLoading ? "Signing in…" : "Sign In"}
              </PrimaryButton>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
              Not an administrator?{" "}
              <Link
                href="/login"
                className="font-semibold text-[#002B7F] hover:underline"
              >
                Employee Sign In
              </Link>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
