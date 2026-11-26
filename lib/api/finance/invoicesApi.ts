// lib/api/finance/invoicesApi.ts

import api from "../api";
import {
  DEFAULT_GST_RATE,
  roundCurrency,
  calculateInvoiceTotals,
  isInvoiceOverdue,
  getInvoiceReceivable,
  generateInvoiceHTML,
  type InvoiceStatus,
  type InvoiceItem,
  type Invoice,
} from "./invoiceUtils";

export {
  DEFAULT_GST_RATE,
  roundCurrency,
  calculateInvoiceTotals,
  isInvoiceOverdue,
  getInvoiceReceivable,
  generateInvoiceHTML,
  type InvoiceStatus,
  type InvoiceItem,
  type Invoice,
};

export interface CreateInvoiceData {
  clientId?: string;
  clientName: string;
  dueDate: string;
  status?: "DRAFT" | "SENT";
  items: InvoiceItem[];
  taxRate?: number;
  notes?: string;
  clientEmail?: string;
  clientAddress?: string;
}

export interface UpdateInvoiceData {
  clientId?: string;
  clientName?: string;
  clientEmail?: string;
  clientAddress?: string;
  dueDate?: string;
  status?: "DRAFT" | "SENT" | "PAID" | "OVERDUE";
  items?: InvoiceItem[];
  taxRate?: number;
  notes?: string;
}

interface InvoiceExtraMeta {
  clientEmail?: string;
  clientAddress?: string;
  notes?: string;
  taxRate?: number;
}

