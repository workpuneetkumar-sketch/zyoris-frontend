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
import { Invoice, isInvoiceOverdue } from "@/lib/api/finance/invoicesApi";

// ── Helper Functions ─────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ── Stats Cards Component ────────────────────────────────

export function StatsCards({
  invoices,
  onViewOverdue,
}: {
  invoices: Invoice[];
  onViewOverdue?: () => void;
}) {
  const totalAmount = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const draftAmount = invoices.filter(inv => inv.status === "DRAFT").reduce((sum, inv) => sum + inv.totalAmount, 0);
  const sentAmount = invoices.filter(inv => inv.status === "SENT").reduce((sum, inv) => sum + inv.totalAmount, 0);
  const paidAmount = invoices.filter(inv => inv.status === "PAID").reduce((sum, inv) => sum + inv.totalAmount, 0);
  const overdueCount = invoices.filter(inv => inv.status === "OVERDUE" || isInvoiceOverdue(inv)).length;

  const stats = [
    {
      label: "Total Billed",
      value: formatCurrency(totalAmount),
      icon: Wallet,
      count: `${invoices.length} invoices`,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      label: "Draft",
      value: formatCurrency(draftAmount),
      icon: Edit2,
      count: `${invoices.filter(inv => inv.status === "DRAFT").length} drafts`,
      iconBg: "bg-gray-100",
      iconColor: "text-gray-600",
    },
    {
      label: "Sent / Receivable",
      value: formatCurrency(sentAmount),
      icon: Send,
      count: `${invoices.filter(inv => inv.status === "SENT").length} sent`,
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
    },
    {
      label: "Collected (Paid)",
      value: formatCurrency(paidAmount),
      icon: CreditCard,
      count: `${invoices.filter(inv => inv.status === "PAID").length} paid`,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
    },
  ];

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${stat.iconBg} flex items-center justify-center`}>
                  <Icon size={18} className={stat.iconColor} />
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
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="text-red-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-800">Overdue Invoices Alert</p>
              <p className="text-xs text-red-600">You have {overdueCount} overdue invoice(s) that need attention.</p>
            </div>
          </div>
          {onViewOverdue && (
            <button
              onClick={onViewOverdue}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-all self-start sm:self-auto"
            >
              Filter Overdue
            </button>
          )}
        </div>
      )}
    </>
  );
}