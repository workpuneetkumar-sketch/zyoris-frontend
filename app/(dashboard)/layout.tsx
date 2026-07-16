"use client";

import { AppShell } from "@/components/Shell";
import { isPathAllowed } from "@/utils/roleRedirect";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { NotificationProvider } from "@/hooks/useNotifications";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isInitializing, sidebarItems, visibleDashboards } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isInitializing, router]);

  useEffect(() => {
    if (isInitializing || !isAuthenticated || !user) return;

    const allowed = isPathAllowed(window.location.pathname, sidebarItems, visibleDashboards);

    if (!allowed) {
      const fallback = visibleDashboards.find((d) => d.visible)?.route || "/dashboard";
      router.replace(fallback);
    }
  }, [isInitializing, isAuthenticated, router, user, sidebarItems, visibleDashboards]);

  if (isInitializing) {
    return (
      <div className="h-screen w-screen bg-[#f5f7fb] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <NotificationProvider>
      <AppShell>{children}</AppShell>
    </NotificationProvider>
  );
}