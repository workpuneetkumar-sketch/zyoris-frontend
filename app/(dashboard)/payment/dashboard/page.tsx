"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  IndianRupee,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  CreditCard,
  FileText,
  RefreshCw,
} from "lucide-react";
import {
  getInvoices,
  Invoice,
} from "@/lib/api/finance/invoicesApi";
import { usePayment } from "@/context/PaymentContext";

// ── Helpers ──────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function PaymentDashboardPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getPayments } = usePayment();

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getInvoices();
      setInvoices(data);
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  // ── Loading Skeleton ──────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 md:px-6 py-6 max-w-[1400px] mx-auto animate-pulse">
        <div className="h-8 w-64 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-96 bg-gray-100 rounded mb-8" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border p-5 h-28" />
          ))}
        </div>
      </div>
    );
  }

  // ── Error State ───────────────────────────────────────────
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
            onClick={loadInvoices}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-all shadow-sm"
          >
            <RefreshCw size={16} /> Try Again
          </button>
        </div>
      </div>
    );
  }

  // ── Compute stats from invoices ───────────────────────────
  const paidInvoices = invoices.filter((i) => i.status === "PAID");
  const pendingInvoices = invoices.filter(
    (i) => i.status === "DRAFT" || i.status === "SENT"
  );
  const overdueInvoices = invoices.filter(
    (i) =>
      i.status === "OVERDUE" ||
      (i.status !== "PAID" && new Date(i.dueDate) < new Date())
  );

  const totalRevenue = paidInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
  const outstandingAmount = invoices
    .filter((i) => i.status !== "PAID")
    .reduce((sum, i) => sum + i.totalAmount, 0);
  const successRate =
    invoices.length > 0
      ? Math.round((paidInvoices.length / invoices.length) * 100)
      : 0;

  // KPI Cards
  const kpiCards = [
    {
      label: "Total Invoices",
      value: invoices.length.toString(),
      icon: FileText,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      label: "Paid",
      value: paidInvoices.length.toString(),
      icon: CheckCircle2,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      label: "Pending",
      value: pendingInvoices.length.toString(),
      icon: Clock,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },
    {
      label: "Overdue",
      value: overdueInvoices.length.toString(),
      icon: AlertCircle,
      iconBg: "bg-red-50",
      iconColor: "text-red-600",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 px-4 md:px-6 py-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Invoice payment overview and revenue stats
          </p>
        </div>
        <button
          onClick={loadInvoices}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700 rounded-xl transition-all shadow-sm"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center mb-3`}>
                <Icon size={18} className={card.iconColor} />
              </div>
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                {card.label}
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* ── Revenue Stats Row ──────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <IndianRupee size={14} className="text-emerald-500" />
            <span className="text-xs font-medium text-gray-500">Total Revenue</span>
          </div>
          <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-orange-500" />
            <span className="text-xs font-medium text-gray-500">Outstanding</span>
          </div>
          <p className="text-xl font-bold text-orange-600">{formatCurrency(outstandingAmount)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard size={14} className="text-blue-500" />
            <span className="text-xs font-medium text-gray-500">Success Rate</span>
          </div>
          <p className="text-xl font-bold text-blue-600">{successRate}%</p>
        </div>
      </div>

      {/* ── Recent Invoices ────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">Recent Invoices</h3>
        </div>
        {invoices.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            No invoices yet
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Invoice</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Client</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {invoices.slice(0, 8).map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5 font-mono font-semibold text-gray-900">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3.5 text-gray-600">{inv.clientName}</td>
                  <td className="px-4 py-3.5 text-right font-semibold text-gray-900">{formatCurrency(inv.totalAmount)}</td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      inv.status === "PAID"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : inv.status === "SENT"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-gray-50 text-gray-600 border-gray-200"
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
