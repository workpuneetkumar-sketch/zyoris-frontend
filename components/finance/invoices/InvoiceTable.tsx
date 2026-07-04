"use client";

import React from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  Eye,
  Edit2,
  Send,
  CheckCircle2,
  AlertCircle,
  Plus,
  FileSpreadsheet,
  Banknote, // added for Pay Now
} from "lucide-react";
import { Invoice } from "@/lib/api/finance/invoicesApi";

// ── Types ─────────────────────────────────────────────────

type StatusFilter = "ALL" | "DRAFT" | "SENT" | "PAID" | "OVERDUE";

// ── Constants ────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; icon: any }
> = {
  DRAFT: {
    label: "Draft",
    bg: "bg-gray-100",
    text: "text-gray-700",
    border: "border-gray-200",
    icon: Edit2,
  },
  SENT: {
    label: "Sent",
    bg: "bg-blue-100",
    text: "text-blue-700",
    border: "border-blue-200",
    icon: Send,
  },
  PAID: {
    label: "Paid",
    bg: "bg-green-100",
    text: "text-green-700",
    border: "border-green-200",
    icon: CheckCircle2,
  },
  OVERDUE: {
    label: "Overdue",
    bg: "bg-red-100",
    text: "text-red-700",
    border: "border-red-200",
    icon: AlertCircle,
  },
};

const PAGE_SIZE = 10;

// ── Helper Functions ─────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function isOverdue(dueDate: string): boolean {
  return new Date(dueDate) < new Date();
}

// ── Table Skeleton ───────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-6 py-4 border-b border-gray-100"
        >
          <div className="h-4 bg-gray-200 rounded w-32" />
          <div className="h-4 bg-gray-200 rounded w-40 flex-1" />
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="h-8 bg-gray-200 rounded-full w-24" />
          <div className="h-4 bg-gray-200 rounded w-28" />
          <div className="h-8 bg-gray-200 rounded w-32" />
        </div>
      ))}
    </div>
  );
}

// ── Empty State ──────────────────────────────────────────

function EmptyState({
  hasFilters,
  onReset,
  onCreateClick,
}: {
  hasFilters: boolean;
  onReset: () => void;
  onCreateClick: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <FileSpreadsheet size={40} className="text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        No invoices found
      </h3>
      <p className="text-sm text-gray-500 max-w-md mb-6">
        {hasFilters
          ? "No invoices match your current filters."
          : "Get started by creating your first invoice."}
      </p>
      {hasFilters ? (
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
        >
          <RefreshCw size={14} />
          Reset Filters
        </button>
      ) : (
        <button
          onClick={onCreateClick}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-all"
        >
          <Plus size={16} />
          Create Invoice
        </button>
      )}
    </div>
  );
}

// ── Error State ──────────────────────────────────────────

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-24 h-24 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <AlertCircle size={40} className="text-red-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        Failed to load invoices
      </h3>
      <p className="text-sm text-gray-500 max-w-md mb-6">{message}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-all"
      >
        <RefreshCw size={14} />
        Try Again
      </button>
    </div>
  );
}

// ── Main Table Component ─────────────────────────────────

interface InvoiceTableProps {
  invoices: Invoice[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  statusFilter: StatusFilter;
  currentPage: number;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: StatusFilter) => void;
  onPageChange: (page: number) => void;
  onResetFilters: () => void;
  onRefresh: () => void;
  onViewInvoice: (id: string) => void;
  onStatusUpdate: (id: string, status: "SENT" | "PAID") => Promise<void>;
  onCreateClick: () => void;
  onExportExcel: () => void;
  onPreviewInvoice: (id: string) => void;
  onPayNow?: (id: string) => void; // new prop for Pay Now
}

