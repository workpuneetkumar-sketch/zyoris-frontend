"use client";

import { useState } from "react";
import { useDashboardBuilder } from "@/hooks/useDashboardBuilder";
import { BuilderHeader } from "@/components/dashboard-builder/BuilderHeader";
import { WidgetLibrary } from "@/components/dashboard-builder/WidgetLibrary";
import { DashboardCanvas } from "@/components/dashboard-builder/DashboardCanvas";
import { PanelRightOpen, X } from "lucide-react";

export default function DashboardBuilderPage() {
  const {
    catalog,
    widgets,
    isPreview,
    isLoading,
    isSaving,
    error,
    hasUnsavedChanges,
    isEmpty,
    addWidget,
    removeWidget,
    updateLayout,
    saveLayout,
    resetLayout,
    togglePreview,
    retry,
  } = useDashboardBuilder();

  const [libraryOpen, setLibraryOpen] = useState(false);

  // Error state
  if (error && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md text-center">
          <p className="text-sm font-semibold text-red-700 mb-1">
            Something went wrong
          </p>
          <p className="text-xs text-red-500 mb-4">{error}</p>
          <button
            onClick={retry}
            className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <BuilderHeader
        isPreview={isPreview}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        widgetCount={widgets.length}
        onPreviewToggle={togglePreview}
        onSave={saveLayout}
        onReset={resetLayout}
      />
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile library toggle */}
        {!isPreview && (
          <button
            onClick={() => setLibraryOpen((p) => !p)}
            className="lg:hidden absolute left-2 top-2 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 shadow-sm text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            aria-label={libraryOpen ? "Close widget library" : "Open widget library"}
          >
            {libraryOpen ? (
              <>
                <X size={14} /> Close
              </>
            ) : (
              <>
                <PanelRightOpen size={14} /> Widgets
              </>
            )}
          </button>
        )}

        {/* Desktop: always visible sidebar */}
        <div className="hidden lg:flex">
          <WidgetLibrary
            catalog={catalog}
            onAddWidget={addWidget}
            isPreview={isPreview}
            isLoading={isLoading}
          />
        </div>

        {/* Mobile/Tablet: drawer overlay */}
        {libraryOpen && !isPreview && (
          <>
            {/* Backdrop */}
            <div
              className="lg:hidden fixed inset-0 z-20 bg-black/30"
              onClick={() => setLibraryOpen(false)}
            />
            {/* Drawer */}
            <div className="lg:hidden fixed left-0 top-0 bottom-0 z-30 w-[280px] shadow-2xl animate-in slide-in-from-left duration-200">
              <WidgetLibrary
                catalog={catalog}
                onAddWidget={(def) => {
                  addWidget(def);
                  setLibraryOpen(false);
                }}
                isPreview={isPreview}
                isLoading={isLoading}
              />
            </div>
          </>
        )}

        <DashboardCanvas
          widgets={widgets}
          catalog={catalog}
          isPreview={isPreview}
          isLoading={isLoading}
          isEmpty={isEmpty}
          onLayoutChange={updateLayout}
          onRemoveWidget={removeWidget}
        />
      </div>
    </div>
  );
}
