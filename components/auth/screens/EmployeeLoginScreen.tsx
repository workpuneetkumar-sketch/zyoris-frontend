"use client";

import React, { useRef, useState } from "react";
import BrandPanel from "../ui/BrandPanel";
import BackButton from "../ui/BackButton";
import InputField from "../ui/InputField";
import PasswordField from "../ui/PasswordField";
import PrimaryButton from "../ui/PrimaryButton";
import { Mail, AlertCircle, Clock } from "lucide-react";

// ── Validation helpers ────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(value: string): string {
  if (!value.trim()) return "Email is required.";
  if (!EMAIL_RE.test(value.trim())) return "Please enter a valid email address.";
  return "";
}

function validatePassword(value: string): string {
  if (!value) return "Password is required.";
  return "";
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface EmployeeLoginScreenProps {
  onBack: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
  isLoading?: boolean;
  /** Auth error from context (set after a failed login attempt). */
  authError?: string | null;
  /** When true the session-expired banner is shown above the form. */
  sessionExpired?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EmployeeLoginScreen({
  onBack,
  onLogin,
  isLoading = false,
  authError,
  sessionExpired = false,
}: EmployeeLoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  // Duplicate-submission guard: track in-flight state locally so the button is
  // disabled from the moment submit is pressed until the parent resolves.
  const submittingRef = useRef(false);

  // ── Validate on blur so errors appear only after the user leaves the field ──
  const handleEmailBlur = () => setEmailError(validateEmail(email));
  const handlePasswordBlur = () => setPasswordError(validatePassword(password));

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Full validation pass before hitting the network
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    setEmailError(eErr);
    setPasswordError(pErr);
    if (eErr || pErr) return;

    // Duplicate-submission guard
    if (submittingRef.current || isLoading) return;
    submittingRef.current = true;

    try {
      await onLogin(email.trim(), password);
    } finally {
      submittingRef.current = false;
    }
  };

  const busy = isLoading || submittingRef.current;

  return (
    <div className="flex flex-col md:flex-row w-full max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl shadow-blue-900/10 min-h-0 md:min-h-[560px] border border-gray-100 overflow-hidden">
      <BrandPanel />

      <div className="flex-1 flex flex-col p-5 sm:p-8 md:p-12">
        {/* ── Header row ── */}
        <div className="flex items-center justify-between mb-6">
          <BackButton onClick={onBack} />
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

        {/* ── Session-expired banner ── */}
        {sessionExpired && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-start gap-2.5 mb-5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm"
          >
            <Clock className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" aria-hidden="true" />
            <span>Your session has expired. Please sign in again to continue.</span>
          </div>
        )}

        {/* ── Auth error banner (post-submit) ── */}
        {authError && !sessionExpired && (
          <div
            role="alert"
            aria-live="assertive"
            className="flex items-start gap-2.5 mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" aria-hidden="true" />
            <span>{authError}</span>
          </div>
        )}

        {/* ── Title ── */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
            Employee Sign In
          </h2>
          <p className="text-gray-500 text-xs sm:text-sm">
            Welcome back! Please sign in to continue.
          </p>
        </div>

        {/* ── Form ── */}
        <form
          noValidate
          onSubmit={handleSubmit}
          className="flex flex-col gap-5"
          aria-label="Employee sign-in form"
        >
          <InputField
            id="employee-email"
            label="Work Email"
            placeholder="Enter your work email"
            type="email"
            autoComplete="username email"
            icon={Mail}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError(validateEmail(e.target.value));
            }}
            onBlur={handleEmailBlur}
            error={emailError}
            disabled={busy}
          />

          <div className="flex flex-col gap-1">
            <PasswordField
              id="employee-password"
              label="Password"
              placeholder="Enter your password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError(validatePassword(e.target.value));
              }}
              onBlur={handlePasswordBlur}
              error={passwordError}
              disabled={busy}
            />
            {/* Forgot password — pending BD2; shown as non-interactive note */}
            <div className="flex justify-end mt-1">
              <span
                className="text-sm text-gray-400 cursor-default select-none"
                title="Password reset is not yet available. Contact your administrator."
                aria-label="Forgot password — not yet available"
              >
                Forgot password?{" "}
                <span className="text-xs text-gray-400 italic">(coming soon)</span>
              </span>
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
  );
}
