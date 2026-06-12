'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ExpenseBreakdownPoint } from '@/lib/api/finance/financeApi';

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
    return `₹${value}`;
  };

  if (isLoading) {
    return (
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm w-full h-auto min-h-[400px] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
          <div className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div>
        </div>
        <div className="flex-1 bg-gray-100 rounded animate-pulse"></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm w-full h-auto min-h-[400px] flex flex-col items-center justify-center">
        <p className="text-gray-500">No expense data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm w-full h-auto min-h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-4 sm:mb-2">
        <h3 className="text-base font-bold text-gray-900">Expense Breakdown</h3>
        <div className="text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 font-medium">
          By Category
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between flex-1 gap-6 md:gap-4">
        <div className="w-full md:w-1/2 h-[220px] sm:h-[260px] md:h-[280px] relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip 
                formatter={(value: any) => [formatValue(value), 'Amount']}
                contentStyle={{ 
                  backgroundColor: '#ffffff', 
                  borderRadius: '12px', 
                  border: '1px solid #f3f4f6',
                  fontSize: '12px',
                  padding: '8px 12px'
                }}
              />
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius="60%"
                outerRadius="85%"
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          
          <div className="absolute flex flex-col items-center justify-center pointer-events-none text-center px-2">
            <span className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
              {formatValue(totalExpenses)}
            </span>
            <span className="text-[10px] sm:text-xs text-gray-400 font-medium mt-0.5">
              Total Expenses
            </span>
          </div>
        </div>

        <div className="w-full md:w-1/2 space-y-2 sm:space-y-2.5 overflow-y-auto max-h-[200px] sm:max-h-[240px] md:max-h-[280px] pr-1 sm:pr-2">
          {data.map((item, idx) => (
            <div 
              key={idx} 
              className="flex items-center justify-between text-xs sm:text-sm font-medium py-1 border-b border-gray-50 last:border-0"
            >
              <div className="flex items-center space-x-2 min-w-0 flex-1">
                <span 
                  className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: item.color }} 
                />
                <span className="text-gray-700 truncate">{item.name}</span>
              </div>
              <div className="text-gray-500 space-x-1 flex-shrink-0 ml-2">
                <span className="text-gray-900 font-semibold">{formatValue(item.value)}</span>
                <span className="text-gray-400 text-[10px] sm:text-xs">({item.percentage})</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExpenseBreakdownCard;