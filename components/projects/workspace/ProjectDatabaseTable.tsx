"use client";

import React, { useState, useMemo } from "react";
import {
  WorkspaceDatabase,
  WorkspaceDatabaseProperty,
  WorkspaceDatabaseRow,
  DatabasePropertyType,
  DatabaseViewType,
} from "@/types/workspace";
import {
  addDatabaseProperty,
  createDatabaseRow,
  updateDatabaseRow,
  deleteDatabaseRow,
} from "@/lib/api/workspaceApi";
import {
  Plus,
  Trash2,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Type,
  Hash,
  Calendar,
  CheckSquare,
  ListFilter,
  Layers,
  X,
  Loader2,
  Table as TableIcon,
  Tag,
  Link as LinkIcon,
  Filter,
  FileSpreadsheet,
  Kanban,
  LayoutGrid,
  List as ListIcon,
  SlidersHorizontal,
  ChevronDown,
  MoreHorizontal,
  FolderOpen,
  Download,
} from "lucide-react";
import { DatabaseImportWizardModal } from "./DatabaseImportWizardModal";
import { ExportModal } from "@/components/workspace/ExportModal";

interface ProjectDatabaseTableProps {
  database: WorkspaceDatabase;
  onRefresh?: () => void;
  projectId?: string;
  projectName?: string;
}

export interface AdvancedFilterRule {
  id: string;
  column: string;
  operator:
    | "contains"
    | "equals"
    | "starts_with"
    | "is_empty"
    | "is_not_empty"
    | "gt"
    | "lt";
  value: string;
}

const PROPERTY_TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  text: { label: "Text", icon: Type, color: "text-blue-500" },
  TEXT: { label: "Text", icon: Type, color: "text-blue-500" },
  number: { label: "Number", icon: Hash, color: "text-emerald-500" },
  NUMBER: { label: "Number", icon: Hash, color: "text-emerald-500" },
  select: { label: "Select", icon: Tag, color: "text-purple-500" },
  SELECT: { label: "Select", icon: Tag, color: "text-purple-500" },
  multi_select: { label: "Multi-Select", icon: Tag, color: "text-indigo-500" },
  MULTI_SELECT: { label: "Multi-Select", icon: Tag, color: "text-indigo-500" },
  date: { label: "Date", icon: Calendar, color: "text-amber-500" },
  DATE: { label: "Date", icon: Calendar, color: "text-amber-500" },
  checkbox: { label: "Checkbox", icon: CheckSquare, color: "text-pink-500" },
  CHECKBOX: { label: "Checkbox", icon: CheckSquare, color: "text-pink-500" },
  url: { label: "URL", icon: LinkIcon, color: "text-cyan-500" },
  URL: { label: "URL", icon: LinkIcon, color: "text-cyan-500" },
};

