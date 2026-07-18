"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, TrendingUp, Loader2 } from 'lucide-react';
import { fetchPayslips } from '@/lib/api/payrollApi';

export default function PayrollOverview() {
  const [totalPayroll, setTotalPayroll] = useState(0);
  const [trendPct, setTrendPct] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const payslips = await fetchPayslips();

        const total = payslips.reduce((sum, r) => sum + r.grossEarnings, 0);

        const now = new Date();
        const monthLabel = now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        setCurrentMonth(monthLabel);

        const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

        const currentTotal = payslips
          .filter(r => r.month === currentMonthStr)
          .reduce((sum, r) => sum + r.grossEarnings, 0);
        const prevTotal = payslips
          .filter(r => r.month === prevMonthStr)
          .reduce((sum, r) => sum + r.grossEarnings, 0);

        const trend = prevTotal > 0 ? Math.round(((currentTotal - prevTotal) / prevTotal) * 1000) / 10 : 0;
        setTrendPct(trend);
        setTotalPayroll(total);
      } catch (err) {
        console.error("Failed to load payroll overview:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const [chartData, setChartData] = useState<{ label: string; value: number }[]>([]);

  useEffect(() => {
    if (!loading) {
      fetchPayslips().then((payslips) => {
        const monthlyMap: Record<string, number> = {};
        payslips.forEach((r) => {
          monthlyMap[r.month] = (monthlyMap[r.month] || 0) + r.grossEarnings;
        });

        const sortedMonths = Object.keys(monthlyMap).sort();
        const last6Months = sortedMonths.slice(-6);

        const data = last6Months.map((month) => {
          const [year, m] = month.split('-');
          const date = new Date(parseInt(year), parseInt(m) - 1, 1);
          return {
            label: date.toLocaleDateString('en-US', { month: 'short' }),
            value: monthlyMap[month],
          };
        });

        setChartData(data.length > 0 ? data : []);
      }).catch(() => {});
    }
  }, [loading]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const maxChartValue = Math.max(...chartData.map(d => d.value), 1);

  function getChartHeight(value: number): number {
    return Math.max(5, (value / maxChartValue) * 100);
  }

  return (
    <div className="bg-white border border-slate-100 rounded-xl p-4 sm:p-6 flex flex-col h-full shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-center mb-3 sm:mb-4">
        <h2 className="text-sm sm:text-base font-semibold text-slate-800">Payroll Overview</h2>
        <button className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 border border-slate-200 rounded-lg text-[11px] sm:text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          {currentMonth || 'Loading...'}
          <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" />
        </button>
      </div>

      {/* Stats */}
      <div className="mb-4 sm:mb-6">
        <p className="text-[10px] sm:text-xs text-slate-500 mb-1">Total Payroll Cost</p>
        <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
          {loading ? (
            <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
          ) : (
            <>
              <span className="text-xl sm:text-2xl font-bold text-slate-800">{formatCurrency(totalPayroll)}</span>
              {trendPct !== 0 && (
                <span className={`flex items-center text-[10px] sm:text-xs font-medium ${trendPct > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  <TrendingUp className={`w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1 ${trendPct < 0 ? 'rotate-180' : ''}`} />
                  {Math.abs(trendPct)}%
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* SVG Chart */}
      <div className="flex-1 w-full relative min-h-[120px] sm:min-h-[140px]">
        {/* Y-Axis Labels */}
        <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[8px] sm:text-[10px] text-slate-400">
          <span>{formatCurrency(maxChartValue)}</span>
          <span>{formatCurrency(Math.round(maxChartValue / 2))}</span>
          <span>$0</span>
        </div>

        {/* Graph Area */}
        <div className="absolute left-14 sm:left-16 right-0 top-2 bottom-6">
          {/* Horizontal Grid Lines */}
          <div className="absolute inset-0 flex flex-col justify-between">
            <div className="w-full h-px bg-slate-50"></div>
            <div className="w-full h-px bg-slate-50"></div>
            <div className="w-full h-px bg-slate-50"></div>
            <div className="w-full h-px bg-slate-50"></div>
          </div>

          {/* Bar Chart */}
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[10px] text-slate-400">
              No payroll data available
            </div>
          ) : (
            <div className="absolute inset-0 flex items-end gap-2 sm:gap-3 px-1">
              {chartData.map((item) => (
                <div key={item.label} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <div
                    className="w-full bg-purple-500/80 rounded-t-md hover:bg-purple-600 transition-all"
                    style={{ height: `${getChartHeight(item.value)}%` }}
                    title={`${item.label}: ${formatCurrency(item.value)}`}
                  />
                  <span className="text-[8px] sm:text-[10px] text-slate-400 text-center truncate w-full">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Action */}
      <Link href="/hr/payroll">
      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-100 flex justify-between items-center cursor-pointer group">
        <span className="text-xs sm:text-sm font-medium text-blue-600 group-hover:text-blue-700 transition-colors">
          View Payroll Summary
        </span>
        <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 group-hover:text-blue-700 group-hover:translate-x-1 transition-all" />
      </div>
      </Link>
    </div>
  );
}