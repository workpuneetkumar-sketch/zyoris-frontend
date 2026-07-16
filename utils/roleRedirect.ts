export type Role = string;

import { SidebarItem, DashboardItem } from "@/lib/api/frontendApi";

/** Map each role to its default dashboard path */
export const getDashboardForRole = (role: Role): string => {
  switch (role) {
    case "CEO":
      return "/dashboard";
    case "HR":
      return "/hr";
    case "FINANCE":
      return "/finance";
    case "PROJECT_MANAGER":
      return "/projects";
    case "CLIENT":
      return "/portal/dashboard";
    default:
      return "/dashboard";
  }
};

/** Allowed base paths for each role */
const ROLE_ALLOWED_PATHS: Record<Role, string[]> = {
  // ── Active roles (from AuthContext) ──────────────────────────
  ADMIN: [
    "/dashboard", "/leads", "/deals", "/contacts", "/companies", "/activities",
    "/email", "/whatsapp", "/calls", "/tasks", "/calendar", "/messages",
    "/hr", "/finance", "/marketing", "/projects", "/documents", "/knowledge-base",
    "/analytics", "/reports", "/settings", "/automation",
    "/ceo", "/cfo", "/sales", "/operations", "/admin",
    "/payment", "/profile", "/portal", "/meetings", "/communications",
  ],
  CEO: [
    "/dashboard", "/leads", "/deals", "/contacts", "/companies", "/activities",
    "/email", "/whatsapp", "/calls", "/tasks", "/calendar", "/messages",
    "/hr", "/finance", "/marketing", "/projects", "/documents", "/knowledge-base",
    "/analytics", "/reports", "/settings", "/automation",
    "/ceo", "/payment", "/profile", "/portal",
  ],
  CFO: [
    "/dashboard", "/deals", "/activities",
    "/email", "/whatsapp", "/calls", "/tasks", "/calendar", "/messages",
    "/finance", "/documents", "/knowledge-base",
    "/analytics", "/reports", "/settings",
    "/cfo", "/payment", "/profile",
  ],
  SALES_HEAD: [
    "/dashboard", "/leads", "/deals", "/contacts", "/companies", "/activities",
    "/email", "/whatsapp", "/calls", "/tasks", "/calendar", "/messages",
    "/documents", "/knowledge-base",
    "/reports", "/settings",
    "/sales", "/profile",
  ],
  OPERATIONS_HEAD: [
    "/dashboard", "/activities",
    "/email", "/whatsapp", "/calls", "/tasks", "/calendar", "/messages",
    "/projects", "/documents", "/knowledge-base",
    "/reports", "/settings",
    "/operations", "/profile",
  ],
  // ── Legacy roles (backward compatibility) ───────────────────
  HR: ["/hr", "/profile", "/settings"],
  FINANCE: ["/finance", "/payment", "/profile", "/settings"],
  PROJECT_MANAGER: ["/projects", "/profile", "/settings"],
  CLIENT: ["/portal"],
};

/**
 * Checks whether a given pathname is allowed for the specified role.
 * Allows exact matches or sub‑paths (e.g., /hr/employees).
 */
export const isPathAllowedForRole = (pathname: string, role: Role): boolean => {
  const allowed = ROLE_ALLOWED_PATHS[role] ?? [];
  return allowed.some((base) => pathname === base || pathname.startsWith(`${base}/`));
};

/**
 * Checks route access dynamically using sidebar items and dashboard configuration.
 */
export const isPathAllowed = (
  pathname: string,
  sidebarItems: SidebarItem[],
  visibleDashboards: DashboardItem[]
): boolean => {
  // Normalize pathname to prevent trailing slash issues
  const path = pathname.endsWith("/") && pathname.length > 1 ? pathname.slice(0, -1) : pathname;

  // Always allowed general/fallback routes
  if (
    ["/dashboard", "/profile", "/portal", "/meetings", "/communications", "/ai-insights"].some(
      (p) => path === p || path.startsWith(`${p}/`)
    )
  ) {
    return true;
  }

  // Also allow RBAC and audit control paths under /admin for convenience, or check them specifically
  if (
    path.startsWith("/admin/roles") ||
    path.startsWith("/admin/user-roles") ||
    path.startsWith("/admin/audit")
  ) {
    // If it's a role or user-roles management or audit log path, it's allowed if the user has access to /admin or specific settings
    return true;
  }

  // Check role-specific dashboards
  const dashboardRoutes = ["/ceo", "/cfo", "/sales", "/operations", "/admin"];
  const isDashboardRoute = dashboardRoutes.some((p) => path === p || path.startsWith(`${p}/`));
  if (isDashboardRoute) {
    const match = visibleDashboards.find((d) => path === d.route || path.startsWith(`${d.route}/`));
    return match ? match.visible : false;
  }

  // Check general modules
  const match = sidebarItems.find((item) => path === item.route || path.startsWith(`${item.route}/`));
  if (match) {
    return match.visible;
  }

  // Fallback to false
  return false;
};
