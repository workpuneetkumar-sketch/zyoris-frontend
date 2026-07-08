"use client";

// components/activities/UnifiedTimeline.tsx
// Unified Activity Timeline — Task 3

import { useCallback } from "react";
import {
  Phone,
  Mail,
  Video,
  MessageSquare,
  CheckSquare,
  FileText,
  RefreshCw,
  AlertCircle,
  User,
  X,
  Filter,
  Search,
  Loader2,
  ChevronDown,
  Tag,
} from "lucide-react";
import { useTimeline } from "@/hooks/useTimeline";
import { TimelineItem, TimelineItemType, TIMELINE_ITEM_LABELS } from "@/types/timeline";

// ── Icon map ─────────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<TimelineItemType, React.ReactNode> = {
  call: <Phone size={14} />,
  email: <Mail size={14} />,
  meeting: <Video size={14} />,
  whatsapp: <MessageSquare size={14} />,
  activity: <CheckSquare size={14} />,
  note: <FileText size={14} />,
  status_update: <RefreshCw size={14} />,
  assignment: <User size={14} />,
};

const TYPE_COLORS: Record<TimelineItemType, string> = {
  call: "bg-blue-50 text-blue-600 border-blue-100",
  email: "bg-violet-50 text-violet-600 border-violet-100",
  meeting: "bg-emerald-50 text-emerald-600 border-emerald-100",
  whatsapp: "bg-green-50 text-green-600 border-green-100",
  activity: "bg-amber-50 text-amber-600 border-amber-100",
  note: "bg-gray-50 text-gray-600 border-gray-100",
  status_update: "bg-orange-50 text-orange-600 border-orange-100",
  assignment: "bg-rose-50 text-rose-600 border-rose-100",
};

// ── Relative time ─────────────────────────────────────────────────────────────

function relativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = now - then;

  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Timeline item card ────────────────────────────────────────────────────────

function TimelineCard({
  item,
  onClick,
}: {
  item: TimelineItem;
  onClick: (item: TimelineItem) => void;
}) {
  const colorClass = TYPE_COLORS[item.type] ?? "bg-gray-50 text-gray-600 border-gray-100";
  const icon = TYPE_ICONS[item.type];

  return (
    <div
      onClick={() => onClick(item)}
      className="flex gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer group"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick(item)}
      aria-label={`View ${item.title}`}
    >
      {/* Icon */}
      <div
        className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${colorClass}`}
      >
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] font-semibold text-gray-900 truncate group-hover:text-blue-700 transition-colors">
            {item.title}
          </p>
          <span className="text-[10px] text-gray-400 shrink-0 mt-0.5">
            {relativeTime(item.timestamp)}
          </span>
        </div>
        {item.description && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {item.relatedTo && (
            <span className="flex items-center gap-1 text-[10px] text-gray-400">
              <User size={9} />
              {item.relatedTo}
            </span>
          )}
          {item.owner && (
            <span className="text-[10px] text-gray-400">by {item.owner}</span>
          )}
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${colorClass}`}
          >
            {TIMELINE_ITEM_LABELS[item.type]}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Activity detail drawer ────────────────────────────────────────────────────

