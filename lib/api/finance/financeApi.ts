import api from "@/lib/api/api";
import { getInvoices } from './invoicesApi';   // for dashboard & chart
// import type { Invoice } from './invoicesApi';

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
export interface UpcomingPayment {
  id: string;
  vendor: string;      
  amount: string;     
  dueDate: string;    
  priority: 'High' | 'Medium' | 'Low';
}
export interface Transaction {
  id: string;
  date: string;           
  client: string;         
  category: string;      
  amount: number;
  status: 'Received' | 'Paid' | 'Approved'; 
}
export interface CreateExpenseData {
  category: ExpenseCategory;
  amount: number;
  description: string;
  expenseDate: string;
}
export interface ExpenseBreakdownPoint {
  name: string;
  value: number;
  color: string;
  percentage: string;
}

export interface UpdateExpenseData {
  category?: ExpenseCategory;
  amount?: number;
  description?: string;
  expenseDate?: string;
  status?: "PENDING" | "APPROVED" | "REIMBURSED";
}

export interface StatCardData {
  title: string;
  value: string;
  change: string;
  subtext: string;
  type: 'revenue' | 'expense' | 'profit' | 'invoice' | 'cashflow';
}
export interface CashFlowDataPoint {
  month: string;
  inflow: number;
  outflow: number;
}

export interface ChartDataPoint {
  month: string;    // e.g. "Jan"
  revenue: number;  // in Crores
  expenses: number; // in Crores
}

// ── Helper: extract expense data from API response ──────
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