function getInvoiceMeta(id: string): InvoiceExtraMeta | null {
  if (typeof window === "undefined" || !id) return null;
  try {
    const raw = localStorage.getItem(`zyoris_invoice_meta_${id}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveInvoiceMeta(id: string, meta: InvoiceExtraMeta): void {
  if (typeof window === "undefined" || !id) return;
  try {
    const existing = getInvoiceMeta(id) || {};
    const merged: InvoiceExtraMeta = {
      ...existing,
      ...(meta.clientEmail !== undefined && { clientEmail: meta.clientEmail }),
      ...(meta.clientAddress !== undefined && { clientAddress: meta.clientAddress }),
      ...(meta.notes !== undefined && { notes: meta.notes }),
      ...(meta.taxRate !== undefined && { taxRate: meta.taxRate }),
    };
    localStorage.setItem(`zyoris_invoice_meta_${id}`, JSON.stringify(merged));
  } catch {
    // ignore storage errors
  }
}

// ── Helper: map a raw invoice to a safe shape ───────────

function normaliseInvoice(raw: any): Invoice {
  const items: InvoiceItem[] = (raw.items || []).map((item: any) => ({
    description: item.description || "",
    quantity: Number(item.quantity) || 0,
    price: Number(item.price) || 0,
  }));

  const meta = getInvoiceMeta(raw.id);
  const taxRate =
    raw.taxRate !== undefined
      ? Number(raw.taxRate)
      : meta?.taxRate !== undefined
      ? Number(meta.taxRate)
      : DEFAULT_GST_RATE;

  const { subtotal, taxAmount, grandTotal } = calculateInvoiceTotals(items, taxRate);
  const totalAmount =
    raw.totalAmount !== undefined && raw.totalAmount !== null
      ? roundCurrency(Number(raw.totalAmount))
      : grandTotal;

  return {
    id: raw.id,
    invoiceNumber: raw.invoiceNumber || raw.id,
    clientId: raw.clientId,
    clientName: raw.clientName || "",
    clientEmail: raw.clientEmail ?? meta?.clientEmail,
    clientAddress: raw.clientAddress ?? meta?.clientAddress,
    dueDate: raw.dueDate,
    status: raw.status,
    items,
    subtotal,
    taxRate,
    taxAmount: raw.taxAmount !== undefined ? roundCurrency(Number(raw.taxAmount)) : taxAmount,
    totalAmount,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    notes: raw.notes ?? meta?.notes,
  };
}

// ── Invoice Endpoints (Real API only) ──────────────────

export async function getInvoices(filters?: {
  status?: string;
  search?: string;
}): Promise<Invoice[]> {
  try {
    const params: Record<string, string> = {};
    if (filters?.status && filters.status !== "ALL") params.status = filters.status;
    if (filters?.search) params.search = filters.search;

    const res = await api.get("/finance/invoices/get-invoices", { params });
    let data = res.data?.data || res.data;

    if (data?.invoices && Array.isArray(data.invoices)) {
      data = data.invoices;
    }
    if (!Array.isArray(data)) {
      return [];
    }

    return data.map(normaliseInvoice);
  } catch (error: any) {
    console.error("API Error:", error);
    throw error;
  }
}

export async function getInvoiceById(id: string): Promise<Invoice> {
  try {
    const res = await api.get(`/finance/invoices/get-invoice/${id}`);
    const raw = res.data?.data || res.data;
    if (!raw || typeof raw !== "object") throw new Error("Invalid response");
    return normaliseInvoice(raw);
  } catch (error: any) {
    console.error("API Error:", error);
    throw error;
  }
}

export async function createInvoice(data: CreateInvoiceData): Promise<Invoice> {
  try {
    const payload: Record<string, any> = {
      clientName: data.clientName,
      dueDate: data.dueDate,
      status: data.status || "DRAFT",
      items: data.items.map(item => ({
        description: item.description,
        quantity: Number(item.quantity),
        price: Number(item.price)
      })),
      notes: data.notes
    };
    if (data.clientId) payload.clientId = data.clientId;
    const res = await api.post("/finance/invoices/create", payload);
    const raw = res.data?.data || res.data;
    if (raw?.id) {
      saveInvoiceMeta(raw.id, {
        clientEmail: data.clientEmail,
        clientAddress: data.clientAddress,
        notes: data.notes,
        taxRate: data.taxRate ?? DEFAULT_GST_RATE,
      });
    }
    return normaliseInvoice(raw);
  } catch (error: any) {
    console.error("API Error:", error);
    throw new Error(error?.response?.data?.message || error?.message || "Failed to create invoice");
  }
}

export async function updateInvoice(
  id: string,
  data: UpdateInvoiceData
): Promise<Invoice> {
  try {
    const payload: Record<string, any> = {};
    if (data.status !== undefined) payload.status = data.status;
    if (data.clientId !== undefined) payload.clientId = data.clientId;
    if (data.clientName !== undefined) payload.clientName = data.clientName;
    if (data.dueDate !== undefined) payload.dueDate = data.dueDate;
    if (data.notes !== undefined) payload.notes = data.notes;
    if (data.items !== undefined) {
      payload.items = data.items.map(item => ({
        description: item.description,
        quantity: Number(item.quantity),
        price: Number(item.price)
      }));
    }
    saveInvoiceMeta(id, {
      ...(data.clientEmail !== undefined && { clientEmail: data.clientEmail }),
      ...(data.clientAddress !== undefined && { clientAddress: data.clientAddress }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.taxRate !== undefined && { taxRate: data.taxRate }),
    });
    const res = await api.patch(`/finance/invoices/update-invoice/${id}`, payload);
    const raw = res.data?.data || res.data;
    return normaliseInvoice(raw);
  } catch (error: any) {
    console.error("API Error:", error);
    throw new Error(error?.response?.data?.message || error?.message || "Failed to update invoice");
  }
}

export async function downloadInvoicePdf(id: string): Promise<void> {
  try {
    const response = await api.get(`/finance/invoices/${id}/pdf`, {
      responseType: "blob"
    });
    const blob = response.data;
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 100);
  } catch (error: any) {
    // Fallback: fetch invoice and generate HTML (uses the new design)
    console.error("PDF API failed, using HTML fallback:", error);
    const invoice = await getInvoiceById(id);
    const html = generateInvoiceHTML(invoice);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }
}