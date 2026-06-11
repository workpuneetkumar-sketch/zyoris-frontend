// / components/finance/FinanceStatsCards.tsx
import React from 'react';
import { StatCardData } from '@/lib/api/finance/financeApi';

interface FinanceStatsCardsProps {
  stats: StatCardData[];
}

export const FinanceStatsCards: React.FC<FinanceStatsCardsProps> = ({ stats }) => {
  // SVG Icons based on design
  const renderIcon = (type: string) => {
    switch (type) {
      case 'revenue':
        return (
          <div className="p-3 rounded-full bg-emerald-50 text-emerald-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'expense':
        return (
          <div className="p-3 rounded-full bg-rose-50 text-rose-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'profit':
        return (
          <div className="p-3 rounded-full bg-blue-50 text-blue-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        );
      case 'invoice':
        return (
          <div className="p-3 rounded-full bg-amber-50 text-amber-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        );
      case 'cashflow':
        return (
          <div className="p-3 rounded-full bg-purple-50 text-purple-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 w-full">
      {stats.map((stat, idx) => (
        <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-sm font-medium text-gray-500">{stat.title}</span>
            <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{stat.value}</h3>
            <div className="flex items-center space-x-1.5">
              <span className={`text-xs font-semibold ${
                stat.type === 'expense' && !stat.change.includes('Positive') ? 'text-rose-600' : 'text-emerald-600'
              }`}>
                {stat.change}
              </span>
              <span className="text-xs text-gray-400">{stat.subtext}</span>
            </div>
          </div>
          {renderIcon(stat.type)}
        </div>
      ))}
    </div>
  );
};