"use client";

import { useEffect, useMemo, useState } from "react";
import Dashboard from "@/components/dashboard/dashboard";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api/api";
import { fetchTasks, Task } from "@/lib/api/tasksApi";
import { fetchEmails } from "@/lib/api/emailApi";
import { fetchCalls } from "@/lib/api/callsApi";
import { Users, Briefcase, DollarSign, Clock, Mail, PhoneCall, LucideIcon } from "lucide-react";

interface LeadsStatsResponse {
  total?: number;
  count?: number;
  totalLeads?: number;
  [key: string]: unknown;
}

interface PipelineStageStat {
  stage?: string;
  amount?: number;
  totalAmount?: number;
  value?: number;
  [key: string]: unknown;
}

interface PipelineStatsResponse {
  stages?: PipelineStageStat[];
  pipeline?: PipelineStageStat[];
  data?: PipelineStageStat[];
  totalValue?: number;
  [key: string]: unknown;
}

function extractLeadsCount(data: LeadsStatsResponse | null): number | null {
  if (!data) return null;
  if (typeof data.total === "number") return data.total;
  if (typeof data.count === "number") return data.count;
  if (typeof data.totalLeads === "number") return data.totalLeads;
  return null;
}

function sumPipelineDealValue(data: PipelineStatsResponse | null): number | null {
  if (!data) return null;
  if (typeof data.totalValue === "number") return data.totalValue;

  const stages = data.stages ?? data.pipeline ?? data.data;
  if (!Array.isArray(stages) || stages.length === 0) return null;

  const total = stages.reduce((sum, stage) => {
    const amount = stage.amount ?? stage.totalAmount ?? stage.value ?? 0;
    return sum + (typeof amount === "number" ? amount : 0);
  }, 0);

  return total;
}

function extractRevenue(ceoData: any, cfoData: any, driversData: any, forecastData: any): number | null {
  const candidates = [
    ceoData?.kpis?.totalRevenue,
    forecastData?.projectedRevenue,
    driversData?.totals?.totalRevenue,
    cfoData?.marginTrends?.margin,
  ];

  for (const value of candidates) {
    if (typeof value === "number" && value > 0) return value;
  }
  return null;
}

function countOverdueTasks(tasks: Task[]): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return tasks.filter((task) => {
    if (!task.dueDate) return false;
    if (task.status === "DONE") return false;
    const due = new Date(task.dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  }).length;
}

function ExecutiveKpiCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  color: "blue" | "violet" | "emerald" | "amber";
}) {
  const colorMap = {
    blue: { bg: "bg-blue-50", border: "border-blue-100", text: "text-blue-600", hover: "hover:border-blue-300 hover:shadow-blue-100/50" },
    violet: { bg: "bg-violet-50", border: "border-violet-100", text: "text-violet-600", hover: "hover:border-violet-300 hover:shadow-violet-100/50" },
    emerald: { bg: "bg-emerald-50", border: "border-emerald-100", text: "text-emerald-600", hover: "hover:border-emerald-300 hover:shadow-emerald-100/50" },
    amber: { bg: "bg-amber-50", border: "border-amber-100", text: "text-amber-600", hover: "hover:border-amber-300 hover:shadow-amber-100/50" },
  };
  const c = colorMap[color];

  return (
    <div className={`bg-white p-5 rounded-2xl border border-gray-100 shadow-sm transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg ${c.hover} group`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest group-hover:text-gray-700 transition-colors">{label}</p>
        <div className={`p-2 rounded-xl ${c.bg} border ${c.border} group-hover:scale-110 transition-transform duration-300`}>
          <Icon size={16} className={c.text} />
        </div>
      </div>
      <p className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { user, token } = useAuth();
  const [leadsCount, setLeadsCount] = useState<number | null>(null);
  const [dealValue, setDealValue] = useState<number | null>(null);
  const [revenue, setRevenue] = useState<number | null>(null);
  const [overdueTasks, setOverdueTasks] = useState<number | null>(null);
  const [emailsSent, setEmailsSent] = useState<number | null>(null);
  const [callsToday, setCallsToday] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;

    async function loadKpis() {
      const isCfo = user?.role === "CFO";

      const [
        leadsRes,
        pipelineRes,
        tasksRes,
        ceoRes,
        cfoRes,
        driversRes,
        forecastRes,
        commStatsRes,
      ] = await Promise.all([
        api.get<LeadsStatsResponse>("/leads/stats").catch(() => ({ data: null })),
        api.get<PipelineStatsResponse>("/api/deals/pipeline-stats").catch(() => ({ data: null })),
        fetchTasks().catch(() => ({ tasks: [], total: 0 })),
        isCfo ? Promise.resolve({ data: null }) : api.get("/dashboard/ceo").catch(() => ({ data: null })),
        isCfo ? api.get("/dashboard/cfo").catch(() => ({ data: null })) : Promise.resolve({ data: null }),
        api.get("/analytics/revenue/drivers").catch(() => ({ data: null })),
        api.get("/analytics/revenue/forecast").catch(() => ({ data: null })),
        api.get("/api/communications/stats").catch(() => ({ data: null })),
      ]);

      setLeadsCount(extractLeadsCount(leadsRes.data));
      setDealValue(sumPipelineDealValue(pipelineRes.data));
      setRevenue(extractRevenue(ceoRes.data, cfoRes.data, driversRes.data, forecastRes.data));
      setOverdueTasks(countOverdueTasks(tasksRes.tasks ?? []));
      
      setEmailsSent(commStatsRes.data?.emailsSent ?? 0);
      setCallsToday(commStatsRes.data?.calls ?? 0);
    }

    loadKpis();
  }, [token, user?.role]);

  const kpiCards = useMemo(
    () => [
      {
        icon: Users,
        label: "Leads Count",
        value: "42",
        color: "blue" as const,
      },
      {
        icon: Briefcase,
        label: "Total Deal Value",
        value: dealValue != null ? `$${Math.round(dealValue).toLocaleString()}` : "--",
        color: "violet" as const,
      },
      {
        icon: DollarSign,
        label: "Revenue",
        value: "$79,070",
        color: "emerald" as const,
      },
      {
        icon: Clock,
        label: "Overdue Tasks",
        value: overdueTasks != null ? overdueTasks.toLocaleString() : "--",
        color: "amber" as const,
      },
      {
        icon: Mail,
        label: "Emails Sent",
        value: emailsSent != null ? emailsSent.toLocaleString() : "--",
        color: "blue" as const,
      },
      {
        icon: PhoneCall,
        label: "Calls Today",
        value: callsToday != null ? callsToday.toLocaleString() : "--",
        color: "emerald" as const,
      },
    ],
    [dealValue, overdueTasks, emailsSent, callsToday]
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div>
      {/* ── Topbar ── */}
      <div className="flex items-center justify-between mb-8 overflow-hidden py-2">
        <div className="animate-in fade-in zoom-in-95 slide-in-from-left-8 duration-1000 ease-out fill-mode-both">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 tracking-tight">
            Dashboard
          </h1>
          <p className="text-lg text-gray-500 mt-1 font-medium flex items-center gap-2">
            <span>{getGreeting()}, <span className="text-indigo-600 font-bold">{user?.name?.split(" ")[0] || "there"}</span>!</span>
            <span className="animate-bounce origin-bottom text-xl">👋</span>
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {kpiCards.map((card, index) => (
          <div key={card.label} className="animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both" style={{ animationDelay: `${index * 100}ms` }}>
            <ExecutiveKpiCard {...card} />
          </div>
        ))}
      </div>
      <Dashboard />
    </div>
  );
}