function ActivityDrawer({
  item,
  onClose,
}: {
  item: TimelineItem;
  onClose: () => void;
}) {
  const colorClass = TYPE_COLORS[item.type] ?? "bg-gray-50 text-gray-600 border-gray-100";
  const icon = TYPE_ICONS[item.type];

  const metaEntries = item.metadata
    ? Object.entries(item.metadata).filter(([, v]) => v != null && v !== "")
    : [];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Drawer */}
      <aside
        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label={`Activity detail: ${item.title}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full border flex items-center justify-center ${colorClass}`}>
              {icon}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{item.title}</p>
              <p className="text-[11px] text-gray-400">{TIMELINE_ITEM_LABELS[item.type]}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-400 transition-colors"
            aria-label="Close drawer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Timestamp */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
              Time
            </p>
            <p className="text-sm text-gray-700">
              {new Date(item.timestamp).toLocaleString("en-US", {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          {/* Description */}
          {item.description && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
                Description
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">{item.description}</p>
            </div>
          )}

          {/* Related to */}
          {item.relatedTo && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
                Related To
              </p>
              <p className="text-sm text-gray-700">{item.relatedTo}</p>
            </div>
          )}

          {/* Owner */}
          {item.owner && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
                Owner
              </p>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                  {item.ownerAvatar ?? item.owner[0]?.toUpperCase() ?? "?"}
                </div>
                <span className="text-sm text-gray-700">{item.owner}</span>
              </div>
            </div>
          )}

          {/* Metadata */}
          {metaEntries.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Details
              </p>
              <div className="space-y-1.5">
                {metaEntries.map(([key, value]) => (
                  <div key={key} className="flex items-start gap-2">
                    <span className="text-[11px] text-gray-400 capitalize w-24 shrink-0">
                      {key.replace(/_/g, " ")}
                    </span>
                    <span className="text-[12px] text-gray-700 font-medium flex-1">
                      {Array.isArray(value) ? value.join(", ") : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

// ── Filters bar ───────────────────────────────────────────────────────────────

const ALL_TYPES: TimelineItemType[] = [
  "call",
  "email",
  "meeting",
  "whatsapp",
  "activity",
  "note",
  "status_update",
  "assignment",
];

function FiltersBar({
  filters,
  onChange,
  onReset,
}: {
  filters: ReturnType<typeof useTimeline>["filters"];
  onChange: (f: Partial<typeof filters>) => void;
  onReset: () => void;
}) {
  const hasActiveFilters =
    filters.types.length > 0 ||
    filters.search !== "" ||
    filters.dateFrom !== "" ||
    filters.dateTo !== "" ||
    filters.owner !== "";

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-3">
      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search timeline…"
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          aria-label="Search timeline"
        />
      </div>

      {/* Type filters */}
      <div className="flex flex-wrap gap-1.5">
        {ALL_TYPES.map((type) => {
          const active = filters.types.includes(type);
          const colorClass = active ? TYPE_COLORS[type] : "bg-gray-50 text-gray-500 border-gray-200";
          return (
            <button
              key={type}
              onClick={() => {
                const next = active
                  ? filters.types.filter((t) => t !== type)
                  : [...filters.types, type];
                onChange({ types: next });
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all ${colorClass}`}
              aria-pressed={active}
            >
              {TYPE_ICONS[type]}
              {TIMELINE_ITEM_LABELS[type]}
            </button>
          );
        })}
      </div>

      {/* Date range + owner + reset */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => onChange({ dateFrom: e.target.value })}
          className="flex-1 min-w-[130px] px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="From date"
        />
        <span className="text-xs text-gray-300">to</span>
        <input
          type="date"
          value={filters.dateTo}
          onChange={(e) => onChange({ dateTo: e.target.value })}
          className="flex-1 min-w-[130px] px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="To date"
        />
        <input
          type="text"
          placeholder="Owner…"
          value={filters.owner}
          onChange={(e) => onChange({ owner: e.target.value })}
          className="flex-1 min-w-[100px] px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Filter by owner"
        />
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition-colors flex items-center gap-1"
          >
            <X size={11} />
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

// ── Timeline skeleton ─────────────────────────────────────────────────────────

function TimelineSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex gap-3 p-3 bg-white rounded-xl border border-gray-100 animate-pulse"
        >
          <div className="w-8 h-8 rounded-full bg-gray-100 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-gray-100 rounded w-2/3" />
            <div className="h-2.5 bg-gray-100 rounded w-1/2" />
            <div className="h-2.5 bg-gray-100 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function UnifiedTimeline() {
  const {
    groupedItems,
    total,
    hasMore,
    filters,
    loading,
    loadingMore,
    error,
    selectedItem,
    drawerOpen,
    loadMore,
    handleFiltersChange,
    handleResetFilters,
    handleOpenDrawer,
    handleCloseDrawer,
    retry,
  } = useTimeline();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <CheckSquare size={22} className="text-blue-600" />
            Activity Timeline
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Unified view of all CRM activities
            {total > 0 && (
              <span className="ml-1 text-gray-600 font-medium">· {total} total</span>
            )}
          </p>
        </div>
        <button
          onClick={retry}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
          aria-label="Refresh timeline"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <FiltersBar
        filters={filters}
        onChange={handleFiltersChange}
        onReset={handleResetFilters}
      />

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">
          <AlertCircle size={14} className="shrink-0" />
          {error}
          <button onClick={retry} className="ml-auto underline hover:no-underline">
            Retry
          </button>
        </div>
      )}

      {/* Timeline content */}
      {loading ? (
        <TimelineSkeleton />
      ) : groupedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center">
            <Tag size={22} className="text-gray-300" />
          </div>
          <p className="text-sm font-medium text-gray-500">No activities found</p>
          <p className="text-xs text-gray-400">
            {filters.types.length > 0 || filters.search
              ? "Try adjusting your filters"
              : "Activities will appear here as you use the CRM"}
          </p>
          {(filters.types.length > 0 || filters.search) && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-blue-600 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {groupedItems.map((group) => (
            <div key={`${group.label}-${group.date}`}>
              {/* Date group header */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {group.label}
                </span>
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-[10px] text-gray-300">
                  {group.items.length} item{group.items.length !== 1 ? "s" : ""}
                </span>
              </div>
              {/* Items */}
              <div className="space-y-2">
                {group.items.map((item) => (
                  <TimelineCard key={item.id} item={item} onClick={handleOpenDrawer} />
                ))}
              </div>
            </div>
          ))}

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                aria-label="Load more activities"
              >
                {loadingMore ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Loading…
                  </>
                ) : (
                  <>
                    <ChevronDown size={15} />
                    Load more
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Activity detail drawer */}
      {drawerOpen && selectedItem && (
        <ActivityDrawer item={selectedItem} onClose={handleCloseDrawer} />
      )}
    </div>
  );
}