// ── Expense CRUD ────────────────────────────────────────
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
export function computeUpcomingPayments(
  invoices: Invoice[]
): UpcomingPayment[] {
  const now = new Date();

  const priorityFromInvoice = (
    status: string,
    dueDateStr: string
  ): 'High' | 'Medium' | 'Low' => {
    if (status === 'OVERDUE') return 'High';
    const due = new Date(dueDateStr);
    const diffDays = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays <= 7) return 'Medium';
    return 'Low';
  };

  // Keep only invoices that are not PAID
  const pending = invoices.filter(inv => inv.status !== 'PAID');

  // Sort by due date ascending
  pending.sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  return pending.map(inv => {
    const due = new Date(inv.dueDate);
    const formattedDue = due.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    const formatAmount = (amount: number) => {
      if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)} Cr`;
      if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} L`;
      return `₹${amount.toLocaleString('en-IN')}`;
    };

    return {
      id: inv.id,
      vendor: inv.clientName,
      amount: formatAmount(inv.totalAmount),
      dueDate: formattedDue,
      priority: priorityFromInvoice(inv.status, inv.dueDate),
    };
  });
}
export function computeCashFlowData(
  expenses: Expense[],
  invoices: Invoice[]
): CashFlowDataPoint[] {
  const monthlyMap: Record<string, { inflow: number; outflow: number }> = {};

  const toMonth = (dateStr: string): string => {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', { month: 'short' }); // "Jan", "Feb" …
  };

  // Inflow = revenue from paid invoices
  invoices
    .filter(inv => inv.status === 'PAID')
    .forEach(inv => {
      const month = toMonth(inv.createdAt);   // or dueDate
      if (!monthlyMap[month]) monthlyMap[month] = { inflow: 0, outflow: 0 };
      monthlyMap[month].inflow += inv.totalAmount;
    });

  // Outflow = approved/reimbursed expenses
  expenses
    .filter(exp => exp.status === 'APPROVED' || exp.status === 'REIMBURSED')
    .forEach(exp => {
      const month = toMonth(exp.expenseDate);
      if (!monthlyMap[month]) monthlyMap[month] = { inflow: 0, outflow: 0 };
      monthlyMap[month].outflow += exp.amount;
    });

  const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return monthOrder
    .filter(m => monthlyMap[m])
    .map(month => ({
      month,
      inflow: monthlyMap[month].inflow,
      outflow: monthlyMap[month].outflow,
    }));
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

export function computeRecentTransactions(
  expenses: Expense[],
  invoices: Invoice[]
): Transaction[] {
  const txns: Transaction[] = [];

  // 1. Paid invoices → "Received"
  invoices
    .filter(inv => inv.status === 'PAID')
    .forEach(inv => {
      const d = new Date(inv.createdAt);
      const dateStr = d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      txns.push({
        id: inv.id,
        date: dateStr,
        client: inv.clientName || 'Unknown Client',
        category: 'Invoice',
        amount: inv.totalAmount,
        status: 'Received',
      });
    });

  // 2. Expenses (APPROVED / REIMBURSED) → "Paid"
  expenses
    .filter(exp => exp.status === 'APPROVED' || exp.status === 'REIMBURSED')
    .forEach(exp => {
      const d = new Date(exp.expenseDate);
      const dateStr = d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      txns.push({
        id: exp.id,
        date: dateStr,
        client: exp.description || 'Expense',
        category: exp.category,
        amount: exp.amount,
        status: 'Paid',       // treated as outgoing
      });
    });

  // Sort by date descending (most recent first)
  txns.sort((a, b) => {
    const da = new Date(a.date);
    const db = new Date(b.date);
    return db.getTime() - da.getTime();
  });

  return txns;
}
export function computeExpenseBreakdown(expenses: Expense[]): ExpenseBreakdownPoint[] {
  const categoryColors: Record<string, string> = {
    TRAVEL: '#f59e0b',   // amber
    OFFICE: '#3b82f6',   // blue
    MARKETING: '#8b5cf6', // purple
    OTHER: '#6b7280',    // gray
  };
  const categoryTotals: Record<string, number> = {};
  const totalAmount = expenses
    .filter(exp => exp.status === 'APPROVED' || exp.status === 'REIMBURSED')
    .reduce((sum, exp) => {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
      return sum + exp.amount;
    }, 0);
  if (totalAmount === 0) return [];
  return Object.entries(categoryTotals).map(([category, amount]) => ({
    name: category.charAt(0) + category.slice(1).toLowerCase(),
    value: amount,
    color: categoryColors[category] || '#6b7280',
    percentage: `${((amount / totalAmount) * 100).toFixed(1)}%`,
  }));
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

export async function updateExpense(id: string, data: UpdateExpenseData): Promise<Expense> {
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

// ── Dashboard Computation (no dedicated API) ────────────
export async function fetchFinanceDashboardData(): Promise<StatCardData[]> {
  // 1. Fetch all expenses and invoices
  const [expenses, invoices] = await Promise.all([
    fetchExpenses(),
    getInvoices(),
  ]);

  // 2. Revenue: only PAID invoices
  const paidInvoices = invoices.filter(inv => inv.status === 'PAID');
  const totalRevenue = paidInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const revenueChange = '';
  const revenueSubtext = `${paidInvoices.length} paid invoices`;

  // 3. Expenses: only APPROVED or REIMBURSED
  const realisedExpenses = expenses.filter(
    exp => exp.status === 'APPROVED' || exp.status === 'REIMBURSED'
  );
  const totalExpenses = realisedExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const expenseChange = '';
  const expenseSubtext = `${realisedExpenses.length} expenses`;

  // 4. Net Profit
  const netProfit = totalRevenue - totalExpenses;
  const profitSubtext = 'Revenue - Expenses';

  // 5. Invoice count
  const invoiceCount = invoices.length;
  const invoiceSubtext = `${paidInvoices.length} paid, ${invoices.length - paidInvoices.length} pending`;

  // 6. Cash Flow (simplified)
  const cashFlow = netProfit;
  const cashflowSubtext = 'Net cash movement';

  return [
    {
      title: 'Total Revenue',
      value: `₹${totalRevenue.toLocaleString()}`,
      change: revenueChange,
      subtext: revenueSubtext,
      type: 'revenue',
    },
    {
      title: 'Total Expenses',
      value: `₹${totalExpenses.toLocaleString()}`,
      change: expenseChange,
      subtext: expenseSubtext,
      type: 'expense',
    },
    {
      title: 'Net Profit',
      value: `₹${netProfit.toLocaleString()}`,
      change: '',
      subtext: profitSubtext,
      type: 'profit',
    },
    {
      title: 'Invoices',
      value: invoiceCount.toString(),
      change: '',
      subtext: invoiceSubtext,
      type: 'invoice',
    },
    {
      title: 'Cash Flow',
      value: `₹${cashFlow.toLocaleString()}`,
      change: '',
      subtext: cashflowSubtext,
      type: 'cashflow',
    },
  ];
}

// ── Monthly Trend for Chart ─────────────────────────────
export function computeMonthlyTrend(
  expenses: Expense[],
  invoices: Invoice[]
): ChartDataPoint[] {
  const monthlyMap: Record<string, { revenue: number; expenses: number }> = {};

  const toMonth = (dateStr: string): string => {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', { month: 'short' }); // "Jan", "Feb", ...
  };

  // Revenue from paid invoices (using createdAt or dueDate)
  invoices
    .filter(inv => inv.status === 'PAID')
    .forEach(inv => {
      const month = toMonth(inv.createdAt);  // you can change to dueDate
      if (!monthlyMap[month]) monthlyMap[month] = { revenue: 0, expenses: 0 };
      monthlyMap[month].revenue += inv.totalAmount;
    });

  // Expenses from approved/reimbursed
  expenses
    .filter(exp => exp.status === 'APPROVED' || exp.status === 'REIMBURSED')
    .forEach(exp => {
      const month = toMonth(exp.expenseDate);
      if (!monthlyMap[month]) monthlyMap[month] = { revenue: 0, expenses: 0 };
      monthlyMap[month].expenses += exp.amount;
    });

  // Order by calendar month
  const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return monthOrder
    .filter(m => monthlyMap[m])
    .map(month => ({
      month,
      revenue: parseFloat((monthlyMap[month].revenue / 1e7).toFixed(2)),   // in Cr
      expenses: parseFloat((monthlyMap[month].expenses / 1e7).toFixed(2)),
    }));
}

// (Invoice type is needed here, so we import it from invoicesApi)
import type { Invoice } from './invoicesApi';