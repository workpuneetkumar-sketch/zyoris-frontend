"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Download,
  Save,
  Trash2,
  Eye,
  RefreshCw,
  Calendar,
  Search,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
  BarChart3,
  PieChart,
  TrendingUp,
  Users,
  Building2,
  DollarSign,
  FileCheck,
  CreditCard,
  Megaphone,
} from "lucide-react";
import {
  ReportEntityType,
  ReportFilters,
  ReportData,
  fetchReportData,
  getColumnDisplayName,
  getEntityDisplayName,
} from "@/lib/api/reportsApi";

// ─── Types ──────────────────────────────────────────────────────────────

interface SavedReport {
  id: string;
  name: string;
  entityType: ReportEntityType;
  filters: ReportFilters;
  createdAt: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────

const formatDate = (date: string) => {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0];
};

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// ─── Entity Icons ──────────────────────────────────────────────────────

const EntityIcon = ({ type }: { type: ReportEntityType }) => {
  const icons = {
    LEADS: <Users className="w-5 h-5" />,
    DEALS: <DollarSign className="w-5 h-5" />,
    PROJECTS: <Building2 className="w-5 h-5" />,
    INVOICES: <FileCheck className="w-5 h-5" />,
    EXPENSES: <CreditCard className="w-5 h-5" />,
    CAMPAIGNS: <Megaphone className="w-5 h-5" />,
  };
  return icons[type] || <FileText className="w-5 h-5" />;
};

// ─── Main Component ────────────────────────────────────────────────────

