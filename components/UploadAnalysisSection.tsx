"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

import type { DataSenseReportData } from "./DataSenseReport";

export interface UploadAnalysisData {
  totalRows: number;
  totalValue: number;
  growthPercent: number | null;
  topProducts: { name: string; value: number }[];
  byCategory: { name: string; value: number }[];
  revenueOverTime: { date: string; value: number }[];
  monthlyComparison: { month: string; value: number }[];
  summary: string;
  detectedColumns: {
    dateKey: string | null;
    amountKey: string | null;
    productKey: string | null;
    categoryKey: string | null;
    allKeys: string[];
  };
  dataSenseReport?: DataSenseReportData;
}

const CHART_COLORS = [
  "#2563EB", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
];

// ── Reusable card wrapper ──────────────────────────────────────
function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
      style={{ boxShadow: "0 2px 12px 0 rgba(0,0,0,0.05)" }}
    >
      <div className="px-5 py-4 border-b border-gray-50">
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Custom tooltip ─────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="bg-white border border-gray-100 rounded-xl px-3 py-2.5 text-xs"
      style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
    >
      {label && <p className="text-gray-400 mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-semibold" style={{ color: p.color ?? "#2563EB" }}>
          {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
}

// ── Pie chart (reused in two places) ──────────────────────────
function PieChartInner({ pieData }: { pieData: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={pieData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
          label={({ name, percent }) =>
            `${String(name).slice(0, 10)} ${(percent * 100).toFixed(0)}%`
          }
          labelLine={{ stroke: "#E5E7EB", strokeWidth: 1 }}
        >
          {pieData.map((_, i) => (
            <Cell
              key={i}
              fill={CHART_COLORS[i % CHART_COLORS.length]}
              stroke="white"
              strokeWidth={2}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => (
            <span style={{ color: "#6B7280", fontSize: 11 }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── Bar chart (reused in two places) ──────────────────────────
function BarChartInner({ barData, height = 220 }: { barData: { name: string; value: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={barData} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
        <XAxis
          type="number"
          stroke="#D1D5DB"
          tick={{ fill: "#9CA3AF", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)}
        />
        <YAxis
          type="category"
          dataKey="name"
          stroke="#D1D5DB"
          tick={{ fill: "#6B7280", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={90}
          tickFormatter={(v) => (v.length > 11 ? v.slice(0, 11) + "…" : v)}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="value" fill="#2563EB" name="Value" radius={[0, 6, 6, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function UploadAnalysisSection({ analysis }: { analysis: UploadAnalysisData }) {
  const timeData = analysis.revenueOverTime?.length
    ? analysis.revenueOverTime
    : analysis.monthlyComparison?.length
      ? analysis.monthlyComparison.map((d) => ({ date: d.month, value: d.value }))
      : [];
  const barData = (analysis.topProducts ?? []).slice(0, 8);
  const pieData = (analysis.byCategory ?? []).slice(0, 8);

  const growthPositive =
    analysis.growthPercent != null && analysis.growthPercent >= 0;

  return (
    <div className="space-y-4 mt-4">

      {/* ── Section header ── */}
      <div>
        <h2 className="text-base font-bold text-gray-800">Analysis from your file</h2>
        <p className="text-xs text-gray-400 mt-0.5">Insights generated from your uploaded data.</p>
      </div>

      {/* ── Summary banner ── */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4">
        <div className="w-1 self-stretch rounded-full bg-blue-500 shrink-0" />
        <p className="text-sm text-blue-800 leading-relaxed">{analysis.summary}</p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-3 gap-4">

        {/* Total value */}
        <div
          className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3"
          style={{ boxShadow: "0 2px 12px 0 rgba(0,0,0,0.05)" }}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Total Value</p>
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900 tracking-tight">
              {analysis.totalValue >= 1000
                ? `$${(analysis.totalValue / 1000).toFixed(1)}k`
                : `$${Math.round(analysis.totalValue)}`}
            </p>
            <p className="text-xs text-gray-400 mt-1">From uploaded data</p>
          </div>
        </div>

        {/* Rows analyzed */}
        <div
          className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3"
          style={{ boxShadow: "0 2px 12px 0 rgba(0,0,0,0.05)" }}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Rows Analyzed</p>
            <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M3 15h18M9 3v18" />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900 tracking-tight">
              {analysis.totalRows.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-1">Records processed</p>
          </div>
        </div>

        {/* Trend */}
        <div
          className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3"
          style={{ boxShadow: "0 2px 12px 0 rgba(0,0,0,0.05)" }}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Trend</p>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${growthPositive ? "bg-emerald-50" : "bg-red-50"}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={growthPositive ? "#10b981" : "#ef4444"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {growthPositive ? (
                  <>
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                    <polyline points="17 6 23 6 23 12" />
                  </>
                ) : (
                  <>
                    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                    <polyline points="17 18 23 18 23 12" />
                  </>
                )}
              </svg>
            </div>
          </div>
          <div>
            <p className={`text-3xl font-bold tracking-tight ${growthPositive ? "text-emerald-500" : "text-red-500"}`}>
              {analysis.growthPercent != null
                ? `${growthPositive ? "+" : ""}${analysis.growthPercent}%`
                : "—"}
            </p>
            <p className="text-xs text-gray-400 mt-1">Month-over-month</p>
          </div>
          {analysis.growthPercent != null && (
            <div className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-lg w-fit ${growthPositive ? "text-emerald-600 bg-emerald-50" : "text-red-500 bg-red-50"}`}>
              {growthPositive ? "↑ Growing" : "↓ Declining"}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 1: Line + Bar (when line data exists) ── */}
      {timeData.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <ChartCard title="Value over time">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={timeData}>
                <defs>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#D1D5DB"
                  tick={{ fill: "#9CA3AF", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => String(v).slice(0, 7)}
                />
                <YAxis
                  stroke="#D1D5DB"
                  tick={{ fill: "#9CA3AF", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#2563EB"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#2563EB", strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: "#2563EB", strokeWidth: 0 }}
                  name="Value"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {barData.length > 0 ? (
            <ChartCard title="Top items by value">
              <BarChartInner barData={barData} height={220} />
            </ChartCard>
          ) : (
            <div />
          )}
        </div>
      )}

      {/* ── Row 2: Bar + Pie side by side (no line data) ── */}
      {!timeData.length && barData.length > 0 && pieData.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <ChartCard title="Top items by value">
            <BarChartInner barData={barData} height={240} />
          </ChartCard>
          <ChartCard title="By category">
            <PieChartInner pieData={pieData} />
          </ChartCard>
        </div>
      )}

      {/* ── Bar only (no line, no pie) ── */}
      {!timeData.length && barData.length > 0 && !pieData.length && (
        <div className="grid grid-cols-2 gap-4">
          <ChartCard title="Top items by value">
            <BarChartInner barData={barData} height={240} />
          </ChartCard>
          <div />
        </div>
      )}

      {/* ── Pie alongside empty (when line data exists) ── */}
      {timeData.length > 0 && pieData.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <ChartCard title="By category">
            <PieChartInner pieData={pieData} />
          </ChartCard>
          <div />
        </div>
      )}
    </div>
  );
}