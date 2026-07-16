import api from "./api";
import { RbacRoleMatrixItem } from "./rbacApi";

export interface CreateRolePayload {
  name: string;
  description?: string;
}

export interface UpdateRolePayload {
  name?: string;
  description?: string;
}

export interface RolePermissionsResponse {
  roleId: string;
  permissions: string[];
}

export interface GetRolesPaginatedResponse {
  roles: RbacRoleMatrixItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const getRoles = async (): Promise<RbacRoleMatrixItem[]> => {
  const res = await api.get<RbacRoleMatrixItem[]>("/roles");
  return res.data;
};

export const getRole = async (roleId: string): Promise<RbacRoleMatrixItem> => {
  const res = await api.get<RbacRoleMatrixItem>(`/roles/${roleId}`);
  return res.data;
};

export const createRole = async (data: CreateRolePayload): Promise<RbacRoleMatrixItem> => {
  const res = await api.post<RbacRoleMatrixItem>("/roles", data);
  return res.data;
};

export const updateRole = async (roleId: string, data: UpdateRolePayload): Promise<RbacRoleMatrixItem> => {
  const res = await api.patch<RbacRoleMatrixItem>(`/roles/${roleId}`, data);
  return res.data;
};

export const deleteRole = async (roleId: string): Promise<{ success: boolean }> => {
  const res = await api.delete<{ success: boolean }>(`/roles/${roleId}`);
  return res.data;
};

export const getRolePermissions = async (roleId: string): Promise<string[]> => {
  const res = await api.get<string[]>(`/roles/${roleId}/permissions`);
  return res.data;
};

export const assignRolePermissions = async (roleId: string, permissions: string[]): Promise<any> => {
  const res = await api.post(`/roles/${roleId}/permissions`, { permissions });
  return res.data;
};

export const removeRolePermissions = async (roleId: string, permissions: string[]): Promise<any> => {
  const res = await api.delete(`/roles/${roleId}/permissions`, { data: { permissions } });
  return res.data;
};

// Excluded CEO/CFO listing for org management
export const getRolesPaginated = async (page = 1, limit = 20): Promise<any> => {
  const res = await api.get("/roles/get-roles", { params: { page, limit } });
  return res.data;
};

export const getOrgOwnerRoles = async (): Promise<any> => {
  const res = await api.get("/roles/get-org-owner-roles");
  return res.data;
};
