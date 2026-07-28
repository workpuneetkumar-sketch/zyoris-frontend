// lib/api/finance/invoicesApi.ts

import api from "../api";

// ── Types ────────────────────────────────────────────────

export type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE";

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
  status?: "DRAFT" | "SENT" | "PAID" | "OVERDUE";
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
    invoiceNumber: raw.invoiceNumber || raw.id,
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

// ── Generate Professional HTML Invoice ──────────────────

export function generateInvoiceHTML(invoice: Invoice): string {
  const subtotal = invoice.items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );
  const taxAmount = invoice.totalAmount - subtotal;
  const showTax = taxAmount !== 0;

  const statusColor =
    invoice.status === "PAID"
      ? "#059669"
      : invoice.status === "OVERDUE"
      ? "#dc2626"
      : invoice.status === "SENT"
      ? "#4f46e5"
      : "#6b7280";

  const statusBg =
    invoice.status === "PAID"
      ? "#d1fae5"
      : invoice.status === "OVERDUE"
      ? "#fee2e2"
      : invoice.status === "SENT"
      ? "#e0e7ff"
      : "#f3f4f6";

  const statusLabel =
    invoice.status === "PAID"
      ? "Paid"
      : invoice.status === "OVERDUE"
      ? "Overdue"
      : invoice.status === "SENT"
      ? "Sent"
      : "Draft";

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    /* ── Reset & Base ── */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      background: #f1f5f9;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 40px 20px;
      color: #0f172a;
    }

    .invoice-wrapper {
      width: 210mm;
      max-width: 100%;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.08), 0 8px 24px rgba(0, 0, 0, 0.04);
      overflow: hidden;
    }

    /* ── Header ── */
    .header {
      padding: 36px 44px 28px 44px;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #ffffff;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 20px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .brand-icon {
      width: 52px;
      height: 52px;
      background: rgba(255, 255, 255, 0.12);
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      backdrop-filter: blur(4px);
    }

    .brand-icon svg {
      width: 28px;
      height: 28px;
      stroke: #ffffff;
    }

    .brand-text h2 {
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.3px;
      line-height: 1.2;
    }

    .brand-text p {
      font-size: 13px;
      opacity: 0.7;
      font-weight: 400;
      margin-top: 2px;
    }

    .invoice-meta {
      text-align: right;
    }

    .invoice-meta .title {
      font-size: 30px;
      font-weight: 800;
      letter-spacing: -0.5px;
      line-height: 1;
    }

    .invoice-meta .number {
      font-size: 15px;
      font-weight: 500;
      opacity: 0.8;
      margin-top: 4px;
      font-family: 'JetBrains Mono', monospace;
      letter-spacing: 0.5px;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 10px;
      padding: 6px 18px;
      border-radius: 100px;
      font-size: 13px;
      font-weight: 600;
      background: ${statusBg};
      color: ${statusColor};
      letter-spacing: 0.3px;
    }

    .status-badge .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${statusColor};
      display: inline-block;
    }

    /* ── Body ── */
    .body {
      padding: 36px 44px 32px 44px;
      position: relative;
      z-index: 1;
    }

    /* ── Paid watermark ── */
    ${invoice.status === "PAID" ? `
    .paid-watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 80px;
      font-weight: 900;
      color: rgba(5, 150, 105, 0.06);
      letter-spacing: 12px;
      pointer-events: none;
      user-select: none;
      white-space: nowrap;
      z-index: 0;
    }
    ` : ""}

    /* ── Info Grid ── */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 28px;
      margin-bottom: 32px;
    }

    .info-block {
      background: #f8fafc;
      border-radius: 12px;
      padding: 20px 24px;
      border: 1px solid #eef2f6;
    }

    .info-block .label {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 600;
      color: #64748b;
      letter-spacing: 0.6px;
      margin-bottom: 8px;
    }

    .info-block .value {
      font-size: 15px;
      line-height: 1.7;
      color: #0f172a;
    }

    .info-block .value strong {
      font-size: 17px;
      display: block;
      margin-bottom: 2px;
      font-weight: 600;
    }

    .info-block .value .sub {
      color: #475569;
      font-size: 14px;
    }

    .info-block .value .date-row {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
    }

    .info-block .value .date-row span {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .info-block .value .date-row .label-sm {
      font-size: 12px;
      color: #64748b;
      font-weight: 500;
    }

    /* ── Table ── */
    .table-wrap {
      margin: 8px 0 24px 0;
      border-radius: 12px;
      border: 1px solid #eef2f6;
      overflow: hidden;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    thead {
      background: #f8fafc;
    }

    th {
      padding: 14px 20px;
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 600;
      color: #475569;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #eef2f6;
    }

    th.right {
      text-align: right;
    }

    tbody tr {
      border-bottom: 1px solid #f1f5f9;
      transition: background 0.15s;
    }

    tbody tr:last-child {
      border-bottom: none;
    }

    tbody tr:hover {
      background: #fafcff;
    }

    td {
      padding: 14px 20px;
      font-size: 14px;
      color: #1e293b;
    }

    td.right {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    .item-name {
      font-weight: 500;
      color: #0f172a;
    }

    /* ── Totals ── */
    .totals-wrap {
      display: flex;
      justify-content: flex-end;
      padding-top: 8px;
    }

    .totals-box {
      width: 100%;
      max-width: 320px;
      border-top: 2px solid #eef2f6;
      padding-top: 18px;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      font-size: 14px;
      color: #475569;
    }

    .total-row .amount {
      font-variant-numeric: tabular-nums;
    }

    .total-row.grand {
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      border-top: 1px dashed #d1d9e6;
      margin-top: 8px;
      padding-top: 14px;
    }

    .total-row.grand .amount {
      color: #2563eb;
    }

    /* ── Notes ── */
    .notes-box {
      margin-top: 28px;
      padding: 18px 22px;
      background: #fffbeb;
      border-left: 4px solid #f59e0b;
      border-radius: 8px;
      font-size: 13px;
      color: #92400e;
      line-height: 1.6;
    }

    .notes-box strong {
      display: block;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: #b45309;
      margin-bottom: 4px;
    }

    /* ── Footer ── */
    .footer {
      padding: 20px 44px;
      background: #fafcff;
      border-top: 1px solid #eef2f6;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 12px;
      color: #64748b;
    }

    .footer .left {
      display: flex;
      gap: 20px;
      align-items: center;
      flex-wrap: wrap;
    }

    .footer .left .sep {
      opacity: 0.3;
    }

    .footer .right {
      font-weight: 500;
    }

    /* ── Responsive ── */
    @media screen and (max-width: 600px) {
      body {
        padding: 16px 10px;
      }

      .header {
        padding: 24px 20px 20px 20px;
        flex-direction: column;
        align-items: stretch;
        gap: 16px;
      }

      .invoice-meta {
        text-align: left;
      }

      .invoice-meta .title {
        font-size: 24px;
      }

      .body {
        padding: 20px;
      }

      .info-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }

      .info-block {
        padding: 16px;
      }

      .table-wrap {
        overflow-x: auto;
      }

      table {
        font-size: 13px;
        min-width: 480px;
      }

      th,
      td {
        padding: 10px 14px;
      }

      .totals-box {
        max-width: 100%;
      }

      .footer {
        padding: 16px 20px;
        flex-direction: column;
        text-align: center;
      }

      .footer .left {
        justify-content: center;
      }
    }

    /* ── Print ── */
    @media print {
      body {
        background: white;
        padding: 0;
        display: block;
        min-height: auto;
      }

      .invoice-wrapper {
        box-shadow: none;
        border-radius: 0;
        width: 100%;
        max-width: 100%;
      }

      .header {
        padding: 28px 36px 22px 36px;
      }

      .body {
        padding: 28px 36px 24px 36px;
      }

      .footer {
        padding: 16px 36px;
      }

      .info-grid {
        gap: 20px;
      }

      .info-block {
        padding: 16px 20px;
      }

      th,
      td {
        padding: 10px 16px;
      }

      .totals-box {
        max-width: 280px;
      }

      tbody tr:hover {
        background: transparent;
      }

      ${invoice.status === "PAID" ? `
      .paid-watermark {
        font-size: 90px;
        color: rgba(5, 150, 105, 0.07);
      }
      ` : ""}
    }
  </style>
</head>
<body>
  <div class="invoice-wrapper">
    <!-- ─── HEADER ─── -->
    <div class="header">
      <div class="brand">
        <div class="brand-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="2.5" />
            <path d="M12 6v12m-6-6h12" />
          </svg>
        </div>
        <div class="brand-text">
          <h2>Acme Inc.</h2>
          <p>GSTIN: 29ABCDE1234F1Z5</p>
        </div>
      </div>
      <div class="invoice-meta">
        <div class="title">INVOICE</div>
        <div class="number"># ${invoice.invoiceNumber}</div>
        <div class="status-badge">
          <span class="dot"></span>
          ${statusLabel}
        </div>
      </div>
    </div>

    <!-- ─── BODY ─── -->
    <div class="body">
      ${invoice.status === "PAID" ? `<div class="paid-watermark">PAID</div>` : ""}

      <!-- Info Grid -->
      <div class="info-grid">
        <div class="info-block">
          <div class="label">📋 Bill To</div>
          <div class="value">
            <strong>${invoice.clientName}</strong>
            ${invoice.clientEmail ? `<span class="sub">${invoice.clientEmail}</span><br>` : ""}
            ${invoice.clientAddress ? `<span class="sub">${invoice.clientAddress}</span>` : ""}
          </div>
        </div>
        <div class="info-block">
          <div class="label">📅 Invoice Details</div>
          <div class="value">
            <div class="date-row">
              <span>
                <span class="label-sm">Issued</span>
                ${formatDate(invoice.createdAt)}
              </span>
              <span>
                <span class="label-sm">Due</span>
                ${formatDate(invoice.dueDate)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Items Table -->
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th class="right">Qty</th>
              <th class="right">Unit Price</th>
              <th class="right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items.map(item => `
              <tr>
                <td><div class="item-name">${item.description}</div></td>
                <td class="right">${item.quantity}</td>
                <td class="right">₹${item.price.toLocaleString('en-IN')}</td>
                <td class="right">₹${(item.quantity * item.price).toLocaleString('en-IN')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Totals -->
      <div class="totals-wrap">
        <div class="totals-box">
          <div class="total-row">
            <span>Subtotal</span>
            <span class="amount">₹${subtotal.toLocaleString('en-IN')}</span>
          </div>
          ${showTax ? `
          <div class="total-row">
            <span>Tax (${taxAmount > 0 ? '+' + (taxAmount/subtotal*100).toFixed(0) + '%' : 'Adjustment'})</span>
            <span class="amount">₹${Math.abs(taxAmount).toLocaleString('en-IN')}</span>
          </div>
          ` : ''}
          <div class="total-row grand">
            <span>Total</span>
            <span class="amount">₹${invoice.totalAmount.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      ${invoice.notes ? `
      <div class="notes-box">
        <strong>Notes / Terms</strong>
        ${invoice.notes}
      </div>
      ` : ''}
    </div>

    <!-- ─── FOOTER ─── -->
    <div class="footer">
      <div class="left">
        <span>Acme Inc.</span>
        <span class="sep">•</span>
        <span>Bengaluru, India</span>
        <span class="sep">•</span>
        <span>support@acmeinc.com</span>
      </div>
      <div class="right">Page 1 of 1</div>
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