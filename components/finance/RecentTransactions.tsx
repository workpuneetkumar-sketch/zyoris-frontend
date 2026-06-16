// components/finance/RecentTransactions.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';                   // <-- added
import { Transaction } from '@/lib/api/finance/financeApi';

interface RecentTransactionsProps {
  transactions?: Transaction[];
  isLoading?: boolean;
}

const ITEMS_PER_PAGE = 5;

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'Received':
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-600">Received</span>;
    case 'Paid':
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-600">Paid</span>;
    case 'Approved':
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-600">Approved</span>;
    case 'Pending':
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-50 text-gray-600">Pending</span>;
    default:
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-50 text-gray-600">{status}</span>;
  }
};

const formatAmount = (amount: number, status: string) => {
  const formatted = `₹${amount.toLocaleString('en-IN')}`;
  if (status === 'Received') {
    return <span className="text-emerald-600 font-bold">+{formatted}</span>;
  }
  return <span className="text-rose-600 font-bold">-{formatted}</span>;
};

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({ transactions = [], isLoading = false }) => {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);

  // ── Loading / Empty states (unchanged) ────────────
  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full">
        <div className="flex items-center justify-between mb-5">
          <div className="h-6 bg-gray-200 rounded w-40 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, idx) => (
            <div key={idx} className="h-16 bg-gray-100 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-gray-900">Recent Transactions</h3>
          <span className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer">View All</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 text-center">No transactions available</p>
        </div>
      </div>
    );
  }

  // ── Pagination logic ──────────────────────────────
  const totalPages = Math.ceil(transactions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const pageTransactions = transactions.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  
  // Generate visible page numbers (show max 3)
  const getPageNumbers = () => {
    const pages: number[] = [];
    if (totalPages <= 3) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 2) {
        pages.push(1, 2, 3);
      } else if (currentPage >= totalPages - 1) {
        pages.push(totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(currentPage - 1, currentPage, currentPage + 1);
      }
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-bold text-gray-900">Recent Transactions</h3>
        <span
          className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer"
        >
          View All
        </span>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-400 font-semibold">
              <th className="pb-3 font-medium">Transaction ID</th>
              <th className="pb-3 font-medium">Date</th>
              <th className="pb-3 font-medium">Client / Vendor</th>
              <th className="pb-3 font-medium">Category</th>
              <th className="pb-3 font-medium text-right">Amount</th>
              <th className="pb-3 font-medium text-center">Status</th>
            </tr>
          </thead>
          <tbody className="text-sm font-medium text-gray-700 divide-y divide-gray-50">
            {pageTransactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-3 text-gray-500 font-mono text-xs">{tx.id.slice(-12)}</td>
                <td className="py-3 text-gray-400">{tx.date}</td>
                <td className="py-3 font-semibold text-gray-900">{tx.client}</td>
                <td className="py-3 text-gray-500">{tx.category}</td>
                <td className="py-3 text-right">
                  {formatAmount(tx.amount, tx.status)}
                </td>
                <td className="py-3 text-center">
                  {getStatusBadge(tx.status)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination footer – only show if more than one page */}
      {totalPages > 1 && (
        <div className="text-[11px] text-gray-400 border-t border-gray-100 pt-4 mt-2 flex items-center justify-between">
          <span>
            Showing {startIndex + 1} to {Math.min(endIndex, transactions.length)} of {transactions.length} transactions
          </span>
          <div className="flex space-x-1">
            {pageNumbers.map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => handlePageChange(pageNum)}
                className={`px-2 py-1 rounded font-bold cursor-pointer ${
                  currentPage === pageNum
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-400 hover:bg-gray-100'
                }`}
              >
                {pageNum}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RecentTransactions;