"use client";

import React, { useRef, useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, CheckCircle, AlertCircle, Clock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { resetPasswordApi, resendOtpApi } from "@/lib/api/authApi";
import { normaliseAuthError } from "@/lib/utils/authError";
import OTPInput from "@/components/auth/ui/OTPInput";
import PrimaryButton from "@/components/auth/ui/PrimaryButton";
import FeatureFooter from "@/components/auth/ui/FeatureFooter";

// ── Resend cooldown ────────────────────────────────────────────────────────────
const RESEND_COOLDOWN_S = 60;

// ── Password requirements ─────────────────────────────────────────────────────
// Keep in sync with backend rules. These are displayed to the user; the
// backend is authoritative — a PASSWORD_TOO_WEAK error means the rule isn't
// met even if the client thinks it is.
const PW_MIN_LEN = 8;
const PW_RE_UPPER = /[A-Z]/;
const PW_RE_LOWER = /[a-z]/;
const PW_RE_NUMBER = /[0-9]/;

interface PwStrength {
  minLen: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
}

function checkPwStrength(pw: string): PwStrength {
  return {
    minLen: pw.length >= PW_MIN_LEN,
    hasUpper: PW_RE_UPPER.test(pw),
    hasLower: PW_RE_LOWER.test(pw),
    hasNumber: PW_RE_NUMBER.test(pw),
  };
}

function isPwValid(s: PwStrength) {
  return s.minLen && s.hasUpper && s.hasLower && s.hasNumber;
}

function validatePassword(pw: string): string {
  if (!pw) return "New password is required.";
  const s = checkPwStrength(pw);
  if (!isPwValid(s)) return "Password does not meet the requirements below.";
  return "";
}

function validateConfirm(pw: string, confirm: string): string {
  if (!confirm) return "Please confirm your new password.";
  if (pw !== confirm) return "Passwords do not match.";
  return "";
}

// ── Requirement pill ──────────────────────────────────────────────────────────
function Req({ met, label }: { met: boolean; label: string }) {
  return (
    <li
      className={`flex items-center gap-1.5 text-xs transition-colors ${
        met ? "text-green-600" : "text-gray-400"
      }`}
      aria-label={`${label}: ${met ? "met" : "not met"}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
          met ? "bg-green-500" : "bg-gray-300"
        }`}
        aria-hidden="true"
      />
      {label}
    </li>
  );
}

// ── Mask email ────────────────────────────────────────────────────────────────
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "your email";
  const visible = local.length > 2 ? local.slice(0, 2) : local[0] ?? "";
  return `${visible}${"•".repeat(Math.max(local.length - 2, 3))}@${domain}`;
}

