import React, { useState, useEffect } from "react";
import BackButton from "../ui/BackButton";
import OTPInput from "../ui/OTPInput";
import PrimaryButton from "../ui/PrimaryButton";
import ProgressStepper from "../ui/ProgressStepper";

interface AdminLoginStep3Props {
  onBack: () => void;
  onNext: () => void;
}

export default function AdminLoginStep3({ onBack, onNext }: AdminLoginStep3Props) {
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
    // Add resend logic here
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto bg-white rounded-2xl shadow-2xl shadow-blue-900/10 p-8 sm:p-10 border border-gray-100">
      <BackButton onClick={onBack} className="mb-8" />
      
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Login</h2>
        <p className="text-gray-500 text-sm">Step 3 of 4</p>
      </div>

      <ProgressStepper currentStep={3} totalSteps={4} />

      <form className="flex flex-col gap-6 mt-6" onSubmit={(e) => { e.preventDefault(); onNext(); }}>
        <div className="flex flex-col gap-3">
          <label className="text-sm font-semibold text-gray-800">Verification Code</label>
          <p className="text-sm text-gray-500">Enter the 6-digit code sent to your email</p>
          
          <div className="mt-2 mb-4">
            <OTPInput length={6} onComplete={(val) => setOtp(val)} />
          </div>
          
          <div className="flex items-center text-sm">
            <span className="text-gray-500">Didn't receive a code?</span>
            <button
              type="button"
              onClick={handleResend}
              disabled={timeLeft > 0}
              className="ml-1 text-[#002B7F] font-semibold hover:underline focus:outline-none disabled:opacity-50 disabled:no-underline"
            >
              Resend ({formatTime(timeLeft)})
            </button>
          </div>
        </div>
        
        <PrimaryButton type="submit" disabled={otp.length !== 6}>
          Continue
        </PrimaryButton>
      </form>
    </div>
  );
}
