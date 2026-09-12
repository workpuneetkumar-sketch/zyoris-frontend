"use client";

/**
 * app/(dashboard)/approvals/page.tsx
 * ─────────────────────────────────────────────────────────────
 * ApprovalQueue — lists all agent approval requests with:
 * - Status filter tabs (All / Pending / Approved / Rejected / Expired)
 * - Agent filter dropdown
 * - Debounced search (300ms)
 * - Expiry countdown per pending row
 * - Click-through to ApprovalDetail
 *
 * Non-negotiable: no local approval/rejection. Every row just
 * links to the detail page where the decide call is made.
 * All colors from CSS variable tokens only.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getApprovals } from "@/lib/api/approvalsApi";
import { toast } from "react-toastify";
import {
  ClipboardList,
  Search,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  X,
  Bot,
  Clock,
  Filter,
} from "lucide-react";
import { ApprovalStatusBadge } from "@/components/approvals/ApprovalStatusBadge";
import { RiskTierBadge } from "@/components/agents/RiskTierBadge";
import type { Approval, ApprovalStatus, ApprovalListFilters } from "@/types/approvals";

// ─── Expiry countdown hook ────────────────────────────────────────────────────

function useCountdown(expiresAt?: string): string {
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!expiresAt) return;
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setLabel("Expired"); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setLabel(h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return label;
}

// ─── Status tab constants ─────────────────────────────────────────────────────

const STATUS_TABS: { label: string; value: ApprovalStatus | "" }[] = [
  { label: "All",      value: ""          },
  { label: "Pending",  value: "PENDING"   },
  { label: "Approved", value: "APPROVED"  },
  { label: "Rejected", value: "REJECTED"  },
  { label: "Expired",  value: "EXPIRED"   },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-[color:var(--color-border-light)]">
      {[30, 25, 15, 15, 15].map((w, i) => (
        <td key={i} className="px-5 py-4">
          <div className="h-4 bg-[color:var(--color-background-secondary)] rounded-lg animate-pulse" style={{ width: `${w}%` }} />
        </td>
      ))}
    </tr>
  );
}

function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <tr>
      <td colSpan={6}>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-[color:var(--color-background-secondary)] rounded-2xl flex items-center justify-center mb-4">
            <ClipboardList size={28} className="text-[color:var(--color-text-muted)]" />
          </div>
          <p className="text-sm font-semibold text-[color:var(--color-text)] mb-1">
            {hasFilters ? "No approvals match your filters" : "No approval requests yet"}
          </p>
          <p className="text-xs text-[color:var(--color-text-muted)] max-w-xs">
            {hasFilters ? "Try clearing the filters." : "Agent approval requests will appear here when they are raised."}
          </p>
          {hasFilters && (
            <button onClick={onClear} className="mt-4 text-xs font-semibold text-[color:var(--color-primary)] hover:underline">
              Clear filters
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
      <AlertCircle size={48} className="text-[color:var(--color-error)] mb-4" />
      <h3 className="text-lg font-bold text-[color:var(--color-text)] mb-2">Failed to Load Approvals</h3>
      <p className="text-sm text-[color:var(--color-text-secondary)] max-w-md mb-6">{message}</p>
      <button onClick={onRetry} className="inline-flex items-center gap-2 px-4 py-2 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] text-[color:var(--color-primary-foreground)] text-sm font-semibold rounded-xl transition-all">
        <RefreshCw size={14} /> Retry
      </button>
    </div>
  );
}

// ─── Approval row with live countdown ─────────────────────────────────────────

function ApprovalRow({ approval, onClick }: { approval: Approval; onClick: () => void }) {
  const countdown = useCountdown(
    approval.status === "PENDING" ? approval.expiresAt : undefined
  );
  const requestedAgo = (() => {
    try {
      const diff = Date.now() - new Date(approval.requestedAt).getTime();
      const m = Math.floor(diff / 60_000);
      const h = Math.floor(m / 60);
      const d = Math.floor(h / 24);
      if (d > 0) return `${d}d ago`;
      if (h > 0) return `${h}h ago`;
      if (m > 0) return `${m}m ago`;
      return "Just now";
    } catch { return ""; }
  })();

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
          <span className="text-sm font-medium text-[color:var(--color-text)]">
            {approval.agentName || approval.agentId}
          </span>
        </div>
      </td>

      {/* Tool / Action */}
      <td className="px-5 py-4 max-w-[240px]">
        <p className="text-sm font-medium text-[color:var(--color-text)] truncate">
          {approval.toolDisplayName || approval.toolName}
        </p>
        <p className="text-xs text-[color:var(--color-text-muted)] truncate mt-0.5">
          {approval.actionSummary}
        </p>
      </td>

      {/* Risk tier */}
      <td className="px-5 py-4 whitespace-nowrap">
        <RiskTierBadge tier={approval.riskTier} showLabel />
      </td>

      {/* Status */}
      <td className="px-5 py-4 whitespace-nowrap">
        <ApprovalStatusBadge status={approval.status} />
      </td>

      {/* Requested at + expiry */}
      <td className="px-5 py-4 whitespace-nowrap">
        <p className="text-xs text-[color:var(--color-text-secondary)] font-medium">{requestedAgo}</p>
        {approval.status === "PENDING" && countdown && (
          <p className={`text-[10px] font-semibold mt-0.5 flex items-center gap-1 ${countdown === "Expired" ? "text-[color:var(--color-error)]" : "text-[color:var(--color-warning-foreground)]"}`}>
            <Clock size={10} />
            {countdown === "Expired" ? "Expired" : `Expires in ${countdown}`}
          </p>
        )}
        {(approval.status === "APPROVED" || approval.status === "REJECTED") && approval.decidedAt && (
          <p className="text-[10px] text-[color:var(--color-text-muted)] mt-0.5">
            Decided {new Date(approval.decidedAt).toLocaleDateString()}
          </p>
        )}
      </td>

      {/* Row action */}
      <td className="px-5 py-4 text-right whitespace-nowrap">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--color-primary)] opacity-0 group-hover:opacity-100 transition-opacity">
          {approval.status === "PENDING" ? "Review" : "View"} <ChevronRight size={13} />
        </span>
      </td>
    </tr>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ApprovalQueuePage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathnameRaw = usePathname();
  const pathname = pathnameRaw ?? "/approvals";

  const [approvals, setApprovals]   = useState<Approval[]>([]);
  const [total, setTotal]           = useState(0);
  const [pendingCount, setPending]  = useState(0);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  const [activeStatus, setActiveStatus] = useState<ApprovalStatus | "">((searchParams?.get("status") as ApprovalStatus) ?? "");
  const [agentId, setAgentId]           = useState(searchParams?.get("agentId") ?? "");
  const [search, setSearch]             = useState(searchParams?.get("search") ?? "");

  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstMount = useRef(true);

  // Auth guard
  useEffect(() => {
    if (!user) { router.replace("/login"); return; }
    if (user.role !== "ADMIN") router.replace("/dashboard");
  }, [user, router]);

  const syncUrl = useCallback((overrides?: Partial<Record<string, string>>) => {
    const params = new URLSearchParams();
    const st = overrides?.status  ?? activeStatus;
    const ag = overrides?.agentId ?? agentId;
    const s  = overrides?.search  ?? search;
    if (st) params.set("status",  st);
    if (ag) params.set("agentId", ag);
    if (s.trim()) params.set("search", s.trim());
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [activeStatus, agentId, search, pathname, router]);

  const fetchApprovals = useCallback(async (filters: ApprovalListFilters) => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await getApprovals(filters);
      setApprovals(res.approvals);
      setTotal(res.total ?? res.approvals.length);
      setPending(res.pendingCount ?? res.approvals.filter((a) => a.status === "PENDING").length);
    } catch (err: any) {
      const msg = err.message ?? "Failed to load approvals.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchApprovals({ status: activeStatus || undefined, agentId: agentId || undefined, search: search || undefined });
    isFirstMount.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Debounced search
  useEffect(() => {
    if (isFirstMount.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      syncUrl({ search });
      fetchApprovals({ status: activeStatus || undefined, agentId: agentId || undefined, search: search || undefined });
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const switchTab = (s: ApprovalStatus | "") => {
    setActiveStatus(s);
    syncUrl({ status: s });
    fetchApprovals({ status: s || undefined, agentId: agentId || undefined, search: search || undefined });
  };

  const clearAll = () => {
    setActiveStatus(""); setAgentId(""); setSearch("");
    router.replace(pathname, { scroll: false });
    fetchApprovals({});
  };

  const hasFilters = !!(activeStatus || agentId || search);

  if (!user) return null;
  if (error && !loading && approvals.length === 0) {
    return <ErrorBanner message={error} onRetry={() => fetchApprovals({ status: activeStatus || undefined, agentId: agentId || undefined, search: search || undefined })} />;
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-9 h-9 bg-[color:var(--color-warning-light)] border border-[color:var(--color-warning-light)] rounded-xl flex items-center justify-center shrink-0">
              <ClipboardList size={18} className="text-[color:var(--color-warning-foreground)]" />
            </div>
            <h1 className="text-2xl font-bold text-[color:var(--color-text)] tracking-tight">Approval Queue</h1>
            {pendingCount > 0 && (
              <span className="text-[11px] font-bold bg-[color:var(--color-warning-light)] text-[color:var(--color-warning-foreground)] px-2 py-0.5 rounded-full border border-[color:var(--color-warning-light)]">
                {pendingCount} pending
              </span>
            )}
          </div>
          <p className="text-sm text-[color:var(--color-text-secondary)] mt-1 ml-0.5">
            Agent action requests awaiting approval or already decided.
          </p>
        </div>
        <button
          onClick={() => fetchApprovals({ status: activeStatus || undefined, agentId: agentId || undefined, search: search || undefined })}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[color:var(--color-surface)] border border-[color:var(--color-border)] hover:bg-[color:var(--color-surface-hover)] text-[color:var(--color-text-secondary)] text-sm font-semibold rounded-xl transition-all shrink-0 self-start md:self-auto"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Status tabs */}
      <div className="bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-border)] shadow-sm p-4 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => switchTab(tab.value)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                activeStatus === tab.value
                  ? "bg-[color:var(--color-primary)] text-[color:var(--color-primary-foreground)] border-[color:var(--color-primary)]"
                  : "bg-[color:var(--color-surface)] text-[color:var(--color-text-secondary)] border-[color:var(--color-border)] hover:bg-[color:var(--color-surface-hover)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search + agent filter row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-text-muted)] pointer-events-none" />
            <input
              type="text"
              placeholder="Search by action, tool…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs font-medium rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] focus:border-[color:var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-info-light)] transition-all"
            />
            {search && (
              <button onClick={() => { setSearch(""); fetchApprovals({ status: activeStatus || undefined, agentId: agentId || undefined }); }} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <X size={12} className="text-[color:var(--color-text-muted)]" />
              </button>
            )}
          </div>

          {/* Agent filter — freeform text for now since agent list requires another call */}
          <div className="relative">
            <Filter size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[color:var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="Filter by agent ID…"
              value={agentId}
              onChange={(e) => {
                const v = e.target.value;
                setAgentId(v);
                syncUrl({ agentId: v });
                fetchApprovals({ status: activeStatus || undefined, agentId: v || undefined, search: search || undefined });
              }}
              className={`pl-7 pr-3 py-1.5 rounded-xl border text-xs font-semibold bg-[color:var(--color-surface)] text-[color:var(--color-text)] focus:outline-none transition-all ${
                agentId ? "border-[color:var(--color-primary)]" : "border-[color:var(--color-border)]"
              }`}
            />
          </div>

          {hasFilters && (
            <button onClick={clearAll} className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text)] px-2.5 py-1.5 rounded-xl border border-[color:var(--color-border)] hover:bg-[color:var(--color-surface-hover)] transition-all">
              <X size={11} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Queue table */}
      <div className="bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-border)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--color-border)] bg-[color:var(--color-surface-active)]">
                {["Agent", "Tool / Action", "Risk", "Status", "Requested", ""].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold text-[color:var(--color-text-muted)] uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                : approvals.length === 0
                  ? <EmptyState hasFilters={hasFilters} onClear={clearAll} />
                  : approvals.map((a) => (
                      <ApprovalRow key={a.id} approval={a} onClick={() => router.push(`/approvals/${a.id}`)} />
                    ))
              }
            </tbody>
          </table>
        </div>
        {!loading && approvals.length > 0 && (
          <div className="px-5 py-3 border-t border-[color:var(--color-border-light)] bg-[color:var(--color-surface-active)]">
            <p className="text-xs text-[color:var(--color-text-muted)]">
              Showing <span className="font-semibold text-[color:var(--color-text-secondary)]">{approvals.length}</span>
              {total > approvals.length && <> of <span className="font-semibold text-[color:var(--color-text-secondary)]">{total}</span></>} request{approvals.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
