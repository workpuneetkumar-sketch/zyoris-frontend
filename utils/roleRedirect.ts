export type Role = string;

import type { SidebarItem, DashboardItem } from "../lib/api/frontendApi";

/** Map each role to its default landing path after login */
export const getDashboardForRole = (role: Role): string => "/dashboard";

export const ROLE_DASHBOARD_PERMISSIONS: Record<string, string[]> = {
  "/ceo": ["ADMIN", "CEO"],
  "/cfo": ["ADMIN", "CFO"],
  "/sales": ["ADMIN", "SALES_HEAD", "SALES_USER"],
  "/operations": ["ADMIN", "OPERATIONS_HEAD", "OPS", "OPERATIONS"],
};

export function normalizeDashboardPath(pathname: string): string {
  const clean = pathname.endsWith("/") && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
  if (clean === "/dashboard/ceo") return "/ceo";
  if (clean === "/dashboard/cfo") return "/cfo";
  if (clean === "/dashboard/sales") return "/sales";
  if (clean === "/dashboard/operations") return "/operations";
  return clean;
}

export function isRoleDashboardPath(pathname: string): boolean {
  const normalized = normalizeDashboardPath(pathname);
  return (
    normalized === "/ceo" ||
    normalized.startsWith("/ceo/") ||
    normalized === "/cfo" ||
    normalized.startsWith("/cfo/") ||
    normalized === "/sales" ||
    (normalized.startsWith("/sales/") && !normalized.startsWith("/sales/execution") && !normalized.startsWith("/sales/activities")) ||
    normalized === "/operations" ||
    normalized.startsWith("/operations/")
  );
}

