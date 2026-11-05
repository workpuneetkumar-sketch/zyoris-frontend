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

/**
 * Canonical route to required view/access permissions mapping.
 * Access to any route or sub-route requires at least one of the listed permissions.
 */
export const ROUTE_PERMISSION_MAP: Record<string, string[]> = {
  "/leads": ["leads.view", "crm.view"],
  "/deals": ["deals.view", "crm.view"],
  "/contacts": ["contacts.view", "crm.view"],
  "/companies": ["companies.view", "crm.view"],
  "/customers": ["customers.view", "crm.view"],
  "/sales/execution": ["crm.view", "deals.view"],
  "/sales/activities": ["crm.view", "leads.view"],
  "/ai-insights": ["crm.view", "ai_copilot.access"],
  "/activities": ["crm.view", "leads.view"],
  "/tasks": ["tasks.view"],
  "/projects": ["projects.view"],
  "/documents": ["documents.view"],
  "/knowledge-base": ["knowledge.view"],
  "/hr": ["employees.view", "hr.view"],
  "/hr/employees": ["employees.view", "hr.view"],
  "/hr/attendance": ["attendance.view", "hr.view"],
  "/hr/leaves": ["leaves.view", "hr.view"],
  "/hr/payroll": ["payslips.view", "hr.view"],
  "/finance": ["finance.view"],
  "/finance/invoices": ["invoices.view", "finance.view"],
  "/payment": ["invoices.view", "finance.view"],
  "/payment/invoices": ["invoices.view", "finance.view"],
  "/finance/expenses": ["expenses.view", "finance.view"],
  "/marketing": ["marketing.view", "campaigns.view"],
  "/marketing/campaigns": ["campaigns.view", "marketing.view"],
  "/analytics": ["analytics.view"],
  "/reports": ["reports.view"],
  "/automation": ["automation.view", "automation.manage"],
  "/settings": ["settings.view", "settings.manage"],
  "/integrations": ["integrations.view", "settings.view", "settings.manage", "automation.manage"],
  "/communications": ["communication.access"],
  "/workspace": ["communication.access"],
  "/email": ["email.access", "communication.access"],
  "/whatsapp": ["whatsapp.access", "communication.access"],
  "/calls": ["calls.access", "communication.access"],
  "/messages": ["messages.access", "communication.access"],
  "/connect": ["messages.access", "communication.access"],
  "/meetings": ["meetings.access", "communication.access"],
  "/calendar": ["communication.access", "attendance.view", "shifts.view"],
};

// ─────────────────────────────────────────────────────────────────────────────
// isPathAllowed
//
// Single source of truth for route-access checks. Called by the dashboard
// layout on every navigation to decide whether the current user may visit the
// requested URL.
// ─────────────────────────────────────────────────────────────────────────────
export const isPathAllowed = (
  pathname: string,
  sidebarItems: SidebarItem[],
  _visibleDashboards: DashboardItem[] = [],   // kept for API compatibility, unused
  userRole?: string,
  userPermissions?: Record<string, boolean>
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

  // ── 1. Truly Universal Routes ──────────────────────────────────────────────
  // Only generic non-tenant user pages belong here.
  const UNIVERSAL_ROUTES = [
    "/dashboard",
    "/profile",
    "/portal",
    "/notifications",
  ];

  if (UNIVERSAL_ROUTES.some((p) => path === p || path.startsWith(`${p}/`))) {
    return true;
  }

  // ── 2. Permission-Based Validation (when userPermissions is available) ─────
  if (userPermissions !== undefined) {
    if (isAdmin) return true;

    // Check if the route (or parent prefix) is in the permission map
    for (const [routePrefix, requiredPerms] of Object.entries(ROUTE_PERMISSION_MAP)) {
      if (path === routePrefix || path.startsWith(`${routePrefix}/`)) {
        const hasAccess = requiredPerms.some((perm) => userPermissions[perm] === true);
        return hasAccess;
      }
    }

    // If path is in dynamic sidebar returned by backend for this user
    const inSidebar = sidebarItems.some(
      (item) => item.route && (path === item.route || path.startsWith(`${item.route}/`))
    );
    if (inSidebar) return true;

    // Default to denying access when permissions are loaded and route not permitted
    return false;
  }

  // ── 3. Dynamic check against the RBAC sidebar returned by the API (Legacy/Fallback) ──
  if (sidebarItems.length > 0) {
    // Direct route match
    const directMatch = sidebarItems.some(
      (item) =>
        item.route &&
        (path === item.route || path.startsWith(`${item.route}/`))
    );
    if (directMatch) return true;

    // Aggregate key expansion
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
    const COMM_EXPANSION = [
      "/communications",
      "/email",
      "/whatsapp",
      "/calls",
      "/messages",
      "/meetings",
      "/calendar",
      "/tasks",
      "/projects",
    ];

    const hasCrmKey = sidebarItems.some((item) => (item.key ?? "").toLowerCase() === "crm");
    const hasCommKey = sidebarItems.some((item) => ["communications", "communication"].includes((item.key ?? "").toLowerCase()));

    if (hasCrmKey && CRM_EXPANSION.some((p) => path === p || path.startsWith(`${p}/`))) return true;
    if (hasCommKey && COMM_EXPANSION.some((p) => path === p || path.startsWith(`${p}/`))) return true;

    const standAloneRoutes = sidebarItems.map((item) => item.route).filter(Boolean);
    if (standAloneRoutes.some((r) => path === r || path.startsWith(`${r!}/`))) return true;

    if (isRoleDashboardPath(path)) {
      return isRoleDashboardAllowed(path, userRole);
    }

    return false;
  }

  // ── 4. Fallback: permissions not yet loaded ──────────────────────────────
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
