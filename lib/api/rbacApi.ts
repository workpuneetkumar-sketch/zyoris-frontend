import api from "./api";

interface PermissionObject {
  id?: string;
  key?: string;
  name?: string;
  description?: string;
  module?: string;
  action?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

const getPermissionKey = (perm: string | PermissionObject): string => {
  if (typeof perm === "string") return perm;
  return perm.key || perm.name || String(perm);
};

export interface RbacRole {
  id: string;
  name: string;
  description?: string;
}

export interface RbacMeResponse {
  userId: string;
  organizationId: string;
  organization: string;
  role: RbacRole;
  permissions: Record<string, boolean>;
}

export interface RbacVisibleModule {
  module: string;
  visible: boolean;
}

export interface RbacRoleMatrixItem {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
}

export interface RbacHealthResponse {
  healthy: boolean;
  missingPermissions: string[];
  duplicatePermissions: string[];
  missingRoles: string[];
  invalidMappings: Array<{
    role: string;
    missingPermissions: string[];
  }>;
}

export const getRbacMe = async (): Promise<RbacMeResponse> => {
  const res = await api.get<RbacMeResponse>("/rbac/me");
  return res.data;
};

export const getRbacModules = async (): Promise<string[]> => {
  const res = await api.get<string[]>("/rbac/modules");
  return res.data;
};

export const getRbacVisibleModules = async (): Promise<RbacVisibleModule[]> => {
  const res = await api.get<RbacVisibleModule[]>("/rbac/visible-modules");
  return res.data;
};

export const getRbacRoles = async (): Promise<RbacRoleMatrixItem[]> => {
  const res = await api.get<RbacRoleMatrixItem[]>("/rbac/roles");
  return res.data;
};

export const getRbacRoleDetails = async (roleId: string): Promise<RbacRoleMatrixItem> => {
  const res = await api.get<RbacRoleMatrixItem>(`/rbac/roles/${roleId}`);
  return res.data;
};

export const getRbacUserPermissions = async (userId: string): Promise<string[]> => {
  try {
    const res = await api.get<{
      userId: string;
      permissions: Record<string, boolean>;
    }>("/rbac/users/permissions", {
      params: { userId },
    });
    // Backend returns { permissions: { "key": true|false } } — extract granted keys
    const data = res.data;
    if (!data) return [];
    
    // Check if data is an array
    if (Array.isArray(data)) {
      return data.map(getPermissionKey);
    }
    
    const perms = data.permissions;
    if (perms && typeof perms === "object" && !Array.isArray(perms)) {
      return Object.entries(perms)
        .filter(([, granted]) => granted === true)
        .map(([key]) => key);
    }
    
    // Check if data itself is permissions array
    if (Array.isArray(data.permissions)) {
      return data.permissions.map(getPermissionKey);
    }
    return [];
  } catch (err) {
    console.error("Error fetching user permissions:", err);
    return [];
  }
};

export const getRbacHealth = async (): Promise<RbacHealthResponse> => {
  const res = await api.get<RbacHealthResponse>("/rbac/health");
  return res.data;
};
