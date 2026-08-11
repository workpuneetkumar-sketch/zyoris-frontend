"use client";

import { AppShell } from "@/components/Shell";
import { isPathAllowed } from "@/utils/roleRedirect";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { attachAudioUnlock } from "@/lib/notificationSound";

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

  // Route access guard — runs only after permissions are fully loaded
  // Uses the RBAC sidebar from the API as single source of truth
  useEffect(() => {
    // Wait until everything is ready
    if (isInitializing || !permissionsLoaded || !isAuthenticated || !user) return;

    // If sidebar is empty the API hasn't returned yet — don't block
    if (!sidebarItems || sidebarItems.length === 0) return;

    const allowed = isPathAllowed(pathname ?? window.location.pathname, sidebarItems, visibleDashboards);

    if (!allowed) {
      // Redirect to /dashboard (universally allowed) instead of trying to
      // infer a fallback from visibleDashboards which may also be empty
      router.replace("/dashboard");
    }
  }, [
    isInitializing,
    permissionsLoaded,
    isAuthenticated,
    user,
    sidebarItems,
    visibleDashboards,
    pathname,
    router,
  ]);

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
