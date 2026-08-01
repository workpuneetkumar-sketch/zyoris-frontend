"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api/api";
import { getDashboardAnomalies, getMorningBriefing, AnomalyAlertItem, MorningBriefingData } from "@/lib/api/aiBriefingApi";
import {
  Users, Briefcase, DollarSign, Clock, Mail, PhoneCall,
  LucideIcon, X, Sparkles, LayoutDashboard,
} from "lucide-react";
import { DashboardAiInsightsBox } from "@/components/dashboard/compoents/DashboardAiInsightsBox";
import { useDashboardBuilder } from "@/hooks/useDashboardBuilder";
import { BuilderHeader } from "@/components/dashboard-builder/BuilderHeader";
import { WidgetLibrary } from "@/components/dashboard-builder/WidgetLibrary";
import { DashboardCanvas } from "@/components/dashboard-builder/DashboardCanvas";
import { LayoutManager } from "@/components/dashboard-builder/LayoutManager";
import { WidgetDefinition } from "@/types/dashboard-builder";

// ── Types ──────────────────────────────────────────────────────────────────

interface DashboardStatsResponse {
  leadsCount?: number;
  totalDealValue?: number;
  revenue?: number;
  overdueTasks?: number;
  emailsSent?: number;
  callsToday?: number;
  [key: string]: unknown;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function normalizeDashboardStats(payload: any): DashboardStatsResponse | null {
  if (!payload) return null;
  const data = payload?.data && typeof payload.data === "object" ? payload.data : payload;
  if (!data || typeof data !== "object") return null;
  return data as DashboardStatsResponse;
}

// ── KPI Card ───────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, accent = "blue" }: {
  icon: LucideIcon; label: string; value: string;
  accent?: "blue" | "emerald" | "amber";
}) {
  const s = {
    blue:    { ring: "bg-blue-50 border-blue-100",    txt: "text-blue-600"    },
    emerald: { ring: "bg-emerald-50 border-emerald-100", txt: "text-emerald-600" },
    amber:   { ring: "bg-amber-50 border-amber-100",  txt: "text-amber-600"  },
  }[accent];

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">{label}</p>
        <div className={`p-1.5 rounded-lg border ${s.ring} group-hover:scale-110 transition-transform duration-200`}>
          <Icon size={14} className={s.txt} />
        </div>
      </div>
      <p className="text-2xl font-extrabold text-gray-900 tracking-tight">{value}</p>
    </div>
  );
}

// ── AI Brief Card ──────────────────────────────────────────────────────────

