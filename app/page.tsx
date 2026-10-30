"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";

export default function HomePage() {
  const { isAuthenticated, isInitializing, user, roleVerificationStatus } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (
      isInitializing ||
      (isAuthenticated && roleVerificationStatus === "checking")
    ) return;
    if (!isAuthenticated) {
      router.replace("/login");
    } else {
      router.replace(
        roleVerificationStatus === "verified" &&
          user?.role?.toUpperCase() === "ADMIN"
          ? "/admin"
          : "/dashboard"
      );
    }
  }, [isInitializing, isAuthenticated, roleVerificationStatus, user, router]);

  return null;
}
