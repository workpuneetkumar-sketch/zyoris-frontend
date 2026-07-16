import api from "./api";

export interface UserRoleResponse {
  userId: string;
  role: {
    id: string;
    name: string;
    description?: string;
  };
}

export interface UserByRoleItem {
  id: string;
  name: string;
  email: string;
  role: string;
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
