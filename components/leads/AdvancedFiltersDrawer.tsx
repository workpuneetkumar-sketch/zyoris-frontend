"use client";

// components/leads/AdvancedFiltersDrawer.tsx
// Advanced Search + Filters + Saved Views drawer — Task 4

import { useState, useCallback, useEffect } from "react";
import {
  X,
  Filter,
  Save,
  Trash2,
  BookmarkCheck,
  RotateCcw,
  ChevronDown,
  Check,
  Loader2,
} from "lucide-react";
import { useSavedViews } from "@/hooks/useSavedViews";
import { AdvancedLeadsFilters, DEFAULT_ADVANCED_FILTERS, PAGE_SIZE_OPTIONS } from "@/types/savedViews";
import { SavedView } from "@/types/savedViews";

const STATUSES = ["NEW", "WARM", "HOT", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "CLOSED", "DEAD"];
const SOURCES = ["Website", "Referral", "LinkedIn", "Cold Call"];
const SORT_OPTIONS = [
  { value: "createdAt", label: "Created Date" },
  { value: "name", label: "Name" },
  { value: "estimatedValue", label: "Est. Value" },
  { value: "score", label: "Score" },
];

// ── MultiSelect chip ──────────────────────────────────────────────────────────

function MultiSelectChips<T extends string>({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: T[];
  selected: T[];
  onChange: (next: T[]) => void;
}) {
  function toggle(opt: T) {
    const next = selected.includes(opt)
      ? selected.filter((s) => s !== opt)
      : [...selected, opt];
    onChange(next);
  }

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = selected.includes(opt);
          return (
            <button
              key={opt}
              onClick={() => toggle(opt)}
              className={`px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all ${
                active
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
              }`}
              aria-pressed={active}
            >
              {active && <Check size={9} className="inline mr-1" />}
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Saved view item ───────────────────────────────────────────────────────────

function SavedViewItem({
  view,
  isActive,
  onActivate,
  onDelete,
  onRename,
}: {
  view: SavedView;
  isActive: boolean;
  onActivate: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(view.name);

  function handleRename() {
    if (editName.trim() && editName !== view.name) {
      onRename(editName.trim());
    }
    setEditing(false);
  }

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
        isActive ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <button
        onClick={onActivate}
        className="flex-1 text-left"
        aria-pressed={isActive}
      >
        {editing ? (
          <input
            autoFocus
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") setEditing(false);
            }}
            onClick={(e) => e.stopPropagation()}
            className="text-xs border border-blue-300 rounded px-1 py-0.5 w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        ) : (
          <span
            className={`text-xs font-medium ${isActive ? "text-blue-700" : "text-gray-700"}`}
            onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
            title="Double-click to rename"
          >
            {view.name}
          </span>
        )}
      </button>
      {isActive && <Check size={12} className="text-blue-600 shrink-0" />}
      <button
        onClick={(e) => { e.stopPropagation(); setEditing(true); }}
        className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-blue-600 transition-colors"
        title="Rename view"
        aria-label={`Rename view ${view.name}`}
      >
        <Save size={11} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-red-500 transition-colors"
        title="Delete view"
        aria-label={`Delete view ${view.name}`}
      >
        <Trash2 size={11} />
      </button>
    </div>
  );
}

// ── Main drawer ───────────────────────────────────────────────────────────────

interface AdvancedFiltersDrawerProps {
  isOpen: boolean;
  filters: AdvancedLeadsFilters;
  onClose: () => void;
  onApply: (filters: AdvancedLeadsFilters) => void;
  onReset: () => void;
}

