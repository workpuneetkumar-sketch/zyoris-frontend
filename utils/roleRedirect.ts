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
  CEO: ["/dashboard", "/hr", "/finance", "/projects", "/portal"],
  HR: ["/hr"],
  FINANCE: ["/finance"],
  PROJECT_MANAGER: ["/projects"],
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
