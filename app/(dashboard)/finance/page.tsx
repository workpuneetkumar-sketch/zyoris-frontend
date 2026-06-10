// app/finance/page.tsx
import { fetchFinanceDashboardData } from '@/lib/api/financeApi';
import FinanceHeader from '@/components/finance/FinanceHeader';
import { FinanceStatsCards } from '@/components/finance/FinanceStatsCards';
import { RevenueExpenseChart } from '@/components/finance/RevenueExpenseChart';
import { ProfitMarginCard } from '@/components/finance/ProfitMarginCard';
import { OutstandingInvoices } from '@/components/finance/OutstandingInvoices';
import { RecentTransactions } from '@/components/finance/RecentTransactions';
import { CashFlowAnalysisChart } from '@/components/finance/CashFlowAnalysisChart';

export default async function FinanceDashboardPage() {
  // Fetch data cleanly on Server Component
  const dashboardData = await fetchFinanceDashboardData();

  return (
    <div className="p-4 md:p-6 bg-[#f8fafc] min-h-screen space-y-6">
      {/* Finance Header with Real Data */}
      <FinanceHeader />

      {/* KPI Cards Row */}
      <FinanceStatsCards stats={dashboardData.stats} />

      {/* Revenue vs Expenses + Expense Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 w-full">
          <RevenueExpenseChart data={dashboardData.trendData} />
        </div>
        <div className="w-full">
          <ProfitMarginCard data={dashboardData.expenseBreakdown} />
        </div>
      </div>

      {/* Cash Flow Analysis Chart */}
      <div className="w-full">
        <CashFlowAnalysisChart />
      </div>

      {/* Recent Transactions + Upcoming Payments Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-2">
          <RecentTransactions />
        </div>
        <div className="w-full">
          <OutstandingInvoices payments={dashboardData.upcomingPayments} />
        </div>
      </div>
    </div>
  );
}