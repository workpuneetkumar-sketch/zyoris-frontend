// lib/api/financeApi.ts
import api from "../api";

// ── Types for API Responses ────────────────────────────────────────────────

export interface DashboardSummary {
  totalRevenue: number;
  totalExpenses: number;
  pendingExpenses: number;
  approvedExpenses: number;
  reimbursedExpenses: number;
  outstandingInvoices: number;
}

export interface MonthlyTrend {
  month: string;
  amount: number;
}

export interface CategoryAnalytics {
  _sum: {
    amount: number;
  };
  category: string;
}

export interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  status: 'PENDING' | 'APPROVED' | 'REIMBURSED';
  vendor?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  amount: number;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  dueDate: string;
  issueDate: string;
}

// ── Types for UI Components ────────────────────────────────────────────────

export interface StatCardData {
  title: string;
  value: string;
  type: 'revenue' | 'expense' | 'pending' | 'approved' | 'reimbursed' | 'invoice';
}

export interface ChartDataPoint {
  month: string;
  expenses: number;
}

export interface ExpenseBreakdownPoint {
  name: string;
  value: number;
  percentage: string;
  color: string;
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
  status: 'Received' | 'Paid' | 'Approved' | 'Pending';
}

export interface FinanceDashboardData {
  stats: StatCardData[];
  trendData: ChartDataPoint[];
  expenseBreakdown: ExpenseBreakdownPoint[];
  upcomingPayments: UpcomingPayment[];
  recentTransactions: Transaction[];
  cashFlowData: CashFlowDataPoint[];
}

export interface CashFlowDataPoint {
  month: string;
  inflow: number;
  outflow: number;
}

// ── API Calls ─────────────────────────────────────────────────────────────

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  try {
    const response = await api.get('/finance/expenses/dashboard');
    return response.data;
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    throw error;
  }
}

export async function fetchMonthlyTrend(): Promise<MonthlyTrend[]> {
  try {
    const response = await api.get('/finance/expenses/monthly-trend');
    return response.data;
  } catch (error) {
    console.error('Error fetching monthly trend:', error);
    throw error;
  }
}

export async function fetchCategoryAnalytics(): Promise<CategoryAnalytics[]> {
  try {
    const response = await api.get('/finance/expenses/analytics');
    return response.data;
  } catch (error) {
    console.error('Error fetching category analytics:', error);
    throw error;
  }
}

export async function fetchAllExpenses(): Promise<Expense[]> {
  try {
    const response = await api.get('/finance/expenses/get-expenses');
    return response.data;
  } catch (error) {
    console.error('Error fetching expenses:', error);
    throw error;
  }
}

export async function fetchAllInvoices(): Promise<Invoice[]> {
  try {
    const response = await api.get('/finance/invoices/get-invoices');
    return response.data;
  } catch (error) {
    console.error('Error fetching invoices:', error);
    throw error;
  }
}

// ── Transform API Data to UI Format ───────────────────────────────────────

function formatCurrency(amount: number): string {
  if (amount === 0) return '₹0';
  
  if (amount >= 10000000) {
    const crores = amount / 10000000;
    return `₹${crores.toFixed(1)} Cr`;
  }
  
  if (amount >= 100000) {
    const lakhs = amount / 100000;
    return `₹${lakhs.toFixed(1)} L`;
  }
  
  if (amount >= 1000) {
    const thousands = amount / 1000;
    return `₹${thousands.toFixed(1)}K`;
  }
  
  return `₹${amount.toLocaleString('en-IN')}`;
}

function formatNumber(value: number): string {
  return value.toLocaleString('en-IN');
}

function formatMonthLabel(monthString: string): string {
  const [year, month] = monthString.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleString('default', { month: 'short' });
}

function formatCategoryLabel(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
}

const CATEGORY_COLORS: { [key: string]: string } = {
  'SALARY': '#3b82f6',
  'MARKETING': '#f59e0b',
  'OPERATIONS': '#10b981',
  'TRAVEL': '#8b5cf6',
  'OFFICE': '#ef4444',
  'TECHNOLOGY': '#06b6d4',
  'CONSULTING': '#ec489a',
  'OTHERS': '#6b7280'
};

