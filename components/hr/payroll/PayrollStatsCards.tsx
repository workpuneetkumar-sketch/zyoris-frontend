"use client";

import React from "react";
import {
  DollarSign,
  Users,
  Clock,
  TrendingUp,
  Wallet,
} from "lucide-react";

interface PayrollStatsCardsProps {
  totalPayroll: number;
  employeesPaid: number;
  pendingPayslips: number;
  averageSalary: number;
  netDisbursed: number;
  totalEmployees: number;
}

function formatCurrency(amount: number): string {
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

const CARDS = [
  {
    key: "totalPayroll",
    label: "Total Payroll Cost",
    icon: DollarSign,
    bgColor: "bg-blue-50",
    iconColor: "text-blue-600",
    trendColor: "text-blue-600",
    getValue: (p: PayrollStatsCardsProps) => formatCurrency(p.totalPayroll),
    getSubtext: () => "This month",
  },
  {
    key: "employeesPaid",
    label: "Employees Paid",
    icon: Users,
    bgColor: "bg-emerald-50",
    iconColor: "text-emerald-600",
    trendColor: "text-emerald-600",
    getValue: (p: PayrollStatsCardsProps) => `${p.employeesPaid}/${p.totalEmployees}`,
    getSubtext: (p: PayrollStatsCardsProps) =>
      `${p.totalEmployees > 0 ? ((p.employeesPaid / p.totalEmployees) * 100).toFixed(0) : 0}% completed`,
  },
  {
    key: "pendingPayslips",
    label: "Pending Payslips",
    icon: Clock,
    bgColor: "bg-amber-50",
    iconColor: "text-amber-500",
    trendColor: "text-amber-600",
    getValue: (p: PayrollStatsCardsProps) => String(p.pendingPayslips),
    getSubtext: () => "Awaiting processing",
  },
  {
    key: "averageSalary",
    label: "Average Salary",
    icon: TrendingUp,
    bgColor: "bg-purple-50",
    iconColor: "text-purple-600",
    trendColor: "text-purple-600",
    getValue: (p: PayrollStatsCardsProps) => formatCurrency(p.averageSalary),
    getSubtext: () => "Per employee",
  },
  {
    key: "netDisbursed",
    label: "Net Disbursed",
    icon: Wallet,
    bgColor: "bg-cyan-50",
    iconColor: "text-cyan-600",
    trendColor: "text-cyan-600",
    getValue: (p: PayrollStatsCardsProps) => formatCurrency(p.netDisbursed),
    getSubtext: () => "Total payout",
  },
];

export default function PayrollStatsCards(props: PayrollStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-3 hover:shadow-md transition-shadow duration-200"
          >
            <div
              className={`w-10 h-10 rounded-lg ${card.bgColor} flex items-center justify-center shrink-0`}
            >
              <Icon size={20} className={card.iconColor} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 font-medium truncate">
                {card.label}
              </p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-0.5">
                {card.getValue(props)}
              </p>
              <p className={`text-xs font-medium mt-0.5 ${card.trendColor}`}>
                {card.getSubtext(props)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
