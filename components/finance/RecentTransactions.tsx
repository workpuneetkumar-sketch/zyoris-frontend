// components/finance/RecentTransactions.tsx
'use client';

import React from 'react';

interface Transaction {
  id: string;
  date: string;
  client: string;
  category: string;
  amount: number;
  status: 'Received' | 'Paid' | 'Approved' | 'Pending';
}

const transactions: Transaction[] = [
  { id: 'TRK-0034-1350', date: 'May 21, 2024', client: 'Acme Corporation', category: 'Invoice Payment', amount: 240000, status: 'Received' },
  { id: 'TRK-0034-1349', date: 'May 21, 2024', client: 'Tech Solutions Pvt Ltd', category: 'Software Expense', amount: 76000, status: 'Paid' },
  { id: 'TRK-0034-1348', date: 'May 30, 2024', client: 'Global Supplies', category: 'Office Expense', amount: 15500, status: 'Paid' },
  { id: 'TRK-0034-1347', date: 'May 30, 2024', client: 'John Smith', category: 'Reimbursement', amount: 12750, status: 'Approved' },
  { id: 'TRK-0034-1346', date: 'May 29, 2024', client: 'Marketing Inc.', category: 'Marketing Expense', amount: 45000, status: 'Paid' },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'Received':
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-600">Received</span>;
    case 'Paid':
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-600">Paid</span>;
    case 'Approved':
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-600">Approved</span>;
    default:
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-50 text-gray-600">{status}</span>;
  }
};

export const RecentTransactions: React.FC = () => {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-bold text-gray-900">Recent Transactions</h3>
        <span className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer">View All</span>
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
            {transactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-3 text-gray-500 font-mono text-xs">{tx.id}</td>
                <td className="py-3 text-gray-400">{tx.date}</td>
                <td className="py-3 font-semibold text-gray-900">{tx.client}</td>
                <td className="py-3 text-gray-500">{tx.category}</td>
                <td className={`py-3 text-right font-bold ${tx.status === 'Received' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {tx.status === 'Received' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                </td>
                <td className="py-3 text-center">
                  {getStatusBadge(tx.status)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-[11px] text-gray-400 border-t border-gray-100 pt-4 mt-2 flex items-center justify-between">
        <span>Showing 1 to {transactions.length} of 48 transactions</span>
        <div className="flex space-x-1">
          <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded font-bold cursor-pointer">1</span>
          <span className="px-2 py-1 text-gray-400 hover:bg-gray-100 rounded cursor-pointer">2</span>
          <span className="px-2 py-1 text-gray-400 hover:bg-gray-100 rounded cursor-pointer">3</span>
          <span className="px-2 py-1 text-gray-400 hover:bg-gray-100 rounded cursor-pointer">4</span>
        </div>
      </div>
    </div>
  );
};