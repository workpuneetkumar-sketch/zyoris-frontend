"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRBAC } from "@/hooks/useRBAC";
import api from "@/lib/api/api";
import { getDashboardAnomalies, getMorningBriefing, AnomalyAlertItem, MorningBriefingData } from "@/lib/api/aiBriefingApi";
import { fetchAttendance, fetchLeaves, Attendance, LeaveRequest } from "@/lib/api/hrApi";
import {
  Users, Briefcase, DollarSign, Clock, Mail, PhoneCall,
  LucideIcon, X, Sparkles, LayoutDashboard, CalendarDays,
  CalendarCheck, Clock4, ArrowRight, UserCheck, ShieldCheck, CheckCircle2,
} from "lucide-react";
import { DashboardAiInsightsBox } from "@/components/dashboard/compoents/DashboardAiInsightsBox";
import { useDashboardBuilder } from "@/hooks/useDashboardBuilder";
import { BuilderHeader } from "@/components/dashboard-builder/BuilderHeader";
import { WidgetLibrary } from "@/components/dashboard-builder/WidgetLibrary";
import { DashboardCanvas } from "@/components/dashboard-builder/DashboardCanvas";
import { LayoutManager } from "@/components/dashboard-builder/LayoutManager";
import { WidgetDefinition } from "@/types/dashboard-builder";
import { WeeklyAIBriefing } from "@/components/dashboard/WeeklyAIBriefing";

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

function normalizeDashboardStats(payload: any): DashboardStatsResponse {
  if (!payload) return {};
  const d = payload?.data?.stats || payload?.data?.data || payload?.data || payload?.stats || payload;
  if (!d || typeof d !== "object") return {};

  const leads = d.leadsCount ?? d.totalLeads ?? d.leads ?? d.leadCount ?? d.total;
  const dealValue = d.totalDealValue ?? d.dealValue ?? d.pipelineValue ?? d.totalValue ?? d.dealsTotal;
  const rev = d.revenue ?? d.totalRevenue ?? d.revenueGenerated;
  const tasks = d.overdueTasks ?? d.pendingTasks ?? d.tasksCount ?? d.tasks;
  const emails = d.emailsSent ?? d.emails ?? d.emailsCount;
  const calls = d.callsToday ?? d.calls ?? d.callsCount;

  return {
    leadsCount: typeof leads === "number" ? leads : undefined,
    totalDealValue: typeof dealValue === "number" ? dealValue : undefined,
    revenue: typeof rev === "number" ? rev : undefined,
    overdueTasks: typeof tasks === "number" ? tasks : undefined,
    emailsSent: typeof emails === "number" ? emails : undefined,
    callsToday: typeof calls === "number" ? calls : undefined,
  };
}

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
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
      <p className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight truncate" title={value}>{value}</p>
    </div>
  );
}

// ── AI Brief Card ──────────────────────────────────────────────────────────

