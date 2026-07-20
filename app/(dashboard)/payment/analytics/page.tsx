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
  PieChart as PieChartIcon,
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
} from "recharts";
import {
  getInvoices,
  Invoice,
} from "@/lib/api/finance/invoicesApi";
import { getPaymentAnalytics } from "@/lib/api/paymentService";
import type { PaymentAnalyticsResponse } from "@/lib/api/paymentService";
import { usePayment } from "@/context/PaymentContext";
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

const STATUS_COLORS: Record<string, string> = {
  PAID: "#10b981",
  SENT: "#3b82f6",
  DRAFT: "#94a3b8",
  OVERDUE: "#ef4444",
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
  const { getPayments } = usePayment();

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

  // ── Loading ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 md:px-6 py-6 max-w-[1400px] mx-auto animate-pulse">
        <div className="h-8 w-56 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-72 bg-gray-100 rounded mb-8" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border h-28" />
          ))}
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">
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

  // ── Compute stats from invoices ───────────────────────────
  const totalInvoices = invoices.length;
  const totalRevenue = invoices
    .filter((i) => i.status === "PAID")
    .reduce((sum, i) => sum + i.totalAmount, 0);
  const invoiceSuccessRate =
    totalInvoices > 0
      ? Math.round(
          (invoices.filter((i) => i.status === "PAID").length / totalInvoices) * 100
        )
      : 0;

  // KPI Cards (mix of invoice and payment analytics)
  const kpis = [
    {
      label: "Total Invoices",
      value: totalInvoices.toLocaleString("en-IN"),
      icon: Activity,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      label: "Total Revenue",
      value: formatCurrency(totalRevenue),
      icon: IndianRupee,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      label: "Payment Success",
      value: `${paymentAnalytics?.successRate ?? invoiceSuccessRate}%`,
      icon: TrendingUp,
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600",
    },
    {
      label: "Failed Payments",
      value: (paymentAnalytics?.failedPayments ?? 0).toString(),
      icon: BarChart3,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },
  ];

  // Status breakdown for pie chart
  const statusMap: Record<string, number> = {};
  invoices.forEach((inv) => {
    statusMap[inv.status] = (statusMap[inv.status] || 0) + 1;
  });
  const statusPieData = Object.entries(statusMap).map(([status, count]) => ({
    name: status,
    value: count,
    color: STATUS_COLORS[status] || "#94a3b8",
  }));

  // Amount by status for bar chart
  const amountByStatus = Object.entries(statusMap).map(([status, count]) => ({
    status,
    count,
    revenue: invoices
      .filter((i) => i.status === status)
      .reduce((sum, i) => sum + i.totalAmount, 0),
  }));

  // Top clients
  const clientMap: Record<string, { count: number; total: number }> = {};
  invoices.forEach((inv) => {
    if (!clientMap[inv.clientName]) {
      clientMap[inv.clientName] = { count: 0, total: 0 };
    }
    clientMap[inv.clientName].count++;
    clientMap[inv.clientName].total += inv.totalAmount;
  });
  const topClients = Object.entries(clientMap)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50 px-4 md:px-6 py-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Invoice payment metrics and breakdown
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700 rounded-xl transition-all shadow-sm"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm"
            >
              <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center mb-3`}>
                <Icon size={18} className={card.iconColor} />
              </div>
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* ── Charts ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Status Bar Chart */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <CreditCard size={16} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Invoice Status</h3>
              <p className="text-[11px] text-gray-400">Count and revenue by status</p>
            </div>
          </div>
          {amountByStatus.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-gray-400">No data</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={amountByStatus}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="status" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                    formatter={(value: number, name: string) =>
                      name === "revenue" ? formatCurrency(value) : value
                    }
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Invoices" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Status Pie */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <PieChartIcon size={16} className="text-amber-600" />
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
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusPieData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
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

      {/* ── Payment Analytics Section ──────────────────────── */}
      {paymentAnalytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Payment Status Distribution */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
                <CreditCard size={16} className="text-violet-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Payment Status Distribution</h3>
                <p className="text-[11px] text-gray-400">All payment records</p>
              </div>
            </div>
            {paymentAnalytics.statusDistribution?.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-gray-400">No data</div>
            ) : (
              <div className="space-y-3">
                {paymentAnalytics.statusDistribution?.map((s) => {
                  const total = paymentAnalytics.totalPayments || 1;
                  const pct = Math.round((s.count / total) * 100);
                  return (
                    <div key={s.status}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-gray-700">{s.status}</span>
                        <span className="text-gray-500">{s.count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: STATUS_COLORS[s.status] || "#94a3b8",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Payments */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                <TrendingUp size={16} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Recent Payments</h3>
                <p className="text-[11px] text-gray-400">Last 10 successful payments</p>
              </div>
            </div>
            {paymentAnalytics.recentPayments?.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-gray-400">No payments yet</div>
            ) : (
              <div className="space-y-2">
                {paymentAnalytics.recentPayments?.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-xs font-medium text-gray-700">
                        {p.invoiceId.length > 20 ? p.invoiceId.slice(0, 20) + "…" : p.invoiceId}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : "—"}
                        {p.method ? ` • ${p.method}` : ""}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600">{formatCurrency(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Top Clients Table ───────────────────────────────── */}
      {topClients.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Top Clients by Revenue</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Client</th>
                <th className="text-right px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Invoices</th>
                <th className="text-right px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {topClients.map(([name, data]) => (
                <tr key={name} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-3.5 text-sm font-medium text-gray-800">{name}</td>
                  <td className="px-6 py-3.5 text-right text-sm text-gray-600">{data.count}</td>
                  <td className="px-6 py-3.5 text-right text-sm font-semibold text-gray-900">{formatCurrency(data.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
