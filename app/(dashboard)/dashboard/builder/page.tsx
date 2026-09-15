"use client";

// app/(dashboard)/dashboard/builder/page.tsx

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useDashboardBuilder } from "@/hooks/useDashboardBuilder";
import { BuilderHeader } from "@/components/dashboard-builder/BuilderHeader";
import { WidgetLibrary } from "@/components/dashboard-builder/WidgetLibrary";
import { DashboardCanvas } from "@/components/dashboard-builder/DashboardCanvas";
import { LayoutManager } from "@/components/dashboard-builder/LayoutManager";
import { WidgetDefinition } from "@/types/dashboard-builder";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function DashboardBuilderPage() {
  const { user } = useAuth();

  const {
    catalog,
    widgets,
    layouts,
    activeLayout,
    activeLayoutId,
    isPreview,
    isLoading,
    isLoadingLayouts,
    isSaving,
    isCreating,
    isDeletingId,
    isSettingDefault,
    error,
    hasUnsavedChanges,
    isEmpty,
    canSetOrgDefault,
    addWidget,
    removeWidget,
    updateLayout,
    saveLayout,
    resetLayout,
    togglePreview,
    createLayout,
    switchLayout,
    renameLayout,
    deleteLayout,
    setOrgDefault,
    retry,
  } = useDashboardBuilder(user?.role);

  const [libraryOpen, setLibraryOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);

  const handleAddWidget = (def: WidgetDefinition) => {
    addWidget(def);
    setLibraryOpen(false);
  };

  // ── Error state ────────────────────────────────────────────────────────────
  if (error && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 max-w-md text-center">
          <AlertCircle size={32} className="text-red-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-red-700 mb-1">Failed to load Dashboard Builder</p>
          <p className="text-xs text-red-500 mb-5">{error}</p>
          <button
            onClick={retry}
            className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors"
          >
            <RefreshCw size={13} />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Top header bar ─────────────────────────────────────────────── */}
      <BuilderHeader
        activeLayout={activeLayout}
        layouts={layouts}
        isLoadingLayouts={isLoadingLayouts}
        isPreview={isPreview}
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
        widgetCount={widgets.length}
        canSetOrgDefault={canSetOrgDefault}
        onPreviewToggle={togglePreview}
        onSave={saveLayout}
        onReset={resetLayout}
        onAddWidget={() => setLibraryOpen(true)}
        onNewLayout={() => setManagerOpen(true)}
        onSwitchLayout={switchLayout}
        onManageLayouts={() => setManagerOpen(true)}
      />

      {/* ── Main content area ───────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Canvas — full width, widget library slides over it */}
        <DashboardCanvas
          widgets={widgets}
          catalog={catalog}
          isPreview={isPreview}
          isLoading={isLoading}
          isEmpty={isEmpty}
          onLayoutChange={updateLayout}
          onRemoveWidget={removeWidget}
        />

        {/* Widget Library — fixed sidebar panel */}
        <WidgetLibrary
          catalog={catalog}
          isOpen={libraryOpen}
          onClose={() => setLibraryOpen(false)}
          onAdd={handleAddWidget}
        />
      </div>

      {/* ── Layout Manager Modal ─────────────────────────────────────────── */}
      <LayoutManager
        isOpen={managerOpen}
        layouts={layouts}
        activeLayoutId={activeLayoutId}
        canSetOrgDefault={canSetOrgDefault}
        isCreating={isCreating}
        isDeleting={isDeletingId}
        isSettingDefault={isSettingDefault}
        onClose={() => setManagerOpen(false)}
        onCreateLayout={createLayout}
        onRenameLayout={renameLayout}
        onDeleteLayout={deleteLayout}
        onSwitchLayout={(id) => {
          switchLayout(id);
          setManagerOpen(false);
        }}
        onSetOrgDefault={setOrgDefault}
      />
    </div>
  );
}
