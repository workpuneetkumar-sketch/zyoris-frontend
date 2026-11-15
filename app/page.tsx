"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";

export default function HomePage() {
  const { isAuthenticated, sessionStatus, roleVerificationStatus, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (sessionStatus === "checking") return;

    if (!isAuthenticated) {
      if (typeof window !== "undefined") {
        window.location.replace("/login");
      } else {
        router.replace("/login");
      }
    } else {
      router.replace("/dashboard");
    }
  }, [sessionStatus, isAuthenticated, roleVerificationStatus, user, router]);

  return (
    <div className="h-screen w-screen bg-[#f5f7fb] flex items-center justify-center">
      <div
        className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"
        role="status"
        aria-label="Loading Zyoris…"
      />
    </div>
  );
}

