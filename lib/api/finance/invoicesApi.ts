// lib/api/financeApi.ts

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

// ── Demo Data ────────────────────────────────────────────

export const DEMO_INVOICES: Invoice[] = [
  {
    id: "INV-001",
    invoiceNumber: "INV-2024-0001",
    clientName: "Acme Corporation",
    clientEmail: "billing@acme.com",
    clientAddress: "123 Business Ave, New York, NY 10001",
    dueDate: "2024-12-15",
    status: "SENT",
    items: [
      { description: "Web Development Services", quantity: 40, price: 150 },
      { description: "UI/UX Design", quantity: 20, price: 200 },
      { description: "Hosting Setup", quantity: 1, price: 500 }
    ],
    totalAmount: 10500,
    createdAt: "2024-11-20T10:00:00Z",
    updatedAt: "2024-11-20T10:00:00Z",
    notes: "Please make payment by the due date."
  },
  {
    id: "INV-002",
    invoiceNumber: "INV-2024-0002",
    clientName: "TechStart Solutions",
    clientEmail: "finance@techstart.com",
    clientAddress: "456 Innovation Drive, San Francisco, CA 94105",
    dueDate: "2024-12-20",
    status: "DRAFT",
    items: [
      { description: "Mobile App Development", quantity: 60, price: 120 },
      { description: "API Integration", quantity: 15, price: 180 },
      { description: "Testing & QA", quantity: 20, price: 100 }
    ],
    totalAmount: 11900,
    createdAt: "2024-11-25T14:30:00Z",
    updatedAt: "2024-11-25T14:30:00Z",
    notes: "Pending client approval"
  },
  {
    id: "INV-003",
    invoiceNumber: "INV-2024-0003",
    clientName: "Global Retail Group",
    clientEmail: "accounts@globalretail.com",
    clientAddress: "789 Market Street, Chicago, IL 60607",
    dueDate: "2024-12-10",
    status: "PAID",
    items: [
      { description: "E-commerce Platform", quantity: 1, price: 25000 },
      { description: "Payment Gateway Integration", quantity: 1, price: 5000 },
      { description: "Training Session", quantity: 5, price: 300 }
    ],
    totalAmount: 31500,
    createdAt: "2024-11-10T09:15:00Z",
    updatedAt: "2024-12-05T16:20:00Z",
    notes: "Payment received on December 5, 2024"
  },
  {
    id: "INV-004",
    invoiceNumber: "INV-2024-0004",
    clientName: "Creative Agency Co",
    clientEmail: "billing@creativeagency.com",
    clientAddress: "321 Design Street, Austin, TX 78701",
    dueDate: "2024-12-05",
    status: "OVERDUE",
    items: [
      { description: "Brand Identity Design", quantity: 1, price: 8000 },
      { description: "Website Redesign", quantity: 30, price: 150 },
      { description: "Social Media Kit", quantity: 1, price: 2000 }
    ],
    totalAmount: 14500,
    createdAt: "2024-11-05T11:00:00Z",
    updatedAt: "2024-11-05T11:00:00Z",
    notes: "Overdue - please make immediate payment"
  },
  {
    id: "INV-005",
    invoiceNumber: "INV-2024-0005",
    clientName: "CloudNine Hosting",
    clientEmail: "finance@cloudnine.com",
    clientAddress: "567 Cloud Lane, Seattle, WA 98101",
    dueDate: "2024-12-25",
    status: "SENT",
    items: [
      { description: "Server Maintenance", quantity: 12, price: 200 },
      { description: "Security Audit", quantity: 1, price: 3500 },
      { description: "Backup Solution", quantity: 6, price: 150 }
    ],
    totalAmount: 6800,
    createdAt: "2024-11-28T13:45:00Z",
    updatedAt: "2024-11-28T13:45:00Z",
    notes: "Thank you for your business!"
  }
];

// ── Helper Functions ─────────────────────────────────────

function calculateTotalAmount(items: InvoiceItem[]): number {
  return items.reduce((total, item) => total + (item.quantity * item.price), 0);
}

