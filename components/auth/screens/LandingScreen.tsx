import React, { useState } from "react";
import { User, Shield, UserPlus, ArrowRight } from "lucide-react";
import PrimaryButton from "../ui/PrimaryButton";
import SecondaryButton from "../ui/SecondaryButton";
import Link from "next/link";

interface LandingScreenProps {
  onSelectEmployee: () => void;
  onSelectAdmin: () => void;
}

export default function LandingScreen({ onSelectEmployee, onSelectAdmin }: LandingScreenProps) {
  const [showLoginOptions, setShowLoginOptions] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto p-4 sm:p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <img src="/logo.jpeg" alt="Zyoris Logo" className="w-12 h-12 object-contain rounded" />
        <h1 className="text-2xl sm:text-3xl uppercase text-[#002B7F]" style={{ fontFamily: '"Neuropol X", "Neuropol X Free", sans-serif' }}>zyoris</h1>
      </div>

      <div className="text-center mb-8">
        <h2 className="text-xl sm:text-2xl font-bold mb-2">
          <span className="text-[#00194A]">Welcome to </span>
          <span className="text-[#002B7F]">ZYORIS</span>
        </h2>
        <p className="text-gray-500">Choose how you want to continue</p>
      </div>

      {/* Register View - Default */}
      {!showLoginOptions && (
        <div className="flex flex-col items-center w-full max-w-md">
          {/* Register Card */}
          <div className="w-full bg-gradient-to-br from-[#002B7F] to-[#1E40AF] rounded-3xl shadow-2xl shadow-blue-900/20 p-6 sm:p-8 flex flex-col items-center text-center border border-blue-500/20 transition-transform hover:-translate-y-1">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/15 rounded-full flex items-center justify-center mb-5 sm:mb-6 backdrop-blur-sm">
              <UserPlus className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">Register</h3>
            <p className="text-blue-100 text-xs sm:text-sm mb-6 sm:mb-8 leading-relaxed">
              Create a new account to get started with Zyoris and unlock the full platform experience
            </p>
            <Link href="/register" className="w-full max-w-xs">
              <button className="w-full inline-flex items-center justify-center gap-2 bg-white text-[#002B7F] font-bold px-6 sm:px-8 py-3.5 rounded-2xl hover:bg-blue-50 transition-colors shadow-xl text-sm sm:text-base">
                Create Account
                <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
          </div>

          {/* Already have account link below */}
          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm sm:text-base">
              Already have an account?{" "}
              <button
                onClick={() => setShowLoginOptions(true)}
                className="text-[#002B7F] font-semibold hover:underline"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      )}

      {/* Login View - After Sign in clicked */}
      {showLoginOptions && (
        <div className="flex flex-col items-center w-full">
          {/* Employee + Admin Cards */}
          <div className="flex flex-col md:flex-row gap-5 sm:gap-6 w-full max-w-2xl">
            {/* Employee Card */}
            <div className="flex-1 bg-white rounded-2xl shadow-xl shadow-blue-900/5 p-5 sm:p-7 flex flex-col items-center text-center border border-gray-100 transition-transform hover:-translate-y-1">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-50 rounded-full flex items-center justify-center mb-4 sm:mb-5">
                <User className="w-6 h-6 sm:w-7 sm:h-7 text-[#002B7F]" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">Employee</h3>
              <p className="text-gray-500 text-xs sm:text-sm mb-5 sm:mb-6 flex-1">
                Sign in with your work email to continue
              </p>
              <PrimaryButton onClick={onSelectEmployee} icon={<ArrowRight className="w-4 h-4" />}>
                Continue as Employee
              </PrimaryButton>
            </div>

            {/* Admin Card */}
            <div className="flex-1 bg-white rounded-2xl shadow-xl shadow-blue-900/5 p-5 sm:p-7 flex flex-col items-center text-center border border-gray-100 transition-transform hover:-translate-y-1">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-50 rounded-full flex items-center justify-center mb-4 sm:mb-5">
                <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-[#002B7F]" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">Admin</h3>
              <p className="text-gray-500 text-xs sm:text-sm mb-5 sm:mb-6 flex-1">
                Access the admin panel and manage your team
              </p>
              <SecondaryButton onClick={onSelectAdmin} icon={<ArrowRight className="w-4 h-4" />}>
                Continue as Admin
              </SecondaryButton>
            </div>
          </div>

          {/* Back to register option */}
          <div className="mt-6 text-center">
            <p className="text-gray-500 text-base">
              Don&apos;t have an account?{" "}
              <button
                onClick={() => setShowLoginOptions(false)}
                className="text-[#002B7F] font-semibold hover:underline"
              >
                Register
              </button>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
