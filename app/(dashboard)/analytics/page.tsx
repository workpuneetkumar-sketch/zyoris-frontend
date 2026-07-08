"use client";

// app/(dashboard)/analytics/page.tsx
// Analytics Page combining both pipeline and additional analytics

import { useAnalytics } from "@/hooks/useAnalytics";
import { PipelineAnalyticsDashboard } from "@/components/analytics/PipelineAnalyticsDashboard";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TrendingUp, Users, Briefcase } from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt$(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toLocaleString()}`;
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color?: string }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} style={{ color: entry.color || "#374151" }}>
          {entry.name}: {typeof entry.value === "number" && entry.value > 1000
            ? fmt$(entry.value)
            : entry.value}
        </p>
      ))}
    </div>
  );
}

// ── Demand Trends Chart ───────────────────────────────────────────────────────

function DemandTrendsChart({ data }: { data: NonNullable<ReturnType<typeof useAnalytics>["demand"]> }) {
  if (!data) return <div className="h-48 flex items-center justify-center text-xs text-gray-400">No demand data</div>;

  const chartData = data.months.map((month, index) => ({
    month,
    Demand: data.demand[index] ?? 0,
    Inventory: data.inventory[index] ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={(v) => fmt$(v)} width={55} />
        <Tooltip content={<CustomTooltip />} />
        <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: "11px" }} />
        <Line type="monotone" dataKey="Demand" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Demand" />
        <Line type="monotone" dataKey="Inventory" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Inventory" />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Segments Chart ────────────────────────────────────────────────────────────

const SEGMENT_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

function SegmentsChart({ data }: { data: NonNullable<ReturnType<typeof useAnalytics>["segments"]> }) {
  if (!data || data.length === 0) return <div className="h-48 flex items-center justify-center text-xs text-gray-400">No segments data</div>;

  const chartData = data.map((seg) => ({
    name: seg.name,
    value: seg.share * 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={3}
          dataKey="value"
          nameKey="name"
        >
          {chartData.map((entry, idx) => (
            <Cell key={idx} fill={SEGMENT_COLORS[idx % SEGMENT_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [`${value.toFixed(0)}%`, "Share"]}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
        />
        <Legend formatter={(value) => <span style={{ fontSize: 11, color: "#64748b" }}>{value}</span>} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── Revenue Drivers Chart ─────────────────────────────────────────────────────

function RevenueDriversChart({ data }: { data: NonNullable<ReturnType<typeof useAnalytics>["drivers"]> }) {
  if (!data) return <div className="h-48 flex items-center justify-center text-xs text-gray-400">No drivers data</div>;

  const chartData = data.channels.map((drv) => ({
    name: drv.name,
    Revenue: drv.revenue,
    Marketing: drv.marketing,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }} barSize={28}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={(v) => fmt$(v)} width={55} />
        <Tooltip content={<CustomTooltip />} />
        <Legend iconType="rect" iconSize={6} wrapperStyle={{ fontSize: "11px" }} />
        <Bar dataKey="Revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Marketing" name="Marketing" fill="#f59e0b" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Main Page Component ───────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const {
    loading: analyticsLoading,
    forecast,
    demand,
    segments,
    drivers,
    isForecastDemo,
    isDemandDemo,
    isSegmentsDemo,
    isDriversDemo,
  } = useAnalytics();

  return (
    <div className="space-y-8 pb-8">
      <PipelineAnalyticsDashboard />
      
      {/* Additional Analytics Sections */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Additional Analytics</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Demand & Inventory Trends */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <TrendingUp size={16} className="text-blue-600" />
                  Demand & Inventory Trends
                </p>
                <p className="text-xs text-gray-400">Market demand vs stock levels</p>
              </div>
              {isDemandDemo && (
                <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full border border-amber-100">
                  Demo
                </span>
              )}
            </div>
            {analyticsLoading ? (
              <div className="h-48 animate-pulse bg-gray-100 rounded-xl" />
            ) : demand ? (
              <DemandTrendsChart data={demand} />
            ) : (
              <div className="h-48 flex items-center justify-center text-xs text-gray-400">No demand data available</div>
            )}
          </div>
          
          {/* Segment Clustering */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Users size={16} className="text-blue-600" />
                  Segment Clustering
                </p>
                <p className="text-xs text-gray-400">Customer segment distribution</p>
              </div>
              {isSegmentsDemo && (
                <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full border border-amber-100">
                  Demo
                </span>
              )}
            </div>
            {analyticsLoading ? (
              <div className="h-48 animate-pulse bg-gray-100 rounded-xl" />
            ) : segments ? (
              <SegmentsChart data={segments} />
            ) : (
              <div className="h-48 flex items-center justify-center text-xs text-gray-400">No segments data available</div>
            )}
          </div>
          
          {/* Revenue Drivers & ROI */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Briefcase size={16} className="text-blue-600" />
                  Revenue Drivers & ROI
                </p>
                <p className="text-xs text-gray-400">Revenue vs marketing spend by channel</p>
              </div>
              {isDriversDemo && (
                <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full border border-amber-100">
                  Demo
                </span>
              )}
            </div>
            {analyticsLoading ? (
              <div className="h-48 animate-pulse bg-gray-100 rounded-xl" />
            ) : drivers ? (
              <RevenueDriversChart data={drivers} />
            ) : (
              <div className="h-48 flex items-center justify-center text-xs text-gray-400">No drivers data available</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
