"use client";

// components/dashboard-builder/BuilderHeader.tsx
// Top action bar for the Dashboard Builder page.

import {
  Save,
  Eye,
  EyeOff,
  Plus,
  RotateCcw,
  Loader2,
  ChevronDown,
  LayoutGrid,
  Star,
  Building2,
  AlertCircle,
} from "lucide-react";
import { SavedDashboardLayout } from "@/types/dashboard-builder";

interface BuilderHeaderProps {
  // Layout info
  activeLayout: SavedDashboardLayout | null;
  layouts: SavedDashboardLayout[];
  isLoadingLayouts: boolean;

  // Editor state
  isPreview: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  widgetCount: number;

  // Permissions
  canSetOrgDefault: boolean;

  // Actions
  onPreviewToggle: () => void;
  onSave: () => void;
  onReset: () => void;
  onAddWidget: () => void;
  onNewLayout: () => void;
  onSwitchLayout: (layout: SavedDashboardLayout) => void;
  onManageLayouts: () => void;
}

export function BuilderHeader({
  activeLayout,
  layouts,
  isLoadingLayouts,
  isPreview,
  isSaving,
  hasUnsavedChanges,
  widgetCount,
  canSetOrgDefault,
  onPreviewToggle,
  onSave,
  onReset,
  onAddWidget,
  onNewLayout,
  onSwitchLayout,
  onManageLayouts,
}: BuilderHeaderProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-white border-b border-gray-100 flex-shrink-0 flex-wrap gap-y-2">
      {/* ── Left: Layout name + switcher ────────────────────────── */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <LayoutGrid size={16} className="text-indigo-500 flex-shrink-0" />
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-sm font-bold text-gray-800 truncate">
            {activeLayout?.name ?? "New Dashboard"}
          </span>
          {hasUnsavedChanges && (
            <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400" title="Unsaved changes" />
          )}
          {activeLayout?.isOrgDefault && (
            <span className="flex-shrink-0 flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-full">
              <Building2 size={9} /> Org Default
            </span>
          )}
        </div>

        {/* Layout switcher dropdown */}
        {layouts.length > 0 && (
          <div className="relative group">
            <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-1.5 py-1 rounded-lg hover:bg-gray-50 transition-colors">
              <ChevronDown size={12} />
            </button>
            <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-100 rounded-xl shadow-xl p-1 min-w-[220px] hidden group-hover:block group-focus-within:block">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 py-1">
                Your Dashboards
              </p>
              {isLoadingLayouts ? (
                <div className="flex items-center gap-2 px-2 py-2">
                  <Loader2 size={12} className="animate-spin text-gray-400" />
                  <span className="text-xs text-gray-400">Loading…</span>
                </div>
              ) : (
                layouts.map((layout) => (
                  <button
                    key={layout.id}
                    onClick={() => onSwitchLayout(layout)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                      layout.id === activeLayout?.id
                        ? "bg-indigo-50 text-indigo-700"
                        : "hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    <LayoutGrid size={12} className="flex-shrink-0" />
                    <span className="text-xs flex-1 truncate">{layout.name}</span>
                    {layout.isOrgDefault && (
                      <Star size={10} className="text-amber-400 flex-shrink-0" />
                    )}
                    {layout.id === activeLayout?.id && (
                      <span className="text-[10px] text-indigo-500 font-semibold">active</span>
                    )}
                  </button>
                ))
              )}
              <div className="border-t border-gray-100 mt-1 pt-1">
                <button
                  onClick={onNewLayout}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-gray-50 text-gray-500 transition-colors"
                >
                  <Plus size={12} />
                  <span className="text-xs">New Dashboard</span>
                </button>
                <button
                  onClick={onManageLayouts}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-gray-50 text-gray-500 transition-colors"
                >
                  <AlertCircle size={12} />
                  <span className="text-xs">Manage Dashboards…</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {widgetCount > 0 && (
          <span className="text-[10px] text-gray-400 hidden sm:block flex-shrink-0">
            {widgetCount} widget{widgetCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ── Right: Actions ───────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Add widget */}
        {!isPreview && (
          <button
            onClick={onAddWidget}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-colors border border-indigo-100"
          >
            <Plus size={14} />
            <span className="hidden sm:block">Add Widget</span>
          </button>
        )}

        {/* Reset */}
        {!isPreview && (
          <button
            onClick={onReset}
            title="Reset layout"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <RotateCcw size={14} />
          </button>
        )}

        {/* Preview toggle */}
        <button
          onClick={onPreviewToggle}
          title={isPreview ? "Edit mode" : "Preview mode"}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border ${
            isPreview
              ? "bg-violet-600 text-white border-violet-700 hover:bg-violet-700"
              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          }`}
        >
          {isPreview ? <EyeOff size={14} /> : <Eye size={14} />}
          <span className="hidden sm:block">{isPreview ? "Edit" : "Preview"}</span>
        </button>

        {/* Save */}
        {!isPreview && (
          <button
            onClick={onSave}
            disabled={isSaving}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
              hasUnsavedChanges
                ? "bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-sm shadow-emerald-200"
                : "bg-gray-100 text-gray-400 border-gray-200 cursor-default"
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {isSaving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            <span className="hidden sm:block">{isSaving ? "Saving…" : "Save"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
