// components/finance/OutstandingInvoices.tsx
import React from 'react';
import { UpcomingPayment } from '@/lib/api/finance/financeApi';   // ← real data source

interface OutstandingInvoicesProps {
  payments?: UpcomingPayment[];
  isLoading?: boolean;
}

export const OutstandingInvoices: React.FC<OutstandingInvoicesProps> = ({ payments = [], isLoading = false }) => {
  const getPriorityBadge = (priority: 'High' | 'Medium' | 'Low') => {
    switch (priority) {
      case 'High':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-rose-50 text-rose-600">High</span>;
      case 'Medium':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-50 text-amber-600">Medium</span>;
      case 'Low':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-600">Low</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-gray-50 text-gray-600">Medium</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm w-full flex flex-col h-full">
        <div className="flex items-center justify-between mb-5">
          <div className="h-6 bg-gray-200 rounded w-40 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
        </div>
        <div className="space-y-4">
          {[...Array(4)].map((_, idx) => (
            <div key={idx} className="h-20 bg-gray-100 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!payments || payments.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm w-full flex flex-col h-full">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-gray-900">Upcoming Payments</h3>
          <span className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer">View All</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 text-center">No pending payments</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm w-full flex flex-col h-full">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-bold text-gray-900">Upcoming Payments</h3>
        <span className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer">View All</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {payments.map((payment) => (
          <div 
            key={payment.id} 
            className="flex items-center justify-between p-3.5 rounded-xl border border-gray-50 bg-slate-50/50 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-white border border-gray-100 rounded-lg shadow-sm mt-0.5 text-gray-500">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H5a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 line-clamp-1">{payment.vendor}</h4>
                <p className="text-xs text-gray-400 mt-0.5">Due: {payment.dueDate}</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm font-bold text-gray-900">{payment.amount}</span>
              <div className="w-16 flex justify-end">{getPriorityBadge(payment.priority)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OutstandingInvoices;