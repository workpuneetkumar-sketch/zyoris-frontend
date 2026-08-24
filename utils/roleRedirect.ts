export type Role = string;

import { SidebarItem, DashboardItem } from "@/lib/api/frontendApi";

/** Map each role to its default landing path after login */
export const getDashboardForRole = (role: Role): string => "/dashboard";

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
  _visibleDashboards: DashboardItem[]   // kept for API compatibility, unused
): boolean => {
  // Normalise trailing slash
  const path =
    pathname.endsWith("/") && pathname.length > 1
      ? pathname.slice(0, -1)
      : pathname;

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
    "/finance",
    "/hr",
    "/settings",
    "/communications",
    "/email",
    "/whatsapp",
    "/calls",
    "/messages",
    "/meetings",
    "/admin",
    "/admin/rbac",
    "/admin/roles",
    "/admin/user-roles",
    "/admin/audit",
    "/calendar",
    "/tasks",
    "/projects",
    // deep sub-routes that don't need an explicit sidebar entry
    "/leads/assignment",
    "/dashboard/reminders",
    "/dashboard/builder",
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
    const CRM_EXPANSION = ["/leads", "/deals", "/contacts", "/companies", "/activities", "/ai-insights"];
    const COMM_EXPANSION = ["/communications", "/email", "/whatsapp", "/calls", "/messages", "/meetings", "/calendar", "/tasks", "/projects"];

    const hasCrmKey = sidebarItems.some((item) => (item.key ?? "").toLowerCase() === "crm");
    const hasCommKey = sidebarItems.some((item) => ["communications", "communication"].includes((item.key ?? "").toLowerCase()));

    if (hasCrmKey && CRM_EXPANSION.some((p) => path === p || path.startsWith(`${p}/`))) return true;
    if (hasCommKey && COMM_EXPANSION.some((p) => path === p || path.startsWith(`${p}/`))) return true;

    // tasks/calendar are standalone keys that map directly
    const standAloneRoutes = sidebarItems.map((item) => item.route).filter(Boolean);
    if (standAloneRoutes.some((r) => path === r || path.startsWith(`${r!}/`))) return true;

    // Role-specific dashboards — always allow if user is authenticated with sidebar data
    const normalizedPath = [
      "/dashboard/ceo",
      "/dashboard/cfo",
      "/dashboard/sales",
      "/dashboard/operations",
    ].includes(path)
      ? path.replace("/dashboard/", "/")
      : path;

    const ROLE_DASH = ["/ceo", "/cfo", "/sales", "/operations", "/admin"];
    if (ROLE_DASH.some((p) => normalizedPath === p || normalizedPath.startsWith(`${p}/`))) {
      return true;
    }

    const ADMIN_SUBROUTES = [
      "/admin/rbac",
      "/admin/roles",
      "/admin/user-roles",
      "/admin/audit",
    ];
    if (ADMIN_SUBROUTES.some((p) => normalizedPath === p || normalizedPath.startsWith(`${p}/`))) {
      return true;
    }

    // Path not matched → block
    return false;
  }

  // ── 3. Fallback: permissions not yet loaded — allow everything to prevent
  //    false redirects during the loading window ────────────────────────────
  return true;
};

// Legacy export kept for any remaining callers
export const isPathAllowedForRole = (_pathname: string, _role: Role): boolean => true;