function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${year}-${random}`;
}

// Global flag for data source
let useDemoData = false;

export function setUseDemoData(value: boolean) {
  useDemoData = value;
}

export function getUseDemoData() {
  return useDemoData;
}

// ── Generate HTML Invoice for PDF ────────────────────────

function generateInvoiceHTML(invoice: Invoice): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Helvetica Neue', Arial, sans-serif;
          padding: 40px;
          background: #f9fafb;
        }
        .invoice-container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .invoice-header {
          background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
          color: white;
          padding: 30px;
        }
        .invoice-title {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .invoice-number {
          font-size: 14px;
          opacity: 0.9;
        }
        .invoice-body {
          padding: 30px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
        }
        .info-box {
          background: #f9fafb;
          padding: 15px;
          border-radius: 12px;
        }
        .info-label {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          color: #6b7280;
          margin-bottom: 8px;
        }
        .info-value {
          font-size: 14px;
          color: #111827;
          line-height: 1.5;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th {
          background: #f3f4f6;
          padding: 12px;
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          color: #6b7280;
          border-bottom: 1px solid #e5e7eb;
        }
        td {
          padding: 12px;
          font-size: 14px;
          color: #374151;
          border-bottom: 1px solid #f3f4f6;
        }
        .total-row {
          background: #f9fafb;
          font-weight: bold;
        }
        .total-amount {
          font-size: 20px;
          font-weight: bold;
          color: #2563eb;
          text-align: right;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 2px solid #e5e7eb;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }
        .status-DRAFT { background: #f3f4f6; color: #374151; }
        .status-SENT { background: #dbeafe; color: #1e40af; }
        .status-PAID { background: #d1fae5; color: #065f46; }
        .status-OVERDUE { background: #fee2e2; color: #991b1b; }
        .notes {
          margin-top: 30px;
          padding: 15px;
          background: #f9fafb;
          border-radius: 12px;
          font-size: 14px;
          color: #6b7280;
        }
        .footer {
          text-align: center;
          padding: 20px;
          font-size: 12px;
          color: #9ca3af;
          border-top: 1px solid #e5e7eb;
        }
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

// ── Invoice Endpoints with Data Source Toggle ────────────

export async function getInvoices(filters?: {
  status?: string;
  search?: string;
}): Promise<Invoice[]> {
  if (useDemoData) {
    let filtered = [...DEMO_INVOICES];
    if (filters?.status && filters.status !== "ALL") {
      filtered = filtered.filter(inv => inv.status === filters.status);
    }
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(inv => 
        inv.invoiceNumber.toLowerCase().includes(searchLower) ||
        inv.clientName.toLowerCase().includes(searchLower)
      );
    }
    return filtered;
  }

  try {
    const params: Record<string, string> = {};
    if (filters?.status && filters.status !== "ALL") params.status = filters.status;
    if (filters?.search) params.search = filters.search;

    const res = await api.get("/finance/invoices/get-invoices", { params });
    let data = res.data?.data || res.data;
    
    if (data?.invoices && Array.isArray(data.invoices)) return data.invoices;
    if (Array.isArray(data)) return data;
    return [];
  } catch (error: any) {
    console.error("API Error:", error);
    throw error;
  }
}

export async function getInvoiceById(id: string): Promise<Invoice> {
  if (useDemoData) {
    const invoice = DEMO_INVOICES.find(inv => inv.id === id);
    if (!invoice) throw new Error("Invoice not found");
    return invoice;
  }

  try {
    const res = await api.get(`/finance/invoices/get-invoice/${id}`);
    const data = res.data?.data || res.data;
    if (!data || typeof data !== "object") throw new Error("Invalid response");
    return data;
  } catch (error: any) {
    console.error("API Error:", error);
    throw error;
  }
}

export async function createInvoice(data: CreateInvoiceData): Promise<Invoice> {
  if (useDemoData) {
    const newInvoice: Invoice = {
      id: `INV-${Date.now()}`,
      invoiceNumber: generateInvoiceNumber(),
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      clientAddress: data.clientAddress,
      dueDate: data.dueDate,
      status: "DRAFT",
      items: data.items,
      totalAmount: calculateTotalAmount(data.items),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: data.notes,
    };
    DEMO_INVOICES.unshift(newInvoice);
    return newInvoice;
  }

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
    const result = res.data?.data || res.data;
    return result;
  } catch (error: any) {
    console.error("API Error:", error);
    throw error;
  }
}

export async function updateInvoice(
  id: string,
  data: UpdateInvoiceData
): Promise<Invoice> {
  if (useDemoData) {
    const index = DEMO_INVOICES.findIndex(inv => inv.id === id);
    if (index === -1) throw new Error("Invoice not found");
    
    DEMO_INVOICES[index] = {
      ...DEMO_INVOICES[index],
      ...data,
      items: data.items || DEMO_INVOICES[index].items,
      totalAmount: data.items ? calculateTotalAmount(data.items) : DEMO_INVOICES[index].totalAmount,
      updatedAt: new Date().toISOString(),
    };
    return DEMO_INVOICES[index];
  }

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
    const result = res.data?.data || res.data;
    return result;
  } catch (error: any) {
    console.error("API Error:", error);
    throw error;
  }
}

// Fixed PDF download - opens in new tab properly
export async function downloadInvoicePdf(id: string): Promise<void> {
  let invoice: Invoice;
  
  if (useDemoData) {
    invoice = await getInvoiceById(id);
    const html = generateInvoiceHTML(invoice);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 100);
    return;
  }

  try {
    const response = await api.get(`/finance/invoices/${id}/pdf`, {
      responseType: "blob"
    });
    const blob = response.data;
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 100);
  } catch (error: any) {
    // Fallback to HTML generation if API fails
    console.error("PDF API failed, using HTML fallback:", error);
    invoice = await getInvoiceById(id);
    const html = generateInvoiceHTML(invoice);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }
}