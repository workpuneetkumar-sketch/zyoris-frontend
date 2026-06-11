// lib/api/finance/financeApi.ts

import api from "../api";

// ── Types ────────────────────────────────────────────────

export interface StatCardData {
  title: string;
  value: string;
  change: string;
  subtext: string;
  type: 'revenue' | 'expense' | 'profit' | 'invoice' | 'cashflow';
}

export interface ChartDataPoint {
  month: string;
  revenue: number;
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

export interface FinanceDashboardData {
  stats: StatCardData[];
  trendData: ChartDataPoint[];
  expenseBreakdown: ExpenseBreakdownPoint[];
  upcomingPayments: UpcomingPayment[];
}

// ── Demo Data ────────────────────────────────────────────

const DEMO_FINANCE_DASHBOARD: FinanceDashboardData = {
  stats: [
    {
      title: "Total Revenue",
      value: "₹24.8 Cr",
      change: "+12.5%",
      subtext: "vs last year",
      type: "revenue"
    },
    {
      title: "Total Expenses",
      value: "₹9.1 Cr",
      change: "+8.2%",
      subtext: "vs last year",
      type: "expense"
    },
    {
      title: "Net Profit",
      value: "₹15.7 Cr",
      change: "+15.3%",
      subtext: "vs last year",
      type: "profit"
    },
    {
      title: "Pending Invoices",
      value: "₹3.2 Cr",
      change: "-5.1%",
      subtext: "from last month",
      type: "invoice"
    },
    {
      title: "Cash Flow",
      value: "₹8.4 Cr",
      change: "Positive",
      subtext: "current month",
      type: "cashflow"
    }
  ],
  trendData: [
    { month: "Jan", revenue: 18.2, expenses: 7.8 },
    { month: "Feb", revenue: 19.5, expenses: 8.2 },
    { month: "Mar", revenue: 21.1, expenses: 8.9 },
    { month: "Apr", revenue: 20.8, expenses: 8.5 },
    { month: "May", revenue: 22.4, expenses: 9.1 },
    { month: "Jun", revenue: 23.6, expenses: 9.3 },
    { month: "Jul", revenue: 24.8, expenses: 9.6 },
    { month: "Aug", revenue: 23.9, expenses: 9.2 },
    { month: "Sep", revenue: 25.1, expenses: 9.7 },
    { month: "Oct", revenue: 26.3, expenses: 10.1 },
    { month: "Nov", revenue: 25.8, expenses: 9.8 },
    { month: "Dec", revenue: 27.2, expenses: 10.3 }
  ],
  expenseBreakdown: [
    { name: "Salaries", value: 3.8, percentage: "38%", color: "#3b82f6" },
    { name: "Marketing", value: 2.1, percentage: "21%", color: "#f59e0b" },
    { name: "Operations", value: 1.5, percentage: "15%", color: "#10b981" },
    { name: "Technology", value: 1.2, percentage: "12%", color: "#8b5cf6" },
    { name: "Others", value: 1.4, percentage: "14%", color: "#ef4444" }
  ],
  upcomingPayments: [
    { id: "PAY-001", vendor: "Cloud Services Ltd", amount: "₹1,25,000", dueDate: "Dec 15, 2024", priority: "High" },
    { id: "PAY-002", vendor: "Marketing Agency", amount: "₹85,000", dueDate: "Dec 18, 2024", priority: "Medium" },
    { id: "PAY-003", vendor: "Office Supplies Co", amount: "₹42,500", dueDate: "Dec 20, 2024", priority: "Low" },
    { id: "PAY-004", vendor: "Consulting Firm", amount: "₹2,10,000", dueDate: "Dec 22, 2024", priority: "High" },
    { id: "PAY-005", vendor: "IT Support", amount: "₹65,000", dueDate: "Dec 25, 2024", priority: "Medium" }
  ]
};

// ── Fetch Finance Dashboard Data ─────────────────────────

export async function fetchFinanceDashboardData(): Promise<FinanceDashboardData> {
  // Always use demo data - no API call needed
  return DEMO_FINANCE_DASHBOARD;
}