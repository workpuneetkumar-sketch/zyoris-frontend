import React from "react";
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  IndianRupee,
  TrendingUp,
} from "lucide-react";
import { Invoice } from "@/lib/api/finance/invoicesApi";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}

interface CardProps {
  invoices: Invoice[];
}

export default function PaymentSummaryCards({ invoices }: CardProps) {
  const paidInvoices = invoices.filter((i) => i.status === "PAID");
  const pendingInvoices = invoices.filter(
    (i) => i.status === "DRAFT" || i.status === "SENT"
  );
  const overdueInvoices = invoices.filter(
    (i) =>
      i.status === "OVERDUE" ||
      (i.status !== "PAID" && new Date(i.dueDate) < new Date())
  );

  const totalRevenue = paidInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
  const outstandingAmount = invoices
    .filter((i) => i.status !== "PAID")
    .reduce((sum, i) => sum + i.totalAmount, 0);

  const cards = [
    { label: "Total Invoices", value: invoices.length, icon: FileText, color: "blue" },
    { label: "Paid", value: paidInvoices.length, icon: CheckCircle2, color: "emerald" },
    { label: "Pending", value: pendingInvoices.length, icon: Clock, color: "amber" },
    { label: "Overdue", value: overdueInvoices.length, icon: AlertCircle, color: "red" },
    { label: "Total Revenue", value: formatCurrency(totalRevenue), icon: IndianRupee, color: "green" },
    { label: "Outstanding", value: formatCurrency(outstandingAmount), icon: TrendingUp, color: "orange" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`w-8 h-8 rounded-lg bg-${card.color}-100 flex items-center justify-center`}>
                <Icon size={16} className={`text-${card.color}-600`} />
              </div>
            </div>
            <p className="text-xs font-medium text-gray-500">{card.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{card.value}</p>
          </div>
        );
      })}
    </div>
  );
}