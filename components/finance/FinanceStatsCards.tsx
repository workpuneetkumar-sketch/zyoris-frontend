import React from 'react';
import { StatCardData } from '@/lib/api/finance/financeApi';

interface FinanceStatsCardsProps {
  stats: StatCardData[];
  isLoading?: boolean;
}

const SkeletonCard = () => (
  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm animate-pulse">
    <div className="flex items-start justify-between">
      <div className="space-y-3 flex-1">
        <div className="h-4 bg-gray-200 rounded w-24" />
        <div className="h-8 bg-gray-200 rounded w-32" />
        <div className="flex items-center space-x-2">
          <div className="h-3 bg-gray-200 rounded w-12" />
          <div className="h-3 bg-gray-200 rounded w-16" />
        </div>
      </div>
      <div className="p-3 rounded-full bg-gray-100 w-12 h-12" />
    </div>
  </div>
);

export const FinanceStatsCards: React.FC<FinanceStatsCardsProps> = ({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 w-full">
        {Array.from({ length: 5 }).map((_, idx) => (
          <SkeletonCard key={idx} />
        ))}
      </div>
    );
  }

  // ✅ Fix: Add proper return type and ensure all paths return JSX
  const renderIcon = (type: string): React.ReactNode => {
    switch (type) {
      case 'revenue':
        return (
          <div className="p-3 rounded-full bg-emerald-50">
            <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'expense':
        return (
          <div className="p-3 rounded-full bg-rose-50">
            <svg className="w-6 h-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'profit':
        return (
          <div className="p-3 rounded-full bg-blue-50">
            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        );
      case 'invoice':
        return (
          <div className="p-3 rounded-full bg-purple-50">
            <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        );
      case 'cashflow':
        return (
          <div className="p-3 rounded-full bg-amber-50">
            <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="p-3 rounded-full bg-gray-50">
            <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </div>
        );
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
                stat.type === 'expense' && !(stat.change || '').includes('Positive')
                  ? 'text-rose-600'
                  : 'text-emerald-600'
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