export function isRoleDashboardAllowed(pathname: string, userRole?: string): boolean {
  if (!userRole) return false;
  const role = userRole.trim().toUpperCase();
  const normalized = normalizeDashboardPath(pathname);

  if (normalized === "/ceo" || normalized.startsWith("/ceo/")) {
    return ROLE_DASHBOARD_PERMISSIONS["/ceo"].includes(role);
  }
  if (normalized === "/cfo" || normalized.startsWith("/cfo/")) {
    return ROLE_DASHBOARD_PERMISSIONS["/cfo"].includes(role);
  }
  if (normalized === "/sales" || (normalized.startsWith("/sales/") && !normalized.startsWith("/sales/execution") && !normalized.startsWith("/sales/activities"))) {
    return ROLE_DASHBOARD_PERMISSIONS["/sales"].includes(role);
  }
  if (normalized === "/operations" || normalized.startsWith("/operations/")) {
    return ROLE_DASHBOARD_PERMISSIONS["/operations"].includes(role);
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// isPathAllowed
//
// Single source of truth for route-access checks. Called by the dashboard
// layout on every navigation to decide whether the current user may visit the
// requested URL.
//
// Rules (checked in order):
//   1. A handful of paths are always accessible (dashboard, profile, portal…).
//   2. If the `sidebarItems` array from the permissions API is non-empty, a
//      path is allowed when it matches (or starts with) any sidebar item's
//      `route`.  The `visible` flag is IGNORED here — the backend already
//      filtered the list; every item it returned is accessible.
//   3. Well-known "deep" routes that live under a sidebar route (e.g.
//      /leads/123, /deals/abc) are automatically covered by the prefix check
//      in rule 2, so no extra whitelist is needed.
//   4. If the sidebar list is empty (permissions not yet loaded, or the user
//      genuinely has no modules) we fall through to a broad static allow-list
//      so the user is never incorrectly locked out while the API is loading.
// ─────────────────────────────────────────────────────────────────────────────
export const isPathAllowed = (
  pathname: string,
  sidebarItems: SidebarItem[],
  _visibleDashboards: DashboardItem[] = [],   // kept for API compatibility, unused
  userRole?: string
): boolean => {
  // Normalise trailing slash
  const path =
    pathname.endsWith("/") && pathname.length > 1
      ? pathname.slice(0, -1)
      : pathname;

  const isAdminPath = path === "/admin" || path.startsWith("/admin/");
  const isAdmin = userRole ? userRole.toUpperCase() === "ADMIN" : false;

  // Strict check: Admin routes are ONLY accessible by users with role ADMIN
  if (isAdminPath) {
    return isAdmin;
  }

  // Strict check: Role Dashboards are ONLY accessible by authorized roles
  if (isRoleDashboardPath(path)) {
    return isRoleDashboardAllowed(path, userRole);
  }

  // ── 1. Always-allowed paths ──────────────────────────────────────────────
  const ALWAYS_ALLOWED = [
    "/dashboard",
    "/profile",
    "/portal",
    "/notifications",
    "/ai-insights",
    "/analytics",
    "/leads",
    "/deals",
    "/contacts",
    "/companies",
    "/customers",
    "/finance",
    "/hr",
    "/settings",
    "/communications",
    "/email",
    "/whatsapp",
    "/calls",
    "/messages",
    "/connect",
    "/meetings",
    "/calendar",
    "/tasks",
    "/projects",
    "/integrations",
    "/workspace",
    // Agentic CRM — Day 1-3
    "/agents",
    "/tools",
    "/approvals",
    "/executions",
    "/memory",
    // Day 6 — Operational Agent surfaces
    "/support",
    "/data-quality",
    "/revops",
    "/workflows/drafts",
    // deep sub-routes that don't need an explicit sidebar entry
    "/leads/assignment",
    "/dashboard/reminders",
    "/dashboard/builder",
    "/dashboard/contacts",
    // Day 6 Agent pages
    "/support",
    "/revops",
    "/reports",
    // Ingestion Center routes (gated at page level)
    "/ingestion",
    "/leads/ingest",
  ];

  if (ALWAYS_ALLOWED.some((p) => path === p || path.startsWith(`${p}/`))) {
    return true;
  }

  // ── 2. Dynamic check against the RBAC sidebar returned by the API ────────
  if (sidebarItems.length > 0) {
    // Direct route match
    const directMatch = sidebarItems.some(
      (item) =>
        item.route &&
        (path === item.route || path.startsWith(`${item.route}/`))
    );
    if (directMatch) return true;

    // Aggregate key expansion — if the API returns key:"crm" that expands to
    // /leads, /deals, etc., those sub-routes must also be allowed
    const CRM_EXPANSION = [
      "/leads",
      "/deals",
      "/contacts",
      "/companies",
      "/customers",
      "/activities",
      "/ai-insights",
      "/sales/execution",
      "/sales/activities",
    ];
    const COMM_EXPANSION = ["/communications", "/email", "/whatsapp", "/calls", "/messages", "/meetings", "/calendar", "/tasks", "/projects"];

    const hasCrmKey = sidebarItems.some((item) => (item.key ?? "").toLowerCase() === "crm");
    const hasCommKey = sidebarItems.some((item) => ["communications", "communication"].includes((item.key ?? "").toLowerCase()));

    if (hasCrmKey && CRM_EXPANSION.some((p) => path === p || path.startsWith(`${p}/`))) return true;
    if (hasCommKey && COMM_EXPANSION.some((p) => path === p || path.startsWith(`${p}/`))) return true;

    // tasks/calendar are standalone keys that map directly
    const standAloneRoutes = sidebarItems.map((item) => item.route).filter(Boolean);
    if (standAloneRoutes.some((r) => path === r || path.startsWith(`${r!}/`))) return true;

    // Role-specific dashboards — check against allowed roles
    if (isRoleDashboardPath(path)) {
      return isRoleDashboardAllowed(path, userRole);
    }

    if (isAdmin) {
      const ADMIN_SUBROUTES = [
        "/admin/rbac",
        "/admin/roles",
        "/admin/user-roles",
        "/admin/audit",
        "/admin/permission-matrix",
        // Day 7
        "/admin/agents/config",
        "/admin/agents/observability",
        "/admin/agents/versions",
      ];
      const normalizedAdminPath = [
        "/dashboard/ceo",
        "/dashboard/cfo",
        "/dashboard/sales",
        "/dashboard/operations",
      ].includes(path)
        ? path.replace("/dashboard/", "/")
        : path;
      if (ADMIN_SUBROUTES.some((p) => normalizedAdminPath === p || normalizedAdminPath.startsWith(`${p}/`))) {
        return true;
      }
    }

    // Path not matched → block
    return false;
  }

  // ── 3. Fallback: permissions not yet loaded — allow everything to prevent
  //    false redirects during the loading window, EXCEPT admin routes for non-admins
  //    and role dashboards for unauthorized roles ──
  if (isAdminPath) {
    return isAdmin;
  }
  if (isRoleDashboardPath(path)) {
    return isRoleDashboardAllowed(path, userRole);
  }
  return true;
};

// Legacy export kept for any remaining callers
export const isPathAllowedForRole = (pathname: string, role: Role): boolean => {
  return isPathAllowed(pathname, [], [], role);
};
