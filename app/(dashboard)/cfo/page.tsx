"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, BarChart2, Wallet, ClipboardCheck, TrendingUp } from "lucide-react";
import { CFOOverviewSection } from "@/components/dashboard/compoents/CFOOverviewSection";
import api from "@/lib/api/api";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, Pie, PieChart as RechartsPieChart, Cell
} from "recharts";

interface CFODashboardData {
  marginTrends: {
    margin: number;
    marginPct: number;
  };
  expensesSummary: {
    totalExpenses: number;
  };
  marketingPerformance: {
    channel: string;
    spend: number;
    attributedRevenue: number;
    roi: number;
  }[];
  approvalWorkflows: {
    pendingApprovals: number;
  };
}

interface ForecastPoint {
  date: string;
  value: number;
}

interface ForecastResponse {
  forecast: ForecastPoint[];
  historical: ForecastPoint[];
  stats: {
    trend: string;
    slope: number;
  };
}

function makeDateMonthsAgo(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().split("T")[0];
}

function isForecastPointsEmpty(points: ForecastPoint[] | undefined): boolean {
  return !points?.length || points.every((p) => !p.value);
}

function isCFODataEmpty(data: CFODashboardData | null | undefined): boolean {
  if (!data) return true;
  const marginEmpty = !data.marginTrends?.margin && !data.marginTrends?.marginPct;
  const expensesEmpty = !data.expensesSummary?.totalExpenses;
  const approvalsEmpty = !data.approvalWorkflows?.pendingApprovals;
  const marketingEmpty = !data.marketingPerformance?.length;
  return marginEmpty && expensesEmpty && approvalsEmpty && marketingEmpty;
}

function isCFOForecastEmpty(forecast: ForecastResponse | null | undefined): boolean {
  if (!forecast) return true;
  return (
    isForecastPointsEmpty(forecast.historical) &&
    isForecastPointsEmpty(forecast.forecast)
  );
}

const CFO_MOCK_DATA: CFODashboardData = {
  marginTrends: { margin: 892400, marginPct: 0.36 },
  expensesSummary: { totalExpenses: 1580000 },
  marketingPerformance: [
    { channel: "Paid Search", spend: 185000, attributedRevenue: 740000, roi: 4.0 },
    { channel: "LinkedIn Ads", spend: 92000, attributedRevenue: 276000, roi: 3.0 },
    { channel: "Content / SEO", spend: 48000, attributedRevenue: 192000, roi: 4.0 },
    { channel: "Events & Webinars", spend: 64000, attributedRevenue: 128000, roi: 2.0 },
  ],
  approvalWorkflows: { pendingApprovals: 7 },
};

const CFO_MOCK_FORECAST: ForecastResponse = {
  historical: [6, 5, 4, 3, 2, 1].map((m) => ({
    date: makeDateMonthsAgo(m),
    value: 210000 + (6 - m) * 28000,
  })),
  forecast: [1, 2, 3].map((m) => ({
    date: makeDateMonthsAgo(-m),
    value: 370000 + m * 24000,
  })),
  stats: { trend: "upward", slope: 22100 },
};

const COLORS = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444"];

function DemoDataBadge() {
  return (
    <span className="px-2 py-0.5 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-md">
      Demo Data
    </span>
  );
}

