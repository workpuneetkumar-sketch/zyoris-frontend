// app/(dashboard)/finance/invoices/page.tsx

"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Plus,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
} from "lucide-react";
import {
  getInvoices,
  updateInvoice,
  Invoice,
} from "@/lib/api/finance/invoicesApi";
import { CreateInvoiceModal, InvoiceDetailModal } from "@/components/finance/invoices/InvoiceModals";
import { StatsCards } from "@/components/finance/invoices/InvoiceStats";
import { InvoiceTable } from "@/components/finance/invoices/InvoiceTable";
import * as XLSX from "xlsx";

// ── Types ─────────────────────────────────────────────────

type StatusFilter = "ALL" | "DRAFT" | "SENT" | "PAID" | "OVERDUE";

interface ToastMessage {
  type: "success" | "error" | "info";
  message: string;
}

// ── Toast Component ──────────────────────────────────────

function Toast({ toast, onClose }: { toast: ToastMessage; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getIcon = () => {
    if (toast.type === "success") return <CheckCircle2 size={18} className="text-green-600" />;
    if (toast.type === "error") return <XCircle size={18} className="text-red-600" />;
    return <AlertCircle size={18} className="text-blue-600" />;
  };

  const getStyles = () => {
    if (toast.type === "success") return "bg-green-50 border-green-200 text-green-800";
    if (toast.type === "error") return "bg-red-50 border-red-200 text-red-800";
    return "bg-blue-50 border-blue-200 text-blue-800";
  };

  return (
    <div
      className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg border ${getStyles()} animate-slide-in`}
    >
      <div className="w-8 h-8 rounded-full bg-white/50 flex items-center justify-center">
        {getIcon()}
      </div>
      <p className="text-sm font-medium">{toast.message}</p>
      <button onClick={onClose} className="ml-2 p-1 hover:bg-black/5 rounded-lg transition-colors">
        <X size={14} />
      </button>
    </div>
  );
}

// ── Main Page Component ──────────────────────────────────

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: any = {};
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

  const handleCreateSuccess = (newInvoice: Invoice) => { 
    setInvoices(prev => [newInvoice, ...prev]); 
    setToast({ type: "success", message: "Invoice created successfully!" }); 
  };

  const handleStatusChange = () => { 
    loadInvoices(); 
    setToast({ type: "success", message: "Invoice status updated!" }); 
  };

  const handleStatusUpdate = async (id: string, newStatus: "SENT" | "PAID") => {
    try {
      await updateInvoice(id, { status: newStatus });
      loadInvoices();
      setToast({ type: "success", message: `Invoice marked as ${newStatus}` });
    } catch (err: any) {
      setToast({ type: "error", message: err.message });
    }
  };

  const handleDownloadPDF = async (id: string) => {
    try {
      const { downloadInvoicePdf } = await import("@/lib/api/finance/invoicesApi");
      await downloadInvoicePdf(id);
    } catch (err: any) {
      setToast({ type: "error", message: err.message || "Failed to download PDF" });
    }
  };

  const handleExportExcel = () => {
    if (invoices.length === 0) {
      setToast({ type: "error", message: "No data to export" });
      return;
    }
    
    const formatDate = (dateStr: string): string => {
      if (!dateStr) return "—";
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      });
    };

    const exportData = invoices.map(inv => ({ 
      "Invoice #": inv.invoiceNumber, 
      "Client": inv.clientName, 
      "Amount": inv.totalAmount, 
      "Status": inv.status, 
      "Due Date": formatDate(inv.dueDate) 
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invoices");
    XLSX.writeFile(wb, `Invoices_${new Date().toISOString().split('T')[0]}.xlsx`);
    setToast({ type: "success", message: `Exported ${invoices.length} invoices successfully!` });
  };

  const handleResetFilters = () => { 
    setStatusFilter("ALL"); 
    setSearchQuery(""); 
    setCurrentPage(1); 
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
      {showCreateModal && <CreateInvoiceModal onClose={() => setShowCreateModal(false)} onSuccess={handleCreateSuccess} setToast={setToast} />}
      {selectedInvoiceId && <InvoiceDetailModal invoiceId={selectedInvoiceId} onClose={() => setSelectedInvoiceId(null)} onStatusChange={handleStatusChange} setToast={setToast} />}

      <div className="px-6 py-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage and track all your invoices</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-white transition-all">
              <FileSpreadsheet size={16} className="text-green-600" /> Export
            </button>
            <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-all">
              <Plus size={16} /> Create Invoice
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {!loading && !error && <StatsCards invoices={invoices} />}

        {/* Invoice Table */}
        <InvoiceTable
          invoices={invoices}
          loading={loading}
          error={error}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          currentPage={currentPage}
          onSearchChange={setSearchQuery}
          onStatusFilterChange={setStatusFilter}
          onPageChange={setCurrentPage}
          onResetFilters={handleResetFilters}
          onRefresh={loadInvoices}
          onViewInvoice={setSelectedInvoiceId}
          onDownloadPDF={handleDownloadPDF}
          onStatusUpdate={handleStatusUpdate}
          onCreateClick={() => setShowCreateModal(true)}
          onExportExcel={handleExportExcel}
        />
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}