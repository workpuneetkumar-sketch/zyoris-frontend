// lib/api/finance/invoicesApi.ts

import api from "../api";

// ── Types ────────────────────────────────────────────────

export interface InvoiceItem {
  description: string;
  quantity: number;
  price: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail?: string;
  clientAddress?: string;
  dueDate: string;
  status: "DRAFT" | "SENT" | "PAID" | "OVERDUE";
  items: InvoiceItem[];
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface CreateInvoiceData {
  clientName: string;
  dueDate: string;
  status?: "DRAFT";
  items: InvoiceItem[];
  notes?: string;
  clientEmail?: string;
  clientAddress?: string;
}

export interface UpdateInvoiceData {
  clientName?: string;
  dueDate?: string;
  status?: "DRAFT" | "SENT" | "PAID";
  items?: InvoiceItem[];
  notes?: string;
}

// ── Helper: map a raw invoice to a safe shape ───────────

function normaliseInvoice(raw: any): Invoice {
  const items: InvoiceItem[] = (raw.items || []).map((item: any) => ({
    description: item.description || "",
    quantity: Number(item.quantity) || 0,
    price: Number(item.price) || 0,
  }));

  const totalAmount =
    raw.totalAmount ??
    items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  return {
    id: raw.id,
    invoiceNumber: raw.invoiceNumber || raw.id, // fallback to id
    clientName: raw.clientName || "",
    clientEmail: raw.clientEmail,
    clientAddress: raw.clientAddress,
    dueDate: raw.dueDate,
    status: raw.status,
    items,
    totalAmount,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    notes: raw.notes,
  };
}

// ── Generate HTML Invoice for PDF (fallback) ───────────

function generateInvoiceHTML(invoice: Invoice): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; background: #f9fafb; }
        .invoice-container { max-width: 800px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; }
        .invoice-header { background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 30px; }
        .invoice-title { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
        .invoice-number { font-size: 14px; opacity: 0.9; }
        .invoice-body { padding: 30px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
        .info-box { background: #f9fafb; padding: 15px; border-radius: 12px; }
        .info-label { font-size: 12px; font-weight: 600; text-transform: uppercase; color: #6b7280; margin-bottom: 8px; }
        .info-value { font-size: 14px; color: #111827; line-height: 1.5; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background: #f3f4f6; padding: 12px; text-align: left; font-size: 12px; font-weight: 600; text-transform: uppercase; color: #6b7280; border-bottom: 1px solid #e5e7eb; }
        td { padding: 12px; font-size: 14px; color: #374151; border-bottom: 1px solid #f3f4f6; }
        .total-row { background: #f9fafb; font-weight: bold; }
        .total-amount { font-size: 20px; font-weight: bold; color: #2563eb; text-align: right; margin-top: 20px; padding-top: 20px; border-top: 2px solid #e5e7eb; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .status-DRAFT { background: #f3f4f6; color: #374151; }
        .status-SENT { background: #dbeafe; color: #1e40af; }
        .status-PAID { background: #d1fae5; color: #065f46; }
        .status-OVERDUE { background: #fee2e2; color: #991b1b; }
        .notes { margin-top: 30px; padding: 15px; background: #f9fafb; border-radius: 12px; font-size: 14px; color: #6b7280; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="invoice-header">
          <div class="invoice-title">INVOICE</div>
          <div class="invoice-number">${invoice.invoiceNumber}</div>
        </div>
        <div class="invoice-body">
          <div class="info-grid">
            <div class="info-box">
              <div class="info-label">Bill To</div>
              <div class="info-value">
                <strong>${invoice.clientName}</strong><br>
                ${invoice.clientEmail ? invoice.clientEmail + '<br>' : ''}
                ${invoice.clientAddress || ''}
              </div>
            </div>
            <div class="info-box">
              <div class="info-label">Invoice Details</div>
              <div class="info-value">
                Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}<br>
                Created: ${new Date(invoice.createdAt).toLocaleDateString()}<br>
                Status: <span class="status-badge status-${invoice.status}">${invoice.status}</span>
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr><th>Description</th><th>Quantity</th><th>Price</th><th>Amount</th></tr>
            </thead>
            <tbody>
              ${invoice.items.map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td>${item.quantity}</td>
                  <td>₹${item.price.toLocaleString()}</td>
                  <td>₹${(item.quantity * item.price).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="total-amount">
            Total Amount: ₹${invoice.totalAmount.toLocaleString()}
          </div>

          ${invoice.notes ? `<div class="notes"><strong>Notes:</strong><br>${invoice.notes}</div>` : ''}
        </div>
        <div class="footer">
          Thank you for your business!
        </div>
      </div>
    </body>
    </html>
  `;
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
    const payload = {
      clientName: data.clientName,
      dueDate: data.dueDate,
      status: "DRAFT",
      items: data.items.map(item => ({
        description: item.description,
        quantity: Number(item.quantity),
        price: Number(item.price)
      })),
      notes: data.notes
    };
    const res = await api.post("/finance/invoices/create", payload);
    const raw = res.data?.data || res.data;
    return normaliseInvoice(raw);
  } catch (error: any) {
    console.error("API Error:", error);
    throw error;
  }
}

export async function updateInvoice(
  id: string,
  data: UpdateInvoiceData
): Promise<Invoice> {
  try {
    const payload: Record<string, any> = {};
    if (data.status !== undefined) payload.status = data.status;
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
    const res = await api.patch(`/finance/invoices/update-invoice/${id}`, payload);
    const raw = res.data?.data || res.data;
    return normaliseInvoice(raw);
  } catch (error: any) {
    console.error("API Error:", error);
    throw error;
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
    // Fallback: fetch invoice and generate HTML
    console.error("PDF API failed, using HTML fallback:", error);
    const invoice = await getInvoiceById(id);
    const html = generateInvoiceHTML(invoice);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }
}