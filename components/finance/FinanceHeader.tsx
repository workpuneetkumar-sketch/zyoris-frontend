// components/finance/FinanceHeader.tsx
"use client";

import React from 'react';
import Link from 'next/link';
import { 
  DollarSign, 
  Plus, 
  Receipt, 
  FileText, 
  RefreshCw, 
  TrendingUp,
  Activity
} from 'lucide-react';

interface FinanceHeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export default function FinanceHeader({ onRefresh, isRefreshing }: FinanceHeaderProps) {
  return (
    <div className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-6 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Left: Title & Subtitle */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <DollarSign className="w-5 h-5 stroke-[2.5]" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              Finance Dashboard
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Operating Metrics • INR (₹)
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 max-w-2xl">
            Real-time visibility into revenue generation, expense tracking, and working cash flow.
          </p>
        </div>

        {/* Right: Real Interactive Actions (No Fake Controls) */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 border border-gray-200 text-gray-700 text-xs sm:text-sm font-semibold rounded-xl transition-all disabled:opacity-60 cursor-pointer"
              title="Refresh financial data"
            >
              <RefreshCw className={`w-4 h-4 text-gray-500 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
              <span className="hidden sm:inline">{isRefreshing ? "Refreshing..." : "Refresh"}</span>
            </button>
          )}

          <Link
            href="/finance/expenses"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-rose-50/50 active:bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow"
          >
            <Receipt className="w-4 h-4 text-rose-600" />
            <span>Add Expense</span>
          </Link>

          <Link
            href="/finance/invoices"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:from-blue-800 active:to-indigo-800 text-white text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/30"
          >
            <Plus className="w-4 h-4" />
            <FileText className="w-4 h-4" />
            <span>New Invoice</span>
          </Link>
        </div>

      </div>
    </div>
  );
}