export default function ReportsPage() {
  // ─── State ───────────────────────────────────────────────────────────

  const [entityType, setEntityType] = useState<ReportEntityType>("LEADS");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [showSavedReports, setShowSavedReports] = useState(false);
  const [reportName, setReportName] = useState("");
  const [savingReport, setSavingReport] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [isReportGenerated, setIsReportGenerated] = useState(false);

  // ─── Load saved reports from localStorage ──────────────────────────

  useEffect(() => {
    try {
      const stored = localStorage.getItem("savedReports");
      if (stored) {
        setSavedReports(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Error loading saved reports:", error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("savedReports", JSON.stringify(savedReports));
    } catch (error) {
      console.error("Error saving reports:", error);
    }
  }, [savedReports]);

  // ─── Generate Report ────────────────────────────────────────────────

  const generateReport = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const filters: ReportFilters = {
        entityType,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        search: searchQuery || undefined,
      };

      const data = await fetchReportData(filters);
      setReportData(data);
      setIsReportGenerated(true);
    } catch (err: any) {
      setError(err.message || "Failed to generate report");
      setReportData(null);
      setIsReportGenerated(false);
    } finally {
      setLoading(false);
    }
  }, [entityType, startDate, endDate, statusFilter, searchQuery]);

  // ─── Export Functions ──────────────────────────────────────────────

  const exportCSV = () => {
    if (!reportData || reportData.rows.length === 0) return;

    const headers = reportData.columns.map(getColumnDisplayName);
    const csvRows = [
      headers.join(","),
      ...reportData.rows.map((row) => 
        headers.map((h) => {
          const col = reportData.columns[headers.indexOf(h)];
          const value = row[col];
          const strValue = String(value || "");
          return strValue.includes(",") || strValue.includes('"') 
            ? `"${strValue.replace(/"/g, '""')}"` 
            : strValue;
        }).join(",")
      ),
    ];

    const csv = csvRows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${getEntityDisplayName(entityType)}_Report_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    if (!reportData || reportData.rows.length === 0) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to export PDF");
      return;
    }

    const headers = reportData.columns.map(getColumnDisplayName);
    const rows = reportData.rows;

    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${getEntityDisplayName(entityType)} Report</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; background: #f9fafb; }
          .report-container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
          .header { margin-bottom: 30px; border-bottom: 2px solid #f3f4f6; padding-bottom: 20px; }
          .header h1 { font-size: 28px; color: #111827; }
          .header .subtitle { color: #6b7280; font-size: 14px; margin-top: 8px; }
          .header .meta { display: flex; gap: 20px; flex-wrap: wrap; margin-top: 12px; font-size: 13px; color: #6b7280; }
          .header .meta span { background: #f3f4f6; padding: 4px 12px; border-radius: 20px; }
          .stats { display: flex; gap: 20px; margin-bottom: 24px; flex-wrap: wrap; }
          .stat-box { background: #f9fafb; padding: 12px 20px; border-radius: 12px; flex: 1; min-width: 120px; }
          .stat-box .label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
          .stat-box .value { font-size: 20px; font-weight: bold; color: #111827; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #f3f4f6; padding: 12px; text-align: left; font-size: 12px; font-weight: 600; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
          td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #374151; }
          tr:hover { background: #f9fafb; }
          .badge { display: inline-block; padding: 2px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; }
          .badge-DONE, .badge-PAID, .badge-APPROVED, .badge-ACTIVE, .badge-COMPLETED, .badge-CLOSED_WON, .badge-CONVERTED, .badge-REIMBURSED { background: #d1fae5; color: #065f46; }
          .badge-PENDING, .badge-SENT, .badge-PROCESSING, .badge-PAUSED { background: #fef3c7; color: #92400e; }
          .badge-FAILED, .badge-OVERDUE, .badge-CANCELLED, .badge-CLOSED_LOST, .badge-LOST { background: #fee2e2; color: #991b1b; }
          .badge-DRAFT, .badge-NEW { background: #f3f4f6; color: #374151; }
          .badge-CONTACTED { background: #dbeafe; color: #1e40af; }
          .badge-QUALIFIED { background: #ede9fe; color: #5b21b6; }
          .badge-PROPOSAL { background: #e0e7ff; color: #3730a3; }
          .badge-NEGOTIATION { background: #fef3c7; color: #92400e; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #9ca3af; }
        </style>
      </head>
      <body>
        <div class="report-container">
          <div class="header">
            <h1>${getEntityDisplayName(entityType)} Report</h1>
            <div class="subtitle">Generated on ${new Date().toLocaleString()}</div>
            <div class="meta">
              ${statusFilter !== "ALL" ? `<span>Status: ${statusFilter}</span>` : ""}
              ${searchQuery ? `<span>Search: "${searchQuery}"</span>` : ""}
              ${startDate && endDate ? `<span>Date Range: ${formatDate(startDate)} to ${formatDate(endDate)}</span>` : ""}
            </div>
          </div>

          <div class="stats">
            <div class="stat-box"><div class="label">Total Records</div><div class="value">${reportData.total}</div></div>
            <div class="stat-box"><div class="label">Entity</div><div class="value">${getEntityDisplayName(entityType)}</div></div>
            <div class="stat-box"><div class="label">Generated</div><div class="value">${new Date().toLocaleDateString()}</div></div>
          </div>

          <table>
            <thead>
              <tr>
                ${headers.map(h => `<th>${h}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${rows.map((row) => `
                <tr>
                  ${reportData.columns.map((col) => {
                    const value = row[col];
                    const displayValue = value !== undefined && value !== null ? value : "—";
                    if (col === "status" && typeof displayValue === "string" && displayValue !== "—") {
                      return `<td><span class="badge badge-${displayValue.replace(/ /g, "_")}">${displayValue}</span></td>`;
                    }
                    return `<td>${displayValue}</td>`;
                  }).join("")}
                </tr>
              `).join("")}
            </tbody>
          </table>

          <div class="footer">
            Generated from Zyoris Reports • ${new Date().toLocaleDateString()}
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  // ─── Save Report ─────────────────────────────────────────────────────

  const saveCurrentReport = () => {
    if (!reportData || reportData.rows.length === 0) {
      alert("Please generate a report first");
      return;
    }

    const name = reportName.trim() || `${getEntityDisplayName(entityType)} Report ${new Date().toLocaleDateString()}`;

    const newReport: SavedReport = {
      id: generateId(),
      name,
      entityType,
      filters: {
        entityType,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        search: searchQuery || undefined,
      },
      createdAt: new Date().toISOString(),
    };

    setSavedReports((prev) => [newReport, ...prev]);
    setReportName("");
    setSavingReport(false);
    alert("Report saved successfully!");
  };

  const deleteSavedReport = (id: string) => {
    if (confirm("Delete this saved report?")) {
      setSavedReports((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const loadSavedReport = (report: SavedReport) => {
    setEntityType(report.entityType);
    setStartDate(report.filters.startDate || "");
    setEndDate(report.filters.endDate || "");
    setStatusFilter(report.filters.status || "ALL");
    setSearchQuery(report.filters.search || "");
    setShowSavedReports(false);
    setTimeout(() => generateReport(), 100);
  };

  // ─── Status Options ──────────────────────────────────────────────────

  const getStatusOptions = () => {
    const statusMap: Record<ReportEntityType, string[]> = {
      LEADS: ["ALL", "NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"],
      DEALS: ["ALL", "NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "CLOSED_WON", "CLOSED_LOST"],
      PROJECTS: ["ALL", "PENDING", "ACTIVE", "COMPLETED", "CANCELLED"],
      INVOICES: ["ALL", "DRAFT", "SENT", "PAID", "OVERDUE"],
      EXPENSES: ["ALL", "PENDING", "APPROVED", "REIMBURSED"],
      CAMPAIGNS: ["ALL", "DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"],
    };
    return statusMap[entityType] || ["ALL"];
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      "DONE": "bg-emerald-100 text-emerald-700",
      "PAID": "bg-emerald-100 text-emerald-700",
      "APPROVED": "bg-emerald-100 text-emerald-700",
      "COMPLETED": "bg-emerald-100 text-emerald-700",
      "CLOSED_WON": "bg-emerald-100 text-emerald-700",
      "CONVERTED": "bg-emerald-100 text-emerald-700",
      "REIMBURSED": "bg-emerald-100 text-emerald-700",
      "PENDING": "bg-amber-100 text-amber-700",
      "SENT": "bg-blue-100 text-blue-700",
      "PROCESSING": "bg-amber-100 text-amber-700",
      "ACTIVE": "bg-blue-100 text-blue-700",
      "PAUSED": "bg-amber-100 text-amber-700",
      "FAILED": "bg-red-100 text-red-700",
      "OVERDUE": "bg-red-100 text-red-700",
      "CANCELLED": "bg-red-100 text-red-700",
      "CLOSED_LOST": "bg-red-100 text-red-700",
      "LOST": "bg-red-100 text-red-700",
      "DRAFT": "bg-gray-100 text-gray-700",
      "NEW": "bg-gray-100 text-gray-700",
      "CONTACTED": "bg-blue-50 text-blue-700",
      "QUALIFIED": "bg-purple-50 text-purple-700",
      "PROPOSAL": "bg-indigo-50 text-indigo-700",
      "NEGOTIATION": "bg-amber-50 text-amber-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-xl">
              <BarChart3 className="w-7 h-7 text-indigo-600" />
            </div>
            Reports
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Generate and manage reports from your data
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowSavedReports(!showSavedReports)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
          >
            <Eye size={16} />
            Saved Reports
            <span className="ml-1 px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full text-xs font-semibold">
              {savedReports.length}
            </span>
            <ChevronDown size={16} className={`transition-transform ${showSavedReports ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Saved Reports Panel */}
      {showSavedReports && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 mb-6 animate-slide-down">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Save size={18} className="text-indigo-600" />
              Saved Reports
            </h3>
            <button
              onClick={() => setShowSavedReports(false)}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          {savedReports.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">No saved reports yet.</p>
              <p className="text-xs text-gray-400">Generate a report and save it!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {savedReports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl border border-gray-100 transition-all hover:border-indigo-200 group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <EntityIcon type={report.entityType} />
                      <p className="font-medium text-sm text-gray-900 truncate">{report.name}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {getEntityDisplayName(report.entityType)} • {new Date(report.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => loadSavedReport(report)}
                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Load Report"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      onClick={() => deleteSavedReport(report.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Report Builder */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <Filter size={18} className="text-indigo-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Report Builder</h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Entity Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Entity Type
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <EntityIcon type={entityType} />
              </div>
              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value as ReportEntityType)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white appearance-none cursor-pointer hover:border-gray-400 transition-colors"
              >
                <option value="LEADS">Leads</option>
                <option value="DEALS">Deals</option>
                <option value="PROJECTS">Projects</option>
                <option value="INVOICES">Invoices</option>
                <option value="EXPENSES">Expenses</option>
                <option value="CAMPAIGNS">Campaigns</option>
              </select>
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white appearance-none cursor-pointer hover:border-gray-400 transition-colors"
            >
              {getStatusOptions().map((status) => (
                <option key={status} value={status}>
                  {status === "ALL" ? "All Status" : status}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Start Date
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Calendar size={16} />
              </div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white hover:border-gray-400 transition-colors"
              />
            </div>
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              End Date
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Calendar size={16} />
              </div>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white hover:border-gray-400 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Search + Actions */}
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generateReport()}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white hover:border-gray-400 transition-colors"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={generateReport}
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Filter size={16} />
              )}
              Generate Report
            </button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 animate-fade-in">
          <div className="flex items-center gap-2 text-red-700">
            <X size={20} />
            <p className="text-sm font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="inline-block p-4 bg-indigo-50 rounded-full mb-4">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
          <p className="text-gray-700 font-medium">Generating report...</p>
          <p className="text-sm text-gray-400 mt-1">Please wait while we fetch your data</p>
        </div>
      )}

      {/* Preview Table */}
      {!loading && reportData && reportData.rows.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in">
          {/* Table Header with Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 border-b border-gray-200 gap-3 bg-gray-50/50">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <FileText size={18} className="text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  {getEntityDisplayName(entityType)} Report
                  <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {reportData.total} records
                  </span>
                </h3>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Save Report */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Report name..."
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-36"
                />
                <button
                  onClick={saveCurrentReport}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors"
                >
                  <Save size={15} />
                  Save
                </button>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1 bg-white">
                <button
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === "table" ? "bg-indigo-100 text-indigo-600" : "text-gray-400 hover:text-gray-600"}`}
                  title="Table View"
                >
                  <LayoutGrid size={15} />
                </button>
              </div>

              {/* Export Buttons */}
              <button
                onClick={exportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
              >
                <Download size={15} />
                CSV
              </button>
              <button
                onClick={exportPDF}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors"
              >
                <Download size={15} />
                PDF
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200">
                  {reportData.columns.map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {getColumnDisplayName(col)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reportData.rows.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                    {reportData.columns.map((col) => {
                      const value = row[col];
                      const displayValue = value !== undefined && value !== null ? value : "—";
                      
                      if (col === "status" && typeof displayValue === "string" && displayValue !== "—") {
                        return (
                          <td key={col} className="px-4 py-3 text-sm">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(displayValue)}`}>
                              {displayValue}
                            </span>
                          </td>
                        );
                      }

                      return (
                        <td key={col} className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate" title={displayValue}>
                          {displayValue}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-gray-50/50 text-sm text-gray-500">
            <span>Showing {reportData.rows.length} of {reportData.total} records</span>
            <span className="text-xs">
              {getEntityDisplayName(entityType)} • Generated {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !isReportGenerated && !reportData && !error && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-16 text-center">
          <div className="inline-block p-4 bg-gray-50 rounded-full mb-4">
            <BarChart3 className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Report Generated</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Configure your filters above and click <strong>"Generate Report"</strong> to see your data.
          </p>
        </div>
      )}
    </div>
  );
}