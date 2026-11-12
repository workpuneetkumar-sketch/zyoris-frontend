import { PERMISSIONS } from "../constants/permissions.ts";

export interface IntegrationUiPermissions {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canManage: boolean;
  canConfigure: boolean;
}

const PRIVILEGED_ROLE_FALLBACKS = new Set([
  "SUPER_ADMIN",
  "SUPERADMIN",
  "ORG_ADMIN",
  "ADMIN",
  "OWNER",
  "CEO",
  "CFO",
  "MANAGER",
  "OPERATIONS_HEAD",
]);

/**
 * Resolves granular integration UI permissions aligned with backend RBAC keys:
 *   - integrations.view
 *   - integrations.create
 *   - integrations.update
 *   - integrations.delete
 *
 * When backend RBAC permission maps are loaded, UI capabilities follow explicit
 * permission grants (with SUPER_ADMIN / SUPERADMIN fallback only if permission keys
 * have not yet loaded).
 */
export function resolveIntegrationUiPermissions(params: {
  role?: string | null;
  userPermissions?: Record<string, boolean> | null;
  hasPermission?: (permission: string) => boolean;
}): IntegrationUiPermissions {
  const { role, userPermissions, hasPermission } = params;
  const normalizedRole = (role || "").trim().toUpperCase();
  const permMap = userPermissions ?? {};
  const hasLoadedPermissions =
    Object.keys(permMap).length > 0 || typeof hasPermission === "function";

  const checkPerm = (key: string): boolean => {
    if (typeof hasPermission === "function") {
      return Boolean(hasPermission(key));
    }
    return Boolean(permMap[key] === true);
  };

  if (hasLoadedPermissions) {
    const canView =
      checkPerm(PERMISSIONS.INTEGRATIONS_VIEW) ||
      checkPerm(PERMISSIONS.INTEGRATIONS_CREATE) ||
      checkPerm(PERMISSIONS.INTEGRATIONS_UPDATE) ||
      checkPerm(PERMISSIONS.INTEGRATIONS_DELETE);
    const canCreate = checkPerm(PERMISSIONS.INTEGRATIONS_CREATE);
    const canUpdate = checkPerm(PERMISSIONS.INTEGRATIONS_UPDATE);
    const canDelete = checkPerm(PERMISSIONS.INTEGRATIONS_DELETE);

    return {
      canView,
      canCreate,
      canUpdate,
      canDelete,
      canManage: canCreate || canUpdate || canDelete,
      canConfigure: canUpdate || canCreate,
    };
  }

  // Fallback only when RBAC permissions dictionary is not yet loaded
  const isPrivilegedRole = PRIVILEGED_ROLE_FALLBACKS.has(normalizedRole);
  return {
    canView: true,
    canCreate: isPrivilegedRole,
    canUpdate: isPrivilegedRole,
    canDelete: isPrivilegedRole,
    canManage: isPrivilegedRole,
    canConfigure: isPrivilegedRole,
  };
}