function CFODemoDashboard({ data, forecast }: { data: CFODashboardData; forecast: ForecastResponse }) {
  const { marginTrends, expensesSummary, approvalWorkflows } = data;

  const cards = [
    {
      title: "Gross Margin",
      value: `${Math.round(marginTrends.marginPct * 100)}%`,
      subValue: `$${Math.round(marginTrends.margin).toLocaleString()}`,
      icon: BarChart2,
      color: "blue",
      status: marginTrends.marginPct >= 0.3 ? "Positive" : "Review Required",
    },
    {
      title: "Total Expenses",
      value: `$${Math.round(expensesSummary.totalExpenses / 1000)}k`,
      subValue: "Current Period",
      icon: Wallet,
      color: "violet",
      status: "On Track",
    },
    {
      title: "Pending Approvals",
      value: approvalWorkflows.pendingApprovals.toString(),
      subValue: "Actions Required",
      icon: ClipboardCheck,
      color: "amber",
      status: approvalWorkflows.pendingApprovals > 0 ? "Pending" : "Cleared",
    },
  ];

  const totalExpensesVal = expensesSummary.totalExpenses || 0;
  const derivedExpenses = [
    { name: "Salary & Wages", value: Math.round(totalExpensesVal * 0.4) },
    { name: "Marketing Campaigns", value: Math.round(totalExpensesVal * 0.25) },
    { name: "Office Rent & Tech", value: Math.round(totalExpensesVal * 0.18) },
    { name: "Travel & Leisure", value: Math.round(totalExpensesVal * 0.12) },
    { name: "Miscellaneous", value: Math.round(totalExpensesVal * 0.05) },
  ].filter((item) => item.value > 0);

  const revenueChartData = [
    ...(forecast.historical || []).map((p) => ({ ...p, type: "Historical" })),
    ...(forecast.forecast || []).map((p) => ({ ...p, type: "Forecast" })),
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div key={card.title} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{card.title}</p>
              <div className={`p-2 rounded-xl bg-${card.color}-50 border border-${card.color}-100 group-hover:scale-110 transition-transform`}>
                <card.icon size={16} className={`text-${card.color}-600`} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-gray-900">{card.value}</p>
              <p className="text-sm text-gray-400 font-medium">{card.subValue}</p>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  card.status === "Positive" || card.status === "Cleared" || card.status === "On Track"
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                    : "bg-amber-50 text-amber-600 border border-amber-100"
                }`}
              >
                {card.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-[380px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-800">Revenue Forecast Trend</h3>
              <p className="text-xs text-gray-400 mt-0.5">Historical revenue and regression-based forecast.</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 uppercase bg-emerald-50 text-emerald-600">
              <TrendingUp size={12} />
              {forecast.stats.trend}
            </span>
          </div>
          <div className="flex-1 min-h-0 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChartData}>
                <defs>
                  <linearGradient id="colorRevCfoDemo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#9ca3af", fontSize: 10 }}
                  minTickGap={40}
                  tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#9ca3af", fontSize: 10 }}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(val: number) => [`$${Math.round(val).toLocaleString()}`, "Revenue"]}
                  labelFormatter={(label) =>
                    new Date(label).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
                  }
                  contentStyle={{ borderRadius: "12px", border: "1px solid #f3f4f6", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)" }}
                />
                <Area type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorRevCfoDemo)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-[380px]">
          <div>
            <h3 className="text-sm font-bold text-gray-800">Expense Allocations</h3>
            <p className="text-xs text-gray-400 mt-0.5">Dynamic cost categories proportional to total spend.</p>
          </div>
          <div className="flex-1 min-h-0 w-full flex flex-col sm:flex-row items-center justify-center gap-4 mt-2">
            <div className="w-[180px] h-[180px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={derivedExpenses}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {derivedExpenses.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number) => [`$${val.toLocaleString()}`, "Amount"]} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2.5 w-full sm:w-auto">
              {derivedExpenses.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="text-gray-500 font-medium">{item.name}</span>
                  </div>
                  <span className="text-gray-800 font-semibold font-mono">
                    ${item.value.toLocaleString()} ({Math.round((item.value / totalExpensesVal) * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {data.marketingPerformance.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="text-sm font-semibold text-gray-800">Marketing ROI Analysis</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Channel</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Spend</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Revenue</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">ROI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.marketingPerformance.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4 text-sm font-medium text-gray-700">{item.channel}</td>
                    <td className="px-5 py-4 text-sm text-gray-600 text-right font-mono">${Math.round(item.spend).toLocaleString()}</td>
                    <td className="px-5 py-4 text-sm text-gray-600 text-right font-mono">${Math.round(item.attributedRevenue).toLocaleString()}</td>
                    <td className="px-5 py-4 text-right">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                          item.roi >= 3
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                            : "bg-blue-50 text-blue-600 border border-blue-100"
                        }`}
                      >
                        {item.roi.toFixed(2)}x
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CfoDashboardPage() {
  const { user, token, isInitializing } = useAuth();
  const router = useRouter();
  const [apiData, setApiData] = useState<CFODashboardData | null>(null);
  const [apiForecast, setApiForecast] = useState<ForecastResponse | null>(null);
  const [dataChecked, setDataChecked] = useState(false);

  useEffect(() => {
    if (!isInitializing && user && user.role !== "CFO" && user.role !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [user, isInitializing, router]);

  useEffect(() => {
    if (!token) return;

    async function loadCfoData() {
      try {
        const [cfoRes, forecastRes] = await Promise.all([
          api.get<CFODashboardData>("/dashboard/cfo"),
          api.get<ForecastResponse>("/analytics/revenue/forecast").catch(() => ({ data: null })),
        ]);
        setApiData(cfoRes.data);
        if (forecastRes.data) {
          setApiForecast(forecastRes.data);
        }
      } catch {
        // preserve existing CFOOverviewSection error handling when real data path is used
      } finally {
        setDataChecked(true);
      }
    }

    loadCfoData();
  }, [token]);

  if (isInitializing || !user) return <div className="min-h-screen bg-[#f5f7fb]" />;

  const usingDemoData = dataChecked && isCFODataEmpty(apiData);
  const finalData = usingDemoData ? CFO_MOCK_DATA : apiData!;
  const finalForecast =
    usingDemoData || isCFOForecastEmpty(apiForecast) ? CFO_MOCK_FORECAST : apiForecast!;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Financial Overview</h1>
            {usingDemoData && <DemoDataBadge />}
          </div>
          <p className="text-sm text-gray-400 mt-0.5">
            Portfolio margin health and spend efficiency.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 w-64 shadow-sm">
            <Search size={14} className="text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Search reports..."
              className="bg-transparent text-sm text-gray-600 outline-none w-full"
            />
          </div>
          <button className="relative p-2.5 rounded-xl bg-white border border-gray-200 shadow-sm text-gray-500 hover:text-gray-700">
            <Bell size={17} />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full ring-1 ring-white" />
          </button>
          <div className="px-3 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-blue-100">
            CFO Console
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {usingDemoData ? (
          <CFODemoDashboard data={finalData} forecast={finalForecast} />
        ) : dataChecked ? (
          <CFOOverviewSection token={token!} />
        ) : (
          <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-32 bg-gray-200 rounded-2xl" />
              <div className="h-32 bg-gray-200 rounded-2xl" />
              <div className="h-32 bg-gray-200 rounded-2xl" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
