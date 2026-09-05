import React from "react";
import BackButton from "../ui/BackButton";
import PasswordField from "../ui/PasswordField";
import PrimaryButton from "../ui/PrimaryButton";
import ProgressStepper from "../ui/ProgressStepper";

interface AdminLoginStep2Props {
  onBack: () => void;
  onNext: () => void;
}

export default function AdminLoginStep2({ onBack, onNext }: AdminLoginStep2Props) {
  return (
    <div className="flex flex-col w-full max-w-md mx-auto bg-white rounded-2xl shadow-2xl shadow-blue-900/10 p-5 sm:p-8 md:p-10 border border-gray-100">
      <BackButton onClick={onBack} className="mb-8" />
      
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Login</h2>
        <p className="text-gray-500 text-sm">Step 2 of 4</p>
      </div>

      <ProgressStepper currentStep={2} totalSteps={4} />

      <form className="flex flex-col gap-6 mt-6" onSubmit={(e) => { e.preventDefault(); onNext(); }}>
        <div className="flex flex-col gap-2">
          <PasswordField 
            label="Password" 
            placeholder="Enter your password" 
            required 
          />
          <div className="flex justify-end">
            <button type="button" className="text-sm text-[#002B7F] font-semibold hover:underline focus:outline-none">
              Forgot password?
            </button>
          </div>
        </div>
        
        <PrimaryButton type="submit" className="mt-2">
          Continue
        </PrimaryButton>
      </form>
    </div>
  );
}
