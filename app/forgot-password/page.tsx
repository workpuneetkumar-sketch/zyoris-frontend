"use client";

import React, { useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { forgotPasswordApi } from "@/lib/api/authApi";
import { normaliseAuthError } from "@/lib/utils/authError";
import InputField from "@/components/auth/ui/InputField";
import PrimaryButton from "@/components/auth/ui/PrimaryButton";
import FeatureFooter from "@/components/auth/ui/FeatureFooter";

// ── Validation ────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_COOLDOWN_S = 60;

function validateEmail(v: string): string {
  if (!v.trim()) return "Email is required.";
  if (!EMAIL_RE.test(v.trim())) return "Please enter a valid email address.";
  return "";
}

// ── Inner page (safe to use hooks) ────────────────────────────────────────────

function ForgotPasswordInner() {
  const router = useRouter();
  const { sessionStatus } = useAuth();

  // Redirect already-authenticated users away
  React.useEffect(() => {
    if (sessionStatus === "authenticated") router.replace("/dashboard");
  }, [sessionStatus, router]);

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const submittingRef = useRef(false);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = () => {
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    setCooldown(RESEND_COOLDOWN_S);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  React.useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const err = validateEmail(email);
    setEmailError(err);
    if (err) return;

    if (submittingRef.current || isLoading || cooldown > 0) return;
    submittingRef.current = true;
    setIsLoading(true);
    setApiError(null);

    try {
      await forgotPasswordApi(email.trim());
      // The backend returns the same 200 response regardless of whether the
      // account exists — so a resolved promise always means success.
      try {
        sessionStorage.setItem("zyoris-pending-email", email.trim());
      } catch {}
      setSucceeded(true);
      startCooldown();
    } catch (err: unknown) {
      // Dev-only: log the raw HTTP status and response body so the backend
      // team can confirm whether /auth/forgot-password is reaching the email
      // provider. Guarded from production — never shown to users.
      if (process.env.NODE_ENV !== "production") {
        const e = err as any;
        console.error(
          "[forgot-password] API error — status:",
          e?.response?.status ?? "no response",
          "body:",
          e?.response?.data ?? e?.message ?? err
        );
      }

      const { kind, message } = normaliseAuthError(err);
      if (kind === "rate_limited") {
        setApiError(message);
      } else if (kind === "network") {
        setApiError(message);
      } else if (kind === "server") {
        setApiError(message);
      } else {
        // Display the error to the user. The backend's anti-enumeration
        // guarantee is preserved because a non-existent email resolves with
        // HTTP 200 (caught above), never reaching this catch block.
        setApiError(message);
      }
    } finally {
      setIsLoading(false);
      submittingRef.current = false;
    }
  };

  const handleResend = async () => {
    if (submittingRef.current || isLoading || cooldown > 0 || !email.trim()) return;
    submittingRef.current = true;
    setIsLoading(true);
    setApiError(null);

    try {
      await forgotPasswordApi(email.trim());
      try {
        sessionStorage.setItem("zyoris-pending-email", email.trim());
      } catch {}
      startCooldown();
    } catch (err: unknown) {
      const { message } = normaliseAuthError(err);
      setApiError(message);
    } finally {
      setIsLoading(false);
      submittingRef.current = false;
    }
  };

  // ── Success state ────────────────────────────────────────────────────────────
  if (succeeded) {
    return (
      <div className="flex flex-col w-full max-w-md mx-auto bg-white rounded-2xl shadow-2xl shadow-blue-900/10 p-8 sm:p-10 border border-gray-100 text-center">
        <div className="flex justify-center mb-5">
          <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle className="w-7 h-7 text-green-500" aria-hidden="true" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Check your email</h2>
        <p className="text-gray-500 text-sm leading-relaxed mb-2">
          OTP has been sent successfully to your registered email address.
        </p>
        <p className="text-gray-500 text-xs leading-relaxed mb-2">
          Sent to{" "}
          <span className="font-semibold text-gray-700">
            {email.replace(/(.{2}).*(@.*)/, "$1…$2")}
          </span>
        </p>
        <p className="text-gray-400 text-xs mb-8">
          The code expires in 5 minutes. Check your spam folder if you don&apos;t see it.
        </p>

        {apiError && (
          <div
            role="alert"
            aria-live="assertive"
            className="flex items-start gap-2.5 mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm text-left"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" aria-hidden="true" />
            <span>{apiError}</span>
          </div>
        )}

        <PrimaryButton
          type="button"
          onClick={() => {
            try {
              sessionStorage.setItem("zyoris-pending-email", email.trim());
            } catch {}
            router.push("/reset-password");
          }}
        >
          Enter reset code
        </PrimaryButton>

        <div className="mt-4 flex flex-col items-center gap-2">
          {cooldown > 0 ? (
            <p className="text-xs text-gray-400">
              Resend available in{" "}
              <span className="font-semibold text-gray-600">{cooldown}s</span>
            </p>
          ) : (
            <button
              type="button"
              disabled={isLoading || cooldown > 0}
              onClick={handleResend}
              className="text-xs text-[#002B7F] font-semibold hover:underline disabled:opacity-50"
            >
              {isLoading ? "Sending…" : "Resend code"}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setSucceeded(false);
              setEmail("");
              setApiError(null);
            }}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  // ── Form state ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col w-full max-w-md mx-auto bg-white rounded-2xl shadow-2xl shadow-blue-900/10 p-5 sm:p-8 md:p-10 border border-gray-100">
      {/* Back to login */}
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6 sm:mb-8 w-fit"
        aria-label="Back to sign in"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to sign in
      </Link>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Forgot password?</h2>
        <p className="text-gray-500 text-sm leading-relaxed">
          Enter your account email and we&apos;ll send a 6-digit code to reset your
          password.
        </p>
      </div>

      {/* API error banner */}
      {apiError && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex items-start gap-2.5 mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" aria-hidden="true" />
          <span>{apiError}</span>
        </div>
      )}

      <form
        noValidate
        onSubmit={handleSubmit}
        className="flex flex-col gap-6"
        aria-label="Forgot password form"
      >
        <InputField
          id="forgot-email"
          label="Email address"
          type="email"
          autoComplete="username email"
          placeholder="Enter your account email"
          icon={Mail}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailError) setEmailError(validateEmail(e.target.value));
          }}
          onBlur={() => setEmailError(validateEmail(email))}
          error={emailError}
          disabled={isLoading}
        />

        <PrimaryButton
          type="submit"
          disabled={isLoading || cooldown > 0}
          aria-busy={isLoading}
          aria-label={
            isLoading
              ? "Sending reset code, please wait"
              : cooldown > 0
              ? `Please wait ${cooldown}s before requesting again`
              : "Send reset code"
          }
        >
          {isLoading ? (
            <>
              <span
                className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
                aria-hidden="true"
              />
              Sending…
            </>
          ) : cooldown > 0 ? (
            `Resend available in ${cooldown}s`
          ) : (
            "Send reset code"
          )}
        </PrimaryButton>
      </form>

      <p className="mt-6 text-center text-sm text-gray-400">
        Remembered it?{" "}
        <Link href="/login" className="text-[#002B7F] font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

// ── Page export ───────────────────────────────────────────────────────────────

export default function ForgotPasswordPage() {
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
      <div className="min-h-screen w-full flex flex-col bg-[#F8FAFC] relative overflow-y-auto">
        {/* Abstract background — same as login */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-40">
          <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] rounded-full border border-blue-200/50 blur-3xl" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[1000px] h-[1000px] rounded-full border border-blue-200/50 blur-3xl" />
        </div>

        <div className="flex-1 flex flex-col justify-center w-full max-w-7xl mx-auto px-4 py-6 sm:py-10 z-10">
          <div className="flex items-center justify-center">
            <ForgotPasswordInner />
          </div>
          <div className="mt-8 sm:mt-12">
            <FeatureFooter />
          </div>
        </div>
      </div>
    </Suspense>
  );
}
