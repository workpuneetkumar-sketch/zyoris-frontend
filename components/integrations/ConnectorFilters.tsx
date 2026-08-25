import React from "react";
import { Search, X, Filter, RotateCcw } from "lucide-react";
import { ConnectorCategory } from "@/types/integrations";
import { StatusFilter } from "@/hooks/useIntegrations";

interface ConnectorFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: ConnectorCategory | "ALL";
  onCategoryChange: (category: ConnectorCategory | "ALL") => void;
  selectedStatus: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  totalCount: number;
  filteredCount: number;
  onResetFilters: () => void;
}

const CATEGORIES: Array<{ id: ConnectorCategory | "ALL"; label: string }> = [
  { id: "ALL", label: "All Categories" },
  { id: "CRM", label: "CRM" },
  { id: "FINANCE", label: "Finance" },
  { id: "MARKETING", label: "Marketing" },
  { id: "COMMUNICATIONS", label: "Communications" },
  { id: "HR", label: "HR" },
  { id: "PROJECTS", label: "Projects" },
  { id: "CUSTOM", label: "Custom" },
];

export function ConnectorFilters({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedStatus,
  onStatusChange,
  totalCount,
  filteredCount,
  onResetFilters,
}: ConnectorFiltersProps) {
  const isFiltered =
    searchQuery.trim() !== "" ||
    selectedCategory !== "ALL" ||
    selectedStatus !== "ALL";

  return (
    <div className="space-y-4">
      {/* Top row: Search & Status Dropdown & Action */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search connectors by name, capability, provider..."
            className="w-full pl-9 pr-9 py-2 bg-surface text-text text-sm rounded-lg border border-border focus:border-primary focus:outline-none transition-colors placeholder:text-text-muted"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status Dropdown and Reset */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-text-secondary">
            <Filter className="w-3.5 h-3.5 text-text-muted" />
            <select
              value={selectedStatus}
              onChange={(e) => onStatusChange(e.target.value as StatusFilter)}
              className="bg-transparent text-text text-sm font-medium focus:outline-none cursor-pointer"
              aria-label="Filter by connection status"
            >
              <option value="ALL" className="bg-surface text-text">
                All Statuses
              </option>
              <option value="CONNECTED" className="bg-surface text-text">
                Connected
              </option>
              <option value="NOT_CONNECTED" className="bg-surface text-text">
                Not Connected
              </option>
              <option value="ACTIVE" className="bg-surface text-text">
                Active
              </option>
              <option value="PAUSED" className="bg-surface text-text">
                Paused
              </option>
              <option value="ERROR" className="bg-surface text-text">
                Needs Attention
              </option>
            </select>
          </div>

          {isFiltered && (
            <button
              onClick={onResetFilters}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-surface text-text-secondary hover:text-text hover:bg-surface-hover text-xs font-medium transition-colors"
              title="Reset all filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                isSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-surface text-text-secondary border-border hover:bg-surface-hover hover:text-text"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>
          Showing {filteredCount} of {totalCount} connectors
        </span>
        {isFiltered && (
          <span className="text-primary font-medium">Filters active</span>
        )}
      </div>
    </div>
  );
}
