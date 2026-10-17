"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock,
  Plane,
  Search,
  Download,
  Plus,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  fetchLeaves,
  approveLeave,
  rejectLeave,
  LeaveRequest,
} from "@/lib/api/hrApi";
import * as XLSX from "xlsx";
import ApplyLeaveModal from "@/components/hr/Leaves/ApplyLeaveModal";
import LeavesTable from "@/components/hr/Leaves/LeavesTable";

// ── Types ─────────────────────────────────────────────────

interface LeaveWithEmployee extends LeaveRequest {
  employee?: {
    id: string;
    department: string;
    user?: {
      name: string;
      email: string;
      designation?: string;
    };
  };
}

type TabKey = "all" | "pending" | "approved" | "rejected";

const LEAVE_TYPE_LABEL: Record<string, string> = {
  SICK: "Sick Leave",
  CASUAL: "Casual Leave",
  EARNED: "Earned Leave",
  ANNUAL: "Annual Leave",
  MATERNITY: "Maternity Leave",
  WORK_FROM_HOME: "Work From Home",
};

// ── Helpers ───────────────────────────────────────────────

function formatDateForExport(dateStr: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function calcDaysNumber(start: string, end: string) {
  if (!start || !end) return 0;
  return Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;
}

// ── Main Page ──────────────────────────────────────────────

export default function LeavesPage() {
  const [leaves, setLeaves] = useState<LeaveWithEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const pageSize = 10;

  const loadLeaves = async () => {
    setLoading(true);
    try {
      const data = await fetchLeaves();
      setLeaves(data as LeaveWithEmployee[]);
    } catch (e) {
      console.error("Failed to load leaves:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaves();
  }, []);

  // ── Stats (calculated from real database records) ──
  const total = leaves.length;
  const pending = leaves.filter((l) => l.status === "PENDING").length;
  const approved = leaves.filter((l) => l.status === "APPROVED").length;
  const rejected = leaves.filter((l) => l.status === "REJECTED").length;
  const upcoming = leaves.filter((l) => {
    const s = new Date(l.startDate);
    const now = new Date();
    const in30 = new Date();
    in30.setDate(now.getDate() + 30);
    return s >= now && s <= in30;
  }).length;

  // ── Dynamic department list from live database records ────
  const allDepartments = Array.from(
    new Set(
      leaves
        .map((l) => l.employee?.department)
        .filter((d): d is string => !!d && d.trim() !== "")
    )
  ).sort();

  // ── Filtering logic ───────────────────────────────────────
  const filtered = leaves.filter((l) => {
    const emp = l.employee;
    const name = emp?.user?.name || "";
    const dept = emp?.department || "";

    const matchSearch =
      searchQuery.trim() === "" ||
      name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      (l.reason && l.reason.toLowerCase().includes(searchQuery.trim().toLowerCase()));

    const matchTab =
      activeTab === "all" ||
      (activeTab === "pending" && l.status === "PENDING") ||
      (activeTab === "approved" && l.status === "APPROVED") ||
      (activeTab === "rejected" && l.status === "REJECTED");

    const matchDept =
      filterDept === "all" ||
      dept.toLowerCase() === filterDept.toLowerCase();

    const matchType = filterType === "all" || l.type === filterType;

    const matchStatus =
      activeTab !== "all" ||
      filterStatus === "all" ||
      l.status === filterStatus;

    const matchStartDate =
      !startDateFilter || new Date(l.startDate) >= new Date(startDateFilter);

    const matchEndDate =
      !endDateFilter || new Date(l.endDate) <= new Date(endDateFilter);

    return matchSearch && matchTab && matchDept && matchType && matchStatus && matchStartDate && matchEndDate;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // ── Export to Excel ───────────────────────────────────────
  const handleExport = () => {
    setExporting(true);
    try {
      const exportData = filtered.map((leave) => {
        const emp = leave.employee;
        const name = emp?.user?.name || "Unknown";
        const email = emp?.user?.email || "";
        const dept = emp?.department || "—";
        
        return {
          "Employee Name": name,
          "Email": email,
          "Department": dept,
          "Leave Type": LEAVE_TYPE_LABEL[leave.type] || leave.type,
          "Start Date": formatDateForExport(leave.startDate),
          "End Date": formatDateForExport(leave.endDate),
          "Duration (Days)": calcDaysNumber(leave.startDate, leave.endDate),
          "Reason": leave.reason || "—",
          "Status": leave.status,
          "Applied On": formatDateForExport(leave.createdAt),
          "Approved By": leave.approvedBy || "—",
          "Approved At": leave.approvedAt ? formatDateForExport(leave.approvedAt) : "—",
        };
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      
      ws['!cols'] = [
        { wch: 25 },
        { wch: 30 },
        { wch: 20 },
        { wch: 18 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 40 },
        { wch: 12 },
        { wch: 15 },
        { wch: 20 },
        { wch: 15 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Leave Requests");
      
      const fileName = `leave_requests_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setExporting(false);
    }
  };

  // ── Actions ───────────────────────────────────────────────
  const handleApprove = async (id: string) => {
    setActionLoading(id + "_approve");
    try {
      await approveLeave(id);
      await loadLeaves();
    } catch (e) {
      console.error("Failed to approve leave:", e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id + "_reject");
    try {
      await rejectLeave(id);
      await loadLeaves();
    } catch (e) {
      console.error("Failed to reject leave:", e);
    } finally {
      setActionLoading(null);
    }
  };

  const resetFilters = () => {
    setFilterDept("all");
    setFilterType("all");
    setFilterStatus("all");
    setStartDateFilter("");
    setEndDateFilter("");
    setSearchQuery("");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    filterDept !== "all" ||
    filterType !== "all" ||
    filterStatus !== "all" ||
    startDateFilter !== "" ||
    endDateFilter !== "" ||
    searchQuery.trim() !== "";

  // ── Tabs with counts ─────────────────────────────────────
  const TABS: { key: TabKey; label: string; count?: number }[] = [
    { key: "all", label: "All Requests", count: total },
    { key: "pending", label: "Pending Approval", count: pending },
    { key: "approved", label: "Approved", count: approved },
    { key: "rejected", label: "Rejected", count: rejected },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {showModal && (
        <ApplyLeaveModal
          onClose={() => setShowModal(false)}
          onSuccess={loadLeaves}
        />
      )}

      <div className="p-4 md:p-6 max-w-[1440px] mx-auto space-y-6">
        
        {/* Executive Header */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                <CalendarDays className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                Leave Management
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Live HR Pipeline
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500">
              Review employee leave applications, approve requests, and monitor team availability.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={loadLeaves}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 border border-gray-200 text-gray-700 text-xs sm:text-sm font-semibold rounded-xl transition-all disabled:opacity-60 cursor-pointer"
              title="Refresh leave requests"
            >
              <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? "animate-spin text-blue-600" : ""}`} />
              <span className="hidden sm:inline">{loading ? "Refreshing..." : "Refresh"}</span>
            </button>

            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:from-blue-800 active:to-indigo-800 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <Plus size={16} />
              <span>Apply Leave</span>
            </button>
          </div>
        </div>

        {/* 5 Sleek Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Total */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between min-h-[128px]">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Requests</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <CalendarDays size={16} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none">{total}</p>
              <p className="text-xs font-medium text-blue-600 mt-2">All Recorded Applications</p>
            </div>
          </div>

          {/* Pending Approval */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between min-h-[128px] hover:border-amber-200">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending Action</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Clock size={16} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none">{pending}</p>
              <p className="text-xs font-medium text-amber-700 mt-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>{total > 0 ? ((pending / total) * 100).toFixed(1) : 0}% requires review</span>
              </p>
            </div>
          </div>

          {/* Approved */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between min-h-[128px] hover:border-emerald-200">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Approved</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none">{approved}</p>
              <p className="text-xs font-medium text-emerald-600 mt-2">
                {total > 0 ? ((approved / total) * 100).toFixed(1) : 0}% of all requests
              </p>
            </div>
          </div>

          {/* Rejected */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between min-h-[128px] hover:border-rose-200">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Rejected</span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <XCircle size={16} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none">{rejected}</p>
              <p className="text-xs font-medium text-rose-600 mt-2">
                {total > 0 ? ((rejected / total) * 100).toFixed(1) : 0}% declined
              </p>
            </div>
          </div>

          {/* Upcoming Leaves */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between min-h-[128px] hover:border-purple-200">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Upcoming</span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Plane size={16} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none">{upcoming}</p>
              <p className="text-xs font-medium text-purple-600 mt-2">Next 30 days window</p>
            </div>
          </div>
        </div>

        {/* Primary Table Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          
          {/* Filter Bar Row */}
          <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
            <select
              className="px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-2xs"
              value={filterDept}
              onChange={(e) => { setFilterDept(e.target.value); setCurrentPage(1); }}
            >
              <option value="all">All Departments</option>
              {allDepartments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <select
              className="px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-2xs"
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
            >
              <option value="all">All Leave Types</option>
              <option value="SICK">Sick Leave</option>
              <option value="CASUAL">Casual Leave</option>
              <option value="EARNED">Earned Leave</option>
            </select>

            <select
              className="px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-2xs disabled:opacity-50"
              value={activeTab !== "all" ? activeTab.toUpperCase() : filterStatus}
              disabled={activeTab !== "all"}
              onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>

            {/* Functional More Filters Button */}
            <button
              onClick={() => setShowMoreFilters(!showMoreFilters)}
              className={`flex items-center gap-1.5 px-3.5 py-2 border rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                showMoreFilters || startDateFilter || endDateFilter
                  ? "bg-blue-50 text-blue-700 border-blue-200 shadow-2xs"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              <SlidersHorizontal size={14} />
              <span>{showMoreFilters ? "Hide Date Filters" : "Filter by Dates"}</span>
            </button>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              >
                <X size={13} />
                <span>Reset Filters</span>
              </button>
            )}

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={handleExport}
                disabled={exporting || filtered.length === 0}
                className="flex items-center gap-2 px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
                title="Download spreadsheet report"
              >
                {exporting ? (
                  <Loader2 size={14} className="animate-spin text-blue-600" />
                ) : (
                  <Download size={14} />
                )}
                <span>{exporting ? "Exporting..." : "Export Excel"}</span>
              </button>
            </div>
          </div>

          {/* Expandable Functional More Filters Drawer */}
          {showMoreFilters && (
            <div className="px-5 py-3.5 bg-gray-50/80 border-b border-gray-100 flex flex-wrap items-center gap-4 animate-in slide-in-from-top-2 duration-150">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-600">Start Date From:</span>
                <input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => { setStartDateFilter(e.target.value); setCurrentPage(1); }}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-600">End Date To:</span>
                <input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => { setEndDateFilter(e.target.value); setCurrentPage(1); }}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
              </div>

              {(startDateFilter || endDateFilter) && (
                <button
                  onClick={() => { setStartDateFilter(""); setEndDateFilter(""); setCurrentPage(1); }}
                  className="text-xs text-rose-600 hover:underline font-semibold"
                >
                  Clear Date Filters
                </button>
              )}
            </div>
          )}

          {/* Tabs + Quick Search Row */}
          <div className="px-4 pt-2 flex items-center justify-between flex-wrap gap-3 border-b border-gray-100">
            <div className="flex items-center gap-1 overflow-x-auto">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key);
                    setCurrentPage(1);
                    setFilterStatus("all");
                  }}
                  className={`px-4 py-2.5 text-xs font-bold transition-all relative flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                    activeTab === tab.key
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        activeTab === tab.key
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="pb-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search employee or reason..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="pl-8.5 pr-8 py-2 border border-gray-200 rounded-xl text-gray-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-56 sm:w-64 bg-white shadow-2xs"
                />
                {searchQuery && (
                  <button 
                    onClick={() => { setSearchQuery(""); setCurrentPage(1); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Active Filter Chips */}
          {hasActiveFilters && (
            <div className="px-5 py-2 flex items-center gap-2 flex-wrap border-b border-gray-100 bg-blue-50/30">
              <span className="text-[11px] text-gray-500 font-semibold">Active filters:</span>
              {filterDept !== "all" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700 shadow-2xs">
                  Dept: {filterDept}
                  <button onClick={() => { setFilterDept("all"); setCurrentPage(1); }}>
                    <X size={11} className="text-gray-400 hover:text-gray-600" />
                  </button>
                </span>
              )}
              {filterType !== "all" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700 shadow-2xs">
                  Type: {LEAVE_TYPE_LABEL[filterType] || filterType}
                  <button onClick={() => { setFilterType("all"); setCurrentPage(1); }}>
                    <X size={11} className="text-gray-400 hover:text-gray-600" />
                  </button>
                </span>
              )}
              {filterStatus !== "all" && activeTab === "all" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700 shadow-2xs">
                  Status: {filterStatus}
                  <button onClick={() => { setFilterStatus("all"); setCurrentPage(1); }}>
                    <X size={11} className="text-gray-400 hover:text-gray-600" />
                  </button>
                </span>
              )}
              {startDateFilter && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700 shadow-2xs">
                  From: {startDateFilter}
                  <button onClick={() => { setStartDateFilter(""); setCurrentPage(1); }}>
                    <X size={11} className="text-gray-400 hover:text-gray-600" />
                  </button>
                </span>
              )}
              {endDateFilter && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700 shadow-2xs">
                  To: {endDateFilter}
                  <button onClick={() => { setEndDateFilter(""); setCurrentPage(1); }}>
                    <X size={11} className="text-gray-400 hover:text-gray-600" />
                  </button>
                </span>
              )}
              {searchQuery.trim() !== "" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700 shadow-2xs">
                  Search: &quot;{searchQuery}&quot;
                  <button onClick={() => { setSearchQuery(""); setCurrentPage(1); }}>
                    <X size={11} className="text-gray-400 hover:text-gray-600" />
                  </button>
                </span>
              )}
              <span className="text-xs text-blue-600 font-bold ml-1">
                {filtered.length} request{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          {/* Table Component */}
          <LeavesTable
            leaves={paginated}
            loading={loading}
            actionLoading={actionLoading}
            onApprove={handleApprove}
            onReject={handleReject}
          />

          {/* Pagination Controls */}
          {!loading && filtered.length > 0 && (
            <div className="px-5 py-3.5 border-t border-gray-100 flex items-center justify-between flex-wrap gap-3">
              <p className="text-xs font-medium text-gray-500">
                Showing {Math.min((currentPage - 1) * pageSize + 1, filtered.length)} to{" "}
                {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} leave requests
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={15} className="text-gray-600" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                        currentPage === page
                          ? "bg-blue-600 text-white shadow-2xs"
                          : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={15} className="text-gray-600" />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}