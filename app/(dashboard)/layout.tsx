"use client";

import { AppShell } from "@/components/Shell";
import { isPathAllowed, isRoleDashboardPath, isRoleDashboardAllowed } from "@/utils/roleRedirect";
import { useAuth, validateReturnTo } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { attachAudioUnlock } from "@/lib/notificationSound";
import { AccessDenied } from "@/components/ui/AccessDenied";

// Public paths that never need a session check — skip the ?next= param for them
const PUBLIC_AUTH_PATHS = ["/login", "/register"];

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
    permissionsLoaded,
    sidebarItems,
    visibleDashboards,
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

    // Unauthenticated: build the login URL.
    // • Preserve the intended destination as ?next= so login can return the
    //   user here after a successful sign-in.
    // • Append ?reason=session_expired when this tab previously had a session
    //   (the zyoris-had-session marker is set by login() and cleared by logout()).
    const hadSession =
      typeof sessionStorage !== "undefined" &&
      sessionStorage.getItem("zyoris-had-session") === "1";

    const currentPath = pathname ?? (typeof window !== "undefined" ? window.location.pathname : "");

    // Build safe next param: validate the current path through the same guard
    // used on the login side so we never store an unsafe value in the URL.
    const safePath = validateReturnTo(currentPath);

    const params = new URLSearchParams();
    if (hadSession) params.set("reason", "session_expired");
    if (safePath && !isPublicPath(safePath)) params.set("next", safePath);

    const qs = params.toString();
    router.replace(`/login${qs ? `?${qs}` : ""}`);
  }, [sessionStatus, pathname, router]);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (sessionStatus === "checking") {
    return (
      <div className="h-screen w-screen bg-[#f5f7fb] flex items-center justify-center">
        <div
          className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"
          role="status"
          aria-label="Loading…"
        />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  // ── Centralized route authorization check ────────────────────────────────
  // Inline render (not redirect) so the AppShell chrome stays visible and
  // the user sees the AccessDenied component rather than a blank redirect.
  const path = (
    pathname ?? (typeof window !== "undefined" ? window.location.pathname : "")
  )
    .split("?")[0]
    .replace(/\/+$/, "") || "/";

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
