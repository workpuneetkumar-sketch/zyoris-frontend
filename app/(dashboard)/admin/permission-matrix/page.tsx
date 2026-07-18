"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  Shield,
  Loader2,
  AlertCircle,
  RefreshCw,
  Settings2,
  Grid3X3,
  Copy,
  Users,
  Search,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Plus,
  Pencil,
  Wand2,
} from "lucide-react";
import {
  getPermissionMatrix,
  getPermissionTemplates,
  getRolePermissionMatrix,
  updateRolePermissionMatrix,
  bulkAssignPermissions,
  bulkRemovePermissions,
  cloneRole,
  applyPermissionTemplate,
  PermissionTemplate
} from "@/lib/api/permissionMatrixApi";

// Using the same types from API
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

interface RoleMatrix {
  id: string;
  name: string;
  description?: string;
  permissions?: (string | PermissionObject)[];
  [key: string]: any;
}

// Helper to extract permission key from object or string
const getPermissionKey = (perm: string | PermissionObject): string => {
  if (typeof perm === "string") return perm;
  return perm.key || perm.name || String(perm);
};

type Tab = "matrix" | "templates" | "bulk" | "clone";

function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
      <AlertCircle size={16} className="shrink-0 mt-0.5" />
      <div className="flex-1">
        <p>{message}</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="shrink-0 p-1 hover:bg-red-100 rounded-lg transition-colors">
          <RefreshCw size={14} />
        </button>
      )}
    </div>
  );
}

