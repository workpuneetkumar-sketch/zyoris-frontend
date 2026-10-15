// components/finance/CashFlowAnalysisChart.tsx
'use client';

import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { CashFlowDataPoint } from '@/lib/api/finance/financeApi';
import { ArrowLeftRight, Calendar } from 'lucide-react';

interface CashFlowAnalysisChartProps {
  data?: CashFlowDataPoint[];
  isLoading?: boolean;
}

export const CashFlowAnalysisChart: React.FC<CashFlowAnalysisChartProps> = ({ data = [], isLoading = false }) => {
  const formatYAxis = (value: number) => {
    if (Math.abs(value) >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (Math.abs(value) >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (Math.abs(value) >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
    return `₹${value}`;
  };

  const formatTooltip = (value: any) => {
    const num = Number(value) || 0;
    return [`₹${num.toLocaleString('en-IN')}`, ''];
  };

  if (isLoading) {
    return (
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-sm w-full h-[380px] flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 bg-gray-100 rounded w-48 animate-pulse" />
          <div className="h-6 bg-gray-100 rounded-full w-24 animate-pulse" />
        </div>
        <div className="flex-1 bg-gray-50 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-sm w-full h-[380px] flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
          <ArrowLeftRight className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-gray-800">No Cash Flow Data</h4>
        <p className="text-xs text-gray-400 mt-1 max-w-xs">
          Monthly inflows from paid invoices and outflows from approved expenses will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-sm w-full h-[380px] flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
            <ArrowLeftRight className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 tracking-tight">Cash Flow Analysis</h3>
            <p className="text-xs text-gray-400">Total inflow from paid invoices vs outflow from verified expenses</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200/60 text-xs font-semibold text-gray-600">
          <Calendar className="w-3.5 h-3.5 text-gray-400" />
          <span>Annual Inflow vs Outflow</span>
        </div>
      </div>

      <div className="flex-1 w-full min-h-[0]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
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
              formatter={formatTooltip}
            />
            <Legend 
              verticalAlign="top" 
              align="right"
              height={36} 
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '12px', paddingBottom: '12px', fontWeight: 600 }}
            />
            <Bar 
              name="Inflow (Revenue)" 
              dataKey="inflow" 
              fill="#10b981" 
              radius={[6, 6, 0, 0]}
              barSize={24}
            />
            <Bar 
              name="Outflow (Expenses)" 
              dataKey="outflow" 
              fill="#ef4444" 
              radius={[6, 6, 0, 0]}
              barSize={24}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CashFlowAnalysisChart;