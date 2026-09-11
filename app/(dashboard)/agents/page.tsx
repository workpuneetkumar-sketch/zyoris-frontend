"use client";

/**
 * app/(dashboard)/agents/page.tsx
 * ─────────────────────────────────────────────────────────────
 * AgentWorkspace — top-level shell + AgentList for the agent
 * registry section.
 *
 * Responsibilities:
 * - Auth guard (ADMIN only, matching other admin pages)
 * - Filter bar bound to URL query params: search, status,
 *   riskTier, permissionLevel
 * - Debounced search input (300 ms)
 * - Live GET /api/agents calls on every filter change
 * - Explicit loading, empty, and error states — no blank screens
 * - Re-fetches after every mutation instead of optimistic updates
 *
 * What this page does NOT do:
 * - Derive or enforce permissions client-side
 * - Show controls the backend hasn't confirmed are allowed
 * - Execute agents (POST /api/agents/execute is Day 4+)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getAgents } from "@/lib/api/agentApi";
import { toast } from "react-toastify";
import {
  Bot,
  Search,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  PlusCircle,
  Filter,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { AgentStatusBadge } from "@/components/agents/AgentStatusBadge";
import { RiskTierBadge } from "@/components/agents/RiskTierBadge";
import { PermissionLevelBadge } from "@/components/agents/PermissionLevelBadge";
import type { Agent, AgentListFilters, AgentStatus, RiskTier, PermissionLevel } from "@/types/agents";

// ─── Filter option sets ───────────────────────────────────────────────────────

const STATUS_OPTIONS: { label: string; value: AgentStatus }[] = [
  { label: "Active",    value: "ACTIVE"    },
  { label: "Inactive",  value: "INACTIVE"  },
  { label: "Suspended", value: "SUSPENDED" },
  { label: "Draft",     value: "DRAFT"     },
];

const RISK_TIER_OPTIONS: { label: string; value: RiskTier }[] = [
  { label: "Low",      value: "LOW"      },
  { label: "Medium",   value: "MEDIUM"   },
  { label: "High",     value: "HIGH"     },
  { label: "Critical", value: "CRITICAL" },
];

const PERMISSION_LEVEL_OPTIONS: { label: string; value: PermissionLevel }[] = [
  { label: "Read-only",              value: "READ_ONLY"              },
  { label: "Suggest",                value: "SUGGEST"                },
  { label: "Execute with Approval",  value: "EXECUTE_WITH_APPROVAL"  },
  { label: "Execute within Limits",  value: "EXECUTE_WITHIN_LIMITS"  },
  { label: "Autonomous",             value: "AUTONOMOUS"             },
];

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-50">
      {[40, 28, 16, 24, 28, 12].map((w, i) => (
        <td key={i} className="px-5 py-4">
          <div
            className="h-4 bg-gray-200 rounded-lg animate-pulse"
            style={{ width: `${w}%` }}
          />
        </td>
      ))}
    </tr>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <tr>
      <td colSpan={6}>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <Bot size={28} className="text-gray-300" />
          </div>
          <p className="text-sm font-semibold text-gray-700 mb-1">
            {hasFilters ? "No agents match your filters" : "No agents registered yet"}
          </p>
          <p className="text-xs text-gray-400 max-w-xs">
            {hasFilters
              ? "Try adjusting your search or clearing the active filters."
              : "Register the first agent to get started with the Agentic CRM."}
          </p>
          {hasFilters && (
            <button
              onClick={onClear}
              className="mt-4 text-xs font-semibold text-blue-600 hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
      <AlertCircle size={48} className="text-red-400 mb-4" />
      <h3 className="text-lg font-bold text-gray-900 mb-2">Failed to Load Agents</h3>
      <p className="text-sm text-gray-500 max-w-md mb-6">{message}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all"
      >
        <RefreshCw size={14} /> Retry
      </button>
    </div>
  );
}

// ─── Select filter pill ───────────────────────────────────────────────────────

interface SelectPillProps<T extends string> {
  label: string;
  value: T | "";
  options: { label: string; value: T }[];
  onChange: (v: T | "") => void;
}

function SelectPill<T extends string>({ label, value, options, onChange }: SelectPillProps<T>) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T | "")}
        className={`
          appearance-none pl-3 pr-7 py-1.5 rounded-xl border text-xs font-semibold
          bg-white cursor-pointer transition-all outline-none
          ${value
            ? "border-blue-300 text-blue-700 bg-blue-50"
            : "border-gray-200 text-gray-600 hover:border-gray-300"
          }
        `}
      >
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <SlidersHorizontal
        size={11}
        className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"
      />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathnameRaw = usePathname();
  const pathname = pathnameRaw ?? "/agents";

  // ── State ──────────────────────────────────────────────────────────────────

  const [agents, setAgents] = useState<Agent[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters — initialised from URL params so bookmarks/refresh work
  const [search, setSearch] = useState(searchParams?.get("search") ?? "");
  const [status, setStatus] = useState<AgentStatus | "">(
    (searchParams?.get("status") as AgentStatus) ?? ""
  );
  const [riskTier, setRiskTier] = useState<RiskTier | "">(
    (searchParams?.get("riskTier") as RiskTier) ?? ""
  );
  const [permissionLevel, setPermissionLevel] = useState<PermissionLevel | "">(
    (searchParams?.get("permissionLevel") as PermissionLevel) ?? ""
  );

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstMount = useRef(true);

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { router.replace("/login"); return; }
    if (user.role !== "ADMIN") { router.replace("/dashboard"); }
  }, [user, router]);

  // ── Sync filters → URL params ──────────────────────────────────────────────
  const syncUrl = useCallback(
    (overrides?: Partial<{ search: string; status: string; riskTier: string; permissionLevel: string }>) => {
      const params = new URLSearchParams();
      const s      = overrides?.search          ?? search;
      const st     = overrides?.status          ?? status;
      const rt     = overrides?.riskTier        ?? riskTier;
      const pl     = overrides?.permissionLevel ?? permissionLevel;
      if (s.trim())  params.set("search",          s.trim());
      if (st)        params.set("status",          st);
      if (rt)        params.set("riskTier",        rt);
      if (pl)        params.set("permissionLevel", pl);
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [search, status, riskTier, permissionLevel, pathname, router]
  );

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAgents = useCallback(
    async (filters: AgentListFilters) => {
      if (!token) return;
      try {
        setLoading(true);
        setError(null);
        const res = await getAgents(filters);
        setAgents(res.agents);
        setTotal(res.total ?? res.agents.length);
      } catch (err: any) {
        const msg = err.message ?? "Failed to load agents.";
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  // ── Initial load ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    fetchAgents({ search: search || undefined, status: status || undefined, riskTier: riskTier || undefined, permissionLevel: permissionLevel || undefined });
    isFirstMount.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ── Debounced search re-fetch ──────────────────────────────────────────────
  useEffect(() => {
    if (isFirstMount.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      syncUrl({ search });
      fetchAgents({
        search:          search          || undefined,
        status:          status          || undefined,
        riskTier:        riskTier        || undefined,
        permissionLevel: permissionLevel || undefined,
      });
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // ── Immediate re-fetch on dropdown filter change ───────────────────────────
  const applyFilter = useCallback(
    (patch: Partial<AgentListFilters>) => {
      const next = {
        search:          patch.search          ?? search,
        status:          patch.status          ?? status          ?? undefined,
        riskTier:        patch.riskTier        ?? riskTier        ?? undefined,
        permissionLevel: patch.permissionLevel ?? permissionLevel ?? undefined,
      };
      syncUrl({
        search:          next.search ?? "",
        status:          next.status ?? "",
        riskTier:        next.riskTier ?? "",
        permissionLevel: next.permissionLevel ?? "",
      });
      fetchAgents({
        search:          next.search          || undefined,
        status:          next.status          || undefined,
        riskTier:        next.riskTier        || undefined,
        permissionLevel: next.permissionLevel || undefined,
      });
    },
    [search, status, riskTier, permissionLevel, fetchAgents, syncUrl]
  );

  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setRiskTier("");
    setPermissionLevel("");
    router.replace(pathname, { scroll: false });
    fetchAgents({});
  };

  const hasFilters = !!(search || status || riskTier || permissionLevel);

  // ── Guard ──────────────────────────────────────────────────────────────────
  if (!user) return null;

  // ── Error full-page ────────────────────────────────────────────────────────
  if (error && !loading && agents.length === 0) {
    return (
      <ErrorState
        message={error}
        onRetry={() =>
          fetchAgents({
            search: search || undefined,
            status: status || undefined,
            riskTier: riskTier || undefined,
            permissionLevel: permissionLevel || undefined,
          })
        }
      />
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-9 h-9 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center shrink-0">
              <Bot size={18} className="text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Agent Registry
            </h1>
            {!loading && (
              <span className="text-[11px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                {total} agent{total !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1 ml-0.5">
            All registered agents, their effective policies, and governance tiers.
            What you see here reflects live backend state.
          </p>
        </div>

        {/* Register button — only rendered; backend enforces authz on submit */}
        <button
          onClick={() => router.push("/agents/new")}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow-md shrink-0 self-start md:self-auto"
        >
          <PlusCircle size={15} />
          Register Agent
        </button>
      </div>

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search agents…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs font-medium rounded-xl border border-gray-200 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
            />
            {search && (
              <button
                onClick={() => { setSearch(""); applyFilter({ search: "" }); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={13} className="text-gray-400 shrink-0" />

            <SelectPill
              label="Status"
              value={status}
              options={STATUS_OPTIONS}
              onChange={(v) => { setStatus(v); applyFilter({ status: v || undefined }); }}
            />

            <SelectPill
              label="Risk Tier"
              value={riskTier}
              options={RISK_TIER_OPTIONS}
              onChange={(v) => { setRiskTier(v); applyFilter({ riskTier: v || undefined }); }}
            />

            <SelectPill
              label="Permission Level"
              value={permissionLevel}
              options={PERMISSION_LEVEL_OPTIONS}
              onChange={(v) => { setPermissionLevel(v); applyFilter({ permissionLevel: v || undefined }); }}
            />

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-700 px-2.5 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all"
              >
                <X size={11} />
                Clear
              </button>
            )}
          </div>

          {/* Refresh */}
          <button
            onClick={() =>
              fetchAgents({
                search: search || undefined,
                status: status || undefined,
                riskTier: riskTier || undefined,
                permissionLevel: permissionLevel || undefined,
              })
            }
            className="ml-auto p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ── Agent table ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                {["Agent", "Purpose", "Status", "Risk Tier", "Permission Level", ""].map((h) => (
                  <th
                    key={h}
                    className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : agents.length === 0 ? (
                <EmptyState hasFilters={hasFilters} onClear={clearFilters} />
              ) : (
                agents.map((agent) => (
                  <AgentRow
                    key={agent.id}
                    agent={agent}
                    onClick={() => router.push(`/agents/${agent.id}`)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer — row count */}
        {!loading && agents.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50 bg-gray-50/40">
            <p className="text-xs text-gray-400">
              Showing <span className="font-semibold text-gray-600">{agents.length}</span>
              {total > agents.length && (
                <> of <span className="font-semibold text-gray-600">{total}</span></>
              )}{" "}
              agent{agents.length !== 1 ? "s" : ""}
            </p>
            {error && (
              <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
                <AlertCircle size={12} /> Partial data — some results may be missing
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Agent table row ──────────────────────────────────────────────────────────

function AgentRow({ agent, onClick }: { agent: Agent; onClick: () => void }) {
  return (
    <tr
      onClick={onClick}
      className="border-b border-gray-50 hover:bg-blue-50/40 cursor-pointer transition-colors group"
    >
      {/* Name + version */}
      <td className="px-5 py-4 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <Bot size={15} className="text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm leading-tight">
              {agent.name}
            </p>
            {agent.version && (
              <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                v{agent.version}
              </p>
            )}
          </div>
        </div>
      </td>

      {/* Purpose */}
      <td className="px-5 py-4 max-w-[280px]">
        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
          {agent.purpose || <span className="italic text-gray-300">No purpose set</span>}
        </p>
      </td>

      {/* Status */}
      <td className="px-5 py-4 whitespace-nowrap">
        <AgentStatusBadge status={agent.status} />
      </td>

      {/* Risk tier */}
      <td className="px-5 py-4 whitespace-nowrap">
        <RiskTierBadge tier={agent.riskTier} showLabel={false} />
        <span className="ml-1.5 text-xs text-gray-500">
          {agent.riskTier
            ? agent.riskTier.charAt(0) + agent.riskTier.slice(1).toLowerCase()
            : "—"}
        </span>
      </td>

      {/* Permission level */}
      <td className="px-5 py-4 whitespace-nowrap">
        <PermissionLevelBadge level={agent.permissionLevel} variant="compact" />
      </td>

      {/* Row action */}
      <td className="px-5 py-4 text-right whitespace-nowrap">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
          View details <ChevronRight size={13} />
        </span>
      </td>
    </tr>
  );
}
