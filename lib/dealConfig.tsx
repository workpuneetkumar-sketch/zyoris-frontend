import { CheckCircle2, XCircle } from "lucide-react";
import { StageConfigEntry } from "@/types/deals";
import React from "react";

// Extended config with additional UI properties for the redesign
export interface ExtendedStageConfig extends StageConfigEntry {
  icon?: React.ReactNode;
  bgColor: string;          // e.g. "bg-blue-50"
  badgeBg: string;          // pill background in table, e.g. "bg-blue-100"
  badgeText: string;        // pill text color, e.g. "text-blue-700"
  headerBg: string;         // kanban column header bg
  dotColor: string;         // colored dot on stat card
}

const BASE_CONFIG: Record<string, ExtendedStageConfig> = {
  NEW: {
    label: "New",
    color: "text-blue-600",
    borderColor: "border-t-blue-500",
    bgColor: "bg-blue-50",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-700",
    headerBg: "bg-blue-50/60",
    dotColor: "bg-blue-500",
  },
  HOT: {
    label: "Hot",
    color: "text-red-600",
    borderColor: "border-t-red-500",
    bgColor: "bg-red-50",
    badgeBg: "bg-red-100",
    badgeText: "text-red-700",
    headerBg: "bg-red-50/60",
    dotColor: "bg-red-500",
  },
  WARM: {
    label: "Warm",
    color: "text-orange-600",
    borderColor: "border-t-orange-500",
    bgColor: "bg-orange-50",
    badgeBg: "bg-orange-100",
    badgeText: "text-orange-700",
    headerBg: "bg-orange-50/60",
    dotColor: "bg-orange-500",
  },
  WON: {
    label: "Won",
    color: "text-emerald-600",
    borderColor: "border-t-emerald-500",
    bgColor: "bg-emerald-50",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-700",
    headerBg: "bg-emerald-50/60",
    dotColor: "bg-emerald-500",
    icon: <CheckCircle2 size={15} className="text-emerald-500" />,
  },
  LOST: {
    label: "Lost",
    color: "text-gray-600",
    borderColor: "border-t-gray-500",
    bgColor: "bg-gray-50",
    badgeBg: "bg-gray-100",
    badgeText: "text-gray-700",
    headerBg: "bg-gray-50/60",
    dotColor: "bg-gray-500",
    icon: <XCircle size={15} className="text-red-400" />,
  },
  DEAD: {
    label: "Dead",
    color: "text-slate-600",
    borderColor: "border-t-slate-500",
    bgColor: "bg-slate-50",
    badgeBg: "bg-slate-100",
    badgeText: "text-slate-700",
    headerBg: "bg-slate-50/60",
    dotColor: "bg-slate-500",
  },
};

export function getStageConfig(stage: string): ExtendedStageConfig {
  const normalizedStage = stage.toUpperCase();
  if (BASE_CONFIG[normalizedStage]) {
    return BASE_CONFIG[normalizedStage];
  }
  // For unknown stages, return a sensible default
  return {
    label: stage,
    color: "text-gray-600",
    borderColor: "border-t-gray-400",
    bgColor: "bg-gray-50",
    badgeBg: "bg-gray-100",
    badgeText: "text-gray-700",
    headerBg: "bg-gray-50/60",
    dotColor: "bg-gray-400",
  };
}

export const STAGE_CONFIG = BASE_CONFIG;
export const DEFAULT_DEAL_STAGES = ["NEW", "HOT", "WARM", "WON", "LOST", "DEAD"] as const;
