// components/deals/DealsUI.tsx
"use client";

import { useMemo } from "react";
import {
  Search,
  Settings2,
  ChevronDown,
  Plus,
  CheckCircle2,
  XCircle,
  DollarSign,
  Layers,
  Calendar,
  TrendingUp,
  BarChart2,
} from "lucide-react";
import { Deal, DealsFilters, DEAL_STAGES } from "@/types/deals";

// ── Types ──────────────────────────────────────────────────────────────────

interface DealsUIProps {
  deals: Deal[];
  dealsByStage: Map<string, Deal[]>;
  loading: boolean;
  filters: DealsFilters;
  totalPipeline: number;
  avgDealSize: number;
  winRate: number;
  conversionRate: number;
  onFiltersChange: (filters: DealsFilters) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}K`;
  }
  return `$${amount.toLocaleString()}`;
}

function formatAmount(amount: number): string {
  return `$${amount.toLocaleString()}`;
}

// ── Stage config ───────────────────────────────────────────────────────────

const STAGE_CONFIG: Record<
  string,
  {
    label: string;
    color: string;       // border-top / header text colour class
    borderColor: string; // Tailwind border-t class
    icon?: React.ReactNode;
  }
> = {
  Qualification: {
    label: "Qualification",
    color: "text-blue-500",
    borderColor: "border-t-blue-500",
  },
  Proposal: {
    label: "Proposal",
    color: "text-purple-500",
    borderColor: "border-t-purple-500",
  },
  Negotiation: {
    label: "Negotiation",
    color: "text-blue-500",
    borderColor: "border-t-blue-400",
  },
  "Closed Won": {
    label: "Closed Won",
    color: "text-green-500",
    borderColor: "border-t-green-500",
    icon: <CheckCircle2 size={15} className="text-green-500" />,
  },
  "Closed Lost": {
    label: "Closed Lost",
    color: "text-red-500",
    borderColor: "border-t-red-500",
    icon: <XCircle size={15} className="text-red-400" />,
  },
};

// ── Sub-components ─────────────────────────────────────────────────────────

function Select({
  value,
  options,
  onChange,
  placeholder,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none h-9 pl-3 pr-8 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDown
        size={13}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
      />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3.5 animate-pulse">
      <div className="h-3.5 bg-gray-100 rounded w-3/4 mb-2.5" />
      <div className="h-4 bg-gray-100 rounded w-1/3 mb-2" />
      <div className="h-3 bg-gray-100 rounded w-1/2 mb-1.5" />
      <div className="h-3 bg-gray-100 rounded w-1/3" />
    </div>
  );
}

function DealCard({ deal }: { deal: Deal }) {
  const cfg = STAGE_CONFIG[deal.stage];
  const isWon = deal.stage.toLowerCase().includes("closed won");
  const isLost = deal.stage.toLowerCase().includes("closed lost");

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-[13px] font-semibold text-gray-800 leading-snug group-hover:text-blue-600 transition-colors">
          {deal.name}
        </p>
        {isWon && <CheckCircle2 size={15} className="text-green-500 shrink-0 mt-0.5" />}
        {isLost && <XCircle size={15} className="text-red-400 shrink-0 mt-0.5" />}
      </div>

      <p className={`text-[15px] font-bold mb-1.5 ${cfg?.color ?? "text-blue-500"}`}>
        {formatAmount(deal.amount)}
      </p>

      {/* Conversion probability as subtle indicator */}
      <div className="flex items-center justify-between">
        <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isWon
                ? "bg-green-400"
                : isLost
                ? "bg-red-300"
                : "bg-blue-400"
            }`}
            style={{ width: `${Math.round(deal.conversionProbability * 100)}%` }}
          />
        </div>
        <span className="text-[11px] text-gray-400 ml-2 shrink-0">
          {Math.round(deal.conversionProbability * 100)}%
        </span>
      </div>
    </div>
  );
}

