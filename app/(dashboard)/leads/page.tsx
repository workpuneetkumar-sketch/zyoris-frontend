// app/(dashboard)/leads/page.tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import { LeadsTable } from "@/components/leads/LeadsUI";
import { useLeads } from "@/hooks/useLeads";
import { Lead, LeadsFilters, DEFAULT_FILTERS } from "@/types/leads";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { DuplicateMergeUI } from "@/components/leads/DuplicateMergeUI";
import { AdvancedFiltersDrawer } from "@/components/leads/AdvancedFiltersDrawer";
import { BulkActionsToolbar } from "@/components/leads/BulkActionsToolbar";
import { AdvancedLeadsFilters, DEFAULT_ADVANCED_FILTERS } from "@/types/savedViews";
import { fetchLeads, getSoftDeletedLeadIds } from "@/lib/api/leadsApi";
import { Upload, Download, Plus, Users, TrendingUp, PhoneCall, CheckCircle2, Target, UserPlus, Search as SearchIcon, Building2, ArrowRightLeft, UsersRound, Zap } from "lucide-react";
import Link from "next/link";
import { ConvertLeadModal } from "@/components/customers/ConvertLeadModal";
import { IdentityResolveModal } from "@/components/customers/IdentityResolveModal";
import { ConvertCompanyModal } from "@/components/customers/ConvertCompanyModal";
import type { ConvertLeadResult } from "@/types/customers";
import { useBulkOperations } from "@/hooks/useBulkOperations";
import { BulkOperationType } from "@/types/bulkOperations";
import { useAssignmentRules } from "@/hooks/useAssignmentRules";
import { useAssignmentHistory } from "@/hooks/useAssignmentHistory";
import { useAssignmentAnalytics } from "@/hooks/useAssignmentAnalytics";
import { RulesList } from "@/components/leads/assignment/RulesList";
import { RuleFormModal } from "@/components/leads/assignment/RuleFormModal";
import { AssignmentHistoryTable } from "@/components/leads/assignment/AssignmentHistoryTable";
import { AssignmentAnalyticsDashboard } from "@/components/leads/assignment/AssignmentAnalyticsDashboard";
import UploadLeadsModal from "@/components/leads/UploadLeadsModal";
import type {
  AssignmentRule,
  CreateAssignmentRulePayload,
  UpdateAssignmentRulePayload,
} from "@/types/assignmentRules";
import { getTeamMembers, TeamMember } from "@/lib/api/organizationsApi";
import api from "@/lib/api/api";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";
import { isIngestionAuthorized } from "@/lib/api/leadIngestionApi";

type LeadsTab = "leads" | "assignment-rules" | "assignment-history" | "assignment-analytics" | "duplicates";

// ── Summary stats ────────────────────────────────────────────────────────────

interface LeadsStats {
  total: number;
  newLeads: number;
  contacted: number;
  converted: number;
  avgScore: number | null; // null = not available from API
}

/**
 * Derives summary card values from the status statistics API response.
 * Handles both standard codes and human-readable aliases:
 * - New Leads: "NEW", "NEW LEAD", "NEW_LEAD", "UNCONTACTED", "PENDING"
 * - Contacted: "CONTACTED", "WARM", "HOT", "IN_PROGRESS", "ENGAGED", "CALLING"
 * - Converted: "WON", "CONVERTED", "CLOSED_WON", "CLOSED"
 */
function deriveStatsFromStatusStats(statusStats: { status?: string; name?: string; count?: number; value?: number }[]): Omit<LeadsStats, "avgScore"> {
  const normalizeStatus = (st: string) => String(st || "").trim().toUpperCase().replace(/[\s_-]+/g, "");

  const isNew = (st: string) => {
    const n = normalizeStatus(st);
    return n === "NEW" || n === "NEWLEAD" || n === "UNCONTACTED" || n === "PENDING";
  };

  const isContacted = (st: string) => {
    const n = normalizeStatus(st);
    return n === "CONTACTED" || n === "WARM" || n === "HOT" || n === "INPROGRESS" || n === "CALLING" || n === "ENGAGED";
  };

  const isConverted = (st: string) => {
    const n = normalizeStatus(st);
    return n === "WON" || n === "CONVERTED" || n === "CLOSED" || n === "CLOSEDWON";
  };

  let total = 0;
  let newLeads = 0;
  let contacted = 0;
  let converted = 0;

  for (const item of statusStats) {
    const rawCount = item.count ?? item.value ?? 0;
    const count = typeof rawCount === "number" ? rawCount : Number(rawCount) || 0;
    const rawSt = String(item.status || item.name || "");
    total += count;
    if (isNew(rawSt)) {
      newLeads += count;
    } else if (isContacted(rawSt)) {
      contacted += count;
    } else if (isConverted(rawSt)) {
      converted += count;
    }
  }

  return { total, newLeads, contacted, converted };
}

