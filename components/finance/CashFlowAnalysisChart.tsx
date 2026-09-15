// components/finance/CashFlowAnalysisChart.tsx
'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CashFlowDataPoint } from '@/lib/api/finance/financeApi';   // real import

interface CashFlowAnalysisChartProps {
  data?: CashFlowDataPoint[];
  isLoading?: boolean;
}

export const CashFlowAnalysisChart: React.FC<CashFlowAnalysisChartProps> = ({ data = [], isLoading = false }) => {
  const formatYAxis = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
    return `₹${value}`;
  };

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm w-full h-[400px] flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-32 mt-1 animate-pulse"></div>
          </div>
          <div className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div>
        </div>
        <div className="flex-1 bg-gray-100 rounded animate-pulse"></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm w-full h-[400px] flex flex-col items-center justify-center">
        <p className="text-gray-500">No cash flow data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm w-full h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-bold text-gray-900">Cash Flow Analysis</h3>
          <p className="text-xs text-gray-400 mt-1">Inflow vs Outflow</p>
        </div>
        <div className="text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 font-medium">
          This Year
        </div>
      </div>

      <div className="flex-1 w-full min-h-[0]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis 
              dataKey="month" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#9ca3af', fontSize: 12 }} 
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickFormatter={formatYAxis}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #f3f4f6' }}
              formatter={(value: any) => [formatYAxis(value), '']}
            />
            <Legend 
              verticalAlign="top" 
              height={36} 
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '13px', paddingBottom: '10px' }}
            />
            <Bar 
              name="Inflow" 
              dataKey="inflow" 
              fill="#10b981" 
              radius={[4, 4, 0, 0]}
              barSize={30}
            />
            <Bar 
              name="Outflow" 
              dataKey="outflow" 
              fill="#ef4444" 
              radius={[4, 4, 0, 0]}
              barSize={30}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CashFlowAnalysisChart;