import { CheckCircle2, XCircle } from "lucide-react";
import { StageConfigEntry } from "@/types/deals";
import React from "react";

const BASE_CONFIG: Record<string, StageConfigEntry & { icon?: React.ReactNode }> = {
  NEW: {
    label: "New",
    color: "text-blue-600",
    borderColor: "border-t-blue-500",
  },
  HOT: {
    label: "Hot",
    color: "text-red-600",
    borderColor: "border-t-red-500",
  },
  WARM: {
    label: "Warm",
    color: "text-orange-600",
    borderColor: "border-t-orange-500",
  },
  WON: {
    label: "Won",
    color: "text-emerald-600",
    borderColor: "border-t-emerald-500",
    icon: <CheckCircle2 size={15} className="text-green-500" />,
  },
  LOST: {
    label: "Lost",
    color: "text-gray-600",
    borderColor: "border-t-gray-500",
    icon: <XCircle size={15} className="text-red-400" />,
  },
  DEAD: {
    label: "Dead",
    color: "text-slate-600",
    borderColor: "border-t-slate-500",
  },
};

export function getStageConfig(stage: string): StageConfigEntry & { icon?: React.ReactNode } {
  const normalizedStage = stage.toUpperCase();
  if (BASE_CONFIG[normalizedStage]) {
    return BASE_CONFIG[normalizedStage];
  }
  // For unknown stages, use default config
  return {
    label: stage,
    color: "text-gray-600",
    borderColor: "border-t-gray-400",
  };
}

export const STAGE_CONFIG = BASE_CONFIG;
export const DEFAULT_DEAL_STAGES = ["NEW", "HOT", "WARM", "WON", "LOST", "DEAD"] as const;
