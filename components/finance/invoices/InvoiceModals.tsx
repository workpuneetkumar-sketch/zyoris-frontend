"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { useConfirm } from "@/components/common/ConfirmProvider";
import StatusBadge from "./StatusBadge";
import {
  X,
  Plus,
  Send,
  Users,
  FileText,
  Trash2,
  XCircle,
  Loader2,
  Download,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Save,
  Banknote,
} from "lucide-react";
import {
  Invoice,
  CreateInvoiceData,
  createInvoice,
  updateInvoice,
  getInvoiceById,
  downloadInvoicePdf,
  generateInvoiceHTML,
  calculateInvoiceTotals,
  DEFAULT_GST_RATE,
} from "@/lib/api/finance/invoicesApi";

// ── Types ─────────────────────────────────────────────────

interface FormItem {
  description: string;
  quantity: string;
  price: string;
}

interface ToastMessage {
  type: "success" | "error" | "info";
  message: string;
}

// ── Constants ────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: any }> = {
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

// ── Helper Functions ─────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDateLong(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  });
}

function getDefaultDueDate(daysAhead = 15): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().split("T")[0];
}

// ── Create Invoice Modal ─────────────────────────────────

export function CreateInvoiceModal({
  onClose,
  onSuccess,
  setToast,
}: {
  onClose: () => void;
  onSuccess: (invoice: Invoice) => void;
  setToast: (toast: ToastMessage) => void;
}) {
  const requestConfirmation = useConfirm();
  const [form, setForm] = useState({
    clientName: "",
    clientEmail: "",
    clientAddress: "",
    dueDate: getDefaultDueDate(15),
    taxRate: String(DEFAULT_GST_RATE),
    notes: "",
  });
  const [items, setItems] = useState<FormItem[]>([
    { description: "", quantity: "1", price: "0" },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [loading, onClose]);

  const addItem = () => setItems([...items, { description: "", quantity: "1", price: "0" }]);
  const removeItem = (index: number) => items.length > 1 && setItems(items.filter((_, i) => i !== index));
  const updateItem = (index: number, field: keyof FormItem, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const parsedTaxRate = Math.max(0, Math.min(100, parseFloat(form.taxRate) || 0));
  const parsedItems = items.map((i) => ({
    quantity: parseFloat(i.quantity) || 0,
    price: parseFloat(i.price) || 0,
  }));
  const { subtotal, taxAmount: gstAmount, grandTotal } = calculateInvoiceTotals(parsedItems, parsedTaxRate);

  const handleSubmit = async (targetStatus: "DRAFT" | "SENT" = "DRAFT") => {
    setError("");
    if (!form.clientName.trim()) return setError("Please enter client name.");
    if (form.clientEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.clientEmail.trim())) {
      return setError("Please enter a valid client email address.");
    }
    if (!form.dueDate) return setError("Please select a due date.");
    const rawTax = parseFloat(form.taxRate);
    if (isNaN(rawTax) || rawTax < 0 || rawTax > 100) {
      return setError("GST percentage must be between 0 and 100.");
    }

    const validItems = items.filter((i) => i.description.trim());
    if (validItems.length === 0) {
      return setError("Please add at least one line item with a description.");
    }
    const invalidItem = items.find(
      (i) =>
        !i.description.trim() ||
        isNaN(parseFloat(i.quantity)) ||
        parseFloat(i.quantity) <= 0 ||
        isNaN(parseFloat(i.price)) ||
        parseFloat(i.price) < 0
    );
    if (invalidItem) {
      return setError("Every line item must have a description, quantity > 0, and unit price ≥ 0.");
    }

    if (targetStatus === "SENT") {
      const ok = await requestConfirmation({
        title: "Create & Issue Invoice",
        message: `Issue this invoice for ${formatCurrency(grandTotal)} (incl. ${parsedTaxRate}% GST) to ${form.clientName.trim()} immediately?`,
        confirmText: "Create & Issue",
        variant: "primary",
      });
      if (!ok) return;
    }

    setLoading(true);
    try {
      const invoiceData: CreateInvoiceData = {
        clientName: form.clientName.trim(),
        clientEmail: form.clientEmail.trim() || undefined,
        clientAddress: form.clientAddress.trim() || undefined,
        dueDate: form.dueDate,
        taxRate: parsedTaxRate,
        status: targetStatus,
        items: items.map((i) => ({
          description: i.description.trim(),
          quantity: parseFloat(i.quantity) || 1,
          price: parseFloat(i.price) || 0,
        })),
        notes: form.notes.trim() || undefined,
      };
      const newInvoice = await createInvoice(invoiceData);
      onSuccess(newInvoice);
      onClose();
    } catch (err: any) {
      const msg = err?.message || "Failed to create invoice";
      setError(msg);
      setToast({ type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="create-invoice-title">
      <div className="absolute inset-0 bg-black/50" onClick={() => !loading && onClose()} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Fixed Header */}
        <div className="bg-blue-600 px-6 py-4 rounded-t-xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 id="create-invoice-title" className="text-xl font-semibold text-white">Create New Invoice</h2>
            <button onClick={() => !loading && onClose()} disabled={loading} className="p-1 hover:bg-white/10 rounded-lg transition-colors" aria-label="Close modal">
              <X size={20} className="text-white" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <XCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <h3 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Users size={16} className="text-gray-700" />
              Client Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Client Name *</label>
                <input 
                  type="text" 
                  placeholder="Enter client or company name" 
                  value={form.clientName} 
                  onChange={(e) => setForm({ ...form, clientName: e.target.value })} 
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-800 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Client Email</label>
                <input 
                  type="email" 
                  placeholder="billing@client.com" 
                  value={form.clientEmail} 
                  onChange={(e) => setForm({ ...form, clientEmail: e.target.value })} 
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-800 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Client Address</label>
                <textarea 
                  rows={2} 
                  placeholder="Billing address (optional)" 
                  value={form.clientAddress} 
                  onChange={(e) => setForm({ ...form, clientAddress: e.target.value })} 
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-800 text-sm resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Due Date *</label>
                <input 
                  type="date" 
                  value={form.dueDate} 
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })} 
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-800 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">GST / Tax (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={form.taxRate}
                  onChange={(e) => setForm({ ...form, taxRate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-800 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-md font-semibold text-gray-900 flex items-center gap-2">
                <FileText size={16} className="text-gray-700" />
                Invoice Line Items
              </h3>
              <button 
                type="button"
                onClick={addItem} 
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-all"
              >
                <Plus size={14} /> Add Item
              </button>
            </div>
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="flex flex-wrap sm:flex-nowrap gap-2 items-center p-3 bg-gray-50 rounded-lg">
                  <input 
                    type="text" 
                    placeholder="Item description *" 
                    value={item.description} 
                    onChange={(e) => updateItem(index, "description", e.target.value)} 
                    className="flex-1 min-w-[160px] px-2.5 py-1.5 border border-gray-200 rounded text-gray-800 text-sm focus:outline-none focus:border-blue-500" 
                  />
                  <input 
                    type="number" 
                    min="1"
                    step="1"
                    placeholder="Qty" 
                    value={item.quantity} 
                    onChange={(e) => updateItem(index, "quantity", e.target.value)} 
                    className="w-20 px-2.5 py-1.5 border border-gray-200 text-gray-800 rounded text-sm focus:outline-none focus:border-blue-500" 
                  />
                  <input 
                    type="number" 
                    min="0"
                    step="0.01"
                    placeholder="Rate (₹)" 
                    value={item.price} 
                    onChange={(e) => updateItem(index, "price", e.target.value)} 
                    className="w-28 px-2.5 py-1.5 border border-gray-200 rounded text-gray-800 text-sm focus:outline-none focus:border-blue-500" 
                  />
                  <span className="w-24 text-right text-sm font-medium text-gray-900">
                    {formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0))}
                  </span>
                  {items.length > 1 && (
                    <button 
                      type="button"
                      onClick={() => removeItem(index)} 
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-all"
                      aria-label="Remove item"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 p-4 bg-gray-100 rounded-lg space-y-1.5">
              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>Subtotal</span>
                <span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>GST ({parsedTaxRate}%)</span>
                <span className="font-medium text-gray-900">{formatCurrency(gstAmount)}</span>
              </div>
              <div className="pt-1.5 border-t border-gray-200 flex justify-between items-center">
                <span className="font-semibold text-gray-800">Grand Total</span>
                <span className="text-xl font-bold text-blue-600">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Terms (Optional)</label>
            <textarea 
              rows={2} 
              placeholder="Payment terms, bank details, or notes..." 
              value={form.notes} 
              onChange={(e) => setForm({ ...form, notes: e.target.value })} 
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-800 text-sm resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
            />
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="flex flex-wrap justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-xl flex-shrink-0">
          <button 
            type="button"
            onClick={onClose} 
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={() => handleSubmit("DRAFT")} 
            disabled={loading} 
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 text-gray-700 text-sm font-medium rounded-lg transition-all"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Draft
          </button>
          <button 
            type="button"
            onClick={() => handleSubmit("SENT")} 
            disabled={loading} 
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg shadow-sm transition-all"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Create &amp; Issue
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Invoice Detail Modal ─────────────────────────────────

export function InvoiceDetailModal({
  invoiceId,
  onClose,
  onStatusChange,
  setToast,
}: {
  invoiceId: string;
  onClose: () => void;
  onStatusChange: () => void;
  setToast: (toast: ToastMessage) => void;
}) {
  const router = useRouter();
  const requestConfirmation = useConfirm();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editClientName, setEditClientName] = useState("");
  const [editClientEmail, setEditClientEmail] = useState("");
  const [editClientAddress, setEditClientAddress] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editTaxRate, setEditTaxRate] = useState(String(DEFAULT_GST_RATE));
  const [editNotes, setEditNotes] = useState("");
  const [editItems, setEditItems] = useState<FormItem[]>([]);

  const syncEditFormFromInvoice = useCallback((data: Invoice) => {
    setEditClientName(data.clientName);
    setEditClientEmail(data.clientEmail || "");
    setEditClientAddress(data.clientAddress || "");
    setEditDueDate(data.dueDate ? data.dueDate.split("T")[0] : "");
    setEditTaxRate(String(data.taxRate ?? DEFAULT_GST_RATE));
    setEditNotes(data.notes || "");
    setEditItems(
      data.items.length > 0
        ? data.items.map((item) => ({
            description: item.description,
            quantity: String(item.quantity),
            price: String(item.price),
          }))
        : [{ description: "", quantity: "1", price: "0" }]
    );
  }, []);

  const loadInvoice = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getInvoiceById(invoiceId);
      setInvoice(data);
      syncEditFormFromInvoice(data);
    } catch (err: any) {
      setLoadError(err?.message || "Failed to load invoice details");
    } finally {
      setLoading(false);
    }
  }, [invoiceId, syncEditFormFromInvoice]);

  useEffect(() => { loadInvoice(); }, [loadInvoice]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !updatingStatus) onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [updatingStatus, onClose]);

  const handleStatusUpdate = async (newStatus: "SENT" | "PAID") => {
    const label = newStatus === "SENT" ? "Issue / Mark as Sent" : "Mark as Paid";
    const ok = await requestConfirmation({
      title: `${label}?`,
      message:
        newStatus === "SENT"
          ? `Mark invoice ${invoice?.invoiceNumber} as Sent?`
          : `Confirm that invoice ${invoice?.invoiceNumber} (${formatCurrency(invoice?.totalAmount || 0)}) has been fully paid?`,
      confirmText: label,
      variant: newStatus === "PAID" ? "primary" : "warning",
    });
    if (!ok) return;

    setUpdatingStatus(true);
    try {
      await updateInvoice(invoiceId, { status: newStatus });
      await loadInvoice();
      onStatusChange();
    } catch (err: any) {
      setToast({ type: "error", message: err?.message || "Failed to update invoice status" });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editClientName.trim()) {
      setToast({ type: "error", message: "Client name cannot be empty" });
      return;
    }
    if (editClientEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editClientEmail.trim())) {
      setToast({ type: "error", message: "Please enter a valid client email address" });
      return;
    }
    if (!editDueDate) {
      setToast({ type: "error", message: "Due date is required" });
      return;
    }
    const parsedRate = parseFloat(editTaxRate);
    if (isNaN(parsedRate) || parsedRate < 0 || parsedRate > 100) {
      setToast({ type: "error", message: "GST percentage must be between 0 and 100" });
      return;
    }
    const invalidItem = editItems.find(
      (i) =>
        !i.description.trim() ||
        isNaN(parseFloat(i.quantity)) ||
        parseFloat(i.quantity) <= 0 ||
        isNaN(parseFloat(i.price)) ||
        parseFloat(i.price) < 0
    );
    if (editItems.length === 0 || invalidItem) {
      setToast({ type: "error", message: "Each line item requires a description, quantity > 0, and unit price ≥ 0" });
      return;
    }

    setUpdatingStatus(true);
    try {
      const updated = await updateInvoice(invoiceId, {
        clientName: editClientName.trim(),
        clientEmail: editClientEmail.trim() || undefined,
        clientAddress: editClientAddress.trim() || undefined,
        dueDate: editDueDate,
        taxRate: parsedRate,
        notes: editNotes.trim() || undefined,
        items: editItems.map((i) => ({
          description: i.description.trim(),
          quantity: parseFloat(i.quantity) || 1,
          price: parseFloat(i.price) || 0,
        })),
      });
      setInvoice(updated);
      syncEditFormFromInvoice(updated);
      setIsEditing(false);
      onStatusChange();
      setToast({ type: "success", message: "Draft invoice updated successfully!" });
    } catch (err: any) {
      setToast({ type: "error", message: err?.message || "Failed to update invoice" });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handlePrintInvoice = () => {
    if (!invoice) return;
    const html = generateInvoiceHTML(invoice);
    const win = window.open("", "_blank");
    if (!win) {
      setToast({ type: "error", message: "Popup blocked. Please allow popups to print." });
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    setDownloadingPdf(true);
    try {
      await downloadInvoicePdf(invoice.id);
    } catch (err: any) {
      setToast({ type: "error", message: err?.message || "Failed to download PDF" });
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl p-8"><Loader2 size={40} className="animate-spin text-blue-500" /></div>
    </div>
  );

  if (loadError || !invoice) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl p-8 max-w-sm w-full text-center space-y-4">
        <AlertCircle size={36} className="text-red-500 mx-auto" />
        <h3 className="text-lg font-semibold text-gray-900">Unable to load invoice</h3>
        <p className="text-sm text-gray-500">{loadError || "Invoice not found."}</p>
        <div className="flex justify-center gap-3">
          <button onClick={loadInvoice} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Retry</button>
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50">Close</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="detail-invoice-title">
      <div className="absolute inset-0 bg-black/50" onClick={() => !updatingStatus && onClose()} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="bg-blue-600 px-6 py-4 rounded-t-xl flex-shrink-0 flex justify-between items-center">
          <div>
            <h2 id="detail-invoice-title" className="text-xl font-semibold text-white">Invoice Details</h2>
            <p className="text-sm text-blue-100 font-mono">{invoice.invoiceNumber}</p>
          </div>
          <button onClick={() => !updatingStatus && onClose()} className="p-1 hover:bg-white/10 rounded-lg" aria-label="Close modal"><X size={20} className="text-white" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <StatusBadge status={invoice.status} />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm rounded-lg transition-colors"
              >
                {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                PDF
              </button>
              <button
                type="button"
                onClick={handlePrintInvoice}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm rounded-lg transition-colors"
              >
                Print
              </button>

              {invoice.status === "DRAFT" && (
                <PermissionGuard permission="invoices.update" action="disable">
                  <button
                    type="button"
                    onClick={() => {
                      if (isEditing && invoice) syncEditFormFromInvoice(invoice);
                      setIsEditing(!isEditing);
                    }}
                    disabled={updatingStatus}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm rounded-lg"
                  >
                    <Edit2 size={14} />
                    {isEditing ? "Cancel Edit" : "Edit Draft"}
                  </button>
                </PermissionGuard>
              )}

              {invoice.status !== "PAID" && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    router.push(`/payment/${invoice.id}`);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg"
                >
                  <Banknote size={14} />
                  Pay Online
                </button>
              )}

              {invoice.status === "DRAFT" && (
                <PermissionGuard permission="invoices.update" action="disable">
                  <button 
                    onClick={() => handleStatusUpdate("SENT")} 
                    disabled={updatingStatus} 
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-lg"
                  >
                    {updatingStatus ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    Mark as Sent
                  </button>
                </PermissionGuard>
              )}
              {(invoice.status === "SENT" || invoice.status === "OVERDUE") && (
                <PermissionGuard permission="invoices.update" action="disable">
                  <button 
                    onClick={() => handleStatusUpdate("PAID")} 
                    disabled={updatingStatus} 
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm rounded-lg"
                  >
                    {updatingStatus ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    Mark as Paid
                  </button>
                </PermissionGuard>
              )}
            </div>
          </div>

          {isEditing ? (
            <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-lg space-y-4">
              <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider">Edit Draft Invoice</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Client Name *</label>
                  <input
                    type="text"
                    value={editClientName}
                    onChange={(e) => setEditClientName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Client Email</label>
                  <input
                    type="email"
                    value={editClientEmail}
                    onChange={(e) => setEditClientEmail(e.target.value)}
                    placeholder="billing@client.com"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Client Address</label>
                  <textarea
                    rows={2}
                    value={editClientAddress}
                    onChange={(e) => setEditClientAddress(e.target.value)}
                    placeholder="Billing address"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white resize-none focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Due Date *</label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">GST / Tax (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={editTaxRate}
                    onChange={(e) => setEditTaxRate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-gray-700 uppercase">Line Items</label>
                  <button
                    type="button"
                    onClick={() => setEditItems([...editItems, { description: "", quantity: "1", price: "0" }])}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-gray-200 hover:bg-gray-50 text-xs font-medium rounded-lg"
                  >
                    <Plus size={12} /> Add Item
                  </button>
                </div>
                <div className="space-y-2">
                  {editItems.map((item, idx) => (
                    <div key={idx} className="flex flex-wrap sm:flex-nowrap gap-2 items-center bg-white p-2 rounded-lg border border-gray-200">
                      <input
                        type="text"
                        placeholder="Description *"
                        value={item.description}
                        onChange={(e) => {
                          const next = [...editItems];
                          next[idx] = { ...next[idx], description: e.target.value };
                          setEditItems(next);
                        }}
                        className="flex-1 min-w-[140px] px-2 py-1 border border-gray-200 rounded text-sm"
                      />
                      <input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => {
                          const next = [...editItems];
                          next[idx] = { ...next[idx], quantity: e.target.value };
                          setEditItems(next);
                        }}
                        className="w-20 px-2 py-1 border border-gray-200 rounded text-sm"
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Price"
                        value={item.price}
                        onChange={(e) => {
                          const next = [...editItems];
                          next[idx] = { ...next[idx], price: e.target.value };
                          setEditItems(next);
                        }}
                        className="w-24 px-2 py-1 border border-gray-200 rounded text-sm"
                      />
                      <span className="w-24 text-right text-xs font-semibold text-gray-800">
                        {formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0))}
                      </span>
                      {editItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setEditItems(editItems.filter((_, i) => i !== idx))}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                          aria-label="Remove line item"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {(() => {
                  const preview = calculateInvoiceTotals(
                    editItems.map((i) => ({ quantity: parseFloat(i.quantity) || 0, price: parseFloat(i.price) || 0 })),
                    Math.max(0, Math.min(100, parseFloat(editTaxRate) || 0))
                  );
                  return (
                    <div className="mt-2 p-3 bg-white rounded-lg border border-gray-200 text-xs space-y-1">
                      <div className="flex justify-between text-gray-600">
                        <span>Subtotal</span>
                        <span>{formatCurrency(preview.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>GST ({preview.taxRate}%)</span>
                        <span>{formatCurrency(preview.taxAmount)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-sm text-blue-600 pt-1 border-t border-gray-100">
                        <span>Grand Total</span>
                        <span>{formatCurrency(preview.grandTotal)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes / Terms</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Notes or payment terms..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white resize-none focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (invoice) syncEditFormFromInvoice(invoice);
                    setIsEditing(false);
                  }}
                  disabled={updatingStatus}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={updatingStatus}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg"
                >
                  {updatingStatus ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Bill To</p>
                <p className="font-medium text-gray-900">{invoice.clientName}</p>
                {invoice.clientEmail && <p className="text-sm text-gray-600">{invoice.clientEmail}</p>}
                {invoice.clientAddress && <p className="text-sm text-gray-600">{invoice.clientAddress}</p>}
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Invoice Details</p>
                <p className="text-sm text-gray-800">Due: {formatDateLong(invoice.dueDate)}</p>
                <p className="text-sm text-gray-800">Created: {formatDateLong(invoice.createdAt)}</p>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 text-xs font-medium text-gray-700">Description</th>
                  <th className="text-right p-3 text-xs font-medium text-gray-700">Qty</th>
                  <th className="text-right p-3 text-xs font-medium text-gray-700">Price</th>
                  <th className="text-right p-3 text-xs font-medium text-gray-700">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoice.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-3 text-sm text-gray-800">{item.description}</td>
                    <td className="p-3 text-sm text-gray-800 text-right">{item.quantity}</td>
                    <td className="p-3 text-sm text-gray-800 text-right">{formatCurrency(item.price)}</td>
                    <td className="p-3 text-sm text-gray-800 font-medium text-right">{formatCurrency(item.quantity * item.price)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={3} className="px-3 pt-2.5 pb-1 text-right text-xs text-gray-600">Subtotal</td>
                  <td className="px-3 pt-2.5 pb-1 text-right text-sm font-medium text-gray-800">{formatCurrency(invoice.subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-3 py-1 text-right text-xs text-gray-600">GST ({invoice.taxRate}%)</td>
                  <td className="px-3 py-1 text-right text-sm font-medium text-gray-800">{formatCurrency(invoice.taxAmount)}</td>
                </tr>
                <tr className="border-t border-gray-200">
                  <td colSpan={3} className="p-3 text-right font-semibold text-gray-800">Grand Total</td>
                  <td className="p-3 text-right font-bold text-blue-600">{formatCurrency(invoice.totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {invoice.notes && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Notes</p>
              <p className="text-sm text-gray-700">{invoice.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}