import React, { useState, useEffect } from "react";
import BackButton from "../ui/BackButton";
import OTPInput from "../ui/OTPInput";
import PrimaryButton from "../ui/PrimaryButton";
import ProgressStepper from "../ui/ProgressStepper";

interface AdminLoginStep3Props {
  onBack: () => void;
  onNext: () => void;
  isLoading?: boolean;
}

export default function AdminLoginStep3({ onBack, onNext, isLoading }: AdminLoginStep3Props) {
  const [timeLeft, setTimeLeft] = useState(45);
  const [otp, setOtp] = useState("");

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `0${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleResend = () => {
    setTimeLeft(45);
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto bg-white rounded-2xl shadow-2xl shadow-blue-900/10 p-5 sm:p-8 md:p-10 border border-gray-100">
      <BackButton onClick={onBack} className="mb-4 sm:mb-8" />

      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Login</h2>
        <p className="text-gray-500 text-sm">Step 3 of 3</p>
      </div>

      <ProgressStepper currentStep={3} totalSteps={3} />

      <form
        className="flex flex-col gap-6 mt-5"
        onSubmit={(e) => {
          e.preventDefault();
          // Admin MFA is NOT enforced. The session is issued at Step 2;
          // this step verifies nothing. Blocked on a backend admin-MFA
          // endpoint that does not exist.
          onNext();
        }}
        aria-label="Admin sign-in step 3"
      >
        <div className="flex flex-col gap-3">
          <label className="text-sm font-semibold text-gray-800" id="otp-label">
            Verification Code
          </label>
          <p className="text-sm text-gray-500">
            Enter the 6-digit code sent to your email
          </p>

          <div className="mt-2 mb-2" aria-labelledby="otp-label">
            <OTPInput length={6} onComplete={(val) => setOtp(val)} />
          </div>

          <div className="flex items-center text-sm">
            <span className="text-gray-500">Didn&apos;t receive a code?</span>
            <button
              type="button"
              onClick={handleResend}
              disabled={timeLeft > 0}
              aria-label={
                timeLeft > 0
                  ? `Resend code available in ${formatTime(timeLeft)}`
                  : "Resend verification code"
              }
              className="ml-1 text-[#002B7F] font-semibold hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#002B7F] rounded disabled:opacity-50 disabled:no-underline"
            >
              Resend ({formatTime(timeLeft)})
            </button>
          </div>
        </div>

        <PrimaryButton
          type="submit"
          disabled={otp.length !== 6 || isLoading}
          aria-busy={isLoading}
          aria-label={isLoading ? "Signing in, please wait" : "Complete sign in"}
        >
          {isLoading ? (
            <>
              <span
                className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
                aria-hidden="true"
              />
              Signing in…
            </>
          ) : (
            "Complete Sign In"
          )}
        </PrimaryButton>
      </form>
    </div>
  );
}
