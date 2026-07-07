"use client";

import React from "react";
import {
  Search,
  Download,
  Eye,
  History,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileText,
} from "lucide-react";
import type { PayrollRecord } from "@/lib/api/payrollApi";

interface PayrollTableProps {
  records: PayrollRecord[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterDept: string;
  onFilterDeptChange: (dept: string) => void;
  filterStatus: string;
  onFilterStatusChange: (status: string) => void;
  currentPage: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onViewPayslip: (record: PayrollRecord) => void;
  onDownloadPayslip: (record: PayrollRecord) => void;
  onViewHistory: (record: PayrollRecord) => void;
}

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function StatusBadge({ status }: { status: PayrollRecord["paymentStatus"] }) {
  const styles = {
    PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    PROCESSING: "bg-blue-50 text-blue-700 border-blue-200",
  };

  const dots = {
    PAID: "bg-emerald-500",
    PENDING: "bg-amber-500",
    PROCESSING: "bg-blue-500",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${styles[status]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dots[status]}`} />
      {status === "PAID" ? "Paid" : status === "PENDING" ? "Pending" : "Processing"}
    </span>
  );
}

export default function PayrollTable({
  records,
  loading,
  searchQuery,
  onSearchChange,
  filterDept,
  onFilterDeptChange,
  filterStatus,
  onFilterStatusChange,
  currentPage,
  onPageChange,
  pageSize,
  onViewPayslip,
  onDownloadPayslip,
  onViewHistory,
}: PayrollTableProps) {
  // Get unique departments from records
  const departments = Array.from(
    new Set(records.map((r) => r.department).filter(Boolean))
  ).sort();

  // Filter records
  const filtered = records.filter((r) => {
    const matchSearch =
      searchQuery.trim() === "" ||
      r.employeeName.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      r.employeeEmail.toLowerCase().includes(searchQuery.trim().toLowerCase());
    const matchDept =
      filterDept === "all" ||
      r.department.toLowerCase() === filterDept.toLowerCase();
    const matchStatus =
      filterStatus === "all" || r.paymentStatus === filterStatus;
    return matchSearch && matchDept && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Filter Bar */}
      <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => {
              onSearchChange(e.target.value);
              onPageChange(1);
            }}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Department filter */}
        <select
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          value={filterDept}
          onChange={(e) => {
            onFilterDeptChange(e.target.value);
            onPageChange(1);
          }}
        >
          <option value="all">All Departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        {/* Status filter */}
        <select
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          value={filterStatus}
          onChange={(e) => {
            onFilterStatusChange(e.target.value);
            onPageChange(1);
          }}
        >
          <option value="all">All Status</option>
          <option value="PAID">Paid</option>
          <option value="PENDING">Pending</option>
          <option value="PROCESSING">Processing</option>
        </select>

        {/* Results count */}
        <span className="text-xs text-gray-400 font-medium ml-auto">
          {filtered.length} record{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/80">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Employee
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                Department
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Basic
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                Gross
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                Deductions
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Net Pay
              </th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2
                      size={28}
                      className="animate-spin text-blue-500"
                    />
                    <span className="text-sm text-gray-400">
                      Loading payroll records...
                    </span>
                  </div>
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <FileText size={32} className="text-gray-300" />
                    <span className="text-sm text-gray-400">
                      No payroll records found
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((record) => (
                <tr
                  key={record.id}
                  className="hover:bg-blue-50/30 transition-colors duration-150 cursor-pointer"
                  onClick={() => onViewPayslip(record)}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {record.employeeName
                          .split(" ")
                          .map((p) => p[0]?.toUpperCase() || "")
                          .join("")
                          .slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {record.employeeName}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {record.designation}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <span className="text-sm text-gray-600">
                      {record.department}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="text-sm font-medium text-gray-700">
                      {formatCurrency(record.basicSalary)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right hidden lg:table-cell">
                    <span className="text-sm text-gray-600">
                      {formatCurrency(record.grossEarnings)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right hidden lg:table-cell">
                    <span className="text-sm text-red-500">
                      -{formatCurrency(record.totalDeductions)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="text-sm font-bold text-gray-900">
                      {formatCurrency(record.netPay)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <StatusBadge status={record.paymentStatus} />
                  </td>
                  <td className="px-4 py-3.5">
                    <div
                      className="flex items-center justify-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => onViewPayslip(record)}
                        className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="View Payslip"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => onDownloadPayslip(record)}
                        className="p-2 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        title="Download PDF"
                      >
                        <Download size={16} />
                      </button>
                      <button
                        onClick={() => onViewHistory(record)}
                        className="p-2 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                        title="Salary History"
                      >
                        <History size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && filtered.length > 0 && (
        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-gray-500">
            Showing{" "}
            {Math.min((currentPage - 1) * pageSize + 1, filtered.length)} to{" "}
            {Math.min(currentPage * pageSize, filtered.length)} of{" "}
            {filtered.length} records
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} className="text-gray-600" />
            </button>
            {Array.from(
              { length: Math.min(5, totalPages) },
              (_, i) => i + 1
            ).map((page) => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === page
                    ? "bg-blue-600 text-white"
                    : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() =>
                onPageChange(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} className="text-gray-600" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
