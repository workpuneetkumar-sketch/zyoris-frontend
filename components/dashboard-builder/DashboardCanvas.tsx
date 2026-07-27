"use client";

// components/dashboard-builder/DashboardCanvas.tsx
// Drag-and-drop resizable grid using react-grid-layout v2.

import { useCallback, useMemo } from "react";
import { ReactGridLayout, useContainerWidth } from "react-grid-layout";
import type { LayoutItem, Layout, OnLayoutChangeCallback } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { X, GripVertical, Loader2, LayoutTemplate, MousePointerClick, GripHorizontal } from "lucide-react";
import { WidgetInstance, WidgetDefinition } from "@/types/dashboard-builder";
import { WidgetRenderer } from "./WidgetRenderer";
import { getWidgetEntry } from "./WidgetRegistry";

const COLS = 12;
const ROW_HEIGHT = 80;

interface DashboardCanvasProps {
  widgets: WidgetInstance[];
  catalog: WidgetDefinition[];
  isPreview: boolean;
  isLoading: boolean;
  isEmpty: boolean;
  onLayoutChange: (widgets: WidgetInstance[]) => void;
  onRemoveWidget: (instanceId: string) => void;
}

// Convert our WidgetInstances to react-grid-layout Layout
function toRGLLayout(widgets: WidgetInstance[], catalog: WidgetDefinition[]): Layout {
  return widgets.map((w) => {
    const def = catalog.find((c) => c.id === w.widgetId);
    const item: LayoutItem = {
      i: w.instanceId,
      x: w.x,
      y: w.y,
      w: w.w,
      h: w.h,
      minW: def?.minW ?? 2,
      minH: def?.minH ?? 2,
    };
    return item;
  });
}

// Merge new RGL layout positions back to our WidgetInstances
function mergeLayout(widgets: WidgetInstance[], newLayout: Layout): WidgetInstance[] {
  const map = new Map(newLayout.map((l) => [l.i, l]));
  return widgets.map((w) => {
    const l = map.get(w.instanceId);
    if (!l) return w;
    return { ...w, x: l.x, y: l.y, w: l.w, h: l.h };
  });
}

// ── Widget card ────────────────────────────────────────────────────────────

interface WidgetCardProps {
  widget: WidgetInstance;
  isPreview: boolean;
  onRemove: (id: string) => void;
}

function WidgetCard({ widget, isPreview, onRemove }: WidgetCardProps) {
  const entry = getWidgetEntry(widget.widgetId);

  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm flex flex-col overflow-hidden h-full transition-all duration-150 ${
        isPreview
          ? "border-gray-100 shadow-sm"
          : "border-gray-200 hover:border-indigo-200 hover:shadow-md group"
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 flex-shrink-0">
        {!isPreview && (
          <div className="cursor-grab active:cursor-grabbing drag-handle text-gray-300 hover:text-gray-500 transition-colors">
            <GripVertical size={14} />
          </div>
        )}
        <span className="text-sm leading-none">{entry?.icon ?? "📊"}</span>
        <p className="text-xs font-semibold text-gray-700 flex-1 truncate">
          {entry?.title ?? widget.widgetId}
        </p>
        {entry?.module && (
          <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-md border border-gray-100 hidden sm:block">
            {entry.module}
          </span>
        )}
        {!isPreview && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(widget.instanceId);
            }}
            className="w-5 h-5 rounded-md flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
            aria-label={`Remove ${entry?.title ?? widget.widgetId}`}
          >
            <X size={12} />
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0 p-3 overflow-hidden">
        <WidgetRenderer widgetId={widget.widgetId} isPreview={isPreview} />
      </div>
    </div>
  );
}

// ── Width-aware grid container ─────────────────────────────────────────────

function GridContainer({
  widgets,
  catalog,
  isPreview,
  onLayoutChange,
  onRemoveWidget,
}: {
  widgets: WidgetInstance[];
  catalog: WidgetDefinition[];
  isPreview: boolean;
  onLayoutChange: (widgets: WidgetInstance[]) => void;
  onRemoveWidget: (instanceId: string) => void;
}) {
  // useContainerWidth returns { width, containerRef, mounted }
  const { width, containerRef, mounted } = useContainerWidth({ initialWidth: 1280 });

  const layout = useMemo(() => toRGLLayout(widgets, catalog), [widgets, catalog]);

  const handleLayoutChange = useCallback<OnLayoutChangeCallback>(
    (newLayout) => {
      const merged = mergeLayout(widgets, newLayout);
      const changed = merged.some(
        (w, i) =>
          w.x !== widgets[i]?.x ||
          w.y !== widgets[i]?.y ||
          w.w !== widgets[i]?.w ||
          w.h !== widgets[i]?.h
      );
      if (changed) onLayoutChange(merged);
    },
    [widgets, onLayoutChange]
  );

  return (
    <div ref={containerRef} className="w-full">
      {mounted && (
        <ReactGridLayout
          width={width}
          layout={layout}
          gridConfig={{
            cols: COLS,
            rowHeight: ROW_HEIGHT,
            margin: [12, 12] as [number, number],
          }}
          dragConfig={{
            enabled: !isPreview,
            handle: ".drag-handle",
          }}
          resizeConfig={{
            enabled: !isPreview,
            handles: ["se"] as ["se"],
          }}
          onLayoutChange={handleLayoutChange}
        >
          {widgets.map((widget) => (
            <div key={widget.instanceId}>
              <WidgetCard
                widget={widget}
                isPreview={isPreview}
                onRemove={onRemoveWidget}
              />
            </div>
          ))}
        </ReactGridLayout>
      )}
    </div>
  );
}

// ── Main exported component ────────────────────────────────────────────────

export function DashboardCanvas({
  widgets,
  catalog,
  isPreview,
  isLoading,
  isEmpty,
  onLayoutChange,
  onRemoveWidget,
}: DashboardCanvasProps) {
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50/50 to-white">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
              <Loader2 size={24} className="text-blue-500 animate-spin" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-600">Loading your dashboard</p>
            <p className="text-xs text-gray-400 mt-0.5">Preparing your widgets...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50/50 to-white">
        <div className="flex flex-col items-center gap-5 max-w-sm text-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-50 to-violet-50 border border-blue-100 flex items-center justify-center">
              <LayoutTemplate size={36} className="text-blue-300" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center">
              <MousePointerClick size={16} className="text-gray-400" />
            </div>
          </div>
          <div>
            <p className="text-base font-bold text-gray-700">Your dashboard is empty</p>
            <p className="text-sm text-gray-400 mt-1.5 leading-relaxed">
              Click widgets from the library on the left to start building your personalized dashboard.
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50 border border-gray-200">
            <GripHorizontal size={14} className="text-gray-300" />
            <span className="text-[11px] text-gray-400">Drag or click to add widgets</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50/50 to-white">
      {!isPreview && (
        <div className="px-4 pt-3 pb-2">
          <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
            <GripHorizontal size={12} className="text-gray-300" />
            Drag widgets to rearrange &middot; Resize from bottom-right corner
          </p>
        </div>
      )}
      <div className="px-2 pb-4">
        <GridContainer
          widgets={widgets}
          catalog={catalog}
          isPreview={isPreview}
          onLayoutChange={onLayoutChange}
          onRemoveWidget={onRemoveWidget}
        />
      </div>
    </div>
  );
}
