"use client";

import { AppShell } from "@/components/Shell";
import { isPathAllowedForRole, getDashboardForRole } from "@/utils/roleRedirect";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isInitializing } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isInitializing, router]);

  useEffect(() => {
    if (isInitializing || !isAuthenticated || !user) return;

    const allowed = isPathAllowedForRole(window.location.pathname, user.role);

    if (!allowed) {
      const fallback = getDashboardForRole(user.role as any);
      router.replace(fallback);
    }
  }, [isInitializing, isAuthenticated, router, user]);

  if (isInitializing) {
    return (
      <div className="h-screen w-screen bg-[#f5f7fb] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <AppShell>{children}</AppShell>;
}