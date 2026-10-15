// app/(dashboard)/finance/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
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
import { FileText, Receipt, ArrowRight, AlertTriangle, RefreshCw } from 'lucide-react';

export default function FinanceDashboardPage() {
  const [stats, setStats] = useState<StatCardData[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [breakdownData, setBreakdownData] = useState<ExpenseBreakdownPoint[]>([]);
  const [upcomingPayments, setUpcomingPayments] = useState<UpcomingPayment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cashFlowData, setCashFlowData] = useState<CashFlowDataPoint[]>([]);
  const [totalInvoicesCount, setTotalInvoicesCount] = useState(0);
  const [totalExpensesCount, setTotalExpensesCount] = useState(0);
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
      setTotalInvoicesCount(invoices.length);
      setTotalExpensesCount(expenses.length);
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setError(err?.message || 'Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (error) {
    return (
      <div className="p-4 md:p-6 bg-[#f8fafc] min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-rose-100 shadow-md p-8 text-center max-w-md w-full">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Error Loading Finance Data</h3>
          <p className="text-sm text-gray-600 mb-5">{error}</p>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-[#f8fafc] min-h-screen space-y-6">
      {/* Executive Header */}
      <FinanceHeader onRefresh={loadData} isRefreshing={isLoading} />

      {/* Quick-navigation Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link 
          href="/finance/invoices" 
          className="group relative flex items-center justify-between p-4 bg-white border border-gray-100 hover:border-blue-300 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-50 group-hover:bg-blue-600 text-blue-600 group-hover:text-white flex items-center justify-center transition-colors shadow-xs">
              <FileText className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                  Invoices Management
                </h4>
                {totalInvoicesCount > 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/50">
                    {totalInvoicesCount} Records
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Generate client billings, track status & view receivable aging
              </p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-gray-50 group-hover:bg-blue-50 flex items-center justify-center text-gray-400 group-hover:text-blue-600 transition-all shrink-0 ml-3">
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>

        <Link 
          href="/finance/expenses" 
          className="group relative flex items-center justify-between p-4 bg-white border border-gray-100 hover:border-rose-300 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-rose-50 group-hover:bg-rose-600 text-rose-600 group-hover:text-white flex items-center justify-center transition-colors shadow-xs">
              <Receipt className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-gray-900 group-hover:text-rose-600 transition-colors">
                  Expenses & Outflows
                </h4>
                {totalExpensesCount > 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/50">
                    {totalExpensesCount} Recorded
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Submit claims, monitor categories, approvals & reimbursements
              </p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-gray-50 group-hover:bg-rose-50 flex items-center justify-center text-gray-400 group-hover:text-rose-600 transition-all shrink-0 ml-3">
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Primary KPI Stats Cards */}
      <FinanceStatsCards stats={stats} isLoading={isLoading} />

      {/* Row 1: Revenue vs Expenses Trend (2/3) + Expense Breakdown (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center h-[400px] text-gray-400">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                <span>Loading financial trend…</span>
              </div>
            </div>
          ) : (
            <RevenueExpenseChart data={chartData} />
          )}
        </div>

        <div className="lg:col-span-1">
          <ExpenseBreakdownCard data={breakdownData} isLoading={isLoading} />
        </div>
      </div>

      {/* Row 2: Cash Flow Analysis (Full Width) */}
      <div>
        <CashFlowAnalysisChart data={cashFlowData} isLoading={isLoading} />
      </div>

      {/* Row 3: Upcoming Invoices & Recent Ledger Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OutstandingInvoices payments={upcomingPayments} isLoading={isLoading} />
        <RecentTransactions transactions={transactions} isLoading={isLoading} />
      </div>
    </div>
  );
}