"use client";

import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api/api";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Line, ComposedChart, ReferenceLine
} from "recharts";
import {
  TrendingUp, TrendingDown, Target, Zap, DollarSign,
  Users, Sparkles, AlertCircle, Shield, Briefcase
} from "lucide-react";
import { toast } from "react-toastify";

interface ForecastPoint {
  date: string;
  value: number;
  type?: 'historical' | 'forecast';
}

interface CeoDashboardData {
  revenueForecast?: {
    historical: ForecastPoint[];
    forecast: ForecastPoint[];
    stats: { trend: string; slope: number; intercept: number };
  };
  riskIndicators?: {
    demandTrend: string;
    marginPct: number;
  };
  kpis?: {
    totalRevenue: number;
    margin: number;
    marketingRoi: number | null;
  };
}

interface Recommendation {
  id: string;
  title: string;
  description: string;
  confidence: number;
  impact?: string;
  priority?: 'high' | 'med' | 'low';
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function CeoDashboardPage() {
  const { user, token } = useAuth();
  const router = useRouter();

  const [dashboardData, setDashboardData] = useState<CeoDashboardData | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    async function loadData() {
      if (!token) return;
      try {
        setLoading(true);
        setError(null);

        // Fetch CEO dashboard, Recommendations, and Team members in parallel
        const [ceoRes, recRes, teamRes] = await Promise.all([
          api.get<CeoDashboardData>("/dashboard/ceo"),
          api.get<Recommendation[]>("/recommendations").catch(err => {
            console.error("Recommendations fetch failed", err);
            return { data: [] }; // Graceful fallback
          }),
          api.get<any>("/organizations/team-members").catch(err => {
            console.error("Team members fetch failed", err);
            return { data: [] }; // Graceful fallback
          })
        ]);

        setDashboardData(ceoRes.data);
        setRecommendations(recRes.data);
        
        // Handle variations of team members API response
        const members = teamRes.data?.data || teamRes.data || [];
        setTeamMembers(Array.isArray(members) ? members : []);

      } catch (err: any) {
        console.error("CEO Dashboard Load Error", err);
        setError("Failed to load dashboard data. Please try again later.");
        toast.error("Error loading dashboard data.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [token]);

  // Combine historical and forecast for the chart
  const chartData = useMemo(() => {
    if (!dashboardData?.revenueForecast) return [];
    const hist = (dashboardData.revenueForecast.historical || []).map(p => ({ ...p, type: 'historical' as const }));
    const fore = (dashboardData.revenueForecast.forecast || []).map(p => ({ ...p, type: 'forecast' as const }));
    return [...hist, ...fore];
  }, [dashboardData]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse p-6">
        <div className="h-8 bg-gray-200 rounded-lg w-1/4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-32 bg-gray-200 rounded-3xl" />
          <div className="h-32 bg-gray-200 rounded-3xl" />
          <div className="h-32 bg-gray-200 rounded-3xl" />
        </div>
        <div className="h-[450px] bg-gray-200 rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-gray-200 rounded-3xl" />
          <div className="h-64 bg-gray-200 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h3 className="text-lg font-bold text-gray-900 mb-2">Something went wrong</h3>
        <p className="text-sm text-gray-500 max-w-md mb-6">{error}</p>
        <button
          onClick={() => router.refresh()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all"
        >
          Retry
        </button>
      </div>
    );
  }

  const kpis = dashboardData?.kpis;
  const risk = dashboardData?.riskIndicators;
  const stats = dashboardData?.revenueForecast?.stats;
  const isUpward = stats?.trend === "upward" || stats?.trend === "increasing";

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto p-1">
      {/* ── Top Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">CEO Strategic Console</h1>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
            <Zap size={14} className="text-amber-500 fill-amber-500" />
            Executive view: Core financials, prediction forecast, organization health, and strategic recommendations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wider rounded-xl border border-blue-100 flex items-center gap-1.5 shadow-sm">
            <Shield size={13} />
            Role: {user.role}
          </div>
        </div>
      </div>

      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard
          title="Gross Margin"
          value={risk?.marginPct != null ? `${Math.round(risk.marginPct * 100)}%` : "0%"}
          sub="Margin Health Indicator"
          icon={<Target className="text-violet-600" />}
          trendColor="violet"
          status={risk?.marginPct && risk.marginPct >= 0.3 ? "Healthy" : "Needs Review"}
        />
        <SummaryCard
          title="Marketing ROI"
          value={kpis?.marketingRoi != null ? `${Number(kpis.marketingRoi).toFixed(2)}x` : "N/A"}
          sub="Attributed Channel Performance"
          icon={isUpward ? <TrendingUp className="text-emerald-600" /> : <TrendingDown className="text-red-600" />}
          trendColor={isUpward ? "emerald" : "red"}
          status={kpis?.marketingRoi && kpis.marketingRoi >= 2 ? "High Efficiency" : "Moderate"}
        />
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 text-white shadow-xl flex flex-col justify-between border border-white/5 relative overflow-hidden group">
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-all duration-500" />
          <div>
            <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mb-1.5 text-blue-200">AI Strategic Insight</p>
            <p className="text-[13.5px] font-medium leading-relaxed text-slate-100">
              Revenue trajectory exhibits <span className={`font-bold ${isUpward ? "text-emerald-400" : "text-amber-400"}`}>{stats?.trend || 'flat'}</span> momentum. 
              The regression slope coefficient is <span className="font-mono bg-white/10 px-1 py-0.5 rounded">{stats?.slope?.toFixed(2) || '0.00'}</span>.
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-blue-300">
            <span>Org Context: {user.organizationId || "No Org context"}</span>
            <Sparkles size={14} className="text-blue-400 animate-pulse" />
          </div>
        </div>
      </div>

      {/* ── Revenue Projection Chart ── */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 md:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-gray-800">Revenue Trajectory & Forecast Horizon</h3>
            <p className="text-xs text-gray-400 mt-0.5">Historical earnings combined with 90-day regression predictive modeling.</p>
          </div>
          <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-50 p-2 rounded-xl border border-gray-100 self-start">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-slate-300" /> Historical</div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Forecast</div>
          </div>
        </div>

        <div className="h-[400px] w-full">
          {chartData.length > 0 ? (
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
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  minTickGap={40}
                  tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  tickFormatter={(v) => `$${v.toLocaleString()}`}
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
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
                {dashboardData?.revenueForecast?.historical && dashboardData.revenueForecast.historical.length > 0 && (
                  <ReferenceLine
                    x={dashboardData.revenueForecast.historical[dashboardData.revenueForecast.historical.length - 1]?.date}
                    stroke="#94a3b8"
                    strokeDasharray="4 4"
                    label={{ value: 'Forecast Start', fill: '#64748b', fontSize: 10, position: 'top' }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <div>
                <Briefcase className="mx-auto text-gray-300 mb-2" size={32} />
                <p className="text-sm">No historical or forecast revenue data found.</p>
                <p className="text-xs mt-1">Please make sure the warehouse is seeded and contains invoices.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Grid: Recommendations & Team ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Strategy Recommendations */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col h-[480px]">
          <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
            <Sparkles size={18} className="text-blue-600" />
            <div>
              <h3 className="text-base font-bold text-gray-800">Autonomous Strategic Advice</h3>
              <p className="text-xs text-gray-400 mt-0.5">Prescriptive insights generated from ERP and CRM patterns.</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50 mt-2 pr-1">
            {recommendations.length > 0 ? (
              recommendations.map((rec, idx) => (
                <div key={rec.id || idx} className="py-4 hover:bg-slate-50/50 px-2 rounded-2xl transition-colors group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          rec.priority === 'high' ? 'bg-red-50 text-red-600 border border-red-100' :
                          rec.priority === 'med' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                          'bg-blue-50 text-blue-600 border border-blue-100'
                        }`}>
                          {rec.priority || 'medium'}
                        </span>
                        <h4 className="text-sm font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{rec.title}</h4>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">{rec.description}</p>
                      {rec.impact && <p className="text-[10px] text-emerald-600 font-semibold mt-1">Impact: {rec.impact}</p>}
                    </div>
                    <span className="text-[10px] font-extrabold bg-blue-50 border border-blue-100 text-blue-600 px-2 py-1 rounded-lg shrink-0">
                      {Math.round((rec.confidence || 0.85) * 100)}% Confidence
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
                <Sparkles className="text-gray-300 mb-2" size={28} />
                <p className="text-sm">No strategic recommendations available.</p>
              </div>
            )}
          </div>
        </div>

        {/* Team Members / Organization Health */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col h-[480px]">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-violet-600" />
              <div>
                <h3 className="text-base font-bold text-gray-800">Team & Organization</h3>
                <p className="text-xs text-gray-400 mt-0.5">Active team directory and assigned access roles.</p>
              </div>
            </div>
            <div className="px-2.5 py-1 bg-violet-50 text-violet-700 text-[10px] font-bold rounded-lg border border-violet-100">
              {teamMembers.length} Members
            </div>
          </div>
          <div className="flex-1 overflow-y-auto mt-2 pr-1">
            {teamMembers.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {teamMembers.map((member) => (
                  <div key={member.id} className="py-3.5 flex items-center justify-between group hover:bg-slate-50/50 px-2 rounded-2xl transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-sm border border-violet-200 uppercase">
                        {member.name.substring(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800 group-hover:text-violet-600 transition-colors">{member.name}</p>
                        <p className="text-xs text-gray-400">{member.email}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full border border-gray-200">
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
                <Users className="text-gray-300 mb-2" size={28} />
                <p className="text-sm">No team members registered.</p>
                <p className="text-xs mt-1">Use settings to register and link colleagues.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

function SummaryCard({ title, value, sub, icon, trendColor, status }: any) {
  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
      <div className="flex justify-between items-start mb-4">
        <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">{title}</p>
        <div className={`p-2 rounded-2xl bg-${trendColor}-50 border border-${trendColor}-100 group-hover:scale-110 transition-all`}>
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <h4 className="text-3xl font-extrabold text-gray-900 tracking-tight">{value}</h4>
        {status && (
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
            status === 'Healthy' || status === 'High Efficiency'
              ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
              : 'bg-amber-50 text-amber-600 border-amber-100'
          }`}>
            {status}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-2 font-medium">{sub}</p>
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
        <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
          isForecast ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-slate-100 text-slate-500 border border-slate-200'
        }`}>
          {isForecast ? 'Projected' : 'Historical'}
        </span>
      </div>
    );
  }
  return null;
}