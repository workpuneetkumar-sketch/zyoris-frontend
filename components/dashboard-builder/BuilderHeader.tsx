"use client";

import { Save, RotateCcw, Eye, EyeOff, Loader2, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";

interface BuilderHeaderProps {
  isPreview: boolean;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  widgetCount: number;
  onPreviewToggle: () => void;
  onSave: () => void;
  onReset: () => void;
}

export function BuilderHeader({
  isPreview,
  hasUnsavedChanges,
  isSaving,
  widgetCount,
  onPreviewToggle,
  onSave,
  onReset,
}: BuilderHeaderProps) {
  const [resetModalOpen, setResetModalOpen] = useState(false);

  const handleResetConfirm = () => {
    setResetModalOpen(false);
    onReset();
  };

  return (
    <>
      <header className="flex items-center justify-between px-4 md:px-6 py-3 bg-white border-b border-gray-200 shrink-0">
        {/* Left: Title + meta */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm">
            <LayoutDashboard size={16} strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base md:text-lg font-bold text-gray-900 tracking-tight">
                Dashboard Builder
              </h1>
              <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-full">
                {widgetCount} widget{widgetCount !== 1 ? "s" : ""}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-2">
              <span>Customize your workspace</span>
              {hasUnsavedChanges && (
                <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Unsaved changes
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 md:gap-2">
          {/* Preview toggle */}
          <button
            onClick={onPreviewToggle}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all duration-150 ${
              isPreview
                ? "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
            title={isPreview ? "Exit preview mode" : "Preview dashboard"}
          >
            {isPreview ? <EyeOff size={14} /> : <Eye size={14} />}
            <span className="hidden sm:inline">{isPreview ? "Exit Preview" : "Preview"}</span>
          </button>

          {/* Reset layout */}
          <button
            onClick={() => setResetModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all duration-150 bg-white"
            title="Reset to default layout"
          >
            <RotateCcw size={14} />
            <span className="hidden sm:inline">Reset</span>
          </button>

          {/* Save layout */}
          <button
            onClick={onSave}
            disabled={isSaving || !hasUnsavedChanges}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ${
              hasUnsavedChanges && !isSaving
                ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-sm hover:shadow-md active:scale-[0.98]"
                : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={14} />
                <span>Save</span>
              </>
            )}
          </button>
        </div>
      </header>

      <ConfirmationModal
        isOpen={resetModalOpen}
        title="Reset Layout"
        message="This will remove all your widgets and restore the default layout. This action cannot be undone."
        confirmText="Reset"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleResetConfirm}
        onCancel={() => setResetModalOpen(false)}
      />
    </>
  );
}