function getCategoryColor(category: string): string {
  if (CATEGORY_COLORS[category]) {
    return CATEGORY_COLORS[category];
  }
  
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 60%)`;
}

export async function fetchFinanceDashboardData(): Promise<FinanceDashboardData> {
  try {
    const [dashboard, monthlyTrend, categoryAnalytics, expenses, invoices] = await Promise.all([
      fetchDashboardSummary(),
      fetchMonthlyTrend(),
      fetchCategoryAnalytics(),
      fetchAllExpenses(),
      fetchAllInvoices()
    ]);

    // Transform stats data
    const stats: StatCardData[] = [
      {
        title: "Total Revenue",
        value: formatCurrency(dashboard.totalRevenue),
        type: "revenue"
      },
      {
        title: "Total Expenses",
        value: formatCurrency(dashboard.totalExpenses),
        type: "expense"
      },
      {
        title: "Pending Expenses",
        value: formatNumber(dashboard.pendingExpenses),
        type: "pending"
      },
      {
        title: "Approved Expenses",
        value: formatNumber(dashboard.approvedExpenses),
        type: "approved"
      },
      {
        title: "Reimbursed Expenses",
        value: formatNumber(dashboard.reimbursedExpenses),
        type: "reimbursed"
      },
      {
        title: "Outstanding Invoices",
        value: formatCurrency(dashboard.outstandingInvoices),
        type: "invoice"
      }
    ];

    // Transform monthly trend data
    const trendData: ChartDataPoint[] = monthlyTrend.map(item => ({
      month: formatMonthLabel(item.month),
      expenses: item.amount
    }));

    // Transform category analytics
    const totalExpenses = categoryAnalytics.reduce((sum, item) => sum + item._sum.amount, 0);
    const expenseBreakdown: ExpenseBreakdownPoint[] = categoryAnalytics.map(item => {
      const percentage = totalExpenses > 0 
        ? ((item._sum.amount / totalExpenses) * 100).toFixed(1)
        : '0';
      
      return {
        name: formatCategoryLabel(item.category),
        value: item._sum.amount,
        percentage: `${percentage}%`,
        color: getCategoryColor(item.category)
      };
    }).sort((a, b) => b.value - a.value);

    // Transform expenses to upcoming payments
    const pendingExpensesList = expenses.filter(exp => exp.status === 'PENDING');
    const upcomingPayments: UpcomingPayment[] = pendingExpensesList.slice(0, 5).map(exp => ({
      id: exp.id,
      vendor: exp.vendor || exp.description.slice(0, 30),
      amount: formatCurrency(exp.amount),
      dueDate: new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      priority: exp.amount > 100000 ? 'High' : exp.amount > 50000 ? 'Medium' : 'Low'
    }));

    // Transform expenses to recent transactions
    const allTransactions: Transaction[] = [
      ...expenses.map(exp => ({
        id: exp.id,
        date: new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        client: exp.vendor || exp.description,
        category: formatCategoryLabel(exp.category),
        amount: exp.amount,
        status: exp.status === 'PENDING' ? 'Pending' : exp.status === 'APPROVED' ? 'Approved' : 'Paid' as any
      })),
      ...invoices.map(inv => ({
        id: inv.id,
        date: new Date(inv.issueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        client: inv.clientName,
        category: 'Invoice Payment',
        amount: inv.amount,
        status: inv.status === 'PAID' ? 'Received' : 'Pending' as any
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

    const recentTransactions: Transaction[] = allTransactions;

    // Generate cash flow data from monthly trend
    const cashFlowData: CashFlowDataPoint[] = monthlyTrend.map(item => ({
      month: formatMonthLabel(item.month),
      inflow: item.amount * 1.6,
      outflow: item.amount
    }));

    return {
      stats,
      trendData,
      expenseBreakdown,
      upcomingPayments,
      recentTransactions,
      cashFlowData
    };
  } catch (error) {
    console.error('Error fetching finance dashboard data:', error);
    throw error;
  }
}