function BriefCard({ icon: Icon, label, text }: {
  icon: LucideIcon; label: string; text: string;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 hover:bg-blue-50 hover:border-blue-100 transition-all duration-200 group">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{label}</p>
          <p className="mt-1.5 text-xs font-medium text-gray-700 leading-relaxed line-clamp-3">{text}</p>
        </div>
        <div className="p-1.5 rounded-lg bg-blue-50 border border-blue-100 group-hover:scale-110 transition-transform duration-200 shrink-0">
          <Icon size={13} className="text-blue-600" />
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, token, sessionStatus } = useAuth();
  const { hasPermission, hasAnyPermission, permissionsLoaded } = useRBAC();
  const isEmployee = (user?.role || "").toUpperCase() === "EMPLOYEE";

  const canViewDeals = hasAnyPermission(["deals.view", "crm.view"]);
  const canViewLeads = hasAnyPermission(["leads.view", "crm.view"]);
  const canViewTasks = hasPermission("tasks.view");
  const canViewBriefing = hasAnyPermission(["dashboard.view", "ai_copilot.access"]);

  const [dashboardStats, setDashboardStats] = useState<DashboardStatsResponse | null>(null);
  const [aiBriefing, setAiBriefing] = useState<MorningBriefingData | null>(null);
  const [aiAnomalies, setAiAnomalies] = useState<AnomalyAlertItem[]>([]);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiError, setAiError] = useState<string | null>(null);

  const [employeeAttendance, setEmployeeAttendance] = useState<Attendance | null>(null);
  const [employeeLeaves, setEmployeeLeaves] = useState<LeaveRequest[]>([]);
  const [employeeLoading, setEmployeeLoading] = useState(true);

  useEffect(() => {
    if (sessionStatus !== "authenticated" || !token) return;
    if (!permissionsLoaded) return;

    if (isEmployee) {
      (async () => {
        try {
          setEmployeeLoading(true);
          const [attRes, leavesRes] = await Promise.all([
            fetchAttendance().catch(() => []),
            fetchLeaves().catch(() => []),
          ]);
          const todayStr = new Date().toDateString();
          const todayAtt = (attRes || []).find((a) => {
            const d = a.attendanceDate || a.checkIn;
            return d ? new Date(d).toDateString() === todayStr : false;
          });
          setEmployeeAttendance(todayAtt || null);
          setEmployeeLeaves(leavesRes || []);
        } catch (e) {
          console.warn("Could not load employee dashboard data", e);
        } finally {
          setEmployeeLoading(false);
          setAiLoading(false);
        }
      })();
      return;
    }

    // Management / Executive Dashboard
    (async () => {
      let statsPayload: DashboardStatsResponse = {};

      try {
        const statsRes = await api.get<any>("/dashboard/stats").catch(() => null)
          || await api.get<any>("/api/dashboard/stats").catch(() => null);
        if (statsRes?.data) {
          statsPayload = normalizeDashboardStats(statsRes.data);
        }
      } catch {
        // fallback
      }

      // If key metrics are missing from /dashboard/stats, enrich ONLY from modules user has permission to access
      if (statsPayload.leadsCount === undefined || statsPayload.totalDealValue === undefined) {
        try {
          const [pipelineRes, leadsRes, tasksRes] = await Promise.all([
            canViewDeals
              ? (api.get<any>("/api/deals/pipeline-stats").catch(() => null) || api.get<any>("/deals/pipeline-stats").catch(() => null))
              : Promise.resolve(null),
            canViewLeads
              ? (api.get<any>("/leads", { params: { limit: 1 } }).catch(() => null) || api.get<any>("/api/leads", { params: { limit: 1 } }).catch(() => null))
              : Promise.resolve(null),
            canViewTasks
              ? (api.get<any>("/tasks/my-tasks", { params: { limit: 20 } }).catch(() => null) || api.get<any>("/tasks", { params: { limit: 20 } }).catch(() => null))
              : Promise.resolve(null),
          ]);

          const pRaw = pipelineRes?.data?.data || pipelineRes?.data;
          const totalVal = typeof pRaw?.totalValue === "number" ? pRaw.totalValue
            : Array.isArray(pRaw?.stages)
            ? pRaw.stages.reduce((acc: number, s: any) => acc + (s.totalAmount || s.amount || s.value || 0), 0)
            : 0;

          const lTotal = leadsRes?.data?.total ?? leadsRes?.data?.meta?.total ?? (Array.isArray(leadsRes?.data) ? leadsRes.data.length : 0);
          const tRaw = tasksRes?.data?.tasks ?? (Array.isArray(tasksRes?.data) ? tasksRes.data : []);
          const overdue = tRaw.filter((t: any) => t.dueDate && new Date(t.dueDate) < new Date()).length;

          statsPayload = {
            leadsCount: statsPayload.leadsCount ?? lTotal,
            totalDealValue: statsPayload.totalDealValue ?? totalVal,
            revenue: statsPayload.revenue ?? (totalVal > 0 ? Math.round(totalVal * 0.45) : 0),
            overdueTasks: statsPayload.overdueTasks ?? overdue,
            emailsSent: statsPayload.emailsSent ?? 0,
            callsToday: statsPayload.callsToday ?? 0,
          };
        } catch {
          // ignore enrichment error
        }
      }

      const [briefingRes, anomaliesRes] = await Promise.all([
        canViewBriefing ? getMorningBriefing().catch(() => null) : Promise.resolve(null),
        canViewBriefing ? getDashboardAnomalies().then((r) => r.anomalies || []).catch(() => []) : Promise.resolve([]),
      ]);

      setDashboardStats(statsPayload);
      setAiBriefing(briefingRes);
      setAiAnomalies(Array.isArray(anomaliesRes) ? anomaliesRes : []);
      setAiError(briefingRes ? null : "Unable to load AI executive briefing.");
      setAiLoading(false);
    })();
  }, [sessionStatus, token, isEmployee, permissionsLoaded, canViewDeals, canViewLeads, canViewTasks, canViewBriefing]);

  const kpiCards = useMemo(() => {
    if (!permissionsLoaded) return [];
    const cards = [];

    if (canViewLeads) {
      cards.push({
        icon: Users,
        label: "Leads Count",
        value: typeof dashboardStats?.leadsCount === "number" ? dashboardStats.leadsCount.toLocaleString() : "--",
        accent: "blue" as const,
      });
    }

    if (canViewDeals) {
      cards.push({
        icon: Briefcase,
        label: "Total Deal Value",
        value: typeof dashboardStats?.totalDealValue === "number" ? fmtCurrency(Math.round(dashboardStats.totalDealValue)) : "--",
        accent: "blue" as const,
      });
    }

    if (hasPermission("finance.view")) {
      cards.push({
        icon: DollarSign,
        label: "Revenue",
        value: typeof dashboardStats?.revenue === "number" ? fmtCurrency(Math.round(dashboardStats.revenue)) : "--",
        accent: "emerald" as const,
      });
    }

    if (canViewTasks) {
      cards.push({
        icon: Clock,
        label: "Overdue Tasks",
        value: typeof dashboardStats?.overdueTasks === "number" ? dashboardStats.overdueTasks.toLocaleString() : "--",
        accent: "amber" as const,
      });
    }

    if (hasAnyPermission(["email.access", "communication.access"])) {
      cards.push({
        icon: Mail,
        label: "Emails Sent",
        value: typeof dashboardStats?.emailsSent === "number" ? dashboardStats.emailsSent.toLocaleString() : "--",
        accent: "blue" as const,
      });
    }

    if (hasAnyPermission(["calls.access", "communication.access"])) {
      cards.push({
        icon: PhoneCall,
        label: "Calls Today",
        value: typeof dashboardStats?.callsToday === "number" ? dashboardStats.callsToday.toLocaleString() : "--",
        accent: "emerald" as const,
      });
    }

    return cards;
  }, [dashboardStats, permissionsLoaded, canViewLeads, canViewDeals, canViewTasks, hasPermission, hasAnyPermission]);

  // Computed client-side so it always reflects the user's local clock, not the server timezone
  const computeGreeting = () => {
    const h = new Date().getHours();
    if (h >= 0 && h < 12) return { text: "Good morning", emoji: "🌅" };
    if (h >= 12 && h < 17) return { text: "Good afternoon", emoji: "☀️" };
    return { text: "Good evening", emoji: "🌆" };
  };
  const [greeting, setGreeting] = useState(computeGreeting);
  useEffect(() => {
    setGreeting(computeGreeting());
    const interval = setInterval(() => setGreeting(computeGreeting()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const builder = useDashboardBuilder(user?.role);
  const [isEditing, setIsEditing]   = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [showWeeklyBriefing, setShowWeeklyBriefing] = useState(false);

  const handleAddWidget = (def: WidgetDefinition) => { builder.addWidget(def); };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? "-" : d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "-";
    }
  };

  const pendingLeavesCount = employeeLeaves.filter((l) => l.status === "PENDING").length;
  const approvedLeavesCount = employeeLeaves.filter((l) => l.status === "APPROVED").length;

  return (
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
          {isEmployee ? (
            <>
              <Link
                href="/hr/attendance"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs sm:text-sm font-semibold shadow-sm shadow-blue-200 transition-all"
              >
                <Clock4 size={14} />
                <span>Attendance</span>
              </Link>
              <Link
                href="/hr/leaves"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-gray-50 active:scale-95 text-gray-700 text-xs sm:text-sm font-semibold border border-gray-200 shadow-sm transition-all"
              >
                <CalendarCheck size={14} />
                <span>Apply Leave</span>
              </Link>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-white hover:bg-blue-50 active:scale-95 text-blue-700 text-xs sm:text-sm font-semibold border border-blue-200 shadow-sm transition-all"
              >
                <LayoutDashboard size={14} />
                <span>Customise</span>
              </button>
            </>
          ) : (
            <>
              {canViewBriefing && (
                <>
                  <button
                    onClick={() => setShowInsights(true)}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold shadow-sm shadow-blue-200 transition-all"
                  >
                    <Sparkles size={14} />
                    <span className="hidden xs:inline">AI Insights</span>
                    <span className="xs:hidden">AI</span>
                  </button>

                  <button
                    onClick={() => setShowWeeklyBriefing((v) => !v)}
                    className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                      showWeeklyBriefing
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200"
                        : "bg-white hover:bg-blue-50 text-blue-700 border-blue-200 shadow-sm"
                    }`}
                  >
                    <CalendarDays size={14} />
                    <span className="hidden sm:inline">Weekly AI Briefing</span>
                    <span className="sm:hidden">Weekly</span>
                    <span
                      className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                        showWeeklyBriefing ? "bg-blue-400" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`absolute h-3 w-3 rounded-full bg-white shadow transition-transform ${
                          showWeeklyBriefing ? "translate-x-3.5" : "translate-x-0.5"
                        }`}
                      />
                    </span>
                  </button>
                </>
              )}

              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-white hover:bg-blue-50 active:scale-95 text-blue-700 text-sm font-semibold border border-blue-200 shadow-sm transition-all"
              >
                <LayoutDashboard size={14} />
                <span className="hidden sm:inline">Customise</span>
                <span className="sm:hidden">Edit</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Employee Portal Banner & Overview ────────────────── */}
      {isEmployee ? (
        <div className="px-4 sm:px-6 py-6 border-b border-gray-100">
          <div className="mb-4">
            <h2 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">Personal Workspace</h2>
            <p className="text-xs text-gray-500 mt-0.5">Your daily work activity, attendance status, and quick shortcuts</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Today's Attendance */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-blue-50/60 to-indigo-50/40 border border-blue-100 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                    <Clock4 size={18} />
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                    employeeAttendance?.checkIn
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}>
                    {employeeAttendance?.checkIn ? "Present" : "Not Checked In"}
                  </span>
                </div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Today&apos;s Attendance</p>
                <p className="text-lg sm:text-xl font-extrabold text-gray-900 mt-1">
                  {employeeAttendance?.checkIn ? formatTime(employeeAttendance.checkIn) : "Pending"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {employeeAttendance?.checkIn
                    ? employeeAttendance.checkOut
                      ? `Checked out at ${formatTime(employeeAttendance.checkOut)}`
                      : "Checked in today"
                    : "No check-in recorded yet today"}
                </p>
              </div>
              <Link
                href="/hr/attendance"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 group transition-colors"
              >
                <span>View Attendance Log</span>
                <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {/* 2. Leaves Summary */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-50/60 to-teal-50/40 border border-emerald-100 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                    <CalendarCheck size={18} />
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Active
                  </span>
                </div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">My Leaves</p>
                <p className="text-lg sm:text-xl font-extrabold text-gray-900 mt-1">
                  {employeeLeaves.length} {employeeLeaves.length === 1 ? "Request" : "Requests"}
                </p>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                  <span className="font-semibold text-amber-700">{pendingLeavesCount} Pending</span>
                  <span>•</span>
                  <span className="font-semibold text-emerald-700">{approvedLeavesCount} Approved</span>
                </div>
              </div>
              <Link
                href="/hr/leaves"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 group transition-colors"
              >
                <span>Manage Leaves</span>
                <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {/* 3. My Profile & Role */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-purple-50/60 to-pink-50/40 border border-purple-100 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-sm">
                    <UserCheck size={18} />
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
                    Verified
                  </span>
                </div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Profile & Access</p>
                <p className="text-lg sm:text-xl font-extrabold text-gray-900 mt-1 truncate">
                  {user?.role || "Employee"}
                </p>
                <p className="text-xs text-gray-500 mt-1 truncate">
                  {user?.email || "Authenticated User"}
                </p>
              </div>
              <Link
                href="/settings"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:text-purple-700 group transition-colors"
              >
                <span>Edit Settings & Avatar</span>
                <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {/* 4. Organization & Documents */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-50/60 to-orange-50/40 border border-amber-100 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-sm">
                    <ShieldCheck size={18} />
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                    Portal
                  </span>
                </div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Resources</p>
                <p className="text-lg sm:text-xl font-extrabold text-gray-900 mt-1">Company Hub</p>
                <p className="text-xs text-gray-500 mt-1">
                  Access company documents & policies
                </p>
              </div>
              <Link
                href="/documents"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-800 group transition-colors"
              >
                <span>Browse Documents</span>
                <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* ── AI Executive Briefing (Management Only) ───────── */}
          {canViewBriefing && (
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
                  {aiBriefing?.summaryBullets?.[1] != null && (
                    <BriefCard icon={Clock}    label="Brief #2"  text={aiBriefing.summaryBullets[1]} />
                  )}
                  <BriefCard icon={DollarSign} label="Signal"    text={aiAnomalies?.[0]?.title ?? aiBriefing?.topPriorityAction ?? "No anomaly signal generated yet."} />
                </div>
              )}
            </div>
          )}

          {/* ── Key Metrics (Management Only) ────────────────── */}
          {kpiCards.length > 0 && (
            <div className="px-4 sm:px-6 pt-4 pb-5 border-b border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Key Metrics</p>
              <div
                className={`grid gap-3 ${
                  kpiCards.length === 1
                    ? "grid-cols-1 max-w-xs"
                    : kpiCards.length === 2
                    ? "grid-cols-2 max-w-md"
                    : kpiCards.length === 3
                    ? "grid-cols-1 sm:grid-cols-3 max-w-3xl"
                    : kpiCards.length === 4
                    ? "grid-cols-2 sm:grid-cols-2 lg:grid-cols-4"
                    : kpiCards.length === 5
                    ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
                    : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
                }`}
              >
                {kpiCards.map((card, i) => (
                  <div key={card.label} className="animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both" style={{ animationDelay: `${i * 60}ms` }}>
                    <KpiCard {...card} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Weekly AI Briefing ───────────────────────────────── */}
      {showWeeklyBriefing && !isEmployee && (
        <div className="px-4 sm:px-6 pt-4 pb-5 border-b border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
          <WeeklyAIBriefing />
        </div>
      )}

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
      {showInsights && !isEmployee && (
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
                widgets={builder.widgets}
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
