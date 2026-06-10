// lib/api/financeApi.ts
// Types for Finance Dashboard Data
export interface StatCardData {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
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
  dueDate: string;
  amount: string;
  priority: 'High' | 'Medium' | 'Low';
}

export interface FinanceDashboardResponse {
  stats: StatCardData[];
  trendData: ChartDataPoint[];
  expenseBreakdown: ExpenseBreakdownPoint[];
  upcomingPayments: UpcomingPayment[];
}

/**
 * Fetch Finance Dashboard Data
 * TODO: Replace with Prashant's /finance/dashboard API when active
 */
export const fetchFinanceDashboardData = async (): Promise<FinanceDashboardResponse> => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/finance/dashboard`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 300 }, // 5 minutes cache
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    return await response.json();
  } catch (error) {
    console.warn("Backend API not active yet, falling back to demo data.", error);
    return getDemoData();
  }
};

// Demo/Static Data matching the provided screenshot
const getDemoData = (): FinanceDashboardResponse => {
  return {
    stats: [
      { title: 'Total Revenue', value: '₹12.8 Cr', change: '↑ 10%', isPositive: true, subtext: 'this month', type: 'revenue' },
      { title: 'Total Expenses', value: '₹4.3 Cr', change: '↑ 6%', isPositive: false, subtext: 'this month', type: 'expense' },
      { title: 'Net Profit', value: '₹8.5 Cr', change: '↑ 24%', isPositive: true, subtext: 'this month', type: 'profit' },
      { title: 'Outstanding Invoices', value: '52.4 L', change: '48 invoices', isPositive: true, subtext: '', type: 'invoice' },
      { title: 'Cash Flow', value: 'Positive', change: '↑ 1.2 Cr available', isPositive: true, subtext: '', type: 'cashflow' },
    ],
    trendData: [
      { month: 'Jan', revenue: 10.2, expenses: 4.1 },
      { month: 'Feb', revenue: 12.1, expenses: 4.3 },
      { month: 'Mar', revenue: 11.4, expenses: 4.8 },
      { month: 'Apr', revenue: 13.5, expenses: 5.2 },
      { month: 'May', revenue: 15.1, expenses: 5.9 },
      { month: 'Jun', revenue: 13.2, expenses: 5.1 },
      { month: 'Jul', revenue: 14.4, expenses: 5.4 },
      { month: 'Aug', revenue: 15.8, expenses: 5.6 },
      { month: 'Sep', revenue: 14.2, expenses: 5.8 },
      { month: 'Oct', revenue: 15.9, expenses: 6.1 },
      { month: 'Nov', revenue: 14.8, expenses: 5.4 },
      { month: 'Dec', revenue: 15.2, expenses: 5.9 },
    ],
    expenseBreakdown: [
      { name: 'Payroll', value: 1.45, percentage: '33.7%', color: '#3b82f6' },
      { name: 'Marketing', value: 0.85, percentage: '19.8%', color: '#ef4444' },
      { name: 'Operations', value: 0.78, percentage: '18.1%', color: '#10b981' },
      { name: 'Software', value: 0.52, percentage: '12.1%', color: '#f59e0b' },
      { name: 'Incentivators', value: 0.41, percentage: '9.5%', color: '#8b5cf6' },
      { name: 'Mechanisms', value: 0.29, percentage: '6.8%', color: '#6b7280' },
    ],
    upcomingPayments: [
      { id: '1', vendor: 'AWS India Pvt Ltd', dueDate: 'Jun 03, 2024', amount: '₹35,000', priority: 'High' },
      { id: '2', vendor: 'Adobe Systems', dueDate: 'Jun 07, 2024', amount: '₹25,500', priority: 'Medium' },
      { id: '3', vendor: 'Rent Payment - Office', dueDate: 'Jun 10, 2024', amount: '₹2,50,000', priority: 'High' },
      { id: '4', vendor: 'Zoho Corporation', dueDate: 'Jun 12, 2024', amount: '₹15,000', priority: 'Low' },
      { id: '5', vendor: 'Electricity Bill', dueDate: 'Jun 18, 2024', amount: '₹8,250', priority: 'Low' },
    ]
  };
};