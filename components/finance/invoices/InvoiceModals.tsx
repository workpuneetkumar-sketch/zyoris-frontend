"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Plus,
  Send,
  Users,
  FileText,
  Trash2,
  XCircle,
  Loader2,
  Eye,
  CheckCircle2,
  AlertCircle,
  Edit2,
} from "lucide-react";
import {
  Invoice,
  InvoiceItem,
  CreateInvoiceData,
  createInvoice,
  updateInvoice,
  getInvoiceById,
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
  const [form, setForm] = useState({
    clientName: "",
    clientEmail: "",
    clientAddress: "",
    dueDate: "",
    notes: "",
  });
  const [items, setItems] = useState<FormItem[]>([
    { description: "", quantity: "1", price: "0" },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const addItem = () => setItems([...items, { description: "", quantity: "1", price: "0" }]);
  const removeItem = (index: number) => items.length > 1 && setItems(items.filter((_, i) => i !== index));
  const updateItem = (index: number, field: keyof FormItem, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };
  const calculateTotal = () => items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0), 0);

  const handleSubmit = async () => {
    setError("");
    if (!form.clientName.trim()) return setError("Please enter client name");
    if (!form.dueDate) return setError("Please select due date");
    if (!items[0].description.trim()) return setError("Please add at least one item");

    setLoading(true);
    try {
      const invoiceData: CreateInvoiceData = {
        clientName: form.clientName.trim(),
        clientEmail: form.clientEmail.trim() || undefined,
        clientAddress: form.clientAddress.trim() || undefined,
        dueDate: form.dueDate,
        items: items.filter(i => i.description.trim()).map(i => ({
          description: i.description.trim(),
          quantity: parseFloat(i.quantity) || 0,
          price: parseFloat(i.price) || 0,
        })),
        notes: form.notes.trim() || undefined,
      };
      const newInvoice = await createInvoice(invoiceData);
      onSuccess(newInvoice);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Fixed Header */}
        <div className="bg-blue-600 px-6 py-4 rounded-t-xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Create New Invoice</h2>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
              <X size={20} className="text-white" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <XCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div>
            <h3 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Users size={16} className="text-gray-700" />
              Client Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input 
                type="text" 
                placeholder="Client Name *" 
                value={form.clientName} 
                onChange={(e) => setForm({ ...form, clientName: e.target.value })} 
                className="px-3 py-2 border border-gray-200 rounded-lg text-gray-800 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
              />
              <input 
                type="email" 
                placeholder="Client Email" 
                value={form.clientEmail} 
                onChange={(e) => setForm({ ...form, clientEmail: e.target.value })} 
                className="px-3 py-2 border border-gray-200 rounded-lg text-gray-800 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
              />
              <textarea 
                rows={2} 
                placeholder="Client Address" 
                value={form.clientAddress} 
                onChange={(e) => setForm({ ...form, clientAddress: e.target.value })} 
                className="md:col-span-2 px-3 py-2 border border-gray-200 rounded-lg text-gray-800 text-sm resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
              />
              <input 
                type="date" 
                placeholder="Due Date *" 
                value={form.dueDate} 
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })} 
                className="px-3 py-2 border border-gray-200 rounded-lg text-gray-800 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-md font-semibold text-gray-900 flex items-center gap-2">
                <FileText size={16} className="text-gray-700" />
                Invoice Items
              </h3>
              <button 
                onClick={addItem} 
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-all"
              >
                <Plus size={14} /> Add Item
              </button>
            </div>
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="flex gap-2 items-center p-3 bg-gray-50 rounded-lg">
                  <input 
                    type="text" 
                    placeholder="Description" 
                    value={item.description} 
                    onChange={(e) => updateItem(index, "description", e.target.value)} 
                    className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-gray-800 text-sm focus:outline-none focus:border-blue-500" 
                  />
                  <input 
                    type="number" 
                    placeholder="Qty" 
                    value={item.quantity} 
                    onChange={(e) => updateItem(index, "quantity", e.target.value)} 
                    className="w-20 px-2 py-1.5 border border-gray-200 text-gray-800 rounded text-sm focus:outline-none focus:border-blue-500" 
                  />
                  <input 
                    type="number" 
                    placeholder="Price" 
                    value={item.price} 
                    onChange={(e) => updateItem(index, "price", e.target.value)} 
                    className="w-28 px-2 py-1.5 border border-gray-200 rounded text-gray-800 text-sm focus:outline-none focus:border-blue-500" 
                  />
                  <span className="w-24 text-sm font-medium text-gray-900">
                    ₹{((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0)).toLocaleString()}
                  </span>
                  {items.length > 1 && (
                    <button 
                      onClick={() => removeItem(index)} 
                      className="p-1 text-red-500 hover:bg-red-50 rounded transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 p-3 bg-gray-100 rounded-lg flex justify-between items-center">
              <span className="font-semibold text-gray-700">Total Amount</span>
              <span className="text-xl font-bold text-blue-600">{formatCurrency(calculateTotal())}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
            <textarea 
              rows={2} 
              placeholder="Add notes..." 
              value={form.notes} 
              onChange={(e) => setForm({ ...form, notes: e.target.value })} 
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-800 text-sm resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
            />
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-xl flex-shrink-0">
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={loading} 
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg shadow-sm transition-all"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Submit Invoice
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
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadInvoice = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getInvoiceById(invoiceId);
      setInvoice(data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [invoiceId]);

  useEffect(() => { loadInvoice(); }, [loadInvoice]);

  const handleStatusUpdate = async (newStatus: "SENT" | "PAID") => {
    setUpdatingStatus(true);
    try {
      await updateInvoice(invoiceId, { status: newStatus });
      await loadInvoice();
      onStatusChange();
    } catch (err) { console.error(err); } finally { setUpdatingStatus(false); }
  };

  if (loading) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl p-8"><Loader2 size={40} className="animate-spin text-blue-500" /></div>
    </div>
  );
  if (!invoice) return null;

  const statusConfig = STATUS_CONFIG[invoice.status];
  const StatusIcon = statusConfig.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="bg-blue-600 px-6 py-4 rounded-t-xl flex-shrink-0 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-white">Invoice Details</h2>
            <p className="text-sm text-blue-100">{invoice.invoiceNumber}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg"><X size={20} className="text-white" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex justify-between items-center">
            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
              <StatusIcon size={12} /> {statusConfig.label}
            </span>
            <div className="flex gap-2">
              {invoice.status === "DRAFT" && (
                <button 
                  onClick={() => handleStatusUpdate("SENT")} 
                  disabled={updatingStatus} 
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg"
                >
                  Mark as Sent
                </button>
              )}
              {invoice.status === "SENT" && (
                <button 
                  onClick={() => handleStatusUpdate("PAID")} 
                  disabled={updatingStatus} 
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg"
                >
                  Mark as Paid
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-700 mb-1">Bill To</p>
              <p className="font-medium text-gray-900">{invoice.clientName}</p>
              {invoice.clientEmail && <p className="text-sm text-gray-600">{invoice.clientEmail}</p>}
              {invoice.clientAddress && <p className="text-sm text-gray-600">{invoice.clientAddress}</p>}
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-700 mb-1">Invoice Details</p>
              <p className="text-sm text-gray-800">Due: {formatDateLong(invoice.dueDate)}</p>
              <p className="text-sm text-gray-800">Created: {formatDateLong(invoice.createdAt)}</p>
            </div>
          </div>

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
                <td colSpan={3} className="p-3 text-right font-semibold text-gray-800">Total</td>
                <td className="p-3 text-right font-bold text-blue-600">{formatCurrency(invoice.totalAmount)}</td>
              </tr>
            </tfoot>
          </table>

          {invoice.notes && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-700 mb-1">Notes</p>
              <p className="text-sm text-gray-700">{invoice.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}