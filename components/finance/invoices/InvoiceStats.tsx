// components/invoices/InvoiceStats.tsx

"use client";

import React from "react";
import {
  Wallet,
  Edit2,
  Send,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import { Invoice } from "@/lib/api/finance/invoicesApi";

// ── Helper Functions ─────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function isOverdue(dueDate: string): boolean {
  return new Date(dueDate) < new Date();
}

// ── Stats Cards Component ────────────────────────────────

export function StatsCards({ invoices }: { invoices: Invoice[] }) {
  const totalAmount = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const draftAmount = invoices.filter(inv => inv.status === "DRAFT").reduce((sum, inv) => sum + inv.totalAmount, 0);
  const sentAmount = invoices.filter(inv => inv.status === "SENT").reduce((sum, inv) => sum + inv.totalAmount, 0);
  const paidAmount = invoices.filter(inv => inv.status === "PAID").reduce((sum, inv) => sum + inv.totalAmount, 0);
  const overdueCount = invoices.filter(inv => inv.status === "OVERDUE" || (inv.status !== "PAID" && isOverdue(inv.dueDate))).length;

  const stats = [
    { label: "Total Revenue", value: formatCurrency(totalAmount), icon: Wallet, count: `${invoices.length} invoices`, color: "blue" },
    { label: "Draft", value: formatCurrency(draftAmount), icon: Edit2, count: `${invoices.filter(inv => inv.status === "DRAFT").length} drafts`, color: "gray" },
    { label: "Sent", value: formatCurrency(sentAmount), icon: Send, count: `${invoices.filter(inv => inv.status === "SENT").length} sent`, color: "blue" },
    { label: "Paid", value: formatCurrency(paidAmount), icon: CreditCard, count: `${invoices.filter(inv => inv.status === "PAID").length} paid`, color: "green" },
  ];

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg bg-${stat.color}-100 flex items-center justify-center`}>
                  <Icon size={18} className={`text-${stat.color}-600`} />
                </div>
                {idx === 0 && overdueCount > 0 && (
                  <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
                    {overdueCount} overdue
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
              <p className="text-xs text-gray-400">{stat.count}</p>
            </div>
          );
        })}
      </div>

      {overdueCount > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="text-red-500" />
            <div>
              <p className="text-sm font-semibold text-red-800">Overdue Invoices Alert</p>
              <p className="text-xs text-red-600">You have {overdueCount} overdue invoice(s) that need attention.</p>
            </div>
          </div>
          <button className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-all">
            View Details
          </button>
        </div>
      )}
    </>
  );
}