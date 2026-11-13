"use client";

import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Clock, Mail } from "lucide-react";
import BrandPanel from "@/components/auth/ui/BrandPanel";
import FeatureFooter from "@/components/auth/ui/FeatureFooter";
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

function AdminLoginPageInner() {
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
      router.replace("/dashboard");
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

      router.replace("/dashboard");
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
      <div className="min-h-screen w-full flex items-center justify-center bg-[#F8FAFC]">
        <span
          className="w-8 h-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"
          role="status"
          aria-label="Checking session…"
        />
      </div>
    );
  }

  const signedInWithoutAdminAccess =
    isAuthenticated &&
    (roleVerificationStatus !== "verified" ||
      user?.role?.trim().toUpperCase() !== "ADMIN");

  const busy = isLoading || submittingRef.current;

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
          <div className="flex flex-col md:flex-row w-full max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl shadow-blue-900/10 min-h-0 md:min-h-[560px] border border-gray-100 overflow-hidden">
            <BrandPanel />

            <div className="flex-1 flex flex-col p-5 sm:p-8 md:p-12">
              {/* ── Header row ── */}
              <div className="flex items-center justify-between mb-6">
                <span />
                {/* Mobile-only logo mark */}
                <div className="md:hidden flex items-center gap-2">
                  <img src="/logo.jpeg" alt="Zyoris Logo" className="w-6 h-6 object-contain rounded" />
                  <span
                    className="text-sm font-bold uppercase text-[#002B7F]"
                    style={{ fontFamily: '"Neuropol X", "Neuropol X Free", sans-serif' }}
                  >
                    zyoris
                  </span>
                </div>
              </div>

              {/* ── Role mismatch warning banner ── */}
              {signedInWithoutAdminAccess && (
                <div
                  role="status"
                  aria-live="polite"
                  className="flex items-start gap-2.5 mb-5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm"
                >
                  <Clock className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" aria-hidden="true" />
                  <span>
                    {roleVerificationStatus === "verified"
                      ? "This signed-in account does not have administrator access."
                      : "Your administrator access could not be verified. Sign in with an administrator account to continue."}
                  </span>
                </div>
              )}

              {/* ── Form / auth error banner ── */}
              {formError && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="flex items-start gap-2.5 mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" aria-hidden="true" />
                  <span>{formError}</span>
                </div>
              )}

              {/* ── Title ── */}
              <div className="mb-6 sm:mb-8">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#4970B8] mb-1 sm:mb-2">
                  ZYORIS ADMIN PORTAL
                </p>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
                  Administrator Sign In
                </h1>
                <p className="text-gray-500 text-xs sm:text-sm">
                  Welcome back! Please sign in to continue.
                </p>
              </div>

              {/* ── Form ── */}
              <form
                noValidate
                onSubmit={handleSubmit}
                className="flex flex-col gap-5"
                aria-label="Administrator sign-in form"
              >
                <InputField
                  id="administrator-email"
                  label="Work Email"
                  type="email"
                  placeholder="Enter your work email"
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
                  disabled={busy}
                />

                <div className="flex flex-col gap-1">
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
                    disabled={busy}
                  />
                  {/* Forgot password — links to /forgot-password */}
                  <div className="flex justify-end mt-1">
                    <Link
                      href="/forgot-password"
                      className="text-sm text-[#002B7F] font-semibold hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#002B7F] rounded"
                      aria-label="Forgot password — go to password recovery"
                    >
                      Forgot password?
                    </Link>
                  </div>
                </div>

                <div className="mt-2">
                  <PrimaryButton
                    type="submit"
                    disabled={busy}
                    aria-busy={busy}
                    aria-label={busy ? "Signing in, please wait" : "Sign in"}
                  >
                    {busy ? (
                      <>
                        <span
                          className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
                          aria-hidden="true"
                        />
                        Signing in…
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </PrimaryButton>
                </div>
              </form>
            </div>
          </div>
        </div>

        <p className="mt-5 text-center text-sm text-gray-600">
          Need a different sign-in?{" "}
          <Link
            href="/login"
            className="font-semibold text-[#002B7F] hover:underline"
          >
            Employee Sign In
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

export default function AdminLoginPage() {
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
      <AdminLoginPageInner />
    </Suspense>
  );
}