export function InvoiceTable({
  invoices,
  loading,
  error,
  searchQuery,
  statusFilter,
  currentPage,
  onSearchChange,
  onStatusFilterChange,
  onPageChange,
  onResetFilters,
  onRefresh,
  onViewInvoice,
  onStatusUpdate,
  onCreateClick,
  onPreviewInvoice,
  onPayNow, // destructure the new prop
}: InvoiceTableProps) {
  // Filter invoices
  const filteredInvoices = invoices.filter((inv) => {
    if (statusFilter !== "ALL" && inv.status !== statusFilter) return false;
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      if (
        !inv.invoiceNumber.toLowerCase().includes(searchLower) &&
        !inv.clientName.toLowerCase().includes(searchLower)
      )
        return false;
    }
    return true;
  });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredInvoices.length / PAGE_SIZE)
  );
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );
  const hasActiveFilters =
    statusFilter !== "ALL" || searchQuery.trim() !== "";

  const handlePageChange = (page: number) => {
    onPageChange(page);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Filters */}
      <div className="px-5 py-3 border-b border-gray-200 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by invoice # or client..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-gray-800 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) =>
            onStatusFilterChange(e.target.value as StatusFilter)
          }
          className="px-3 py-2 border border-gray-200 rounded-lg text-gray-800 text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="ALL">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="SENT">Sent</option>
          <option value="PAID">Paid</option>
          <option value="OVERDUE">Overdue</option>
        </select>
        {hasActiveFilters && (
          <button
            onClick={onResetFilters}
            className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
          >
            <RefreshCw size={14} /> Clear
          </button>
        )}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm ml-auto"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />{" "}
          Refresh
        </button>
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="px-5 py-2 bg-gray-50 border-b border-gray-200 flex flex-wrap gap-2">
          <span className="text-xs text-gray-500">Active filters:</span>
          {statusFilter !== "ALL" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs">
              Status: {statusFilter}
              <button
                onClick={() => onStatusFilterChange("ALL")}
                className="hover:text-red-500"
              >
                <X size={12} />
              </button>
            </span>
          )}
          {searchQuery && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs">
              Search: "{searchQuery}"
              <button
                onClick={() => onSearchChange("")}
                className="hover:text-red-500"
              >
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
        <ErrorState message={error} onRetry={onRefresh} />
      ) : filteredInvoices.length === 0 ? (
        <EmptyState
          hasFilters={hasActiveFilters}
          onReset={onResetFilters}
          onCreateClick={onCreateClick}
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Invoice #
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Client
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Amount
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Due Date
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedInvoices.map((inv) => {
                  const statusConfig = STATUS_CONFIG[inv.status];
                  const StatusIcon = statusConfig.icon;
                  const overdue =
                    inv.status !== "PAID" && isOverdue(inv.dueDate);
                  const finalStatus =
                    overdue && inv.status !== "PAID" ? "OVERDUE" : inv.status;
                  const finalConfig = STATUS_CONFIG[finalStatus];
                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <span className="text-sm font-mono font-medium text-gray-900">
                          {inv.invoiceNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-800">
                          {inv.clientName}
                        </p>
                        {inv.clientEmail && (
                          <p className="text-xs text-gray-400">
                            {inv.clientEmail}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-semibold text-gray-900">
                          {formatCurrency(inv.totalAmount)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${finalConfig.bg} ${finalConfig.text}`}
                        >
                          <StatusIcon size={10} /> {finalConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-sm ${
                            overdue
                              ? "text-red-600 font-medium"
                              : "text-gray-600"
                          }`}
                        >
                          {formatDate(inv.dueDate)}
                          {overdue && " (Overdue)"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onViewInvoice(inv.id)}
                            className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500"
                            title="View"
                          >
                            <Eye size={14} />
                          </button>
                          {/* Preview button */}
                          <button
                            onClick={() => onPreviewInvoice(inv.id)}
                            className="p-1.5 hover:bg-purple-50 rounded-lg text-purple-500"
                            title="Preview"
                          >
                            <FileSpreadsheet size={14} />
                          </button>
                          {/* Pay Now button (conditionally shown if onPayNow prop is provided) */}
                          {onPayNow && (
                            <button
                              onClick={() => onPayNow(inv.id)}
                              className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-600"
                              title="Pay Now"
                            >
                              <Banknote size={14} />
                            </button>
                          )}
                          {inv.status !== "PAID" &&
                            inv.status !== "OVERDUE" && (
                              <select
                                onChange={async (e) => {
                                  const ns = e.target.value as
                                    | "SENT"
                                    | "PAID";
                                  if (ns) await onStatusUpdate(inv.id, ns);
                                }}
                                className="px-2 py-1 border border-gray-200 rounded text-xs text-gray-800 focus:outline-none focus:border-blue-500"
                                defaultValue=""
                              >
                                <option value="" disabled>
                                  Status
                                </option>
                                {inv.status === "DRAFT" && (
                                  <option value="SENT">Mark Sent</option>
                                )}
                                {inv.status === "SENT" && (
                                  <option value="PAID">Mark Paid</option>
                                )}
                              </select>
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
            <div className="px-5 py-3 border-t border-gray-200 flex justify-between items-center">
              <span className="text-sm text-gray-500">
                Showing {((currentPage - 1) * PAGE_SIZE) + 1} to{" "}
                {Math.min(
                  currentPage * PAGE_SIZE,
                  filteredInvoices.length
                )}{" "}
                of {filteredInvoices.length}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30"
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from(
                  { length: Math.min(5, totalPages) },
                  (_, i) => {
                    let p = currentPage;
                    if (totalPages <= 5) p = i + 1;
                    else if (currentPage <= 3) p = i + 1;
                    else if (currentPage >= totalPages - 2)
                      p = totalPages - 4 + i;
                    else p = currentPage - 2 + i;
                    return (
                      <button
                        key={p}
                        onClick={() => handlePageChange(p)}
                        className={`w-8 h-8 text-sm rounded-lg ${
                          currentPage === p
                            ? "bg-blue-600 text-white"
                            : "border border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        {p}
                      </button>
                    );
                  }
                )}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
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
  );
}