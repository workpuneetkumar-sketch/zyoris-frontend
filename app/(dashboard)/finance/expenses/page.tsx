// app/finance/expenses/page.tsx

"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  Plus,
  Receipt,
  RefreshCw,
  FileSpreadsheet,
   CalendarDays,
} from "lucide-react";
import {
  fetchExpenses,
  approveExpense,
  reimburseExpense,
  deleteExpense,
  Expense,
} from "@/lib/api/finance/expenseApi";
import * as XLSX from "xlsx";
import { CATEGORIES, PAGE_SIZE, formatDateForExport, getCategoryInfo } from "@/components/finance/expenses/constants";
import { Toast, TableSkeleton, EmptyState, ErrorState, StatsCards, ExpenseRow } from "@/components/finance/expenses/ExpenseComponents";
import { CreateExpenseModal, UpdateExpenseModal } from "@/components/finance/expenses/ExpenseModals";

// ── Types ─────────────────────────────────────────────────
type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "REIMBURSED";

interface ToastMessage {
  type: "success" | "error";
  message: string;
}

// ── Main Page Component ───────────────────────────────────
export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [reimbursingId, setReimbursingId] = useState<string | null>(null);
  const [updatingExpense, setUpdatingExpense] = useState<Expense | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: any = {};
      if (statusFilter !== "ALL") filters.status = statusFilter;
      if (categoryFilter !== "ALL") filters.category = categoryFilter;

      const data = await fetchExpenses(filters);
      setExpenses(data);
    } catch (err: any) {
      console.error("Error loading expenses:", err);
      setError(err.message || "Failed to load expenses. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  // Filtering
  const filteredExpenses = expenses.filter((expense) => {
    if (statusFilter !== "ALL" && expense.status !== statusFilter) {
      return false;
    }
    
    if (categoryFilter !== "ALL" && expense.category !== categoryFilter) {
      return false;
    }
    
    if (searchQuery.trim() !== "") {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        expense.description?.toLowerCase().includes(searchLower) ||
        expense.category?.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
    }
    
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, categoryFilter]);

  const paginatedExpenses = filteredExpenses.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Actions
  const handleCreateSuccess = (newExpense: Expense) => {
    setExpenses((prev) => [newExpense, ...prev]);
    setToast({ type: "success", message: "Expense created successfully!" });
  };

  const handleUpdateSuccess = (updatedExpense: Expense) => {
    setExpenses((prev) =>
      prev.map((exp) => (exp.id === updatedExpense.id ? updatedExpense : exp))
    );
    setToast({ type: "success", message: "Expense updated successfully!" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    
    setDeletingId(id);
    try {
      await deleteExpense(id);
      setExpenses((prev) => prev.filter((exp) => exp.id !== id));
      setToast({ type: "success", message: "Expense deleted successfully!" });
    } catch (err: any) {
      console.error("Error deleting expense:", err);
      setToast({ type: "error", message: err.message || "Failed to delete expense." });
    } finally {
      setDeletingId(null);
    }
  };

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    try {
      const updated = await approveExpense(id);
      setExpenses((prev) =>
        prev.map((exp) => (exp.id === id ? updated : exp))
      );
      setToast({ type: "success", message: "Expense approved successfully!" });
    } catch (err: any) {
      console.error("Error approving expense:", err);
      setToast({ type: "error", message: err.message || "Failed to approve expense." });
    } finally {
      setApprovingId(null);
    }
  };

  const handleReimburse = async (id: string) => {
    setReimbursingId(id);
    try {
      const updated = await reimburseExpense(id);
      setExpenses((prev) =>
        prev.map((exp) => (exp.id === id ? updated : exp))
      );
      setToast({ type: "success", message: "Expense reimbursed successfully!" });
    } catch (err: any) {
      console.error("Error reimbursing expense:", err);
      setToast({ type: "error", message: err.message || "Failed to reimburse expense." });
    } finally {
      setReimbursingId(null);
    }
  };

  const handleResetFilters = () => {
    setStatusFilter("ALL");
    setCategoryFilter("ALL");
    setSearchQuery("");
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Export to Excel
  const handleExport = () => {
    if (filteredExpenses.length === 0) {
      setToast({ type: "error", message: "No data to export" });
      return;
    }

    setExporting(true);
    try {
      const exportData = filteredExpenses.map((expense) => {
        return {
          "Date": formatDateForExport(expense.expenseDate),
          "Category": getCategoryInfo(expense.category).label,
          "Description": expense.description || "—",
          "Amount (₹)": expense.amount,
          "Status": expense.status,
          "Created At": formatDateForExport(expense.createdAt),
        };
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = [
        { wch: 15 }, // Date
        { wch: 20 }, // Category
        { wch: 40 }, // Description
        { wch: 15 }, // Amount
        { wch: 15 }, // Status
        { wch: 15 }, // Created At
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Expenses");

      const today = new Date();
      const fileName = `Expenses_${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}.xlsx`;
      
      XLSX.writeFile(wb, fileName);
      setToast({ type: "success", message: `Exported ${filteredExpenses.length} expenses successfully!` });
    } catch (err: any) {
      console.error('Export failed:', err);
      setToast({ type: "error", message: "Failed to export data. Please try again." });
    } finally {
      setExporting(false);
    }
  };

  const hasActiveFilters = statusFilter !== "ALL" || categoryFilter !== "ALL" || searchQuery.trim() !== "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      {showCreateModal && (
        <CreateExpenseModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {updatingExpense && (
        <UpdateExpenseModal
          expense={updatingExpense}
          onClose={() => setUpdatingExpense(null)}
          onSuccess={handleUpdateSuccess}
        />
      )}

      <div className="px-6 py-6 max-w-[1400px] mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <Receipt size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Expenses</h1>
                  <p className="text-sm text-gray-500 mt-0.5">Track, manage, and approve expense reports</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExport}
                disabled={exporting || filteredExpenses.length === 0}
                className="flex items-center gap-2 px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-white hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet size={16} className="text-green-600" />
                    Export Excel
                  </>
                )}
              </button>

              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all transform hover:-translate-y-0.5"
              >
                <Plus size={18} />
                Create Expense
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {!loading && !error && <StatsCards expenses={expenses} />}

        {/* Main Content Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Filters Bar */}
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search expenses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-lg"
                  >
                    <X size={14} className="text-gray-400" />
                  </button>
                )}
              </div>

              <select
                className="px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white transition-all cursor-pointer"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              >
                <option value="ALL">📋 All Status</option>
                <option value="PENDING">⏳ Pending</option>
                <option value="APPROVED">✅ Approved</option>
                <option value="REIMBURSED">💰 Reimbursed</option>
              </select>

              <select
                className="px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white transition-all cursor-pointer"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="ALL">🏷️ All Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>

              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="flex items-center gap-1.5 px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all"
                >
                  <RefreshCw size={14} />
                  Clear
                </button>
              )}

              <button
                onClick={loadExpenses}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50 ml-auto"
              >
                <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
          </div>

          {/* Active Filter Chips */}
          {hasActiveFilters && (
            <div className="px-6 py-3 flex items-center gap-2 flex-wrap bg-gradient-to-r from-blue-50/50 to-purple-50/50 border-b border-blue-100/50">
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Filters</span>
              <span className="text-gray-300">•</span>
              {statusFilter !== "ALL" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-blue-200 rounded-full text-xs font-semibold text-blue-700 shadow-sm">
                  Status: {statusFilter}
                  <button onClick={() => setStatusFilter("ALL")} className="hover:bg-blue-100 rounded-full p-0.5">
                    <X size={12} />
                  </button>
                </span>
              )}
              {categoryFilter !== "ALL" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-purple-200 rounded-full text-xs font-semibold text-purple-700 shadow-sm">
                  Category: {CATEGORIES.find((c) => c.value === categoryFilter)?.label || categoryFilter}
                  <button onClick={() => setCategoryFilter("ALL")} className="hover:bg-purple-100 rounded-full p-0.5">
                    <X size={12} />
                  </button>
                </span>
              )}
              {searchQuery.trim() !== "" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-gray-200 rounded-full text-xs font-semibold text-gray-700 shadow-sm">
                  Search: "{searchQuery}"
                  <button onClick={() => setSearchQuery("")} className="hover:bg-gray-100 rounded-full p-0.5">
                    <X size={12} />
                  </button>
                </span>
              )}
              <span className="text-xs font-medium text-gray-500 ml-auto">
                {filteredExpenses.length} result{filteredExpenses.length !== 1 ? "s" : ""} found
              </span>
            </div>
          )}

          {/* Table */}
          {loading ? (
            <TableSkeleton />
          ) : error ? (
            <ErrorState message={error} onRetry={loadExpenses} />
          ) : filteredExpenses.length === 0 ? (
            <EmptyState
              hasFilters={hasActiveFilters}
              onReset={handleResetFilters}
              onCreateClick={() => setShowCreateModal(true)}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100">
                      <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <CalendarDays size={14} />
                          Date
                        </div>
                      </th>
                      <th className="text-left px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="text-left px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="text-right px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="text-center px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-center px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paginatedExpenses.map((expense) => (
                      <ExpenseRow
                        key={expense.id}
                        expense={expense}
                        approvingId={approvingId}
                        reimbursingId={reimbursingId}
                        deletingId={deletingId}
                        onApprove={handleApprove}
                        onReimburse={handleReimburse}
                        onEdit={setUpdatingExpense}
                        onDelete={handleDelete}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <p className="text-sm text-gray-500 font-medium">
                      Showing{" "}
                      <span className="text-gray-900 font-semibold">
                        {Math.min((currentPage - 1) * PAGE_SIZE + 1, filteredExpenses.length)}
                      </span>{" "}
                      to{" "}
                      <span className="text-gray-900 font-semibold">
                        {Math.min(currentPage * PAGE_SIZE, filteredExpenses.length)}
                      </span>{" "}
                      of{" "}
                      <span className="text-gray-900 font-semibold">{filteredExpenses.length}</span>{" "}
                      expenses
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-2.5 rounded-xl border-2 border-gray-200 hover:bg-white hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        <ChevronLeft size={16} className="text-gray-600" />
                      </button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum: number;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${
                                currentPage === pageNum
                                  ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/25"
                                  : "border-2 border-gray-200 text-gray-600 hover:bg-white hover:border-gray-300"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-2.5 rounded-xl border-2 border-gray-200 hover:bg-white hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        <ChevronRight size={16} className="text-gray-600" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-slide-in {
          animation: slideIn 0.3s ease-out;
        }
        .animate-scale-in {
          animation: scaleIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}