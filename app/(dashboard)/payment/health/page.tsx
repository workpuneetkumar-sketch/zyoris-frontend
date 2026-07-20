"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  XCircle,
  Key,
  Webhook,
  Shield,
  CreditCard,
  RefreshCw,
  HeartPulse,
  Database,
  Clock,
  Loader2,
  Activity,
  Calendar,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { getPaymentHealth } from "@/lib/api/paymentService";

// ── Types matching the actual backend response ────────────────

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

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function PaymentHealthPage() {
  const [healthData, setHealthData] = useState<PaymentHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPaymentHealth();
      setHealthData(data);
    } catch (err: any) {
      setError(err.message || "Failed to check payment system health");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const isDatabaseHealthy = healthData?.database === "healthy";
  const isRazorpayHealthy = healthData?.razorpay === "healthy";
  const isWebhookSecretSet = healthData?.webhookSecret === true;
  const isSchedulerConfigured = healthData?.scheduler?.configured === true;
  const allHealthy = isDatabaseHealthy && isRazorpayHealthy && isWebhookSecretSet;

  const lastRunDisplay = healthData?.scheduler?.lastRun
    ? new Date(healthData.scheduler.lastRun).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "—";

  return (
    <div className="min-h-screen bg-gray-50 px-4 md:px-6 py-6 max-w-[1000px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${
            loading ? "bg-gray-100" : allHealthy ? "bg-emerald-50" : "bg-amber-50"
          }`}>
            <HeartPulse size={28} className={
              loading ? "text-gray-400" : allHealthy ? "text-emerald-600" : "text-amber-600"
            } />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payment Health</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {loading ? "Checking system status…" : allHealthy ? "All systems operational" : "Some systems need attention"}
            </p>
          </div>
        </div>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700 rounded-xl transition-all shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 size={32} className="animate-spin text-blue-500 mb-4" />
            <p className="text-sm text-gray-500">Checking payment system health…</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
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

      {/* Health Data */}
      {healthData && !loading && (
        <>
          {/* ── Status Banner ──────────────────────────────── */}
          <div className={`rounded-2xl border p-5 mb-6 shadow-sm flex items-center gap-4 ${
            allHealthy
              ? "bg-emerald-50 border-emerald-200"
              : "bg-amber-50 border-amber-200"
          }`}>
            {allHealthy ? (
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle2 size={24} className="text-emerald-600" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle size={24} className="text-amber-600" />
              </div>
            )}
            <div>
              <p className={`text-base font-bold ${
                allHealthy ? "text-emerald-800" : "text-amber-800"
              }`}>
                {allHealthy ? "All Systems Healthy" : "System Degraded"}
              </p>
              <p className={`text-sm ${
                allHealthy ? "text-emerald-600" : "text-amber-600"
              }`}>
                {allHealthy
                  ? "Database, Razorpay, and webhook are all operational."
                  : !isDatabaseHealthy ? "Database connection issue detected."
                  : !isRazorpayHealthy ? "Razorpay API connectivity issue."
                  : !isWebhookSecretSet ? "Webhook secret not configured."
                  : "Some checks require attention."}
              </p>
            </div>
          </div>

          {/* ─── Core Health Cards ─────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Database */}
            <div className={`rounded-2xl border p-5 shadow-sm ${
              isDatabaseHealthy ? "bg-white border-gray-200" : "bg-red-50 border-red-200"
            }`}>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isDatabaseHealthy ? "bg-emerald-50" : "bg-red-100"
                }`}>
                  <Database size={20} className={isDatabaseHealthy ? "text-emerald-600" : "text-red-600"} />
                </div>
                {isDatabaseHealthy ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 size={10} /> Healthy
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                    <XCircle size={10} /> Unhealthy
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold text-gray-900">Database</h3>
              <p className="text-xs text-gray-400 mt-0.5">PostgreSQL connection</p>
              <div className="mt-3 text-xs text-gray-500">
                Status: <span className={`font-semibold ${isDatabaseHealthy ? "text-emerald-600" : "text-red-600"}`}>
                  {healthData.database}
                </span>
              </div>
            </div>

            {/* Razorpay */}
            <div className={`rounded-2xl border p-5 shadow-sm ${
              isRazorpayHealthy ? "bg-white border-gray-200" : "bg-red-50 border-red-200"
            }`}>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isRazorpayHealthy ? "bg-emerald-50" : "bg-red-100"
                }`}>
                  <Zap size={20} className={isRazorpayHealthy ? "text-emerald-600" : "text-red-600"} />
                </div>
                {isRazorpayHealthy ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 size={10} /> Healthy
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                    <XCircle size={10} /> Unhealthy
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold text-gray-900">Razorpay</h3>
              <p className="text-xs text-gray-400 mt-0.5">Payment gateway API</p>
              <div className="mt-3 text-xs text-gray-500">
                Status: <span className={`font-semibold ${isRazorpayHealthy ? "text-emerald-600" : "text-red-600"}`}>
                  {healthData.razorpay}
                </span>
              </div>
            </div>

            {/* Webhook Secret */}
            <div className={`rounded-2xl border p-5 shadow-sm ${
              isWebhookSecretSet ? "bg-white border-gray-200" : "bg-amber-50 border-amber-200"
            }`}>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isWebhookSecretSet ? "bg-emerald-50" : "bg-amber-100"
                }`}>
                  <Shield size={20} className={isWebhookSecretSet ? "text-emerald-600" : "text-amber-600"} />
                </div>
                {isWebhookSecretSet ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 size={10} /> Configured
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    <AlertTriangle size={10} /> Missing
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold text-gray-900">Webhook Secret</h3>
              <p className="text-xs text-gray-400 mt-0.5">Payment event verification</p>
              <div className="mt-3 text-xs text-gray-500">
                Status: <span className={`font-semibold ${isWebhookSecretSet ? "text-emerald-600" : "text-amber-600"}`}>
                  {isWebhookSecretSet ? "Configured" : "Not set"}
                </span>
              </div>
            </div>
          </div>

          {/* ─── Scheduler Status ──────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isSchedulerConfigured ? "bg-blue-50" : "bg-amber-50"
              }`}>
                <Clock size={16} className={isSchedulerConfigured ? "text-blue-600" : "text-amber-600"} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Payment Scheduler</h3>
                <p className="text-[11px] text-gray-400">Background job status for payment reconciliation</p>
              </div>
              {isSchedulerConfigured ? (
                <span className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 size={10} /> Running
                </span>
              ) : (
                <span className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <AlertTriangle size={10} /> Not Configured
                </span>
              )}
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">Last Run</p>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                    <Calendar size={12} className="text-gray-400" />
                    {lastRunDisplay}
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">Reconciled</p>
                  <p className="text-xl font-bold text-emerald-600">{healthData.scheduler.reconciled}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">Expired Processed</p>
                  <p className="text-xl font-bold text-blue-600">{healthData.scheduler.expiredProcessed}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">Stuck / Failed</p>
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="text-xl font-bold text-amber-500">{healthData.scheduler.stuck}</span>
                      <span className="text-[11px] text-gray-400 ml-1">stuck</span>
                    </div>
                    <div>
                      <span className="text-xl font-bold text-red-500">{healthData.scheduler.failed}</span>
                      <span className="text-[11px] text-gray-400 ml-1">failed</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── API Endpoints List ────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Activity size={16} className="text-indigo-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Payment Endpoints</h3>
                <p className="text-[11px] text-gray-400">Available Razorpay payment APIs</p>
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {[
                { label: "Check Health",    value: "GET /payments/health",            icon: HeartPulse,  color: "bg-emerald-50", iconColor: "text-emerald-600" },
                { label: "Get History",      value: "GET /payments/:id/history",       icon: Clock,       color: "bg-blue-50",    iconColor: "text-blue-600" },
                { label: "Create Order",     value: "POST /payments/create-order",     icon: Zap,         color: "bg-violet-50",  iconColor: "text-violet-600" },
                { label: "Verify Payment",   value: "POST /payments/verify",           icon: Shield,      color: "bg-emerald-50", iconColor: "text-emerald-600" },
                { label: "Payment Status",   value: "GET /payments/:id/status",        icon: Activity,    color: "bg-blue-50",    iconColor: "text-blue-600" },
                { label: "Order Status",     value: "GET /payments/status/:orderId",   icon: Activity,    color: "bg-indigo-50",  iconColor: "text-indigo-600" },
                { label: "Analytics",        value: "GET /payments/analytics",         icon: HeartPulse,  color: "bg-amber-50",   iconColor: "text-amber-600" },
                { label: "Retry Payment",    value: "POST /payments/retry/:invoiceId", icon: RefreshCw,   color: "bg-red-50",    iconColor: "text-red-600" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="px-6 py-3.5 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg ${item.color} flex items-center justify-center`}>
                        <Icon size={14} className={item.iconColor} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{item.label}</p>
                        <p className="text-[11px] text-gray-400 font-mono">{item.value}</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 size={8} /> Active
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─── Environment Variables ─────────────────────── */}
          <div className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Environment Configuration</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <Key size={14} className="text-gray-400" />
                  <span className="text-sm text-gray-600">RAZORPAY_KEY_ID</span>
                </div>
                <span className={`font-mono text-xs px-2.5 py-1 rounded-lg ${
                  isRazorpayHealthy ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                }`}>
                  {isRazorpayHealthy ? "Configured ✓" : "Missing ✗"}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <Shield size={14} className="text-gray-400" />
                  <span className="text-sm text-gray-600">WEBHOOK_SECRET</span>
                </div>
                <span className={`font-mono text-xs px-2.5 py-1 rounded-lg ${
                  isWebhookSecretSet ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                }`}>
                  {isWebhookSecretSet ? "Set ✓" : "Not Set"}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <Database size={14} className="text-gray-400" />
                  <span className="text-sm text-gray-600">DATABASE_URL</span>
                </div>
                <span className={`font-mono text-xs px-2.5 py-1 rounded-lg ${
                  isDatabaseHealthy ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                }`}>
                  {isDatabaseHealthy ? "Connected ✓" : "Disconnected ✗"}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