function BriefCard({ icon: Icon, label, text }: {
  icon: LucideIcon; label: string; text: string;
}) {
  return (
    <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4 hover:bg-blue-50 hover:border-blue-200 transition-all duration-200 group">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{label}</p>
          <p className="mt-1.5 text-xs font-medium text-gray-700 leading-relaxed line-clamp-3">{text}</p>
        </div>
        <div className="p-1.5 rounded-lg bg-blue-100 border border-blue-200 group-hover:scale-110 transition-transform duration-200 shrink-0">
          <Icon size={13} className="text-blue-600" />
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, token } = useAuth();
  const [dashboardStats, setDashboardStats] = useState<DashboardStatsResponse | null>(null);
  const [aiBriefing, setAiBriefing] = useState<MorningBriefingData | null>(null);
  const [aiAnomalies, setAiAnomalies] = useState<AnomalyAlertItem[]>([]);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const [statsRes, briefingRes, anomaliesRes] = await Promise.all([
        api.get<DashboardStatsResponse>("/dashboard/stats").catch(() => ({ data: null })),
        getMorningBriefing().catch(() => null),
        getDashboardAnomalies().then((r) => r.anomalies || []).catch(() => []),
      ]);
      setDashboardStats(normalizeDashboardStats(statsRes?.data));
      setAiBriefing(briefingRes);
      setAiAnomalies(Array.isArray(anomaliesRes) ? anomaliesRes : []);
      setAiError(briefingRes ? null : "Unable to load AI executive briefing.");
      setAiLoading(false);
    })();
  }, [token, user?.role]);

  const kpiCards = useMemo(() => [
    { icon: Users,     label: "Leads Count",      value: typeof dashboardStats?.leadsCount === "number" ? dashboardStats.leadsCount.toLocaleString() : "--", accent: "blue"    as const },
    { icon: Briefcase, label: "Total Deal Value", value: typeof dashboardStats?.totalDealValue === "number" ? `$${Math.round(dashboardStats.totalDealValue).toLocaleString()}` : "--", accent: "blue" as const },
    { icon: DollarSign,label: "Revenue",          value: typeof dashboardStats?.revenue === "number" ? `$${Math.round(dashboardStats.revenue).toLocaleString()}` : "--", accent: "emerald" as const },
    { icon: Clock,     label: "Overdue Tasks",    value: typeof dashboardStats?.overdueTasks === "number" ? dashboardStats.overdueTasks.toLocaleString() : "--", accent: "amber" as const },
    { icon: Mail,      label: "Emails Sent",      value: typeof dashboardStats?.emailsSent === "number" ? dashboardStats.emailsSent.toLocaleString() : "--", accent: "blue"    as const },
    { icon: PhoneCall, label: "Calls Today",      value: typeof dashboardStats?.callsToday === "number" ? dashboardStats.callsToday.toLocaleString() : "--", accent: "emerald" as const },
  ], [dashboardStats]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h >= 4 && h < 12) return { text: "Good morning", emoji: "🌅" };
    if (h >= 12 && h < 17) return { text: "Good afternoon", emoji: "☀️" };
    return { text: "Good evening", emoji: "🌆" };
  })();

  const builder = useDashboardBuilder(user?.role);
  const [isEditing, setIsEditing]   = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [showInsights, setShowInsights] = useState(false);

  const handleAddWidget = (def: WidgetDefinition) => { builder.addWidget(def); setLibraryOpen(false); };

  return (
    /* -m-4 md:-m-6 cancels the Shell padding so we go full-bleed */
    <div className="bg-white -m-4 md:-m-6 min-h-full">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-400 font-medium mt-0.5 flex items-center gap-1.5">
            {greeting.text},{" "}
            <span className="text-blue-600 font-bold">{user?.name?.split(" ")[0] || "there"}</span>
            <span>{greeting.emoji}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowInsights(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold shadow-sm shadow-blue-200 transition-all"
          >
            <Sparkles size={14} />
            <span className="hidden xs:inline">AI Insights</span>
            <span className="xs:hidden">AI</span>
          </button>

          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-white hover:bg-blue-50 active:scale-95 text-blue-700 text-sm font-semibold border border-blue-200 shadow-sm transition-all"
          >
            <LayoutDashboard size={14} />
            <span className="hidden sm:inline">Customise</span>
            <span className="sm:hidden">Edit</span>
          </button>
        </div>
      </div>

      {/* ── AI Executive Briefing ────────────────────────────── */}
      <div className="px-4 sm:px-6 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <Sparkles size={15} className="text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-gray-900">AI Executive Briefing</p>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full">BETA</span>
            </div>
            <p className="text-xs text-gray-400">Overnight summary and key system signals</p>
          </div>
        </div>

        {aiLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {[0,1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-gray-50 border border-gray-100 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <BriefCard icon={Sparkles}   label="Greeting" text={aiBriefing?.greeting ?? "AI briefing will appear here once available."} />
            <BriefCard icon={Briefcase}  label="Brief #1"  text={aiBriefing?.summaryBullets?.[0] ?? "No summary bullet generated yet."} />
            <BriefCard icon={Clock}      label="Brief #2"  text={aiBriefing?.summaryBullets?.[1] ?? aiBriefing?.summaryBullets?.[0] ?? "No summary bullet generated yet."} />
            <BriefCard icon={DollarSign} label="Signal"    text={aiAnomalies?.[0]?.title ?? aiBriefing?.topPriorityAction ?? "No anomaly signal generated yet."} />
          </div>
        )}
      </div>

      {/* ── Key Metrics ──────────────────────────────────────── */}
      <div className="px-4 sm:px-6 pt-4 pb-5 border-b border-gray-100">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Key Metrics</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpiCards.map((card, i) => (
            <div key={card.label} className="animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both" style={{ animationDelay: `${i * 60}ms` }}>
              <KpiCard {...card} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Custom Dashboard Canvas ──────────────────────────── */}
      {(!builder.isEmpty || builder.isLoading) && (
        <div className="px-4 sm:px-6 pt-4 pb-5">
          {builder.activeLayout?.isOrgDefault && (
            <p className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 inline-block px-2 py-0.5 rounded-md mb-3">Org Default</p>
          )}
          <div className="rounded-xl border border-gray-100 overflow-x-hidden">
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
      )}

      {/* ── AI Insights Panel ────────────────────────────────── */}
      {showInsights && (
        <div className="fixed inset-0 z-[80] flex items-start justify-end" onClick={(e) => { if (e.target === e.currentTarget) setShowInsights(false); }}>
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-200" />
          <div className="relative z-10 w-full max-w-xl h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-5 py-4 border-b border-blue-100 bg-blue-50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-blue-600"><Sparkles size={15} className="text-white" /></div>
                <h2 className="text-base font-bold text-gray-900">AI Insights</h2>
              </div>
              <button onClick={() => setShowInsights(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <DashboardAiInsightsBox prefetched={{ briefing: aiBriefing, anomalies: aiAnomalies, loading: aiLoading, error: aiError }} />
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Dashboard Overlay ───────────────────────────── */}
      {isEditing && (
        <div className="fixed inset-0 z-[90] flex flex-col bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex-1 flex flex-col bg-slate-50 m-2 sm:m-4 rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
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
                  onSave={async () => { await builder.saveLayout(); }}
                  onReset={builder.resetLayout}
                  onAddWidget={() => setLibraryOpen(true)}
                  onNewLayout={() => setManagerOpen(true)}
                  onSwitchLayout={builder.switchLayout}
                  onManageLayouts={() => setManagerOpen(true)}
                />
              </div>
              <button onClick={() => setIsEditing(false)} className="p-2 mr-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                <X size={20} />
              </button>
            </div>
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
        onSwitchLayout={(id) => { builder.switchLayout(id); setManagerOpen(false); }}
        onSetOrgDefault={builder.setOrgDefault}
      />
    </div>
  );
}
