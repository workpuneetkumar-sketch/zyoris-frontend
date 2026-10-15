'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ExpenseBreakdownPoint } from '@/lib/api/finance/financeApi';
import { PieChart as PieIcon } from 'lucide-react';

interface ExpenseBreakdownCardProps {
  data?: ExpenseBreakdownPoint[];
  isLoading?: boolean;
}

export const ExpenseBreakdownCard: React.FC<ExpenseBreakdownCardProps> = ({ data = [], isLoading = false }) => {
  const totalExpenses = data.reduce((sum, item) => sum + item.value, 0);
  
  const formatValue = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)} Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)} L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value.toLocaleString('en-IN')}`;
  };

  if (isLoading) {
    return (
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-sm w-full h-[400px] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 bg-gray-100 rounded w-36 animate-pulse" />
          <div className="h-6 bg-gray-100 rounded-full w-20 animate-pulse" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-36 h-36 rounded-full border-4 border-gray-100 border-t-blue-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-sm w-full h-[400px] flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 mb-3">
          <PieIcon className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-gray-700">No Expense Data</h4>
        <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
          Approved and reimbursed expenses will appear categorized here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-sm w-full h-[400px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
            <PieIcon className="w-4 h-4" />
          </div>
          <h3 className="text-base font-bold text-gray-900 tracking-tight">Expense Breakdown</h3>
        </div>
        <span className="text-[11px] font-semibold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-200/60">
          By Category
        </span>
      </div>

      {/* Donut Chart (Compact Center) */}
      <div className="relative w-full h-[150px] flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip 
              formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Amount']}
              contentStyle={{ 
                backgroundColor: '#0f172a', 
                borderRadius: '10px', 
                border: 'none',
                boxShadow: '0 8px 20px -4px rgba(0,0,0,0.25)',
                fontSize: '11px',
                color: '#f8fafc',
                padding: '6px 10px'
              }}
              itemStyle={{ color: '#f8fafc' }}
            />
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="62%"
              outerRadius="88%"
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        
        <div className="absolute flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-base font-bold text-gray-900 leading-tight">
            {formatValue(totalExpenses)}
          </span>
          <span className="text-[10px] text-gray-400 font-medium">
            Total
          </span>
        </div>
      </div>

      {/* Full-width Category Breakdown List (No Truncation!) */}
      <div className="flex-1 overflow-y-auto mt-2 pr-1 space-y-2.5">
        {data.map((item, idx) => {
          const numericPct = parseFloat(item.percentage.replace('%', '')) || 0;
          return (
            <div key={idx} className="group/item">
              <div className="flex items-center justify-between text-xs font-medium mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span 
                    className="w-2.5 h-2.5 rounded-full shrink-0" 
                    style={{ backgroundColor: item.color }} 
                  />
                  <span className="text-gray-800 font-semibold truncate group-hover/item:text-blue-600 transition-colors">
                    {item.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-gray-900 font-bold">
                    {formatValue(item.value)}
                  </span>
                  <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                    {item.percentage}
                  </span>
                </div>
              </div>
              {/* Subtle mini progress bar */}
              <div className="w-full bg-gray-100 rounded-full h-1 overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, numericPct)}%`, backgroundColor: item.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ExpenseBreakdownCard;