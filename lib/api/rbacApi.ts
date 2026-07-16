import api from "./api";

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
  const res = await api.get<string[]>("/rbac/users/permissions", {
    params: { userId },
  });
  return res.data;
};

export const getRbacHealth = async (): Promise<RbacHealthResponse> => {
  const res = await api.get<RbacHealthResponse>("/rbac/health");
  return res.data;
};
