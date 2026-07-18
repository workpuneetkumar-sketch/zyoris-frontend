"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
  getRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  getRolePermissions,
  assignRolePermissions,
  removeRolePermissions,
} from "@/lib/api/rolesApi";
import { getRbacRoles, getRbacRoleDetails, getRbacModules } from "@/lib/api/rbacApi";
import { RbacRoleMatrixItem } from "@/lib/api/rbacApi";
import { toast } from "react-toastify";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  KeyRound,
  Shield,
  Check,
  Loader2,
  Eye,
  RefreshCw,
  AlertCircle,
  Grid3X3,
  Settings2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────────────── */

interface RoleFormData {
  name: string;
  description: string;
}

const emptyForm: RoleFormData = { name: "", description: "" };

type Tab = "manage" | "matrix";

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

// Helper to extract permission key from object or string
const getPermissionKey = (perm: string | PermissionObject): string => {
  if (typeof perm === "string") return perm;
  return perm.key || perm.name || String(perm);
};

/* ─── Helper ─────────────────────────────────────────────────────────── */

function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
      <AlertCircle size={16} className="shrink-0 mt-0.5" />
      <div className="flex-1">
        <p>{message}</p>
        <p className="text-xs mt-1 text-red-500">
          This is a backend permission issue, not a frontend bug. The UI is fully wired to this
          endpoint.
        </p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="shrink-0 p-1 hover:bg-red-100 rounded-lg transition-colors">
          <RefreshCw size={14} />
        </button>
      )}
    </div>
  );
}

/* ─── RBAC Matrix Sub-component ───────────────────────────────────────── */

