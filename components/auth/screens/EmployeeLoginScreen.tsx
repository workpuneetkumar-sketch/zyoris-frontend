import React, { useState } from "react";
import BrandPanel from "../ui/BrandPanel";
import BackButton from "../ui/BackButton";
import InputField from "../ui/InputField";
import PasswordField from "../ui/PasswordField";
import PrimaryButton from "../ui/PrimaryButton";
import { Mail } from "lucide-react";

interface EmployeeLoginScreenProps {
  onBack: () => void;
  onLogin: (email: string, password: string) => void;
  isLoading?: boolean;
}

export default function EmployeeLoginScreen({ onBack, onLogin, isLoading }: EmployeeLoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div className="flex w-full max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl shadow-blue-900/10 min-h-[600px] border border-gray-100">
      <BrandPanel />
      
      <div className="flex-1 flex flex-col p-8 sm:p-12">
        <BackButton onClick={onBack} className="mb-8" />
        
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Employee Sign In</h2>
          <p className="text-gray-500 text-sm">Welcome back! Please sign in to continue</p>
        </div>

        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          <InputField 
            label="Work Email" 
            placeholder="Enter your work email" 
            type="email" 
            icon={Mail} 
            required 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          
          <div className="flex flex-col gap-2">
            <PasswordField 
              label="Password" 
              placeholder="Enter your password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="flex justify-end">
              <button type="button" className="text-sm text-[#002B7F] font-semibold hover:underline focus:outline-none">
                Forgot password?
              </button>
            </div>
          </div>

          <div className="mt-4">
            <PrimaryButton type="submit" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}
