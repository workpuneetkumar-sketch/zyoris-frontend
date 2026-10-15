import React from 'react';
import { StatCardData } from '@/lib/api/finance/financeApi';
import { 
  DollarSign, 
  Receipt, 
  TrendingUp, 
  TrendingDown, 
  FileText, 
  ArrowLeftRight 
} from 'lucide-react';

interface FinanceStatsCardsProps {
  stats: StatCardData[];
  isLoading?: boolean;
}

const SkeletonCard = () => (
  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm animate-pulse">
    <div className="flex items-start justify-between">
      <div className="space-y-3 flex-1">
        <div className="h-4 bg-gray-100 rounded w-24" />
        <div className="h-8 bg-gray-200 rounded w-32" />
        <div className="flex items-center space-x-2">
          <div className="h-3 bg-gray-100 rounded w-12" />
          <div className="h-3 bg-gray-100 rounded w-20" />
        </div>
      </div>
      <div className="p-3 rounded-2xl bg-gray-100 w-12 h-12" />
    </div>
  </div>
);

export const FinanceStatsCards: React.FC<FinanceStatsCardsProps> = ({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4.5 w-full">
        {Array.from({ length: 5 }).map((_, idx) => (
          <SkeletonCard key={idx} />
        ))}
      </div>
    );
  }

  const getCardTheme = (type: string, value: string) => {
    const isNegative = value.includes('-') || (type === 'profit' && value.startsWith('₹-'));
    
    switch (type) {
      case 'revenue':
        return {
          icon: <DollarSign className="w-5 h-5 text-emerald-600" />,
          iconBg: 'bg-emerald-50 border-emerald-100',
          accentBorder: 'hover:border-emerald-300',
          valueColor: 'text-gray-900',
          badgeBg: 'bg-emerald-50 text-emerald-700',
        };
      case 'expense':
        return {
          icon: <Receipt className="w-5 h-5 text-rose-600" />,
          iconBg: 'bg-rose-50 border-rose-100',
          accentBorder: 'hover:border-rose-300',
          valueColor: 'text-gray-900',
          badgeBg: 'bg-rose-50 text-rose-700',
        };
      case 'profit':
        return {
          icon: isNegative 
            ? <TrendingDown className="w-5 h-5 text-rose-600" /> 
            : <TrendingUp className="w-5 h-5 text-blue-600" />,
          iconBg: isNegative ? 'bg-rose-50 border-rose-100' : 'bg-blue-50 border-blue-100',
          accentBorder: isNegative ? 'hover:border-rose-300' : 'hover:border-blue-300',
          valueColor: isNegative ? 'text-rose-600' : 'text-gray-900',
          badgeBg: isNegative ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700',
        };
      case 'invoice':
        return {
          icon: <FileText className="w-5 h-5 text-purple-600" />,
          iconBg: 'bg-purple-50 border-purple-100',
          accentBorder: 'hover:border-purple-300',
          valueColor: 'text-gray-900',
          badgeBg: 'bg-purple-50 text-purple-700',
        };
      case 'cashflow':
        return {
          icon: <ArrowLeftRight className="w-5 h-5 text-amber-600" />,
          iconBg: 'bg-amber-50 border-amber-100',
          accentBorder: 'hover:border-amber-300',
          valueColor: isNegative ? 'text-amber-700' : 'text-gray-900',
          badgeBg: 'bg-amber-50 text-amber-700',
        };
      default:
        return {
          icon: <DollarSign className="w-5 h-5 text-gray-600" />,
          iconBg: 'bg-gray-50 border-gray-100',
          accentBorder: 'hover:border-gray-300',
          valueColor: 'text-gray-900',
          badgeBg: 'bg-gray-50 text-gray-700',
        };
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4.5 w-full">
      {stats.map((stat, idx) => {
        const theme = getCardTheme(stat.type, stat.value);
        return (
          <div
            key={idx}
            className={`group bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between ${theme.accentBorder}`}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider line-clamp-1">
                {stat.title}
              </span>
              <div className={`p-2.5 rounded-xl border flex items-center justify-center shrink-0 ${theme.iconBg}`}>
                {theme.icon}
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className={`text-2xl font-bold tracking-tight truncate ${theme.valueColor}`}>
                {stat.value}
              </h3>
              <div className="flex items-center gap-1.5 flex-wrap">
                {stat.change && (
                  <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${theme.badgeBg}`}>
                    {stat.change}
                  </span>
                )}
                <span className="text-xs text-gray-400 font-medium truncate">
                  {stat.subtext}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};