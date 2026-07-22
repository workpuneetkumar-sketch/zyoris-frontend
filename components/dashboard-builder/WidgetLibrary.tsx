"use client";

import { Loader2, Puzzle, Search, X } from "lucide-react";
import { useState, useMemo } from "react";
import { WidgetDefinition } from "@/types/dashboard-builder";
import { WidgetLibraryItem } from "./WidgetLibraryItem";

interface WidgetLibraryProps {
  catalog: WidgetDefinition[];
  onAddWidget: (definition: WidgetDefinition) => void;
  isPreview: boolean;
  isLoading: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  Finance: "bg-blue-100 text-blue-700 hover:bg-blue-200",
  Analytics: "bg-violet-100 text-violet-700 hover:bg-violet-200",
  Sales: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
  Activity: "bg-amber-100 text-amber-700 hover:bg-amber-200",
  Tasks: "bg-rose-100 text-rose-700 hover:bg-rose-200",
};

export function WidgetLibrary({
  catalog,
  onAddWidget,
  isPreview,
  isLoading,
}: WidgetLibraryProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // ── Extract unique categories ───────────────────────────────────────────────
  const categories = useMemo(() => {
    const set = new Set(catalog.map((w) => w.category));
    return Array.from(set).sort();
  }, [catalog]);

  // ── Filter by search + category ────────────────────────────────────────────
  const filteredCatalog = useMemo(() => {
    let list = catalog;
    if (activeCategory) {
      list = list.filter((w) => w.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (w) =>
          w.title.toLowerCase().includes(q) ||
          w.description?.toLowerCase().includes(q) ||
          w.type.toLowerCase().includes(q) ||
          w.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [catalog, search, activeCategory]);

  // ── Group filtered results by type ──────────────────────────────────────────
  const grouped = useMemo(() => {
    const map: Record<string, WidgetDefinition[]> = {};
    const typeOrder = ["kpi", "chart", "table", "activity", "tasks"] as const;
    const typeLabels: Record<string, string> = {
      kpi: "Key Performance Indicators",
      chart: "Charts & Graphs",
      table: "Data Tables",
      activity: "Activity Feeds",
      tasks: "Task Views",
    };
    for (const t of typeOrder) {
      const items = filteredCatalog.filter((w) => w.type === t);
      if (items.length > 0) {
        map[typeLabels[t] ?? t] = items;
      }
    }
    return map;
  }, [filteredCatalog]);

  const clearFilters = () => {
    setSearch("");
    setActiveCategory(null);
  };

  const hasActiveFilters = search.trim() !== "" || activeCategory !== null;

  // Hidden in preview mode
  if (isPreview) return null;

  return (
    <aside className="w-[280px] shrink-0 border-r border-gray-200 bg-white flex flex-col" role="complementary" aria-label="Widget Library">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Widget Library
          </h2>
          <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
            {filteredCatalog.length}/{catalog.length}
          </span>
        </div>
        <p className="text-[11px] text-gray-400 mb-2">
          Click a widget to add it to the canvas
        </p>
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
          <input
            type="text"
            placeholder="Search widgets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search widgets"
            className="w-full pl-8 pr-8 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-300 focus:ring-1 focus:ring-blue-100 outline-none transition-all placeholder:text-gray-300 text-gray-600"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
        {/* Category filter chips */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2" role="group" aria-label="Filter by category">
            <button
              onClick={() => setActiveCategory(null)}
              className={`text-[10px] font-semibold px-2 py-1 rounded-full transition-colors ${
                activeCategory === null
                  ? "bg-gray-800 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
              aria-pressed={activeCategory === null}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={`text-[10px] font-semibold px-2 py-1 rounded-full transition-colors ${
                  activeCategory === cat
                    ? "bg-gray-800 text-white"
                    : CATEGORY_COLORS[cat] ?? "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
                aria-pressed={activeCategory === cat}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {isLoading ? (
          <div className="space-y-3 pt-4" role="status" aria-label="Loading widgets">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-[60px] rounded-xl bg-gray-50 animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : filteredCatalog.length === 0 ? (
          <div className="flex flex-col items-center gap-3 mt-12 text-center">
            <Puzzle size={28} className="text-gray-200" />
            <div>
              <p className="text-sm font-semibold text-gray-500">No widgets found</p>
              <p className="text-xs text-gray-400 mt-1">
                {hasActiveFilters
                  ? "Try adjusting your search or filter"
                  : "Widget catalog is empty"}
              </p>
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          Object.entries(grouped).map(([label, items]) => (
            <div key={label} className="pt-4 first:pt-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-300 px-1 pb-2">
                {label}
                <span className="ml-1.5 font-normal text-gray-200">({items.length})</span>
              </p>
              <div className="space-y-1.5">
                {items.map((widget) => (
                  <WidgetLibraryItem
                    key={widget.id}
                    widget={widget}
                    onAdd={() => onAddWidget(widget)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
