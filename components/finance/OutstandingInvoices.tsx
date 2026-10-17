// components/finance/OutstandingInvoices.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { UpcomingPayment } from '@/lib/api/finance/financeApi';
import { FileText, ArrowRight, Calendar, AlertCircle } from 'lucide-react';

interface OutstandingInvoicesProps {
  payments?: UpcomingPayment[];
  isLoading?: boolean;
}

export const OutstandingInvoices: React.FC<OutstandingInvoicesProps> = ({ payments = [], isLoading = false }) => {
  const getPriorityBadge = (priority: 'High' | 'Medium' | 'Low') => {
    switch (priority) {
      case 'High':
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-rose-50 text-rose-700 border border-rose-200/60">High Priority</span>;
      case 'Medium':
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-amber-50 text-amber-700 border border-amber-200/60">Medium</span>;
      case 'Low':
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60">Low</span>;
      default:
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-gray-50 text-gray-700 border border-gray-200/60">Normal</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-sm w-full flex flex-col h-full min-h-[350px]">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 bg-gray-100 rounded w-40 animate-pulse" />
          <div className="h-4 bg-gray-100 rounded w-16 animate-pulse" />
        </div>
        <div className="space-y-3 flex-1">
          {[...Array(4)].map((_, idx) => (
            <div key={idx} className="h-16 bg-gray-50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!payments || payments.length === 0) {
    return (
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-sm w-full flex flex-col h-full min-h-[350px] justify-between">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-gray-900 tracking-tight">Upcoming Invoices & Receivables</h3>
          </div>
          <Link href="/finance/invoices" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 group">
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
            <FileText className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-gray-800">All Invoices Paid</p>
          <p className="text-xs text-gray-400 mt-0.5">No overdue or pending client receivables at this time.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-sm w-full flex flex-col h-full min-h-[350px]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 tracking-tight">Upcoming Invoices & Receivables</h3>
            <p className="text-xs text-gray-400">Invoices due for settlement</p>
          </div>
        </div>
        <Link 
          href="/finance/invoices" 
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 group py-1 px-2 rounded-lg hover:bg-blue-50 transition-colors"
        >
          <span>View All Invoices</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[320px]">
        {payments.map((payment) => (
          <div 
            key={payment.id} 
            className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-sm hover:border-gray-200 transition-all group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 bg-white border border-gray-200/60 rounded-xl shadow-xs text-gray-500 group-hover:text-blue-600 group-hover:border-blue-200 transition-colors shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-gray-900 truncate">{payment.vendor}</h4>
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                  <Calendar className="w-3 h-3" />
                  <span>Due {payment.dueDate}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 ml-3">
              <span className="text-sm font-bold text-gray-900 tracking-tight">{payment.amount}</span>
              <div>{getPriorityBadge(payment.priority)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OutstandingInvoices;