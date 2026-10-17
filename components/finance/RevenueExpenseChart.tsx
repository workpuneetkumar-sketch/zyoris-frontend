'use client';

import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { ChartDataPoint } from '@/lib/api/finance/financeApi';
import { TrendingUp, Calendar } from 'lucide-react';

interface RevenueExpenseChartProps {
  data: ChartDataPoint[];
}

export const RevenueExpenseChart: React.FC<RevenueExpenseChartProps> = ({ data }) => {
  const formatYAxis = (value: number) => {
    if (Math.abs(value) >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (Math.abs(value) >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (Math.abs(value) >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
    return `₹${value}`;
  };

  const formatTooltipValue = (value: any) => {
    const num = Number(value) || 0;
    return [`₹${num.toLocaleString('en-IN')}`];
  };

  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-sm w-full h-[400px] flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 tracking-tight">Revenue vs Expenses Trend</h3>
            <p className="text-xs text-gray-400">Monthly breakdown of recorded inflows & outflows</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200/60 text-xs font-semibold text-gray-600">
          <Calendar className="w-3.5 h-3.5 text-gray-400" />
          <span>Current Year</span>
        </div>
      </div>

      {/* Chart container */}
      <div className="flex-1 w-full min-h-[0]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }}
              dy={6}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }}
              tickFormatter={formatYAxis}
              width={65}
            />
            <Tooltip
              contentStyle={{ 
                backgroundColor: '#0f172a', 
                borderRadius: '12px', 
                border: 'none',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                padding: '10px 14px',
                color: '#f8fafc'
              }}
              itemStyle={{ fontSize: '12px', fontWeight: 600 }}
              labelStyle={{ color: '#94a3b8', fontSize: '11px', marginBottom: '4px', fontWeight: 500 }}
              formatter={formatTooltipValue}
            />
            <Legend
              verticalAlign="top"
              align="right"
              height={36}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '12px', paddingBottom: '12px', fontWeight: 600 }}
            />
            <Line
              name="Revenue"
              type="monotone"
              dataKey="revenue"
              stroke="#2563eb"
              strokeWidth={3}
              dot={{ r: 4, stroke: '#2563eb', strokeWidth: 2, fill: '#ffffff' }}
              activeDot={{ r: 6, stroke: '#2563eb', strokeWidth: 3, fill: '#ffffff' }}
            />
            <Line
              name="Expenses"
              type="monotone"
              dataKey="expenses"
              stroke="#ef4444"
              strokeWidth={3}
              dot={{ r: 4, stroke: '#ef4444', strokeWidth: 2, fill: '#ffffff' }}
              activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 3, fill: '#ffffff' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};