function KanbanColumn({
  stage,
  deals,
  loading,
}: {
  stage: string;
  deals: Deal[];
  loading: boolean;
}) {
  const cfg = STAGE_CONFIG[stage] ?? {
    label: stage,
    color: "text-gray-500",
    borderColor: "border-t-gray-400",
  };

  const columnTotal = useMemo(
    () => deals.reduce((sum, d) => sum + d.amount, 0),
    [deals]
  );

  return (
    <div
      className={`flex-1 min-w-[200px] max-w-[260px] flex flex-col bg-white rounded-xl border border-gray-100 shadow-sm border-t-[3px] ${cfg.borderColor}`}
    >
      {/* Column header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-50">
        <div className="flex items-center gap-1.5 mb-1">
          {cfg.icon}
          <h3 className={`text-[13px] font-semibold ${cfg.color}`}>
            {cfg.label}
          </h3>
        </div>
        <p className="text-[12px] text-gray-400">
          <span className={`text-[15px] font-bold ${cfg.color}`}>
            {formatAmount(columnTotal)}
          </span>
          {" "}
          ({deals.length} Deal{deals.length !== 1 ? "s" : ""})
        </p>
      </div>

      {/* Cards */}
      <div className="flex-1 flex flex-col gap-2.5 p-3 overflow-y-auto max-h-[520px]">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : deals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-300">
            <p className="text-[12px]">No deals</p>
          </div>
        ) : (
          deals.map((deal) => <DealCard key={deal.dealId} deal={deal} />)
        )}
      </div>

      {/* Add deal footer */}
      <div className="px-3 pb-3 pt-1">
        <button className="w-full flex items-center justify-center gap-1.5 h-9 rounded-lg border border-dashed border-gray-200 text-[12px] font-medium text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-colors">
          <Plus size={13} />
          Add Deal
        </button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function DealsUI({
  deals,
  dealsByStage,
  loading,
  filters,
  totalPipeline,
  avgDealSize,
  winRate,
  conversionRate,
  onFiltersChange,
}: DealsUIProps) {
  // Collect all stages present in data + the canonical ones
  const allStages = useMemo(() => {
    const fromData = Array.from(dealsByStage.keys());
    const canonical = DEAL_STAGES as readonly string[];
    const merged = new Set([...canonical, ...fromData]);
    return Array.from(merged);
  }, [dealsByStage]);

  const stageFilterOptions = ["All Stages", ...DEAL_STAGES];

  return (
    <div className="flex flex-col min-h-full gap-5">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">
            Deals / Pipeline
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Track and manage your sales pipeline.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Total pipeline */}
          <div className="flex items-center gap-2 h-10 px-4 rounded-xl border border-gray-200 bg-white shadow-sm">
            <div>
              <p className="text-[10px] font-medium text-gray-400 leading-none">
                Total Pipeline
              </p>
              <p className="text-[15px] font-bold text-blue-600 leading-tight">
                {formatCurrency(totalPipeline)}
              </p>
            </div>
            <ChevronDown size={13} className="text-gray-400" />
          </div>

          {/* Period selector */}
          <div className="flex items-center gap-1.5 h-10 px-4 rounded-xl border border-gray-200 bg-white shadow-sm cursor-pointer hover:bg-gray-50 transition-colors">
            <span className="text-[13px] font-medium text-gray-700">
              This Month
            </span>
            <ChevronDown size={13} className="text-gray-400" />
          </div>

          {/* Pipeline settings */}
          <button className="flex items-center gap-1.5 h-10 px-4 rounded-xl border border-gray-200 bg-white shadow-sm text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <Settings2 size={14} className="text-gray-400" />
            Pipeline Settings
          </button>
        </div>
      </div>

      {/* ── Filter bar ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search deals..."
            value={filters.search}
            onChange={(e) =>
              onFiltersChange({ ...filters, search: e.target.value })
            }
            className="h-9 pl-8 pr-4 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
          />
        </div>

        {/* Stage filter */}
        <Select
          value={filters.stage}
          options={stageFilterOptions}
          onChange={(v) => onFiltersChange({ ...filters, stage: v })}
        />

        {/* Owner filter — placeholder, owner not in API response */}
        <Select
          value={filters.owner}
          options={["All Owners"]}
          onChange={(v) => onFiltersChange({ ...filters, owner: v })}
        />

        {/* Date from */}
        <div className="relative">
          <Calendar
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) =>
              onFiltersChange({ ...filters, dateFrom: e.target.value })
            }
            className="h-9 pl-8 pr-3 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="From date"
          />
        </div>

        {/* Date to */}
        <div className="relative">
          <Calendar
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) =>
              onFiltersChange({ ...filters, dateTo: e.target.value })
            }
            className="h-9 pl-8 pr-3 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="To date"
          />
        </div>
      </div>

      {/* ── Error state ───────────────────────────────────────────────────── */}
      {/* (handled by parent) */}

      {/* ── Kanban board ──────────────────────────────────────────────────── */}
      <div className="flex gap-4 overflow-x-auto pb-2 flex-1">
        {allStages.map((stage) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            deals={dealsByStage.get(stage) ?? []}
            loading={loading}
          />
        ))}
      </div>

      {/* ── KPI stats bar ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        {/* Total Pipeline Value */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
            <DollarSign size={18} className="text-blue-500" />
          </div>
          <div>
            <p className="text-[12px] text-gray-400">Total Pipeline Value</p>
            <p className="text-[18px] font-bold text-gray-900 leading-tight">
              {formatCurrency(totalPipeline)}
            </p>
            <p className="text-[11px] text-gray-400">
              Across {deals.length} deals
            </p>
          </div>
        </div>

        {/* Avg. Deal Size */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
            <Layers size={18} className="text-indigo-500" />
          </div>
          <div>
            <p className="text-[12px] text-gray-400">Avg. Deal Size</p>
            <p className="text-[18px] font-bold text-gray-900 leading-tight">
              {formatCurrency(avgDealSize)}
            </p>
            <p className="text-[11px] text-green-500 flex items-center gap-0.5">
              <TrendingUp size={11} />
              vs last month
            </p>
          </div>
        </div>

        {/* Win Rate */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} className="text-green-500" />
          </div>
          <div>
            <p className="text-[12px] text-gray-400">Win Rate</p>
            <p className="text-[18px] font-bold text-gray-900 leading-tight">
              {winRate}%
            </p>
            <p className="text-[11px] text-green-500 flex items-center gap-0.5">
              <TrendingUp size={11} />
              vs last month
            </p>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
            <BarChart2 size={18} className="text-orange-500" />
          </div>
          <div>
            <p className="text-[12px] text-gray-400">Conversion Rate</p>
            <p className="text-[18px] font-bold text-gray-900 leading-tight">
              {conversionRate}%
            </p>
            <p className="text-[11px] text-green-500 flex items-center gap-0.5">
              <TrendingUp size={11} />
              vs last month
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
