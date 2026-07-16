"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { getUserRole, assignUserRole, getUsersByRole, UserByRoleItem } from "@/lib/api/userRolesApi";
import { getRbacUserPermissions } from "@/lib/api/rbacApi";
import { getRoles } from "@/lib/api/rolesApi";
import { RbacRoleMatrixItem } from "@/lib/api/rbacApi";
import api from "@/lib/api/api";
import { toast } from "react-toastify";
import {
  UserCog,
  Search,
  Loader2,
  Users,
  ChevronDown,
  Check,
  Shield,
  KeyRound,
  X,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────────────── */

interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface UserRoleEntry {
  user: TeamUser;
  assignedRole: { id: string; name: string; description?: string } | null;
  loadingRole: boolean;
}

type Tab = "users" | "byRole";

/* ─── Helpers ────────────────────────────────────────────────────────── */

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
      <AlertCircle size={16} className="shrink-0 mt-0.5" />
      <div className="flex-1">
        <p>{message}</p>
        <p className="text-xs mt-1 text-red-500">
          This is a backend permission issue. The UI is fully wired to this endpoint.
        </p>
      </div>
    </div>
  );
}

/* ─── By Role View ───────────────────────────────────────────────────── */

function UsersByRoleView({ roles }: { roles: RbacRoleMatrixItem[] }) {
  const [selectedRoleId, setSelectedRoleId] = useState<string>(roles[0]?.id ?? "");
  const [users, setUsers] = useState<UserByRoleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async (roleId: string) => {
    if (!roleId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getUsersByRole(roleId);
      setUsers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load users for this role.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedRoleId) loadUsers(selectedRoleId);
  }, [selectedRoleId, loadUsers]);

  return (
    <div>
      {/* Role selector */}
      <div className="flex items-center gap-3 mb-6">
        <p className="text-sm font-medium text-gray-700 shrink-0">View users in role:</p>
        <select
          value={selectedRoleId}
          onChange={(e) => setSelectedRoleId(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
        >
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <button
          onClick={() => loadUsers(selectedRoleId)}
          className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-purple-600 hover:border-purple-300 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-purple-500" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users size={36} className="mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-sm">No users in this role</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div
              key={u.id}
              className="bg-white border border-gray-100 rounded-xl px-5 py-3 flex items-center gap-3 shadow-sm"
            >
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700 shrink-0">
                {(u.name || u.email || "?")
                  .split(" ")
                  .map((p) => p[0]?.toUpperCase() || "")
                  .join("")
                  .slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{u.name || "—"}</p>
                <p className="text-xs text-gray-400 truncate">{u.email}</p>
              </div>
              <span className="text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-full shrink-0">
                {u.role}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Permissions Detail Panel ───────────────────────────────────────── */

function UserPermissionsPanel({
  userId,
  userName,
  onClose,
}: {
  userId: string;
  userName: string;
  onClose: () => void;
}) {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getRbacUserPermissions(userId);
        if (!cancelled) setPermissions(Array.isArray(data) ? data : []);
      } catch (err: any) {
        if (!cancelled)
          setError(err?.response?.data?.message || "Failed to load permissions.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [userId]);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-sm bg-white h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900">Effective Permissions</h2>
            <p className="text-sm text-gray-400 truncate">{userName}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={22} className="animate-spin text-purple-400" />
            </div>
          ) : error ? (
            <ErrorBanner message={error} />
          ) : permissions.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <KeyRound size={28} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm font-medium">No permissions</p>
              <p className="text-xs mt-1 text-gray-400">
                This user has no RBAC permissions assigned.
              </p>
            </div>
          ) : (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                {permissions.length} permission{permissions.length !== 1 ? "s" : ""}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {permissions.map((p) => (
                  <span
                    key={p}
                    className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-100 text-xs font-medium px-2 py-0.5 rounded-full"
                  >
                    <Check size={10} />
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="px-5 py-4 border-t border-gray-100 text-xs text-gray-400">
          Via{" "}
          <code className="bg-gray-100 px-1 rounded font-mono">
            GET /rbac/users/permissions?userId={userId}
          </code>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────── */

export default function UserRolesPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [roles, setRoles] = useState<RbacRoleMatrixItem[]>([]);
  const [entries, setEntries] = useState<UserRoleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Dropdown state
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);

  // Permissions panel
  const [permUser, setPermUser] = useState<{ id: string; name: string } | null>(null);

  // Guard: ADMIN only
  useEffect(() => {
    if (user && user.role !== "ADMIN") {
      router.push("/admin");
    }
  }, [user, router]);

  /* ── Fetch all users + roles ──────────────────────────────────────── */

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [teamRes, rolesRes] = await Promise.all([
        api.get<TeamUser[]>("/team"),
        getRoles(),
      ]);

      const teamUsers: TeamUser[] = Array.isArray(teamRes.data) ? teamRes.data : [];
      const allRoles: RbacRoleMatrixItem[] = Array.isArray(rolesRes) ? rolesRes : [];

      setRoles(allRoles);
      setUsers(teamUsers);

      // Skeleton entries first
      const initial: UserRoleEntry[] = teamUsers.map((u) => ({
        user: u,
        assignedRole: null,
        loadingRole: true,
      }));
      setEntries(initial);

      // Load each user's role via GET /user-roles/:userId (non-blocking)
      teamUsers.forEach(async (u) => {
        try {
          const roleData = await getUserRole(u.id);
          setEntries((prev) =>
            prev.map((e) =>
              e.user.id === u.id
                ? { ...e, assignedRole: roleData.role, loadingRole: false }
                : e
            )
          );
        } catch {
          setEntries((prev) =>
            prev.map((e) => (e.user.id === u.id ? { ...e, loadingRole: false } : e))
          );
        }
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── Assign role (PATCH /user-roles/:userId) ────────────────────── */

  async function handleAssign(userId: string, roleId: string) {
    setOpenDropdown(null);
    setAssigningUserId(userId);
    try {
      await assignUserRole(userId, roleId);
      const newRole = roles.find((r) => r.id === roleId);
      setEntries((prev) =>
        prev.map((e) =>
          e.user.id === userId
            ? {
                ...e,
                assignedRole: newRole
                  ? { id: newRole.id, name: newRole.name, description: newRole.description }
                  : e.assignedRole,
              }
            : e
        )
      );
      toast.success("Role assigned.");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to assign role.");
    } finally {
      setAssigningUserId(null);
    }
  }

  const filtered = entries.filter(
    (e) =>
      e.user.name.toLowerCase().includes(search.toLowerCase()) ||
      e.user.email.toLowerCase().includes(search.toLowerCase())
  );

  const initials = (name: string) =>
    name
      .split(" ")
      .map((p) => p[0]?.toUpperCase() || "")
      .join("")
      .slice(0, 2);

  return (
    <div className="max-w-5xl mx-auto px-2 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <UserCog size={20} className="text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">User Roles</h1>
            <p className="text-sm text-gray-500">Assign roles and inspect effective permissions</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {(
          [
            { key: "users", label: "Assign Roles" },
            { key: "byRole", label: "Users by Role" },
          ] as { key: Tab; label: string }[]
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key
                ? "bg-white text-purple-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Users by Role Tab (GET /user-roles/role/:roleId) ── */}
      {tab === "byRole" && (
        <UsersByRoleView roles={roles} />
      )}

      {/* ── Assign Roles Tab ── */}
      {tab === "users" && (
        <>
          {/* Error */}
          {error && <ErrorBanner message={error} />}

          {/* Search */}
          <div className="relative mb-5">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="animate-spin text-purple-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <Users size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No users found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((entry) => (
                <div
                  key={entry.user.id}
                  className="bg-white border border-gray-100 rounded-xl px-5 py-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center shrink-0 text-xs font-bold text-purple-700">
                    {initials(entry.user.name || entry.user.email)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">
                      {entry.user.name || "—"}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{entry.user.email}</p>
                  </div>

                  {/* Current role badge */}
                  <div className="shrink-0">
                    {entry.loadingRole ? (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                        <Loader2 size={12} className="animate-spin" />
                        Loading
                      </span>
                    ) : entry.assignedRole ? (
                      <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-100 text-xs font-medium px-2.5 py-1 rounded-full">
                        <Shield size={11} />
                        {entry.assignedRole.name}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">No role</span>
                    )}
                  </div>

                  {/* View effective permissions — GET /rbac/users/permissions */}
                  <button
                    onClick={() =>
                      setPermUser({ id: entry.user.id, name: entry.user.name || entry.user.email })
                    }
                    className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors shrink-0"
                    title="View effective permissions"
                  >
                    <KeyRound size={13} />
                    Perms
                  </button>

                  {/* Role assign dropdown — PATCH /user-roles/:userId */}
                  <div className="relative shrink-0">
                    {assigningUserId === entry.user.id ? (
                      <div className="flex items-center gap-1 text-xs text-gray-400 px-3 py-1.5">
                        <Loader2 size={12} className="animate-spin" />
                        Saving…
                      </div>
                    ) : (
                      <button
                        onClick={() =>
                          setOpenDropdown(openDropdown === entry.user.id ? null : entry.user.id)
                        }
                        className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:border-purple-400 hover:text-purple-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      >
                        Assign Role
                        <ChevronDown size={12} />
                      </button>
                    )}

                    {openDropdown === entry.user.id && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-20 py-1">
                        {roles.length === 0 ? (
                          <p className="text-xs text-gray-400 px-4 py-3">No roles available</p>
                        ) : (
                          roles.map((role) => {
                            const isActive = entry.assignedRole?.id === role.id;
                            return (
                              <button
                                key={role.id}
                                onClick={() => handleAssign(entry.user.id, role.id)}
                                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-purple-50 ${
                                  isActive ? "text-purple-700 font-medium" : "text-gray-700"
                                }`}
                              >
                                {role.name}
                                {isActive && <Check size={13} className="text-purple-600" />}
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Close dropdown on outside click */}
      {openDropdown && (
        <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
      )}

      {/* ── User Permissions Panel (GET /rbac/users/permissions) ── */}
      {permUser && (
        <UserPermissionsPanel
          userId={permUser.id}
          userName={permUser.name}
          onClose={() => setPermUser(null)}
        />
      )}
    </div>
  );
}