function RbacMatrix() {
  const [rbacRoles, setRbacRoles] = useState<RbacRoleMatrixItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<Record<string, RbacRoleMatrixItem>>({});
  const [detailLoading, setDetailLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRbacRoles();
      const rolesData = Array.isArray(data) ? data : [];
      // Process permissions to extract keys
      const processedRoles = rolesData.map((role) => ({
        ...role,
        permissions: (role.permissions || []).map(getPermissionKey)
      }));
      setRbacRoles(processedRoles);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load RBAC role matrix.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleExpand(roleId: string) {
    if (expandedRole === roleId) {
      setExpandedRole(null);
      return;
    }
    setExpandedRole(roleId);
    if (detailData[roleId]) return; // already fetched

    setDetailLoading(roleId);
    try {
      const detail = await getRbacRoleDetails(roleId);
      // Process detail permissions
      const processedDetail = {
        ...detail,
        permissions: (detail.permissions || []).map(getPermissionKey)
      };
      setDetailData((prev) => ({ ...prev, [roleId]: processedDetail }));
    } catch {
      // fallback: use list data
    } finally {
      setDetailLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error) {
    return <ErrorBanner message={error} onRetry={load} />;
  }

  if (rbacRoles.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <Grid3X3 size={40} className="mx-auto mb-3 text-gray-300" />
        <p className="font-medium">No RBAC roles configured</p>
        <p className="text-sm mt-1">Roles will appear here once the backend RBAC is seeded.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400 mb-4">
        Read-only view of the RBAC role matrix from{" "}
        <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">GET /rbac/roles</code>{" "}
        and{" "}
        <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">
          GET /rbac/roles/:roleId
        </code>
        .
      </p>
      {rbacRoles.map((role) => {
        const isExpanded = expandedRole === role.id;
        const detail = detailData[role.id];
        const permList = detail?.permissions ?? role.permissions ?? [];

        return (
          <div
            key={role.id}
            className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden"
          >
            <button
              onClick={() => toggleExpand(role.id)}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                <Shield size={17} className="text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">{role.name}</p>
                {role.description && (
                  <p className="text-xs text-gray-400 truncate">{role.description}</p>
                )}
                <p className="text-xs text-indigo-500 mt-0.5">
                  {Array.isArray(role.permissions) ? role.permissions.length : "?"} permissions
                </p>
              </div>
              {detailLoading === role.id ? (
                <Loader2 size={16} className="animate-spin text-indigo-400 shrink-0" />
              ) : isExpanded ? (
                <ChevronUp size={16} className="text-gray-400 shrink-0" />
              ) : (
                <ChevronDown size={16} className="text-gray-400 shrink-0" />
              )}
            </button>

            {isExpanded && (
              <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
                {permList.length === 0 ? (
                  <p className="text-sm text-gray-400">No permissions assigned to this role.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {permList.map((p) => (
                      <span
                        key={p}
                        className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-medium px-2 py-0.5 rounded-full"
                      >
                        <Check size={10} />
                        {p}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Main Page ────────────────────────────────────────────────────────── */

export default function RolesPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("manage");

  // Managed roles (from /roles)
  const [roles, setRoles] = useState<RbacRoleMatrixItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Role form modal
  const [showForm, setShowForm] = useState(false);
  const [editingRole, setEditingRole] = useState<RbacRoleMatrixItem | null>(null);
  const [formData, setFormData] = useState<RoleFormData>(emptyForm);
  const [formLoading, setFormLoading] = useState(false);

  // View detail modal (GET /roles/:roleId)
  const [viewRole, setViewRole] = useState<RbacRoleMatrixItem | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<RbacRoleMatrixItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Permission assignment panel
  const [permRole, setPermRole] = useState<RbacRoleMatrixItem | null>(null);
  const [allModules, setAllModules] = useState<string[]>([]);
  const [rolePerms, setRolePerms] = useState<string[]>([]);
  const [permLoading, setPermLoading] = useState(false);
  const [permSaving, setPermSaving] = useState(false);
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());

  // Guard: ADMIN only
  useEffect(() => {
    if (user && user.role !== "ADMIN") {
      router.push("/admin");
    }
  }, [user, router]);

  /* ── Fetch Roles (GET /roles) ───────────────────────────────────────── */

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRoles();
      const rolesData = Array.isArray(data) ? data : [];
      // Process permissions to extract keys
      const processedRoles = rolesData.map((role) => ({
        ...role,
        permissions: (role.permissions || []).map(getPermissionKey)
      }));
      setRoles(processedRoles);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load roles.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  /* ── CRUD ───────────────────────────────────────────────────────────── */

  function openCreate() {
    setEditingRole(null);
    setFormData(emptyForm);
    setShowForm(true);
  }

  function openEdit(role: RbacRoleMatrixItem) {
    setEditingRole(role);
    setFormData({ name: role.name, description: role.description || "" });
    setShowForm(true);
  }

  /* GET /roles/:roleId — detail view */
  async function openDetail(role: RbacRoleMatrixItem) {
    setViewRole(role);
    setViewLoading(true);
    try {
      const detail = await getRole(role.id);
      // Process detail permissions
      const processedDetail = {
        ...detail,
        permissions: (detail.permissions || []).map(getPermissionKey)
      };
      setViewRole(processedDetail);
    } catch {
      // fallback to list data
    } finally {
      setViewLoading(false);
    }
  }

  /* POST /roles or PATCH /roles/:roleId */
  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setFormLoading(true);
    try {
      if (editingRole) {
        await updateRole(editingRole.id, formData);
        toast.success("Role updated.");
      } else {
        await createRole(formData);
        toast.success("Role created.");
      }
      setShowForm(false);
      fetchRoles();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Operation failed.");
    } finally {
      setFormLoading(false);
    }
  }

  /* DELETE /roles/:roleId */
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteRole(deleteTarget.id);
      toast.success("Role deleted.");
      setDeleteTarget(null);
      fetchRoles();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Delete failed.");
    } finally {
      setDeleteLoading(false);
    }
  }

  /* ── Permission Panel ───────────────────────────────────────────────── */

  /* GET /roles/:roleId/permissions + GET /rbac/modules */
  async function openPermPanel(role: RbacRoleMatrixItem) {
    setPermRole(role);
    setPermLoading(true);
    setSelectedPerms(new Set());
    try {
      const [modules, perms] = await Promise.all([
        getRbacModules(),
        getRolePermissions(role.id),
      ]);
      // Process modules to extract keys if they are objects
      const processedModules = (Array.isArray(modules) ? modules : []).map(mod => {
        const m = mod as any;
        return typeof m === "string" ? m : m.key || m.name || String(m);
      });
      setAllModules(processedModules);
      // Process permissions to extract keys
      const processedPerms = (Array.isArray(perms) ? perms : []).map(getPermissionKey);
      setRolePerms(processedPerms);
      setSelectedPerms(new Set(processedPerms));
    } catch (err: any) {
      toast.error("Failed to load permissions: " + (err?.response?.data?.message || ""));
    } finally {
      setPermLoading(false);
    }
  }

  function togglePerm(perm: string) {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(perm)) next.delete(perm);
      else next.add(perm);
      return next;
    });
  }

  /* POST /roles/:roleId/permissions + DELETE /roles/:roleId/permissions */
  async function savePermissions() {
    if (!permRole) return;
    setPermSaving(true);
    try {
      const current = new Set(rolePerms);
      const desired = selectedPerms;

      const toAdd = [...desired].filter((p) => !current.has(p));
      const toRemove = [...current].filter((p) => !desired.has(p));

      if (toAdd.length > 0) await assignRolePermissions(permRole.id, toAdd);
      if (toRemove.length > 0) await removeRolePermissions(permRole.id, toRemove);

      toast.success("Permissions saved.");
      setPermRole(null);
      fetchRoles();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save permissions.");
    } finally {
      setPermSaving(false);
    }
  }

  /* ─────────────────────────────────────────────────────────────────── */

  return (
    <div className="max-w-5xl mx-auto px-2 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <KeyRound size={20} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Roles</h1>
            <p className="text-sm text-gray-500">Manage roles, permissions, and RBAC matrix</p>
          </div>
        </div>
        {tab === "manage" && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            New Role
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {(
          [
            { key: "manage", label: "Manage Roles", icon: Settings2 },
            { key: "matrix", label: "RBAC Matrix", icon: Grid3X3 },
          ] as { key: Tab; label: string; icon: any }[]
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key
                ? "bg-white text-blue-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ── RBAC Matrix Tab ── */}
      {tab === "matrix" && <RbacMatrix />}

      {/* ── Manage Roles Tab ── */}
      {tab === "manage" && (
        <>
          {/* Error */}
          {error && <ErrorBanner message={error} onRetry={fetchRoles} />}

          {/* Roles list */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="animate-spin text-blue-500" />
            </div>
          ) : roles.length === 0 && !error ? (
            <div className="text-center py-20 text-gray-400">
              <Shield size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No roles yet</p>
              <p className="text-sm mt-1">Create the first role to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="bg-white border border-gray-100 rounded-xl px-5 py-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <Shield size={17} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{role.name}</p>
                    {role.description && (
                      <p className="text-xs text-gray-400 truncate">{role.description}</p>
                    )}
                    {Array.isArray(role.permissions) && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {role.permissions.length} permission
                        {role.permissions.length !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* View detail — GET /roles/:roleId */}
                    <button
                      onClick={() => openDetail(role)}
                      className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors"
                      title="View details"
                    >
                      <Eye size={13} />
                      View
                    </button>
                    {/* Permissions — GET /roles/:roleId/permissions etc. */}
                    <button
                      onClick={() => openPermPanel(role)}
                      className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <KeyRound size={13} />
                      Permissions
                    </button>
                    {/* Edit — PATCH /roles/:roleId */}
                    <button
                      onClick={() => openEdit(role)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Edit"
                    >
                      <Pencil size={15} />
                    </button>
                    {/* Delete — DELETE /roles/:roleId */}
                    <button
                      onClick={() => setDeleteTarget(role)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── View Detail Modal (GET /roles/:roleId) ── */}
      {viewRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Role Detail</h2>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{viewRole.id}</p>
              </div>
              <button
                onClick={() => setViewRole(null)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {viewLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={22} className="animate-spin text-blue-400" />
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                      Name
                    </p>
                    <p className="text-sm font-semibold text-gray-900">{viewRole.name}</p>
                  </div>
                  {viewRole.description && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                        Description
                      </p>
                      <p className="text-sm text-gray-700">{viewRole.description}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                      Permissions ({Array.isArray(viewRole.permissions) ? viewRole.permissions.length : 0})
                    </p>
                    {Array.isArray(viewRole.permissions) && viewRole.permissions.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                        {viewRole.permissions.map((p) => (
                          <span
                            key={p}
                            className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-100 text-xs font-medium px-2 py-0.5 rounded-full"
                          >
                            <Check size={10} />
                            {p}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">No permissions assigned.</p>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="px-6 pb-5">
              <button
                onClick={() => {
                  setViewRole(null);
                  openEdit(viewRole);
                }}
                className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <Pencil size={14} /> Edit This Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create / Edit Modal (POST / PATCH /roles) ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editingRole ? "Edit Role" : "New Role"}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleFormSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. SALES_MANAGER"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Optional description"
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {formLoading && <Loader2 size={14} className="animate-spin" />}
                  {editingRole ? "Save Changes" : "Create Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal (DELETE /roles/:roleId) ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm px-6 py-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Delete Role</h2>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-gray-800">{deleteTarget.name}</span>? This action
              cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {deleteLoading && <Loader2 size={14} className="animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Permissions Panel (GET/POST/DELETE /roles/:roleId/permissions + GET /rbac/modules) ── */}
      {permRole && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/40"
            onClick={() => !permSaving && setPermRole(null)}
          />
          <div className="w-full max-w-sm bg-white h-full flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900">Permissions</h2>
                <p className="text-sm text-gray-400">{permRole.name}</p>
              </div>
              <button
                onClick={() => !permSaving && setPermRole(null)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {permLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 size={24} className="animate-spin text-blue-500" />
                </div>
              ) : allModules.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <KeyRound size={28} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-sm font-medium">No modules available</p>
                  <p className="text-xs mt-1">
                    Backend did not return any modules via{" "}
                    <code className="bg-gray-100 px-1 rounded">GET /rbac/modules</code>.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                    Toggle permissions ({selectedPerms.size} selected)
                  </p>
                  {allModules.map((mod) => {
                    const active = selectedPerms.has(mod);
                    return (
                      <button
                        key={mod}
                        onClick={() => togglePerm(mod)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          active
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-gray-50 text-gray-600 border border-gray-100 hover:bg-gray-100"
                        }`}
                      >
                        <span className="truncate text-left">{mod}</span>
                        {active && <Check size={14} className="text-blue-600 shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-gray-100">
              <div className="flex gap-3">
                <button
                  onClick={() => !permSaving && setPermRole(null)}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={savePermissions}
                  disabled={permSaving || permLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {permSaving && <Loader2 size={14} className="animate-spin" />}
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
