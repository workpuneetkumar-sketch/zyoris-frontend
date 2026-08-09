"use client";

import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api/api";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp, Users, ShieldAlert, Award, FileText,
  Briefcase, CheckCircle2, AlertCircle, RefreshCw
} from "lucide-react";
import { toast } from "react-toastify";

// ─── Import the AI Insights Widget ────────────────────────────────────
import AIInsightsWidget from "@/components/dashboard/AIInsightsWidget";

interface ConversionScore {
  dealId: string;
  externalId: string | null;
  name: string;
  stage: string;
  amount: number;
  conversionProbability: number;
}

interface Lead {
  id: string;
  status: string;
  [key: string]: any;
}

interface Deal {
  dealId: string;
  stage: string;
  [key: string]: any;
}

interface SalesDashboardResponse {
  pipelineQualityScore: number;
  conversionScores: ConversionScore[];
}



export default function SalesDashboardPage() {
  const { user, token } = useAuth();
  const router = useRouter();

  const [salesData, setSalesData] = useState<SalesDashboardResponse | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "SALES_HEAD" && user.role !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  useEffect(() => {
    async function loadData() {
      if (!token) return;
      try {
        setLoading(true);
        setError(null);

        // Fetch Sales dashboard summary, all leads, and all deals in parallel
        const [salesRes, leadsRes, dealsRes] = await Promise.all([
          api.get<SalesDashboardResponse>("/dashboard/sales"),
          api.get<any>("/leads/get-leads?limit=1000").catch(err => {
            console.error("Leads fetch failed for Sales", err);
            return { data: { data: [] } };
          }),
          api.get<any>("/api/deals/get-deals?limit=1000").catch(err => {
            console.error("Deals fetch failed for Sales", err);
            return { data: { data: [] } };
          })
        ]);

        setSalesData(salesRes.data);
        
        const leadsList = leadsRes.data?.data || leadsRes.data || [];
        setLeads(Array.isArray(leadsList) ? leadsList : []);
        
        const dealsList = dealsRes.data?.data || dealsRes.data || [];
        setDeals(Array.isArray(dealsList) ? dealsList : []);

      } catch (err: any) {
        console.error("Sales Dashboard Load Error", err);
        setError("Failed to load pipeline insights.");
        toast.error("Error loading pipeline data.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [token]);

  const finalSalesData = salesData;
  const finalLeads = leads;
  const finalDeals = deals;

  // Compute Pipeline Statistics
  const pipelineStats = useMemo(() => {
    const totalLeads = finalLeads.length;
    const qualifiedLeads = finalLeads.filter(l => l.status === "QUALIFIED").length;
    const convertedLeads = finalLeads.filter(l => l.status === "CLOSED").length;
    
    // Active vs Closed deals
    const activeDeals = finalDeals.filter(d => d.stage !== "WON" && d.stage !== "LOST").length;
    const closedDeals = finalDeals.filter(d => d.stage === "WON" || d.stage === "LOST").length;

    return {
      totalLeads,
      qualifiedLeads,
      convertedLeads,
      activeDeals,
      closedDeals
    };
  }, [finalLeads, finalDeals]);

  // Compute Funnel Stage counts
  const funnelStages = useMemo(() => {
    const newLeads = finalLeads.filter(l => l.status === "NEW").length;
    const contactedLeads = finalLeads.filter(l => l.status === "CONTACTED").length;
    const qualifiedLeads = finalLeads.filter(l => l.status === "QUALIFIED").length;
    const proposalDeals = finalDeals.filter(d => d.stage === "PROPOSAL" || d.stage === "NEGOTIATION").length;
    const convertedDeals = finalDeals.filter(d => d.stage === "WON").length;

    const maxVal = Math.max(newLeads, contactedLeads, qualifiedLeads, proposalDeals, convertedDeals, 1);

    return [
      { name: "New Leads", count: newLeads, percent: Math.round((newLeads / maxVal) * 100), color: "bg-blue-600" },
      { name: "Contacted Leads", count: contactedLeads, percent: Math.round((contactedLeads / maxVal) * 100), color: "bg-indigo-600" },
      { name: "Qualified Leads", count: qualifiedLeads, percent: Math.round((qualifiedLeads / maxVal) * 100), color: "bg-violet-600" },
      { name: "Proposals (Negotiation)", count: proposalDeals, percent: Math.round((proposalDeals / maxVal) * 100), color: "bg-pink-600" },
      { name: "Converted Deals (Won)", count: convertedDeals, percent: Math.round((convertedDeals / maxVal) * 100), color: "bg-emerald-600" },
    ];
  }, [finalLeads, finalDeals]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse p-6">
        <div className="h-8 bg-gray-200 rounded-lg w-1/4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-32 bg-gray-200 rounded-2xl" />
          <div className="h-32 bg-gray-200 rounded-2xl" />
          <div className="h-32 bg-gray-200 rounded-2xl" />
        </div>
        <div className="h-[400px] bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h3 className="text-lg font-bold text-gray-900 mb-2">Workspace Error</h3>
        <p className="text-sm text-gray-500 max-w-md mb-6">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all"
        >
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  const scores = finalSalesData?.conversionScores || [];
  const avgScore = finalSalesData?.pipelineQualityScore ||
    (scores.length === 0 ? 0 : scores.reduce((s, d) => s + d.conversionProbability, 0) / scores.length);

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto p-1">
      {/* ── Top Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Sales Pipeline Dashboard</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Analyze conversion rates, deal quality indexes, and lead pipeline volume.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wider rounded-xl border border-blue-100 flex items-center gap-1.5 shadow-sm">
            <Award size={13} />
            Role: Sales Head
          </div>
        </div>
      </div>

      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Pipeline Quality Score Card */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group">
          <div className="flex justify-between items-start mb-4">
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Pipeline Quality Index</p>
            <div className="p-2 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 group-hover:scale-110 transition-all">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h4 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              {Math.round(avgScore * 100)}%
            </h4>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-600 border-emerald-100">
              Optimal
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-2 font-medium">Weighted by stage probability and deal value.</p>
        </div>

        {/* Opportunity Card */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group">
          <div className="flex justify-between items-start mb-4">
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Open Opportunities</p>
            <div className="p-2 rounded-2xl bg-violet-50 border border-violet-100 text-violet-600 group-hover:scale-110 transition-all">
              <Briefcase size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h4 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              {pipelineStats.activeDeals}
            </h4>
            <span className="text-xs text-gray-400 font-medium ml-1">
              Active Deals
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-2 font-medium">Synchronized directly from CRM warehoused objects.</p>
        </div>

        {/* High Risk Card */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group">
          <div className="flex justify-between items-start mb-4">
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">High-Risk Accounts</p>
            <div className="p-2 rounded-2xl bg-red-50 border border-red-100 text-red-600 group-hover:scale-110 transition-all">
              <ShieldAlert size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h4 className="text-3xl font-extrabold text-red-600 tracking-tight">
              {scores.filter((d) => d.conversionProbability < 0.3).length}
            </h4>
            <span className="text-xs text-gray-400 font-medium ml-1">
              Probability &lt; 30%
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-2 font-medium">Attention recommended for these customer profiles.</p>
        </div>

      </div>

      {/* ─── AI Insights Widget ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6">
        <AIInsightsWidget />
      </div>

      {/* ── Grid: Lead Funnel & Stats ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Funnel chart */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-800">Combined Conversion Funnel</h3>
            <p className="text-xs text-gray-400 mt-0.5">Friction analysis: Conversion stages from ingestion leads to won opportunities.</p>
          </div>
          <div className="space-y-4 my-6">
            {funnelStages.map((stage) => (
              <div key={stage.name} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 font-semibold">{stage.name}</span>
                  <span className="text-gray-800 font-bold font-mono">{stage.count}</span>
                </div>
                <div className="w-full bg-gray-100 h-6 rounded-lg overflow-hidden border border-gray-200/50 flex">
                  <div
                    className={`${stage.color} h-full transition-all duration-500 flex items-center justify-end px-2`}
                    style={{ width: `${stage.percent}%` }}
                  >
                    {stage.percent > 10 && (
                      <span className="text-[10px] text-white font-extrabold font-mono">{stage.percent}%</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Stats Cards */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between h-full">
          <div>
            <h3 className="text-base font-bold text-gray-800">Pipeline Performance</h3>
            <p className="text-xs text-gray-400 mt-0.5">Cumulative metrics of lead database and deals status.</p>
          </div>
          <div className="divide-y divide-gray-50 flex-1 flex flex-col justify-center">
            <div className="py-4 flex justify-between items-center">
              <span className="text-xs text-gray-500 font-medium">Total Ingested Leads</span>
              <span className="text-sm font-bold text-gray-800 font-mono">{pipelineStats.totalLeads}</span>
            </div>
            <div className="py-4 flex justify-between items-center">
              <span className="text-xs text-gray-500 font-medium">Qualified Leads</span>
              <span className="text-sm font-bold text-gray-800 font-mono text-indigo-600">{pipelineStats.qualifiedLeads}</span>
            </div>
            <div className="py-4 flex justify-between items-center">
              <span className="text-xs text-gray-500 font-medium">Converted / Closed Leads</span>
              <span className="text-sm font-bold text-gray-800 font-mono text-emerald-600">{pipelineStats.convertedLeads}</span>
            </div>
            <div className="py-4 flex justify-between items-center">
              <span className="text-xs text-gray-500 font-medium">Active CRM Deals</span>
              <span className="text-sm font-bold text-gray-800 font-mono text-pink-600">{pipelineStats.activeDeals}</span>
            </div>
            <div className="py-4 flex justify-between items-center">
              <span className="text-xs text-gray-500 font-medium">Closed CRM Deals</span>
              <span className="text-sm font-bold text-gray-800 font-mono text-slate-600">{pipelineStats.closedDeals}</span>
            </div>
          </div>
        </div>

      </div>

      {/* ── Conversion Probability Table ── */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
        <div className="mb-6">
          <h3 className="text-base font-bold text-gray-800">Deal Quality Probability Index</h3>
          <p className="text-xs text-gray-400 mt-0.5">Mathematical prediction score of conversion likelihood per deal.</p>
        </div>

        <div className="overflow-x-auto">
          {scores.length > 0 ? (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-5 py-3 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Deal Reference</th>
                  <th className="px-5 py-3 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">CRM Stage</th>
                  <th className="px-5 py-3 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider text-right">Estimated Value</th>
                  <th className="px-5 py-3 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider text-right">Probability Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {scores.map((d) => (
                  <tr key={d.dealId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 text-sm font-semibold text-gray-700">{d.name}</td>
                    <td className="px-5 py-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        d.stage === "WON" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                        d.stage === "LOST" ? "bg-red-50 text-red-600 border-red-100" :
                        "bg-blue-50 text-blue-600 border-blue-100"
                      }`}>
                        {d.stage}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 text-right font-mono font-medium">
                      ${Math.round(d.amount).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                          d.conversionProbability >= 0.7 ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                          d.conversionProbability >= 0.4 ? "bg-blue-50 text-blue-600 border-blue-100" :
                          "bg-red-50 text-red-600 border-red-100"
                        }`}>
                          {Math.round(d.conversionProbability * 100)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-gray-400">
              <FileText className="mx-auto text-gray-300 mb-2" size={32} />
              <p className="text-sm">No active deals found in the pipeline.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}