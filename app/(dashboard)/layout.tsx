"use client";

import { AppShell } from "@/components/Shell";
import { isPathAllowed } from "@/utils/roleRedirect";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { NotificationProvider } from "@/hooks/useNotifications";

// Helper: check if localStorage has a token (runs client-side only).
// This is used to suppress the redirect-to-login while AuthContext is
// still initialising on a hard refresh — if a token exists in storage,
// we know the user was logged in and should wait for restore to complete.
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
  const { user, isAuthenticated, isInitializing, sidebarItems, visibleDashboards } = useAuth();
  const router = useRouter();

  // Only redirect to /login when:
  //   1. AuthContext has finished initializing (isInitializing = false), AND
  //   2. The user is genuinely not authenticated, AND
  //   3. There is no stored token in localStorage (i.e. not a hard-refresh race)
  useEffect(() => {
    if (isInitializing) return;
    if (isAuthenticated) return;
    // Double-check: if there's still a token in storage, don't redirect yet —
    // the background validation may still be in flight.
    if (hasStoredToken()) return;
    router.replace("/login");
  }, [isAuthenticated, isInitializing, router]);

  // Route access guard — only runs after full auth + permissions are loaded
  useEffect(() => {
    if (isInitializing || !isAuthenticated || !user) return;

    const allowed = isPathAllowed(window.location.pathname, sidebarItems, visibleDashboards);

    if (!allowed) {
      const fallback = visibleDashboards.find((d) => d.visible)?.route || "/dashboard";
      router.replace(fallback);
    }
  }, [isInitializing, isAuthenticated, router, user, sidebarItems, visibleDashboards]);

  // Show spinner while restoring session
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
