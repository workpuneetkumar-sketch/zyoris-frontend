"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  IndianRupee,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  CreditCard,
  FileText,
  RefreshCw,
  Activity,
  BarChart3,
  HeartPulse,
  ArrowRight,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Banknote,
  Sparkles,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { getInvoices, Invoice } from "@/lib/api/finance/invoicesApi";
import { getPaymentAnalytics } from "@/lib/api/paymentService";
import type { PaymentAnalyticsResponse } from "@/lib/api/paymentService";

// ── Helpers ──────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCompact(amount: number): string {
  if (amount >= 1_000_000) return `₹${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000)     return `₹${(amount / 1_000).toFixed(1)}K`;
  return `₹${amount}`;
}

const STATUS_COLORS: Record<string, string> = {
  PAID:    "#10b981",
  SENT:    "#3b82f6",
  DRAFT:   "#94a3b8",
  OVERDUE: "#ef4444",
};

// ── Gauge ─────────────────────────────────────────────────────

function SuccessGauge({ pct }: { pct: number }) {
  const r = 52;
  const circ = Math.PI * r; // half circle
  const dash = (pct / 100) * circ;
  const color = pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative flex items-center justify-center">
      <svg width="130" height="72" viewBox="0 0 130 72">
        <path
          d="M 12,65 A 52,52 0 0,1 118,65"
          fill="none" stroke="#f1f5f9" strokeWidth="10" strokeLinecap="round"
        />
        <path
          d="M 12,65 A 52,52 0 0,1 118,65"
          fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: "stroke-dasharray 0.7s ease, stroke 0.4s ease" }}
        />
      </svg>
      <div className="absolute bottom-0 text-center">
        <p className="text-2xl font-bold text-gray-900">{pct}%</p>
        <p className="text-[10px] text-gray-400">success rate</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function PaymentDashboardPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentAnalytics, setPaymentAnalytics] = useState<PaymentAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [invData, analyticsData] = await Promise.all([
        getInvoices(),
        getPaymentAnalytics(),
      ]);
      setInvoices(invData);
      setPaymentAnalytics(analyticsData);
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Loading ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-100 px-4 md:px-6 pt-6 pb-5">
          <div className="max-w-[1400px] mx-auto animate-pulse">
            <div className="h-6 w-64 bg-gray-200 rounded mb-2" />
            <div className="h-4 w-96 bg-gray-100 rounded mb-6" />
          </div>
        </div>
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 h-28 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Error State ─────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">
            <AlertCircle size={28} className="text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Failed to load dashboard</h2>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-all shadow-sm"
          >
            <RefreshCw size={16} /> Try Again
          </button>
        </div>
      </div>
    );
  }

  // ── Computed ─────────────────────────────────────────────────
  const paidInvoices    = invoices.filter((i) => i.status === "PAID");
  const pendingInvoices = invoices.filter((i) => i.status === "DRAFT" || i.status === "SENT");
  const overdueInvoices = invoices.filter((i) => i.status === "OVERDUE" || (i.status !== "PAID" && new Date(i.dueDate) < new Date()));

  const totalRevenue      = paidInvoices.reduce((s, i) => s + i.totalAmount, 0);
  const outstandingAmount = invoices.filter((i) => i.status !== "PAID").reduce((s, i) => s + i.totalAmount, 0);
  const invoiceSuccessRate = invoices.length > 0 ? Math.round((paidInvoices.length / invoices.length) * 100) : 0;
  const paymentSuccessRate = paymentAnalytics?.successRate ?? invoiceSuccessRate;

  // Pie data from invoices
  const statusPieData = Object.entries(
    invoices.reduce<Record<string, number>>((map, i) => {
      map[i.status] = (map[i.status] || 0) + 1;
      return map;
    }, {})
  ).map(([status, count]) => ({ name: status, value: count, color: STATUS_COLORS[status] || "#94a3b8" }));

  // Revenue trend from recent payments
  const recentTrend = (() => {
    if (!paymentAnalytics?.recentPayments?.length) return [];
    const map: Record<string, number> = {};
    paymentAnalytics.recentPayments.forEach((p) => {
      const d = p.paidAt ? new Date(p.paidAt).toLocaleDateString("en-IN", { month: "short", day: "2-digit" }) : "—";
      map[d] = (map[d] || 0) + p.amount;
    });
    return Object.entries(map).map(([date, amount]) => ({ date, amount }));
  })();

  const kpiCards = [
    {
      label:   "Total Collected",
      value:   formatCompact(paymentAnalytics?.totalRevenue ?? totalRevenue),
      sub:     formatCurrency(paymentAnalytics?.totalRevenue ?? totalRevenue),
      icon:    Banknote,
      iconBg:  "from-emerald-500 to-teal-600",
      trend:   "up",
    },
    {
      label:   "Paid Invoices",
      value:   paidInvoices.length.toString(),
      sub:     `of ${invoices.length} total`,
      icon:    CheckCircle2,
      iconBg:  "from-blue-500 to-indigo-600",
      trend:   paidInvoices.length > 0 ? "up" : null,
    },
    {
      label:   "Outstanding",
      value:   formatCompact(outstandingAmount),
      sub:     `${pendingInvoices.length} pending invoices`,
      icon:    Clock,
      iconBg:  "from-amber-500 to-orange-600",
      trend:   outstandingAmount > 0 ? "down" : null,
    },
    {
      label:   "Overdue",
      value:   overdueInvoices.length.toString(),
      sub:     "invoices past due date",
      icon:    AlertCircle,
      iconBg:  "from-red-500 to-rose-600",
      trend:   overdueInvoices.length > 0 ? "down" : null,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Light Header ─────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-4 md:px-6 pt-6 pb-5">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Payment Dashboard</h1>
              <p className="text-sm text-gray-500 mt-0.5">Revenue overview and payment activity</p>
            </div>
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-xl border border-gray-200 shadow-sm transition-all"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${card.iconBg} flex items-center justify-center shadow-sm`}>
                      <Icon size={16} className="text-white" />
                    </div>
                    {card.trend && (
                      <span className={`flex items-center gap-0.5 text-[11px] font-semibold ${
                        card.trend === "up" ? "text-emerald-500" : "text-red-500"
                      }`}>
                        {card.trend === "up" ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-0.5">{card.label}</p>
                  <p className="text-xl font-bold text-gray-900">{card.value}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{card.sub}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Content ────────────────────────────────── */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 pb-12">
        {/* ── Quick Actions ────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-5 mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Quick Actions</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: "View Invoices",
                desc:  "All finance invoices",
                icon:  FileText,
                bg:    "bg-blue-50 hover:bg-blue-100",
                text:  "text-blue-600",
                href:  "/finance/invoices",
              },
              {
                label: "View Analytics",
                desc:  "Payment metrics",
                icon:  BarChart3,
                bg:    "bg-violet-50 hover:bg-violet-100",
                text:  "text-violet-600",
                href:  "/payment/analytics",
              },
              {
                label: "Payment Health",
                desc:  "System status",
                icon:  HeartPulse,
                bg:    "bg-emerald-50 hover:bg-emerald-100",
                text:  "text-emerald-600",
                href:  "/payment/health",
              },
              {
                label: "Payment Invoices",
                desc:  "Pay & track invoices",
                icon:  Zap,
                bg:    "bg-amber-50 hover:bg-amber-100",
                text:  "text-amber-600",
                href:  "/payment/invoices",
              },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  id={`quick-action-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
                  onClick={() => router.push(action.href)}
                  className={`flex items-center gap-3 p-4 ${action.bg} rounded-xl transition-all text-left group`}
                >
                  <div className={`w-9 h-9 rounded-lg bg-white/80 flex items-center justify-center shrink-0 shadow-sm group-hover:shadow-md transition-shadow`}>
                    <Icon size={16} className={action.text} />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${action.text}`}>{action.label}</p>
                    <p className="text-[10px] text-gray-400 truncate">{action.desc}</p>
                  </div>
                  <ArrowRight size={13} className={`ml-auto ${action.text} opacity-0 group-hover:opacity-100 transition-opacity shrink-0`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Revenue + Gauge Row ───────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Revenue Breakdown */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-gray-900">Revenue Breakdown</h3>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: "Total Revenue",  value: formatCurrency(paymentAnalytics?.totalRevenue ?? totalRevenue), color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: "Outstanding",    value: formatCurrency(outstandingAmount),   color: "text-amber-600",   bg: "bg-amber-50"   },
                { label: "Failed Revenue", value: formatCurrency(paymentAnalytics?.failedRevenue ?? 0), color: "text-red-500",    bg: "bg-red-50"     },
              ].map((s) => (
                <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
                  <p className="text-[11px] text-gray-400 mb-1">{s.label}</p>
                  <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Trend chart */}
            {recentTrend.length > 1 ? (
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={recentTrend}>
                    <defs>
                      <linearGradient id="dashGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" axisLine={false} tickLine={false} tickFormatter={formatCompact} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 11 }} formatter={(v: number) => [formatCurrency(v), "Revenue"]} />
                    <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} fill="url(#dashGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-sm text-gray-400 bg-gray-50 rounded-xl">
                Not enough data for trend
              </div>
            )}
          </div>

          {/* Success Rate Gauge */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center justify-center">
            <h3 className="text-sm font-bold text-gray-900 mb-4 self-start">Success Rate</h3>
            <SuccessGauge pct={paymentSuccessRate} />
            <div className="mt-4 w-full space-y-2">
              {paymentAnalytics && (
                <>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Successful</span>
                    <span className="font-semibold text-emerald-600">{paymentAnalytics.successfulPayments}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Failed</span>
                    <span className="font-semibold text-red-500">{paymentAnalytics.failedPayments}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Total Payments</span>
                    <span className="font-semibold text-gray-700">{paymentAnalytics.totalPayments}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Status Distribution + Recent Activity ──── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Pie chart */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-5">Invoice Status Distribution</h3>
            {statusPieData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-gray-400">No invoice data</div>
            ) : (
              <>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={78} paddingAngle={3} dataKey="value">
                        {statusPieData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 10, fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-3 mt-2 justify-center">
                  {statusPieData.map((e) => (
                    <div key={e.name} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: e.color }} />
                      <span className="text-[11px] text-gray-500">{e.name} ({e.value})</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Recent payments activity */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Recent Payment Activity</h3>
              <button
                onClick={() => router.push("/payment/invoices")}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                View All <ArrowRight size={11} />
              </button>
            </div>
            {!paymentAnalytics?.recentPayments?.length ? (
              <div className="p-8 flex items-center justify-center text-sm text-gray-400">No recent payments</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {paymentAnalytics.recentPayments.slice(0, 6).map((p) => (
                  <div key={p.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={14} className="text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-700">
                          {p.invoiceId.length > 20 ? p.invoiceId.slice(0, 20) + "…" : p.invoiceId}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {p.paidAt ? new Date(p.paidAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                          {p.method ? ` · ${p.method}` : ""}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-emerald-600">{formatCurrency(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Recent Invoices Table ─────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Recent Invoices</h3>
            <button
              onClick={() => router.push("/finance/invoices")}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              View All <ArrowRight size={11} />
            </button>
          </div>
          {invoices.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">No invoices yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Invoice</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Client</th>
                  <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="text-center px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-center px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoices.slice(0, 8).map((inv) => {
                  const overdue = inv.status !== "PAID" && new Date(inv.dueDate) < new Date();
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-semibold text-gray-900 text-sm">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3.5 text-gray-600 text-sm">{inv.clientName}</td>
                      <td className="px-4 py-3.5 text-right font-semibold text-gray-900">{formatCurrency(inv.totalAmount)}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          inv.status === "PAID"    ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          inv.status === "SENT"    ? "bg-blue-50    text-blue-700    border-blue-200"    :
                          overdue                  ? "bg-red-50     text-red-700     border-red-200"     :
                                                    "bg-gray-50    text-gray-600    border-gray-200"
                        }`}>
                          {overdue && inv.status !== "PAID" ? "OVERDUE" : inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {inv.status !== "PAID" ? (
                          <button
                            onClick={() => router.push(`/payment/${inv.id}`)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold rounded-lg transition-all"
                          >
                            Pay <ArrowRight size={10} />
                          </button>
                        ) : (
                          <span className="text-[10px] text-gray-400 font-medium">Paid</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
