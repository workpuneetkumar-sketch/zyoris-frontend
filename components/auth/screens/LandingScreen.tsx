import React from "react";
import { User, Shield, ArrowRight } from "lucide-react";
import PrimaryButton from "../ui/PrimaryButton";
import SecondaryButton from "../ui/SecondaryButton";

interface LandingScreenProps {
  onSelectEmployee: () => void;
  onSelectAdmin: () => void;
}

export default function LandingScreen({ onSelectEmployee, onSelectAdmin }: LandingScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto p-4 sm:p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <img src="/logo.jpeg" alt="Zyoris Logo" className="w-14 h-14 object-contain rounded" />
        <h1 className="text-3xl uppercase text-[#002B7F]" style={{ fontFamily: '"Neuropol X", "Neuropol X Free", sans-serif' }}>zyoris</h1>
      </div>

      <div className="text-center mb-12">
        <h2 className="text-2xl sm:text-3xl font-bold mb-3">
          <span className="text-[#00194A]">Welcome to </span>
          <span className="text-[#002B7F]">ZYORIS</span>
        </h2>
        <p className="text-gray-500">Choose how you want to continue</p>
      </div>

      {/* Cards Container */}
      <div className="flex flex-col md:flex-row gap-6 w-full max-w-2xl">

        {/* Employee Card */}
        <div className="flex-1 bg-white rounded-2xl shadow-xl shadow-blue-900/5 p-8 flex flex-col items-center text-center border border-gray-100 transition-transform hover:-translate-y-1">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6">
            <User className="w-8 h-8 text-[#002B7F]" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Employee</h3>
          <p className="text-gray-500 text-sm mb-8 flex-1">
            Sign in with your work email to continue
          </p>
          <PrimaryButton onClick={onSelectEmployee} icon={<ArrowRight className="w-4 h-4" />}>
            Continue as Employee
          </PrimaryButton>
        </div>

        {/* Admin Card */}
        <div className="flex-1 bg-white rounded-2xl shadow-xl shadow-blue-900/5 p-8 flex flex-col items-center text-center border border-gray-100 transition-transform hover:-translate-y-1">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6">
            <Shield className="w-8 h-8 text-[#002B7F]" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Admin</h3>
          <p className="text-gray-500 text-sm mb-8 flex-1">
            Access the admin panel and manage your team
          </p>
          <SecondaryButton onClick={onSelectAdmin} icon={<ArrowRight className="w-4 h-4" />}>
            Continue as Admin
          </SecondaryButton>
        </div>

      </div>
    </div>
  );
}
