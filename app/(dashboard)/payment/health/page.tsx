"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  XCircle,
  Key,
  Shield,
  RefreshCw,
  HeartPulse,
  Database,
  Clock,
  Loader2,
  Activity,
  Calendar,
  Zap,
  AlertTriangle,
  Cpu,
  ArrowUpRight,
  Wifi,
} from "lucide-react";
import { getPaymentHealth } from "@/lib/api/paymentService";

interface SchedulerStatus {
  configured: boolean;
  lastRun: string;
  expiredProcessed: number;
  reconciled: number;
  stuck: number;
  failed: number;
}

interface PaymentHealthData {
  database: string;
  razorpay: string;
  webhookSecret: boolean;
  scheduler: SchedulerStatus;
}

// ── Status helpers ────────────────────────────────────────────

type HealthLevel = "healthy" | "warning" | "failed";

function getLevel(value: string | boolean): HealthLevel {
  if (typeof value === "boolean") return value ? "healthy" : "warning";
  const v = value.toLowerCase();
  if (v === "healthy" || v === "ok" || v === "connected") return "healthy";
  if (v === "degraded" || v === "warning") return "warning";
  return "failed";
}

const LEVEL_STYLES: Record<HealthLevel, { card: string; badge: string; badgeText: string; icon: string; dot: string; label: string }> = {
  healthy: {
    card:      "bg-white border-gray-100",
    badge:     "bg-emerald-50 border-emerald-200",
    badgeText: "text-emerald-700",
    icon:      "bg-emerald-50 text-emerald-600",
    dot:       "bg-emerald-500",
    label:     "Healthy",
  },
  warning: {
    card:      "bg-amber-50/40 border-amber-200",
    badge:     "bg-amber-50 border-amber-200",
    badgeText: "text-amber-700",
    icon:      "bg-amber-50 text-amber-600",
    dot:       "bg-amber-500",
    label:     "Warning",
  },
  failed: {
    card:      "bg-red-50/40 border-red-200",
    badge:     "bg-red-50 border-red-200",
    badgeText: "text-red-700",
    icon:      "bg-red-50 text-red-600",
    dot:       "bg-red-500",
    label:     "Failed",
  },
};

