import api from "./api";

export interface AssignRolePayload {
  userId: string;
  roleId: string;
}

export interface ChangeRolePayload {
  userId: string;
  newRoleId: string;
}

export interface RemoveRolePayload {
  userId: string;
  roleId: string;
}

export interface RoleAssignmentResponse {
  success: boolean;
  message?: string;
  [key: string]: any;
}

export const assignRole = async (payload: AssignRolePayload): Promise<RoleAssignmentResponse> => {
  const res = await api.post<RoleAssignmentResponse>("/user-role-assignment/assign-role", payload);
  return res.data;
};

export const changeRole = async (payload: ChangeRolePayload): Promise<RoleAssignmentResponse> => {
  const res = await api.patch<RoleAssignmentResponse>("/user-role-assignment/change-role", payload);
  return res.data;
};

export const removeRole = async (payload: RemoveRolePayload): Promise<RoleAssignmentResponse> => {
  const res = await api.delete<RoleAssignmentResponse>("/user-role-assignment/remove-role", {
    data: payload,
  });
  return res.data;
};

export const getUserRoles = async (userId: string): Promise<any> => {
  const res = await api.get(`/user-role-assignment/${userId}/roles`);
  return res.data;
};
