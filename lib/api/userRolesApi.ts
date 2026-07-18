import api from "./api";

export interface UserRoleResponse {
  userId: string;
  role: {
    id: string;
    name: string;
    description?: string;
  };
}

export interface UserRoleObject {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserByRoleItem {
  id: string;
  name: string;
  email: string;
  designation?: string;
  roleId?: string;
  organizationId?: string | null;
  /** The backend returns `role` as either a string or a full role object */
  role: string | UserRoleObject;
}

/** Safely extract the role name whether role is a string or object */
export function getRoleName(role: string | UserRoleObject | null | undefined): string {
  if (!role) return "—";
  if (typeof role === "string") return role;
  return role.name || "—";
}

export const getUserRole = async (userId: string): Promise<UserRoleResponse> => {
  const res = await api.get<UserRoleResponse>(`/user-roles/${userId}`);
  return res.data;
};

export const assignUserRole = async (userId: string, roleId: string): Promise<any> => {
  const res = await api.patch(`/user-roles/${userId}`, { roleId });
  return res.data;
};

export const getUsersByRole = async (roleId: string): Promise<UserByRoleItem[]> => {
  const res = await api.get<UserByRoleItem[]>(`/user-roles/role/${roleId}`);
  return res.data;
};
