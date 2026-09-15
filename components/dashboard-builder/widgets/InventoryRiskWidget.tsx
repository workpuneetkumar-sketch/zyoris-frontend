"use client";

// components/dashboard-builder/widgets/InventoryRiskWidget.tsx

import { AlertTriangle, Package, TrendingDown } from "lucide-react";

const RISK_ITEMS = [
  { name: "Product A — SKU 1042", level: "HIGH", stock: 12, threshold: 50, icon: "🔴" },
  { name: "Product B — SKU 2081", level: "MEDIUM", stock: 38, threshold: 75, icon: "🟡" },
  { name: "Product C — SKU 3014", level: "LOW", stock: 94, threshold: 100, icon: "🟢" },
  { name: "Product D — SKU 4095", level: "HIGH", stock: 5, threshold: 40, icon: "🔴" },
];

const levelColors: Record<string, string> = {
  HIGH: "text-red-600 bg-red-50 border-red-100",
  MEDIUM: "text-amber-600 bg-amber-50 border-amber-100",
  LOW: "text-emerald-600 bg-emerald-50 border-emerald-100",
};

export function InventoryRiskWidget({ isPreview }: { isPreview?: boolean }) {
  const highRisk = RISK_ITEMS.filter((i) => i.level === "HIGH").length;
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3 px-1">
        <AlertTriangle size={14} className="text-red-500" />
        <span className="text-sm font-semibold text-gray-700">{highRisk} items at high risk</span>
        <span className="ml-auto text-xs text-gray-400">{RISK_ITEMS.length} total tracked</span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
        {RISK_ITEMS.map((item) => {
          const pct = Math.round((item.stock / item.threshold) * 100);
          return (
            <div key={item.name} className={`rounded-lg border p-2.5 ${levelColors[item.level]}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium truncate">{item.name}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${levelColors[item.level]}`}>
                  {item.level}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-white/60 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(pct, 100)}%`,
                      backgroundColor: item.level === "HIGH" ? "#ef4444" : item.level === "MEDIUM" ? "#f59e0b" : "#10b981",
                    }}
                  />
                </div>
                <span className="text-[10px] font-semibold flex-shrink-0">{item.stock} / {item.threshold}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
