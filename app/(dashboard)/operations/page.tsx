"use client";

import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api/api";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Package,
  AlertTriangle,
  Cog,
  Shield,
  Boxes,
} from "lucide-react";

interface InventoryRisk {
  sku: string;
  name: string;
  quantity: number;
  safetyStock: number;
  coverageRatio: number;
  risk: "LOW" | "MEDIUM" | "HIGH";
}

interface OpsResponse {
  demandForecast: string;
  inventoryRiskAlerts: InventoryRisk[];
}

function riskBadgeClasses(risk: InventoryRisk["risk"]) {
  switch (risk) {
    case "HIGH":
      return "bg-red-50 text-red-600 border-red-100";
    case "MEDIUM":
      return "bg-amber-50 text-amber-600 border-amber-100";
    default:
      return "bg-emerald-50 text-emerald-600 border-emerald-100";
  }
}

function DemandForecastDisplay({ forecast }: { forecast?: string }) {
  if (forecast === "increasing") {
    return (
      <span className="inline-flex items-center gap-2 text-emerald-600">
        <TrendingUp size={28} strokeWidth={2.5} />
        <span>Increasing</span>
      </span>
    );
  }
  if (forecast === "decreasing") {
    return (
      <span className="inline-flex items-center gap-2 text-red-600">
        <TrendingDown size={28} strokeWidth={2.5} />
        <span>Decreasing</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 text-blue-600">
      <Minus size={28} strokeWidth={2.5} />
      <span>Stable</span>
    </span>
  );
}

export default function OperationsDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [ops, setOps] = useState<OpsResponse | null>(null);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "OPERATIONS_HEAD" && user.role !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get<OpsResponse>("/dashboard/operations");
        setOps(res.data);
      } catch {
        // ignore
      }
    }
    load();
  }, []);

  if (!user) return null;

  const alerts = ops?.inventoryRiskAlerts ?? [];
  const highRiskCount = alerts.filter((a) => a.risk === "HIGH").length;

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto p-1">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Operations · Demand &amp; Inventory
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Align production, inventory, and demand using unified telemetry.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wider rounded-xl border border-blue-100 flex items-center gap-1.5 shadow-sm">
            <Shield size={13} />
            Role · Operations
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white border border-gray-100 rounded-3xl p-5 md:p-6 shadow-sm hover:shadow-md transition-all group">
          <div className="flex justify-between items-start mb-4">
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">
              Demand Forecast
            </p>
            <div className="p-2 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 group-hover:scale-110 transition-all">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-extrabold tracking-tight">
            <DemandForecastDisplay forecast={ops?.demandForecast} />
          </div>
          <p className="text-xs text-gray-400 mt-2 font-medium">
            Blend of bookings, revenue, and inventory signals.
          </p>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-5 md:p-6 shadow-sm hover:shadow-md transition-all group">
          <div className="flex justify-between items-start mb-4">
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">
              Inventory Alerts
            </p>
            <div className="p-2 rounded-2xl bg-red-50 border border-red-100 text-red-600 group-hover:scale-110 transition-all">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h4 className="text-3xl font-extrabold text-red-600 tracking-tight">
              {alerts.length}
            </h4>
            {highRiskCount > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-red-50 text-red-600 border-red-100">
                {highRiskCount} high risk
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-2 font-medium">
            SKUs below safety stock threshold or near stockout.
          </p>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-5 md:p-6 shadow-sm hover:shadow-md transition-all group sm:col-span-2 lg:col-span-1">
          <div className="flex justify-between items-start mb-4">
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">
              Optimization Focus
            </p>
            <div className="p-2 rounded-2xl bg-violet-50 border border-violet-100 text-violet-600 group-hover:scale-110 transition-all">
              <Cog size={16} />
            </div>
          </div>
          <h4 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
            Mix shift
          </h4>
          <p className="text-xs text-gray-400 mt-2 font-medium">
            Reallocate capacity from slow movers into high-velocity SKUs.
          </p>
        </div>
      </div>

      {/* Inventory risk table */}
      <div className="bg-white border border-gray-100 rounded-3xl p-5 md:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-blue-600 shrink-0" />
            <div>
              <h3 className="text-base font-bold text-gray-800">Inventory Risk by SKU</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Coverage ratios and safety stock thresholds across active SKUs.
              </p>
            </div>
          </div>
          {alerts.length > 0 && (
            <div className="px-2.5 py-1 bg-gray-50 text-gray-600 text-[10px] font-bold rounded-lg border border-gray-100 self-start">
              {alerts.length} SKU{alerts.length !== 1 ? "s" : ""} flagged
            </div>
          )}
        </div>

        {alerts.length > 0 ? (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-left min-w-[640px]">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-4 md:px-5 py-3 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-4 md:px-5 py-3 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 md:px-5 py-3 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider text-right">
                    On Hand
                  </th>
                  <th className="px-4 md:px-5 py-3 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider text-right">
                    Safety Stock
                  </th>
                  <th className="px-4 md:px-5 py-3 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider text-right">
                    Coverage
                  </th>
                  <th className="px-4 md:px-5 py-3 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider text-right">
                    Risk
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {alerts.map((a) => (
                  <tr key={a.sku} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 md:px-5 py-4 text-sm font-semibold text-gray-700 font-mono">
                      {a.sku}
                    </td>
                    <td className="px-4 md:px-5 py-4 text-sm text-gray-600">{a.name}</td>
                    <td className="px-4 md:px-5 py-4 text-sm text-gray-600 text-right font-mono">
                      {a.quantity}
                    </td>
                    <td className="px-4 md:px-5 py-4 text-sm text-gray-600 text-right font-mono">
                      {a.safetyStock}
                    </td>
                    <td className="px-4 md:px-5 py-4 text-sm text-gray-600 text-right font-mono">
                      {a.coverageRatio.toFixed(2)}x
                    </td>
                    <td className="px-4 md:px-5 py-4 text-right">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${riskBadgeClasses(a.risk)}`}
                      >
                        {a.risk}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 md:py-16 text-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <Boxes className="mx-auto text-gray-300 mb-3" size={36} />
            <p className="text-sm font-medium text-gray-500">No inventory risk alerts</p>
            <p className="text-xs mt-1 max-w-sm mx-auto">
              All SKUs are within safety stock thresholds. Alerts will appear here when coverage drops.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
