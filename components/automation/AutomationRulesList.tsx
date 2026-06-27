"use client";

import React from "react";
import {
  Zap,
  Search,
  RefreshCw,
  Trash2,
  Plus,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import {
  AutomationRule,
  TriggerType,
  ActionType,
  getTriggerLabel,
  getActionLabel,
  getTriggerIcon,
  getActionIcon,
  getRuleStats,
} from "@/lib/api/automationApi";

// ─── Types ──────────────────────────────────────────────────────────────

interface AutomationRulesListProps {
  rules: AutomationRule[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  loadRules: () => void;
  onToggleRule: (rule: AutomationRule) => void;
  onDeleteRule: (rule: AutomationRule) => void;
  onCreateRule: () => void;
  stats: ReturnType<typeof getRuleStats>;
}

// ─── Sub-Components ────────────────────────────────────────────────────

const TriggerBadge = ({ trigger }: { trigger: TriggerType }) => {
  const colors: Record<TriggerType, string> = {
    LEAD_CREATED: "bg-blue-50 text-blue-700 border-blue-200",
    DEAL_WON: "bg-emerald-50 text-emerald-700 border-emerald-200",
    LEAVE_APPLIED: "bg-amber-50 text-amber-700 border-amber-200",
    TASK_OVERDUE: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border ${colors[trigger]}`}>
      <span>{getTriggerIcon(trigger)}</span>
      {getTriggerLabel(trigger)}
    </span>
  );
};

const ActionBadge = ({ action }: { action: ActionType }) => {
  const colors: Record<ActionType, string> = {
    ASSIGN_USER: "bg-indigo-50 text-indigo-700 border-indigo-200",
    ROUND_ROBIN_ASSIGN: "bg-purple-50 text-purple-700 border-purple-200",
    SEND_NOTIFICATION: "bg-rose-50 text-rose-700 border-rose-200",
    NOTIFY_MANAGER: "bg-amber-50 text-amber-700 border-amber-200",
    SEND_REMINDER: "bg-orange-50 text-orange-700 border-orange-200",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border ${colors[action]}`}>
      <span>{getActionIcon(action)}</span>
      {getActionLabel(action)}
    </span>
  );
};

const StatusBadge = ({ isActive }: { isActive: boolean }) => {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
      isActive 
        ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
        : "bg-gray-50 text-gray-500 border border-gray-200"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-gray-400"}`} />
      {isActive ? "Active" : "Disabled"}
    </span>
  );
};

const SkeletonCard = () => (
  <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
    <div className="flex items-start justify-between mb-3">
      <div className="flex-1">
        <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="flex gap-2">
          <div className="h-6 w-20 bg-gray-200 rounded-full" />
          <div className="h-6 w-20 bg-gray-200 rounded-full" />
        </div>
      </div>
      <div className="h-6 w-16 bg-gray-200 rounded-full" />
    </div>
    <div className="flex items-center gap-3 mt-3">
      <div className="h-8 bg-gray-200 rounded-lg w-24" />
      <div className="h-4 w-4 bg-gray-200 rounded-full" />
      <div className="h-8 bg-gray-200 rounded-lg w-24" />
    </div>
    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
      <div className="h-3 bg-gray-200 rounded w-20" />
      <div className="flex gap-2">
        <div className="h-7 w-12 bg-gray-200 rounded-lg" />
        <div className="h-7 w-7 bg-gray-200 rounded-lg" />
      </div>
    </div>
  </div>
);

// ─── Format Date ───────────────────────────────────────────────────────

const formatDate = (dateString: string) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ─── Main Component ────────────────────────────────────────────────────

export default function AutomationRulesList({
  rules,
  loading,
  error,
  searchQuery,
  setSearchQuery,
  loadRules,
  onToggleRule,
  onDeleteRule,
  onCreateRule,
  stats,
}: AutomationRulesListProps) {
  const filteredRules = rules.filter((rule) => {
    if (!rule || !rule.name) return false;
    const searchLower = searchQuery.toLowerCase();
    return (
      rule.name.toLowerCase().includes(searchLower) ||
      getTriggerLabel(rule.trigger).toLowerCase().includes(searchLower) ||
      getActionLabel(rule.action).toLowerCase().includes(searchLower)
    );
  });

  return (
    <div>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Total Rules</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Active Rules</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.active}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Disabled Rules</p>
          <p className="text-2xl font-bold text-gray-400 mt-1">{stats.disabled}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Recently Created</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{stats.recentlyCreated}</p>
        </div>
      </div>

      {/* Search & Refresh */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search rules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white transition-all"
          />
        </div>
        <button
          onClick={loadRules}
          disabled={loading}
          className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Rules List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-red-200 p-12 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
          <p className="text-red-600 font-medium">{error}</p>
          <button onClick={loadRules} className="mt-4 text-indigo-600 font-semibold hover:underline">
            Try again
          </button>
        </div>
      ) : filteredRules.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <div className="inline-block p-4 bg-gray-50 rounded-full mb-4">
            <Zap className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchQuery ? "No matching rules found" : "No automation rules yet"}
          </h3>
          <p className="text-gray-500 max-w-md mx-auto">
            {searchQuery
              ? "Try adjusting your search query"
              : "Create your first automation rule to streamline your workflows"}
          </p>
          {!searchQuery && (
            <button
              onClick={onCreateRule}
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all"
            >
              <Plus size={18} />
              Create Rule
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRules.map((rule) => (
            <div
              key={rule.id}
              className={`bg-white rounded-xl border p-5 transition-all hover:shadow-md ${
                rule.isActive ? "border-gray-200" : "border-gray-200 bg-gray-50/30"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {rule.isActive ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-gray-400" />
                    )}
                    <h3 className="font-semibold text-gray-900 truncate">{rule.name}</h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <TriggerBadge trigger={rule.trigger} />
                    <ActionBadge action={rule.action} />
                  </div>
                </div>
                <StatusBadge isActive={rule.isActive} />
              </div>

              {/* Flow */}
              <div className="flex items-center gap-2 py-2 px-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-xs font-medium text-gray-700">{getTriggerLabel(rule.trigger)}</span>
                <ArrowRight className="w-3 h-3 text-gray-400" />
                <span className="text-xs font-medium text-gray-700">{getActionLabel(rule.action)}</span>
              </div>

              {/* Config Preview */}
              {Object.keys(rule.config).length > 0 && (
                <div className="mt-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500 mb-0.5">Config:</p>
                  {Object.entries(rule.config).map(([key, value]) => (
                    <div key={key} className="text-xs text-gray-600 flex items-center gap-2">
                      <span className="font-mono text-gray-400">{key}:</span>
                      <span className="font-medium">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-400">{formatDate(rule.createdAt)}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onToggleRule(rule)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      rule.isActive ? "bg-indigo-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        rule.isActive ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <button
                    onClick={() => onDeleteRule(rule)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Rule"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}