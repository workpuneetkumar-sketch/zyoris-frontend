"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Banknote, CalendarRange } from "lucide-react";
import Link from "next/link";

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

export default function PayrollPage() {
  // ── State ──────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<PayrollRecord[]>([]);

  // Filters
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
    try {
      const data = await fetchPayslips();
      setRecords(data);
    } catch (error) {
      console.error("Failed to load payroll data:", error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Payslip Preview ───────────────────────────────────
  const handleViewPayslip = async (record: PayrollRecord) => {
    try {
      const payslip = await fetchPayslipById(record.id);
      setActivePayslip(payslip);
    } catch (error) {
      console.error("Failed to load payslip:", error);
    }
    setPayslipModalOpen(true);
  };

  // ── Download PDF ──────────────────────────────────────
  const handleDownloadPayslip = async (record: PayrollRecord) => {
    try {
      const fileName = `Payslip_${record.employeeName.replace(/\s+/g, "_")}_${record.month}.pdf`;
      await downloadPayslipPdf(record.id, fileName, record.pdfUrl);
    } catch (error) {
      console.error("Failed to download payslip:", error);
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

  // ── Compute Stats ─────────────────────────────────────
  const totalPayroll = records.reduce((sum, r) => sum + r.grossEarnings, 0);
  const employeesPaid = records.filter(
    (r) => r.paymentStatus === "PAID"
  ).length;
  const pendingPayslips = records.filter(
    (r) => r.paymentStatus === "PENDING" || r.paymentStatus === "PROCESSING"
  ).length;
  const averageSalary =
    records.length > 0
      ? Math.round(
          records.reduce((sum, r) => sum + r.netPay, 0) / records.length
        )
      : 0;
  const netDisbursed = records
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
            {/* Month Selector (static for now) */}
            <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm text-gray-600">
              <CalendarRange size={15} className="text-gray-400" />
              <span className="font-medium">July 2026</span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <PayrollStatsCards
          totalPayroll={totalPayroll}
          employeesPaid={employeesPaid}
          pendingPayslips={pendingPayslips}
          averageSalary={averageSalary}
          netDisbursed={netDisbursed}
          totalEmployees={records.length}
        />

        {/* Payroll Table */}
        <PayrollTable
          records={records}
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
