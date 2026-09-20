"use client";

/**
 * app/(dashboard)/data-quality/page.tsx
 * ─────────────────────────────────────────────────────────────
 * W3 — Data Quality UI — List page
 *
 * Filters (type/object/severity/status) are synced to URL params.
 * Row click navigates to the drill-down detail page.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  getDataQualityIssues,
} from "@/lib/api/dataQualityApi";
import {
  DataQualityIssueTable,
  DataQualityFilterBar,
} from "@/components/dataquality/DataQualityIssueTable";
import { toast } from "react-toastify";
import {
  ShieldAlert,
  RefreshCw,
  AlertCircle,
  Search,
  X,
} from "lucide-react";
import type {
  DataQualityIssue,
  DataQualityListFilters,
} from "@/lib/types/agent-results";

export default function DataQualityPage() {
  const { user, token } = useAuth();
  const router         = useRouter();
  const searchParams   = useSearchParams();
  const pathnameRaw    = usePathname();
  const pathname       = pathnameRaw ?? "/data-quality";

  const [issues, setIssues]       = useState<DataQualityIssue[]>([]);
  const [totalCount, setTotal]    = useState(0);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  // Filters — initialised from URL
  const [filters, setFilters] = useState<DataQualityListFilters>({
    issueType:  (searchParams?.get("issueType")  as any) ?? undefined,
    objectType: (searchParams?.get("objectType") as any) ?? undefined,
    severity:   (searchParams?.get("severity")   as any) ?? undefined,
    status:     (searchParams?.get("status")     as any) ?? undefined,
    search:     searchParams?.get("search")     ?? undefined,
  });
  const [search, setSearch] = useState(searchParams?.get("search") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirst     = useRef(true);

  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  const syncUrl = useCallback(
    (f: DataQualityListFilters) => {
      const p = new URLSearchParams();
      if (f.issueType)  p.set("issueType",  f.issueType);
      if (f.objectType) p.set("objectType", f.objectType);
      if (f.severity)   p.set("severity",   f.severity);
      if (f.status)     p.set("status",     f.status);
      if (f.search?.trim()) p.set("search", f.search.trim());
      const qs = p.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [pathname, router]
  );

  const fetchIssues = useCallback(
    async (f: DataQualityListFilters) => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const res = await getDataQualityIssues(f);
        setIssues(res.issues);
        setTotal(res.totalCount);
      } catch (err: any) {
        const msg = err.message ?? "Failed to load issues.";
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  // Initial load
  useEffect(() => {
    if (!token) return;
    fetchIssues(filters);
    isFirst.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Debounced search
  useEffect(() => {
    if (isFirst.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const f = { ...filters, search: search || undefined };
      setFilters(f);
      syncUrl(f);
      fetchIssues(f);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const applyFilter = (f: DataQualityListFilters) => {
    setFilters(f);
    syncUrl(f);
    fetchIssues(f);
  };

  const clearAll = () => {
    const empty: DataQualityListFilters = {};
    setSearch("");
    setFilters(empty);
    router.replace(pathname, { scroll: false });
    fetchIssues(empty);
  };

  const hasFilters = !!(
    filters.issueType ||
    filters.objectType ||
    filters.severity ||
    filters.status ||
    search
  );

  const openCount = issues.filter((i) => i.status === "OPEN").length;

  if (!user) return null;

  if (error && !loading && issues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <AlertCircle size={48} className="text-[color:var(--color-error)] mb-4" />
        <h3 className="text-lg font-bold text-[color:var(--color-text)] mb-2">
          Failed to Load Issues
        </h3>
        <p className="text-sm text-[color:var(--color-text-secondary)] max-w-md mb-6">
          {error}
        </p>
        <button
          onClick={() => fetchIssues(filters)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] text-[color:var(--color-primary-foreground)] text-sm font-semibold rounded-xl"
        >
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-9 h-9 bg-[color:var(--color-error-light)] rounded-xl flex items-center justify-center shrink-0">
              <ShieldAlert size={18} className="text-[color:var(--color-error)]" />
            </div>
            <h1 className="text-2xl font-bold text-[color:var(--color-text)] tracking-tight">
              Data Quality
            </h1>
            {openCount > 0 && (
              <span className="text-[11px] font-bold bg-[color:var(--color-error-light)] text-[color:var(--color-error-foreground)] px-2 py-0.5 rounded-full border border-[color:var(--color-error-light)]">
                {openCount} open
              </span>
            )}
          </div>
          <p className="text-sm text-[color:var(--color-text-secondary)] mt-1 ml-0.5">
            AI-detected CRM anomalies — duplicates, stale records, missing fields, conflicting data.
          </p>
        </div>
        <button
          onClick={() => fetchIssues(filters)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[color:var(--color-surface)] border border-[color:var(--color-border)] hover:bg-[color:var(--color-surface-hover)] text-[color:var(--color-text-secondary)] text-sm font-semibold rounded-xl transition-all shrink-0 self-start md:self-auto"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-border)] shadow-sm p-4 space-y-3">
        <DataQualityFilterBar filters={filters} onChange={applyFilter} />

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-text-muted)] pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search issues…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs font-medium rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] focus:border-[color:var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-info-light)] transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2"
              >
                <X size={12} className="text-[color:var(--color-text-muted)]" />
              </button>
            )}
          </div>

          {hasFilters && (
            <button
              onClick={clearAll}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text)] px-2.5 py-1.5 rounded-xl border border-[color:var(--color-border)] hover:bg-[color:var(--color-surface-hover)] transition-all"
            >
              <X size={11} /> Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <DataQualityIssueTable
        issues={issues}
        loading={loading}
        hasFilters={hasFilters}
        onClearFilters={clearAll}
        onRowClick={(issue) => router.push(`/data-quality/${issue.id}`)}
        totalCount={totalCount}
      />
    </div>
  );
}
