// lib/api/financeApi.ts

import api from "@/lib/api/api";

// ── Types ────────────────────────────────────────────────

export type ExpenseCategory = 'TRAVEL' | 'OFFICE' | 'MARKETING' | 'OTHER';

export interface Expense {
  id: string;
  organizationId: string;
  submittedById: string;
  category: ExpenseCategory;
  status: "PENDING" | "APPROVED" | "REIMBURSED";
  amount: number;
  description: string;
  expenseDate: string;
  createdAt: string;
  updatedAt: string;
  submittedBy?: {
    id: string;
    name: string;
    email: string;
    department?: string;
    avatar?: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
    department?: string;
    avatar?: string;
  };
  employee?: {
    id: string;
    name: string;
    email: string;
    department?: string;
    avatar?: string;
    user?: {
      id: string;
      name: string;
      email: string;
      department?: string;
      avatar?: string;
    };
  };
}

export interface CreateExpenseData {
  category: ExpenseCategory;
  amount: number;
  description: string;
  expenseDate: string;
}

export interface UpdateExpenseData {
  category?: ExpenseCategory;
  amount?: number;
  description?: string;
  expenseDate?: string;
  status?: "PENDING" | "APPROVED" | "REIMBURSED";
}

// ── Helper function to extract expense data from response ─

function extractExpenseFromResponse(res: any): Expense {
  let data = res.data?.data || res.data?.expense || res.data;
  if (data?.data) data = data.data;
  if (data?.expense) data = data.expense;
  
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid response from server');
  }
  
  if (!data.submittedBy && (data.user || data.employee)) {
    data.submittedBy = data.user || data.employee;
  }
  
  return data;
}

// Helper to extract user info
export function extractUserInfo(expense: any): { name: string; department: string; avatar: string | null; email: string } {
  const name = expense?.submittedBy?.name || 
               expense?.submittedBy?.user?.name ||
               expense?.user?.name ||
               expense?.employee?.name ||
               expense?.employee?.user?.name ||
               "Unknown User";

  const department = expense?.submittedBy?.department || 
                     expense?.submittedBy?.user?.department ||
                     expense?.user?.department ||
                     expense?.employee?.department ||
                     expense?.employee?.user?.department ||
                     "";

  const avatar = expense?.submittedBy?.avatar || 
                 expense?.submittedBy?.user?.avatar ||
                 expense?.user?.avatar ||
                 expense?.employee?.avatar ||
                 null;

  const email = expense?.submittedBy?.email || 
                expense?.submittedBy?.user?.email ||
                expense?.user?.email ||
                expense?.employee?.email ||
                "";

  return { name, department, avatar, email };
}

// ── Expense Endpoints ───────────────────────────────────

export async function fetchExpenses(filters?: {
  category?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}): Promise<Expense[]> {
  try {
    const params: Record<string, string> = {};
    if (filters?.category && filters.category !== "ALL") params.category = filters.category;
    if (filters?.status && filters.status !== "ALL") params.status = filters.status;
    if (filters?.startDate) params.startDate = filters.startDate;
    if (filters?.endDate) params.endDate = filters.endDate;

    const res = await api.get("/finance/expenses/get-expenses", { params });

    let data = res.data?.data || res.data;
    
    if (data?.expenses && Array.isArray(data.expenses)) {
      return data.expenses.map((exp: any) => ({
        ...exp,
        submittedBy: exp.submittedBy || exp.user || exp.employee || null
      }));
    }
    
    if (Array.isArray(data)) {
      return data.map((exp: any) => ({
        ...exp,
        submittedBy: exp.submittedBy || exp.user || exp.employee || null
      }));
    }

    return [];
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to fetch expenses');
  }
}

export async function createExpense(data: CreateExpenseData): Promise<Expense> {
  try {
    const payload = {
      category: data.category,
      amount: Number(data.amount),
      description: data.description.trim(),
      expenseDate: data.expenseDate,
    };

    const res = await api.post("/finance/expenses/create", payload);
    return extractExpenseFromResponse(res);
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to create expense');
  }
}

export async function fetchExpenseById(id: string): Promise<Expense> {
  try {
    const res = await api.get(`/finance/expenses/get-expense/${id}`);
    return extractExpenseFromResponse(res);
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error('Expense not found');
    }
    throw new Error(error.response?.data?.message || 'Failed to fetch expense');
  }
}

export async function updateExpense(
  id: string,
  data: UpdateExpenseData
): Promise<Expense> {
  try {
    const payload: Record<string, any> = {};
    
    if (data.category !== undefined) payload.category = data.category;
    if (data.amount !== undefined) payload.amount = Number(data.amount);
    if (data.description !== undefined) payload.description = data.description;
    if (data.expenseDate !== undefined) payload.expenseDate = data.expenseDate;
    if (data.status !== undefined) payload.status = data.status;

    const res = await api.patch(`/finance/expenses/update-expense/${id}`, payload);
    return extractExpenseFromResponse(res);
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to update expense');
  }
}

// DELETE endpoint
export async function deleteExpense(id: string): Promise<void> {
  try {
    await api.delete(`/finance/expenses/delete-expense/${id}`);
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to delete expense');
  }
}

export async function approveExpense(id: string): Promise<Expense> {
  try {
    const res = await api.patch(`/finance/expenses/approve/${id}`);
    return extractExpenseFromResponse(res);
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to approve expense');
  }
}

export async function reimburseExpense(id: string): Promise<Expense> {
  try {
    const res = await api.patch(`/finance/expenses/reimburse/${id}`);
    return extractExpenseFromResponse(res);
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to reimburse expense');
  }
}