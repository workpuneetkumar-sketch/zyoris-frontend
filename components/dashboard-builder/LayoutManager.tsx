"use client";

// components/dashboard-builder/LayoutManager.tsx
// Modal for creating, renaming, deleting dashboard layouts + setting org default.

import { useState } from "react";
import {
  X,
  Plus,
  Trash2,
  Pencil,
  Check,
  Star,
  Building2,
  Loader2,
  LayoutGrid,
  AlertTriangle,
} from "lucide-react";
import { SavedDashboardLayout } from "@/types/dashboard-builder";

interface LayoutManagerProps {
  isOpen: boolean;
  layouts: SavedDashboardLayout[];
  activeLayoutId: string | null;
  canSetOrgDefault: boolean;
  isCreating: boolean;
  isDeleting: string | null; // id being deleted
  isSettingDefault: boolean;
  onClose: () => void;
  onCreateLayout: (name: string) => void;
  onRenameLayout: (id: string, name: string) => void;
  onDeleteLayout: (id: string) => void;
  onSwitchLayout: (id: string) => void;
  onSetOrgDefault: (id: string) => void;
}

export function LayoutManager({
  isOpen,
  layouts,
  activeLayoutId,
  canSetOrgDefault,
  isCreating,
  isDeleting,
  isSettingDefault,
  onClose,
  onCreateLayout,
  onRenameLayout,
  onDeleteLayout,
  onSwitchLayout,
  onSetOrgDefault,
}: LayoutManagerProps) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = () => {
    if (!newName.trim()) return;
    onCreateLayout(newName.trim());
    setNewName("");
  };

  const handleRename = (id: string) => {
    if (!editingName.trim()) {
      setEditingId(null);
      return;
    }
    onRenameLayout(id, editingName.trim());
    setEditingId(null);
    setEditingName("");
  };

  const startEdit = (layout: SavedDashboardLayout) => {
    setEditingId(layout.id);
    setEditingName(layout.name);
    setDeleteConfirmId(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <LayoutGrid size={18} className="text-indigo-500" />
            <h2 className="text-base font-bold text-gray-900">Manage Dashboards</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Create new */}
        <div className="px-5 py-3 border-b border-gray-50">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            New Dashboard
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Dashboard name…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-300 text-gray-700 placeholder-gray-300 transition-all"
            />
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || isCreating}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCreating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Create
            </button>
          </div>
        </div>

        {/* Layout list */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Your Dashboards ({layouts.length})
          </p>

          {layouts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <LayoutGrid size={32} className="text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">No dashboards yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {layouts.map((layout) => {
                const isActive = layout.id === activeLayoutId;
                const isEditingThis = editingId === layout.id;
                const isDeletingThis = isDeleting === layout.id;
                const isConfirmingDelete = deleteConfirmId === layout.id;

                return (
                  <div
                    key={layout.id}
                    className={`rounded-xl border p-3 transition-all ${
                      isActive
                        ? "border-indigo-200 bg-indigo-50"
                        : "border-gray-100 bg-gray-50 hover:border-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {/* Name / edit */}
                      <div className="flex-1 min-w-0">
                        {isEditingThis ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleRename(layout.id);
                                if (e.key === "Escape") setEditingId(null);
                              }}
                              autoFocus
                              className="flex-1 px-2 py-1 text-sm border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400/40 bg-white"
                            />
                            <button
                              onClick={() => handleRename(layout.id)}
                              className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700"
                            >
                              <Check size={11} />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="w-6 h-6 rounded-lg bg-gray-200 text-gray-500 flex items-center justify-center hover:bg-gray-300"
                            >
                              <X size={11} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => !isActive && onSwitchLayout(layout.id)}
                              className={`text-sm font-semibold ${isActive ? "text-indigo-700" : "text-gray-700 hover:text-indigo-600"} transition-colors`}
                            >
                              {layout.name}
                            </button>
                            {isActive && (
                              <span className="text-[10px] font-semibold text-indigo-500 bg-indigo-100 px-1.5 py-0.5 rounded-full">
                                active
                              </span>
                            )}
                            {layout.isOrgDefault && (
                              <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-full">
                                <Building2 size={9} /> Org Default
                              </span>
                            )}
                          </div>
                        )}
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Updated {new Date(layout.updatedAt).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Actions */}
                      {!isEditingThis && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {/* Set org default */}
                          {canSetOrgDefault && !layout.isOrgDefault && (
                            <button
                              onClick={() => onSetOrgDefault(layout.id)}
                              disabled={isSettingDefault}
                              title="Set as Organization Default"
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-amber-500 hover:bg-amber-50 transition-colors"
                            >
                              {isSettingDefault ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Star size={12} />
                              )}
                            </button>
                          )}

                          {/* Rename */}
                          <button
                            onClick={() => startEdit(layout)}
                            title="Rename"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 transition-colors"
                          >
                            <Pencil size={12} />
                          </button>

                          {/* Delete */}
                          {isConfirmingDelete ? (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-red-500 font-medium">Delete?</span>
                              <button
                                onClick={() => {
                                  onDeleteLayout(layout.id);
                                  setDeleteConfirmId(null);
                                }}
                                disabled={isDeletingThis}
                                className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-600 text-white hover:bg-red-700 transition-colors"
                              >
                                {isDeletingThis ? (
                                  <Loader2 size={11} className="animate-spin" />
                                ) : (
                                  <Check size={11} />
                                )}
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center bg-gray-200 text-gray-500 hover:bg-gray-300 transition-colors"
                              >
                                <X size={11} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(layout.id)}
                              title="Delete"
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-2">
          {canSetOrgDefault && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600">
              <Star size={11} />
              <span>Click <Star size={10} className="inline" /> to set the Org Default dashboard</span>
            </div>
          )}
          <button
            onClick={onClose}
            className="ml-auto px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
