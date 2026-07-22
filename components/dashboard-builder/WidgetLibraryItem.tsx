"use client";

import {
  LayoutDashboard,
  BarChart2,
  Table,
  Activity,
  CheckSquare,
  TrendingUp,
  DollarSign,
  Users,
  Briefcase,
  type LucideIcon,
} from "lucide-react";
import { WidgetDefinition } from "@/types/dashboard-builder";

interface WidgetLibraryItemProps {
  widget: WidgetDefinition;
  onAdd: () => void;
}

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  BarChart2,
  Table,
  Activity,
  CheckSquare,
  DollarSign,
  Users,
  Briefcase,
  TrendingUp,
};

const TYPE_STYLES: Record<
  string,
  { bg: string; text: string; border: string; hover: string; iconBg: string; iconText: string }
> = {
  kpi: {
    bg: "bg-gradient-to-br from-blue-50 to-blue-100/50",
    text: "text-blue-700",
    border: "border-blue-100",
    hover: "hover:border-blue-300 hover:shadow-blue-200/20",
    iconBg: "bg-blue-100",
    iconText: "text-blue-600",
  },
  chart: {
    bg: "bg-gradient-to-br from-violet-50 to-violet-100/50",
    text: "text-violet-700",
    border: "border-violet-100",
    hover: "hover:border-violet-300 hover:shadow-violet-200/20",
    iconBg: "bg-violet-100",
    iconText: "text-violet-600",
  },
  table: {
    bg: "bg-gradient-to-br from-emerald-50 to-emerald-100/50",
    text: "text-emerald-700",
    border: "border-emerald-100",
    hover: "hover:border-emerald-300 hover:shadow-emerald-200/20",
    iconBg: "bg-emerald-100",
    iconText: "text-emerald-600",
  },
  activity: {
    bg: "bg-gradient-to-br from-amber-50 to-amber-100/50",
    text: "text-amber-700",
    border: "border-amber-100",
    hover: "hover:border-amber-300 hover:shadow-amber-200/20",
    iconBg: "bg-amber-100",
    iconText: "text-amber-600",
  },
  tasks: {
    bg: "bg-gradient-to-br from-rose-50 to-rose-100/50",
    text: "text-rose-700",
    border: "border-rose-100",
    hover: "hover:border-rose-300 hover:shadow-rose-200/20",
    iconBg: "bg-rose-100",
    iconText: "text-rose-600",
  },
};

const CATEGORY_COLORS: Record<string, string> = {
  Finance: "bg-blue-100/60 text-blue-600",
  Analytics: "bg-violet-100/60 text-violet-600",
  Sales: "bg-emerald-100/60 text-emerald-600",
  Activity: "bg-amber-100/60 text-amber-600",
  Tasks: "bg-rose-100/60 text-rose-600",
};

function getIcon(iconName: string): LucideIcon {
  return ICON_MAP[iconName] ?? LayoutDashboard;
}

const TYPE_LABELS: Record<string, string> = {
  kpi: "KPI Card",
  chart: "Chart",
  table: "Data Table",
  activity: "Activity Feed",
  tasks: "Task List",
};

export function WidgetLibraryItem({ widget, onAdd }: WidgetLibraryItemProps) {
  const Icon = getIcon(widget.icon);
  const style = TYPE_STYLES[widget.type] ?? TYPE_STYLES.kpi;
  const catColor = CATEGORY_COLORS[widget.category] ?? "bg-gray-100/60 text-gray-500";

  return (
    <button
      onClick={onAdd}
      aria-label={`Add ${widget.title} widget`}
      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl border ${style.border} ${style.bg} ${style.hover} transition-all duration-200 text-left group cursor-pointer active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 focus-visible:outline-none`}
    >
      <div className={`p-2 rounded-lg ${style.iconBg} ${style.iconText} shrink-0 shadow-sm`}>
        <Icon size={16} strokeWidth={2.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-semibold ${style.text} truncate`}>
          {widget.title}
        </p>
        <p className="text-[11px] text-gray-400 truncate mt-0.5">
          {widget.description ?? TYPE_LABELS[widget.type]}
        </p>
        <span className={`inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded-full mt-1 ${catColor}`}>
          {widget.category}
        </span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[10px] font-mono text-gray-300 bg-white/80 px-1.5 py-0.5 rounded border border-gray-100">
          {widget.defaultW}×{widget.defaultH}
        </span>
        <span className="text-[10px] text-gray-300 group-hover:text-blue-400 transition-colors font-bold" aria-hidden="true">
          +
        </span>
      </div>
    </button>
  );
}
