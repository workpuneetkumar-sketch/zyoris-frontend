"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ArrowLeft, Banknote, CalendarRange, RefreshCw, AlertCircle, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import PayrollStatsCards from "@/components/hr/payroll/PayrollStatsCards";
import PayrollTable from "@/components/hr/payroll/PayrollTable";
import SalaryHistoryPanel from "@/components/hr/payroll/SalaryHistoryPanel";
import PayslipPreviewModal from "@/components/hr/payroll/PayslipPreviewModal";

import {
  type PayrollRecord,
  type Payslip,
  type SalaryHistoryEntry,
  fetchPayslips,
  fetchPayslipById,
  downloadPayslipPdf,
  deriveSalaryHistory,
} from "@/lib/api/payrollApi";

function formatPeriodLabel(monthStr: string): string {
  const [y, m] = monthStr.split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const idx = parseInt(m, 10) - 1;
  return `${names[idx] || m} ${y}`;
}

export default function PayrollPage() {
  // ── State ──────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [records, setRecords] = useState<PayrollRecord[]>([]);

  // Filters
  const [selectedPeriod, setSelectedPeriod] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modals / Panels
  const [payslipModalOpen, setPayslipModalOpen] = useState(false);
  const [activePayslip, setActivePayslip] = useState<Payslip | null>(null);
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false);
  const [historyEmployee, setHistoryEmployee] = useState<{
    name: string;
    designation: string;
    department: string;
  } | null>(null);
  const [salaryHistory, setSalaryHistory] = useState<SalaryHistoryEntry[]>([]);

  // ── Load Data ──────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPermissionDenied(false);
    try {
      const data = await fetchPayslips();
      setRecords(data);
    } catch (err: any) {
      console.error("Failed to load payroll data:", err);
      const msg = err?.message || "Failed to load payroll data";
      if (msg.toLowerCase().includes("forbidden") || msg.toLowerCase().includes("permission") || err?.response?.status === 403) {
        setPermissionDenied(true);
      }
      setError(msg);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const availablePeriods = useMemo(() => {
    const periods = Array.from(new Set(records.map((r) => r.month).filter(Boolean))).sort().reverse();
    return periods;
  }, [records]);

  const periodRecords = useMemo(() => {
    if (selectedPeriod === "ALL") return records;
    return records.filter((r) => r.month === selectedPeriod);
  }, [records, selectedPeriod]);

  // ── Payslip Preview ───────────────────────────────────
  const handleViewPayslip = async (record: PayrollRecord) => {
    try {
      const payslip = await fetchPayslipById(record.id);
      setActivePayslip(payslip);
      setPayslipModalOpen(true);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load payslip details");
    }
  };

  // ── Download PDF ──────────────────────────────────────
  const handleDownloadPayslip = async (record: PayrollRecord) => {
    try {
      const fileName = `Payslip_${record.employeeName.replace(/\s+/g, "_")}_${record.month}.pdf`;
      await downloadPayslipPdf(record.id, fileName, record.pdfUrl);
      toast.success("Payslip download started");
    } catch (err: any) {
      toast.error(err?.message || "Failed to download payslip");
    }
  };

  // ── Salary History ────────────────────────────────────
  const handleViewHistory = (record: PayrollRecord) => {
    setHistoryEmployee({
      name: record.employeeName,
      designation: record.designation,
      department: record.department,
    });
    setSalaryHistory(deriveSalaryHistory(records, record.employeeId));
    setHistoryPanelOpen(true);
  };

  // ── Compute Stats (scoped to selected period) ─────────
  const totalPayroll = periodRecords.reduce((sum, r) => sum + r.grossEarnings, 0);
  const employeesPaid = periodRecords.filter(
    (r) => r.paymentStatus === "PAID"
  ).length;
  const pendingPayslips = periodRecords.filter(
    (r) => r.paymentStatus === "PENDING" || r.paymentStatus === "PROCESSING"
  ).length;
  const averageSalary =
    periodRecords.length > 0
      ? Math.round(
          periodRecords.reduce((sum, r) => sum + r.netPay, 0) / periodRecords.length
        )
      : 0;
  const netDisbursed = periodRecords
    .filter((r) => r.paymentStatus === "PAID")
    .reduce((sum, r) => sum + r.netPay, 0);

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="px-4 sm:px-6 py-6 max-w-[1400px] mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/hr"
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft size={18} className="text-gray-500" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Banknote size={22} className="text-blue-600" />
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Payroll Management
                </h1>
              </div>
              <p className="text-sm text-gray-500 mt-0.5 ml-[30px]">
                Manage employee salaries, generate payslips and track payment
                history.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-auto">
            {/* Pay Period Selector */}
            <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm text-gray-700">
              <CalendarRange size={15} className="text-gray-400" />
              <select
                aria-label="Select pay period"
                value={selectedPeriod}
                onChange={(e) => {
                  setSelectedPeriod(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent font-medium focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Pay Periods</option>
                {availablePeriods.map((p) => (
                  <option key={p} value={p}>
                    {formatPeriodLabel(p)}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {permissionDenied ? (
          <div className="bg-white rounded-2xl border border-amber-200 p-12 text-center">
            <ShieldAlert size={40} className="text-amber-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-gray-900 mb-1">Access Restricted</h2>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              You do not have permission to view payroll and salary records. Contact an administrator if you need access.
            </p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl border border-red-200 p-12 text-center">
            <AlertCircle size={40} className="text-red-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-gray-900 mb-1">Failed to Load Payroll</h2>
            <p className="text-sm text-gray-500 mb-5">{error}</p>
            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl"
            >
              <RefreshCw size={15} /> Try Again
            </button>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <PayrollStatsCards
              totalPayroll={totalPayroll}
              employeesPaid={employeesPaid}
              pendingPayslips={pendingPayslips}
              averageSalary={averageSalary}
              netDisbursed={netDisbursed}
              totalEmployees={periodRecords.length}
            />

            {/* Payroll Table */}
            <PayrollTable
              records={periodRecords}
              loading={loading}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              filterDept={filterDept}
              onFilterDeptChange={setFilterDept}
              filterStatus={filterStatus}
              onFilterStatusChange={setFilterStatus}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              pageSize={pageSize}
              onViewPayslip={handleViewPayslip}
              onDownloadPayslip={handleDownloadPayslip}
              onViewHistory={handleViewHistory}
            />
          </>
        )}
      </div>

      {/* Payslip Preview Modal */}
      <PayslipPreviewModal
        isOpen={payslipModalOpen}
        onClose={() => {
          setPayslipModalOpen(false);
          setActivePayslip(null);
        }}
        payslip={activePayslip}
      />

      {/* Salary History Panel */}
      <SalaryHistoryPanel
        isOpen={historyPanelOpen}
        onClose={() => {
          setHistoryPanelOpen(false);
          setHistoryEmployee(null);
          setSalaryHistory([]);
        }}
        employeeName={historyEmployee?.name || ""}
        designation={historyEmployee?.designation || ""}
        department={historyEmployee?.department || ""}
        history={salaryHistory}
      />
    </div>
  );
}
