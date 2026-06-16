// app/finance/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';                                       // <-- Next.js Link
import {
  fetchFinanceDashboardData,
  fetchExpenses,
  computeMonthlyTrend,
  computeExpenseBreakdown,
  computeUpcomingPayments,
  computeRecentTransactions,
  computeCashFlowData,
  StatCardData,
  ChartDataPoint,
  ExpenseBreakdownPoint,
  UpcomingPayment,
  Transaction,
  CashFlowDataPoint,
} from '@/lib/api/finance/financeApi';
import { getInvoices } from '@/lib/api/finance/invoicesApi';
import FinanceHeader from '@/components/finance/FinanceHeader';
import { FinanceStatsCards } from '@/components/finance/FinanceStatsCards';
import { RevenueExpenseChart } from '@/components/finance/RevenueExpenseChart';
import { ExpenseBreakdownCard } from '@/components/finance/ProfitMarginCard';
import { OutstandingInvoices } from '@/components/finance/OutstandingInvoices';
import { RecentTransactions } from '@/components/finance/RecentTransactions';
import { CashFlowAnalysisChart } from '@/components/finance/CashFlowAnalysisChart';
import { FileText, Receipt, ArrowRight } from 'lucide-react';

export default function FinanceDashboardPage() {
  const [stats, setStats] = useState<StatCardData[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [breakdownData, setBreakdownData] = useState<ExpenseBreakdownPoint[]>([]);
  const [upcomingPayments, setUpcomingPayments] = useState<UpcomingPayment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cashFlowData, setCashFlowData] = useState<CashFlowDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [dashboardStats, expenses, invoices] = await Promise.all([
        fetchFinanceDashboardData(),
        fetchExpenses(),
        getInvoices(),
      ]);

      setStats(dashboardStats);
      setChartData(computeMonthlyTrend(expenses, invoices));
      setBreakdownData(computeExpenseBreakdown(expenses));
      setUpcomingPayments(computeUpcomingPayments(invoices));
      setTransactions(computeRecentTransactions(expenses, invoices));
      setCashFlowData(computeCashFlowData(expenses, invoices));
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (error) {
    return (
      <div className="p-4 md:p-6 bg-[#f8fafc] min-h-screen">
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-8 text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Dashboard</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-[#f8fafc] min-h-screen space-y-6">
      <FinanceHeader />

      {/* Quick‑navigation links (client‑side, no reload) */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/finance/invoices" className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-100 transition-all group">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <FileText className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-800">Invoices</p>
              <p className="text-xs text-gray-400">Manage & create invoices</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-blue-600 transition-colors" />
        </Link>

        <Link href="/finance/expenses" className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-rose-100 transition-all group">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
              <Receipt className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-800">Expenses</p>
              <p className="text-xs text-gray-400">View & track expenses</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-rose-600 transition-colors" />
        </Link>
      </div>

      <FinanceStatsCards stats={stats} isLoading={isLoading} />

      {/* Row 1: Revenue vs Expenses (2/3) + Expense Breakdown (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center h-[400px] text-gray-400">
              Loading chart…
            </div>
          ) : chartData.length > 0 ? (
            <RevenueExpenseChart data={chartData} />
          ) : (
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center h-[400px] text-gray-400">
              No data available for trend
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <ExpenseBreakdownCard data={breakdownData} isLoading={isLoading} />
        </div>
      </div>

      {/* Row 2: Cash Flow Analysis (full width) */}
      <div>
        <CashFlowAnalysisChart data={cashFlowData} isLoading={isLoading} />
      </div>

      {/* Row 3: Upcoming Payments + Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OutstandingInvoices payments={upcomingPayments} isLoading={isLoading} />
        <RecentTransactions transactions={transactions} isLoading={isLoading} />
      </div>
    </div>
  );
}