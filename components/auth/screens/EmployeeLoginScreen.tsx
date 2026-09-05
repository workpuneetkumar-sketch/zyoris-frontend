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
    <div className="flex flex-col md:flex-row w-full max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl shadow-blue-900/10 min-h-0 md:min-h-[560px] border border-gray-100 overflow-hidden">
      <BrandPanel />
      
      <div className="flex-1 flex flex-col p-5 sm:p-8 md:p-12">
        <div className="flex items-center justify-between mb-6">
          <BackButton onClick={onBack} />
          {/* Mobile-only logo mark */}
          <div className="md:hidden flex items-center gap-2">
            <img src="/logo.jpeg" alt="Zyoris Logo" className="w-6 h-6 object-contain rounded" />
            <span className="text-sm font-bold uppercase text-[#002B7F]" style={{ fontFamily: '"Neuropol X", "Neuropol X Free", sans-serif' }}>zyoris</span>
          </div>
        </div>
        
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">Employee Sign In</h2>
          <p className="text-gray-500 text-xs sm:text-sm">Welcome back! Please sign in to continue</p>
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