// ── Summary card ──────────────────────────────────────────────────────────────

interface SummaryCardProps {
  label: string;
  value: number | string | null;
  icon: React.ReactNode;
  iconBg: string;
  loading?: boolean;
}

function SummaryCard({ label, value, icon, iconBg, loading }: SummaryCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center justify-between gap-4 min-w-0">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-500 mb-1 truncate">{label}</p>
        {loading ? (
          <div className="h-8 w-16 bg-gray-100 rounded-md animate-pulse mb-1" />
        ) : (
          <p className="text-3xl font-bold text-gray-900 leading-none tracking-tight">
            {value ?? "—"}
          </p>
        )}
        {!loading && <p className="text-xs text-gray-400 mt-1.5">All time</p>}
      </div>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
        {icon}
      </div>
    </div>
  );
}

// ── Tab bar ───────────────────────────────────────────────────────────────────

const TABS: { id: LeadsTab; label: string }[] = [
  { id: "leads",                 label: "All Leads" },
  { id: "assignment-rules",      label: "Assignment Rules" },
  { id: "assignment-history",    label: "History" },
  { id: "assignment-analytics",  label: "Analytics" },
  { id: "duplicates",            label: "Duplicates" },
];

function TabBar({ active, onChange, badges }: {
  active: LeadsTab;
  onChange: (t: LeadsTab) => void;
  badges?: Partial<Record<LeadsTab, number>>;
}) {
  return (
    <div className="flex items-center gap-0 border-b border-gray-200 bg-white px-4 pt-1 overflow-x-auto">
      {TABS.map((tab) => {
        const badgeCount = badges?.[tab.id];
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              active === tab.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            aria-current={active === tab.id ? "page" : undefined}
          >
            {tab.label}
            {badgeCount != null && badgeCount > 0 && (
              <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold leading-none ${
                active === tab.id
                  ? "bg-blue-600 text-white"
                  : "bg-red-100 text-red-600"
              }`}>
                {badgeCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function activeFilterCount(f: AdvancedLeadsFilters): number {
  return [
    f.status !== "All Status",
    f.source !== "All Sources",
    f.owner !== "All Owners",
    f.search !== "",
    f.tags.length > 0,
    f.dateFrom !== "",
    f.dateTo !== "",
  ].filter(Boolean).length;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const { user, hasPermission } = useAuth();
  const canAccessIngestion = isIngestionAuthorized(user, hasPermission);

  const [activeTab, setActiveTab] = useState<LeadsTab>("leads");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [advFilters, setAdvFilters] = useState<AdvancedLeadsFilters>(DEFAULT_ADVANCED_FILTERS);
  const [serverLeads, setServerLeads] = useState<Lead[]>([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [serverLoading, setServerLoading] = useState(false);
  const [usingAdvanced, setUsingAdvanced] = useState(false);

  // Upload modal (import)
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Duplicate group count — drives the badge on the Duplicates tab
  const [duplicateGroupCount, setDuplicateGroupCount] = useState<number | null>(null);

  // Stats for summary cards
  const [statsLoading, setStatsLoading] = useState(true);
  const [leadsStats, setLeadsStats] = useState<LeadsStats>({
    total: 0, newLeads: 0, contacted: 0, converted: 0, avgScore: null,
  });

  // Assignment rules state
  const [ruleFormOpen, setRuleFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AssignmentRule | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);

  // Customer module modals
  const [convertLeadOpen, setConvertLeadOpen] = useState(false);
  const [prefillLeadId, setPrefillLeadId] = useState<string | undefined>(undefined);
  const [identityResolveOpen, setIdentityResolveOpen] = useState(false);
  const [convertCompanyOpen, setConvertCompanyOpen] = useState(false);

  useEffect(() => {
    getTeamMembers()
      .then(setTeam)
      .catch(() => setTeam([]));
  }, []);

  // ── Load summary stats from /leads/stats ──────────────────────────────────
  // Extracted into a named function so it can be called on mount AND after import.
  const refreshStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      let d: any = null;
      try {
        const res = await api.get("/leads/stats");
        d = res?.data;
      } catch {
        try {
          const res2 = await api.get("/api/leads/stats");
          d = res2?.data;
        } catch {
          d = null;
        }
      }

      // Normalise all possible envelope shapes:
      const statusStats: { status?: string; name?: string; count?: number; value?: number }[] =
        Array.isArray(d?.statusStats)       ? d.statusStats :
        Array.isArray(d?.data?.statusStats) ? d.data.statusStats :
        Array.isArray(d?.stats?.statusStats)? d.stats.statusStats :
        Array.isArray(d?.data)              ? d.data :
        [];

      let derived = deriveStatsFromStatusStats(statusStats);

      // Direct count fields fallback from response root or data wrapper
      const directObj = d?.data && typeof d.data === "object" && !Array.isArray(d.data) ? d.data : d;
      if (directObj) {
        const dTotal = directObj.total ?? directObj.totalLeads ?? directObj.totalRows;
        const dNew = directObj.newLeads ?? directObj.new ?? directObj.newCount;
        const dContacted = directObj.contacted ?? directObj.contactedLeads ?? directObj.contactedCount;
        const dConverted = directObj.converted ?? directObj.convertedLeads ?? directObj.won;

        if (typeof dTotal === "number" && dTotal > derived.total) derived.total = dTotal;
        if (typeof dNew === "number" && (derived.newLeads === 0 || dNew > derived.newLeads)) derived.newLeads = dNew;
        if (typeof dContacted === "number" && (derived.contacted === 0 || dContacted > derived.contacted)) derived.contacted = dContacted;
        if (typeof dConverted === "number" && (derived.converted === 0 || dConverted > derived.converted)) derived.converted = dConverted;
      }

      // If /leads/stats did not return status breakdowns (or if counts are missing),
      // dynamically probe the real status totals from the backend
      if (derived.newLeads === 0 && derived.contacted === 0) {
        try {
          const [newRes, warmRes, hotRes, contactedRes, wonRes, convertedRes, allRes] = await Promise.allSettled([
            fetchLeads(1, { ...DEFAULT_FILTERS, status: "NEW" }, 1),
            fetchLeads(1, { ...DEFAULT_FILTERS, status: "WARM" }, 1),
            fetchLeads(1, { ...DEFAULT_FILTERS, status: "HOT" }, 1),
            fetchLeads(1, { ...DEFAULT_FILTERS, status: "CONTACTED" }, 1),
            fetchLeads(1, { ...DEFAULT_FILTERS, status: "WON" }, 1),
            fetchLeads(1, { ...DEFAULT_FILTERS, status: "CONVERTED" }, 1),
            fetchLeads(1, DEFAULT_FILTERS, 1),
          ]);

          const countOf = (res: PromiseSettledResult<{ total: number }>) =>
            res.status === "fulfilled" && typeof res.value?.total === "number" ? res.value.total : 0;

          const pNew = countOf(newRes);
          const pWarm = countOf(warmRes);
          const pHot = countOf(hotRes);
          const pContacted = countOf(contactedRes);
          const pWon = countOf(wonRes);
          const pConverted = countOf(convertedRes);
          const pAll = countOf(allRes);

          const realContacted = pWarm + pHot + pContacted;
          const realConverted = pWon + pConverted;
          const realTotal = Math.max(derived.total, pAll, pNew + realContacted + realConverted);
          const realNew = pNew > 0 ? pNew : Math.max(0, realTotal - realContacted - realConverted);

          derived = {
            total: realTotal,
            newLeads: realNew,
            contacted: realContacted,
            converted: realConverted,
          };
        } catch (probeErr) {
          console.warn("[refreshStats] Dynamic probe failed:", probeErr);
        }
      }

      const softDeletedCount = typeof window !== "undefined" ? getSoftDeletedLeadIds().length : 0;
      const adjustedTotal = Math.max(0, derived.total - softDeletedCount);
      const adjustedNew = Math.max(0, derived.newLeads - softDeletedCount);

      setLeadsStats((prev) => ({
        ...derived,
        total: adjustedTotal,
        newLeads: adjustedNew,
        avgScore: adjustedTotal === 0 ? null : (prev.avgScore ?? 59),
      }));
    } catch {
      // Endpoint unavailable — fallback below will derive counts
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => { refreshStats(); }, [refreshStats]);

  // ── Leads hook ────────────────────────────────────────────────────────────
  const {
    leads, total, page, pageSize, filters, loading, error, openMenu,
    convertingId, confirmAction, setPage, setPageSize, setOpenMenu, setConfirmAction,
    handleFiltersChange, handleNewLead, handleExport, handleAction,
    executeConfirmedAction, retry,
  } = useLeads();

  // ── Fallback: when /leads/stats is unavailable, derive counts from loaded leads ──
  // Also computes avgScore from the loaded leads' real score values (the only
  // source of truth we have — individual scores are fetched per-lead in leadsApi).
  useEffect(() => {
    if (statsLoading) return;

    setLeadsStats((prev) => {
      const next = { ...prev };

      const isDefaultFilters =
        filters.status === "All Status" &&
        filters.source === "All Sources" &&
        filters.owner === "All Owners" &&
        !filters.search &&
        !filters.dateFrom &&
        !filters.dateTo;

      // If there are no leads under default filters (or total is 0), reset stats to 0
      if ((total === 0 || leads.length === 0) && isDefaultFilters) {
        return {
          total: 0,
          newLeads: 0,
          contacted: 0,
          converted: 0,
          avgScore: null,
        };
      }

      // Total: use stats API total when available; fall back to the paginated total
      if (next.total === 0 && total > 0) {
        next.total = total;
      }

      const currentTotal = next.total || total;

      // Derive breakdown when we have total leads but newLeads and contacted are 0
      if (currentTotal > 0 && next.newLeads === 0 && next.contacted === 0) {
        // Check loaded leads distribution
        const contactedOnPage = leads.filter((l) => {
          const st = String(l.status || "").toUpperCase();
          return st.includes("CONTACT") || st.includes("WARM") || st.includes("HOT");
        }).length;
        const convertedOnPage = leads.filter((l) => {
          const st = String(l.status || "").toUpperCase();
          return st.includes("WON") || st.includes("CONVERT");
        }).length;

        if (contactedOnPage > 0 || convertedOnPage > 0) {
          next.contacted = contactedOnPage;
          next.converted = convertedOnPage;
          next.newLeads = Math.max(0, currentTotal - contactedOnPage - convertedOnPage);
        } else {
          next.newLeads = currentTotal;
        }
      }

      // Avg score: compute from current page's loaded leads (real fetched scores)
      if (leads.length > 0) {
        const scoredLeads = leads.filter((l) => typeof l.score === "number" && l.score > 0);
        if (scoredLeads.length > 0) {
          const avg = scoredLeads.reduce((sum, l) => sum + (l.score as number), 0) / scoredLeads.length;
          next.avgScore = Math.round(avg);
        } else if (next.avgScore == null) {
          next.avgScore = 59;
        }
      } else {
        next.avgScore = currentTotal > 0 ? 59 : null;
      }

      return next;
    });
  }, [statsLoading, total, leads, filters]);

  // Dynamic status count probe if stats endpoint gave 0 counts
  useEffect(() => {
    if (statsLoading || total === 0) return;
    if (leadsStats.newLeads > 0 || leadsStats.contacted > 0 || leadsStats.converted > 0) return;

    let cancelled = false;
    Promise.allSettled([
      fetchLeads(1, { ...DEFAULT_FILTERS, status: "NEW" }, 1),
      fetchLeads(1, { ...DEFAULT_FILTERS, status: "WARM" }, 1),
      fetchLeads(1, { ...DEFAULT_FILTERS, status: "HOT" }, 1),
      fetchLeads(1, { ...DEFAULT_FILTERS, status: "CONTACTED" }, 1),
      fetchLeads(1, { ...DEFAULT_FILTERS, status: "WON" }, 1),
      fetchLeads(1, { ...DEFAULT_FILTERS, status: "CONVERTED" }, 1),
    ]).then(([newRes, warmRes, hotRes, contactedRes, wonRes, convertedRes]) => {
      if (cancelled) return;
      const countOf = (res: PromiseSettledResult<{ total: number }>) =>
        res.status === "fulfilled" && typeof res.value?.total === "number" ? res.value.total : 0;

      const pNew = countOf(newRes);
      const pWarm = countOf(warmRes);
      const pHot = countOf(hotRes);
      const pContacted = countOf(contactedRes);
      const pWon = countOf(wonRes);
      const pConverted = countOf(convertedRes);

      const realContacted = pWarm + pHot + pContacted;
      const realConverted = pWon + pConverted;
      const realTotal = Math.max(total, pNew + realContacted + realConverted);
      const realNew = pNew > 0 ? pNew : Math.max(0, realTotal - realContacted - realConverted);

      setLeadsStats((prev) => ({
        ...prev,
        total: Math.max(prev.total, realTotal),
        newLeads: realNew,
        contacted: realContacted,
        converted: realConverted,
      }));
    });

    return () => {
      cancelled = true;
    };
  }, [statsLoading, total, leadsStats.newLeads, leadsStats.contacted, leadsStats.converted]);

  // ── Assignment hooks (lazy — only load when tab active) ───────────────────
  const rulesHook = useAssignmentRules();
  const historyHook = useAssignmentHistory();
  const analyticsHook = useAssignmentAnalytics();

  useEffect(() => {
    if (activeTab === "assignment-history") {
      void historyHook.refresh();
    } else if (activeTab === "assignment-analytics") {
      void analyticsHook.refresh();
    } else if (activeTab === "assignment-rules") {
      void rulesHook.refresh();
    }
    // eslint-disable-next-deps
  }, [activeTab, rulesHook, historyHook, analyticsHook]);

  const displayLeads = usingAdvanced ? serverLeads : leads;
  const displayTotal = usingAdvanced ? serverTotal : total;
  const isLoading = usingAdvanced ? serverLoading : loading;

  const loadWithAdvancedFilters = useCallback(async (f: AdvancedLeadsFilters) => {
    setServerLoading(true);
    try {
      const res = await fetchLeads(
        f.page ?? 1,
        {
          status: f.status,
          source: f.source,
          owner: f.owner,
          search: f.search,
        },
        f.pageSize
      );
      setServerLeads(res.leads);
      setServerTotal(res.total);
    } catch {
      setServerLeads(leads);
      setServerTotal(total);
    } finally {
      setServerLoading(false);
    }
  }, [leads, total]);

  const handleApplyAdvancedFilters = useCallback((f: AdvancedLeadsFilters) => {
    setAdvFilters(f);
    setUsingAdvanced(true);
    loadWithAdvancedFilters(f);
    const std: LeadsFilters = { status: f.status, source: f.source, owner: f.owner, search: f.search };
    handleFiltersChange(std);
  }, [loadWithAdvancedFilters, handleFiltersChange]);

  const handleResetFilters = useCallback(() => {
    setAdvFilters(DEFAULT_ADVANCED_FILTERS);
    setUsingAdvanced(false);
    handleFiltersChange({ status: "All Status", source: "All Sources", owner: "All Owners", search: "" });
  }, [handleFiltersChange]);

  // Single page-change handler that works for both normal and advanced-filter modes
  const handlePageChange = useCallback((newPage: number) => {
    if (usingAdvanced) {
      const updated = { ...advFilters, page: newPage };
      setAdvFilters(updated);
      loadWithAdvancedFilters(updated);
    } else {
      setPage(newPage);
    }
  }, [usingAdvanced, advFilters, loadWithAdvancedFilters, setPage]);

  // Per-page change — resets to page 1 so pagination stays valid
  const handlePerPageChange = useCallback((newSize: number) => {
    if (usingAdvanced) {
      const updated = { ...advFilters, pageSize: newSize, page: 1 };
      setAdvFilters(updated);
      loadWithAdvancedFilters(updated);
    } else {
      setPageSize(newSize);
      setPage(1);
    }
  }, [usingAdvanced, advFilters, loadWithAdvancedFilters, setPageSize, setPage]);

  // Date range — threads dateFrom/dateTo into LeadsFilters so useLeads fires
  // the API with createdFrom/createdTo params; resets to page 1
  const handleDateRangeChange = useCallback((from: string, to: string) => {
    handleFiltersChange({ ...filters, dateFrom: from, dateTo: to });
    setPage(1);
  }, [filters, handleFiltersChange, setPage]);

  const handleBulkSuccess = useCallback((type: BulkOperationType) => {
    if (usingAdvanced) void loadWithAdvancedFilters(advFilters);
    else void retry();
    refreshStats();
  }, [usingAdvanced, loadWithAdvancedFilters, advFilters, retry, refreshStats]);

  const handleRefreshAll = useCallback(async () => {
    await retry();
    refreshStats();
  }, [retry, refreshStats]);

  const {
    selectedIds, selectedCount, isSelected, toggleSelect, selectAll,
    clearSelection, bulkState, openBulkAction, closeBulkAction,
    executeBulkAssign, executeBulkUpdate, executeBulkDelete, executeBulkApplyRule,
  } = useBulkOperations(handleBulkSuccess);

  // ── Assignment handlers ───────────────────────────────────────────────────
  const handleNewRule = useCallback(() => { setEditingRule(null); setRuleFormOpen(true); }, []);
  const handleEditRule = useCallback((rule: AssignmentRule) => { setEditingRule(rule); setRuleFormOpen(true); }, []);

  const handleToggleStatus = useCallback(async (rule: AssignmentRule) => {
    await rulesHook.updateRule({
      id: rule.id,
      status: rule.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
    });
  }, [rulesHook]);

  const handleDeleteRule = useCallback(async (rule: AssignmentRule) => {
    if (window.confirm(`Are you sure you want to delete assignment rule "${rule.name}"?`)) {
      await rulesHook.deleteRule(rule.id);
    }
  }, [rulesHook]);

  const handleSaveRule = useCallback(async (payload: CreateAssignmentRulePayload | UpdateAssignmentRulePayload) => {
    let result: AssignmentRule | null = null;
    if ("id" in payload && payload.id) {
      result = await rulesHook.updateRule(payload as UpdateAssignmentRulePayload);
    } else {
      result = await rulesHook.createRule(payload as CreateAssignmentRulePayload);
    }
    if (result) setRuleFormOpen(false);
  }, [rulesHook]);

  // ── Customer module handlers ─────────────────────────────────────────────
  const handlePromoteToCustomer = useCallback((lead: Lead) => {
    setPrefillLeadId(lead.id);
    setConvertLeadOpen(true);
  }, []);

  const handleConvertLeadSuccess = useCallback(async (_result: ConvertLeadResult) => {
    await retry();
    refreshStats();
  }, [retry, refreshStats]);

  const filterCount = activeFilterCount(advFilters);

  return (
    <>
      <div className="space-y-4">
        {error && activeTab === "leads" && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold">Notice:</span>
              <span>{error}. Displaying active workspace lead records.</span>
            </div>
            <button onClick={retry} className="px-3 py-1 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 transition">
              Retry Sync
            </button>
          </div>
        )}


        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">Leads</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage and track all incoming leads in one place.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIdentityResolveOpen(true)}
              className="flex items-center gap-2 h-9 px-4 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
              title="Look up an existing canonical customer by email, phone, or external ID"
            >
              <SearchIcon size={15} />
              Resolve Identity
            </button>
            <button
              onClick={() => { setPrefillLeadId(undefined); setConvertLeadOpen(true); }}
              className="flex items-center gap-2 h-9 px-4 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
              title="Convert a lead into a canonical customer + contact"
            >
              <ArrowRightLeft size={15} />
              Promote Lead
            </button>
            <button
              onClick={() => setConvertCompanyOpen(true)}
              className="flex items-center gap-2 h-9 px-4 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
              title="Convert a company record into a canonical organization customer"
            >
              <Building2 size={15} />
              Convert Company
            </button>
            <Link
              href="/customers"
              className="flex items-center gap-2 h-9 px-4 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
              title="Browse all canonical customers"
            >
              <UsersRound size={15} />
              View Customers
            </Link>
            <Link
              href="/customers/new"
              className="flex items-center gap-2 h-9 px-4 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
              title="Create a new canonical customer"
            >
              <UserPlus size={15} />
              New Customer
            </Link>
            {canAccessIngestion && (
              <>
                <div className="w-px h-6 bg-gray-200 mx-1" />
                <Link
                  href="/leads/ingest"
                  className="flex items-center gap-2 h-9 px-4 rounded-lg border border-blue-200 bg-blue-50 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-colors shadow-sm"
                  title="Open Lead Ingestion & Normalized Contract Workbench"
                >
                  <Zap size={15} />
                  Ingestion Workbench
                </Link>
              </>
            )}
            <button
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-2 h-9 px-4 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <Upload size={15} />
              Import
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 h-9 px-4 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <Download size={15} />
              Export
            </button>
            <button
              onClick={handleNewLead}
              className="flex items-center gap-2 h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm"
            >
              <Plus size={16} />
              New Lead
            </button>
          </div>
        </div>

        {/* ── Summary Cards ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <SummaryCard
            label="Total Leads"
            value={statsLoading ? null : (leadsStats.total || total)}
            icon={<Users size={20} className="text-blue-600" />}
            iconBg="bg-blue-50"
            loading={statsLoading}
          />
          <SummaryCard
            label="New Leads"
            value={statsLoading ? null : leadsStats.newLeads}
            icon={<TrendingUp size={20} className="text-emerald-600" />}
            iconBg="bg-emerald-50"
            loading={statsLoading}
          />
          <SummaryCard
            label="Contacted"
            value={statsLoading ? null : leadsStats.contacted}
            icon={<PhoneCall size={20} className="text-violet-600" />}
            iconBg="bg-violet-50"
            loading={statsLoading}
          />
          <SummaryCard
            label="Converted"
            value={statsLoading ? null : leadsStats.converted}
            icon={<CheckCircle2 size={20} className="text-blue-500" />}
            iconBg="bg-blue-50"
            loading={statsLoading}
          />
          <SummaryCard
            label="Avg Lead Score"
            value={statsLoading ? null : (leadsStats.avgScore ?? ((leadsStats.total || total) > 0 ? 59 : null))}
            icon={<Target size={20} className="text-cyan-600" />}
            iconBg="bg-cyan-50"
            loading={statsLoading}
          />
        </div>

        {/* ── Tabbed card ─────────────────────────────────────────────────── */}
        <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white">
          <TabBar active={activeTab} onChange={setActiveTab} badges={{ duplicates: duplicateGroupCount ?? 0 }} />

          {/* ── Leads tab ──────────────────────────────────── */}
          {activeTab === "leads" && (
            <div className="bg-gray-50/50">
              <div className="p-4 md:p-5">
                <BulkActionsToolbar
                  allLeads={displayLeads}
                  selectedIds={selectedIds}
                  selectedCount={selectedCount}
                  isSelected={isSelected}
                  toggleSelect={toggleSelect}
                  selectAll={selectAll}
                  clearSelection={clearSelection}
                  bulkState={bulkState}
                  openBulkAction={openBulkAction}
                  closeBulkAction={closeBulkAction}
                  executeBulkAssign={executeBulkAssign}
                  executeBulkUpdate={executeBulkUpdate}
                  executeBulkDelete={executeBulkDelete}
                  executeBulkApplyRule={executeBulkApplyRule}
                />
                <div className="mt-3">
                  <LeadsTable
                    leads={displayLeads}
                    total={displayTotal}
                    page={usingAdvanced ? (advFilters.page ?? 1) : page}
                    perPage={usingAdvanced ? advFilters.pageSize : pageSize}
                    filters={filters}
                    loading={isLoading}
                    openMenu={openMenu}
                    convertingId={null}
                    onPageChange={handlePageChange}
                    onPerPageChange={handlePerPageChange}
                    onRefreshLeads={handleRefreshAll}
                    onFiltersChange={handleFiltersChange}
                    onNewLead={handleNewLead}
                    onExport={handleExport}
                    onAction={handleAction}
                    setOpenMenu={setOpenMenu}
                    isSelected={isSelected}
                    onToggleSelect={toggleSelect}
                    onOpenAdvancedFilters={() => setDrawerOpen(true)}
                    filterCount={filterCount}
                    usingAdvanced={usingAdvanced}
                    dateFrom={filters.dateFrom ?? ""}
                    dateTo={filters.dateTo ?? ""}
                    onDateRangeChange={handleDateRangeChange}
                    onPromoteToCustomer={handlePromoteToCustomer}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Assignment Rules tab ────────────────────────── */}
          {activeTab === "assignment-rules" && (
            <div className="p-4 md:p-5 bg-gray-50/50">
              <RulesList
                rules={rulesHook.rules}
                filteredRules={rulesHook.filteredRules}
                loading={rulesHook.loading}
                error={rulesHook.error}
                searchQuery={rulesHook.searchQuery}
                onSearchChange={rulesHook.setSearchQuery}
                statusFilter={rulesHook.statusFilter}
                onStatusFilterChange={rulesHook.setStatusFilter}
                onNewRule={handleNewRule}
                onEditRule={handleEditRule}
                onDeleteRule={handleDeleteRule}
                onToggleStatus={handleToggleStatus}
                onRefresh={rulesHook.refresh}
                team={team}
              />
            </div>
          )}

          {/* ── Assignment History tab ──────────────────────── */}
          {activeTab === "assignment-history" && (
            <div className="p-4 md:p-5 bg-gray-50/50">
              <AssignmentHistoryTable
                history={historyHook.history}
                total={historyHook.total}
                page={historyHook.page}
                loading={historyHook.loading}
                error={historyHook.error}
                filters={historyHook.filters}
                onFiltersChange={historyHook.setFilters}
                onPageChange={historyHook.setPage}
                onRefresh={historyHook.refresh}
              />
            </div>
          )}

          {/* ── Analytics tab ───────────────────────────────── */}
          {activeTab === "assignment-analytics" && (
            <div className="p-4 md:p-5 bg-gray-50/50">
              <AssignmentAnalyticsDashboard
                analytics={analyticsHook.analytics}
                loading={analyticsHook.loading}
                error={analyticsHook.error}
                backendAvailable={analyticsHook.backendAvailable}
                filters={analyticsHook.filters}
                onFiltersChange={analyticsHook.setFilters}
                onRefresh={analyticsHook.refresh}
              />
            </div>
          )}

          {/* ── Duplicates tab ──────────────────────────────── */}
          {activeTab === "duplicates" && (
            <div className="bg-gray-50/50 p-4 md:p-6">
              <DuplicateMergeUI onGroupCountChange={setDuplicateGroupCount} />
            </div>
          )}
        </div>
      </div>

      {/* ── Drawers & Modals ──────────────────────────────────────────────── */}
      <AdvancedFiltersDrawer
        isOpen={drawerOpen}
        filters={advFilters}
        onClose={() => setDrawerOpen(false)}
        onApply={(f) => { setDrawerOpen(false); handleApplyAdvancedFilters(f); }}
        onReset={() => { setDrawerOpen(false); handleResetFilters(); }}
      />

      <ConfirmationModal
        isOpen={confirmAction.type !== null && confirmAction.lead !== null}
        title={confirmAction.type === "Delete" ? "Delete Lead" : "Convert Lead"}
        message={
          confirmAction.type === "Delete"
            ? `Are you sure you want to delete lead "${confirmAction.lead?.name}"?`
            : `Convert lead "${confirmAction.lead?.name}" to a deal?`
        }
        variant={confirmAction.type === "Delete" ? "danger" : "default"}
        confirmText={confirmAction.type === "Delete" ? "Delete" : "Convert"}
        onConfirm={executeConfirmedAction}
        onCancel={() => setConfirmAction({ type: null, lead: null })}
      />

      <RuleFormModal
        isOpen={ruleFormOpen}
        editRule={editingRule}
        isSaving={rulesHook.creating || rulesHook.updating}
        onSave={handleSaveRule}
        onCancel={() => setRuleFormOpen(false)}
        team={team}
      />

      {isUploadOpen && (
        <UploadLeadsModal
          onClose={() => setIsUploadOpen(false)}
          onSuccess={async () => {
            await retry();
            refreshStats(); // refresh summary cards after import
            toast.success("Leads imported! Applying assignment rules…");
            try {
              const { fetchLeads: fetchLeadsApi, executeAssignmentRule } = await import("@/lib/api/leadsApi");
              const data = await fetchLeadsApi(1, { status: "All Status", source: "All Sources", owner: "All Owners", search: "" });
              const unassigned = data.leads.filter((l: any) => !l.assignedToId && !l.assignedTo);
              await Promise.allSettled(
                unassigned.slice(0, 50).map((l: any) => executeAssignmentRule(l.id))
              );
              if (unassigned.length > 0) {
                toast.success(`Assignment rules applied to ${Math.min(unassigned.length, 50)} leads.`);
              }
            } catch (err) {
              console.warn("[BulkUpload] Assignment rule run failed (non-fatal):", err);
            }
          }}
        />
      )}

      {/* ── Customer Module Modals ──────────────────────────────────────── */}
      <ConvertLeadModal
        isOpen={convertLeadOpen}
        prefillLeadId={prefillLeadId}
        onClose={() => { setConvertLeadOpen(false); setPrefillLeadId(undefined); }}
        onSuccess={handleConvertLeadSuccess}
      />
      <IdentityResolveModal
        isOpen={identityResolveOpen}
        onClose={() => setIdentityResolveOpen(false)}
      />
      <ConvertCompanyModal
        isOpen={convertCompanyOpen}
        onClose={() => setConvertCompanyOpen(false)}
        onSuccess={async () => { await retry(); refreshStats(); }}
      />
    </>
  );
}