export function AdvancedFiltersDrawer({
  isOpen,
  filters,
  onClose,
  onApply,
  onReset,
}: AdvancedFiltersDrawerProps) {
  const [localFilters, setLocalFilters] = useState<AdvancedLeadsFilters>(filters);
  const [saveViewName, setSaveViewName] = useState("");
  const [showSaveView, setShowSaveView] = useState(false);
  const [savingView, setSavingView] = useState(false);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const {
    views,
    loading: viewsLoading,
    activeViewId,
    handleCreateView,
    handleRenameView,
    handleDeleteView,
    handleActivateView,
  } = useSavedViews();

  const updateFilter = useCallback(
    <K extends keyof AdvancedLeadsFilters>(key: K, value: AdvancedLeadsFilters[K]) => {
      setLocalFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  function handleStatusToggle(status: string) {
    const current = localFilters.status === "All Status" ? [] : [localFilters.status];
    const isSelected = current.includes(status);
    const next = isSelected ? current.filter((s) => s !== status) : [...current, status];
    updateFilter("status", next.length === 0 ? "All Status" : next[0]);
  }

  function handleSourceToggle(source: string) {
    const current = localFilters.source === "All Sources" ? [] : [localFilters.source];
    const isSelected = current.includes(source);
    const next = isSelected ? current.filter((s) => s !== source) : [...current, source];
    updateFilter("source", next.length === 0 ? "All Sources" : next[0]);
  }

  async function handleSaveView() {
    if (!saveViewName.trim()) return;
    setSavingView(true);
    try {
      await handleCreateView({ name: saveViewName.trim(), filters: localFilters });
      setSaveViewName("");
      setShowSaveView(false);
    } finally {
      setSavingView(false);
    }
  }

  function handleApplySavedView(view: SavedView) {
    handleActivateView(view.id);
    setLocalFilters({ ...DEFAULT_ADVANCED_FILTERS, ...view.filters });
  }

  const activeFiltersCount = [
    localFilters.status !== "All Status",
    localFilters.source !== "All Sources",
    localFilters.owner !== "All Owners",
    localFilters.search !== "",
    localFilters.tags.length > 0,
    localFilters.dateFrom !== "",
    localFilters.dateTo !== "",
  ].filter(Boolean).length;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} aria-hidden="true" />

      {/* Drawer */}
      <aside
        className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label="Advanced Filters"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-blue-600" />
            <h2 className="text-sm font-bold text-gray-900">Advanced Filters</h2>
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
            aria-label="Close filters"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Status */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Status</p>
            <div className="flex flex-wrap gap-1.5">
              {STATUSES.map((s) => {
                const active = localFilters.status === s;
                return (
                  <button
                    key={s}
                    onClick={() => updateFilter("status", active ? "All Status" : s)}
                    className={`px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all ${
                      active
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                    }`}
                    aria-pressed={active}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Source */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Source</p>
            <div className="flex flex-wrap gap-1.5">
              {SOURCES.map((s) => {
                const active = localFilters.source === s;
                return (
                  <button
                    key={s}
                    onClick={() => updateFilter("source", active ? "All Sources" : s)}
                    className={`px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all ${
                      active
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                    }`}
                    aria-pressed={active}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Owner */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Owner</p>
            <input
              type="text"
              placeholder="Search by owner name…"
              value={localFilters.owner === "All Owners" ? "" : localFilters.owner}
              onChange={(e) => updateFilter("owner", e.target.value || "All Owners")}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Tags */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Tags <span className="text-gray-400 normal-case font-normal">(comma separated)</span>
            </p>
            <input
              type="text"
              placeholder="enterprise, q3, priority…"
              value={localFilters.tags.join(", ")}
              onChange={(e) =>
                updateFilter(
                  "tags",
                  e.target.value.split(",").map((t) => t.trim()).filter(Boolean)
                )
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Date range */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Date Range</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-gray-400 mb-1 block">From</label>
                <input
                  type="date"
                  value={localFilters.dateFrom}
                  onChange={(e) => updateFilter("dateFrom", e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-400 mb-1 block">To</label>
                <input
                  type="date"
                  value={localFilters.dateTo}
                  onChange={(e) => updateFilter("dateTo", e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Sort */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sort By</p>
            <div className="flex gap-2">
              <select
                value={localFilters.sortBy}
                onChange={(e) => updateFilter("sortBy", e.target.value)}
                className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <select
                value={localFilters.sortOrder}
                onChange={(e) => updateFilter("sortOrder", e.target.value as "asc" | "desc")}
                className="w-20 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
            </div>
          </div>

          {/* Page size */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Results Per Page</p>
            {/* Preset chips */}
            <div className="flex gap-2 mb-2">
              {PAGE_SIZE_OPTIONS.map((size) => (
                <button
                  key={size}
                  onClick={() => updateFilter("pageSize", size)}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    localFilters.pageSize === size
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                  }`}
                  aria-pressed={localFilters.pageSize === size}
                >
                  {size}
                </button>
              ))}
            </div>
            {/* Custom value input */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  min={1}
                  max={1000}
                  placeholder="Custom (e.g. 200)"
                  value={PAGE_SIZE_OPTIONS.includes(localFilters.pageSize) ? "" : localFilters.pageSize}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v) && v >= 1) updateFilter("pageSize", v);
                  }}
                  className={`w-full px-3 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                    !PAGE_SIZE_OPTIONS.includes(localFilters.pageSize)
                      ? "border-blue-500 ring-2 ring-blue-100 bg-blue-50/30 font-semibold text-blue-700"
                      : "border-gray-200 text-gray-600"
                  }`}
                />
              </div>
              <span className="text-[11px] text-gray-400 shrink-0">per page</span>
            </div>
            {/* Active indicator for custom value */}
            {!PAGE_SIZE_OPTIONS.includes(localFilters.pageSize) && (
              <p className="mt-1.5 text-[11px] text-blue-600 flex items-center gap-1">
                <Check size={10} />
                Custom: {localFilters.pageSize} per page
              </p>
            )}
          </div>

          {/* Saved views */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Saved Views</p>
              <button
                onClick={() => setShowSaveView((v) => !v)}
                className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
              >
                <Save size={11} />
                Save current
              </button>
            </div>

            {showSaveView && (
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="View name…"
                  value={saveViewName}
                  onChange={(e) => setSaveViewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveView()}
                  className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  onClick={handleSaveView}
                  disabled={!saveViewName.trim() || savingView}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium disabled:opacity-50 flex items-center gap-1"
                >
                  {savingView ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  Save
                </button>
              </div>
            )}

            {viewsLoading ? (
              <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                <Loader2 size={12} className="animate-spin" />
                Loading views…
              </div>
            ) : views.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">No saved views yet. Save your current filters to create one.</p>
            ) : (
              <div className="space-y-1.5">
                {views.map((view) => (
                  <SavedViewItem
                    key={view.id}
                    view={view}
                    isActive={activeViewId === view.id}
                    onActivate={() => handleApplySavedView(view)}
                    onDelete={() => handleDeleteView(view.id)}
                    onRename={(name) => handleRenameView(view.id, name)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={() => {
              setLocalFilters(DEFAULT_ADVANCED_FILTERS);
              onReset();
              handleActivateView(null);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <RotateCcw size={13} />
            Reset
          </button>
          <button
            onClick={() => {
              onApply(localFilters);
              onClose();
            }}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Filter size={14} />
            Apply Filters
            {activeFiltersCount > 0 && (
              <span className="bg-white/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
