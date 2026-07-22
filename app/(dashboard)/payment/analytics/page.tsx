"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  IndianRupee,
  CreditCard,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import { getInvoices, Invoice } from "@/lib/api/finance/invoicesApi";
import { getPaymentAnalytics } from "@/lib/api/paymentService";
import type { PaymentAnalyticsResponse } from "@/lib/api/paymentService";
import PaymentErrorBoundary from "@/components/payment/ErrorBoundary";

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
  PAID:       "#10b981",
  SENT:       "#3b82f6",
  DRAFT:      "#94a3b8",
  OVERDUE:    "#ef4444",
  CREATED:    "#8b5cf6",
  PENDING:    "#f59e0b",
  AUTHORIZED: "#06b6d4",
  FAILED:     "#ef4444",
  EXPIRED:    "#6b7280",
  REFUNDED:   "#ec4899",
  CANCELLED:  "#9ca3af",
};

const CUSTOM_TOOLTIP_STYLE = {
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
  fontSize: 12,
};

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function PaymentAnalyticsPageWrapper() {
  return (
    <PaymentErrorBoundary pageName="Payment Analytics">
      <PaymentAnalyticsPage />
    </PaymentErrorBoundary>
  );
}

function PaymentAnalyticsPage() {
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
      setError(err.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Computed ─────────────────────────────────────────────────
  const stats = useMemo(() => {
    const paid    = invoices.filter((i) => i.status === "PAID");
    const overdue = invoices.filter((i) => i.status === "OVERDUE" || (i.status !== "PAID" && new Date(i.dueDate) < new Date()));
    const pending = invoices.filter((i) => i.status === "SENT" || i.status === "DRAFT");
    const totalRev = paid.reduce((s, i) => s + i.totalAmount, 0);
    const successRate = paymentAnalytics?.successRate ?? (invoices.length > 0 ? Math.round((paid.length / invoices.length) * 100) : 0);

    return { paid, overdue, pending, totalRev, successRate };
  }, [invoices, paymentAnalytics]);

  // Status breakdown for pie
  const statusMap = useMemo(() => {
    const map: Record<string, number> = {};
    invoices.forEach((inv) => { map[inv.status] = (map[inv.status] || 0) + 1; });
    return map;
  }, [invoices]);

  const statusPieData = Object.entries(statusMap).map(([status, count]) => ({
    name: status,
    value: count,
    color: STATUS_COLORS[status] || "#94a3b8",
  }));

  // Amount by status for bar chart
  const amountByStatus = Object.entries(statusMap).map(([status, count]) => ({
    status,
    count,
    revenue: invoices.filter((i) => i.status === status).reduce((s, i) => s + i.totalAmount, 0),
  }));

  // Top clients
  const topClients = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    invoices.forEach((inv) => {
      if (!map[inv.clientName]) map[inv.clientName] = { count: 0, total: 0 };
      map[inv.clientName].count++;
      map[inv.clientName].total += inv.totalAmount;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total).slice(0, 5);
  }, [invoices]);

  // Recent payments trend (last 7 days from analytics)
  const recentTrend = useMemo(() => {
    if (!paymentAnalytics?.recentPayments) return [];
    const byDate: Record<string, number> = {};
    paymentAnalytics.recentPayments.forEach((p) => {
      const d = p.paidAt ? new Date(p.paidAt).toLocaleDateString("en-IN", { month: "short", day: "2-digit" }) : "Unknown";
      byDate[d] = (byDate[d] || 0) + p.amount;
    });
    return Object.entries(byDate).map(([date, amount]) => ({ date, amount }));
  }, [paymentAnalytics]);

  // ── Loading ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-100 px-4 md:px-6 pt-6 pb-5">
          <div className="max-w-[1400px] mx-auto animate-pulse">
            <div className="h-6 w-56 bg-gray-200 rounded mb-2" />
            <div className="h-4 w-72 bg-gray-100 rounded" />
          </div>
        </div>
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border h-28 animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border h-72 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white flex items-center justify-center border border-gray-100">
            <AlertCircle size={28} className="text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Failed to load analytics</h2>
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Light Header ──────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-4 md:px-6 pt-6 pb-5">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 size={16} className="text-blue-500" />
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Payment Analytics</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">Invoice payment metrics, revenue, and trends</p>
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
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 pb-12">
        {/* ── KPI Cards ─────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: "Total Invoices",
              value: invoices.length.toLocaleString("en-IN"),
              sub: `${stats.paid.length} paid`,
              icon: Activity,
              iconBg: "bg-blue-500",
              trend: null,
            },
            {
              label: "Total Revenue",
              value: formatCompact(stats.totalRev),
              sub: formatCurrency(stats.totalRev),
              icon: IndianRupee,
              iconBg: "bg-emerald-500",
              trend: "up",
            },
            {
              label: "Success Rate",
              value: `${stats.successRate}%`,
              sub: `${stats.paid.length} of ${invoices.length} invoices`,
              icon: Percent,
              iconBg: "bg-violet-500",
              trend: stats.successRate >= 70 ? "up" : "down",
            },
            {
              label: "Failed Payments",
              value: (paymentAnalytics?.failedPayments ?? 0).toString(),
              sub: paymentAnalytics ? `of ${paymentAnalytics.totalPayments} total` : "payment records",
              icon: XCircle,
              iconBg: "bg-red-500",
              trend: "down",
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center shadow-md`}>
                    <Icon size={18} className="text-white" />
                  </div>
                  {card.trend && (
                    <span className={`flex items-center gap-0.5 text-[11px] font-semibold ${card.trend === "up" ? "text-emerald-600" : "text-red-500"}`}>
                      {card.trend === "up" ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{card.sub}</p>
              </div>
            );
          })}
        </div>

        {/* ── Payment API Analytics KPIs ─────────────── */}
        {paymentAnalytics && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            {[
              { label: "Total Payments", value: paymentAnalytics.totalPayments, color: "text-blue-600",    bg: "bg-blue-50"    },
              { label: "Successful",     value: paymentAnalytics.successfulPayments, color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "Failed",         value: paymentAnalytics.failedPayments, color: "text-red-600",     bg: "bg-red-50"     },
              { label: "Refunded",       value: paymentAnalytics.refundedPayments, color: "text-pink-600",   bg: "bg-pink-50"    },
              { label: "Success Rate",   value: `${paymentAnalytics.successRate}%`, color: "text-violet-600", bg: "bg-violet-50"  },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} rounded-xl p-3.5`}>
                <p className="text-[11px] text-gray-500 mb-1">{s.label}</p>
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Charts Row ────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Invoice Status Bar Chart */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                <CreditCard size={16} className="text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Invoice Count by Status</h3>
                <p className="text-[11px] text-gray-400">Distribution across invoice statuses</p>
              </div>
            </div>
            {amountByStatus.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-gray-400">No data</div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={amountByStatus} barCategoryGap="35%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="status" tick={{ fontSize: 11 }} stroke="#94a3b8" axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={CUSTOM_TOOLTIP_STYLE}
                      formatter={(value: number, name: string) =>
                        name === "revenue" ? [formatCurrency(value), "Revenue"] : [value, "Count"]
                      }
                    />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]} name="count">
                      {amountByStatus.map((entry) => (
                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || "#94a3b8"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Status Pie Chart */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                <Activity size={16} className="text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Status Distribution</h3>
                <p className="text-[11px] text-gray-400">Invoice status breakdown</p>
              </div>
            </div>
            {statusPieData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-gray-400">No data</div>
            ) : (
              <>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusPieData}
                        cx="50%" cy="50%"
                        innerRadius={55} outerRadius={85}
                        paddingAngle={3} dataKey="value"
                      >
                        {statusPieData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ ...CUSTOM_TOOLTIP_STYLE, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-3 mt-2 justify-center">
                  {statusPieData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
                      <span className="text-[11px] text-gray-500">{entry.name} ({entry.value})</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Payment Status Distribution + Recent Payments ── */}
        {paymentAnalytics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Payment Status Distribution */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
                  <CreditCard size={16} className="text-violet-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Payment Status Distribution</h3>
                  <p className="text-[11px] text-gray-400">All Razorpay payment records</p>
                </div>
              </div>
              {!paymentAnalytics.statusDistribution?.length ? (
                <div className="h-48 flex items-center justify-center text-sm text-gray-400">No payment data</div>
              ) : (
                <div className="space-y-4">
                  {paymentAnalytics.statusDistribution.map((s) => {
                    const total = paymentAnalytics.totalPayments || 1;
                    const pct = Math.round((s.count / total) * 100);
                    const color = STATUS_COLORS[s.status] || "#94a3b8";
                    return (
                      <div key={s.status}>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="font-medium text-gray-700">{s.status}</span>
                          <span className="text-gray-400">{s.count} <span className="text-gray-300">·</span> {pct}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Payments */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <TrendingUp size={16} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Recent Payments</h3>
                  <p className="text-[11px] text-gray-400">Latest successful transactions</p>
                </div>
              </div>
              {!paymentAnalytics.recentPayments?.length ? (
                <div className="h-48 flex items-center justify-center text-sm text-gray-400">No payments yet</div>
              ) : (
                <div className="space-y-2">
                  {paymentAnalytics.recentPayments.slice(0, 8).map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100/80 rounded-xl transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                          <CheckCircle2 size={13} className="text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-700">
                            {p.invoiceId.length > 18 ? p.invoiceId.slice(0, 18) + "…" : p.invoiceId}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {p.paidAt ? new Date(p.paidAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}
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
        )}

        {/* ── Revenue Trend (from recent payments) ──────── */}
        {recentTrend.length > 1 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                <TrendingUp size={16} className="text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Payment Revenue Trend</h3>
                <p className="text-[11px] text-gray-400">Revenue from recent successful payments</p>
              </div>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={recentTrend}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" axisLine={false} tickLine={false} tickFormatter={formatCompact} />
                  <Tooltip
                    contentStyle={CUSTOM_TOOLTIP_STYLE}
                    formatter={(v: number) => [formatCurrency(v), "Revenue"]}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2.5} fill="url(#revenueGrad)" dot={{ r: 4, fill: "#3b82f6" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── Top Clients Table ────────────────────────── */}
        {topClients.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Top Clients by Revenue</h3>
              <span className="text-xs text-gray-400">{topClients.length} clients</span>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">#</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Client</th>
                  <th className="text-center px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Invoices</th>
                  <th className="text-right px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {topClients.map(([name, data], idx) => (
                  <tr key={name} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-3.5">
                      <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 text-[11px] font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm font-medium text-gray-800">{name}</td>
                    <td className="px-4 py-3.5 text-center text-sm text-gray-600">{data.count}</td>
                    <td className="px-6 py-3.5 text-right text-sm font-bold text-gray-900">{formatCurrency(data.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