export const ProjectDatabaseTable: React.FC<ProjectDatabaseTableProps> = ({
  database,
  onRefresh,
  projectId,
  projectName,
}) => {
  const [properties, setProperties] = useState<WorkspaceDatabaseProperty[]>(
    database.properties || [
      { id: "prop-1", name: "Name", type: "TEXT" },
      { id: "prop-2", name: "Status", type: "SELECT", options: ["Todo", "In Progress", "Done"] },
    ]
  );
  const [rows, setRows] = useState<WorkspaceDatabaseRow[]>(database.rows || []);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);

  // Active View mode: Table, Board, List, Gallery
  const [activeView, setActiveView] = useState<"table" | "board" | "list" | "gallery">("table");

  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Global Quick Search
  const [searchQuery, setSearchQuery] = useState("");

  // Advanced Multi-Rule Filter Popover State
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);
  const [filterRules, setFilterRules] = useState<AdvancedFilterRule[]>([]);

  // Add Column Modal
  const [isAddPropModalOpen, setIsAddPropModalOpen] = useState(false);
  const [newPropName, setNewPropName] = useState("");
  const [newPropType, setNewPropType] = useState<DatabasePropertyType>("TEXT");
  const [newPropOptions, setNewPropOptions] = useState("");
  const [isSubmittingProp, setIsSubmittingProp] = useState(false);
  const [propError, setPropError] = useState<string | null>(null);

  // Import Wizard Modal (Day 4 Feature)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Day 5: Database Export Modal
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Synchronize when database prop changes
  React.useEffect(() => {
    if (database.properties?.length) setProperties(database.properties);
    if (database.rows) setRows(database.rows);
  }, [database]);

  // ── Handle Add Column ──────────────────────────────────────────────────
  const handleAddProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPropName.trim()) return;

    setIsSubmittingProp(true);
    setPropError(null);

    const optionsArray = newPropOptions
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);

    try {
      const payload: any = {
        name: newPropName.trim(),
        type: (newPropType as string).toUpperCase(),
      };
      if (optionsArray.length > 0) {
        payload.options = optionsArray;
      }

      if (database.id) {
        const createdProp = await addDatabaseProperty(database.id, payload);
        setProperties((prev) => [...prev, createdProp]);
      } else {
        const mockProp: WorkspaceDatabaseProperty = {
          id: `prop-${Date.now()}`,
          name: newPropName.trim(),
          type: (newPropType as string).toUpperCase() as DatabasePropertyType,
          options: optionsArray,
        };
        setProperties((prev) => [...prev, mockProp]);
      }

      setNewPropName("");
      setNewPropType("TEXT");
      setNewPropOptions("");
      setIsAddPropModalOpen(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      const detailsMsg = err?.response?.data?.details
        ?.map((d: any) => `${d.field ? d.field + ": " : ""}${d.message}`)
        .join(", ");
      setPropError(
        detailsMsg || err?.response?.data?.message || err.message || "Failed to add column"
      );
    } finally {
      setIsSubmittingProp(false);
    }
  };

  // ── Handle Add Row ─────────────────────────────────────────────────────
  const handleAddRow = async (initialData?: Record<string, any>) => {
    const defaultData: Record<string, any> = { ...(initialData || {}) };
    properties.forEach((prop) => {
      if (defaultData[prop.name] !== undefined) return;
      const lower = (prop.type || "").toLowerCase();
      if (lower === "checkbox") {
        defaultData[prop.name] = false;
      } else if (lower === "number") {
        defaultData[prop.name] = null;
      } else if (prop.name.toLowerCase() === "name" || prop.name.toLowerCase() === "title") {
        defaultData[prop.name] = `New Entry ${rows.length + 1}`;
      } else {
        defaultData[prop.name] = "";
      }
    });

    try {
      if (database.id) {
        const createdRow = await createDatabaseRow(database.id, defaultData);
        setRows((prev) => [createdRow, ...prev]);
      } else {
        const mockRow: WorkspaceDatabaseRow = {
          id: `row-${Date.now()}`,
          databaseId: database.id,
          data: defaultData,
          createdAt: new Date().toISOString(),
        };
        setRows((prev) => [mockRow, ...prev]);
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Failed to create row:", err);
    }
  };

  // ── Handle Cell Edit ───────────────────────────────────────────────────
  const handleCellChange = async (
    rowId: string,
    propertyName: string,
    newValue: any
  ) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id === rowId) {
          return {
            ...r,
            data: {
              ...r.data,
              [propertyName]: newValue,
            },
          };
        }
        return r;
      })
    );

    try {
      setSavingRowId(rowId);
      if (database.id) {
        await updateDatabaseRow(database.id, rowId, {
          [propertyName]: newValue,
        });
      }
    } catch (err) {
      console.error("Failed to persist cell edit:", err);
    } finally {
      setSavingRowId(null);
    }
  };

  // ── Handle Delete Row ──────────────────────────────────────────────────
  const handleDeleteRow = async (rowId: string) => {
    setRows((prev) => prev.filter((r) => r.id !== rowId));
    try {
      if (database.id) {
        await deleteDatabaseRow(database.id, rowId);
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Failed to delete database row:", err);
    }
  };

  // ── Sorting ────────────────────────────────────────────────────────────
  const toggleSort = (colName: string) => {
    if (sortColumn === colName) {
      if (sortDirection === "asc") setSortDirection("desc");
      else setSortColumn(null);
    } else {
      setSortColumn(colName);
      setSortDirection("asc");
    }
  };

  // ── Filter Rule Management ─────────────────────────────────────────────
  const addFilterRule = () => {
    const firstCol = properties[0]?.name || "Name";
    setFilterRules((prev) => [
      ...prev,
      {
        id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        column: firstCol,
        operator: "contains",
        value: "",
      },
    ]);
  };

  const updateFilterRule = (
    id: string,
    field: keyof AdvancedFilterRule,
    value: string
  ) => {
    setFilterRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const removeFilterRule = (id: string) => {
    setFilterRules((prev) => prev.filter((r) => r.id !== id));
  };

  const clearAllFilters = () => {
    setFilterRules([]);
    setSearchQuery("");
    setSortColumn(null);
  };

  // ── Processed Rows Calculation ─────────────────────────────────────────
  const processedRows = useMemo(() => {
    let result = [...rows];

    // Global Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((r) => {
        return Object.values(r.data || {}).some((val) => {
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(q);
        });
      });
    }

    // Multi-Rule Advanced Filters
    if (filterRules.length > 0) {
      result = result.filter((row) => {
        return filterRules.every((rule) => {
          const rawVal = row.data?.[rule.column];
          const strVal = rawVal !== undefined && rawVal !== null ? String(rawVal).toLowerCase() : "";
          const target = (rule.value || "").toLowerCase().trim();

          switch (rule.operator) {
            case "contains":
              return strVal.includes(target);
            case "equals":
              return strVal === target;
            case "starts_with":
              return strVal.startsWith(target);
            case "is_empty":
              return rawVal === "" || rawVal === null || rawVal === undefined;
            case "is_not_empty":
              return rawVal !== "" && rawVal !== null && rawVal !== undefined;
            case "gt":
              return Number(rawVal) > Number(rule.value);
            case "lt":
              return Number(rawVal) < Number(rule.value);
            default:
              return true;
          }
        });
      });
    }

    // Sorting
    if (sortColumn) {
      result.sort((a, b) => {
        const valA = a.data?.[sortColumn];
        const valB = b.data?.[sortColumn];

        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;

        if (typeof valA === "number" && typeof valB === "number") {
          return sortDirection === "asc" ? valA - valB : valB - valA;
        }

        if (typeof valA === "boolean" && typeof valB === "boolean") {
          return sortDirection === "asc"
            ? (valA ? 1 : 0) - (valB ? 1 : 0)
            : (valB ? 1 : 0) - (valA ? 1 : 0);
        }

        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        const comp = strA.localeCompare(strB);
        return sortDirection === "asc" ? comp : -comp;
      });
    }

    return result;
  }, [rows, searchQuery, filterRules, sortColumn, sortDirection]);

  // Board View Grouping Property (Detect select/status property or fallback to first column)
  const boardGroupProperty = useMemo(() => {
    return (
      properties.find(
        (p) =>
          (p.type || "").toLowerCase() === "select" ||
          p.name.toLowerCase() === "status" ||
          p.name.toLowerCase() === "priority"
      ) || properties[0]
    );
  }, [properties]);

  const boardColumns = useMemo(() => {
    if (!boardGroupProperty) return ["General"];
    if (Array.isArray(boardGroupProperty.options) && boardGroupProperty.options.length > 0) {
      return [...boardGroupProperty.options, "Unassigned"];
    }
    return ["To Do", "In Progress", "Done", "Backlog"];
  }, [boardGroupProperty]);

  return (
    <div className="space-y-4">
      {/* ── Table Toolbar Controls ─────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
        {/* Left Side: View Switcher Tabs + Search + Filter */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Database Views Switcher */}
          <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <button
              onClick={() => setActiveView("table")}
              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                activeView === "table"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
              title="Table View"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              onClick={() => setActiveView("board")}
              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                activeView === "board"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
              title="Board (Kanban) View"
            >
              <Kanban className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Board</span>
            </button>
            <button
              onClick={() => setActiveView("list")}
              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                activeView === "list"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
              title="Compact List View"
            >
              <ListIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">List</span>
            </button>
            <button
              onClick={() => setActiveView("gallery")}
              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                activeView === "gallery"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
              title="Gallery Card View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Gallery</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[180px] flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search table rows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-7 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-white placeholder-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Multi-Rule Filter Button */}
          <div className="relative">
            <button
              onClick={() => setIsFilterPopoverOpen((prev) => !prev)}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                filterRules.length > 0
                  ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-300"
                  : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
              }`}
            >
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Filter</span>
              {filterRules.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] inline-flex items-center justify-center font-bold">
                  {filterRules.length}
                </span>
              )}
            </button>

            {/* Filter Popover Modal */}
            {isFilterPopoverOpen && (
              <div className="absolute left-0 top-full mt-2 z-30 w-80 sm:w-96 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center space-x-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Multi-Rule Database Filters
                    </span>
                  </div>
                  <button
                    onClick={() => setIsFilterPopoverOpen(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {filterRules.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">
                    No active filters. Click below to filter by any property.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {filterRules.map((rule) => (
                      <div
                        key={rule.id}
                        className="flex items-center gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs"
                      >
                        <select
                          value={rule.column}
                          onChange={(e) => updateFilterRule(rule.id, "column", e.target.value)}
                          className="bg-transparent font-semibold text-slate-700 dark:text-slate-300 focus:outline-none max-w-[90px] truncate"
                        >
                          {properties.map((p) => (
                            <option key={p.id} value={p.name}>
                              {p.name}
                            </option>
                          ))}
                        </select>

                        <select
                          value={rule.operator}
                          onChange={(e) =>
                            updateFilterRule(rule.id, "operator", e.target.value as any)
                          }
                          className="bg-transparent text-slate-500 focus:outline-none text-[11px]"
                        >
                          <option value="contains">contains</option>
                          <option value="equals">equals</option>
                          <option value="starts_with">starts with</option>
                          <option value="is_empty">is empty</option>
                          <option value="is_not_empty">is not empty</option>
                          <option value="gt">&gt; greater than</option>
                          <option value="lt">&lt; less than</option>
                        </select>

                        {rule.operator !== "is_empty" && rule.operator !== "is_not_empty" && (
                          <input
                            type="text"
                            placeholder="Value..."
                            value={rule.value}
                            onChange={(e) => updateFilterRule(rule.id, "value", e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none"
                          />
                        )}

                        <button
                          onClick={() => removeFilterRule(rule.id)}
                          className="text-slate-400 hover:text-red-500 p-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <button
                    onClick={addFilterRule}
                    className="inline-flex items-center space-x-1 text-blue-600 hover:underline font-semibold"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Filter Rule</span>
                  </button>
                  {filterRules.length > 0 && (
                    <button
                      onClick={clearAllFilters}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {(searchQuery || filterRules.length > 0 || sortColumn) && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline px-2 py-1 font-medium"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Right Side: Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Day 4: Import (CSV/XLSX) Wizard Button */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Import (CSV/XLSX)</span>
          </button>

          {/* Day 5: Export Database Controls */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-semibold transition"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <span>Export Data</span>
          </button>

          <button
            onClick={() => setIsAddPropModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" />
            <span>Add Property</span>
          </button>

          <button
            onClick={() => handleAddRow()}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Row</span>
          </button>
        </div>
      </div>

      {/* ── Active View Rendering ───────────────────────────────────────── */}
      {/* 1. TABLE VIEW */}
      {activeView === "table" && (
        <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">
                  <th className="p-3 w-10 text-center border-r border-slate-200/60 dark:border-slate-800">
                    #
                  </th>
                  {properties.map((prop) => {
                    const conf =
                      PROPERTY_TYPE_CONFIG[prop.type] || PROPERTY_TYPE_CONFIG.text;
                    const IconComp = conf.icon;
                    const isSorted = sortColumn === prop.name;

                    return (
                      <th
                        key={prop.id}
                        onClick={() => toggleSort(prop.name)}
                        className="p-3 border-r border-slate-200/60 dark:border-slate-800 min-w-[160px] cursor-pointer hover:bg-slate-100/70 dark:hover:bg-slate-800 transition select-none group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <IconComp className={`w-3.5 h-3.5 ${conf.color}`} />
                            <span className="font-semibold text-slate-700 dark:text-slate-200">
                              {prop.name}
                            </span>
                          </div>
                          <div className="text-slate-400 group-hover:text-slate-600">
                            {isSorted ? (
                              sortDirection === "asc" ? (
                                <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                              ) : (
                                <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-60 transition" />
                            )}
                          </div>
                        </div>
                      </th>
                    );
                  })}
                  <th className="p-3 w-12 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {processedRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={properties.length + 2}
                      className="py-12 text-center text-slate-400"
                    >
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <FolderOpen className="w-8 h-8 text-slate-300" />
                        <span className="font-medium text-xs">No records found matching filters</span>
                        <button
                          onClick={() => handleAddRow()}
                          className="text-blue-600 hover:underline text-xs"
                        >
                          + Create a new entry
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  processedRows.map((row, idx) => (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 group transition"
                    >
                      <td className="p-2 text-center text-[10px] text-slate-400 font-mono border-r border-slate-100 dark:border-slate-800 bg-slate-50/20">
                        {idx + 1}
                      </td>

                      {properties.map((prop) => {
                        const lowerType = (prop.type || "").toLowerCase();
                        const value = row.data?.[prop.name];

                        return (
                          <td
                            key={prop.id}
                            className="p-2 border-r border-slate-100 dark:border-slate-800 min-w-[160px]"
                          >
                            {lowerType === "checkbox" ? (
                              <div className="flex items-center justify-center py-1">
                                <input
                                  type="checkbox"
                                  checked={Boolean(value)}
                                  onChange={(e) =>
                                    handleCellChange(row.id, prop.name, e.target.checked)
                                  }
                                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 dark:bg-slate-800 cursor-pointer"
                                />
                              </div>
                            ) : lowerType === "select" ? (
                              <select
                                value={value || ""}
                                onChange={(e) =>
                                  handleCellChange(row.id, prop.name, e.target.value)
                                }
                                className="w-full bg-transparent px-2 py-1 rounded text-xs border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none transition"
                              >
                                <option value="">Select option...</option>
                                {Array.isArray(prop.options) &&
                                  prop.options.map((opt, i) => (
                                    <option key={i} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                              </select>
                            ) : lowerType === "number" ? (
                              <input
                                type="number"
                                value={value ?? ""}
                                onChange={(e) => {
                                  const v = e.target.value === "" ? null : Number(e.target.value);
                                  handleCellChange(row.id, prop.name, v);
                                }}
                                placeholder="Empty"
                                className="w-full bg-transparent px-2 py-1 rounded text-xs border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none transition"
                              />
                            ) : lowerType === "date" ? (
                              <input
                                type="date"
                                value={
                                  value
                                    ? new Date(value).toISOString().split("T")[0]
                                    : ""
                                }
                                onChange={(e) =>
                                  handleCellChange(row.id, prop.name, e.target.value)
                                }
                                className="w-full bg-transparent px-2 py-1 rounded text-xs border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none transition"
                              />
                            ) : (
                              <input
                                type="text"
                                value={value ?? ""}
                                onChange={(e) =>
                                  handleCellChange(row.id, prop.name, e.target.value)
                                }
                                placeholder="Empty"
                                className="w-full bg-transparent px-2 py-1 rounded text-xs border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none transition"
                              />
                            )}
                          </td>
                        );
                      })}

                      <td className="p-2 text-center">
                        <button
                          onClick={() => handleDeleteRow(row.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 opacity-0 group-hover:opacity-100 transition"
                          title="Delete row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Summary Footer */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-500">
            <div className="flex items-center space-x-4">
              <span>
                {processedRows.length} {processedRows.length === 1 ? "row" : "rows"}
                {processedRows.length !== rows.length && ` (filtered from ${rows.length})`}
              </span>
              <span>{properties.length} columns</span>
            </div>
            <button
              onClick={() => handleAddRow()}
              className="inline-flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              <Plus className="w-3 h-3" />
              <span>Add Row</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. BOARD (KANBAN) VIEW */}
      {activeView === "board" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Grouped by <strong className="text-slate-800 dark:text-slate-200">{boardGroupProperty?.name}</strong> ({boardColumns.length} columns)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            {boardColumns.map((colName) => {
              const colRows = processedRows.filter((r) => {
                const val = r.data?.[boardGroupProperty?.name || ""];
                if (colName === "Unassigned") return !val;
                return String(val).toLowerCase() === colName.toLowerCase();
              });

              return (
                <div
                  key={colName}
                  className="bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 space-y-3 min-h-[300px]"
                >
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200">{colName}</span>
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {colRows.length}
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        handleAddRow({
                          [boardGroupProperty?.name || ""]: colName === "Unassigned" ? "" : colName,
                        })
                      }
                      className="p-1 text-slate-400 hover:text-blue-600 rounded-lg transition"
                      title={`Add to ${colName}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {colRows.map((row) => (
                      <div
                        key={row.id}
                        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 shadow-xs space-y-2 hover:border-blue-400 dark:hover:border-blue-500 transition group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900 dark:text-white truncate max-w-[180px]">
                            {row.data?.Name || row.data?.Title || "Untitled Entry"}
                          </span>
                          <button
                            onClick={() => handleDeleteRow(row.id)}
                            className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Other properties */}
                        <div className="space-y-1 pt-1 text-[11px] border-t border-slate-100 dark:border-slate-800">
                          {properties
                            .filter(
                              (p) =>
                                p.name !== "Name" &&
                                p.name !== "Title" &&
                                p.name !== boardGroupProperty?.name
                            )
                            .slice(0, 3)
                            .map((p) => (
                              <div key={p.id} className="flex items-center justify-between text-slate-500">
                                <span className="text-[10px] text-slate-400">{p.name}:</span>
                                <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[110px]">
                                  {row.data?.[p.name] !== undefined ? String(row.data[p.name]) : "—"}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. LIST VIEW */}
      {activeView === "list" && (
        <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
          {processedRows.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">No records found</div>
          ) : (
            processedRows.map((row) => (
              <div
                key={row.id}
                className="p-3.5 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 flex items-center justify-between transition group text-xs"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="font-bold text-slate-900 dark:text-white">
                    {row.data?.Name || row.data?.Title || "Untitled Entry"}
                  </span>
                  <div className="hidden sm:flex items-center gap-2">
                    {properties
                      .filter((p) => p.name !== "Name" && p.name !== "Title")
                      .slice(0, 3)
                      .map((p) => (
                        <span
                          key={p.id}
                          className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300 font-medium"
                        >
                          {p.name}: {row.data?.[p.name] !== undefined ? String(row.data[p.name]) : "—"}
                        </span>
                      ))}
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteRow(row.id)}
                  className="text-slate-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* 4. GALLERY VIEW */}
      {activeView === "gallery" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {processedRows.map((row) => (
            <div
              key={row.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs hover:shadow-md transition space-y-3 group"
            >
              <div className="h-16 rounded-xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 dark:from-blue-950/40 dark:to-indigo-950/40 flex items-center justify-between p-3 border border-blue-100/40 dark:border-blue-900/30">
                <span className="font-bold text-xs text-blue-700 dark:text-blue-300">Record</span>
                <button
                  onClick={() => handleDeleteRow(row.id)}
                  className="text-slate-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  {row.data?.Name || row.data?.Title || "Untitled Entry"}
                </h4>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                {properties
                  .filter((p) => p.name !== "Name" && p.name !== "Title")
                  .map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">{p.name}</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {row.data?.[p.name] !== undefined ? String(row.data[p.name]) : "—"}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Property / Column Modal ───────────────────────────────── */}
      {isAddPropModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 rounded-xl">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Add Column Property
                </h3>
              </div>
              <button
                onClick={() => setIsAddPropModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {propError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600">
                {propError}
              </div>
            )}

            <form onSubmit={handleAddProperty} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Property Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Priority, Estimate, Owner"
                  value={newPropName}
                  onChange={(e) => setNewPropName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Property Type
                </label>
                <select
                  value={newPropType}
                  onChange={(e) => setNewPropType(e.target.value as DatabasePropertyType)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-white"
                >
                  <option value="TEXT">Text (Single-line)</option>
                  <option value="NUMBER">Number</option>
                  <option value="SELECT">Select</option>
                  <option value="MULTI_SELECT">Multi-select</option>
                  <option value="DATE">Date</option>
                  <option value="CHECKBOX">Checkbox</option>
                  <option value="URL">URL</option>
                </select>
              </div>

              {(newPropType === "SELECT" ||
                newPropType === "MULTI_SELECT" ||
                newPropType === "select" ||
                newPropType === "multi_select") && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Dropdown Options (comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="High, Medium, Low"
                    value={newPropOptions}
                    onChange={(e) => setNewPropOptions(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddPropModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProp || !newPropName.trim()}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 transition"
                >
                  {isSubmittingProp && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Property</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Day 4: 7-Step Import Wizard Modal ──────────────────────────── */}
      <DatabaseImportWizardModal
        database={database}
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          if (onRefresh) onRefresh();
        }}
        onImportSuccess={() => {
          if (onRefresh) onRefresh();
        }}
      />

      {/* ── Day 5: Database Export Modal ────────────────────────────────── */}
      {isExportModalOpen && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          entityType="PROJECT"
          entityId={projectId || ""}
          entityName={database.name || `${projectName || "Project"} Database`}
          title="Export Database Data"
          defaultFormat="CSV"
          databaseId={database.id}
          databaseRows={rows}
          databaseProperties={properties}
        />
      )}
    </div>
  );
};
