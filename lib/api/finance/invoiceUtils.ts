// lib/api/finance/invoiceUtils.ts
// Authoritative invoice calculation, overdue, receivable, and HTML/Print helpers.

export type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE";

export const DEFAULT_GST_RATE = 18;

export interface InvoiceItem {
  description: string;
  quantity: number;
  price: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId?: string;
  clientName: string;
  clientEmail?: string;
  clientAddress?: string;
  dueDate: string;
  status: InvoiceStatus;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export function roundCurrency(amount: number): number {
  return Math.round((Number(amount) + Number.EPSILON) * 100) / 100;
}

export function calculateInvoiceTotals(
  items: { quantity: number; price: number }[],
  taxRate: number = DEFAULT_GST_RATE
): { subtotal: number; taxRate: number; taxAmount: number; grandTotal: number } {
  const safeRate = Number.isFinite(taxRate) && taxRate >= 0 ? taxRate : DEFAULT_GST_RATE;
  const subtotal = roundCurrency(
    items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.price) || 0), 0)
  );
  const taxAmount = roundCurrency((subtotal * safeRate) / 100);
  const grandTotal = roundCurrency(subtotal + taxAmount);
  return { subtotal, taxRate: safeRate, taxAmount, grandTotal };
}

function toLocalMidnight(dateStr: string): Date | null {
  if (!dateStr) return null;
  const isoDateOnly = dateStr.slice(0, 10);
  const parts = isoDateOnly.split("-").map(Number);
  if (parts.length === 3 && parts.every((n) => !isNaN(n))) {
    return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

export function isInvoiceOverdue(
  invoice: { status: string; dueDate: string; totalAmount?: number },
  paidAmount: number = 0
): boolean {
  if (invoice.status === "PAID") return false;
  if (
    typeof invoice.totalAmount === "number" &&
    invoice.totalAmount > 0 &&
    paidAmount >= invoice.totalAmount
  ) {
    return false;
  }
  const due = toLocalMidnight(invoice.dueDate);
  if (!due) return false;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  return due < today;
}

export function getInvoiceReceivable(
  invoice: { status: string; totalAmount: number },
  paidAmount: number = 0
): number {
  if (invoice.status === "PAID") return 0;
  return Math.max(0, roundCurrency(invoice.totalAmount - (Number(paidAmount) || 0)));
}

export function escapeHtml(str: string | undefined | null): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function generateInvoiceHTML(invoice: Invoice): string {
  const computed = calculateInvoiceTotals(invoice.items, invoice.taxRate ?? DEFAULT_GST_RATE);
  const subtotal = invoice.subtotal ?? computed.subtotal;
  const taxRate = invoice.taxRate ?? computed.taxRate;
  const taxAmount = invoice.taxAmount ?? computed.taxAmount;
  const grandTotal = invoice.totalAmount ?? computed.grandTotal;

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

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${escapeHtml(invoice.invoiceNumber)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f1f5f9;
      display: flex;
      justify-content: center;
      padding: 40px 20px;
      color: #0f172a;
    }
    .invoice-wrapper {
      width: 210mm;
      max-width: 100%;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.08);
      overflow: hidden;
    }
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
    .brand { display: flex; align-items: center; gap: 16px; }
    .brand-text h2 { font-size: 22px; font-weight: 700; }
    .brand-text p { font-size: 13px; opacity: 0.7; margin-top: 2px; }
    .invoice-meta { text-align: right; }
    .invoice-meta .title { font-size: 30px; font-weight: 800; line-height: 1; }
    .invoice-meta .number { font-size: 15px; opacity: 0.8; margin-top: 4px; font-family: monospace; }
    .status-badge {
      display: inline-flex; align-items: center; gap: 6px; margin-top: 10px;
      padding: 6px 18px; border-radius: 100px; font-size: 13px; font-weight: 600;
      background: ${statusBg}; color: ${statusColor};
    }
    .status-badge .dot { width: 8px; height: 8px; border-radius: 50%; background: ${statusColor}; display: inline-block; }
    .body { padding: 36px 44px 32px 44px; position: relative; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-bottom: 32px; }
    .info-block { background: #f8fafc; border-radius: 12px; padding: 20px 24px; border: 1px solid #eef2f6; }
    .info-block .label { font-size: 11px; text-transform: uppercase; font-weight: 600; color: #64748b; margin-bottom: 8px; }
    .info-block .value { font-size: 15px; line-height: 1.7; color: #0f172a; }
    .info-block .value strong { font-size: 17px; display: block; margin-bottom: 2px; font-weight: 600; }
    .info-block .value .sub { color: #475569; font-size: 14px; }
    .table-wrap { margin: 8px 0 24px 0; border-radius: 12px; border: 1px solid #eef2f6; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    thead { background: #f8fafc; }
    th { padding: 14px 20px; text-align: left; font-size: 11px; text-transform: uppercase; font-weight: 600; color: #475569; border-bottom: 1px solid #eef2f6; }
    th.right, td.right { text-align: right; font-variant-numeric: tabular-nums; }
    td { padding: 14px 20px; font-size: 14px; color: #1e293b; border-bottom: 1px solid #f1f5f9; }
    .totals-wrap { display: flex; justify-content: flex-end; padding-top: 8px; }
    .totals-box { width: 100%; max-width: 320px; border-top: 2px solid #eef2f6; padding-top: 18px; }
    .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: #475569; }
    .total-row.grand { font-size: 20px; font-weight: 700; color: #0f172a; border-top: 1px dashed #d1d9e6; margin-top: 8px; padding-top: 14px; }
    .total-row.grand .amount { color: #2563eb; }
    .notes-box { margin-top: 28px; padding: 18px 22px; background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 8px; font-size: 13px; color: #92400e; }
    .footer { padding: 20px 44px; background: #fafcff; border-top: 1px solid #eef2f6; display: flex; justify-content: space-between; font-size: 12px; color: #64748b; }
    @media print {
      body { background: white; padding: 0; display: block; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .invoice-wrapper { box-shadow: none; border-radius: 0; width: 100%; }
    }
  </style>
</head>
<body>
  <div class="invoice-wrapper">
    <div class="header">
      <div class="brand">
        <div class="brand-text">
          <h2>Zyoris Technologies</h2>
          <p>Enterprise Business Portal</p>
        </div>
      </div>
      <div class="invoice-meta">
        <div class="title">INVOICE</div>
        <div class="number"># ${escapeHtml(invoice.invoiceNumber)}</div>
        <div class="status-badge">
          <span class="dot"></span>
          ${statusLabel}
        </div>
      </div>
    </div>
    <div class="body">
      <div class="info-grid">
        <div class="info-block">
          <div class="label">Bill To</div>
          <div class="value">
            <strong>${escapeHtml(invoice.clientName)}</strong>
            ${invoice.clientEmail ? `<span class="sub">${escapeHtml(invoice.clientEmail)}</span><br>` : ""}
            ${invoice.clientAddress ? `<span class="sub">${escapeHtml(invoice.clientAddress)}</span>` : ""}
          </div>
        </div>
        <div class="info-block">
          <div class="label">Invoice Details</div>
          <div class="value">
            <div>Invoice ID: ${escapeHtml(invoice.id)}</div>
            <div>Issued: ${formatDate(invoice.createdAt)}</div>
            <div>Due: ${formatDate(invoice.dueDate)}</div>
          </div>
        </div>
      </div>
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
                <td>${escapeHtml(item.description)}</td>
                <td class="right">${item.quantity}</td>
                <td class="right">₹${item.price.toLocaleString("en-IN")}</td>
                <td class="right">₹${(item.quantity * item.price).toLocaleString("en-IN")}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
      <div class="totals-wrap">
        <div class="totals-box">
          <div class="total-row">
            <span>Subtotal</span>
            <span class="amount">₹${subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div class="total-row">
            <span>GST (${taxRate}%)</span>
            <span class="amount">₹${taxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div class="total-row grand">
            <span>Grand Total</span>
            <span class="amount">₹${grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>
      ${invoice.notes ? `
      <div class="notes-box">
        <strong>Notes / Terms</strong><br>
        ${escapeHtml(invoice.notes)}
      </div>
      ` : ""}
    </div>
    <div class="footer">
      <span>Zyoris Technologies Pvt. Ltd. • Noida, India • billing@zyoris.com</span>
      <span>Page 1 of 1</span>
    </div>
  </div>
</body>
</html>`;
}
