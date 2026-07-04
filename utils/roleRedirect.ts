export type Role = string;

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
    "/payment", "/profile", "/portal",
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
