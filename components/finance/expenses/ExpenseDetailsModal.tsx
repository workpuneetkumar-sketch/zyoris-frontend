// components/finance/Expenses/ExpenseDetailsModal.tsx

"use client";

import React from "react";
import { 
  X, 
  Calendar, 
  DollarSign, 
  Tag, 
  FileText, 
  User, 
  Clock, 
  CheckCircle2,
  Building2,
  RefreshCw
} from "lucide-react";
import { Expense } from "@/types/expens";
import StatusBadge from "./StatusBadge";

interface ExpenseDetailsModalProps {
  expense: Expense;
  onClose: () => void;
  onApprove: () => void;
  onRefresh: () => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
}

function formatDateTime(dateString: string): string {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  TRAVEL: { label: "Travel", icon: "✈️" },
  MEALS: { label: "Meals", icon: "🍽️" },
  OFFICE_SUPPLIES: { label: "Office Supplies", icon: "📎" },
  SOFTWARE: { label: "Software", icon: "💻" },
  MARKETING: { label: "Marketing", icon: "📢" },
  OTHER: { label: "Other", icon: "📦" },
};

export default function ExpenseDetailsModal({ expense, onClose, onApprove }: ExpenseDetailsModalProps) {
  const categoryInfo = CATEGORY_LABELS[expense.category] || { label: expense.category, icon: "📋" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Expense Details</h2>
            <p className="text-sm text-gray-500 mt-0.5 font-mono">
              ID: {expense.id.slice(0, 12)}...
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Status Banner */}
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
            <span className="text-sm font-medium text-gray-600">Current Status</span>
            <StatusBadge status={expense.status} />
          </div>

          {/* Amount - Highlighted */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 rounded-lg">
                <DollarSign size={18} className="text-blue-600" />
              </div>
              <span className="text-sm font-medium text-gray-600">Amount</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">{formatCurrency(expense.amount)}</span>
          </div>

          {/* Category */}
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-purple-50 rounded-lg">
                <Tag size={18} className="text-purple-600" />
              </div>
              <span className="text-sm font-medium text-gray-600">Category</span>
            </div>
            <span className="text-sm text-gray-700">
              {categoryInfo.icon} {categoryInfo.label}
            </span>
          </div>

          {/* Description */}
          <div className="py-2 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-green-50 rounded-lg">
                <FileText size={18} className="text-green-600" />
              </div>
              <span className="text-sm font-medium text-gray-600">Description</span>
            </div>
            <p className="text-sm text-gray-700 ml-10 leading-relaxed">
              {expense.description}
            </p>
          </div>

          {/* Expense Date */}
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-orange-50 rounded-lg">
                <Calendar size={18} className="text-orange-600" />
              </div>
              <span className="text-sm font-medium text-gray-600">Expense Date</span>
            </div>
            <span className="text-sm text-gray-700">{formatDateTime(expense.expenseDate)}</span>
          </div>

          {/* Submitted By */}
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 rounded-lg">
                <User size={18} className="text-indigo-600" />
              </div>
              <span className="text-sm font-medium text-gray-600">Submitted By</span>
            </div>
            <span className="text-sm font-mono text-gray-700">
              {expense.submittedById?.slice(0, 8)}...
            </span>
          </div>

          {/* Organization */}
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-teal-50 rounded-lg">
                <Building2 size={18} className="text-teal-600" />
              </div>
              <span className="text-sm font-medium text-gray-600">Organization</span>
            </div>
            <span className="text-sm font-mono text-gray-700">{expense.organizationId}</span>
          </div>

          {/* Created At */}
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gray-100 rounded-lg">
                <Clock size={18} className="text-gray-600" />
              </div>
              <span className="text-sm font-medium text-gray-600">Created At</span>
            </div>
            <span className="text-sm text-gray-500">{formatDateTime(expense.createdAt)}</span>
          </div>

          {/* Updated At */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gray-100 rounded-lg">
                <RefreshCw size={18} className="text-gray-600" />
              </div>
              <span className="text-sm font-medium text-gray-600">Last Updated</span>
            </div>
            <span className="text-sm text-gray-500">{formatDateTime(expense.updatedAt)}</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            Close
          </button>
          {expense.status === "PENDING" && (
            <button
              onClick={() => {
                onApprove();
                onClose();
              }}
              className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
            >
              <CheckCircle2 size={16} />
              Approve Expense
            </button>
          )}
        </div>
      </div>
    </div>
  );
}