"use client";

import React, { useState } from "react";
import LandingScreen from "../../components/auth/screens/LandingScreen";
import EmployeeLoginScreen from "../../components/auth/screens/EmployeeLoginScreen";
import AdminLoginStep1 from "../../components/auth/screens/AdminLoginStep1";
import AdminLoginStep2 from "../../components/auth/screens/AdminLoginStep2";
import AdminLoginStep3 from "../../components/auth/screens/AdminLoginStep3";
import FeatureFooter from "../../components/auth/ui/FeatureFooter";
import { useRouter } from "next/navigation";
import { toast } from "sonner"; // Using sonner as it's in package.json
import { useAuth } from "../../context/AuthContext";

type AuthState = "landing" | "employee" | "admin-1" | "admin-2" | "admin-3";

function getLoginErrorMessage(error: any) {
  const status = error?.response?.status;
  const responseMessage = String(
    error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      ""
  ).toLowerCase();

  if (
    status === 401 ||
    responseMessage.includes("unauthoriz") ||
    responseMessage.includes("invalid credentials") ||
    responseMessage.includes("invalid email or password")
  ) {
    return "Invalid credentials. Try again!";
  }

  if (
    status === 404 ||
    responseMessage.includes("user not found") ||
    responseMessage.includes("no sign up") ||
    responseMessage.includes("sign up first")
  ) {
    return "No sign up found. Please sign up first.";
  }

  if (responseMessage.includes("network") || responseMessage.includes("timeout")) {
    return "Login unavailable. Please check your connection and try again.";
  }

  return "Failed to login. Please try again.";
}

export default function LoginPage() {
  const [authState, setAuthState] = useState<AuthState>("landing");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  // Handlers for Employee flow
  const handleEmployeeLogin = async (email?: string, password?: string) => {
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    
    setIsLoading(true);
    try {
      await login(email, password);
      toast.success("Employee signed in successfully!");
      router.push("/dashboard");
    } catch (error: any) {
      toast.error(getLoginErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  // Handlers for Admin flow
  const handleAdminLoginComplete = () => {
    // We stop at Step 3 (skip 2FA)
    toast.success("Admin signed in successfully!");
    router.push("/dashboard");
  };

  const renderCurrentScreen = () => {
    switch (authState) {
      case "landing":
        return (
          <LandingScreen 
            onSelectEmployee={() => setAuthState("employee")} 
            onSelectAdmin={() => setAuthState("admin-1")} 
          />
        );
      case "employee":
        return (
          <EmployeeLoginScreen 
            onBack={() => setAuthState("landing")}
            onLogin={handleEmployeeLogin}
            isLoading={isLoading}
          />
        );
      case "admin-1":
        return (
          <AdminLoginStep1 
            onBack={() => setAuthState("landing")}
            onNext={() => setAuthState("admin-2")}
          />
        );
      case "admin-2":
        return (
          <AdminLoginStep2 
            onBack={() => setAuthState("admin-1")}
            onNext={() => setAuthState("admin-3")}
          />
        );
      case "admin-3":
        return (
          <AdminLoginStep3 
            onBack={() => setAuthState("admin-2")}
            onNext={handleAdminLoginComplete}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#F8FAFC] relative overflow-y-auto">
      {/* Abstract Background Waves (CSS based) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex justify-center items-center opacity-40">
        <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] rounded-full border-[1px] border-blue-200/50 blur-3xl"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[1000px] h-[1000px] rounded-full border-[1px] border-blue-200/50 blur-3xl"></div>
        <div className="absolute w-[120%] h-[120%] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxwYXR0ZXJuIGlkPSJwb2xrYSIgeD0iMCIgeT0iMCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48Y2lyY2xlIGZpbGw9IiNFMEU3RkYiIGN4PSIxMCIgY3k9IjEwIiByPSIxIj48L2NpcmNsZT48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjcG9sa2EpIj48L3JlY3Q+PC9zdmc+')] opacity-50 mix-blend-multiply"></div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-center w-full max-w-7xl mx-auto px-4 py-6 sm:py-10 z-10">
        <div className="flex items-center justify-center transition-all duration-300 ease-in-out">
          {renderCurrentScreen()}
        </div>
        
        {/* Footer */}
        <div className="mt-8 sm:mt-12">
          <FeatureFooter />
        </div>
      </div>
    </div>
  );
}
