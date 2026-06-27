"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Zap,
  X,
  Check,
  AlertCircle,
  Trash2,
  Plus
} from "lucide-react";
import {
  AutomationRule,
  getRules,
  createRule,
  toggleRule,
  deleteRule,
  getRuleStats,
  CreateRulePayload,
} from "@/lib/api/automationApi";
import AutomationRulesList from "@/components/automation/AutomationRulesList";
import CreateRuleModal from "@/components/automation/CreateRuleModal";

// ─── Main Component ────────────────────────────────────────────────────

export default function AutomationPage() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const stats = getRuleStats(rules);

  // ─── Toast Helper ────────────────────────────────────────────────────

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // ─── Load Rules ──────────────────────────────────────────────────────

  const loadRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRules();
      setRules(data);
    } catch (err: any) {
      setError(err.message);
      showToast("error", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  // ─── Create Rule ─────────────────────────────────────────────────────

  const handleCreateRule = async (payload: CreateRulePayload) => {
    setIsSubmitting(true);
    try {
      const newRule = await createRule(payload);
      setRules((prev) => [newRule, ...prev]);
      setShowCreateModal(false);
      showToast("success", `Rule "${newRule.name}" created successfully`);
    } catch (err: any) {
      showToast("error", err.message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Toggle Rule ─────────────────────────────────────────────────────

  const handleToggleRule = async (rule: AutomationRule) => {
    try {
      await toggleRule(rule.id, !rule.isActive);
      setRules((prev) =>
        prev.map((r) =>
          r.id === rule.id ? { ...r, isActive: !r.isActive } : r
        )
      );
      showToast("success", `Rule "${rule.name}" ${!rule.isActive ? "enabled" : "disabled"}`);
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

  // ─── Delete Rule ─────────────────────────────────────────────────────

  const handleDeleteRule = async () => {
    if (!selectedRule) return;
    try {
      await deleteRule(selectedRule.id);
      setRules((prev) => prev.filter((r) => r.id !== selectedRule.id));
      setShowDeleteModal(false);
      setSelectedRule(null);
      showToast("success", `Rule "${selectedRule.name}" deleted`);
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-slide-in ${
          toast.type === "success"
            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
            : "bg-red-50 text-red-800 border border-red-200"
        }`}>
          {toast.type === "success" ? (
            <Check className="w-5 h-5 text-emerald-500" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500" />
          )}
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Zap className="w-6 h-6 text-indigo-600" />
            Automation Rules
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Create and manage automation rules for your workflows
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all shadow-sm hover:shadow-md"
        >
          <Plus size={18} />
          Create Rule
        </button>
      </div>

      {/* Rules List */}
      <AutomationRulesList
        rules={rules}
        loading={loading}
        error={error}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        loadRules={loadRules}
        onToggleRule={handleToggleRule}
        onDeleteRule={(rule) => {
          setSelectedRule(rule);
          setShowDeleteModal(true);
        }}
        onCreateRule={() => setShowCreateModal(true)}
        stats={stats}
      />

      {/* Create Rule Modal */}
      <CreateRuleModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateRule}
        isSubmitting={isSubmitting}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedRule && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="p-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Delete Rule?</h3>
              <p className="text-sm text-gray-600">
                Are you sure you want to delete{" "}
                <span className="font-semibold">"{selectedRule.name}"</span>?
                <br />
                This action cannot be undone.
              </p>
              <div className="flex justify-center gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedRule(null);
                  }}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteRule}
                  className="px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors"
                >
                  Delete Rule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}