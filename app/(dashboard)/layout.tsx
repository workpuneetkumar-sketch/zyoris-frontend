"use client";

import { AppShell } from "@/components/Shell";
import { isPathAllowed, isRoleDashboardPath, isRoleDashboardAllowed } from "@/utils/roleRedirect";
import { useAuth, validateReturnTo } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { attachAudioUnlock } from "@/lib/notificationSound";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { ConnectNotificationProvider } from "@/context/ConnectNotificationContext";
import { ConnectToastContainer } from "@/components/connect/ConnectToastContainer";
import { ClientErrorBoundary } from "@/components/ui/ClientErrorBoundary";

// Public paths that never need a session check — skip the ?next= param for them
const PUBLIC_AUTH_PATHS = ["/login", "/admin/login", "/register"];

function isPublicPath(path: string) {
  return PUBLIC_AUTH_PATHS.some(
    (p) => path === p || path.startsWith(p + "/")
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const {
    user,
    isAuthenticated,
    sessionStatus,        // Phase 1/3: use this, not isInitializing
    roleVerificationStatus,
    permissionsLoaded,
    sidebarItems,
    visibleDashboards,
    userPermissions,
  } = useAuth();

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    attachAudioUnlock();
  }, []);

  // ── Authentication guard ───────────────────────────────────────────────────
  // Only act once the session check is complete — never while "checking".
  useEffect(() => {
    if (sessionStatus === "checking") return;
    if (sessionStatus === "authenticated") return;

    // Unauthenticated: send admin routes to their dedicated login page.
    // • Preserve the intended destination as ?next= so login can return the
    //   user here after a successful sign-in.
    // • Append ?reason=session_expired when this tab previously had a session
    //   (the zyoris-had-session marker is set by login() and cleared by logout()).
    const hadSession =
      typeof sessionStorage !== "undefined" &&
      sessionStorage.getItem("zyoris-had-session") === "1";

    const currentPath = pathname ?? (typeof window !== "undefined" ? window.location.pathname : "");
    const isPublicAdmin = currentPath === "/admin" || currentPath.startsWith("/admin/");
    const safePath = validateReturnTo(currentPath);

    const params = new URLSearchParams();
    if (hadSession) params.set("reason", "session_expired");
    if (safePath && !isPublicPath(safePath)) params.set("next", safePath);

    const qs = params.toString();
    const destination = isPublicAdmin ? "/admin/login" : `/login${qs ? `?${qs}` : ""}`;

    try {
      router.replace(destination);
    } catch {}

    // Hard fallback: if client-side navigation stalls or fails to transition, force window location
    if (typeof window !== "undefined") {
      const timer = setTimeout(() => {
        if (window.location.pathname !== destination.split("?")[0]) {
          window.location.replace(destination);
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [sessionStatus, pathname, router]);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (sessionStatus === "checking" || !isAuthenticated) {
    return (
      <div className="h-screen w-screen bg-[#f5f7fb] flex flex-col items-center justify-center gap-3">
        <div
          className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"
          role="status"
          aria-label={sessionStatus === "checking" ? "Loading…" : "Redirecting to login…"}
        />
        <span className="text-xs text-gray-500 font-medium select-none">
          {sessionStatus === "checking" ? "Loading…" : "Redirecting to login…"}
        </span>
      </div>
    );
  }

  // ── Centralized route authorization check ────────────────────────────────
  // Inline render (not redirect) so the AppShell chrome stays visible and
  // the user sees the AccessDenied component rather than a blank redirect.
  const path = (
    pathname ?? (typeof window !== "undefined" ? window.location.pathname : "")
  )
    .split("?")[0]
    .replace(/\/+$/, "") || "/";

  const isAdminPath = path === "/admin" || path.startsWith("/admin/");
  if (isAdminPath && roleVerificationStatus === "checking") {
    return (
      <div className="h-screen w-screen bg-[#f5f7fb] flex items-center justify-center">
        <div
          className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"
          role="status"
          aria-label="Verifying administrator access"
        />
      </div>
    );
  }

  const isUniversalRoute = [
    "/dashboard",
    "/profile",
    "/portal",
    "/notifications",
  ].some((p) => path === p || path.startsWith(`${p}/`));

  // If permissions are still loading and this is a protected non-universal route,
  // show loading indicator to prevent flashes of unauthorized content
  if (!permissionsLoaded && !isUniversalRoute && !isAdminPath && !isRoleDashboardPath(path)) {
    return (
      <div className="h-screen w-screen bg-[#f5f7fb] flex items-center justify-center">
        <div
          className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"
          role="status"
          aria-label="Loading permissions…"
        />
      </div>
    );
  }

  const isAdmin =
    roleVerificationStatus === "verified" &&
    user?.role?.trim().toUpperCase() === "ADMIN";

  let isAllowed = true;
  if (isAdminPath) {
    isAllowed = isAdmin;
  } else if (isRoleDashboardPath(path)) {
    isAllowed = isRoleDashboardAllowed(path, user?.role);
  } else if (permissionsLoaded) {
    isAllowed = isPathAllowed(path, sidebarItems, visibleDashboards, user?.role, userPermissions);
  }

  return (
    <ConnectNotificationProvider>
      <ClientErrorBoundary fallbackTitle="Dashboard Error">
        <AppShell>{!isAllowed ? <AccessDenied /> : children}</AppShell>
      </ClientErrorBoundary>
      <ConnectToastContainer />
    </ConnectNotificationProvider>
  );

  /*
    return (
      <AppShell>
        <AccessDenied />
      </AppShell>
    );
  }

  */
}
