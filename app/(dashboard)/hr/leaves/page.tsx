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
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaves();
  }, []);

  // ── Stats (from full data, unaffected by filters) ──
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

  // ── Dynamic department list from actual data ──────────────
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
      name.toLowerCase().includes(searchQuery.trim().toLowerCase());

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

    return matchSearch && matchTab && matchDept && matchType && matchStatus;
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
      console.error(e);
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
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const resetFilters = () => {
    setFilterDept("all");
    setFilterType("all");
    setFilterStatus("all");
    setSearchQuery("");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    filterDept !== "all" ||
    filterType !== "all" ||
    filterStatus !== "all" ||
    searchQuery.trim() !== "";

  // ── Tabs with counts ─────────────────────────────────────
  const TABS: { key: TabKey; label: string; count?: number }[] = [
    { key: "all", label: "All Requests", count: total },
    { key: "pending", label: "Pending Approval", count: pending },
    { key: "approved", label: "Approved", count: approved },
    { key: "rejected", label: "Rejected", count: rejected },
  ];

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50/50">
      {showModal && (
        <ApplyLeaveModal
          onClose={() => setShowModal(false)}
          onSuccess={loadLeaves}
        />
      )}

      <div className="px-6 py-6 max-w-[1400px] mx-auto">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage employee leave requests and track balances.
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
              <CalendarDays size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Total Leave Requests</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">{total}</p>
              <p className="text-xs text-green-600 font-medium mt-0.5">All time</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center shrink-0">
              <Clock size={20} className="text-yellow-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Pending Approval</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">{pending}</p>
              <p className="text-xs text-yellow-600 font-medium mt-0.5">
                {total > 0 ? ((pending / total) * 100).toFixed(1) : 0}% of total
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} className="text-green-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Approved</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">{approved}</p>
              <p className="text-xs text-green-600 font-medium mt-0.5">
                {total > 0 ? ((approved / total) * 100).toFixed(1) : 0}% of total
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
              <XCircle size={20} className="text-red-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Rejected</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">{rejected}</p>
              <p className="text-xs text-red-500 font-medium mt-0.5">
                {total > 0 ? ((rejected / total) * 100).toFixed(1) : 0}% of total
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
              <Plane size={20} className="text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Upcoming Leaves</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">{upcoming}</p>
              <p className="text-xs text-purple-500 font-medium mt-0.5">Next 30 days</p>
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Filter Bar */}
          <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
            <select
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={filterDept}
              onChange={(e) => { setFilterDept(e.target.value); setCurrentPage(1); }}
            >
              <option value="all">All Departments</option>
              {allDepartments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <select
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
            >
              <option value="all">All Leave Types</option>
              <option value="SICK">Sick Leave</option>
              <option value="CASUAL">Casual Leave</option>
              <option value="EARNED">Earned Leave</option>
            </select>

            <select
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50"
              value={activeTab !== "all" ? activeTab.toUpperCase() : filterStatus}
              disabled={activeTab !== "all"}
              onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
              >
                <X size={14} />
                Clear
              </button>
            )}

            <div className="ml-auto flex items-center gap-3">
              <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                <SlidersHorizontal size={15} />
                More Filters
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                <Plus size={15} />
                Apply Leave
              </button>
            </div>
          </div>

          {/* Tabs + Search Row */}
          <div className="px-5 pt-3 flex items-center justify-between flex-wrap gap-3 border-b border-gray-100">
            <div className="flex items-center gap-1">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key);
                    setCurrentPage(1);
                    setFilterStatus("all");
                  }}
                  className={`px-4 py-2.5 text-sm font-medium transition-colors relative flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === tab.key
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span
                      className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                        activeTab === tab.key
                          ? "bg-blue-100 text-blue-600"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 pb-2">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by employee name..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
                />
              </div>
              <button
                onClick={handleExport}
                disabled={exporting || filtered.length === 0}
                className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Download size={15} />
                )}
                {exporting ? "Exporting..." : "Export"}
              </button>
            </div>
          </div>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="px-5 py-2.5 flex items-center gap-2 flex-wrap border-b border-gray-50 bg-blue-50/40">
              <span className="text-xs text-gray-500 font-medium">Active filters:</span>
              {filterDept !== "all" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs text-gray-600">
                  Dept: {filterDept}
                  <button onClick={() => { setFilterDept("all"); setCurrentPage(1); }}>
                    <X size={11} className="text-gray-400 hover:text-gray-600" />
                  </button>
                </span>
              )}
              {filterType !== "all" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs text-gray-600">
                  Type: {LEAVE_TYPE_LABEL[filterType] || filterType}
                  <button onClick={() => { setFilterType("all"); setCurrentPage(1); }}>
                    <X size={11} className="text-gray-400 hover:text-gray-600" />
                  </button>
                </span>
              )}
              {filterStatus !== "all" && activeTab === "all" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs text-gray-600">
                  Status: {filterStatus}
                  <button onClick={() => { setFilterStatus("all"); setCurrentPage(1); }}>
                    <X size={11} className="text-gray-400 hover:text-gray-600" />
                  </button>
                </span>
              )}
              {searchQuery.trim() !== "" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs text-gray-600">
                  Search: "{searchQuery}"
                  <button onClick={() => { setSearchQuery(""); setCurrentPage(1); }}>
                    <X size={11} className="text-gray-400 hover:text-gray-600" />
                  </button>
                </span>
              )}
              <span className="text-xs text-blue-600 font-medium ml-1">
                {filtered.length} result{filtered.length !== 1 ? "s" : ""}
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

          {/* Pagination */}
          {!loading && filtered.length > 0 && (
            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between flex-wrap gap-3">
              <p className="text-sm text-gray-500">
                Showing {Math.min((currentPage - 1) * pageSize + 1, filtered.length)} to{" "}
                {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} requests
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} className="text-gray-600" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === page
                          ? "bg-blue-600 text-white"
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
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={16} className="text-gray-600" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}