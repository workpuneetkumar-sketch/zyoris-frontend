"use client";

/**
 * app/(dashboard)/executions/page.tsx
 * ─────────────────────────────────────────────────────────────
 * ExecutionList — paginated execution ledger with filters.
 *
 * Filters: agentId, status, initiatorType — all synced to URL
 * query params. Pagination via limit/offset buttons.
 * All colors from CSS variable tokens only.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getExecutions } from "@/lib/api/executionsApi";
import { toast } from "react-toastify";
import {
  ScrollText,
  Search,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  X,
  Filter,
  SlidersHorizontal,
  Bot,
  ChevronLeft,
} from "lucide-react";
import { ExecutionStatusBadge } from "@/components/executions/ExecutionStatusBadge";
import type {
  Execution,
  ExecutionStatus,
  InitiatorType,
  ExecutionListFilters,
} from "@/types/executions";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const STATUS_OPTIONS: { label: string; value: ExecutionStatus }[] = [
  { label: "Completed",         value: "COMPLETED"         },
  { label: "Running",           value: "RUNNING"           },
  { label: "Failed",            value: "FAILED"            },
  { label: "Pending",           value: "PENDING"           },
  { label: "Approval Required", value: "APPROVAL_REQUIRED" },
  { label: "Cancelled",         value: "CANCELLED"         },
];

const INITIATOR_OPTIONS: { label: string; value: InitiatorType }[] = [
  { label: "User",     value: "USER"     },
  { label: "Schedule", value: "SCHEDULE" },
  { label: "Webhook",  value: "WEBHOOK"  },
  { label: "Agent",    value: "AGENT"    },
  { label: "System",   value: "SYSTEM"   },
];

// ─── Helper: relative time ────────────────────────────────────────────────────

function relativeTime(iso?: string): string {
  if (!iso) return "—";
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const s = Math.floor(diff / 1_000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d > 0) return `${d}d ago`;
    if (h > 0) return `${h}h ago`;
    if (m > 0) return `${m}m ago`;
    return "Just now";
  } catch { return "—"; }
}

function formatDuration(ms?: number): string {
  if (ms == null) return "—";
  if (ms < 1_000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1_000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1_000)}s`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-[color:var(--color-border-light)]">
      {[30, 35, 15, 15, 15, 10].map((w, i) => (
        <td key={i} className="px-5 py-4">
          <div
            className="h-4 bg-[color:var(--color-background-secondary)] rounded-lg animate-pulse"
            style={{ width: `${w}%` }}
          />
        </td>
      ))}
    </tr>
  );
}

function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <tr>
      <td colSpan={7}>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-[color:var(--color-background-secondary)] rounded-2xl flex items-center justify-center mb-4">
            <ScrollText size={28} className="text-[color:var(--color-text-muted)]" />
          </div>
          <p className="text-sm font-semibold text-[color:var(--color-text)] mb-1">
            {hasFilters ? "No executions match your filters" : "No executions recorded yet"}
          </p>
          <p className="text-xs text-[color:var(--color-text-muted)] max-w-xs">
            {hasFilters
              ? "Try adjusting or clearing the filters."
              : "Agent executions will appear here once agents start running."}
          </p>
          {hasFilters && (
            <button
              onClick={onClear}
              className="mt-4 text-xs font-semibold text-[color:var(--color-primary)] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
      <AlertCircle size={48} className="text-[color:var(--color-error)] mb-4" />
      <h3 className="text-lg font-bold text-[color:var(--color-text)] mb-2">
        Failed to Load Executions
      </h3>
      <p className="text-sm text-[color:var(--color-text-secondary)] max-w-md mb-6">{message}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-4 py-2 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] text-[color:var(--color-primary-foreground)] text-sm font-semibold rounded-xl transition-all"
      >
        <RefreshCw size={14} /> Retry
      </button>
    </div>
  );
}

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
        className={`appearance-none pl-3 pr-7 py-1.5 rounded-xl border text-xs font-semibold bg-[color:var(--color-surface)] cursor-pointer transition-all outline-none ${
          value
            ? "border-[color:var(--color-primary)] text-[color:var(--color-primary)]"
            : "border-[color:var(--color-border)] text-[color:var(--color-text-secondary)]"
        }`}
      >
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <SlidersHorizontal
        size={11}
        className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[color:var(--color-text-muted)]"
      />
    </div>
  );
}

// ─── Execution row ────────────────────────────────────────────────────────────

function ExecutionRow({ execution, onClick }: { execution: Execution; onClick: () => void }) {
  return (
    <tr
      onClick={onClick}
      className="border-b border-[color:var(--color-border-light)] hover:bg-[color:var(--color-surface-hover)] cursor-pointer transition-colors group"
    >
      {/* Agent */}
      <td className="px-5 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[color:var(--color-info-light)] flex items-center justify-center shrink-0">
            <Bot size={13} className="text-[color:var(--color-info)]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[color:var(--color-text)]">
              {execution.agentName || execution.agentId}
            </p>
            {execution.agentName && (
              <p className="text-[10px] font-mono text-[color:var(--color-text-muted)]">
                {execution.agentId}
              </p>
            )}
          </div>
        </div>
      </td>

      {/* Plan */}
      <td className="px-5 py-4 max-w-[260px]">
        <p className="text-xs text-[color:var(--color-text-secondary)] line-clamp-2 leading-relaxed">
          {execution.plan || <span className="italic text-[color:var(--color-text-muted)]">No plan recorded</span>}
        </p>
      </td>

      {/* Status */}
      <td className="px-5 py-4 whitespace-nowrap">
        <ExecutionStatusBadge status={execution.status} />
      </td>

      {/* Initiator */}
      <td className="px-5 py-4 whitespace-nowrap">
        <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-[color:var(--color-background-secondary)] text-[color:var(--color-text-secondary)] border border-[color:var(--color-border)]">
          {execution.initiatorType}
        </span>
      </td>

      {/* Model */}
      <td className="px-5 py-4 whitespace-nowrap">
        {execution.modelUsed ? (
          <div>
            <p className="text-xs font-mono text-[color:var(--color-text-secondary)]">
              {execution.modelUsed}
            </p>
            {execution.modelVersion && (
              <p className="text-[10px] text-[color:var(--color-text-muted)]">
                v{execution.modelVersion}
              </p>
            )}
          </div>
        ) : (
          <span className="text-xs text-[color:var(--color-text-muted)]">—</span>
        )}
      </td>

      {/* Started / duration */}
      <td className="px-5 py-4 whitespace-nowrap">
        <p className="text-xs text-[color:var(--color-text-secondary)] font-medium">
          {relativeTime(execution.startedAt)}
        </p>
        {execution.durationMs != null && (
          <p className="text-[10px] text-[color:var(--color-text-muted)] mt-0.5">
            {formatDuration(execution.durationMs)}
          </p>
        )}
      </td>

      {/* Row action */}
      <td className="px-5 py-4 text-right whitespace-nowrap">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--color-primary)] opacity-0 group-hover:opacity-100 transition-opacity">
          Inspect <ChevronRight size={13} />
        </span>
      </td>
    </tr>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ExecutionListPage() {
  const { user, token, isInitializing } = useAuth();
  const router      = useRouter();
  const searchParams = useSearchParams();
  const pathnameRaw  = usePathname();
  const pathname     = pathnameRaw ?? "/executions";

  const [executions, setExecutions] = useState<Execution[]>([]);
  const [total, setTotal]           = useState(0);
  const [offset, setOffset]         = useState(0);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  const [agentId,       setAgentId]       = useState(searchParams?.get("agentId") ?? "");
  const [status,        setStatus]        = useState<ExecutionStatus | "">((searchParams?.get("status") as ExecutionStatus) ?? "");
  const [initiatorType, setInitiatorType] = useState<InitiatorType | "">((searchParams?.get("initiatorType") as InitiatorType) ?? "");

  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstMount = useRef(true);

  // Auth guard — wait for initialisation
  useEffect(() => {
    if (isInitializing) return;
    if (!user) { router.replace("/login"); return; }
    if (user.role !== "ADMIN") router.replace("/dashboard");
  }, [user, isInitializing, router]);

  const syncUrl = useCallback((overrides?: Partial<Record<string, string>>) => {
    const params = new URLSearchParams();
    const ag  = overrides?.agentId       ?? agentId;
    const st  = overrides?.status        ?? status;
    const ini = overrides?.initiatorType ?? initiatorType;
    if (ag.trim()) params.set("agentId",       ag.trim());
    if (st)        params.set("status",        st);
    if (ini)       params.set("initiatorType", ini);
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [agentId, status, initiatorType, pathname, router]);

  const fetchExecutions = useCallback(async (filters: ExecutionListFilters) => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await getExecutions(filters);
      setExecutions(res.executions);
      setTotal(res.total);
      setOffset(res.offset);
    } catch (err: any) {
      const msg = err.message ?? "Failed to load executions.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Initial load
  useEffect(() => {
    if (!token) return;
    fetchExecutions({
      agentId:       agentId       || undefined,
      status:        status        || undefined,
      initiatorType: initiatorType || undefined,
      limit: PAGE_SIZE, offset: 0,
    });
    isFirstMount.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Debounced agent ID filter
  useEffect(() => {
    if (isFirstMount.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      syncUrl({ agentId });
      fetchExecutions({ agentId: agentId || undefined, status: status || undefined, initiatorType: initiatorType || undefined, limit: PAGE_SIZE, offset: 0 });
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  const applyFilter = useCallback((patch: Partial<ExecutionListFilters>) => {
    const next: ExecutionListFilters = {
      agentId:       (patch.agentId       ?? agentId)       || undefined,
      status:        (patch.status        ?? status)        || undefined,
      initiatorType: (patch.initiatorType ?? initiatorType) || undefined,
      limit: PAGE_SIZE, offset: 0,
    };
    syncUrl({
      agentId:       next.agentId       ?? "",
      status:        next.status        ?? "",
      initiatorType: next.initiatorType ?? "",
    });
    fetchExecutions(next);
  }, [agentId, status, initiatorType, fetchExecutions, syncUrl]);

  const goToPage = (newOffset: number) => {
    setOffset(newOffset);
    fetchExecutions({
      agentId:       agentId       || undefined,
      status:        status        || undefined,
      initiatorType: initiatorType || undefined,
      limit: PAGE_SIZE, offset: newOffset,
    });
  };

  const clearAll = () => {
    setAgentId(""); setStatus(""); setInitiatorType("");
    router.replace(pathname, { scroll: false });
    fetchExecutions({ limit: PAGE_SIZE, offset: 0 });
  };

  const hasFilters = !!(agentId || status || initiatorType);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  if (!user) return null;
  if (error && !loading && executions.length === 0) {
    return (
      <ErrorState
        message={error}
        onRetry={() => fetchExecutions({ agentId: agentId || undefined, status: status || undefined, initiatorType: initiatorType || undefined, limit: PAGE_SIZE, offset })}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-9 h-9 bg-[color:var(--color-info-light)] border border-[color:var(--color-info-light)] rounded-xl flex items-center justify-center shrink-0">
              <ScrollText size={18} className="text-[color:var(--color-info)]" />
            </div>
            <h1 className="text-2xl font-bold text-[color:var(--color-text)] tracking-tight">
              Execution Ledger
            </h1>
            {!loading && (
              <span className="text-[11px] font-bold text-[color:var(--color-text-muted)] bg-[color:var(--color-background-secondary)] px-2 py-0.5 rounded-full border border-[color:var(--color-border)]">
                {total} execution{total !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <p className="text-sm text-[color:var(--color-text-secondary)] mt-1 ml-0.5">
            Full audit trail of every agent execution — plan, tool calls, outputs, errors, and approvals.
          </p>
        </div>
        <button
          onClick={() => fetchExecutions({ agentId: agentId || undefined, status: status || undefined, initiatorType: initiatorType || undefined, limit: PAGE_SIZE, offset })}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[color:var(--color-surface)] border border-[color:var(--color-border)] hover:bg-[color:var(--color-surface-hover)] text-[color:var(--color-text-secondary)] text-sm font-semibold rounded-xl transition-all shrink-0 self-start md:self-auto"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-border)] shadow-sm px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Agent search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-text-muted)] pointer-events-none" />
            <input
              type="text"
              placeholder="Filter by agent ID or name…"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs font-medium rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] focus:border-[color:var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-info-light)] transition-all"
            />
            {agentId && (
              <button onClick={() => { setAgentId(""); applyFilter({ agentId: undefined }); }} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <X size={12} className="text-[color:var(--color-text-muted)]" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={13} className="text-[color:var(--color-text-muted)] shrink-0" />
            <SelectPill
              label="Status"
              value={status}
              options={STATUS_OPTIONS}
              onChange={(v) => { setStatus(v); applyFilter({ status: v || undefined }); }}
            />
            <SelectPill
              label="Initiator"
              value={initiatorType}
              options={INITIATOR_OPTIONS}
              onChange={(v) => { setInitiatorType(v); applyFilter({ initiatorType: v || undefined }); }}
            />
            {hasFilters && (
              <button
                onClick={clearAll}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text)] px-2.5 py-1.5 rounded-xl border border-[color:var(--color-border)] hover:bg-[color:var(--color-surface-hover)] transition-all"
              >
                <X size={11} /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-border)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--color-border)] bg-[color:var(--color-surface-active)]">
                {["Agent", "Plan", "Status", "Initiator", "Model", "Started", ""].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold text-[color:var(--color-text-muted)] uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                : executions.length === 0
                  ? <EmptyState hasFilters={hasFilters} onClear={clearAll} />
                  : executions.map((e) => (
                      <ExecutionRow
                        key={e.id}
                        execution={e}
                        onClick={() => router.push(`/executions/${e.id}`)}
                      />
                    ))
              }
            </tbody>
          </table>
        </div>

        {/* Footer: count + pagination */}
        {!loading && executions.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[color:var(--color-border-light)] bg-[color:var(--color-surface-active)]">
            <p className="text-xs text-[color:var(--color-text-muted)]">
              Page{" "}
              <span className="font-semibold text-[color:var(--color-text-secondary)]">
                {currentPage}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-[color:var(--color-text-secondary)]">
                {totalPages || 1}
              </span>
              {" — "}
              <span className="font-semibold text-[color:var(--color-text-secondary)]">{total}</span> total
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={offset === 0}
                onClick={() => goToPage(Math.max(0, offset - PAGE_SIZE))}
                className="p-1.5 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] hover:bg-[color:var(--color-surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={14} className="text-[color:var(--color-text-secondary)]" />
              </button>
              <button
                disabled={offset + PAGE_SIZE >= total}
                onClick={() => goToPage(offset + PAGE_SIZE)}
                className="p-1.5 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] hover:bg-[color:var(--color-surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={14} className="text-[color:var(--color-text-secondary)]" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
