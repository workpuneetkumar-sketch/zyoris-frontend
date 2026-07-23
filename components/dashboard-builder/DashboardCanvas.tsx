"use client";

import { GridLayout, useContainerWidth } from "react-grid-layout";
import type { Layout, LayoutItem } from "react-grid-layout";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { Loader2, LayoutTemplate, MousePointerClick, GripHorizontal } from "lucide-react";
import { WidgetDefinition, WidgetInstance } from "@/types/dashboard-builder";
import { DashboardWidget } from "./DashboardWidget";

const COLS = 12;
const ROW_HEIGHT = 120;
const MARGIN: [number, number] = [16, 16];

interface DashboardCanvasProps {
  widgets: WidgetInstance[];
  catalog: WidgetDefinition[];
  isPreview: boolean;
  isLoading: boolean;
  isEmpty: boolean;
  onLayoutChange: (layout: WidgetInstance[]) => void;
  onRemoveWidget: (instanceId: string) => void;
}

function toGridLayout(widgets: WidgetInstance[]): Layout {
  return widgets.map((w) => ({
    i: w.instanceId,
    x: w.x,
    y: w.y,
    w: w.w,
    h: w.h,
    static: false,
  }));
}

function fromGridLayout(layout: Layout, currentWidgets: WidgetInstance[]): WidgetInstance[] {
  const items: LayoutItem[] = Array.isArray(layout) ? [...layout] : [];
  return items.map((l) => {
    const existing = currentWidgets.find((w) => w.instanceId === l.i);
    return {
      widgetId: existing?.widgetId ?? "",
      instanceId: l.i,
      x: l.x,
      y: l.y,
      w: l.w,
      h: l.h,
    };
  });
}

// Inner canvas that uses the container width hook
function CanvasInner({
  widgets,
  catalog,
  isPreview,
  onLayoutChange,
  onRemoveWidget,
}: Omit<DashboardCanvasProps, "isLoading" | "isEmpty">) {
  const { width, containerRef, mounted } = useContainerWidth();

  const getDefinition = (widgetId: string): WidgetDefinition | undefined =>
    catalog.find((d) => d.id === widgetId);

  const gridLayout = toGridLayout(widgets);

  const handleLayoutChange = (layout: Layout) => {
    onLayoutChange(fromGridLayout(layout, widgets));
  };

  return (
    <div ref={containerRef} className="w-full">
      {mounted && (
        <GridLayout
          className="layout"
          layout={gridLayout}
          cols={COLS}
          rowHeight={ROW_HEIGHT}
          width={width}
          margin={MARGIN}
          containerPadding={[0, 0]}
          isDraggable={!isPreview}
          isResizable={!isPreview}
          onLayoutChange={handleLayoutChange}
          compactType="vertical"
          preventCollision={false}
        >
          {widgets
            .filter((w) => catalog.some((d) => d.id === w.widgetId))
            .map((w) => (
              <div key={w.instanceId}>
                <DashboardWidget
                  instance={w}
                  definition={getDefinition(w.widgetId)!}
                  onRemove={onRemoveWidget}
                  isPreview={isPreview}
                />
              </div>
            ))}
        </GridLayout>
      )}
    </div>
  );
}

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
        <CanvasInner
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
