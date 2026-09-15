import api from "./api";

type AnyRecord = Record<string, any>;

export interface AssignUserRolePayload {
  userId: string;
  roleId: string;
}

export interface ChangeUserRolePayload {
  userId: string;
  newRoleId: string;
}

export interface RemoveUserRolePayload {
  userId: string;
  roleId: string;
}

export interface RoleAssignmentResult {
  success?: boolean;
  message?: string;
  [key: string]: any;
}

export interface RoleOverviewRole {
  id: string;
  name: string;
  description?: string;
  permissions?: string[];
  users?: Array<AnyRecord>;
  [key: string]: any;
}

export interface RoleOverviewStatistics {
  [key: string]: any;
}

export interface RoleUsersResult {
  [key: string]: any;
}

export interface RbacMetricsResult {
  [key: string]: any;
}

export const assignUserRole = async (
  payload: AssignUserRolePayload,
): Promise<RoleAssignmentResult> => {
  const response = await api.post<RoleAssignmentResult>("/user-role-assignment/assign-role", payload);
  return response.data;
};

export const changeUserRole = async (
  payload: ChangeUserRolePayload,
): Promise<RoleAssignmentResult> => {
  const response = await api.patch<RoleAssignmentResult>("/user-role-assignment/change-role", payload);
  return response.data;
};

export const removeUserRole = async (
  payload: RemoveUserRolePayload,
): Promise<RoleAssignmentResult> => {
  const response = await api.delete<RoleAssignmentResult>("/user-role-assignment/remove-role", {
    data: payload,
  });
  return response.data;
};

export const getUserRoles = async (userId: string): Promise<AnyRecord> => {
  const response = await api.get<AnyRecord>(`/user-role-assignment/${userId}/roles`);
  return response.data;
};

export const getRoleOverviewRoles = async (): Promise<RoleOverviewRole[] | AnyRecord> => {
  const response = await api.get<RoleOverviewRole[] | AnyRecord>("/role-overview/roles");
  return response.data;
};

export const getRoleOverviewStatistics = async (): Promise<RoleOverviewStatistics> => {
  const response = await api.get<RoleOverviewStatistics>("/role-overview/roles/statistics");
  return response.data;
};

export const getRoleOverviewRole = async (roleId: string): Promise<RoleOverviewRole> => {
  const response = await api.get<RoleOverviewRole>(`/role-overview/roles/${roleId}`);
  return response.data;
};

export const getRoleOverviewRoleUsers = async (roleId: string): Promise<RoleUsersResult | AnyRecord[]> => {
  const response = await api.get<RoleUsersResult | AnyRecord[]>(`/role-overview/roles/${roleId}/users`);
  return response.data;
};

export const getRbacMetrics = async (): Promise<RbacMetricsResult> => {
  const response = await api.get<RbacMetricsResult>("/rbac-metrics/metrics");
  return response.data;
};

export const getRbacMetricsRoles = async (): Promise<RbacMetricsResult> => {
  const response = await api.get<RbacMetricsResult>("/rbac-metrics/metrics/roles");
  return response.data;
};

export const getRbacMetricsPermissions = async (): Promise<RbacMetricsResult> => {
  const response = await api.get<RbacMetricsResult>("/rbac-metrics/metrics/permissions");
  return response.data;
};

export const getRbacMetricsOrganization = async (
  organizationId: string,
): Promise<RbacMetricsResult> => {
  const response = await api.get<RbacMetricsResult>(`/rbac-metrics/metrics/organizations/${organizationId}`);
  return response.data;
};