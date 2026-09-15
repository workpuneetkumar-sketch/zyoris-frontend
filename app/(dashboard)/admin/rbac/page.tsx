"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  AlertCircle,
  BadgeInfo,
  BarChart3,
  ChevronRight,
  Database,
  KeyRound,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRoundPen,
  Users,
} from "lucide-react";
import {
  assignUserRole,
  changeUserRole,
  getRbacMetrics,
  getRbacMetricsOrganization,
  getRbacMetricsPermissions,
  getRbacMetricsRoles,
  getRoleOverviewRole,
  getRoleOverviewRoleUsers,
  getRoleOverviewRoles,
  getRoleOverviewStatistics,
  getUserRoles,
  removeUserRole,
  type RoleOverviewRole,
} from "@/lib/api/rbacOperationsApi";

type TabKey = "assign" | "overview" | "metrics";
type AnyRecord = Record<string, any>;

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toTitle(value: string) {
  return value.replace(/[_.-]/g, " ").replace(/\b\w/g, (segment) => segment.toUpperCase());
}

function formatValue(value: unknown) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return value.toLocaleString();
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? "" : "s"}`;
  if (isRecord(value)) return JSON.stringify(value);
  return String(value);
}

function normalizeArray<T = AnyRecord>(
  value: unknown,
  keys: string[] = ["items", "data", "roles", "users", "permissions", "results"],
): T[] {
  if (Array.isArray(value)) return value as T[];
  if (!isRecord(value)) return [];
  for (const key of keys) {
    if (Array.isArray(value[key])) return value[key] as T[];
  }
  return [];
}

function collectNumericEntries(value: unknown, limit = 6) {
  if (!isRecord(value)) return [] as Array<[string, number]>;
  return Object.entries(value)
    .filter(([, entry]) => typeof entry === "number")
    .slice(0, limit) as Array<[string, number]>;
}

function countRoleUsers(role: RoleOverviewRole | AnyRecord) {
  const directCount = ["userCount", "usersCount", "memberCount", "membersCount", "assignedUsersCount"].find(
    (key) => typeof role[key] === "number",
  );
  if (directCount) return Number(role[directCount]);
  if (Array.isArray(role.users)) return role.users.length;
  return null;
}

function countRolePermissions(role: RoleOverviewRole | AnyRecord) {
  const directCount = ["permissionCount", "permissionsCount", "totalPermissions"].find(
    (key) => typeof role[key] === "number",
  );
  if (directCount) return Number(role[directCount]);
  if (Array.isArray(role.permissions)) return role.permissions.length;
  return null;
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="font-medium">{message}</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="shrink-0 rounded-lg p-1 transition-colors hover:bg-red-100">
          <RefreshCw size={14} />
        </button>
      )}
    </div>
  );
}

function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-slate-500">
      <Loader2 size={24} className="animate-spin text-sky-500" />
      <span className="ml-3 text-sm font-medium">{label}</span>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white/80 px-6 py-10 text-center">
      <Shield size={36} className="mx-auto text-slate-300" />
      <p className="mt-3 font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function MetricTile({
  label,
  value,
  tone = "sky",
}: {
  label: string;
  value: string;
  tone?: "sky" | "violet" | "amber" | "emerald" | "rose";
}) {
  const theme: Record<typeof tone, string> = {
    sky: "from-sky-50 to-cyan-50 text-sky-700 border-sky-100",
    violet: "from-violet-50 to-fuchsia-50 text-violet-700 border-violet-100",
    amber: "from-amber-50 to-orange-50 text-amber-700 border-amber-100",
    emerald: "from-emerald-50 to-teal-50 text-emerald-700 border-emerald-100",
    rose: "from-rose-50 to-pink-50 text-rose-700 border-rose-100",
  };

  return (
    <div className={`rounded-2xl border bg-gradient-to-br px-4 py-4 ${theme[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

function DetailList({ data }: { data: unknown }) {
  if (Array.isArray(data)) {
    return (
      <div className="space-y-2">
        {data.slice(0, 8).map((item, index) => (
          <div key={index} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {formatValue(item)}
          </div>
        ))}
      </div>
    );
  }

  if (!isRecord(data)) {
    return <p className="text-sm text-slate-500">No structured data returned.</p>;
  }

  const entries = Object.entries(data).slice(0, 10);
  if (entries.length === 0) {
    return <p className="text-sm text-slate-500">No data returned.</p>;
  }

  return (
    <div className="space-y-2">
      {entries.map(([key, value]) => (
        <div key={key} className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{toTitle(key)}</p>
          <p className="max-w-[65%] text-right text-sm text-slate-700">{formatValue(value)}</p>
        </div>
      ))}
    </div>
  );
}

export default function RbacConsolePage() {
  const { user, isInitializing } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<TabKey>("assign");
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    if (!isInitializing && user && user.role !== "ADMIN") {
      router.push("/admin");
    }
  }, [user, isInitializing, router]);

  const [assignmentForm, setAssignmentForm] = useState({ userId: "", roleId: "", newRoleId: "", removeRoleId: "" });
  const [assignmentLoading, setAssignmentLoading] = useState<"assign" | "change" | "remove" | "load" | null>(null);
  const [assignmentResult, setAssignmentResult] = useState<AnyRecord | null>(null);
  const [assignedRoles, setAssignedRoles] = useState<AnyRecord[]>([]);

  const [roleOverviewRoles, setRoleOverviewRoles] = useState<RoleOverviewRole[]>([]);
  const [roleOverviewStats, setRoleOverviewStats] = useState<AnyRecord | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<AnyRecord | null>(null);
  const [selectedRoleUsers, setSelectedRoleUsers] = useState<AnyRecord[]>([]);
  const [roleOverviewLoading, setRoleOverviewLoading] = useState(false);
  const [roleDetailLoading, setRoleDetailLoading] = useState(false);

  const [metrics, setMetrics] = useState<AnyRecord | null>(null);
  const [metricsRoles, setMetricsRoles] = useState<AnyRecord | null>(null);
  const [metricsPermissions, setMetricsPermissions] = useState<AnyRecord | null>(null);
  const [organizationId, setOrganizationId] = useState("");
  const [organizationMetrics, setOrganizationMetrics] = useState<AnyRecord | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [organizationLoading, setOrganizationLoading] = useState(false);

  const selectedRoleSummary = useMemo(() => {
    if (!selectedRole) return null;
    return {
      permissions: countRolePermissions(selectedRole),
      users: countRoleUsers(selectedRole),
    };
  }, [selectedRole]);

  const loadRoleOverview = useCallback(async () => {
    setRoleOverviewLoading(true);
    setPageError(null);
    try {
      const [rolesResponse, statsResponse] = await Promise.allSettled([
        getRoleOverviewRoles(),
        getRoleOverviewStatistics(),
      ]);

      const rolesData = rolesResponse.status === "fulfilled" ? normalizeArray<RoleOverviewRole>(rolesResponse.value, ["roles", "items", "data", "results"]) : [];
      setRoleOverviewRoles(rolesData);

      if (rolesData.length > 0 && !selectedRoleId) {
        setSelectedRoleId(rolesData[0].id);
      }

      if (statsResponse.status === "fulfilled") {
        setRoleOverviewStats(isRecord(statsResponse.value) ? statsResponse.value : { value: statsResponse.value });
      }
    } catch (error: any) {
      setPageError(error?.response?.data?.message || "Failed to load role overview.");
    } finally {
      setRoleOverviewLoading(false);
    }
  }, [selectedRoleId]);

  const loadMetrics = useCallback(async () => {
    setMetricsLoading(true);
    setPageError(null);
    try {
      const [metricsResponse, metricsRolesResponse, permissionsResponse] = await Promise.allSettled([
        getRbacMetrics(),
        getRbacMetricsRoles(),
        getRbacMetricsPermissions(),
      ]);

      if (metricsResponse.status === "fulfilled") {
        setMetrics(isRecord(metricsResponse.value) ? metricsResponse.value : { value: metricsResponse.value });
      }
      if (metricsRolesResponse.status === "fulfilled") {
        setMetricsRoles(isRecord(metricsRolesResponse.value) ? metricsRolesResponse.value : { value: metricsRolesResponse.value });
      }
      if (permissionsResponse.status === "fulfilled") {
        setMetricsPermissions(isRecord(permissionsResponse.value) ? permissionsResponse.value : { value: permissionsResponse.value });
      }
    } catch (error: any) {
      setPageError(error?.response?.data?.message || "Failed to load RBAC metrics.");
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "overview" && roleOverviewRoles.length === 0 && !roleOverviewLoading) {
      void loadRoleOverview();
    }
  }, [tab, loadRoleOverview, roleOverviewLoading, roleOverviewRoles.length]);

  useEffect(() => {
    if (tab === "metrics" && metrics === null && !metricsLoading) {
      void loadMetrics();
    }
  }, [tab, loadMetrics, metrics, metricsLoading]);

  useEffect(() => {
    if (!selectedRoleId) return;
    let cancelled = false;
    async function loadSelectedRole() {
      setRoleDetailLoading(true);
      try {
        const [detailResponse, usersResponse] = await Promise.allSettled([
          getRoleOverviewRole(selectedRoleId),
          getRoleOverviewRoleUsers(selectedRoleId),
        ]);

        if (cancelled) return;

        if (detailResponse.status === "fulfilled") {
          setSelectedRole(detailResponse.value as AnyRecord);
        } else {
          const fallback = roleOverviewRoles.find((role) => role.id === selectedRoleId) ?? null;
          setSelectedRole(fallback ? (fallback as AnyRecord) : null);
        }

        if (usersResponse.status === "fulfilled") {
          setSelectedRoleUsers(normalizeArray<AnyRecord>(usersResponse.value, ["users", "items", "data", "results"]));
        } else {
          setSelectedRoleUsers([]);
        }
      } catch (error: any) {
        if (!cancelled) {
          setPageError(error?.response?.data?.message || "Failed to load role details.");
        }
      } finally {
        if (!cancelled) setRoleDetailLoading(false);
      }
    }

    void loadSelectedRole();
    return () => {
      cancelled = true;
    };
  }, [selectedRoleId, roleOverviewRoles]);

  const handleAssign = async () => {
    if (!assignmentForm.userId.trim() || !assignmentForm.roleId.trim()) {
      toast.error("User ID and role ID are required.");
      return;
    }

    setAssignmentLoading("assign");
    setPageError(null);
    try {
      const response = await assignUserRole({ userId: assignmentForm.userId.trim(), roleId: assignmentForm.roleId.trim() });
      setAssignmentResult(response);
      toast.success(response?.message || "Role assigned.");
      const rolesResponse = await getUserRoles(assignmentForm.userId.trim());
      setAssignedRoles(normalizeArray<AnyRecord>(rolesResponse, ["roles", "items", "data", "results"]));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to assign role.");
    } finally {
      setAssignmentLoading(null);
    }
  };

  const handleChange = async () => {
    if (!assignmentForm.userId.trim() || !assignmentForm.newRoleId.trim()) {
      toast.error("User ID and new role ID are required.");
      return;
    }

    setAssignmentLoading("change");
    setPageError(null);
    try {
      const response = await changeUserRole({ userId: assignmentForm.userId.trim(), newRoleId: assignmentForm.newRoleId.trim() });
      setAssignmentResult(response);
      toast.success(response?.message || "Role changed.");
      const rolesResponse = await getUserRoles(assignmentForm.userId.trim());
      setAssignedRoles(normalizeArray<AnyRecord>(rolesResponse, ["roles", "items", "data", "results"]));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to change role.");
    } finally {
      setAssignmentLoading(null);
    }
  };

  const handleRemove = async () => {
    if (!assignmentForm.userId.trim() || !assignmentForm.removeRoleId.trim()) {
      toast.error("User ID and role ID to remove are required.");
      return;
    }

    setAssignmentLoading("remove");
    setPageError(null);
    try {
      const response = await removeUserRole({ userId: assignmentForm.userId.trim(), roleId: assignmentForm.removeRoleId.trim() });
      setAssignmentResult(response);
      toast.success(response?.message || "Role removed.");
      const rolesResponse = await getUserRoles(assignmentForm.userId.trim());
      setAssignedRoles(normalizeArray<AnyRecord>(rolesResponse, ["roles", "items", "data", "results"]));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to remove role.");
    } finally {
      setAssignmentLoading(null);
    }
  };

  const handleLoadUserRoles = async () => {
    if (!assignmentForm.userId.trim()) {
      toast.error("User ID is required.");
      return;
    }

    setAssignmentLoading("load");
    setPageError(null);
    try {
      const response = await getUserRoles(assignmentForm.userId.trim());
      setAssignmentResult(isRecord(response) ? response : { value: response });
      setAssignedRoles(normalizeArray<AnyRecord>(response, ["roles", "items", "data", "results"]));
      toast.success("User roles loaded.");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to load user roles.");
    } finally {
      setAssignmentLoading(null);
    }
  };

  const handleLoadOrganizationMetrics = async () => {
    if (!organizationId.trim()) {
      toast.error("Organization ID is required.");
      return;
    }

    setOrganizationLoading(true);
    setPageError(null);
    try {
      const response = await getRbacMetricsOrganization(organizationId.trim());
      setOrganizationMetrics(isRecord(response) ? response : { value: response });
      toast.success("Organization metrics loaded.");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to load organization metrics.");
    } finally {
      setOrganizationLoading(false);
    }
  };

  const overviewTiles = useMemo(() => collectNumericEntries(roleOverviewStats), [roleOverviewStats]);
  const metricTiles = useMemo(() => collectNumericEntries(metrics), [metrics]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-sky-950 to-indigo-950 p-6 text-white shadow-2xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-sky-100">
              <Sparkles size={12} />
              RBAC Control Center
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">User assignment, role overview, and RBAC metrics in one place.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
              The new role-assignment and overview endpoints are wired into a single admin console so you can inspect roles, move users between roles, and review system-wide RBAC health without leaving the dashboard.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-[36rem]">
            <MetricTile label="Assign" value="POST" tone="sky" />
            <MetricTile label="Overview" value="GET" tone="violet" />
            <MetricTile label="Metrics" value="GET" tone="emerald" />
            <MetricTile label="Organization" value="Scoped" tone="amber" />
          </div>
        </div>
      </div>

      {pageError && <div className="mb-6"><ErrorBanner message={pageError} /></div>}

      <div className="mb-6 inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        {[
          { key: "assign", label: "User Role Assignment", icon: UserRoundPen },
          { key: "overview", label: "Role Overview", icon: ShieldCheck },
          { key: "metrics", label: "RBAC Metrics", icon: BarChart3 },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key as TabKey)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              tab === key ? "bg-slate-950 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === "assign" && (
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Assign or modify a user role</h2>
                <p className="mt-1 text-sm text-slate-500">Use the new user-role-assignment endpoints directly from the UI.</p>
              </div>
              <div className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">/user-role-assignment</div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">User ID</span>
                <input
                  value={assignmentForm.userId}
                  onChange={(event) => setAssignmentForm((prev) => ({ ...prev, userId: event.target.value }))}
                  placeholder="Enter userId"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role ID</span>
                <input
                  value={assignmentForm.roleId}
                  onChange={(event) => setAssignmentForm((prev) => ({ ...prev, roleId: event.target.value }))}
                  placeholder="Role to assign"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">New Role ID</span>
                <input
                  value={assignmentForm.newRoleId}
                  onChange={(event) => setAssignmentForm((prev) => ({ ...prev, newRoleId: event.target.value }))}
                  placeholder="Role to change to"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role ID To Remove</span>
                <input
                  value={assignmentForm.removeRoleId}
                  onChange={(event) => setAssignmentForm((prev) => ({ ...prev, removeRoleId: event.target.value }))}
                  placeholder="Role to remove"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-100"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleAssign}
                disabled={assignmentLoading !== null}
                className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {assignmentLoading === "assign" ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                Assign Role
              </button>
              <button
                onClick={handleChange}
                disabled={assignmentLoading !== null}
                className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {assignmentLoading === "change" ? <Loader2 size={16} className="animate-spin" /> : <UserRoundPen size={16} />}
                Change Role
              </button>
              <button
                onClick={handleRemove}
                disabled={assignmentLoading !== null}
                className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {assignmentLoading === "remove" ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Remove Role
              </button>
              <button
                onClick={handleLoadUserRoles}
                disabled={assignmentLoading !== null}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {assignmentLoading === "load" ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                Load Current Roles
              </button>
            </div>

            {assignmentResult && (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <BadgeInfo size={16} className="text-sky-600" />
                  Latest response
                </div>
                <DetailList data={assignmentResult} />
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Current roles for user</h3>
                  <p className="mt-1 text-sm text-slate-500">GET /user-role-assignment/:userId/roles</p>
                </div>
                <Users size={18} className="text-slate-400" />
              </div>
              {assignmentLoading === "load" ? (
                <LoadingState label="Fetching user roles" />
              ) : assignedRoles.length === 0 ? (
                <EmptyState title="No loaded roles yet" description="Enter a user ID and load the current assignments." />
              ) : (
                <div className="space-y-2">
                  {assignedRoles.map((role, index) => (
                    <div key={role.id ?? role.roleId ?? index} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{role.name || role.roleName || role.title || role.role?.name || formatValue(role.id) || `Role ${index + 1}`}</p>
                          <p className="mt-0.5 text-xs text-slate-500">{role.description || role.role?.description || role.roleId || role.id || "Assigned role"}</p>
                        </div>
                        <button
                          onClick={() => setAssignmentForm((prev) => ({ ...prev, removeRoleId: role.id || role.roleId || prev.removeRoleId }))}
                          className="rounded-xl border border-rose-200 bg-white px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                        >
                          Use for remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {overviewTiles.length > 0 ? (
              overviewTiles.map(([key, value], index) => (
                <MetricTile
                  key={key}
                  label={toTitle(key)}
                  value={formatValue(value)}
                  tone={["sky", "violet", "emerald", "amber", "rose"][index % 5] as any}
                />
              ))
            ) : roleOverviewLoading ? (
              <LoadingState label="Loading role statistics" />
            ) : (
              <EmptyState title="No statistics returned" description="The backend response did not include numeric summary fields." />
            )}
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Roles</h3>
                  <p className="mt-1 text-sm text-slate-500">GET /role-overview/roles</p>
                </div>
                <button
                  onClick={() => void loadRoleOverview()}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Refresh
                </button>
              </div>

              {roleOverviewLoading && roleOverviewRoles.length === 0 ? (
                <LoadingState label="Loading roles" />
              ) : roleOverviewRoles.length === 0 ? (
                <EmptyState title="No roles returned" description="No role overview data was returned by the backend." />
              ) : (
                <div className="space-y-2">
                  {roleOverviewRoles.map((role) => {
                    const userCount = countRoleUsers(role);
                    const permissionCount = countRolePermissions(role);
                    const isActive = selectedRoleId === role.id;

                    return (
                      <button
                        key={role.id}
                        onClick={() => setSelectedRoleId(role.id)}
                        className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                          isActive ? "border-sky-200 bg-sky-50" : "border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{role.name}</p>
                            <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{role.description || "No description provided."}</p>
                          </div>
                          <ChevronRight size={16} className="mt-0.5 text-slate-400" />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                          <span className="rounded-full bg-white px-2.5 py-1 font-semibold">{permissionCount ?? 0} permissions</span>
                          <span className="rounded-full bg-white px-2.5 py-1 font-semibold">{userCount ?? 0} users</span>
                          <span className="rounded-full bg-white px-2.5 py-1 font-semibold">{role.id}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Selected role detail</h3>
                    <p className="mt-1 text-sm text-slate-500">GET /role-overview/roles/:roleId and /users</p>
                  </div>
                  <ShieldCheck size={18} className="text-sky-500" />
                </div>

                {roleDetailLoading ? (
                  <LoadingState label="Loading role detail" />
                ) : !selectedRole ? (
                  <EmptyState title="No role selected" description="Choose a role from the list to inspect its users and permissions." />
                ) : (
                  <div className="space-y-5">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-900">{selectedRole.name || selectedRole.title || selectedRole.id}</p>
                      <p className="mt-1 text-sm text-slate-500">{selectedRole.description || "No description provided."}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                        <span className="rounded-full bg-white px-2.5 py-1 font-semibold">{selectedRoleSummary?.permissions ?? countRolePermissions(selectedRole) ?? 0} permissions</span>
                        <span className="rounded-full bg-white px-2.5 py-1 font-semibold">{selectedRoleSummary?.users ?? countRoleUsers(selectedRole) ?? selectedRoleUsers.length} users</span>
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Permissions</p>
                      <DetailList data={selectedRole.permissions ?? selectedRole.permissionKeys ?? selectedRole.allowedPermissions ?? []} />
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Users</p>
                      {selectedRoleUsers.length === 0 ? (
                        <p className="text-sm text-slate-500">No users returned for this role.</p>
                      ) : (
                        <div className="space-y-2">
                          {selectedRoleUsers.slice(0, 8).map((item, index) => (
                            <div key={item.id ?? item.userId ?? index} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                              <p className="text-sm font-semibold text-slate-900">{item.name || item.fullName || item.email || item.username || `User ${index + 1}`}</p>
                              <p className="mt-0.5 text-xs text-slate-500">{item.email || item.id || item.userId || "User entry"}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Role overview statistics</h3>
                    <p className="mt-1 text-sm text-slate-500">GET /role-overview/roles/statistics</p>
                  </div>
                  <Database size={18} className="text-slate-400" />
                </div>
                {roleOverviewStats ? <DetailList data={roleOverviewStats} /> : <p className="text-sm text-slate-500">No statistics loaded yet.</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "metrics" && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metricTiles.length > 0 ? (
              metricTiles.map(([key, value], index) => (
                <MetricTile
                  key={key}
                  label={toTitle(key)}
                  value={formatValue(value)}
                  tone={["emerald", "sky", "violet", "amber", "rose"][index % 5] as any}
                />
              ))
            ) : metricsLoading ? (
              <LoadingState label="Loading RBAC metrics" />
            ) : (
              <EmptyState title="No metrics returned" description="The system metrics endpoint did not return numeric summary data." />
            )}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Metrics by role</h3>
                  <p className="mt-1 text-sm text-slate-500">GET /rbac-metrics/metrics/roles</p>
                </div>
                <BarChart3 size={18} className="text-slate-400" />
              </div>
              {metricsRoles ? <DetailList data={metricsRoles} /> : metricsLoading ? <LoadingState label="Loading role metrics" /> : <p className="text-sm text-slate-500">No role metrics loaded yet.</p>}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Metrics by permission</h3>
                  <p className="mt-1 text-sm text-slate-500">GET /rbac-metrics/metrics/permissions</p>
                </div>
                <ShieldCheck size={18} className="text-slate-400" />
              </div>
              {metricsPermissions ? <DetailList data={metricsPermissions} /> : metricsLoading ? <LoadingState label="Loading permission metrics" /> : <p className="text-sm text-slate-500">No permission metrics loaded yet.</p>}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Organization metrics</h3>
                <p className="mt-1 text-sm text-slate-500">GET /rbac-metrics/metrics/organizations/:organizationId</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={organizationId}
                  onChange={(event) => setOrganizationId(event.target.value)}
                  placeholder="organizationId"
                  className="w-56 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
                <button
                  onClick={handleLoadOrganizationMetrics}
                  disabled={organizationLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {organizationLoading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                  Load
                </button>
              </div>
            </div>

            {organizationLoading ? (
              <LoadingState label="Loading organization metrics" />
            ) : organizationMetrics ? (
              <DetailList data={organizationMetrics} />
            ) : (
              <EmptyState title="No organization selected" description="Enter an organization ID to inspect scoped metrics." />
            )}
          </div>

          {metrics && (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <BadgeInfo size={16} className="text-sky-600" />
                Raw metric fields
              </div>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {Object.entries(metrics).slice(0, 12).map(([key, value]) => (
                  <div key={key} className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{toTitle(key)}</p>
                    <p className="mt-1 text-sm text-slate-700">{formatValue(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}