// ── Inner page ────────────────────────────────────────────────────────────────

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sessionStatus } = useAuth();

  // ── Resolve email ────────────────────────────────────────────────────────────
  // Never put email in URL for this page — read from sessionStorage only.
  // The forgot-password page stores it there before redirecting here.
  const [email] = useState<string>(() => {
    if (typeof sessionStorage !== "undefined") {
      return sessionStorage.getItem("zyoris-pending-email") ?? "";
    }
    return "";
  });

  // ── Form state ────────────────────────────────────────────────────────────────
  const [otp, setOtp] = useState("");
  const [otpComplete, setOtpComplete] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const [otpError, setOtpError] = useState<string | null>(null);
  const [pwError, setPwError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [apiError, setApiError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  /** true when the last api error is retryable (network / server) */
  const [canRetry, setCanRetry] = useState(false);

  const submittingRef = useRef(false);
  const resendRef = useRef(false);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pwStrength = checkPwStrength(newPassword);

  // Redirect authenticated users
  useEffect(() => {
    if (sessionStatus === "authenticated") router.replace("/dashboard");
  }, [sessionStatus, router]);

  // Cleanup cooldown on unmount
  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  // If there's no email in sessionStorage the user landed here directly —
  // send them to forgot-password to begin the flow properly.
  useEffect(() => {
    if (!email) router.replace("/forgot-password");
  }, [email, router]);

  // ── Resend OTP ────────────────────────────────────────────────────────────────
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
    if (resendCooldown > 0 || resendRef.current || isResending || !email) return;
    resendRef.current = true;
    setIsResending(true);
    setApiError(null);
    try {
      await resendOtpApi(email);
      startCooldown();
    } catch (err: unknown) {
      const { message } = normaliseAuthError(err);
      setApiError(message);
    } finally {
      setIsResending(false);
      resendRef.current = false;
    }
  };

  const formatCooldown = (s: number) =>
    s >= 60
      ? `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`
      : `${s}s`;

  // ── Submit ────────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation pass
    const pErr = validatePassword(newPassword);
    const cErr = validateConfirm(newPassword, confirmPassword);
    setPwError(pErr);
    setConfirmError(cErr);
    if (!otpComplete) {
      setOtpError("Please enter the 6-digit code sent to your email.");
      return;
    }
    if (pErr || cErr) return;

    if (submittingRef.current || isLoading || !email) return;
    submittingRef.current = true;
    setIsLoading(true);
    setApiError(null);
    setOtpError(null);

    try {
      await resetPasswordApi(email, otp, newPassword);
      // Clean up the pending email — reset complete
      try { sessionStorage.removeItem("zyoris-pending-email"); } catch {}
      setSucceeded(true);
      setCanRetry(false);
    } catch (err: unknown) {
      const { kind, message } = normaliseAuthError(err);
      if (kind === "otp_invalid" || kind === "otp_expired") {
        setOtpError(message);
      } else if (kind === "too_many_attempts" || kind === "rate_limited") {
        setApiError(message);
        setCanRetry(false);
      } else if (kind === "password_too_weak") {
        setPwError(message);
      } else {
        setApiError(message);
        setCanRetry(kind === "network" || kind === "server");
      }
    } finally {
      setIsLoading(false);
      submittingRef.current = false;
    }
  };

  // ── Success state ─────────────────────────────────────────────────────────────
  if (succeeded) {
    return (
      <div className="flex flex-col w-full max-w-md mx-auto bg-white rounded-2xl shadow-2xl shadow-blue-900/10 p-8 sm:p-10 border border-gray-100 text-center">
        <div className="flex justify-center mb-5">
          <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle className="w-7 h-7 text-green-500" aria-hidden="true" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Password reset!</h2>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          Your password has been updated successfully. You can now sign in with
          your new password.
        </p>
        <PrimaryButton
          type="button"
          onClick={() => router.push("/login")}
          aria-label="Go to sign in"
        >
          Sign in
        </PrimaryButton>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col w-full max-w-md mx-auto bg-white rounded-2xl shadow-2xl shadow-blue-900/10 p-5 sm:p-8 md:p-10 border border-gray-100">
      {/* Header */}
      <div className="flex justify-center mb-6">
        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
          <KeyRound className="w-6 h-6 text-[#002B7F]" aria-hidden="true" />
        </div>
      </div>

      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Reset your password</h2>
        <p className="text-gray-500 text-sm leading-relaxed">
          Enter the code we sent to{" "}
          <span className="font-semibold text-gray-700">
            {email ? maskEmail(email) : "your email"}
          </span>{" "}
          and choose a new password.
        </p>
      </div>

      {/* API-level error banner */}
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
                  // Re-submit using the current field values
                  const syntheticEvent = { preventDefault: () => {} } as React.FormEvent;
                  handleSubmit(syntheticEvent);
                }}
                className="text-xs font-semibold text-red-700 underline hover:no-underline self-start focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded"
                aria-label="Retry password reset"
              >
                Try again
              </button>
            )}
          </div>
        </div>
      )}

      <form
        noValidate
        onSubmit={handleSubmit}
        className="flex flex-col gap-5"
        aria-label="Reset password form"
      >
        {/* ── OTP ───────────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-2">
          <label
            id="reset-otp-label"
            className="text-sm font-semibold text-gray-800"
          >
            6-digit reset code
          </label>
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <Clock className="w-3 h-3" aria-hidden="true" />
            Expires in 5 minutes
          </p>
          <div
            aria-labelledby="reset-otp-label"
            aria-describedby={otpError ? "reset-otp-error" : undefined}
          >
            <OTPInput
              length={6}
              onComplete={(val) => {
                setOtp(val);
                setOtpComplete(val.length === 6);
                if (otpError) setOtpError(null);
              }}
              onChange={(val) => {
                if (val.length < 6) {
                  setOtpComplete(false);
                  if (otpError) setOtpError(null);
                }
              }}
            />
          </div>
          {otpError && (
            <p
              id="reset-otp-error"
              role="alert"
              className="text-xs text-red-500 mt-0.5"
            >
              {otpError}
            </p>
          )}

          {/* Resend */}
          <div className="flex items-center gap-1 text-sm mt-1">
            <span className="text-gray-500 text-xs">Didn&apos;t receive it?</span>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || isResending}
              aria-label={
                resendCooldown > 0
                  ? `Resend available in ${formatCooldown(resendCooldown)}`
                  : isResending
                  ? "Sending new code…"
                  : "Resend reset code"
              }
              className="text-xs text-[#002B7F] font-semibold hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#002B7F] rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResending
                ? "Sending…"
                : resendCooldown > 0
                ? `Resend (${formatCooldown(resendCooldown)})`
                : "Resend code"}
            </button>
          </div>
        </div>

        {/* ── New password ───────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="reset-new-pw"
            className="text-sm font-semibold text-gray-800"
          >
            New password
          </label>
          <div className="relative">
            <input
              id="reset-new-pw"
              type={showNewPw ? "text" : "password"}
              autoComplete="new-password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (pwError) setPwError(validatePassword(e.target.value));
                if (confirmError && confirmPassword)
                  setConfirmError(validateConfirm(e.target.value, confirmPassword));
              }}
              onBlur={() => setPwError(validatePassword(newPassword))}
              aria-invalid={pwError ? "true" : "false"}
              aria-describedby={pwError ? "reset-pw-error" : "reset-pw-requirements"}
              disabled={isLoading}
              className={[
                "w-full bg-white border rounded-xl py-3 pl-4 pr-12 outline-none transition-all placeholder-gray-400 focus:ring-1",
                pwError
                  ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                  : "border-gray-200 focus:border-[#002B7F] focus:ring-[#002B7F]",
              ].join(" ")}
            />
            <button
              type="button"
              onClick={() => setShowNewPw((v) => !v)}
              aria-label={showNewPw ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#002B7F] rounded"
            >
              {showNewPw ? (
                <EyeOff className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Eye className="w-5 h-5" aria-hidden="true" />
              )}
            </button>
          </div>
          {pwError ? (
            <p id="reset-pw-error" role="alert" className="text-xs text-red-500 mt-0.5">
              {pwError}
            </p>
          ) : null}

          {/* Password requirements — always visible when field has content */}
          {newPassword.length > 0 && (
            <ul
              id="reset-pw-requirements"
              className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1"
              aria-label="Password requirements"
            >
              <Req met={pwStrength.minLen} label={`${PW_MIN_LEN}+ characters`} />
              <Req met={pwStrength.hasUpper} label="Uppercase letter" />
              <Req met={pwStrength.hasLower} label="Lowercase letter" />
              <Req met={pwStrength.hasNumber} label="Number" />
            </ul>
          )}
        </div>

        {/* ── Confirm password ───────────────────────────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="reset-confirm-pw"
            className="text-sm font-semibold text-gray-800"
          >
            Confirm new password
          </label>
          <div className="relative">
            <input
              id="reset-confirm-pw"
              type={showConfirmPw ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (confirmError)
                  setConfirmError(validateConfirm(newPassword, e.target.value));
              }}
              onBlur={() =>
                setConfirmError(validateConfirm(newPassword, confirmPassword))
              }
              aria-invalid={confirmError ? "true" : "false"}
              aria-describedby={confirmError ? "reset-confirm-error" : undefined}
              disabled={isLoading}
              className={[
                "w-full bg-white border rounded-xl py-3 pl-4 pr-12 outline-none transition-all placeholder-gray-400 focus:ring-1",
                confirmError
                  ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                  : "border-gray-200 focus:border-[#002B7F] focus:ring-[#002B7F]",
              ].join(" ")}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPw((v) => !v)}
              aria-label={showConfirmPw ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#002B7F] rounded"
            >
              {showConfirmPw ? (
                <EyeOff className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Eye className="w-5 h-5" aria-hidden="true" />
              )}
            </button>
          </div>
          {confirmError && (
            <p id="reset-confirm-error" role="alert" className="text-xs text-red-500 mt-0.5">
              {confirmError}
            </p>
          )}
        </div>

        {/* ── Submit ──────────────────────────────────────────────────────────── */}
        <PrimaryButton
          type="submit"
          disabled={isLoading}
          aria-busy={isLoading}
          aria-label={isLoading ? "Resetting password, please wait" : "Reset password"}
          className="mt-1"
        >
          {isLoading ? (
            <>
              <span
                className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
                aria-hidden="true"
              />
              Resetting…
            </>
          ) : (
            "Reset password"
          )}
        </PrimaryButton>
      </form>

      <p className="mt-6 text-center text-sm text-gray-400">
        <Link href="/forgot-password" className="text-[#002B7F] font-semibold hover:underline">
          Request a new code
        </Link>
        {" · "}
        <Link href="/login" className="hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

// ── Page export ───────────────────────────────────────────────────────────────

export default function ResetPasswordPage() {
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
            <ResetPasswordInner />
          </div>
          <div className="mt-8 sm:mt-12">
            <FeatureFooter />
          </div>
        </div>
      </div>
    </Suspense>
  );
}
