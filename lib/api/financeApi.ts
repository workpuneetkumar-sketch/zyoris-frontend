// lib/api/financeApi.ts

import api from "@/lib/api/api";

// ── Types ─────────────────────────────────────────────────────────────

export interface Invoice {
    id: string;
    organizationId: string;
    clientName: string;
    totalAmount: number;
    type: string;
    status: "DRAFT" | "SENT" | "PAID" | "OVERDUE";
    dueDate: string;
    approvedBy?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Expense {
    id: string;
    organizationId: string;
    clientName: string;
    totalAmount: number;
    type: string;
    status: "DRAFT" | "SENT" | "PAID" | "OVERDUE";
    dueDate: string;
    approvedBy?: string;
    submittedBy: string;
    approvalStatus: "PENDING" | "APPROVED" | "REIMBURSED";
    category: "TRAVEL" | "OFFICE" | "MARKETING" | "SALARY" | "OTHER";
    createdAt: string;
    updatedAt: string;
}

// ═════════════════════════════════════════════════════════════════════
// INVOICE ENDPOINTS
// ═════════════════════════════════════════════════════════════════════

// ── CREATE ──────────────────────────────────────────────────────────

export async function createInvoice(data: {
    clientName: string;
    totalAmount: number;
    type: string;
    dueDate: string;
}): Promise<Invoice> {
    const res = await api.post("/finance/invoices/create", data);
    return res.data;
}

// ── READ ────────────────────────────────────────────────────────────

export async function fetchInvoices(filters?: {
    status?: Invoice["status"];
    clientName?: string;
    startDate?: string;
    endDate?: string;
}): Promise<Invoice[]> {
    const params = {
        ...(filters?.status && { status: filters.status }),
        ...(filters?.clientName && { clientName: filters.clientName }),
        ...(filters?.startDate && { startDate: filters.startDate }),
        ...(filters?.endDate && { endDate: filters.endDate }),
    };
    
    const res = await api.get("/finance/invoices/get-invoices", { params });
    return res.data;
}

export async function fetchInvoiceById(id: string): Promise<Invoice> {
    const res = await api.get(`/finance/invoices/get-invoice/${id}`);
    return res.data;
}

// ── UPDATE ──────────────────────────────────────────────────────────

export async function updateInvoice(
    id: string,
    data: Partial<Omit<Invoice, "id" | "organizationId" | "createdAt" | "updatedAt">>
): Promise<Invoice> {
    const res = await api.patch(`/finance/invoices/update-invoice/${id}`, data);
    return res.data;
}

// ── UTILITIES ───────────────────────────────────────────────────────

export async function fetchInvoicePdf(id: string): Promise<Blob> {
    const res = await api.get(`/finance/invoices/${id}/pdf`, {
        responseType: "blob",
    });
    return res.data;
}

// ═════════════════════════════════════════════════════════════════════
// EXPENSE ENDPOINTS (EXTENSION)
// ═════════════════════════════════════════════════════════════════════

// ── CREATE ──────────────────────────────────────────────────────────

export async function createExpense(data: {
    clientName: string;
    totalAmount: number;
    type: string;
    dueDate: string;
    submittedBy: string;
    category: Expense["category"];
}): Promise<Expense> {
    const res = await api.post("/finance/expenses/create", data);
    return res.data;
}

// ── READ ────────────────────────────────────────────────────────────

export async function fetchExpenses(filters?: {
    status?: Invoice["status"];
    approvalStatus?: Expense["approvalStatus"];
    category?: Expense["category"];
    clientName?: string;
}): Promise<Expense[]> {
    const params = {
        ...(filters?.status && { status: filters.status }),
        ...(filters?.approvalStatus && { approvalStatus: filters.approvalStatus }),
        ...(filters?.category && { category: filters.category }),
        ...(filters?.clientName && { clientName: filters.clientName }),
    };
    
    const res = await api.get("/finance/expenses/get-expenses", { params });
    return res.data;
}

export async function fetchExpenseById(id: string): Promise<Expense> {
    const res = await api.get(`/finance/expenses/get-expense/${id}`);
    return res.data;
}

// ── UPDATE ──────────────────────────────────────────────────────────

export async function updateExpense(
    id: string,
    data: Partial<Omit<Expense, "id" | "organizationId" | "createdAt" | "updatedAt">>
): Promise<Expense> {
    const res = await api.patch(`/finance/expenses/update-expense/${id}`, data);
    return res.data;
}

// ── ACTIONS ─────────────────────────────────────────────────────────

export async function approveExpense(
    id: string,
    approvalStatus: "APPROVED" | "REIMBURSED"
): Promise<Expense> {
    const res = await api.patch(`/finance/expenses/approve/${id}`, {
        approvalStatus,
    });
    return res.data;
}