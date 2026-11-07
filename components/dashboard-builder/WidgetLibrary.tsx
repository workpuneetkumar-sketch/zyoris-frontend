"use client";

// components/dashboard-builder/WidgetLibrary.tsx
// Premium sidebar widget catalog with module grouping and search.

import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { Search, Plus, X, ChevronDown, ChevronRight, Check, LayoutDashboard } from "lucide-react";
import { WidgetDefinition, WidgetInstance } from "@/types/dashboard-builder";
import { getWidgetCatalogGroups } from "./WidgetRegistry";
import { useAuth } from "@/context/AuthContext";

interface WidgetLibraryProps {
  catalog: WidgetDefinition[];
  widgets: WidgetInstance[];
  isOpen: boolean;
  onClose: () => void;
  onAdd: (def: WidgetDefinition) => void;
}

const MODULE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Executive": { bg: "#fef3c7", text: "#d97706", border: "#fde68a" },
  "Analytics": { bg: "#dbeafe", text: "#2563eb", border: "#bfdbfe" },
  "CRM": { bg: "#ede9fe", text: "#7c3aed", border: "#ddd6fe" },
  "Sales": { bg: "#d1fae5", text: "#059669", border: "#a7f3d0" },
  "Finance": { bg: "#dcfce7", text: "#16a34a", border: "#bbf7d0" },
  "HR": { bg: "#fce7f3", text: "#db2777", border: "#fbcfe8" },
  "Projects": { bg: "#e0f2fe", text: "#0284c7", border: "#bae6fd" },
  "Tasks": { bg: "#f3e8ff", text: "#9333ea", border: "#e9d5ff" },
  "Activities": { bg: "#fff7ed", text: "#ea580c", border: "#fed7aa" },
  "Operations": { bg: "#fdf4ff", text: "#a21caf", border: "#f5d0fe" },
  "Communications": { bg: "#ecfdf5", text: "#059669", border: "#a7f3d0" },
  "Marketing": { bg: "#fff1f2", text: "#e11d48", border: "#fecdd3" },
  "AI & Insights": { bg: "#f5f3ff", text: "#7c3aed", border: "#ddd6fe" },
};

function WidgetCard({
  def,
  isAdded,
  onAdd,
}: {
  def: WidgetDefinition;
  isAdded: boolean;
  onAdd: (def: WidgetDefinition) => void;
}) {
  const color = MODULE_COLORS[def.module] ?? { bg: "#f8fafc", text: "#64748b", border: "#e2e8f0" };

  return (
    <button
      type="button"
      onClick={() => {
        if (!isAdded) onAdd(def);
      }}
      disabled={isAdded}
      aria-label={isAdded ? `${def.title} added` : `Add ${def.title}`}
      className={`group w-full flex items-center gap-3 p-2.5 rounded-xl border bg-white transition-all text-left ${
        isAdded
          ? "border-emerald-100 cursor-default"
          : "border-gray-100 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-50/50"
      }`}
    >
      {/* Icon */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 border"
        style={{ backgroundColor: color.bg, borderColor: color.border }}
      >
        {def.icon}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-900 truncate">{def.title}</p>
        {def.description && (
          <p className="text-[10px] text-gray-400 truncate">{def.description}</p>
        )}
      </div>

      {/* Status */}
      {isAdded ? (
        <span className="flex h-7 shrink-0 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 text-[10px] font-semibold text-emerald-700">
          <Check size={12} />Added
        </span>
      ) : (
        <div className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <Plus size={12} className="text-indigo-600" />
        </div>
      )}
    </button>
  );
}

function ModuleGroup({
  module,
  widgets,
  query,
  addedWidgetIds,
  filter,
  onAdd,
  color,
}: {
  module: string;
  widgets: WidgetDefinition[];
  query: string;
  addedWidgetIds: Set<string>;
  filter: "all" | "added" | "not-added";
  onAdd: (def: WidgetDefinition) => void;
  color: { bg: string; text: string; border: string };
}) {
  const [collapsed, setCollapsed] = useState(false);
  const searched = query && !module.toLowerCase().includes(query)
    ? widgets.filter(
        (widget) =>
          widget.title.toLowerCase().includes(query) ||
          (widget.description ?? "").toLowerCase().includes(query)
      )
    : widgets;
  const filtered = searched.filter((widget) => {
      const isAdded = addedWidgetIds.has(widget.id);
      return filter === "all" || (filter === "added" ? isAdded : !isAdded);
  });

  if (filtered.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setCollapsed((p) => !p)}
        className="w-full flex items-center gap-2 mb-2 group"
      >
        <div
          className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] border"
          style={{ backgroundColor: color.bg, borderColor: color.border }}
        >
          {collapsed ? (
            <ChevronRight size={10} style={{ color: color.text }} />
          ) : (
            <ChevronDown size={10} style={{ color: color.text }} />
          )}
        </div>
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: color.text }}>
          {module}
        </p>
        <span
          className="ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-full border"
          style={{ backgroundColor: color.bg, color: color.text, borderColor: color.border }}
        >
          {filtered.length}
        </span>
      </button>
      {!collapsed && (
        <div className="space-y-1.5 ml-1">
          {filtered.map((def) => (
            <WidgetCard key={def.id} def={def} isAdded={addedWidgetIds.has(def.id)} onAdd={onAdd} />
          ))}
        </div>
      )}
    </div>
  );
}

