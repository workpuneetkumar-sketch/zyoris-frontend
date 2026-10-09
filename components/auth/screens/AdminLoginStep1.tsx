"use client";

import React, { useState } from "react";
import BackButton from "../ui/BackButton";
import InputField from "../ui/InputField";
import PrimaryButton from "../ui/PrimaryButton";
import ProgressStepper from "../ui/ProgressStepper";
import { Mail } from "lucide-react";

// ── Validation ────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(value: string): string {
  if (!value.trim()) return "Email is required.";
  if (!EMAIL_RE.test(value.trim())) return "Please enter a valid email address.";
  return "";
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface AdminLoginStep1Props {
  onBack: () => void;
  onNext: () => void;
  email: string;
  setEmail: (val: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminLoginStep1({ onBack, onNext, email, setEmail }: AdminLoginStep1Props) {
  const [emailError, setEmailError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateEmail(email);
    setEmailError(err);
    if (err) return;
    onNext();
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto bg-white rounded-2xl shadow-2xl shadow-blue-900/10 p-5 sm:p-8 md:p-10 border border-gray-100">
      <BackButton onClick={onBack} className="mb-8" />

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Login</h2>
        <p className="text-gray-500 text-sm">Step 1 of 3</p>
      </div>

      <ProgressStepper currentStep={1} totalSteps={3} />

      <form
        noValidate
        onSubmit={handleSubmit}
        className="flex flex-col gap-8 mt-6"
        aria-label="Admin sign-in step 1"
      >
        <InputField
          id="admin-email"
          label="Email Address"
          placeholder="Enter your admin email"
          type="email"
          autoComplete="username email"
          icon={Mail}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailError) setEmailError(validateEmail(e.target.value));
          }}
          onBlur={() => setEmailError(validateEmail(email))}
          error={emailError}
        />

        <PrimaryButton type="submit">Continue</PrimaryButton>
      </form>
    </div>
  );
}
