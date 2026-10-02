"use client";
// components/dashboard-builder/widgets/InventoryRiskWidget.tsx
// Real data: GET /dashboard/operations via useDashboardOperations hook.
// Mock RISK_ITEMS (Product A-D with hardcoded SKU/stock/threshold) removed entirely.

import { AlertTriangle, Package, TrendingDown, RefreshCw, AlertCircle } from "lucide-react";
import { useDashboardOperations } from "@/hooks/useDashboard";
import type { DashboardOperations } from "@/lib/api/dashboardApi";

type RiskItem = NonNullable<DashboardOperations["inventoryRisks"]>[number];

const LEVEL_STYLES: Record<string, { dot: string; badge: string; bar: string }> = {
  HIGH:   { dot: "🔴", badge: "text-red-600 bg-red-50 border-red-100",    bar: "#ef4444" },
  MEDIUM: { dot: "🟡", badge: "text-amber-600 bg-amber-50 border-amber-100", bar: "#f59e0b" },
  LOW:    { dot: "🟢", badge: "text-emerald-600 bg-emerald-50 border-emerald-100", bar: "#10b981" },
};
const DEFAULT_STYLE = { dot: "⚪", badge: "text-gray-500 bg-gray-50 border-gray-100", bar: "#94a3b8" };

function getStyle(level?: string) {
  return LEVEL_STYLES[(level ?? "").toUpperCase()] ?? DEFAULT_STYLE;
}

export function InventoryRiskWidget({ isPreview }: { isPreview?: boolean }) {
  const { data: ops, loading, error, refetch } = useDashboardOperations();

  if (loading) {
    return (
      <div className="h-full flex flex-col gap-2 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-gray-50">
            <div className="w-4 h-4 bg-gray-200 rounded flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="h-3 w-32 bg-gray-200 rounded" />
              <div className="h-1.5 w-full bg-gray-200 rounded-full" />
            </div>
            <div className="h-5 w-14 bg-gray-200 rounded-full flex-shrink-0" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 p-3 text-center">
        <AlertCircle size={20} className="text-red-400" />
        <p className="text-xs text-gray-500">{error}</p>
        <button onClick={refetch} className="flex items-center gap-1 text-xs text-indigo-600 hover:underline">
          <RefreshCw size={11} /> Retry
        </button>
      </div>
    );
  }

  const risks: RiskItem[] = ops?.inventoryRisks ?? [];

  if (risks.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-1 p-3 text-center">
        <Package size={20} className="text-gray-300" />
        <p className="text-xs text-gray-400">No inventory risks detected</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-2 overflow-y-auto">
      {risks.slice(0, 6).map((item, i) => {
        const style = getStyle(item.level as string);
        const name  = (item.item ?? item.risk ?? `Item ${i + 1}`) as string;
        const level = (item.level ?? "—") as string;

        // If stock/threshold exist, show a progress bar
        const stock     = typeof item.stock     === "number" ? item.stock     : null;
        const threshold = typeof item.threshold === "number" ? item.threshold : null;
        const pct       = (stock !== null && threshold !== null && threshold > 0)
          ? Math.min(100, Math.round((stock / threshold) * 100))
          : null;

        return (
          <div key={item.id ?? i} className="flex items-center gap-2 p-2 rounded-xl bg-gray-50">
            <span className="text-sm flex-shrink-0">{style.dot}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">{name}</p>
              {pct !== null && (
                <div className="mt-0.5 w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: style.bar }}
                  />
                </div>
              )}
            </div>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border flex-shrink-0 ${style.badge}`}>
              {level.toUpperCase()}
            </span>
          </div>
        );
      })}
    </div>
  );
}