export function WidgetLibrary({ catalog, widgets, isOpen, onClose, onAdd }: WidgetLibraryProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "added" | "not-added">("all");
  const { userPermissions, isAdmin } = useAuth();

  // Keep the registry as the source for the original categories and widget icons.
  const groups = useMemo(() => getWidgetCatalogGroups(userPermissions, isAdmin), [userPermissions, isAdmin]);
  const libraryWidgets = useMemo(() => groups.flatMap((group) => group.widgets), [groups]);
  const lowerQuery = query.toLowerCase().trim();
  const addedWidgetIds = useMemo(
    () => new Set(widgets.map((widget) => widget.widgetId)),
    [widgets]
  );
  const addedCount = libraryWidgets.filter((widget) => addedWidgetIds.has(widget.id)).length;
  const availableCount = libraryWidgets.length;
  const progress = availableCount ? Math.min((addedCount / availableCount) * 100, 100) : 0;

  // Total filtered count
  const totalFiltered = useMemo(() => {
    if (!lowerQuery) return libraryWidgets.length;
    return libraryWidgets.filter(
      (w) =>
        w.title.toLowerCase().includes(lowerQuery) ||
        (w.description ?? "").toLowerCase().includes(lowerQuery) ||
        (w.module ?? "").toLowerCase().includes(lowerQuery)
    ).length;
  }, [libraryWidgets, lowerQuery]);

  if (!isOpen) return null;

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      {/* Backdrop (mobile) */}
      <div
        className="fixed inset-0 z-[9999] bg-black/20 backdrop-blur-sm lg:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        aria-label="Widget Library"
        className="fixed right-0 top-0 bottom-0 z-[10000] flex min-h-0 w-72 flex-col overflow-hidden border-l border-gray-100 bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-violet-50">
          <div>
            <p className="text-sm font-bold text-gray-900">Widget Library</p>
            <p className="text-[10px] text-gray-400">{totalFiltered} widgets available</p>
          </div>
          <button
            onClick={onClose}
            type="button"
            aria-label="Close Widget Library"
            className="w-8 h-8 rounded-xl flex items-center justify-center bg-white border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="shrink-0 border-b border-gray-100 px-4 py-3">
          <div className="mb-2 flex items-center justify-between text-[10px]">
            <span className="font-medium text-gray-500">Dashboard setup</span>
            <span className="font-semibold text-gray-700">{addedCount}/{availableCount}</span>
          </div>
          <div
            role="progressbar"
            aria-label="Added widgets"
            aria-valuemin={0}
            aria-valuemax={availableCount}
            aria-valuenow={addedCount}
            className="h-1.5 overflow-hidden rounded-full bg-gray-100"
          >
            <div className="h-full rounded-full bg-emerald-500 transition-[width]" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Search */}
        <div className="shrink-0 border-b border-gray-100 px-4 py-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              aria-label="Search widgets"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search widgets…"
              className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-xl bg-gray-50 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 transition-all"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={11} />
              </button>
            )}
          </div>
        </div>

        <div className="flex shrink-0 gap-1 border-b border-gray-100 px-4 py-2">
          {([
            ["all", "All"],
            ["added", "Added"],
            ["not-added", "Not Added"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                filter === value
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              }`}
            >
              {label}{value === "added" ? ` (${addedCount})` : value === "not-added" ? ` (${Math.max(0, availableCount - addedCount)})` : ""}
            </button>
          ))}
        </div>

        {/* Groups */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-4">
          {groups.map(({ module, widgets }) => {
            const color = MODULE_COLORS[module] ?? { bg: "#f8fafc", text: "#64748b", border: "#e2e8f0" };
            return (
              <ModuleGroup
                key={module}
                module={module}
                widgets={widgets}
                query={lowerQuery}
                addedWidgetIds={addedWidgetIds}
                filter={filter}
                onAdd={onAdd}
                color={color}
              />
            );
          })}

          {totalFiltered === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-2xl mb-2">🔍</p>
              <p className="text-xs text-gray-500">No widgets match "{query}"</p>
            </div>
          )}

          {totalFiltered > 0 && filter !== "all" && !groups.some(({ widgets }) =>
            widgets.some((widget) =>
              (!lowerQuery ||
                widget.title.toLowerCase().includes(lowerQuery) ||
                (widget.description ?? "").toLowerCase().includes(lowerQuery)) &&
              (filter === "added"
                ? addedWidgetIds.has(widget.id)
                : !addedWidgetIds.has(widget.id))
            )
          ) && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <LayoutDashboard size={24} className="mb-2 text-gray-300" />
              <p className="text-xs text-gray-500">No {filter === "added" ? "added" : "available"} widgets match.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-[10px] text-gray-400 text-center">
            Click a widget to add it to your dashboard
          </p>
        </div>
      </aside>
    </>,
    document.body
  );
}
