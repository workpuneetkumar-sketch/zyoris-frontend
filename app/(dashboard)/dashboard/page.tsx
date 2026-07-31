"use client";

import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api/api";
import { fetchTasks, Task } from "@/lib/api/tasksApi";
import { fetchEmails } from "@/lib/api/emailApi";
import { fetchCalls } from "@/lib/api/callsApi";
import { Users, Briefcase, DollarSign, Clock, Mail, PhoneCall, LucideIcon, Pencil, X, Sparkles, LayoutDashboard } from "lucide-react";
import { DashboardAiInsightsBox } from "@/components/dashboard/compoents/DashboardAiInsightsBox";
import { useDashboardBuilder } from "@/hooks/useDashboardBuilder";
import { BuilderHeader } from "@/components/dashboard-builder/BuilderHeader";
import { WidgetLibrary } from "@/components/dashboard-builder/WidgetLibrary";
import { DashboardCanvas } from "@/components/dashboard-builder/DashboardCanvas";
import { LayoutManager } from "@/components/dashboard-builder/LayoutManager";
import { WidgetDefinition } from "@/types/dashboard-builder";

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
        value: "3",
        color: "blue" as const,
      },
      {
        icon: PhoneCall,
        label: "Calls Today",
        value: "5",
        color: "emerald" as const,
      },
    ],
    [dealValue, overdueTasks]
  );

  const getGreetingInfo = () => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 12) return { text: "Good morning", emoji: "🌅" };
    if (hour >= 12 && hour < 17) return { text: "Good afternoon", emoji: "☀️" };
    return { text: "Good evening", emoji: "🌆" };
  };

  const greeting = getGreetingInfo();

  const builder = useDashboardBuilder(user?.role);
  const [isEditing, setIsEditing] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [showInsights, setShowInsights] = useState(false);

  const handleAddWidget = (def: WidgetDefinition) => {
    builder.addWidget(def);
    setLibraryOpen(false);
  };

  return (
    <div>
      {/* ── Topbar ── */}
      <div className="flex items-center justify-between mb-8 py-2 gap-4 overflow-hidden">
        {/* Left: Title + greeting */}
        <div className="animate-in fade-in zoom-in-95 slide-in-from-left-8 duration-1000 ease-out fill-mode-both space-y-1 flex-shrink-0">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-indigo-900 to-purple-900 drop-shadow-xs hover:scale-[1.005] transition-transform origin-left cursor-default">
            Dashboard
          </h1>
          <p className="text-lg sm:text-xl text-gray-500 font-semibold flex items-center gap-2 pt-0.5">
            <span>{greeting.text}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 font-extrabold">{user?.name?.split(" ")[0] || "there"}</span>!</span>
            <span className="text-2xl sm:text-3xl">{greeting.emoji}</span>
          </p>
        </div>

        {/* Right: Animated wave + Action buttons */}
        <div className="flex items-center gap-3 flex-shrink-0 animate-in fade-in slide-in-from-right-8 duration-700 fill-mode-both">
          {/* AI INSIGHTS button */}
          <button
            id="ai-insights-btn"
            onClick={() => setShowInsights(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-bold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all duration-200 cursor-pointer border border-violet-400/30"
          >
            <Sparkles size={15} className="shrink-0" />
            <span>AI Insights</span>
          </button>

          {/* Customise Dashboard button */}
          <button
            id="customise-dashboard-btn"
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-indigo-50 text-indigo-700 hover:text-indigo-900 text-sm font-bold border border-indigo-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
          >
            <LayoutDashboard size={15} className="shrink-0" />
            <span>Customise Dashboard</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {kpiCards.map((card, index) => (
          <div key={card.label} className="animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both" style={{ animationDelay: `${index * 100}ms` }}>
            <ExecutiveKpiCard {...card} />
          </div>
        ))}
      </div>

      {/* ------------------------- User Custom Dashboard(s) ------------------------- */}
      {(!builder.isEmpty || builder.isLoading) && (
        <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
          <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border shadow-sm transition-all">
            {builder.activeLayout?.isOrgDefault && (
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100/90 border border-amber-300 px-2 py-0.5 rounded-md shadow-2xs">
                  Org Default
                </span>
              </div>
            )}
            <div className="bg-surface rounded-xl border border-border p-2 shadow-xs overflow-x-hidden">
              <DashboardCanvas
                widgets={builder.widgets}
                catalog={builder.catalog}
                isPreview={true}
                isLoading={builder.isLoading}
                isEmpty={builder.isEmpty}
                onLayoutChange={builder.updateLayout}
                onRemoveWidget={builder.removeWidget}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── AI Insights Slide-in Panel ── */}
      {showInsights && (
        <div
          className="fixed inset-0 z-[80] flex items-start justify-end"
          onClick={(e) => { if (e.target === e.currentTarget) setShowInsights(false); }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-200" />

          {/* Panel */}
          <div className="relative z-10 w-full max-w-xl h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 ease-out">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-indigo-50">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 shadow-sm">
                  <Sparkles size={16} className="text-white" />
                </div>
                <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">AI Insights</h2>
              </div>
              <button
                onClick={() => setShowInsights(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Panel Body - AI Insights content */}
            <div className="flex-1 overflow-y-auto p-5">
              <DashboardAiInsightsBox />
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Dashboard Modal / Overlay ── */}
      {isEditing && (
        <div className="fixed inset-0 z-[90] flex flex-col bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex-1 flex flex-col bg-slate-50 m-2 sm:m-4 rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
            {/* Builder Header */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-white px-2">
              <div className="flex-1">
                <BuilderHeader
                  activeLayout={builder.activeLayout}
                  layouts={builder.layouts}
                  isLoadingLayouts={builder.isLoadingLayouts}
                  isPreview={builder.isPreview}
                  isSaving={builder.isSaving}
                  hasUnsavedChanges={builder.hasUnsavedChanges}
                  widgetCount={builder.widgets.length}
                  canSetOrgDefault={builder.canSetOrgDefault}
                  onPreviewToggle={builder.togglePreview}
                  onSave={async () => {
                    await builder.saveLayout();
                  }}
                  onReset={builder.resetLayout}
                  onAddWidget={() => setLibraryOpen(true)}
                  onNewLayout={() => setManagerOpen(true)}
                  onSwitchLayout={builder.switchLayout}
                  onManageLayouts={() => setManagerOpen(true)}
                />
              </div>
              <button
                onClick={() => setIsEditing(false)}
                className="p-2 mr-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                title="Done editing"
              >
                <X size={20} />
              </button>
            </div>

            {/* Builder Canvas and Sidebars */}
            <div className="flex flex-1 overflow-hidden relative">
              <DashboardCanvas
                widgets={builder.widgets}
                catalog={builder.catalog}
                isPreview={builder.isPreview}
                isLoading={builder.isLoading}
                isEmpty={builder.isEmpty}
                onLayoutChange={builder.updateLayout}
                onRemoveWidget={builder.removeWidget}
              />

              <WidgetLibrary
                catalog={builder.catalog}
                isOpen={libraryOpen}
                onClose={() => setLibraryOpen(false)}
                onAdd={handleAddWidget}
              />
            </div>
          </div>
        </div>
      )}

      {/* Layout Manager Modal */}
      <LayoutManager
        isOpen={managerOpen}
        layouts={builder.layouts}
        activeLayoutId={builder.activeLayoutId}
        canSetOrgDefault={builder.canSetOrgDefault}
        isCreating={builder.isCreating}
        isDeleting={builder.isDeletingId}
        isSettingDefault={builder.isSettingDefault}
        onClose={() => setManagerOpen(false)}
        onCreateLayout={builder.createLayout}
        onRenameLayout={builder.renameLayout}
        onDeleteLayout={builder.deleteLayout}
        onSwitchLayout={(id) => {
          builder.switchLayout(id);
          setManagerOpen(false);
        }}
        onSetOrgDefault={builder.setOrgDefault}
      />
    </div>
  );
}
