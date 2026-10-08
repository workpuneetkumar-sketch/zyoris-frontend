"use client";

import { AppShell } from "@/components/Shell";
import { isPathAllowed, isRoleDashboardPath, isRoleDashboardAllowed } from "@/utils/roleRedirect";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { attachAudioUnlock } from "@/lib/notificationSound";
import { AccessDenied } from "@/components/ui/AccessDenied";

function hasStoredToken(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem("zyoris-auth");
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return !!parsed?.token;
  } catch {
    return false;
  }
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const {
    user,
    isAuthenticated,
    isInitializing,
    permissionsLoaded,
    sidebarItems,
    visibleDashboards,
  } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    attachAudioUnlock();
  }, []);

  // Redirect to login only when definitively unauthenticated
  useEffect(() => {
    if (isInitializing) return;
    if (isAuthenticated) return;
    if (hasStoredToken()) return; // still restoring — wait
    router.replace("/login");
  }, [isAuthenticated, isInitializing, router]);

  if (isInitializing) {
    return (
      <div className="h-screen w-screen bg-[#f5f7fb] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  // Centralized route authorization check
  const path = (pathname ?? (typeof window !== "undefined" ? window.location.pathname : "")).split("?")[0].replace(/\/+$/, "") || "/";
  const isAdminPath = path === "/admin" || path.startsWith("/admin/");
  const isAdmin = user?.role?.toUpperCase() === "ADMIN";

  let isAllowed = true;
  if (isAdminPath) {
    isAllowed = isAdmin;
  } else if (isRoleDashboardPath(path)) {
    isAllowed = isRoleDashboardAllowed(path, user?.role);
  } else if (permissionsLoaded && sidebarItems && sidebarItems.length > 0) {
    isAllowed = isPathAllowed(path, sidebarItems, visibleDashboards, user?.role);
  }

  if (!isAllowed) {
    return (
      <AppShell>
        <AccessDenied />
      </AppShell>
    );
  }

  return <AppShell>{children}</AppShell>;
}
