"use client";

import { useEffect, useMemo, useState } from "react";
import Dashboard from "@/components/dashboard/dashboard";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api/api";
import { fetchTasks, Task } from "@/lib/api/tasksApi";
import { Users, Briefcase, DollarSign, Clock, LucideIcon } from "lucide-react";

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
    blue: { bg: "bg-blue-50", border: "border-blue-100", text: "text-blue-600" },
    violet: { bg: "bg-violet-50", border: "border-violet-100", text: "text-violet-600" },
    emerald: { bg: "bg-emerald-50", border: "border-emerald-100", text: "text-emerald-600" },
    amber: { bg: "bg-amber-50", border: "border-amber-100", text: "text-amber-600" },
  };
  const c = colorMap[color];

  return (
    <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">{label}</p>
        <div className={`p-2 rounded-xl ${c.bg} border ${c.border}`}>
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
      ] = await Promise.all([
        api.get<LeadsStatsResponse>("/leads/stats").catch(() => ({ data: null })),
        api.get<PipelineStatsResponse>("/api/deals/pipeline-stats").catch(() => ({ data: null })),
        fetchTasks().catch(() => ({ tasks: [], total: 0 })),
        isCfo ? Promise.resolve({ data: null }) : api.get("/dashboard/ceo").catch(() => ({ data: null })),
        isCfo ? api.get("/dashboard/cfo").catch(() => ({ data: null })) : Promise.resolve({ data: null }),
        api.get("/analytics/revenue/drivers").catch(() => ({ data: null })),
        api.get("/analytics/revenue/forecast").catch(() => ({ data: null })),
      ]);

      setLeadsCount(extractLeadsCount(leadsRes.data));
      setDealValue(sumPipelineDealValue(pipelineRes.data));
      setRevenue(extractRevenue(ceoRes.data, cfoRes.data, driversRes.data, forecastRes.data));
      setOverdueTasks(countOverdueTasks(tasksRes.tasks ?? []));
    }

    loadKpis();
  }, [token, user?.role]);

  const kpiCards = useMemo(
    () => [
      {
        icon: Users,
        label: "Leads Count",
        value: leadsCount != null ? leadsCount.toLocaleString() : "--",
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
        value: revenue != null ? `$${Math.round(revenue).toLocaleString()}` : "--",
        color: "emerald" as const,
      },
      {
        icon: Clock,
        label: "Overdue Tasks",
        value: overdueTasks != null ? overdueTasks.toLocaleString() : "--",
        color: "amber" as const,
      },
    ],
    [leadsCount, dealValue, revenue, overdueTasks]
  );

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
        {kpiCards.map((card) => (
          <ExecutiveKpiCard key={card.label} {...card} />
        ))}
      </div>
      <Dashboard />
    </div>
  );
}
