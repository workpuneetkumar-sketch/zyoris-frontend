"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  CreditCard,
  IndianRupee,
} from "lucide-react";
import {
  getInvoices,
  Invoice,
} from "@/lib/api/finance/invoicesApi";
import { listPayments } from "@/lib/api/paymentService";
import type { PaymentRecord } from "@/lib/api/paymentService";
import { usePayment, PaymentRecord as ContextPaymentRecord } from "@/context/PaymentContext";

// ── Helpers ──────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const PAGE_SIZE = 10;

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function PaymentHistoryPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { getPayments } = usePayment();

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [invData, paymentData] = await Promise.all([
        getInvoices(),
        listPayments(),
      ]);
      setInvoices(invData);
      setPayments(paymentData);
    } catch (err: any) {
      setError(err.message || "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Build flat list of all payments across invoices
  const allPayments = useMemo(() => {
    const pMap: Record<string, { invoiceNumber: string; clientName: string }> = {};
    invoices.forEach((inv) => {
      pMap[inv.id] = { invoiceNumber: inv.invoiceNumber, clientName: inv.clientName };
    });

    const result: (PaymentRecord & { invoiceNumber: string; clientName: string })[] = [];

    // Add real API payments
    payments.forEach((p) => {
      const invInfo = pMap[p.invoiceId] || { invoiceNumber: p.invoiceId.slice(0, 12), clientName: "" };
      result.push({
        ...p,
        invoiceNumber: invInfo.invoiceNumber,
        clientName: invInfo.clientName,
      });
    });

    // Add local context payments (for backward compat)
    invoices.forEach((inv) => {
      const invPayments = getPayments(inv.id);
      invPayments.forEach((cp) => {
        result.push({
          id: cp.id,
          invoiceId: inv.id,
          orderId: cp.transactionId,
          amount: cp.amount,
          currency: "INR",
          method: cp.method as any,
          status: cp.status === "COMPLETED" ? "PAID" : cp.status as any,
          retryCount: 0,
          invoiceNumber: inv.invoiceNumber,
          clientName: inv.clientName,
          createdAt: cp.date,
          updatedAt: cp.date,
          paidAt: cp.date,
        });
      });
    });

    // Sort by date, newest first
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return result;
  }, [invoices, payments, getPayments]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return allPayments;
    const q = searchQuery.toLowerCase();
    return allPayments.filter(
      (p) =>
        p.invoiceNumber.toLowerCase().includes(q) ||
        p.clientName.toLowerCase().includes(q) ||
        (p.razorpayPaymentId || p.orderId || "").toLowerCase().includes(q)
    );
  }, [allPayments, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedPayments = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 md:px-6 py-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              All recorded payments across invoices
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

        {/* Search */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
          <div className="px-5 py-3 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by invoice, client, transaction…"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="mb-3">
          <p className="text-sm text-gray-500">
            {loading ? "Loading…" : `${allPayments.length} payment${allPayments.length !== 1 ? "s" : ""} recorded`}
          </p>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3 animate-pulse">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16">
              <AlertCircle size={32} className="text-red-400 mb-3" />
              <p className="text-sm text-gray-900 mb-4">{error}</p>
              <button onClick={loadData} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-xl">
                <RefreshCw size={14} className="inline mr-1" /> Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                <Clock size={28} className="text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1">No payments found</p>
              <p className="text-sm text-gray-500">
                {allPayments.length === 0
                  ? "Payments will appear here after recording a transaction"
                  : "Try adjusting your search"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50/80 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Invoice</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Client</th>
                      <th className="text-center px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Method</th>
                      <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Txn ID</th>
                      <th className="text-center px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paginatedPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3.5 text-sm text-gray-600">{formatDate(p.createdAt || p.paidAt || "")}</td>
                        <td className="px-4 py-3.5 text-sm font-medium text-gray-800">{p.invoiceNumber}</td>
                        <td className="px-4 py-3.5 text-sm text-gray-600">{p.clientName}</td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                            <CreditCard size={12} /> {p.method}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right text-sm font-semibold text-gray-900">{formatCurrency(p.amount)}</td>
                        <td className="px-4 py-3.5 text-xs font-mono text-gray-500">{p.razorpayPaymentId || p.orderId || "—"}</td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={10} /> {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-5 py-3 border-t border-gray-100 flex justify-between items-center">
                  <span className="text-sm text-gray-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let p: number;
                      if (totalPages <= 5) p = i + 1;
                      else if (currentPage <= 3) p = i + 1;
                      else if (currentPage >= totalPages - 2) p = totalPages - 4 + i;
                      else p = currentPage - 2 + i;
                      return (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p)}
                          className={`w-8 h-8 text-sm rounded-lg transition-all ${
                            currentPage === p
                              ? "bg-blue-600 text-white"
                              : "border border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
