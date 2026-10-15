// components/finance/RecentTransactions.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Transaction } from '@/lib/api/finance/financeApi';
import { History, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

interface RecentTransactionsProps {
  transactions?: Transaction[];
  isLoading?: boolean;
}

const ITEMS_PER_PAGE = 5;

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'Received':
      return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60">Received</span>;
    case 'Paid':
      return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-rose-50 text-rose-700 border border-rose-200/60">Paid</span>;
    case 'Approved':
      return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-blue-50 text-blue-700 border border-blue-200/60">Approved</span>;
    case 'Pending':
      return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-amber-50 text-amber-700 border border-amber-200/60">Pending</span>;
    default:
      return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-gray-50 text-gray-700 border border-gray-200/60">{status}</span>;
  }
};

const formatAmount = (amount: number, status: string) => {
  const formatted = `₹${amount.toLocaleString('en-IN')}`;
  if (status === 'Received') {
    return <span className="text-emerald-600 font-bold tracking-tight">+{formatted}</span>;
  }
  return <span className="text-rose-600 font-bold tracking-tight">-{formatted}</span>;
};

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({ transactions = [], isLoading = false }) => {
  const [currentPage, setCurrentPage] = useState(1);

  if (isLoading) {
    return (
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full min-h-[350px]">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 bg-gray-100 rounded w-40 animate-pulse" />
          <div className="h-4 bg-gray-100 rounded w-16 animate-pulse" />
        </div>
        <div className="space-y-3 flex-1">
          {[...Array(5)].map((_, idx) => (
            <div key={idx} className="h-12 bg-gray-50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full min-h-[350px] justify-between">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <History className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-gray-900 tracking-tight">Recent Transactions</h3>
          </div>
          <Link href="/finance/expenses" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 group">
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <p className="text-sm font-semibold text-gray-800">No Transactions Yet</p>
          <p className="text-xs text-gray-400 mt-0.5">Recorded invoices and approved expenses will appear here.</p>
        </div>
      </div>
    );
  }

  // Pagination logic
  const totalPages = Math.ceil(transactions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const pageTransactions = transactions.slice(startIndex, endIndex);

  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full min-h-[350px]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 tracking-tight">Recent Transactions</h3>
            <p className="text-xs text-gray-400">Ledger entries from invoices and verified expenses</p>
          </div>
        </div>
        <Link 
          href="/finance/expenses" 
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 group py-1 px-2 rounded-lg hover:bg-blue-50 transition-colors"
        >
          <span>View All Transactions</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse min-w-[520px]">
          <thead>
            <tr className="border-b border-gray-100 text-[11px] text-gray-400 font-semibold uppercase tracking-wider">
              <th className="pb-2.5 font-semibold">Ref ID</th>
              <th className="pb-2.5 font-semibold">Date</th>
              <th className="pb-2.5 font-semibold">Client / Description</th>
              <th className="pb-2.5 font-semibold">Category</th>
              <th className="pb-2.5 font-semibold text-right">Amount</th>
              <th className="pb-2.5 font-semibold text-center">Status</th>
            </tr>
          </thead>
          <tbody className="text-xs font-medium text-gray-700 divide-y divide-gray-50">
            {pageTransactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-gray-50/70 transition-colors">
                <td className="py-2.5 text-gray-400 font-mono text-[11px]">
                  #{tx.id ? tx.id.slice(-6).toUpperCase() : 'REC'}
                </td>
                <td className="py-2.5 text-gray-500 whitespace-nowrap">{tx.date}</td>
                <td className="py-2.5 font-bold text-gray-900 max-w-[160px] truncate">{tx.client}</td>
                <td className="py-2.5 text-gray-500">{tx.category}</td>
                <td className="py-2.5 text-right font-semibold">
                  {formatAmount(tx.amount, tx.status)}
                </td>
                <td className="py-2.5 text-center">
                  {getStatusBadge(tx.status)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="text-xs text-gray-400 border-t border-gray-100 pt-3 mt-2 flex items-center justify-between flex-wrap gap-2">
          <span>
            Showing {startIndex + 1}–{Math.min(endIndex, transactions.length)} of {transactions.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} className="text-gray-600" />
            </button>
            <span className="text-xs font-semibold text-gray-700 px-2">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={14} className="text-gray-600" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecentTransactions;