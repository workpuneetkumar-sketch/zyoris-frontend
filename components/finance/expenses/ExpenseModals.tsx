// app/finance/expenses/components/ExpenseModals.tsx

"use client";

import React, { useState } from "react";
import {
  X,
  Plus,
  Save,
  Loader2,
  XCircle,
} from "lucide-react";
import {
  createExpense,
  updateExpense,
  Expense,
  ExpenseCategory,
} from "@/lib/api/finance/expenseApi";
import { CATEGORIES } from "./constants";

// ── Types ─────────────────────────────────────────────────
interface CreateExpenseForm {
  category: ExpenseCategory;
  amount: string;
  description: string;
  expenseDate: string;
}

interface CreateExpenseModalProps {
  onClose: () => void;
  onSuccess: (expense: Expense) => void;
}

interface UpdateExpenseModalProps {
  expense: Expense;
  onClose: () => void;
  onSuccess: (updatedExpense: Expense) => void;
}

// ── Create Expense Modal ──────────────────────────────────
export function CreateExpenseModal({ onClose, onSuccess }: CreateExpenseModalProps) {
  const [form, setForm] = useState<CreateExpenseForm>({
    category: "TRAVEL",
    amount: "",
    description: "",
    expenseDate: new Date().toISOString().split("T")[0],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");

    if (!form.category) {
      setError("Please select a category");
      return;
    }
    if (!form.amount || parseFloat(form.amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    if (!form.description.trim()) {
      setError("Please enter a description");
      return;
    }
    if (!form.expenseDate) {
      setError("Please select a date");
      return;
    }

    setLoading(true);
    try {
      const newExpense = await createExpense({
        category: form.category,
        amount: parseFloat(form.amount),
        description: form.description.trim(),
        expenseDate: form.expenseDate,
      });
      onSuccess(newExpense);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create expense");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Create Expense</h2>
              <p className="text-sm text-blue-100 mt-1">Submit a new expense report for approval</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              <XCircle size={18} className="text-rose-500 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = form.category === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setForm({ ...form, category: cat.value })}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 shadow-sm"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isSelected ? "bg-blue-500 text-white" : cat.color
                      }`}
                    >
                      <Icon size={20} />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Amount (₹)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-gray-500 font-medium">₹</span>
                </div>
                <input
                  type="number"
                  placeholder="0"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 font-medium focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Expense Date</label>
              <input
                type="date"
                value={form.expenseDate}
                onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
            <textarea
              rows={3}
              placeholder="Enter expense details..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 resize-none focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus size={16} />
                Create Expense
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Update Expense Modal ──────────────────────────────────
export function UpdateExpenseModal({ expense, onClose, onSuccess }: UpdateExpenseModalProps) {
  const [form, setForm] = useState({
    category: expense.category,
    amount: expense.amount.toString(),
    description: expense.description,
    expenseDate: expense.expenseDate.split("T")[0],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");

    if (!form.category) {
      setError("Please select a category");
      return;
    }
    if (!form.amount || parseFloat(form.amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    if (!form.description.trim()) {
      setError("Please enter a description");
      return;
    }
    if (!form.expenseDate) {
      setError("Please select a date");
      return;
    }

    setLoading(true);
    try {
      const updated = await updateExpense(expense.id, {
        category: form.category as ExpenseCategory,
        amount: parseFloat(form.amount),
        description: form.description.trim(),
        expenseDate: form.expenseDate,
      });
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update expense");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Update Expense</h2>
              <p className="text-sm text-purple-100 mt-1">Edit your expense details</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              <XCircle size={18} className="text-rose-500 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = form.category === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setForm({ ...form, category: cat.value })}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                      isSelected
                        ? "border-purple-500 bg-purple-50 shadow-sm"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isSelected ? "bg-purple-500 text-white" : cat.color
                      }`}
                    >
                      <Icon size={20} />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Amount (₹)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-gray-500 font-medium">₹</span>
                </div>
                <input
                  type="number"
                  placeholder="0"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 font-medium focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Expense Date</label>
              <input
                type="date"
                value={form.expenseDate}
                onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
            <textarea
              rows={3}
              placeholder="Enter expense details..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 resize-none focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-lg shadow-purple-500/25 transition-all"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Save size={16} />
                Update Expense
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}