"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  IndianRupee,
  TrendingUp,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  Banknote,
  Eye,
  Hash,
  ExternalLink,
  History,
  Activity,
} from "lucide-react";
import { getInvoices, Invoice } from "@/lib/api/finance/invoicesApi";
import { listPayments } from "@/lib/api/paymentService";
import type { PaymentRecord } from "@/lib/api/paymentService";

// ── Types ──────────────────────────────────────────────────

type StatusFilter = "ALL" | "DRAFT" | "SENT" | "PAID" | "OVERDUE";
const PAGE_SIZE = 10;

// ── Helpers ────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isOverdue(inv: Invoice): boolean {
  return inv.status !== "PAID" && new Date(inv.dueDate) < new Date();
}

function truncate(s: string, n = 16): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

// ── Status config ──────────────────────────────────────────

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  DRAFT:   { bg: "bg-gray-100  text-gray-600",  text: "", label: "Draft"   },
  SENT:    { bg: "bg-blue-100  text-blue-700",   text: "", label: "Sent"    },
  PAID:    { bg: "bg-emerald-100 text-emerald-700", text: "", label: "Paid" },
  OVERDUE: { bg: "bg-red-100   text-red-700",    text: "", label: "Overdue" },
};

// ── Summary Cards ──────────────────────────────────────────

