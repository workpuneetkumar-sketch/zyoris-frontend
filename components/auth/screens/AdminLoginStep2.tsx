"use client";

import React, { useRef, useState } from "react";
import BackButton from "../ui/BackButton";
import PasswordField from "../ui/PasswordField";
import PrimaryButton from "../ui/PrimaryButton";
import ProgressStepper from "../ui/ProgressStepper";
import { AlertCircle } from "lucide-react";

// ── Validation ────────────────────────────────────────────────────────────────

function validatePassword(value: string): string {
  if (!value) return "Password is required.";
  return "";
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface AdminLoginStep2Props {
  onBack: () => void;
  onNext: () => Promise<void>;
  password: string;
  setPassword: (val: string) => void;
  isLoading?: boolean;
  /** Auth error from context (set after a failed login attempt). */
  authError?: string | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminLoginStep2({
  onBack,
  onNext,
  password,
  setPassword,
  isLoading = false,
  authError,
}: AdminLoginStep2Props) {
  const [passwordError, setPasswordError] = useState("");
  const submittingRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validatePassword(password);
    setPasswordError(err);
    if (err) return;

    // Duplicate-submission guard
    if (submittingRef.current || isLoading) return;
    submittingRef.current = true;
    try {
      await onNext();
    } finally {
      submittingRef.current = false;
    }
  };

  const busy = isLoading || submittingRef.current;

  // Stable ID used to associate the auth error with the submit button via
  // aria-describedby so screen readers announce the error when focus reaches
  // the button.
  const errorId = "admin-step2-error";

  return (
    <div className="flex flex-col w-full max-w-md mx-auto bg-white rounded-2xl shadow-2xl shadow-blue-900/10 p-5 sm:p-8 md:p-10 border border-gray-100">
      <BackButton onClick={onBack} className="mb-4 sm:mb-8" />

      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Login</h2>
        <p className="text-gray-500 text-sm">Step 2 of 3</p>
      </div>

      <ProgressStepper currentStep={2} totalSteps={3} />

      {/* Auth error — mt-3 keeps breathing room below the stepper on all widths */}
      {authError && (
        <div
          id={errorId}
          role="alert"
          aria-live="assertive"
          className="flex items-start gap-2.5 mt-3 mb-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" aria-hidden="true" />
          <span>{authError}</span>
        </div>
      )}

      <form
        noValidate
        onSubmit={handleSubmit}
        className="flex flex-col gap-6 mt-5"
        aria-label="Admin sign-in step 2"
      >
        <div className="flex flex-col gap-2">
          <PasswordField
            id="admin-password"
            label="Password"
            placeholder="Enter your password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (passwordError) setPasswordError(validatePassword(e.target.value));
            }}
            onBlur={() => setPasswordError(validatePassword(password))}
            error={passwordError}
            disabled={busy}
          />
          {/* Forgot password — pending BD2 */}
          <div className="flex justify-end">
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

        <PrimaryButton
          type="submit"
          className="mt-2"
          disabled={busy}
          aria-busy={busy}
          aria-label={busy ? "Signing in, please wait" : "Continue"}
          // Connect the auth error to the button so assistive tech announces it
          // when the user navigates to the button after a failed attempt.
          aria-describedby={authError ? errorId : undefined}
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
            "Continue"
          )}
        </PrimaryButton>
      </form>
    </div>
  );
}
