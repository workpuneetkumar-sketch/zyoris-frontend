"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  FileText,
  ArrowRight,
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
} from "lucide-react";
import {
  getInvoices,
  Invoice,
} from "@/lib/api/finance/invoicesApi";

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

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isOverdue(dueDate: string): boolean {
  return new Date(dueDate) < new Date();
}

// ── Status Config ──────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: typeof CheckCircle2 }> = {
  DRAFT: { label: "Draft", bg: "bg-gray-100", text: "text-gray-600", icon: FileText },
  SENT: { label: "Sent", bg: "bg-blue-100", text: "text-blue-700", icon: FileText },
  PAID: { label: "Paid", bg: "bg-emerald-100", text: "text-emerald-700", icon: CheckCircle2 },
  OVERDUE: { label: "Overdue", bg: "bg-red-100", text: "text-red-700", icon: AlertCircle },
};

// ── Summary Cards ──────────────────────────────────────────

function SummaryCards({ invoices }: { invoices: Invoice[] }) {
  const paid = invoices.filter((i) => i.status === "PAID");
  const pending = invoices.filter((i) => i.status === "DRAFT" || i.status === "SENT");
  const overdue = invoices.filter(
    (i) => i.status === "OVERDUE" || (i.status !== "PAID" && isOverdue(i.dueDate))
  );
  const totalRevenue = paid.reduce((sum, i) => sum + i.totalAmount, 0);
  const outstanding = invoices
    .filter((i) => i.status !== "PAID")
    .reduce((sum, i) => sum + i.totalAmount, 0);

  const cards = [
    {
      label: "Total Invoices",
      value: invoices.length.toString(),
      icon: FileText,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      label: "Paid",
      value: paid.length.toString(),
      icon: CheckCircle2,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      label: "Pending",
      value: pending.length.toString(),
      icon: Clock,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },
    {
      label: "Overdue",
      value: overdue.length.toString(),
      icon: AlertCircle,
      iconBg: "bg-red-50",
      iconColor: "text-red-600",
    },
    {
      label: "Revenue",
      value: formatCurrency(totalRevenue),
      icon: IndianRupee,
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      label: "Outstanding",
      value: formatCurrency(outstanding),
      icon: TrendingUp,
      iconBg: "bg-orange-50",
      iconColor: "text-orange-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className={`w-9 h-9 rounded-lg ${card.iconBg} flex items-center justify-center mb-3`}>
              <Icon size={16} className={card.iconColor} />
            </div>
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
              {card.label}
            </p>
            <p className="text-lg font-bold text-gray-900 mt-0.5">{card.value}</p>
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
        <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-100">
          <div className="h-4 bg-gray-200 rounded w-28" />
          <div className="h-4 bg-gray-200 rounded w-36 flex-1" />
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="h-6 bg-gray-200 rounded-full w-20" />
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="h-8 bg-gray-200 rounded-lg w-20" />
        </div>
      ))}
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────

function EmptyState({ hasFilters, onReset }: { hasFilters: boolean; onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-20 h-20 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
        <FileText size={36} className="text-gray-300" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">No invoices found</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-xs">
        {hasFilters
          ? "No invoices match your current filters. Try adjusting your search."
          : "Invoices will appear here once they are created."}
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

// ── Error State ────────────────────────────────────────────

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
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: Record<string, string> = {};
      if (statusFilter !== "ALL") filters.status = statusFilter;
      if (searchQuery) filters.search = searchQuery;
      const data = await getInvoices(filters);
      setInvoices(data);
    } catch (err: any) {
      setError(err.message || "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  // Filter + paginate
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (statusFilter !== "ALL" && inv.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !inv.invoiceNumber.toLowerCase().includes(q) &&
          !inv.clientName.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [invoices, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / PAGE_SIZE));
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );
  const hasActiveFilters = statusFilter !== "ALL" || searchQuery.trim() !== "";

  const handleResetFilters = () => {
    setStatusFilter("ALL");
    setSearchQuery("");
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 md:px-6 py-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payments & Invoices</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage payments and track invoice status
            </p>
          </div>
          <Link
            href="/finance/invoices"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all"
          >
            <Eye size={16} /> View All Invoices
          </Link>
        </div>

        {/* Summary Cards */}
        {!loading && !error && <SummaryCards invoices={invoices} />}

        {/* Table Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Filters */}
          <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search by invoice # or client…"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusFilter);
                setCurrentPage(1);
              }}
              className="px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
            >
              <option value="ALL">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
            </select>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1.5 px-3.5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl text-sm transition-all"
              >
                <X size={14} /> Clear
              </button>
            )}
            <button
              onClick={loadInvoices}
              disabled={loading}
              className="flex items-center gap-2 px-3.5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl text-sm ml-auto transition-all"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          {/* Active Filters */}
          {hasActiveFilters && (
            <div className="px-5 py-2 bg-gray-50/50 border-b border-gray-100 flex flex-wrap gap-2 items-center">
              <span className="text-xs text-gray-400">Active filters:</span>
              {statusFilter !== "ALL" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white border border-gray-200 rounded-full text-xs font-medium">
                  Status: {statusFilter}
                  <button onClick={() => setStatusFilter("ALL")} className="hover:text-red-500">
                    <X size={12} />
                  </button>
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white border border-gray-200 rounded-full text-xs font-medium">
                  &quot;{searchQuery}&quot;
                  <button onClick={() => setSearchQuery("")} className="hover:text-red-500">
                    <X size={12} />
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Table Content */}
          {loading ? (
            <TableSkeleton />
          ) : error ? (
            <ErrorState message={error} onRetry={loadInvoices} />
          ) : filteredInvoices.length === 0 ? (
            <EmptyState hasFilters={hasActiveFilters} onReset={handleResetFilters} />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50/80 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Invoice #
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Due Date
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paginatedInvoices.map((inv) => {
                      const overdue = inv.status !== "PAID" && isOverdue(inv.dueDate);
                      const finalStatus = overdue && inv.status !== "PAID" ? "OVERDUE" : inv.status;
                      const config = STATUS_CONFIG[finalStatus] || STATUS_CONFIG.DRAFT;
                      const StatusIcon = config.icon;
                      return (
                        <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-3.5">
                            <span className="text-sm font-mono font-semibold text-gray-900">
                              {inv.invoiceNumber}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="text-sm font-medium text-gray-800">{inv.clientName}</p>
                            {inv.clientEmail && (
                              <p className="text-xs text-gray-400">{inv.clientEmail}</p>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <span className="text-sm font-semibold text-gray-900">
                              {formatCurrency(inv.totalAmount)}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}
                            >
                              <StatusIcon size={10} /> {config.label}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`text-sm ${
                                overdue ? "text-red-600 font-medium" : "text-gray-600"
                              }`}
                            >
                              {formatDate(inv.dueDate)}
                              {overdue && (
                                <span className="ml-1 text-[10px] font-semibold text-red-500">
                                  (Overdue)
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            {inv.status !== "PAID" ? (
                              <button
                                onClick={() => router.push(`/payment/${inv.id}`)}
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-all shadow-sm"
                              >
                                <Banknote size={13} /> Pay
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-50 text-gray-400 text-xs font-medium rounded-lg">
                                <CheckCircle2 size={13} /> Paid
                              </span>
                            )}
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
                    Showing {(currentPage - 1) * PAGE_SIZE + 1} to{" "}
                    {Math.min(currentPage * PAGE_SIZE, filteredInvoices.length)} of{" "}
                    {filteredInvoices.length}
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
                            currentPage === p
                              ? "bg-blue-600 text-white shadow-sm"
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