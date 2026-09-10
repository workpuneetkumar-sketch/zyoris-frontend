"use client";

import React, { useState } from "react";
import {
  WorkspaceDatabase,
  WorkspaceDatabaseProperty,
  WorkspaceDatabaseRow,
  WorkspaceDatabaseView,
} from "@/types/workspace";
import {
  addDatabaseProperty,
  createDatabaseRow,
  updateDatabaseRow,
  createDatabaseView,
} from "@/lib/api/workspaceApi";
import {
  Database,
  Plus,
  Table as TableIcon,
  LayoutGrid,
  List,
  Loader2,
  AlertCircle,
  Type,
  Hash,
  Calendar,
  CheckSquare,
  ChevronDown,
} from "lucide-react";

interface DatabaseViewProps {
  database: WorkspaceDatabase;
  pageId: string;
  onRefresh?: () => void;
}

export const DatabaseView: React.FC<DatabaseViewProps> = ({
  database,
  pageId,
  onRefresh,
}) => {
  const [properties, setProperties] = useState<WorkspaceDatabaseProperty[]>(
    database?.properties || [
      { id: "prop-1", name: "Name", type: "text" },
      { id: "prop-2", name: "Status", type: "select", options: ["To Do", "In Progress", "Done"] },
    ]
  );
  const [rows, setRows] = useState<WorkspaceDatabaseRow[]>(database?.rows || []);
  const [views, setViews] = useState<WorkspaceDatabaseView[]>(
    database?.views || [{ id: "view-1", name: "Default Table", type: "table" }]
  );
  const [activeViewId, setActiveViewId] = useState<string>("view-1");

  const [isAddPropModalOpen, setIsAddPropModalOpen] = useState<boolean>(false);
  const [newPropName, setNewPropName] = useState<string>("");
  const [newPropType, setNewPropType] = useState<string>("text");
  const [isSubmittingProp, setIsSubmittingProp] = useState<boolean>(false);
  const [propError, setPropError] = useState<string | null>(null);

  /* -------------------------------------------------------------------------- */
  /* ADD COLUMN / PROPERTY                                                      */
  /* -------------------------------------------------------------------------- */
  const handleAddProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPropName.trim()) return;

    setIsSubmittingProp(true);
    setPropError(null);

    try {
      if (database?.id) {
        const createdProp = await addDatabaseProperty(database.id, {
          name: newPropName.trim(),
          type: newPropType,
        });
        setProperties((prev) => [...prev, createdProp]);
      } else {
        const mockProp: WorkspaceDatabaseProperty = {
          id: `prop-${Date.now()}`,
          name: newPropName.trim(),
          type: newPropType as any,
        };
        setProperties((prev) => [...prev, mockProp]);
      }

      setNewPropName("");
      setNewPropType("text");
      setIsAddPropModalOpen(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error("Failed to add property:", err);
      setPropError(err?.response?.data?.message || "Failed to add column");
    } finally {
      setIsSubmittingProp(false);
    }
  };

  /* -------------------------------------------------------------------------- */
  /* CREATE ROW                                                                 */
  /* -------------------------------------------------------------------------- */
  const handleAddRow = async () => {
    const defaultData: Record<string, any> = { Name: "New Entry" };

    try {
      if (database?.id) {
        const createdRow = await createDatabaseRow(database.id, defaultData);
        setRows((prev) => [...prev, createdRow]);
      } else {
        const mockRow: WorkspaceDatabaseRow = {
          id: `row-${Date.now()}`,
          data: defaultData,
        };
        setRows((prev) => [...prev, mockRow]);
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Failed to add row:", err);
    }
  };

  /* -------------------------------------------------------------------------- */
  /* UPDATE ROW CELL                                                            */
  /* -------------------------------------------------------------------------- */
  const handleCellChange = async (rowId: string, propName: string, value: any) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id === rowId) {
          return { ...r, data: { ...r.data, [propName]: value } };
        }
        return r;
      })
    );

    const targetRow = rows.find((r) => r.id === rowId);
    if (!targetRow || !database?.id) return;

    const updatedPayload = { ...targetRow.data, [propName]: value };

    try {
      await updateDatabaseRow(database.id, rowId, updatedPayload);
    } catch (err) {
      console.error(`Failed to update row ${rowId}:`, err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Views Bar & Actions */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center space-x-2">
          {views.map((v) => (
            <button
              key={v.id}
              onClick={() => setActiveViewId(v.id)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeViewId === v.id
                  ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50"
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>{v.name}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsAddPropModalOpen(true)}
            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Property</span>
          </button>
        </div>
      </div>

      {/* Database Table View */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-bold">
                {properties.map((prop) => (
                  <th key={prop.id} className="p-3 border-r border-slate-200 dark:border-slate-800 min-w-[140px]">
                    <div className="flex items-center space-x-1.5">
                      {prop.type === "number" ? (
                        <Hash className="w-3.5 h-3.5 text-slate-400" />
                      ) : prop.type === "checkbox" ? (
                        <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <Type className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <span>{prop.name}</span>
                    </div>
                  </th>
                ))}
                <th className="p-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.length > 0 ? (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    {properties.map((prop) => (
                      <td key={prop.id} className="p-2.5 border-r border-slate-100 dark:border-slate-800">
                        <input
                          type="text"
                          value={row.data[prop.name] ?? ""}
                          onChange={(e) => handleCellChange(row.id, prop.name, e.target.value)}
                          className="w-full bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none"
                        />
                      </td>
                    ))}
                    <td className="p-2.5 text-center text-slate-300">#</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={properties.length + 1} className="py-8 text-center text-slate-400 italic">
                    No rows created yet. Click "+ New Entry" below.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Add Row */}
        <div className="p-2.5 bg-slate-50/50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={handleAddRow}
            className="flex items-center space-x-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline px-2 py-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Entry</span>
          </button>
        </div>
      </div>

      {/* Add Property Modal */}
      {isAddPropModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Add Database Property</h3>

            {propError && (
              <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4" />
                <span>{propError}</span>
              </div>
            )}

            <form onSubmit={handleAddProperty} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-500 font-semibold mb-1">Property Name</label>
                <input
                  type="text"
                  value={newPropName}
                  onChange={(e) => setNewPropName(e.target.value)}
                  placeholder="e.g. Priority, Assignee, Cost..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Property Type</label>
                <select
                  value={newPropType}
                  onChange={(e) => setNewPropType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="select">Select</option>
                  <option value="checkbox">Checkbox</option>
                  <option value="date">Date</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddPropModalOpen(false)}
                  className="px-3 py-1.5 text-slate-500 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProp || !newPropName.trim()}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm"
                >
                  {isSubmittingProp ? "Adding..." : "Add Property"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
