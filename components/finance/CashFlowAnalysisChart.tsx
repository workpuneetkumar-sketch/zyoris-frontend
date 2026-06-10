// components/finance/CashFlowAnalysisChart.tsx
'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const cashFlowData = [
  { month: 'Jan', inflow: 12.2, outflow: 8.4 },
  { month: 'Feb', inflow: 13.8, outflow: 9.2 },
  { month: 'Mar', inflow: 11.5, outflow: 8.7 },
  { month: 'Apr', inflow: 14.2, outflow: 9.5 },
  { month: 'May', inflow: 15.6, outflow: 10.1 },
  { month: 'Jun', inflow: 14.8, outflow: 9.8 },
  { month: 'Jul', inflow: 16.1, outflow: 10.4 },
  { month: 'Aug', inflow: 15.2, outflow: 10.6 },
  { month: 'Sep', inflow: 14.5, outflow: 9.9 },
  { month: 'Oct', inflow: 16.8, outflow: 11.2 },
  { month: 'Nov', inflow: 15.9, outflow: 10.5 },
  { month: 'Dec', inflow: 17.2, outflow: 11.8 },
];

export const CashFlowAnalysisChart: React.FC = () => {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm w-full h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-bold text-gray-900">Cash Flow Analysis</h3>
          <p className="text-xs text-gray-400 mt-1">Inflow vs Outflow (₹ Cr)</p>
        </div>
        <div className="text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 font-medium cursor-pointer">
          This Year ▾
        </div>
      </div>

      <div className="flex-1 w-full min-h-[0]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={cashFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
              tickFormatter={(value) => `${value} Cr`}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #f3f4f6' }}
              formatter={(value) => [`₹${value} Cr`]}
            />
            <Legend 
              verticalAlign="top" 
              height={36} 
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '13px', paddingBottom: '10px' }}
            />
            <Bar 
              name="Inflow (₹ Cr)" 
              dataKey="inflow" 
              fill="#10b981" 
              radius={[4, 4, 0, 0]}
              barSize={30}
            />
            <Bar 
              name="Outflow (₹ Cr)" 
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