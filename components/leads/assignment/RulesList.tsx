"use client";
import { useState } from "react";
import {
  Search, Plus, RefreshCw, Pencil, Trash2,
  CheckCircle, XCircle, Zap, ArrowUpDown,
} from "lucide-react";
import classNames from "classnames";
import type { AssignmentRule } from "@/types/assignmentRules";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

const STRATEGY_BADGE: Record<string, string> = {
  ROUND_ROBIN: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  EQUAL_DISTRIBUTION: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  COUNTRY: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  LANGUAGE: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  PIN_CODE: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  AI_RECOMMENDATION: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  MANUAL: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};
const STRATEGY_LABEL: Record<string, string> = {
  ROUND_ROBIN: "Round Robin",
  EQUAL_DISTRIBUTION: "Equal Distribution",
  COUNTRY: "Country Match",
  LANGUAGE: "Language Match",
  PIN_CODE: "Pin Code Match",
  AI_RECOMMENDATION: "AI Recommendation",
  MANUAL: "Manual",
};

interface Props {
  rules: AssignmentRule[];
  filteredRules: AssignmentRule[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: "all" | "ACTIVE" | "INACTIVE";
  onStatusFilterChange: (f: "all" | "ACTIVE" | "INACTIVE") => void;
  onNewRule: () => void;
  onEditRule: (rule: AssignmentRule) => void;
  onDeleteRule: (rule: AssignmentRule) => void;
  onToggleStatus: (rule: AssignmentRule) => void;
  onRefresh: () => void;
}

type SortField = "name" | "priority" | "strategy";

function FilterChips({ value, options, onChange }: {
  value: string;
  options: { label: string; value: string }[];
  onChange: (v: any) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={classNames(
            "px-3 py-1.5 rounded-full text-[12px] font-medium transition-all",
            value === o.value
              ? "bg-primary text-primary-foreground"
              : "bg-background-secondary text-text-muted hover:bg-surface-hover border border-border"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function RulesList({
  rules, filteredRules, loading, error,
  searchQuery, onSearchChange,
  statusFilter, onStatusFilterChange,
  onNewRule, onEditRule, onDeleteRule, onToggleStatus, onRefresh,
}: Props) {
  const [sortField, setSortField] = useState<SortField>("priority");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function toggleSort(f: SortField) {
    if (sortField === f) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(f); setSortDir("asc"); }
  }

  const sorted = [...filteredRules].sort((a, b) => {
    let cmp = 0;
    if (sortField === "name") cmp = a.name.localeCompare(b.name);
    else if (sortField === "priority") cmp = a.priority - b.priority;
    else if (sortField === "strategy") cmp = a.strategy.localeCompare(b.strategy);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const SortBtn = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => toggleSort(field)}
      className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted hover:text-text transition-colors"
    >
      {children}
      <ArrowUpDown size={10} className={sortField === field ? "text-primary" : "opacity-40"} />
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
            <input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search rules, territories, cities…"
              className="pl-9 pr-3 py-2 rounded-lg border border-border bg-background-secondary text-sm text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 w-64"
            />
          </div>
          <FilterChips
            value={statusFilter}
            onChange={onStatusFilterChange}
            options={[
              { label: "All", value: "all" },
              { label: "Active", value: "ACTIVE" },
              { label: "Inactive", value: "INACTIVE" },
            ]}
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={onRefresh} className="p-2 rounded-lg border border-border hover:bg-surface-hover text-text-muted transition-colors" title="Refresh">
            <RefreshCw size={14} />
          </button>
          <button
            onClick={onNewRule}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary-dark transition-colors shadow-sm"
          >
            <Plus size={14} />
            New Rule
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-surface overflow-hidden">
        {loading ? (
          <div className="p-6"><Skeleton variant="table" /></div>
        ) : error ? (
          <EmptyState icon={XCircle} title="Failed to load rules" description={error}
            button={<button onClick={onRefresh} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm">Retry</button>}
          />
        ) : sorted.length === 0 ? (
          <EmptyState icon={Zap} title="No assignment rules"
            description={searchQuery || statusFilter !== "all" ? "No rules match your filters." : "Create your first rule to start auto-assigning leads."}
            button={!searchQuery && statusFilter === "all"
              ? <button onClick={onNewRule} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"><Plus size={14} /> Create Rule</button>
              : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-background-secondary/50">
                <tr>
                  <th className="text-left px-4 py-3 w-8 text-[11px] font-semibold uppercase tracking-wide text-text-muted">#</th>
                  <th className="text-left px-4 py-3"><SortBtn field="name">Rule Name</SortBtn></th>
                  <th className="text-left px-4 py-3"><SortBtn field="strategy">Strategy</SortBtn></th>
                  <th className="text-left px-4 py-3"><SortBtn field="priority">Priority</SortBtn></th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-text-muted">Filters</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-text-muted">Assignees</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-text-muted">Status</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-text-muted">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sorted.map((rule, i) => {
                  const filterChips = [
                    ...rule.territories.map((t) => ({ label: t, color: "bg-amber-100 text-amber-700 dark:bg-amber-900/20" })),
                    ...rule.cities.map((c) => ({ label: c, color: "bg-sky-100 text-sky-700 dark:bg-sky-900/20" })),
                    ...rule.states.map((s) => ({ label: s, color: "bg-green-100 text-green-700 dark:bg-green-900/20" })),
                    ...rule.products.map((p) => ({ label: p, color: "bg-violet-100 text-violet-700 dark:bg-violet-900/20" })),
                    ...(rule.countries ?? []).map((co) => ({ label: co, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20" })),
                    ...(rule.languages ?? []).map((l) => ({ label: l, color: "bg-rose-100 text-rose-700 dark:bg-rose-900/20" })),
                    ...(rule.pinCodes ?? []).map((pc) => ({ label: pc, color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20" })),
                  ];
                  const hasBudget = rule.minBudget != null || rule.maxBudget != null;

                  return (
                    <tr key={rule.id} className="hover:bg-surface-hover/50 transition-colors">
                      <td className="px-4 py-3 text-[12px] font-bold text-text-muted">{i + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-text text-[13px]">{rule.name}</p>
                        {hasBudget && (
                          <p className="text-[11px] text-text-muted mt-0.5">
                            Budget: {rule.minBudget != null ? `₹${rule.minBudget.toLocaleString()}` : "—"}
                            {" – "}
                            {rule.maxBudget != null ? `₹${rule.maxBudget.toLocaleString()}` : "—"}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={classNames("inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-medium", STRATEGY_BADGE[rule.strategy] ?? "bg-background-secondary text-text-muted")}>
                          {STRATEGY_LABEL[rule.strategy] ?? rule.strategy}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-text text-[13px]">{rule.priority}</td>
                      <td className="px-4 py-3">
                        {filterChips.length === 0 ? (
                          <span className="text-[12px] text-text-muted">Any</span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {filterChips.slice(0, 4).map((c, idx) => (
                              <span key={idx} className={classNames("px-1.5 py-0.5 rounded text-[10.5px] font-medium", c.color)}>{c.label}</span>
                            ))}
                            {filterChips.length > 4 && (
                              <span className="text-[11px] text-text-muted">+{filterChips.length - 4}</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {rule.assigneeIds.length === 0 ? (
                          <span className="text-[12px] text-text-muted">None</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {rule.assigneeIds.slice(0, 2).map((id) => (
                              <span key={id} className="inline-block px-1.5 py-0.5 rounded text-[10.5px] font-mono bg-background-tertiary text-text-secondary border border-border truncate max-w-[80px]" title={id}>
                                {id.length > 8 ? `…${id.slice(-6)}` : id}
                              </span>
                            ))}
                            {rule.assigneeIds.length > 2 && (
                              <span className="text-[11px] text-text-muted">+{rule.assigneeIds.length - 2}</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => onToggleStatus(rule)}
                          title={rule.status === "ACTIVE" ? "Click to deactivate" : "Click to activate"}
                          className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                        >
                          {rule.status === "ACTIVE"
                            ? <><CheckCircle size={14} className="text-success" /><span className="text-[12px] font-medium text-success">Active</span></>
                            : <><XCircle size={14} className="text-text-muted" /><span className="text-[12px] font-medium text-text-muted">Inactive</span></>
                          }
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onEditRule(rule)}
                            className="p-2 rounded-lg hover:bg-primary/10 text-text-muted hover:text-primary transition-colors"
                            title="Edit"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => onDeleteRule(rule)}
                            className="p-2 rounded-lg hover:bg-error/10 text-text-muted hover:text-error transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-[11.5px] text-text-muted">
        {sorted.length} of {rules.length} rules · evaluated in ascending priority order
      </p>
    </div>
  );
}
