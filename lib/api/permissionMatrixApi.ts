import api from "./api";

export interface PermissionMatrixResponse {
  // Structure is typically an object mapping modules to permissions or a list of roles with permissions
  // Using any to handle dynamic response, we will refine this after seeing the exact payload
  [key: string]: any;
}

export interface PermissionTemplate {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
}

export interface RolePermissionsUpdate {
  permissions: string[];
}

export interface BulkAssignPayload {
  roleIds: string[];
  permissionKeys: string[];
}

export interface BulkRemovePayload {
  roleIds: string[];
  permissionKeys: string[];
}

export interface CloneRolePayload {
  sourceRoleId: string;
  name: string;
  description?: string;
}

export interface ApplyTemplatePayload {
  sourceRoleId: string; // The role ID that serves as template, or template ID
  targetRoleId: string;
}

/**
 * 1. Get complete permission matrix
 * GET /permission-matrix
 */
export const getPermissionMatrix = async () => {
  const response = await api.get("/permission-matrix");
  return response.data;
};

/**
 * 2. Get permission templates
 * GET /permission-matrix/templates
 */
export const getPermissionTemplates = async () => {
  const response = await api.get("/permission-matrix/templates");
  return response.data;
};

/**
 * 3. Get role permission matrix
 * GET /permission-matrix/:roleId
 */
export const getRolePermissionMatrix = async (roleId: string) => {
  const response = await api.get(`/permission-matrix/${roleId}`);
  return response.data;
};

/**
 * 4. Update role permission matrix
 * PATCH /permission-matrix/:roleId
 */
export const updateRolePermissionMatrix = async (roleId: string, payload: RolePermissionsUpdate) => {
  const response = await api.patch(`/permission-matrix/${roleId}`, payload);
  return response.data;
};

/**
 * 5. Bulk assign permissions
 * POST /permission-matrix/bulk-assign
 */
export const bulkAssignPermissions = async (payload: BulkAssignPayload) => {
  const response = await api.post("/permission-matrix/bulk-assign", payload);
  return response.data;
};

/**
 * 6. Bulk remove permissions
 * POST /permission-matrix/bulk-remove
 */
export const bulkRemovePermissions = async (payload: BulkRemovePayload) => {
  const response = await api.post("/permission-matrix/bulk-remove", payload);
  return response.data;
};

/**
 * 7. Clone role
 * POST /permission-matrix/clone-role
 */
export const cloneRole = async (payload: CloneRolePayload) => {
  const response = await api.post("/permission-matrix/clone-role", payload);
  return response.data;
};

/**
 * 8. Apply permission template
 * POST /permission-matrix/template/apply
 */
export const applyPermissionTemplate = async (payload: ApplyTemplatePayload) => {
  const response = await api.post("/permission-matrix/template/apply", payload);
  return response.data;
}
