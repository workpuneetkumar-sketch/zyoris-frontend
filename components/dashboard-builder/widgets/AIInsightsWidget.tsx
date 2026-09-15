"use client";
// components/dashboard-builder/widgets/AIInsightsWidget.tsx

import { Brain, TrendingUp, AlertTriangle, Lightbulb, Zap } from "lucide-react";

const INSIGHTS = [
  {
    type: "opportunity",
    icon: Lightbulb,
    color: "#f59e0b",
    bg: "#fffbeb",
    text: "3 leads in 'Qualified' stage haven't been contacted in 7+ days.",
    action: "Follow up now",
  },
  {
    type: "risk",
    icon: AlertTriangle,
    color: "#ef4444",
    bg: "#fef2f2",
    text: "Deal 'Acme Enterprise' is 15 days past expected close date.",
    action: "Review deal",
  },
  {
    type: "trend",
    icon: TrendingUp,
    color: "#10b981",
    bg: "#f0fdf4",
    text: "Your pipeline velocity improved by 18% compared to last month.",
    action: "View report",
  },
  {
    type: "suggestion",
    icon: Zap,
    color: "#8b5cf6",
    bg: "#f5f3ff",
    text: "Best time to call prospects: 10am–12pm Tuesday–Thursday.",
    action: "Schedule calls",
  },
];

export function AIInsightsWidget({ isPreview }: { isPreview?: boolean }) {
  return (
    <div className="h-full flex flex-col gap-2 overflow-hidden">
      <div className="flex items-center gap-2 pb-1">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <Brain size={12} className="text-white" />
        </div>
        <p className="text-xs font-bold text-gray-700">AI-powered insights</p>
        <span className="ml-auto text-[9px] font-semibold text-violet-600 bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded-full">
          LIVE
        </span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2">
        {INSIGHTS.map((ins, i) => {
          const Icon = ins.icon;
          return (
            <div
              key={i}
              className="rounded-xl p-2.5 border"
              style={{ backgroundColor: ins.bg, borderColor: ins.color + "30" }}
            >
              <div className="flex items-start gap-2">
                <Icon size={12} style={{ color: ins.color }} className="flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-gray-700 leading-relaxed flex-1">{ins.text}</p>
              </div>
              <button
                className="mt-1.5 text-[9px] font-bold px-2 py-0.5 rounded-lg"
                style={{ color: ins.color, backgroundColor: ins.color + "18" }}
              >
                {ins.action} →
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
