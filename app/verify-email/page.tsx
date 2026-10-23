"use client";

import React, { useRef, useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { verifyEmailApi, resendVerificationOtpApi } from "@/lib/api/authApi";
import { normaliseAuthError } from "@/lib/utils/authError";
import OTPInput from "@/components/auth/ui/OTPInput";
import PrimaryButton from "@/components/auth/ui/PrimaryButton";
import FeatureFooter from "@/components/auth/ui/FeatureFooter";

// ── Resend cooldown (seconds) ─────────────────────────────────────────────────
const RESEND_COOLDOWN_S = 60;

// ── Mask email for display — never log or expose the real value ───────────────
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "your email";
  const visible = local.length > 2 ? local.slice(0, 2) : local[0] ?? "";
  return `${visible}${"•".repeat(Math.max(local.length - 2, 3))}@${domain}`;
}

// ── Inner page ────────────────────────────────────────────────────────────────

function VerifyEmailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sessionStatus } = useAuth();

  // ── Resolve the email to verify ─────────────────────────────────────────────
  // Priority: ?email= query param (set by register flow) → sessionStorage.
  // The raw email is held only in component state; it is never written to
  // localStorage or logged.
  const [email, setEmail] = useState<string>(() => {
    // Read once on mount — searchParams is stable during SSR fallback
    const qEmail = searchParams?.get("email") ?? "";
    if (qEmail) return qEmail;
    if (typeof sessionStorage !== "undefined") {
      return sessionStorage.getItem("zyoris-pending-email") ?? "";
    }
    return "";
  });

  // ── State ────────────────────────────────────────────────────────────────────
  const [otp, setOtp] = useState("");
  const [otpComplete, setOtpComplete] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);
  const [alreadyVerified, setAlreadyVerified] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  /** true when the last error is a network/server error that can be retried */
  const [canRetry, setCanRetry] = useState(false);
  const submittingRef = useRef(false);
  const resendRef = useRef(false);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Redirect authenticated users (already verified + logged in) to dashboard
  useEffect(() => {
    if (sessionStatus === "authenticated") router.replace("/dashboard");
  }, [sessionStatus, router]);

  // Clear cooldown timer on unmount
  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  // ── OTP input tracking ───────────────────────────────────────────────────────
  const handleOtpChange = (val: string) => {
    setOtp(val);
    setOtpComplete(val.length === 6);
    // Clear previous error when user starts editing
    if (apiError) { setApiError(null); setCanRetry(false); }
  };

  // ── Verify submit ────────────────────────────────────────────────────────────
  const handleVerify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!otpComplete || submittingRef.current || isVerifying) return;
    if (!email) {
      setApiError("We couldn't determine your email address. Please go back and try again.");
      return;
    }

    submittingRef.current = true;
    setIsVerifying(true);
    setApiError(null);

    try {
      await verifyEmailApi(email, otp);
      // Clear the pending email from sessionStorage on success
      try { sessionStorage.removeItem("zyoris-pending-email"); } catch {}
      setSucceeded(true);
      setCanRetry(false);
    } catch (err: unknown) {
      const { kind, message } = normaliseAuthError(err);
      if (kind === "already_verified") {
        setAlreadyVerified(true);
      } else {
        setApiError(message);
        setCanRetry(kind === "network" || kind === "server");
      }
    } finally {
      setIsVerifying(false);
      submittingRef.current = false;
    }
  };

  // ── Resend OTP ───────────────────────────────────────────────────────────────
  const startCooldown = () => {
    setResendCooldown(RESEND_COOLDOWN_S);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resendRef.current || isResending) return;
    if (!email) {
      setApiError("We couldn't determine your email address. Please go back and try again.");
      return;
    }

    resendRef.current = true;
    setIsResending(true);
    setApiError(null);

    try {
      await resendVerificationOtpApi(email);
      startCooldown();
    } catch (err: unknown) {
      const { message } = normaliseAuthError(err);
      setApiError(message);
    } finally {
      setIsResending(false);
      resendRef.current = false;
    }
  };

  const formatCooldown = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0
      ? `${m}:${sec.toString().padStart(2, "0")}`
      : `${sec}s`;
  };

  // ── Already verified state ───────────────────────────────────────────────────
  if (alreadyVerified) {
    return (
      <div className="flex flex-col w-full max-w-md mx-auto bg-white rounded-2xl shadow-2xl shadow-blue-900/10 p-8 sm:p-10 border border-gray-100 text-center">
        <div className="flex justify-center mb-5">
          <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
            <CheckCircle className="w-7 h-7 text-[#002B7F]" aria-hidden="true" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Already verified</h2>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          This email address has already been verified. You can sign in now.
        </p>
        <Link href="/login">
          <PrimaryButton type="button">Go to sign in</PrimaryButton>
        </Link>
      </div>
    );
  }

  // ── Success state ────────────────────────────────────────────────────────────
  if (succeeded) {
    return (
      <div className="flex flex-col w-full max-w-md mx-auto bg-white rounded-2xl shadow-2xl shadow-blue-900/10 p-8 sm:p-10 border border-gray-100 text-center">
        <div className="flex justify-center mb-5">
          <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle className="w-7 h-7 text-green-500" aria-hidden="true" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Email verified!</h2>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          Your email address has been confirmed. You can now sign in to your account.
        </p>
        <PrimaryButton
          type="button"
          onClick={() => router.push("/login")}
          aria-label="Go to sign in"
        >
          Go to sign in
        </PrimaryButton>
      </div>
    );
  }

  // ── OTP entry form ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col w-full max-w-md mx-auto bg-white rounded-2xl shadow-2xl shadow-blue-900/10 p-5 sm:p-8 md:p-10 border border-gray-100">
      {/* Header */}
      <div className="flex justify-center mb-6">
        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
          <Mail className="w-6 h-6 text-[#002B7F]" aria-hidden="true" />
        </div>
      </div>

      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify your email</h2>
        <p className="text-gray-500 text-sm leading-relaxed">
          We sent a 6-digit code to{" "}
          <span className="font-semibold text-gray-700">
            {email ? maskEmail(email) : "your email"}
          </span>
          . Enter it below to confirm your address.
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
          <div className="flex flex-col gap-1 flex-1">
            <span>{apiError}</span>
            {canRetry && (
              <button
                type="button"
                onClick={() => {
                  setApiError(null);
                  setCanRetry(false);
                  handleVerify();
                }}
                className="text-xs font-semibold text-red-700 underline hover:no-underline self-start focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded"
                aria-label="Retry verification"
              >
                Try again
              </button>
            )}
          </div>
        </div>
      )}

      <form
        noValidate
        onSubmit={handleVerify}
        className="flex flex-col gap-6"
        aria-label="Email verification form"
      >
        {/* OTP input */}
        <div className="flex flex-col gap-3">
          <label
            id="verify-otp-label"
            className="text-sm font-semibold text-gray-800 text-center"
          >
            Verification code
          </label>
          <div aria-labelledby="verify-otp-label">
            <OTPInput
              length={6}
              onComplete={(val) => {
                handleOtpChange(val);
              }}
              onChange={(val) => {
                // Fires on every keystroke — reset completion state on partial edits
                if (val.length < 6) { setOtpComplete(false); if (apiError) { setApiError(null); setCanRetry(false); } }
              }}
            />
          </div>
          <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1">
            <Clock className="w-3 h-3" aria-hidden="true" />
            Code expires in 5 minutes
          </p>
        </div>

        {/* Submit */}
        <PrimaryButton
          type="submit"
          disabled={!otpComplete || isVerifying}
          aria-busy={isVerifying}
          aria-label={isVerifying ? "Verifying, please wait" : "Verify email"}
        >
          {isVerifying ? (
            <>
              <span
                className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
                aria-hidden="true"
              />
              Verifying…
            </>
          ) : (
            "Verify email"
          )}
        </PrimaryButton>
      </form>

      {/* Resend */}
      <div className="mt-5 flex items-center justify-center gap-1 text-sm">
        <span className="text-gray-500">Didn&apos;t receive a code?</span>
        <button
          type="button"
          onClick={handleResend}
          disabled={resendCooldown > 0 || isResending}
          aria-label={
            resendCooldown > 0
              ? `Resend available in ${formatCooldown(resendCooldown)}`
              : isResending
              ? "Sending new code…"
              : "Resend verification code"
          }
          className="ml-1 text-[#002B7F] font-semibold hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#002B7F] rounded disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {isResending
            ? "Sending…"
            : resendCooldown > 0
            ? `Resend (${formatCooldown(resendCooldown)})`
            : "Resend code"}
        </button>
      </div>

      <p className="mt-6 text-center text-sm text-gray-400">
        Wrong account?{" "}
        <Link href="/login" className="text-[#002B7F] font-semibold hover:underline">
          Sign in with a different email
        </Link>
      </p>
    </div>
  );
}

// ── Page export ───────────────────────────────────────────────────────────────

export default function VerifyEmailPage() {
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
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-40">
          <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] rounded-full border border-blue-200/50 blur-3xl" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[1000px] h-[1000px] rounded-full border border-blue-200/50 blur-3xl" />
        </div>

        <div className="flex-1 flex flex-col justify-center w-full max-w-7xl mx-auto px-4 py-6 sm:py-10 z-10">
          <div className="flex items-center justify-center">
            <VerifyEmailInner />
          </div>
          <div className="mt-8 sm:mt-12">
            <FeatureFooter />
          </div>
        </div>
      </div>
    </Suspense>
  );
}