function LevelBadge({ level }: { level: HealthLevel }) {
  const s = LEVEL_STYLES[level];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${s.badge} ${s.badgeText}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} ${level === "healthy" ? "animate-pulse" : ""}`} />
      {s.label}
    </span>
  );
}

// ── Stat Ring ─────────────────────────────────────────────────

function StatRing({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const r = 16;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width="44" height="44" className="-rotate-90">
      <circle cx="22" cy="22" r={r} fill="none" stroke="#f1f5f9" strokeWidth="4" />
      <circle
        cx="22" cy="22" r={r} fill="none"
        stroke={color} strokeWidth="4"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function PaymentHealthPage() {
  const [healthData, setHealthData] = useState<PaymentHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [autoRefreshIn, setAutoRefreshIn] = useState(60);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPaymentHealth();
      setHealthData(data);
      setLastChecked(new Date());
      setAutoRefreshIn(60);
    } catch (err: any) {
      setError(err.message || "Failed to check payment system health");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  // Auto-refresh countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setAutoRefreshIn((prev) => {
        if (prev <= 1) {
          fetchHealth();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  // ── Computed ─────────────────────────────────────────────────
  const dbLevel    = healthData ? getLevel(healthData.database)     : "healthy";
  const rzpLevel   = healthData ? getLevel(healthData.razorpay)     : "healthy";
  const wbhLevel   = healthData ? getLevel(healthData.webhookSecret) : "healthy";
  const allHealthy = dbLevel === "healthy" && rzpLevel === "healthy" && wbhLevel === "healthy";
  const isSchedulerOk = healthData?.scheduler?.configured === true;

  const lastRunDisplay = healthData?.scheduler?.lastRun
    ? new Date(healthData.scheduler.lastRun).toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "Never";

  const totalScheduled =
    (healthData?.scheduler?.reconciled ?? 0) +
    (healthData?.scheduler?.expiredProcessed ?? 0) +
    (healthData?.scheduler?.stuck ?? 0) +
    (healthData?.scheduler?.failed ?? 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Light Header ────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-4 md:px-6 pt-6 pb-5">
        <div className="max-w-[1000px] mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm border ${
                loading ? "bg-gray-50 border-gray-200" : allHealthy ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"
              }`}>
                <HeartPulse size={22} className={
                  loading ? "text-gray-400" : allHealthy ? "text-emerald-500" : "text-amber-500"
                } />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Payment Health</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {loading
                    ? "Checking system status…"
                    : allHealthy
                    ? "All systems operational"
                    : "Some systems need attention"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {lastChecked && (
                <div className="text-right hidden sm:block">
                  <p className="text-[11px] text-gray-400">Last checked</p>
                  <p className="text-xs text-gray-600">{lastChecked.toLocaleTimeString()}</p>
                  <p className="text-[10px] text-gray-400">Auto-refresh in {autoRefreshIn}s</p>
                </div>
              )}
              <button
                onClick={fetchHealth}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-xl border border-gray-200 shadow-sm transition-all disabled:opacity-50"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1000px] mx-auto px-4 md:px-6 py-6 pb-12">
        {/* ── Loading State ──────────────────────────── */}
        {loading && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-12 mb-6">
            <div className="flex flex-col items-center justify-center">
              <Loader2 size={32} className="animate-spin text-blue-500 mb-4" />
              <p className="text-sm text-gray-500">Checking payment system health…</p>
            </div>
          </div>
        )}

        {/* ── Error State ──────────────────────────── */}
        {error && !loading && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-8 mb-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                <XCircle size={32} className="text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Unable to reach backend</h3>
              <p className="text-sm text-gray-500 mb-6 max-w-md">{error}</p>
              <button
                onClick={fetchHealth}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-all shadow-sm"
              >
                <RefreshCw size={14} /> Try Again
              </button>
            </div>
          </div>
        )}

        {/* ── Health Data ─────────────────────────── */}
        {healthData && !loading && (
          <>
            {/* Status Banner */}
            <div className={`rounded-2xl border p-5 mb-6 shadow-sm flex items-center gap-4 ${
              allHealthy ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
            }`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                allHealthy ? "bg-emerald-100" : "bg-amber-100"
              }`}>
                {allHealthy
                  ? <CheckCircle2 size={24} className="text-emerald-600" />
                  : <AlertTriangle size={24} className="text-amber-600" />}
              </div>
              <div className="flex-1">
                <p className={`text-base font-bold ${allHealthy ? "text-emerald-800" : "text-amber-800"}`}>
                  {allHealthy ? "All Systems Healthy" : "System Degraded"}
                </p>
                <p className={`text-sm ${allHealthy ? "text-emerald-600" : "text-amber-600"}`}>
                  {allHealthy
                    ? "Database, Razorpay gateway, and webhook are all operational."
                    : dbLevel !== "healthy" ? "Database connection issue detected."
                    : rzpLevel !== "healthy" ? "Razorpay API connectivity issue."
                    : "Webhook secret not configured."}
                </p>
              </div>
              {lastChecked && (
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-[11px] text-gray-400">Last checked</span>
                  <span className="text-xs font-medium text-gray-600">{lastChecked.toLocaleTimeString()}</span>
                </div>
              )}
            </div>

            {/* ── Core Health Cards ────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Database */}
              {[
                {
                  label: "Database",
                  subLabel: "PostgreSQL connection",
                  value: healthData.database,
                  level: dbLevel,
                  icon: Database,
                },
                {
                  label: "Razorpay",
                  subLabel: "Payment gateway API",
                  value: healthData.razorpay,
                  level: rzpLevel,
                  icon: Zap,
                },
                {
                  label: "Webhook Secret",
                  subLabel: "Payment event verification",
                  value: healthData.webhookSecret ? "Configured" : "Not set",
                  level: wbhLevel,
                  icon: Shield,
                },
              ].map((item) => {
                const Icon = item.icon;
                const s = LEVEL_STYLES[item.level as HealthLevel];
                return (
                  <div key={item.label} className={`rounded-2xl border p-5 shadow-sm ${s.card}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.icon}`}>
                        <Icon size={20} />
                      </div>
                      <LevelBadge level={item.level as HealthLevel} />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900">{item.label}</h3>
                    <p className="text-xs text-gray-400 mt-0.5 mb-3">{item.subLabel}</p>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                      <span className={`text-xs font-semibold ${
                        item.level === "healthy" ? "text-emerald-600" : item.level === "warning" ? "text-amber-600" : "text-red-600"
                      }`}>{item.value}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Scheduler Status ──────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isSchedulerOk ? "bg-blue-50" : "bg-amber-50"}`}>
                  <Cpu size={16} className={isSchedulerOk ? "text-blue-600" : "text-amber-600"} />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-gray-900">Payment Scheduler</h3>
                  <p className="text-[11px] text-gray-400">Background reconciliation job</p>
                </div>
                {isSchedulerOk
                  ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Running</span>
                  : <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200"><AlertTriangle size={10} /> Not Configured</span>}
              </div>

              {/* Last run + counters */}
              <div className="p-6">
                <div className="flex items-center gap-3 mb-5 p-3 bg-slate-50 rounded-xl">
                  <Calendar size={14} className="text-slate-400" />
                  <div>
                    <p className="text-[11px] font-medium text-slate-400">Last Run</p>
                    <p className="text-sm font-semibold text-slate-700">{lastRunDisplay}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Reconciled",       value: healthData.scheduler.reconciled,       color: "#10b981", bg: "bg-emerald-50",  text: "text-emerald-600" },
                    { label: "Expired Processed", value: healthData.scheduler.expiredProcessed, color: "#3b82f6", bg: "bg-blue-50",     text: "text-blue-600"    },
                    { label: "Stuck",             value: healthData.scheduler.stuck,            color: "#f59e0b", bg: "bg-amber-50",    text: "text-amber-600"   },
                    { label: "Failed",            value: healthData.scheduler.failed,           color: "#ef4444", bg: "bg-red-50",      text: "text-red-600"     },
                  ].map((stat) => (
                    <div key={stat.label} className={`${stat.bg} rounded-xl p-4 flex items-center gap-3`}>
                      <StatRing value={stat.value} max={Math.max(totalScheduled, 1)} color={stat.color} />
                      <div>
                        <p className={`text-2xl font-bold ${stat.text}`}>{stat.value}</p>
                        <p className="text-[11px] font-medium text-gray-400 leading-tight">{stat.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── API Endpoints ─────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <Activity size={16} className="text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Payment Endpoints</h3>
                  <p className="text-[11px] text-gray-400">Available Razorpay payment APIs</p>
                </div>
                <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-gray-400">
                  <Wifi size={10} /> {allHealthy ? "All live" : "Degraded"}
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {[
                  { method: "GET",  label: "Health Check",    path: "/payments/health",              icon: HeartPulse, color: "bg-emerald-50 text-emerald-600" },
                  { method: "POST", label: "Create Order",    path: "/payments/create-order",        icon: Zap,        color: "bg-violet-50 text-violet-600"   },
                  { method: "POST", label: "Verify Payment",  path: "/payments/verify",              icon: Shield,     color: "bg-emerald-50 text-emerald-600" },
                  { method: "GET",  label: "Payment Status",  path: "/payments/:id/status",          icon: Activity,   color: "bg-blue-50 text-blue-600"       },
                  { method: "GET",  label: "Order Status",    path: "/payments/status/:orderId",     icon: Activity,   color: "bg-indigo-50 text-indigo-600"   },
                  { method: "GET",  label: "Payment History", path: "/payments/:id/history",         icon: Clock,      color: "bg-blue-50 text-blue-600"       },
                  { method: "GET",  label: "Analytics",       path: "/payments/analytics",           icon: HeartPulse, color: "bg-amber-50 text-amber-600"     },
                  { method: "POST", label: "Retry Payment",   path: "/payments/retry/:invoiceId",    icon: RefreshCw,  color: "bg-red-50 text-red-600"         },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="px-6 py-3.5 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg ${item.color} flex items-center justify-center`}>
                          <Icon size={14} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{item.label}</p>
                          <p className="text-[11px] text-gray-400 font-mono">{item.method} {item.path}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        allHealthy ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}>
                        <span className={`w-1 h-1 rounded-full ${allHealthy ? "bg-emerald-500" : "bg-amber-500"}`} />
                        {allHealthy ? "Active" : "Degraded"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Environment Config ────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Key size={15} className="text-gray-400" />
                <h3 className="text-sm font-bold text-gray-900">Environment Configuration</h3>
              </div>
              <div className="space-y-3">
                {[
                  { name: "RAZORPAY_KEY_ID",  level: rzpLevel,  value: rzpLevel === "healthy" ? "Configured ✓" : "Missing ✗" },
                  { name: "RAZORPAY_SECRET",  level: rzpLevel,  value: rzpLevel === "healthy" ? "Configured ✓" : "Missing ✗" },
                  { name: "WEBHOOK_SECRET",   level: wbhLevel,  value: wbhLevel === "healthy" ? "Set ✓" : "Not Set ✗" },
                  { name: "DATABASE_URL",     level: dbLevel,   value: dbLevel === "healthy"  ? "Connected ✓" : "Disconnected ✗" },
                ].map((env) => {
                  const s = LEVEL_STYLES[env.level as HealthLevel];
                  return (
                    <div key={env.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                        <code className="text-sm text-gray-600 font-mono">{env.name}</code>
                      </div>
                      <span className={`font-mono text-xs px-2.5 py-1 rounded-lg border ${s.badge} ${s.badgeText}`}>
                        {env.value}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