function SummaryCards({ invoices }: { invoices: Invoice[] }) {
  const paid     = invoices.filter((i) => i.status === "PAID");
  const pending  = invoices.filter((i) => i.status === "DRAFT" || i.status === "SENT");
  const overdue  = invoices.filter((i) => i.status === "OVERDUE" || isOverdue(i));
  const revenue  = paid.reduce((s, i) => s + i.totalAmount, 0);
  const outstanding = invoices.filter((i) => i.status !== "PAID").reduce((s, i) => s + i.totalAmount, 0);

  const cards = [
    { label: "Total",      value: invoices.length.toString(), icon: FileText,     bg: "bg-blue-500"    },
    { label: "Paid",       value: paid.length.toString(),     icon: CheckCircle2, bg: "bg-emerald-500" },
    { label: "Pending",    value: pending.length.toString(),  icon: Clock,        bg: "bg-amber-500"   },
    { label: "Overdue",    value: overdue.length.toString(),  icon: AlertCircle,  bg: "bg-red-500"     },
    { label: "Revenue",    value: formatCurrency(revenue),    icon: IndianRupee,  bg: "bg-teal-500"    },
    { label: "Outstanding",value: formatCurrency(outstanding),icon: TrendingUp,   bg: "bg-orange-500"  },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center mb-2.5`}>
              <Icon size={14} className="text-white" />
            </div>
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">{card.label}</p>
            <p className="text-base font-bold text-gray-900 mt-0.5 truncate" title={card.value}>{card.value}</p>
          </div>
        );
      })}
    </div>
  );
}

// ── Table Skeleton ─────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-100">
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="h-4 bg-gray-200 rounded w-32" />
          <div className="h-4 bg-gray-200 rounded w-20" />
          <div className="h-6 bg-gray-200 rounded-full w-18" />
          <div className="h-3 bg-gray-100 rounded w-24" />
          <div className="h-3 bg-gray-100 rounded w-28" />
          <div className="h-4 bg-gray-200 rounded w-20" />
          <div className="h-8 bg-gray-200 rounded-lg w-16" />
        </div>
      ))}
    </div>
  );
}

// ── Empty / Error states ───────────────────────────────────

function EmptyState({ hasFilters, onReset }: { hasFilters: boolean; onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-20 h-20 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
        <FileText size={36} className="text-gray-300" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">No invoices found</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-xs">
        {hasFilters ? "No invoices match your current filters." : "Invoices will appear here once created."}
      </p>
      {hasFilters && (
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
        >
          <RefreshCw size={14} /> Reset Filters
        </button>
      )}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-20 h-20 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
        <AlertCircle size={36} className="text-red-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Failed to load invoices</h3>
      <p className="text-sm text-gray-500 mb-6">{message}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-sm transition-all"
      >
        <RefreshCw size={14} /> Try Again
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function PaymentInvoicesPage() {
  const router = useRouter();

  const [invoices, setInvoices]   = useState<Invoice[]>([]);
  const [payments, setPayments]   = useState<PaymentRecord[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [searchQuery, setSearchQuery]   = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [currentPage, setCurrentPage]   = useState(1);

  // Map invoiceId → payment record (most recent)
  const paymentByInvoice = useMemo(() => {
    const map: Record<string, PaymentRecord> = {};
    payments.forEach((p) => {
      const existing = map[p.invoiceId];
      if (!existing || new Date(p.createdAt) > new Date(existing.createdAt)) {
        map[p.invoiceId] = p;
      }
    });
    return map;
  }, [payments]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: Record<string, string> = {};
      if (statusFilter !== "ALL") filters.status = statusFilter;
      if (searchQuery) filters.search = searchQuery;

      const [invData, payData] = await Promise.all([
        getInvoices(filters),
        listPayments(),
      ]);
      setInvoices(invData);
      setPayments(payData);
    } catch (err: any) {
      setError(err.message || "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (statusFilter !== "ALL" && inv.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!inv.invoiceNumber.toLowerCase().includes(q) && !inv.clientName.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [invoices, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / PAGE_SIZE));
  const paginatedInvoices = filteredInvoices.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const hasActiveFilters  = statusFilter !== "ALL" || searchQuery.trim() !== "";

  const handleReset = () => {
    setStatusFilter("ALL");
    setSearchQuery("");
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 md:px-6 py-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payments &amp; Invoices</h1>
            <p className="text-sm text-gray-500 mt-0.5">Pay invoices and track payment history</p>
          </div>
          <button
            onClick={() => router.push("/finance/invoices")}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all border border-blue-200"
          >
            <Eye size={15} /> Finance Invoices
          </button>
        </div>

        {/* Summary Cards */}
        {!loading && !error && <SummaryCards invoices={invoices} />}

        {/* Table Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Filters Bar */}
          <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by invoice # or client…"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setCurrentPage(1); }}
              className="px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
            >
              <option value="ALL">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
            </select>
            {hasActiveFilters && (
              <button onClick={handleReset} className="flex items-center gap-1.5 px-3.5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl text-sm transition-all">
                <X size={13} /> Clear
              </button>
            )}
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 px-3.5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl text-sm ml-auto transition-all"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>

          {/* Active Filters */}
          {hasActiveFilters && (
            <div className="px-5 py-2 bg-gray-50/50 border-b border-gray-100 flex flex-wrap gap-2 items-center">
              <span className="text-xs text-gray-400">Active filters:</span>
              {statusFilter !== "ALL" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white border border-gray-200 rounded-full text-xs font-medium">
                  {statusFilter}
                  <button onClick={() => setStatusFilter("ALL")} className="hover:text-red-500 ml-0.5"><X size={11} /></button>
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white border border-gray-200 rounded-full text-xs font-medium">
                  &ldquo;{searchQuery}&rdquo;
                  <button onClick={() => setSearchQuery("")} className="hover:text-red-500 ml-0.5"><X size={11} /></button>
                </span>
              )}
            </div>
          )}

          {/* Table Content */}
          {loading ? (
            <TableSkeleton />
          ) : error ? (
            <ErrorState message={error} onRetry={loadData} />
          ) : filteredInvoices.length === 0 ? (
            <EmptyState hasFilters={hasActiveFilters} onReset={handleReset} />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead className="bg-gray-50/80 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Invoice #</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Client</th>
                      <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                      <th className="text-center px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Payment ID</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Order ID</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Due / Paid Date</th>
                      <th className="text-center px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paginatedInvoices.map((inv) => {
                      const overdue = isOverdue(inv);
                      const finalStatus = overdue && inv.status !== "PAID" ? "OVERDUE" : inv.status;
                      const cfg = STATUS_CONFIG[finalStatus] || STATUS_CONFIG.DRAFT;
                      const payment = paymentByInvoice[inv.id];

                      return (
                        <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                          {/* Invoice # */}
                          <td className="px-5 py-3.5">
                            <span className="text-sm font-mono font-semibold text-gray-900">{inv.invoiceNumber}</span>
                          </td>

                          {/* Client */}
                          <td className="px-4 py-3.5">
                            <p className="text-sm font-medium text-gray-800">{inv.clientName}</p>
                            {inv.clientEmail && <p className="text-[11px] text-gray-400">{inv.clientEmail}</p>}
                          </td>

                          {/* Amount */}
                          <td className="px-4 py-3.5 text-right">
                            <span className="text-sm font-semibold text-gray-900">{formatCurrency(inv.totalAmount)}</span>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg}`}>
                              {finalStatus}
                            </span>
                          </td>

                          {/* Payment ID */}
                          <td className="px-4 py-3.5">
                            {payment?.razorpayPaymentId ? (
                              <div className="flex items-center gap-1.5">
                                <Hash size={10} className="text-gray-300 shrink-0" />
                                <code className="text-[11px] font-mono text-gray-500" title={payment.razorpayPaymentId}>
                                  {truncate(payment.razorpayPaymentId, 16)}
                                </code>
                              </div>
                            ) : (
                              <span className="text-[11px] text-gray-300">—</span>
                            )}
                          </td>

                          {/* Razorpay Order ID */}
                          <td className="px-4 py-3.5">
                            {payment?.orderId ? (
                              <div className="flex items-center gap-1.5">
                                <Hash size={10} className="text-gray-300 shrink-0" />
                                <code className="text-[11px] font-mono text-gray-500" title={payment.orderId}>
                                  {truncate(payment.orderId, 16)}
                                </code>
                              </div>
                            ) : (
                              <span className="text-[11px] text-gray-300">—</span>
                            )}
                          </td>

                          {/* Due / Paid Date */}
                          <td className="px-4 py-3.5">
                            {inv.status === "PAID" && payment?.paidAt ? (
                              <div>
                                <p className="text-[11px] text-gray-400 mb-0.5">Paid on</p>
                                <p className="text-xs font-medium text-emerald-600">{formatDate(payment.paidAt)}</p>
                              </div>
                            ) : (
                              <div>
                                <p className="text-[11px] text-gray-400 mb-0.5">Due</p>
                                <p className={`text-xs font-medium ${overdue ? "text-red-500" : "text-gray-600"}`}>
                                  {formatDate(inv.dueDate)}
                                  {overdue && <span className="ml-1 text-[10px] text-red-400">(Overdue)</span>}
                                </p>
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center justify-center gap-1.5">
                              {inv.status !== "PAID" ? (
                                <button
                                  id={`pay-btn-${inv.id}`}
                                  onClick={() => router.push(`/payment/${inv.id}`)}
                                  title="Pay now"
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-[11px] font-semibold rounded-lg transition-all shadow-sm"
                                >
                                  <Banknote size={12} /> Pay
                                </button>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-600 text-[11px] font-medium rounded-lg">
                                  <CheckCircle2 size={12} /> Paid
                                </span>
                              )}

                              {/* View payment details */}
                              {payment && (
                                <button
                                  id={`history-btn-${inv.id}`}
                                  onClick={() => router.push(`/payment/history`)}
                                  title="View payment history"
                                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
                                >
                                  <History size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-5 py-3 border-t border-gray-100 flex justify-between items-center">
                  <span className="text-sm text-gray-400">
                    {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredInvoices.length)} of {filteredInvoices.length}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-all"
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
                            currentPage === p ? "bg-blue-600 text-white shadow-sm" : "border border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-all"
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