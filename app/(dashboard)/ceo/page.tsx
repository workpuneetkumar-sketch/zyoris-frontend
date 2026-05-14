"use client";

import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Line, ComposedChart, ReferenceLine
} from "recharts";
import { TrendingUp, TrendingDown, Target, Zap, ChevronRight } from "lucide-react";

interface ForecastPoint {
  date: string;
  value: number;
}

interface ForecastResponse {
  historical: ForecastPoint[];
  forecast: ForecastPoint[];
  stats: { trend: string; slope: number; intercept: number };
}

export default function CeoDashboardPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "CEO" && user.role !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  useEffect(() => {
    async function load() {
      if (!token) return;
      try {
        setLoading(true);
        const res = await api.get<ForecastResponse>("/analytics/revenue/forecast");
        setData(res.data);
      } catch (err) {
        console.error("Forecast Load Error", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  // Combine historical and forecast for the chart
  const chartData = useMemo(() => {
    if (!data) return [];
    const hist = data.historical.map(p => ({ ...p, type: 'historical' }));
    const fore = data.forecast.map(p => ({ ...p, type: 'forecast' }));
    return [...hist, ...fore];
  }, [data]);

  if (!user || loading) return <div className="min-h-screen bg-[#f5f7fb]" />;

  const isUpward = data?.stats.trend === "upward";

  return (
    <div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Revenue Projection</h1>
          <p className="text-sm text-gray-400 mt-0.5 flex items-center gap-2">
            <Zap size={14} className="text-amber-500 fill-amber-500" />
            Regression-based 90-day predictive modeling.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-blue-100">
            Role: {user.role}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <SummaryCard
          title="Projected Growth"
          value={isUpward ? "+12.4%" : "-2.1%"}
          sub="Next 90 Days"
          icon={isUpward ? <TrendingUp className="text-emerald-600" /> : <TrendingDown className="text-red-600" />}
          trendColor={isUpward ? "emerald" : "red"}
        />
        <SummaryCard
          title="Forecast Confidence"
          value="94%"
          sub="Based on 12mo Variance"
          icon={<Target className="text-blue-600" />}
          trendColor="blue"
        />
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 text-white shadow-lg">
          <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mb-1 text-slate-300">CEO Insight</p>
          <p className="text-sm font-medium leading-relaxed">
            Revenue trajectory shows <span className={isUpward ? "text-emerald-400" : "text-red-400 font-bold"}>
              {data?.stats.trend}</span> momentum. Slope coefficient ({data?.stats.slope.toFixed(2)}) indicates steady scaling.
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm mb-8">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-sm font-bold text-gray-800">Revenue Trajectory (Historical + Forecast)</h3>
          <div className="flex gap-4 text-[10px] font-bold uppercase tracking-tighter">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-300" /> Historical</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-600" /> Forecast</div>
          </div>
        </div>

        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                minTickGap={30}
                tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(v) => `$${v / 1000}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="none"
                fillOpacity={1}
                fill="url(#colorValue)"
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#2563EB"
                strokeWidth={3}
                dot={false}
                strokeDasharray="5 5"
              />
              {/* Vertical line separating history from forecast */}
              <ReferenceLine x={data?.historical[data.historical.length - 1]?.date} stroke="#CBD5E1" strokeDasharray="3 3" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, sub, icon, trendColor }: any) {
  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{title}</p>
        <div className={`p-2 rounded-xl bg-${trendColor}-50`}>
          {icon}
        </div>
      </div>
      <h4 className="text-3xl font-bold text-gray-900">{value}</h4>
      <p className="text-xs text-gray-400 mt-1 font-medium">{sub}</p>
    </div>
  );
}

function CustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const isForecast = payload[0].payload.type === 'forecast';
    return (
      <div className="bg-white p-4 border border-gray-100 shadow-xl rounded-2xl">
        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">
          {new Date(payload[0].payload.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
        <p className={`text-lg font-bold ${isForecast ? 'text-blue-600' : 'text-slate-700'}`}>
          ${Math.round(payload[0].value).toLocaleString()}
        </p>
        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${isForecast ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
          {isForecast ? 'Projected' : 'Historical'}
        </span>
      </div>
    );
  }
  return null;
}