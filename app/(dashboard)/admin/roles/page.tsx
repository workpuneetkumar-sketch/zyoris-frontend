"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
  createRole,
  updateRole,
  deleteRole,
  getRolePermissions,
  assignRolePermissions,
  removeRolePermissions,
} from "@/lib/api/rolesApi";
import { getRbacRoles, getRbacRoleDetails } from "@/lib/api/rbacApi";
import { RbacRoleMatrixItem } from "@/lib/api/rbacApi";
import api from "@/lib/api/api";
import { toast } from "react-toastify";
import {
  Plus, Pencil, Trash2, X, KeyRound, Shield, Check,
  Loader2, Eye, RefreshCw, AlertCircle, Grid3X3, Settings2,
  ChevronDown, ChevronUp, ChevronRight,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────────────── */

interface RoleFormData { name: string; description: string; }
const emptyForm: RoleFormData = { name: "", description: "" };
type Tab = "manage" | "matrix";

/** Full permission object returned by GET /roles/:id/permissions */
interface PermissionObj {
  id: string;
  key: string;
  name: string;
  description: string | null;
  module: string;
  action: string;
  createdAt: string;
  updatedAt: string;
}

/** All available permissions grouped by module */
interface PermissionGroup {
  module: string;           // e.g. "LEADS"
  label: string;            // e.g. "Leads"
  permissions: PermissionObj[];
}

/* ─── Helpers ────────────────────────────────────────────────────────── */

/** Safely extract a permission key from either a string or object */
const getPermKey = (p: any): string => {
  if (typeof p === "string") return p;
  return p?.key || p?.name || String(p);
};

/** Title-case a snake/dot string: "ai_copilot" → "Ai Copilot" */
const toLabel = (s: string) =>
  s.replace(/[_\.]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** Build grouped permission list from a flat array of PermissionObj */
function buildGroups(perms: PermissionObj[]): PermissionGroup[] {
  const map = new Map<string, PermissionGroup>();
  for (const p of perms) {
    const mod = p.module || p.key.split(".")[0].toUpperCase();
    if (!map.has(mod)) map.set(mod, { module: mod, label: toLabel(mod.toLowerCase()), permissions: [] });
    map.get(mod)!.permissions.push(p);
  }
  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
      <AlertCircle size={16} className="shrink-0 mt-0.5" />
      <div className="flex-1"><p>{message}</p></div>
      {onRetry && (
        <button onClick={onRetry} className="shrink-0 p-1 hover:bg-red-100 rounded-lg transition-colors">
          <RefreshCw size={14} />
        </button>
      )}
    </div>
  );
}

/* ─── RBAC Matrix Sub-component ─────────────────────────────────────── */

function RbacMatrix() {
  const [rbacRoles, setRbacRoles] = useState<RbacRoleMatrixItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<Record<string, RbacRoleMatrixItem>>({});
  const [detailLoading, setDetailLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await getRbacRoles();
      const roles = (Array.isArray(data) ? data : []).map((r) => ({
        ...r, permissions: (r.permissions || []).map(getPermKey),
      }));
      setRbacRoles(roles);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load RBAC role matrix.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleExpand(roleId: string) {
    if (expandedRole === roleId) { setExpandedRole(null); return; }
    setExpandedRole(roleId);
    if (detailData[roleId]) return;
    setDetailLoading(roleId);
    try {
      const detail = await getRbacRoleDetails(roleId);
      setDetailData((prev) => ({
        ...prev, [roleId]: { ...detail, permissions: (detail.permissions || []).map(getPermKey) },
      }));
    } catch { /* fallback */ } finally { setDetailLoading(null); }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-indigo-500" /></div>;
  if (error) return <ErrorBanner message={error} onRetry={load} />;
  if (rbacRoles.length === 0) return (
    <div className="text-center py-20 text-gray-400">
      <Grid3X3 size={40} className="mx-auto mb-3 text-gray-300" />
      <p className="font-medium">No RBAC roles configured</p>
    </div>
  );

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400 mb-4">Read-only view from <code className="bg-gray-100 px-1 rounded font-mono">GET /rbac/roles</code>.</p>
      {rbacRoles.map((role) => {
        const isExpanded = expandedRole === role.id;
        const detail = detailData[role.id];
        const permList = detail?.permissions ?? role.permissions ?? [];
        return (
          <div key={role.id} className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
            <button onClick={() => toggleExpand(role.id)} className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0"><Shield size={17} className="text-indigo-600" /></div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">{role.name}</p>
                {role.description && <p className="text-xs text-gray-400 truncate">{role.description}</p>}
                <p className="text-xs text-indigo-500 mt-0.5">{Array.isArray(role.permissions) ? role.permissions.length : "?"} permissions</p>
              </div>
              {detailLoading === role.id ? <Loader2 size={16} className="animate-spin text-indigo-400 shrink-0" /> : isExpanded ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
            </button>
            {isExpanded && (
              <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
                {permList.length === 0 ? <p className="text-sm text-gray-400">No permissions assigned.</p> : (
                  <div className="flex flex-wrap gap-1.5">
                    {permList.map((p) => (
                      <span key={p} className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-medium px-2 py-0.5 rounded-full">
                        <Check size={10} />{p}
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

/* ─── Permission Panel ───────────────────────────────────────────────── */

function PermissionsPanel({
  role,
  onClose,
  onSaved,
}: {
  role: RbacRoleMatrixItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [originalKeys, setOriginalKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError(null);
      try {
        // Two parallel calls:
        // 1. GET /roles/:roleId/permissions  → full permission objects currently assigned to THIS role
        // 2. GET /roles/role_admin/permissions → full catalogue of ALL system permissions
        //    (ADMIN has all permissions, so it's the system catalogue)
        const [thisRolePerms, adminPerms] = await Promise.allSettled([
          api.get<PermissionObj[]>(`/roles/${role.id}/permissions`).then(r => r.data),
          api.get<PermissionObj[]>(`/roles/role_admin/permissions`).then(r => r.data),
        ]);

        if (cancelled) return;

        const currentPerms: PermissionObj[] = thisRolePerms.status === "fulfilled" && Array.isArray(thisRolePerms.value)
          ? thisRolePerms.value : [];

        // Use admin perms as the full catalogue; fallback to this role's own perms
        const cataloguePerms: PermissionObj[] = adminPerms.status === "fulfilled" && Array.isArray(adminPerms.value) && adminPerms.value.length > 0
          ? adminPerms.value : currentPerms;

        const assignedKeys = new Set(currentPerms.map(p => getPermKey(p)));

        setGroups(buildGroups(cataloguePerms));
        setSelectedKeys(new Set(assignedKeys));
        setOriginalKeys(new Set(assignedKeys));
        setExpandedModules(new Set(cataloguePerms.map(p => p.module || p.key.split(".")[0].toUpperCase())));
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.data?.message || "Failed to load permissions.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [role.id]);

  function toggleKey(key: string) {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function toggleModule(group: PermissionGroup) {
    const keys = group.permissions.map(p => p.key);
    const allSelected = keys.every(k => selectedKeys.has(k));
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (allSelected) keys.forEach(k => next.delete(k));
      else keys.forEach(k => next.add(k));
      return next;
    });
  }

  function toggleExpandModule(mod: string) {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(mod)) next.delete(mod); else next.add(mod);
      return next;
    });
  }

  function selectAll() { setSelectedKeys(new Set(groups.flatMap(g => g.permissions.map(p => p.key)))); }
  function clearAll() { setSelectedKeys(new Set()); }

  async function save() {
    setSaving(true);
    try {
      const toAdd = [...selectedKeys].filter(k => !originalKeys.has(k));
      const toRemove = [...originalKeys].filter(k => !selectedKeys.has(k));
      if (toAdd.length > 0) await assignRolePermissions(role.id, toAdd);
      if (toRemove.length > 0) await removeRolePermissions(role.id, toRemove);
      toast.success(`Permissions saved for ${role.name}.`);
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save permissions.");
    } finally { setSaving(false); }
  }

  const totalAvailable = groups.reduce((n, g) => n + g.permissions.length, 0);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={() => !saving && onClose()} />
      <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="font-bold text-gray-900 text-base">Permissions</h2>
            <p className="text-xs text-gray-400 mt-0.5">{role.name} · {selectedKeys.size} / {totalAvailable} selected</p>
          </div>
          <button onClick={() => !saving && onClose()} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Select all / clear */}
        {!loading && groups.length > 0 && (
          <div className="flex items-center gap-3 px-5 py-2.5 border-b border-gray-100 shrink-0 bg-gray-50">
            <button onClick={selectAll} className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">Select all</button>
            <span className="text-gray-300">·</span>
            <button onClick={clearAll} className="text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors">Clear all</button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-blue-500" /></div>
          ) : error ? (
            <ErrorBanner message={error} />
          ) : groups.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <KeyRound size={28} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm font-medium">No permissions found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {groups.map((group) => {
                const isExpanded = expandedModules.has(group.module);
                const keys = group.permissions.map(p => p.key);
                const selectedCount = keys.filter(k => selectedKeys.has(k)).length;
                const allSelected = selectedCount === keys.length;
                const someSelected = selectedCount > 0 && !allSelected;

                return (
                  <div key={group.module} className="border border-gray-100 rounded-xl overflow-hidden">
                    {/* Module header row */}
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors">
                      {/* Module toggle checkbox */}
                      <button
                        onClick={() => toggleModule(group)}
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          allSelected ? "bg-blue-600 border-blue-600" : someSelected ? "bg-blue-200 border-blue-400" : "border-gray-300 bg-white"
                        }`}
                      >
                        {allSelected && <Check size={10} className="text-white" strokeWidth={3} />}
                        {someSelected && <div className="w-2 h-0.5 bg-blue-600 rounded" />}
                      </button>
                      {/* Expand/collapse */}
                      <button onClick={() => toggleExpandModule(group.module)} className="flex-1 flex items-center gap-2 text-left min-w-0">
                        <span className="text-sm font-semibold text-gray-800 truncate">{group.label}</span>
                        <span className="text-xs text-gray-400 shrink-0">{selectedCount}/{keys.length}</span>
                        <ChevronRight size={14} className={`text-gray-400 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                      </button>
                    </div>

                    {/* Individual permissions */}
                    {isExpanded && (
                      <div className="divide-y divide-gray-50">
                        {group.permissions.map((perm) => {
                          const active = selectedKeys.has(perm.key);
                          return (
                            <button
                              key={perm.key}
                              onClick={() => toggleKey(perm.key)}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${active ? "bg-blue-50" : "bg-white hover:bg-gray-50"}`}
                            >
                              <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${active ? "bg-blue-600 border-blue-600" : "border-gray-300"}`}>
                                {active && <Check size={10} className="text-white" strokeWidth={3} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-medium truncate ${active ? "text-blue-800" : "text-gray-700"}`}>{perm.name || toLabel(perm.action)}</p>
                                <p className="text-[10px] text-gray-400 font-mono truncate">{perm.key}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 shrink-0 bg-white">
          <div className="flex gap-3">
            <button onClick={() => !saving && onClose()} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={save} disabled={saving || loading} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2">
              {saving && <Loader2 size={14} className="animate-spin" />}
              Save Permissions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────── */

export default function RolesPage() {
  const { user, isInitializing } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("manage");
  const [roles, setRoles] = useState<RbacRoleMatrixItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingRole, setEditingRole] = useState<RbacRoleMatrixItem | null>(null);
  const [formData, setFormData] = useState<RoleFormData>(emptyForm);
  const [formLoading, setFormLoading] = useState(false);

  const [viewRole, setViewRole] = useState<RbacRoleMatrixItem | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<RbacRoleMatrixItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Permission panel
  const [permRole, setPermRole] = useState<RbacRoleMatrixItem | null>(null);

  useEffect(() => {
    if (!isInitializing && user && user.role !== "ADMIN") router.push("/admin");
  }, [user, isInitializing, router]);

  const fetchRoles = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await getRbacRoles();
      const processed = (Array.isArray(data) ? data : []).map(r => ({
        ...r, permissions: (r.permissions || []).map(getPermKey),
      }));
      setRoles(processed);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load roles.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  function openCreate() { setEditingRole(null); setFormData(emptyForm); setShowForm(true); }
  function openEdit(role: RbacRoleMatrixItem) { setEditingRole(role); setFormData({ name: role.name, description: role.description || "" }); setShowForm(true); }

  async function openDetail(role: RbacRoleMatrixItem) {
    setViewRole(role); setViewLoading(true);
    try {
      const detail = await getRbacRoleDetails(role.id);
      setViewRole({ ...detail, permissions: (detail.permissions || []).map(getPermKey) });
    } catch { /* fallback */ } finally { setViewLoading(false); }
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setFormLoading(true);
    try {
      if (editingRole) { await updateRole(editingRole.id, formData); toast.success("Role updated."); }
      else { await createRole(formData); toast.success("Role created."); }
      setShowForm(false); fetchRoles();
    } catch (err: any) { toast.error(err?.response?.data?.message || "Operation failed."); }
    finally { setFormLoading(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteRole(deleteTarget.id); toast.success("Role deleted.");
      setDeleteTarget(null); fetchRoles();
    } catch (err: any) { toast.error(err?.response?.data?.message || "Delete failed."); }
    finally { setDeleteLoading(false); }
  }

  return (
    <div className="max-w-5xl mx-auto px-2 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center"><KeyRound size={20} className="text-blue-600" /></div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Roles</h1>
            <p className="text-sm text-gray-500">Manage roles, permissions, and RBAC matrix</p>
          </div>
        </div>
        {tab === "manage" && (
          <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} />New Role
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {([{ key: "manage", label: "Manage Roles", icon: Settings2 }, { key: "matrix", label: "RBAC Matrix", icon: Grid3X3 }] as { key: Tab; label: string; icon: any }[]).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === key ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {tab === "matrix" && <RbacMatrix />}

      {tab === "manage" && (
        <>
          {error && <ErrorBanner message={error} onRetry={fetchRoles} />}
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-blue-500" /></div>
          ) : roles.length === 0 && !error ? (
            <div className="text-center py-20 text-gray-400">
              <Shield size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No roles yet</p>
              <p className="text-sm mt-1">Create the first role to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {roles.map((role) => (
                <div key={role.id} className="bg-white border border-gray-100 rounded-xl px-5 py-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0"><Shield size={17} className="text-blue-600" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{role.name}</p>
                    {role.description && <p className="text-xs text-gray-400 truncate">{role.description}</p>}
                    {Array.isArray(role.permissions) && (
                      <p className="text-xs text-gray-400 mt-0.5">{role.permissions.length} permission{role.permissions.length !== 1 ? "s" : ""}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => openDetail(role)} className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors"><Eye size={13} />View</button>
                    <button onClick={() => setPermRole(role)} className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"><KeyRound size={13} />Permissions</button>
                    <button onClick={() => openEdit(role)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit"><Pencil size={15} /></button>
                    <button onClick={() => setDeleteTarget(role)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete"><Trash2 size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* View Detail Modal */}
      {viewRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Role Detail</h2>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{viewRole.id}</p>
              </div>
              <button onClick={() => setViewRole(null)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors"><X size={18} className="text-gray-500" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {viewLoading ? (
                <div className="flex items-center justify-center py-8"><Loader2 size={22} className="animate-spin text-blue-400" /></div>
              ) : (
                <>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Name</p>
                    <p className="text-sm font-semibold text-gray-900">{viewRole.name}</p>
                  </div>
                  {viewRole.description && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Description</p>
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
                          <span key={p} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-100 text-xs font-medium px-2 py-0.5 rounded-full">
                            <Check size={10} />{p}
                          </span>
                        ))}
                      </div>
                    ) : <p className="text-sm text-gray-400">No permissions assigned.</p>}
                  </div>
                </>
              )}
            </div>
            <div className="px-6 pb-5">
              <button onClick={() => { setViewRole(null); openEdit(viewRole); }} className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                <Pencil size={14} /> Edit This Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editingRole ? "Edit Role" : "New Role"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors"><X size={18} className="text-gray-500" /></button>
            </div>
            <form onSubmit={handleFormSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role Name <span className="text-red-500">*</span></label>
                <input type="text" value={formData.name} onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))} placeholder="e.g. SALES_MANAGER" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={formLoading} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                  {formLoading && <Loader2 size={14} className="animate-spin" />}
                  {editingRole ? "Save Changes" : "Create Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm px-6 py-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Delete Role</h2>
            <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete <span className="font-semibold text-gray-800">{deleteTarget.name}</span>? This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleDelete} disabled={deleteLoading} className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                {deleteLoading && <Loader2 size={14} className="animate-spin" />}Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Panel */}
      {permRole && (
        <PermissionsPanel
          role={permRole}
          onClose={() => setPermRole(null)}
          onSaved={fetchRoles}
        />
      )}
    </div>
  );
}
