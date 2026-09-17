"use client";

import React, { useState, useMemo } from "react";
import {
  WorkspaceDatabase,
  WorkspaceDatabaseProperty,
  WorkspaceDatabaseRow,
  DatabasePropertyType,
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
} from "lucide-react";

interface ProjectDatabaseTableProps {
  database: WorkspaceDatabase;
  onRefresh?: () => void;
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
}) => {
  const [properties, setProperties] = useState<WorkspaceDatabaseProperty[]>(
    database.properties || [
      { id: "prop-1", name: "Name", type: "text" },
      { id: "prop-2", name: "Status", type: "select", options: ["Todo", "In Progress", "Done"] },
    ]
  );
  const [rows, setRows] = useState<WorkspaceDatabaseRow[]>(database.rows || []);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);

  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Filter & Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterColumn, setFilterColumn] = useState<string>("ALL");
  const [filterValue, setFilterValue] = useState<string>("");

  // Add Column Modal
  const [isAddPropModalOpen, setIsAddPropModalOpen] = useState(false);
  const [newPropName, setNewPropName] = useState("");
  const [newPropType, setNewPropType] = useState<DatabasePropertyType>("TEXT");
  const [newPropOptions, setNewPropOptions] = useState("");
  const [isSubmittingProp, setIsSubmittingProp] = useState(false);
  const [propError, setPropError] = useState<string | null>(null);

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
        ?.map((d: any) => `${d.field ? d.field + ': ' : ''}${d.message}`)
        .join(', ');
      setPropError(
        detailsMsg || err?.response?.data?.message || err.message || "Failed to add column"
      );
    } finally {
      setIsSubmittingProp(false);
    }
  };

  // ── Handle Add Row ─────────────────────────────────────────────────────
  const handleAddRow = async () => {
    const defaultData: Record<string, any> = {};
    properties.forEach((prop) => {
      if (prop.type === "checkbox" || prop.type === "CHECKBOX") {
        defaultData[prop.name] = false;
      } else if (prop.type === "number" || prop.type === "NUMBER") {
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
          data: defaultData,
        };
        setRows((prev) => [mockRow, ...prev]);
      }
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error("Failed to add row:", err);
    }
  };

  // ── Handle Cell Change & Persistence ───────────────────────────────────
  const handleCellChange = async (rowId: string, propName: string, value: any) => {
    // Optimistic UI update
    setRows((prev) =>
      prev.map((r) => {
        if (r.id === rowId) {
          return { ...r, data: { ...r.data, [propName]: value } };
        }
        return r;
      })
    );

    const targetRow = rows.find((r) => r.id === rowId);
    if (!targetRow || !database.id) return;

    setSavingRowId(rowId);
    const updatedPayload = { ...targetRow.data, [propName]: value };

    try {
      await updateDatabaseRow(database.id, rowId, updatedPayload);
    } catch (err) {
      console.error(`Failed to persist cell for row ${rowId}:`, err);
    } finally {
      setSavingRowId(null);
    }
  };

  // ── Handle Delete Row ──────────────────────────────────────────────────
  const handleDeleteRow = async (rowId: string) => {
    setRows((prev) => prev.filter((r) => r.id !== rowId));

    if (!database.id) return;

    try {
      await deleteDatabaseRow(database.id, rowId);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(`Failed to delete row ${rowId}:`, err);
    }
  };

  // ── Sort Trigger ───────────────────────────────────────────────────────
  const toggleSort = (propName: string) => {
    if (sortColumn === propName) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortColumn(null);
        setSortDirection("asc");
      }
    } else {
      setSortColumn(propName);
      setSortDirection("asc");
    }
  };

  // ── Filtered & Sorted Rows ─────────────────────────────────────────────
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

    // Column-specific filter
    if (filterColumn !== "ALL" && filterValue.trim()) {
      const q = filterValue.toLowerCase();
      result = result.filter((r) => {
        const val = r.data?.[filterColumn];
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(q);
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
  }, [rows, searchQuery, filterColumn, filterValue, sortColumn, sortDirection]);

  return (
    <div className="space-y-4">
      {/* ── Table Toolbar Controls ─────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search Input */}
          <div className="relative min-w-[200px] flex-1 max-w-sm">
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

          {/* Column Filter Selector */}
          <div className="flex items-center space-x-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterColumn}
              onChange={(e) => {
                setFilterColumn(e.target.value);
                setFilterValue("");
              }}
              className="text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">All Columns</option>
              {properties.map((p) => (
                <option key={p.id} value={p.name}>
                  Filter: {p.name}
                </option>
              ))}
            </select>
          </div>

          {filterColumn !== "ALL" && (
            <input
              type="text"
              placeholder={`Value for ${filterColumn}...`}
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          )}

          {(searchQuery || filterValue || sortColumn) && (
            <button
              onClick={() => {
                setSearchQuery("");
                setFilterColumn("ALL");
                setFilterValue("");
                setSortColumn(null);
              }}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline px-2 py-1 font-medium"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsAddPropModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" />
            <span>Add Property</span>
          </button>

          <button
            onClick={handleAddRow}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Row</span>
          </button>
        </div>
      </div>

      {/* ── Table Container ────────────────────────────────────────────── */}
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
                            <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
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
                    className="p-12 text-center text-slate-400 dark:text-slate-500"
                  >
                    <TableIcon className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="font-medium text-xs">No records found matching current criteria.</p>
                    <button
                      onClick={handleAddRow}
                      className="mt-3 text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                    >
                      + Add the first row
                    </button>
                  </td>
                </tr>
              ) : (
                processedRows.map((row, idx) => (
                  <tr
                    key={row.id}
                    className="hover:bg-blue-50/20 dark:hover:bg-slate-800/30 transition group"
                  >
                    <td className="p-3 text-center text-[11px] text-slate-400 border-r border-slate-100 dark:border-slate-800">
                      {savingRowId === row.id ? (
                        <Loader2 className="w-3 h-3 animate-spin text-blue-500 mx-auto" />
                      ) : (
                        idx + 1
                      )}
                    </td>

                    {properties.map((prop) => {
                      const value = row.data?.[prop.name];
                      const lowerType = String(prop.type).toLowerCase();

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
            onClick={handleAddRow}
            className="inline-flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            <Plus className="w-3 h-3" />
            <span>Add Row</span>
          </button>
        </div>
      </div>

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
    </div>
  );
};
