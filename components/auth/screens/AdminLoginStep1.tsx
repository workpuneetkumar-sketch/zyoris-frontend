import React from "react";
import BackButton from "../ui/BackButton";
import InputField from "../ui/InputField";
import PrimaryButton from "../ui/PrimaryButton";
import ProgressStepper from "../ui/ProgressStepper";
import { Mail } from "lucide-react";

interface AdminLoginStep1Props {
  onBack: () => void;
  onNext: () => void;
}

export default function AdminLoginStep1({ onBack, onNext }: AdminLoginStep1Props) {
  return (
    <div className="flex flex-col w-full max-w-md mx-auto bg-white rounded-2xl shadow-2xl shadow-blue-900/10 p-5 sm:p-8 md:p-10 border border-gray-100">
      <BackButton onClick={onBack} className="mb-8" />
      
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Login</h2>
        <p className="text-gray-500 text-sm">Step 1 of 4</p>
      </div>

      <ProgressStepper currentStep={1} totalSteps={4} />

      <form className="flex flex-col gap-8 mt-6" onSubmit={(e) => { e.preventDefault(); onNext(); }}>
        <InputField 
          label="Email Address" 
          placeholder="Enter your admin email" 
          type="email" 
          icon={Mail} 
          required 
        />
        
        <PrimaryButton type="submit">
          Continue
        </PrimaryButton>
      </form>
    </div>
  );
}
