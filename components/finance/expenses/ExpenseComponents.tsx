// app/finance/expenses/components/ExpenseComponents.tsx

"use client";

import React, { useEffect } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Loader2,
  DollarSign,
  CalendarDays,
  RefreshCw,
  X,
  Plus,
  PiggyBank,
  Receipt,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
  Edit2,
  Trash2,
} from "lucide-react";
import { Expense } from "@/lib/api/finance/expenseApi";
import {
  CATEGORIES,
  STATUS_STYLES,
  formatCurrency,
  formatDate,
  getRelativeTime,
  getCategoryInfo,
} from "./constants";

// ── Types ─────────────────────────────────────────────────
interface ToastMessage {
  type: "success" | "error";
  message: string;
}

// ── Toast Component ───────────────────────────────────────
export function Toast({ toast, onClose }: { toast: ToastMessage; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border backdrop-blur-md animate-slide-in ${
        toast.type === "success"
          ? "bg-emerald-50/95 border-emerald-200 text-emerald-800"
          : "bg-rose-50/95 border-rose-200 text-rose-800"
      }`}
    >
      {toast.type === "success" ? (
        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 size={18} className="text-emerald-600" />
        </div>
      ) : (
        <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
          <XCircle size={18} className="text-rose-600" />
        </div>
      )}
      <p className="text-sm font-medium">{toast.message}</p>
      <button onClick={onClose} className="ml-2 p-1.5 hover:bg-black/5 rounded-lg transition-colors">
        <X size={14} />
      </button>
    </div>
  );
}

// ── Loading Skeleton ──────────────────────────────────────
export function TableSkeleton() {
  return (
    <div className="animate-pulse">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50">
          <div className="h-4 bg-gray-100 rounded-lg w-24" />
          <div className="h-8 bg-gray-100 rounded-lg w-28" />
          <div className="h-4 bg-gray-100 rounded-lg w-32 flex-1" />
          <div className="h-4 bg-gray-100 rounded-lg w-20" />
          <div className="h-8 bg-gray-100 rounded-full w-24" />
          <div className="h-8 bg-gray-100 rounded-lg w-20" />
          <div className="h-8 bg-gray-100 rounded-lg w-24" />
        </div>
      ))}
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────
export function EmptyState({
  hasFilters,
  onReset,
  onCreateClick,
}: {
  hasFilters: boolean;
  onReset: () => void;
  onCreateClick: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center mb-6 shadow-inner">
        <Receipt size={40} className="text-gray-400" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">No expenses found</h3>
      <p className="text-sm text-gray-500 max-w-md mb-6">
        {hasFilters
          ? "No expenses match your current filters. Try adjusting your search or clear all filters."
          : "Start tracking your expenses by creating your first expense report."}
      </p>
      {hasFilters ? (
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
        >
          <RefreshCw size={16} />
          Reset Filters
        </button>
      ) : (
        <button
          onClick={onCreateClick}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all transform hover:-translate-y-0.5"
        >
          <Plus size={18} />
          Create Your First Expense
        </button>
      )}
    </div>
  );
}

// ── Error State ───────────────────────────────────────────
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-24 h-24 rounded-2xl bg-rose-50 flex items-center justify-center mb-6">
        <XCircle size={40} className="text-rose-400" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">Failed to load expenses</h3>
      <p className="text-sm text-gray-500 max-w-md mb-6">{message}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all"
      >
        <RefreshCw size={16} />
        Try Again
      </button>
    </div>
  );
}

// ── Stats Cards ───────────────────────────────────────────
export function StatsCards({ expenses }: { expenses: Expense[] }) {
  const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const pendingAmount = expenses
    .filter((e) => e.status === "PENDING")
    .reduce((sum, exp) => sum + exp.amount, 0);
  const approvedAmount = expenses
    .filter((e) => e.status === "APPROVED")
    .reduce((sum, exp) => sum + exp.amount, 0);
  const reimbursedAmount = expenses
    .filter((e) => e.status === "REIMBURSED")
    .reduce((sum, exp) => sum + exp.amount, 0);
  const pendingCount = expenses.filter((e) => e.status === "PENDING").length;

  const stats = [
    {
      label: "Total Expenses",
      value: formatCurrency(totalAmount),
      icon: DollarSign,
      trend: "+12.5%",
      trendUp: true,
      gradient: "from-blue-500 to-blue-600",
      bgGradient: "from-blue-50 to-blue-100",
      iconColor: "text-blue-600",          // ✅ fixed
      count: `${expenses.length} requests`,
    },
    {
      label: "Pending Approval",
      value: formatCurrency(pendingAmount),
      icon: Clock,
      trend: `${pendingCount} pending`,
      trendUp: null,
      gradient: "from-amber-500 to-amber-600",
      bgGradient: "from-amber-50 to-amber-100",
      iconColor: "text-amber-600",         // ✅ fixed
      count: `${pendingCount} requests`,
      highlight: pendingCount > 0,
    },
    {
      label: "Approved",
      value: formatCurrency(approvedAmount),
      icon: CheckCircle2,
      trend: "+8.3%",
      trendUp: true,
      gradient: "from-emerald-500 to-emerald-600",
      bgGradient: "from-emerald-50 to-emerald-100",
      iconColor: "text-emerald-600",       // ✅ fixed
      count: `${expenses.filter((e) => e.status === "APPROVED").length} requests`,
    },
    {
      label: "Reimbursed",
      value: formatCurrency(reimbursedAmount),
      icon: PiggyBank,
      trend: "-3.2%",
      trendUp: false,
      gradient: "from-sky-500 to-sky-600",
      bgGradient: "from-sky-50 to-sky-100",
      iconColor: "text-sky-600",           // ✅ fixed
      count: `${expenses.filter((e) => e.status === "REIMBURSED").length} requests`,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <div
            key={idx}
            className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
          >
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.gradient}`} />
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.bgGradient} flex items-center justify-center shadow-sm`}>
                  {/* ✅ Using solid colour instead of text-transparent gradient */}
                  <Icon size={22} className={stat.iconColor} />
                </div>
                {stat.trendUp !== null && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${
                      stat.trendUp
                        ? "text-emerald-700 bg-emerald-50"
                        : "text-rose-700 bg-rose-50"
                    }`}
                  >
                    {stat.trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {stat.trend}
                  </span>
                )}
                {stat.highlight && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Action needed
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                {stat.label}
              </p>
              <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
              <p className="text-xs text-gray-400">{stat.count}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Expense Row Component ─────────────────────────────────
export function ExpenseRow({
  expense,
  approvingId,
  reimbursingId,
  deletingId,
  onApprove,
  onReimburse,
  onEdit,
  onDelete,
}: {
  expense: Expense;
  approvingId: string | null;
  reimbursingId: string | null;
  deletingId: string | null;
  onApprove: (id: string) => void;
  onReimburse: (id: string) => void;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
}) {
  const catInfo = getCategoryInfo(expense.category);
  const CatIcon = catInfo.icon;
  const statusStyle = STATUS_STYLES[expense.status] || STATUS_STYLES.PENDING;
  const isApproving = approvingId === expense.id;
  const isReimbursing = reimbursingId === expense.id;
  const isDeleting = deletingId === expense.id;
  const StatusIcon = statusStyle.icon;

  return (
    <tr
      key={expense.id}
      className="group hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-transparent transition-all duration-200"
    >
      <td className="px-6 py-4">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {formatDate(expense.expenseDate)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {getRelativeTime(expense.createdAt)}
          </p>
        </div>
      </td>

      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg ${catInfo.color} flex items-center justify-center`}>
            <CatIcon size={14} />
          </div>
          <span className="text-sm font-medium text-gray-700">{catInfo.label}</span>
        </div>
      </td>

      <td className="px-4 py-4">
        <p className="text-sm text-gray-700 max-w-[250px] truncate font-medium">
          {expense.description || "—"}
        </p>
      </td>

      <td className="px-4 py-4 text-right">
        <span className="text-sm font-bold text-gray-900">
          {formatCurrency(expense.amount)}
        </span>
      </td>

      <td className="px-4 py-4">
        <div className="flex justify-center">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border-2 ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
          >
            <StatusIcon size={12} />
            {expense.status}
          </span>
        </div>
      </td>

      <td className="px-4 py-4">
        <div className="flex items-center justify-center gap-2">
          {/* Edit Button */}
          <button
            onClick={() => onEdit(expense)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-all"
            title="Edit expense"
          >
            <Edit2 size={16} className="text-gray-500" />
          </button>

          {/* Delete Button */}
          <button
            onClick={() => onDelete(expense.id)}
            disabled={isDeleting}
            className="p-2 rounded-lg hover:bg-rose-50 transition-all"
            title="Delete expense"
          >
            {isDeleting ? (
              <Loader2 size={16} className="animate-spin text-rose-500" />
            ) : (
              <Trash2 size={16} className="text-rose-400 hover:text-rose-600" />
            )}
          </button>

          {/* Approve Button */}
          {expense.status === "PENDING" && (
            <button
              onClick={() => onApprove(expense.id)}
              disabled={!!approvingId}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all"
            >
              {isApproving ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <CheckCircle2 size={12} />
              )}
              Approve
            </button>
          )}

          {/* Reimburse Button */}
          {expense.status === "APPROVED" && (
            <button
              onClick={() => onReimburse(expense.id)}
              disabled={!!isReimbursing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-md shadow-sky-500/20 hover:shadow-sky-500/30 transition-all"
            >
              {isReimbursing ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <PiggyBank size={12} />
              )}
              Reimburse
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}