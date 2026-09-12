"use client";

/**
 * app/(dashboard)/tools/page.tsx
 * ─────────────────────────────────────────────────────────────
 * ToolRegistry — lists all registered tools with category,
 * risk tier, default policy summary, and a "Configure" link
 * that opens the ToolPermissionMatrix for that tool.
 *
 * Filters: search (debounced 300ms), category, riskTier —
 * all bound to URL query params so bookmarks/refresh work.
 *
 * Never derives or enforces permissions client-side.
 * All colors from CSS variable tokens — no hardcoded hex/rgb.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getTools } from "@/lib/api/toolsApi";
import { toast } from "react-toastify";
import {
  Wrench,
  Search,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  SlidersHorizontal,
  Filter,
  X,
  Settings2,
} from "lucide-react";
import { ToolCategoryBadge } from "@/components/tools/ToolCategoryBadge";
import { RiskTierBadge } from "@/components/agents/RiskTierBadge";
import { PermissionLevelBadge } from "@/components/agents/PermissionLevelBadge";
import type { Tool, ToolCategory, ToolListFilters } from "@/types/tools";
import type { RiskTier } from "@/types/agents";

// ─── Filter option sets ───────────────────────────────────────────────────────

const CATEGORY_OPTIONS: { label: string; value: ToolCategory }[] = [
  { label: "CRM",           value: "CRM"           },
  { label: "Communication", value: "COMMUNICATION"  },
  { label: "Finance",       value: "FINANCE"        },
  { label: "HR",            value: "HR"             },
  { label: "Analytics",     value: "ANALYTICS"      },
  { label: "Automation",    value: "AUTOMATION"     },
  { label: "Integration",   value: "INTEGRATION"    },
  { label: "Search",        value: "SEARCH"         },
  { label: "Storage",       value: "STORAGE"        },
  { label: "Notification",  value: "NOTIFICATION"   },
];

const RISK_TIER_OPTIONS: { label: string; value: RiskTier }[] = [
  { label: "Low",      value: "LOW"      },
  { label: "Medium",   value: "MEDIUM"   },
  { label: "High",     value: "HIGH"     },
  { label: "Critical", value: "CRITICAL" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-[color:var(--color-border-light)]">
      {[35, 20, 15, 30, 10].map((w, i) => (
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
      <td colSpan={5}>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-[color:var(--color-background-secondary)] rounded-2xl flex items-center justify-center mb-4">
            <Wrench size={28} className="text-[color:var(--color-text-muted)]" />
          </div>
          <p className="text-sm font-semibold text-[color:var(--color-text)] mb-1">
            {hasFilters ? "No tools match your filters" : "No tools registered yet"}
          </p>
          <p className="text-xs text-[color:var(--color-text-muted)] max-w-xs">
            {hasFilters ? "Try adjusting your search or clearing the filters." : "Tools will appear here once registered in the backend."}
          </p>
          {hasFilters && (
            <button onClick={onClear} className="mt-4 text-xs font-semibold text-[color:var(--color-primary)] hover:underline">
              Clear all filters
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
      <h3 className="text-lg font-bold text-[color:var(--color-text)] mb-2">Failed to Load Tools</h3>
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
            : "border-[color:var(--color-border)] text-[color:var(--color-text-secondary)] hover:border-[color:var(--color-border)]"
        }`}
      >
        <option value="">{label}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <SlidersHorizontal size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[color:var(--color-text-muted)]" />
    </div>
  );
}

// ─── Tool row ─────────────────────────────────────────────────────────────────

function ToolRow({ tool, onClick }: { tool: Tool; onClick: () => void }) {
  return (
    <tr
      onClick={onClick}
      className="border-b border-[color:var(--color-border-light)] hover:bg-[color:var(--color-surface-hover)] cursor-pointer transition-colors group"
    >
      {/* Name */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[color:var(--color-background-secondary)] border border-[color:var(--color-border)] flex items-center justify-center shrink-0">
            <Wrench size={14} className="text-[color:var(--color-text-muted)]" />
          </div>
          <div>
            <p className="font-semibold text-sm text-[color:var(--color-text)] leading-tight">
              {tool.displayName || tool.name}
            </p>
            <p className="text-[10px] font-mono text-[color:var(--color-text-muted)] mt-0.5">{tool.name}</p>
          </div>
        </div>
      </td>

      {/* Category */}
      <td className="px-5 py-4 whitespace-nowrap">
        <ToolCategoryBadge category={tool.category} />
      </td>

      {/* Risk tier */}
      <td className="px-5 py-4 whitespace-nowrap">
        <RiskTierBadge tier={tool.riskTier} showLabel />
      </td>

      {/* Default policy summary */}
      <td className="px-5 py-4">
        {tool.defaultPolicy ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <PermissionLevelBadge level={tool.defaultPolicy.permissionLevel} variant="compact" />
            {tool.defaultPolicy.requireApproval && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-[color:var(--color-warning-light)] text-[color:var(--color-warning-foreground)] border-[color:var(--color-warning-light)]">
                Approval required
              </span>
            )}
            {tool.defaultPolicy.maxDailyExecutions != null && (
              <span className="text-[10px] text-[color:var(--color-text-muted)] font-medium">
                {tool.defaultPolicy.maxDailyExecutions}/day max
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs italic text-[color:var(--color-text-muted)]">No default policy</span>
        )}
      </td>

      {/* Configure action */}
      <td className="px-5 py-4 text-right whitespace-nowrap">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--color-primary)] opacity-0 group-hover:opacity-100 transition-opacity">
          <Settings2 size={13} /> Configure <ChevronRight size={13} />
        </span>
      </td>
    </tr>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ToolRegistryPage() {
  const { user, token, isInitializing } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathnameRaw = usePathname();
  const pathname = pathnameRaw ?? "/tools";

  const [tools, setTools]       = useState<Tool[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const [search, setSearch]             = useState(searchParams?.get("search") ?? "");
  const [category, setCategory]         = useState<ToolCategory | "">((searchParams?.get("category") as ToolCategory) ?? "");
  const [riskTier, setRiskTier]         = useState<RiskTier | "">((searchParams?.get("riskTier") as RiskTier) ?? "");

  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstMount = useRef(true);

  // Auth guard — wait for initialisation before checking role
  useEffect(() => {
    if (isInitializing) return;
    if (!user) { router.replace("/login"); return; }
    if (user.role !== "ADMIN") router.replace("/dashboard");
  }, [user, isInitializing, router]);

  // Sync filters → URL
  const syncUrl = useCallback((overrides?: Partial<Record<string, string>>) => {
    const params = new URLSearchParams();
    const s  = overrides?.search   ?? search;
    const c  = overrides?.category ?? category;
    const rt = overrides?.riskTier ?? riskTier;
    if (s.trim()) params.set("search",   s.trim());
    if (c)        params.set("category", c);
    if (rt)       params.set("riskTier", rt);
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [search, category, riskTier, pathname, router]);

  const fetchTools = useCallback(async (filters: ToolListFilters) => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await getTools(filters);
      setTools(res.tools);
      setTotal(res.total ?? res.tools.length);
    } catch (err: any) {
      const msg = err.message ?? "Failed to load tools.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Initial load
  useEffect(() => {
    if (!token) return;
    fetchTools({ search: search || undefined, category: category || undefined, riskTier: riskTier || undefined });
    isFirstMount.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Debounced search
  useEffect(() => {
    if (isFirstMount.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      syncUrl({ search });
      fetchTools({ search: search || undefined, category: category || undefined, riskTier: riskTier || undefined });
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const applyFilter = useCallback((patch: Partial<ToolListFilters>) => {
    const next = {
      search:   patch.search   ?? search,
      category: (patch.category  ?? category)  || undefined,
      riskTier: (patch.riskTier  ?? riskTier)  || undefined,
    };
    syncUrl({ search: next.search ?? "", category: next.category ?? "", riskTier: next.riskTier ?? "" });
    fetchTools(next);
  }, [search, category, riskTier, fetchTools, syncUrl]);

  const clearFilters = () => {
    setSearch(""); setCategory(""); setRiskTier("");
    router.replace(pathname, { scroll: false });
    fetchTools({});
  };

  const hasFilters = !!(search || category || riskTier);

  if (!user) return null;

  if (error && !loading && tools.length === 0) {
    return <ErrorState message={error} onRetry={() => fetchTools({ search: search || undefined, category: category || undefined, riskTier: riskTier || undefined })} />;
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-9 h-9 bg-[color:var(--color-info-light)] border border-[color:var(--color-info-light)] rounded-xl flex items-center justify-center shrink-0">
              <Wrench size={18} className="text-[color:var(--color-info)]" />
            </div>
            <h1 className="text-2xl font-bold text-[color:var(--color-text)] tracking-tight">Tool Registry</h1>
            {!loading && (
              <span className="text-[11px] font-bold text-[color:var(--color-text-muted)] bg-[color:var(--color-background-secondary)] px-2 py-0.5 rounded-full border border-[color:var(--color-border)]">
                {total} tool{total !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <p className="text-sm text-[color:var(--color-text-secondary)] mt-1 ml-0.5">
            All registered tools, their categories, risk tiers, and default policies.
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-border)] shadow-sm px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-text-muted)] pointer-events-none" />
            <input
              type="text"
              placeholder="Search tools…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs font-medium rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] focus:border-[color:var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-info-light)] transition-all"
            />
            {search && (
              <button onClick={() => { setSearch(""); applyFilter({ search: "" }); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]">
                <X size={12} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={13} className="text-[color:var(--color-text-muted)] shrink-0" />
            <SelectPill
              label="Category" value={category} options={CATEGORY_OPTIONS}
              onChange={(v) => { setCategory(v); applyFilter({ category: v || undefined }); }}
            />
            <SelectPill
              label="Risk Tier" value={riskTier} options={RISK_TIER_OPTIONS}
              onChange={(v) => { setRiskTier(v); applyFilter({ riskTier: v || undefined }); }}
            />
            {hasFilters && (
              <button onClick={clearFilters} className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text)] px-2.5 py-1.5 rounded-xl border border-[color:var(--color-border)] hover:bg-[color:var(--color-surface-hover)] transition-all">
                <X size={11} /> Clear
              </button>
            )}
          </div>
          <button
            onClick={() => fetchTools({ search: search || undefined, category: category || undefined, riskTier: riskTier || undefined })}
            className="ml-auto p-1.5 text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] hover:bg-[color:var(--color-surface-hover)] rounded-lg transition-all"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-border)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--color-border)] bg-[color:var(--color-surface-active)]">
                {["Tool", "Category", "Risk Tier", "Default Policy", ""].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold text-[color:var(--color-text-muted)] uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                : tools.length === 0
                  ? <EmptyState hasFilters={hasFilters} onClear={clearFilters} />
                  : tools.map((tool) => (
                      <ToolRow
                        key={tool.name}
                        tool={tool}
                        onClick={() => router.push(`/tools/${encodeURIComponent(tool.name)}/policy`)}
                      />
                    ))
              }
            </tbody>
          </table>
        </div>
        {!loading && tools.length > 0 && (
          <div className="flex items-center px-5 py-3 border-t border-[color:var(--color-border-light)] bg-[color:var(--color-surface-active)]">
            <p className="text-xs text-[color:var(--color-text-muted)]">
              Showing <span className="font-semibold text-[color:var(--color-text-secondary)]">{tools.length}</span>
              {total > tools.length && <> of <span className="font-semibold text-[color:var(--color-text-secondary)]">{total}</span></>}
              {" "}tool{tools.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
