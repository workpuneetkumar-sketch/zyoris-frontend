"use client";

// components/dashboard-builder/WidgetLibrary.tsx
// Premium sidebar widget catalog with module grouping and search.

import { useState, useMemo } from "react";
import { Search, Plus, X, ChevronDown, ChevronRight } from "lucide-react";
import { WidgetDefinition } from "@/types/dashboard-builder";
import { getWidgetCatalogGroups } from "./WidgetRegistry";

interface WidgetLibraryProps {
  catalog: WidgetDefinition[];
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

function WidgetCard({ def, onAdd }: { def: WidgetDefinition; onAdd: (def: WidgetDefinition) => void }) {
  const color = MODULE_COLORS[def.module] ?? { bg: "#f8fafc", text: "#64748b", border: "#e2e8f0" };

  return (
    <button
      onClick={() => onAdd(def)}
      className="group w-full flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 bg-white hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-50/50 transition-all text-left"
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

      {/* Add button */}
      <div className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <Plus size={12} className="text-indigo-600" />
      </div>
    </button>
  );
}

function ModuleGroup({
  module,
  widgets,
  query,
  onAdd,
  color,
}: {
  module: string;
  widgets: WidgetDefinition[];
  query: string;
  onAdd: (def: WidgetDefinition) => void;
  color: { bg: string; text: string; border: string };
}) {
  const [collapsed, setCollapsed] = useState(false);
  const filtered = query
    ? widgets.filter(
        (w) =>
          w.title.toLowerCase().includes(query) ||
          (w.description ?? "").toLowerCase().includes(query)
      )
    : widgets;

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
            <WidgetCard key={def.id} def={def} onAdd={onAdd} />
          ))}
        </div>
      )}
    </div>
  );
}

export function WidgetLibrary({ catalog, isOpen, onClose, onAdd }: WidgetLibraryProps) {
  const [query, setQuery] = useState("");

  // Use grouped catalog from registry
  const groups = useMemo(() => getWidgetCatalogGroups(), []);
  const lowerQuery = query.toLowerCase().trim();

  // Total filtered count
  const totalFiltered = useMemo(() => {
    if (!lowerQuery) return catalog.length;
    return catalog.filter(
      (w) =>
        w.title.toLowerCase().includes(lowerQuery) ||
        (w.description ?? "").toLowerCase().includes(lowerQuery) ||
        (w.module ?? "").toLowerCase().includes(lowerQuery)
    ).length;
  }, [catalog, lowerQuery]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop (mobile) */}
      <div
        className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm lg:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <aside className="fixed right-0 top-0 bottom-0 z-40 w-72 bg-white border-l border-gray-100 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-violet-50">
          <div>
            <p className="text-sm font-bold text-gray-900">Widget Library</p>
            <p className="text-[10px] text-gray-400">{totalFiltered} widgets available</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center bg-white border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
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

        {/* Groups */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {groups.map(({ module, widgets }) => {
            const color = MODULE_COLORS[module] ?? { bg: "#f8fafc", text: "#64748b", border: "#e2e8f0" };
            return (
              <ModuleGroup
                key={module}
                module={module}
                widgets={widgets}
                query={lowerQuery}
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
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-[10px] text-gray-400 text-center">
            Click a widget to add it to your dashboard
          </p>
        </div>
      </aside>
    </>
  );
}