export default function PermissionMatrixPage() {
  const { user, isInitializing } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("matrix");
  const [error, setError] = useState<string | null>(null);

  // Guard: ADMIN only — wait for initialization
  useEffect(() => {
    if (!isInitializing && user && user.role !== "ADMIN") {
      router.push("/admin");
    }
  }, [user, isInitializing, router]);

  // -- Data State --
  const [roles, setRoles] = useState<RoleMatrix[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchMatrix = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPermissionMatrix();
      const rolesData = Array.isArray(data) ? data : data?.roles ? data.roles : [];
      // Process permissions to extract keys
      const processedRoles = rolesData.map((role: RoleMatrix) => ({
        ...role,
        permissions: (role.permissions || []).map(getPermissionKey)
      }));
      setRoles(processedRoles);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.response?.data?.error || "Failed to load permission matrix.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "matrix" || tab === "bulk" || tab === "clone") {
      fetchMatrix();
    }
  }, [fetchMatrix, tab]);

  const filteredRoles = roles.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));

  // -- View/Edit Role Permissions State --
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [roleDetailData, setRoleDetailData] = useState<Record<string, RoleMatrix>>({});
  const [detailLoading, setDetailLoading] = useState<string | null>(null);

  const [editRole, setEditRole] = useState<RoleMatrix | null>(null);
  const [editPerms, setEditPerms] = useState<Set<string>>(new Set());
  const [editLoading, setEditLoading] = useState(false);

  // Fake modules for UI since we don't know the exact ones. 
  // We'll collect all distinct permissions from the matrix.
  const allPermissions = Array.from(new Set(
    roles.flatMap(r => (r.permissions || []).map(getPermissionKey))
  )).sort();

  async function toggleExpand(roleId: string) {
    if (expandedRole === roleId) {
      setExpandedRole(null);
      return;
    }
    setExpandedRole(roleId);
    if (roleDetailData[roleId]) return;

    setDetailLoading(roleId);
    try {
      const detail = await getRolePermissionMatrix(roleId);
      // Process detail permissions
      const processedDetail = {
        ...detail,
        permissions: (detail.permissions || []).map(getPermissionKey)
      };
      setRoleDetailData(prev => ({ ...prev, [roleId]: processedDetail }));
    } catch {
      // Fallback
    } finally {
      setDetailLoading(null);
    }
  }

  function openEdit(role: RoleMatrix) {
    const detail = roleDetailData[role.id] || role;
    setEditRole(role);
    // Process permissions to extract keys
    const processedPerms = (detail.permissions || []).map(getPermissionKey);
    setEditPerms(new Set(processedPerms));
  }

  function toggleEditPerm(perm: string) {
    setEditPerms(prev => {
      const next = new Set(prev);
      if (next.has(perm)) next.delete(perm);
      else next.add(perm);
      return next;
    });
  }

  async function handleSaveEdit() {
    if (!editRole) return;
    setEditLoading(true);
    try {
      await updateRolePermissionMatrix(editRole.id, { permissions: Array.from(editPerms) });
      toast.success("Permissions updated successfully.");
      setEditRole(null);
      fetchMatrix();
      
      // Update local detail cache
      setRoleDetailData(prev => ({
        ...prev,
        [editRole.id]: {
          ...prev[editRole.id],
          permissions: Array.from(editPerms)
        }
      }));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.response?.data?.error || "Failed to update permissions.");
    } finally {
      setEditLoading(false);
    }
  }

  // -- Templates State --
  const [templates, setTemplates] = useState<PermissionTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PermissionTemplate | null>(null);
  
  // Apply template state
  const [applyTargetRole, setApplyTargetRole] = useState("");
  const [applyLoading, setApplyLoading] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const data = await getPermissionTemplates();
      setTemplates(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load templates.");
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "templates") {
      fetchTemplates();
      // Ensure we have roles for the apply dropdown
      if (roles.length === 0) fetchMatrix();
    }
  }, [tab, fetchTemplates, roles.length, fetchMatrix]);

  async function handleApplyTemplate() {
    if (!selectedTemplate || !applyTargetRole) return;
    setApplyLoading(true);
    try {
      await applyPermissionTemplate({
        sourceRoleId: selectedTemplate.id,
        targetRoleId: applyTargetRole
      });
      toast.success("Template applied successfully.");
      setSelectedTemplate(null);
      setApplyTargetRole("");
      fetchMatrix(); // Refresh matrix
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to apply template.");
    } finally {
      setApplyLoading(false);
    }
  }

  // -- Bulk Operations State --
  const [bulkMode, setBulkMode] = useState<"assign" | "remove">("assign");
  const [bulkRoleIds, setBulkRoleIds] = useState<Set<string>>(new Set());
  const [bulkPerms, setBulkPerms] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  async function handleBulkAction() {
    if (bulkRoleIds.size === 0 || bulkPerms.size === 0) {
      toast.error("Please select at least one role and one permission.");
      return;
    }
    setBulkLoading(true);
    try {
      const payload = {
        roleIds: Array.from(bulkRoleIds),
        permissionKeys: Array.from(bulkPerms)
      };
      if (bulkMode === "assign") {
        await bulkAssignPermissions(payload);
        toast.success("Bulk assignment successful.");
      } else {
        await bulkRemovePermissions(payload);
        toast.success("Bulk removal successful.");
      }
      setBulkRoleIds(new Set());
      setBulkPerms(new Set());
      fetchMatrix();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || `Failed to perform bulk ${bulkMode}.`);
    } finally {
      setBulkLoading(false);
    }
  }

  // -- Clone Role State --
  const [cloneSourceId, setCloneSourceId] = useState("");
  const [cloneName, setCloneName] = useState("");
  const [cloneDescription, setCloneDescription] = useState("");
  const [cloneLoading, setCloneLoading] = useState(false);

  async function handleCloneRole(e: React.FormEvent) {
    e.preventDefault();
    if (!cloneSourceId || !cloneName) return;
    setCloneLoading(true);
    try {
      await cloneRole({
        sourceRoleId: cloneSourceId,
        name: cloneName,
        description: cloneDescription
      });
      toast.success("Role cloned successfully.");
      setCloneSourceId("");
      setCloneName("");
      setCloneDescription("");
      setTab("matrix"); // Go back to matrix to see it
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to clone role.");
    } finally {
      setCloneLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
            <Shield size={24} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Permission Matrix</h1>
            <p className="text-sm text-gray-500">View and manage granular permissions across all roles.</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 bg-white border border-gray-200 p-1.5 rounded-xl mb-6 w-fit shadow-sm">
        {(
          [
            { key: "matrix", label: "Matrix Overview", icon: Grid3X3 },
            { key: "templates", label: "Templates", icon: Wand2 },
            { key: "bulk", label: "Bulk Operations", icon: Users },
            { key: "clone", label: "Clone Role", icon: Copy },
          ] as { key: Tab; label: string; icon: any }[]
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key
                ? "bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchMatrix} />}

      {/* MATRIX VIEW */}
      {tab === "matrix" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="relative w-full max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search roles..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-indigo-500" />
            </div>
          ) : filteredRoles.length === 0 ? (
            <div className="text-center py-20 bg-white border border-gray-200 rounded-xl shadow-sm">
              <Grid3X3 size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="font-medium text-gray-900">No roles found</p>
              <p className="text-sm text-gray-500 mt-1">Make sure you have roles created in the system.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRoles.map(role => {
                const isExpanded = expandedRole === role.id;
                const detail = roleDetailData[role.id];
                const permList = (detail?.permissions ?? role.permissions ?? []).map(getPermissionKey);

                return (
                  <div key={role.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden transition-all hover:border-indigo-200">
                    <div className="flex items-center justify-between p-4">
                      <button
                        onClick={() => toggleExpand(role.id)}
                        className="flex items-center gap-4 flex-1 text-left"
                      >
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                          <Shield size={18} className="text-indigo-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-gray-900">{role.name}</p>
                          {role.description && <p className="text-xs text-gray-500 mt-0.5">{role.description}</p>}
                        </div>
                        <div className="flex items-center gap-4 text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                           {permList.length} Permissions
                        </div>
                        <div className="px-2">
                          {detailLoading === role.id ? (
                            <Loader2 size={18} className="animate-spin text-indigo-400" />
                          ) : isExpanded ? (
                            <ChevronUp size={20} className="text-gray-400" />
                          ) : (
                            <ChevronDown size={20} className="text-gray-400" />
                          )}
                        </div>
                      </button>
                      
                      <div className="pl-4 border-l border-gray-100 ml-4">
                        <button
                          onClick={() => openEdit(role)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
                        >
                          <Pencil size={14} />
                          Edit
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-gray-100 p-5 bg-gray-50/50">
                        {permList.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center py-4">No permissions assigned to this role.</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {permList.map(p => (
                              <span key={p} className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-medium px-2.5 py-1 rounded-md shadow-sm">
                                <Check size={12} className="text-indigo-500" />
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
          )}
        </div>
      )}

      {/* TEMPLATES VIEW */}
      {tab === "templates" && (
        <div className="space-y-6">
          {templatesLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-indigo-500" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-20 bg-white border border-gray-200 rounded-xl shadow-sm">
              <Wand2 size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="font-medium text-gray-900">No templates found</p>
              <p className="text-sm text-gray-500 mt-1">Permission templates help standardize roles quickly.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map(tpl => (
                <div key={tpl.id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 hover:border-indigo-300 transition-colors flex flex-col">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <Wand2 size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{tpl.name}</h3>
                      <p className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full inline-block mt-1">
                        {tpl.permissions.length} Permissions
                      </p>
                    </div>
                  </div>
                  {tpl.description && <p className="text-sm text-gray-600 mb-4 flex-1">{tpl.description}</p>}
                  
                  <button 
                    onClick={() => setSelectedTemplate(tpl)}
                    className="w-full mt-4 py-2 border border-indigo-200 text-indigo-700 rounded-lg text-sm font-semibold hover:bg-indigo-50 transition-colors"
                  >
                    Apply Template
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* BULK OPERATIONS VIEW */}
      {tab === "bulk" && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Bulk Operations</h2>
            <p className="text-sm text-gray-500">Assign or remove multiple permissions from multiple roles simultaneously.</p>
          </div>
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Roles Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Select Roles ({bulkRoleIds.size})</label>
              <div className="bg-gray-50 border border-gray-200 rounded-lg h-[300px] overflow-y-auto p-2">
                {roles.map(r => (
                  <label key={r.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-md cursor-pointer transition-colors border border-transparent hover:border-gray-200">
                    <input 
                      type="checkbox" 
                      checked={bulkRoleIds.has(r.id)}
                      onChange={(e) => {
                        const next = new Set(bulkRoleIds);
                        if (e.target.checked) next.add(r.id);
                        else next.delete(r.id);
                        setBulkRoleIds(next);
                      }}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" 
                    />
                    <span className="text-sm font-medium text-gray-800">{r.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Permissions Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Select Permissions ({bulkPerms.size})</label>
              <div className="bg-gray-50 border border-gray-200 rounded-lg h-[300px] overflow-y-auto p-2">
                {allPermissions.map(p => (
                  <label key={p} className="flex items-center gap-3 p-2 hover:bg-white rounded-md cursor-pointer transition-colors border border-transparent hover:border-gray-200">
                    <input 
                      type="checkbox" 
                      checked={bulkPerms.has(p)}
                      onChange={(e) => {
                        const next = new Set(bulkPerms);
                        if (e.target.checked) next.add(p);
                        else next.delete(p);
                        setBulkPerms(next);
                      }}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" 
                    />
                    <span className="text-sm text-gray-700">{p}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setBulkMode("assign")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  bulkMode === "assign" ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                }`}
              >
                Assign
              </button>
              <button
                onClick={() => setBulkMode("remove")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  bulkMode === "remove" ? "bg-red-600 text-white shadow-sm" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                }`}
              >
                Remove
              </button>
            </div>
            
            <button
              onClick={handleBulkAction}
              disabled={bulkLoading || bulkRoleIds.size === 0 || bulkPerms.size === 0}
              className={`px-6 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-50
                ${bulkMode === "assign" ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-red-600 hover:bg-red-700 text-white"}
              `}
            >
              {bulkLoading && <Loader2 size={16} className="animate-spin" />}
              Execute {bulkMode === "assign" ? "Assignment" : "Removal"}
            </button>
          </div>
        </div>
      )}

      {/* CLONE ROLE VIEW */}
      {tab === "clone" && (
        <div className="max-w-xl mx-auto bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50">
            <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Copy size={20} className="text-indigo-600" /> Clone Existing Role
            </h2>
            <p className="text-sm text-gray-500">Create a new role by duplicating all permissions from an existing one.</p>
          </div>
          
          <form onSubmit={handleCloneRole} className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Source Role <span className="text-red-500">*</span></label>
              <select 
                required
                value={cloneSourceId}
                onChange={e => setCloneSourceId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
              >
                <option value="">Select a role to clone...</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">New Role Name <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                required
                value={cloneName}
                onChange={e => setCloneName(e.target.value)}
                placeholder="e.g. Sales Manager - Tier 2"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
              <textarea 
                value={cloneDescription}
                onChange={e => setCloneDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>
            
            <button
              type="submit"
              disabled={cloneLoading || !cloneSourceId || !cloneName}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3 rounded-lg text-sm font-bold flex justify-center items-center gap-2 transition-colors"
            >
              {cloneLoading && <Loader2 size={18} className="animate-spin" />}
              Clone Role
            </button>
          </form>
        </div>
      )}

      {/* EDIT ROLE MODAL */}
      {editRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Edit Permissions</h2>
                <p className="text-sm text-gray-500">Updating <span className="font-semibold text-gray-700">{editRole.name}</span></p>
              </div>
              <button onClick={() => setEditRole(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">{editPerms.size} Selected</span>
                <div className="flex gap-2">
                  <button onClick={() => setEditPerms(new Set(allPermissions))} className="text-xs font-medium text-indigo-600 hover:text-indigo-800">Select All</button>
                  <span className="text-gray-300">|</span>
                  <button onClick={() => setEditPerms(new Set())} className="text-xs font-medium text-gray-500 hover:text-gray-800">Clear All</button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {allPermissions.length > 0 ? (
                  allPermissions.map(p => (
                    <label key={p} className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                      editPerms.has(p) ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}>
                      <input 
                        type="checkbox"
                        checked={editPerms.has(p)}
                        onChange={() => toggleEditPerm(p)}
                        className="mt-0.5 text-indigo-600 focus:ring-indigo-500 rounded border-gray-300"
                      />
                      <span className={`text-sm ${editPerms.has(p) ? 'font-medium text-indigo-900' : 'text-gray-700'}`}>{p}</span>
                    </label>
                  ))
                ) : (
                  <p className="col-span-full text-sm text-gray-500 py-10 text-center">No permissions found in the system matrix.</p>
                )}
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
              <button 
                onClick={() => setEditRole(null)}
                className="px-5 py-2.5 border border-gray-300 bg-white text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveEdit}
                disabled={editLoading}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {editLoading && <Loader2 size={16} className="animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* APPLY TEMPLATE MODAL */}
      {selectedTemplate && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
         <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
           <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
             <h2 className="text-lg font-bold text-gray-900">Apply Template</h2>
             <button
               onClick={() => setSelectedTemplate(null)}
               className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
             >
               <X size={18} className="text-gray-500" />
             </button>
           </div>
           
           <div className="p-6">
             <div className="mb-5 bg-emerald-50 border border-emerald-100 rounded-lg p-4">
               <p className="text-sm font-medium text-emerald-800">Template: {selectedTemplate.name}</p>
               <p className="text-xs text-emerald-600 mt-1">{selectedTemplate.permissions.length} permissions included.</p>
               <p className="text-xs text-emerald-700 mt-2"><strong>Warning:</strong> This will overwrite the target role's permissions completely.</p>
             </div>
             
             <label className="block text-sm font-semibold text-gray-700 mb-2">Select Target Role</label>
             <select 
                required
                value={applyTargetRole}
                onChange={e => setApplyTargetRole(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
              >
                <option value="">Select a role to apply to...</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
           </div>
           
           <div className="p-6 pt-0 flex gap-3">
             <button
               onClick={() => setSelectedTemplate(null)}
               className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
             >
               Cancel
             </button>
             <button
               onClick={handleApplyTemplate}
               disabled={applyLoading || !applyTargetRole}
               className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
             >
               {applyLoading && <Loader2 size={14} className="animate-spin" />}
               Confirm Apply
             </button>
           </div>
         </div>
       </div>
      )}
    </div>
  );
}
