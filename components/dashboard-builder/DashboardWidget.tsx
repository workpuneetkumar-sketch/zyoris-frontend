"use client";

import { X, GripVertical } from "lucide-react";
import { WidgetDefinition, WidgetInstance, WidgetType } from "@/types/dashboard-builder";
import { KPIWidget } from "./widgets/KPIWidget";
import { ChartWidget } from "./widgets/ChartWidget";
import { TableWidget } from "./widgets/TableWidget";
import { ActivityWidget } from "./widgets/ActivityWidget";
import { TasksWidget } from "./widgets/TasksWidget";

interface DashboardWidgetProps {
  instance: WidgetInstance;
  definition: WidgetDefinition;
  onRemove?: (instanceId: string) => void;
  isPreview: boolean;
}

const TYPE_LABELS: Record<WidgetType, string> = {
  kpi: "KPI",
  chart: "Chart",
  table: "Table",
  activity: "Activity",
  tasks: "Tasks",
};

const TYPE_COLORS: Record<WidgetType, string> = {
  kpi: "bg-blue-50 text-blue-600 border-blue-100",
  chart: "bg-violet-50 text-violet-600 border-violet-100",
  table: "bg-emerald-50 text-emerald-600 border-emerald-100",
  activity: "bg-amber-50 text-amber-600 border-amber-100",
  tasks: "bg-rose-50 text-rose-600 border-rose-100",
};

function renderWidgetContent(type: WidgetType) {
  switch (type) {
    case "kpi":
      return <KPIWidget title="Widget Title" value={0} trend={0} format="currency" />;
    case "chart":
      return <ChartWidget title="Chart" chartType="bar" data={[]} />;
    case "table":
      return <TableWidget title="Table" columns={[]} data={[]} />;
    case "activity":
      return <ActivityWidget title="Activity" activities={[]} />;
    case "tasks":
      return <TasksWidget title="Tasks" tasks={[]} />;
    default:
      return <div className="p-4 text-gray-400 text-sm">Unknown widget</div>;
  }
}

export function DashboardWidget({
  instance,
  definition,
  onRemove,
  isPreview,
}: DashboardWidgetProps) {
  const type = definition.type;
  const chipColor = TYPE_COLORS[type] ?? TYPE_COLORS.kpi;

  return (
    <div
      className="relative group h-full flex flex-col bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200"
      role="region"
      aria-label={`${definition.title} widget`}
    >
      {/* Widget Header Bar — acts as drag handle */}
      <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100/80 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {!isPreview && (
            <GripVertical
              size={12}
              className="text-gray-300 shrink-0"
              aria-hidden="true"
            />
          )}
          <span className="text-[11px] font-semibold text-gray-700 truncate">
            {definition.title}
          </span>
          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${chipColor} shrink-0`}>
            {TYPE_LABELS[type] ?? type}
          </span>
        </div>
        {!isPreview && onRemove && (
          <button
            onClick={() => onRemove(instance.instanceId)}
            className="shrink-0 w-5 h-5 rounded-md bg-white/80 border border-gray-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-150 hover:bg-red-50 hover:border-red-200 hover:text-red-500 text-gray-300 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none"
            aria-label={`Remove ${definition.title} widget`}
          >
            <X size={11} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Widget content */}
      <div className="flex-1 min-h-0">
        {renderWidgetContent(type)}
      </div>
    </div>
  );
}
