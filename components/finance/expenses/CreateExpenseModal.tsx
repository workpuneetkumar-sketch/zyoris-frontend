// components/finance/Expenses/CreateExpenseModal.tsx

"use client";

import React, { useState } from "react";
import { X, CheckCircle2, Loader2, DollarSign, Calendar, FileText, Tag } from "lucide-react";
import { createExpense } from "@/lib/api/finance/expenseApi";

interface CreateExpenseModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES = [
  { value: "TRAVEL", label: "Travel", icon: "✈️" },
  { value: "MEALS", label: "Meals", icon: "🍽️" },
  { value: "OFFICE_SUPPLIES", label: "Office Supplies", icon: "📎" },
  { value: "SOFTWARE", label: "Software", icon: "💻" },
  { value: "MARKETING", label: "Marketing", icon: "📢" },
  { value: "OTHER", label: "Other", icon: "📦" },
];

export default function CreateExpenseModal({ onClose, onSuccess }: CreateExpenseModalProps) {
  const [form, setForm] = useState({
    category: "",
    amount: "",
    description: "",
    expenseDate: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError("");
    
    if (!form.category || !form.amount || !form.description || !form.expenseDate) {
      setError("All fields are required.");
      return;
    }
    
    const amountNum = parseFloat(form.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    
    setLoading(true);
    try {
      await createExpense({
        category: form.category as any,
        amount: amountNum,
        description: form.description.trim(),
        expenseDate: new Date(form.expenseDate).toISOString(),
      });

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (e: any) {
      setError(e.message || "Failed to create expense.");
    } finally {
      setLoading(false);
    }
  };

  const selectedCategory = CATEGORIES.find(c => c.value === form.category);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Create New Expense</h2>
            <p className="text-sm text-gray-500 mt-0.5">Submit a new expense request</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {success && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-700 text-sm font-medium">
              <CheckCircle2 size={16} />
              Expense created successfully!
            </div>
          )}
          
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-600 text-sm">
              <X size={16} />
              {error}
            </div>
          )}

          {/* Category Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Category <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option value="">Select category</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>
            {selectedCategory && (
              <p className="text-xs text-gray-500 mt-1">
                {selectedCategory.icon} {selectedCategory.label} category selected
              </p>
            )}
          </div>

          {/* Amount Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
          </div>

          {/* Expense Date Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Expense Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.expenseDate}
                onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
              />
            </div>
          </div>

          {/* Description Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FileText size={16} className="absolute left-3 top-3 text-gray-400" />
              <textarea
                rows={3}
                placeholder="Enter expense description..."
                className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || success}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? "Creating..." : "Create Expense"}
          </button>
        </div>
      </div>
    </div>
  );
}