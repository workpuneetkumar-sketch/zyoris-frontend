"use client";
// components/leads/assignment/AssignmentAnalyticsDashboard.tsx
// Assignment Analytics — uses GET /leads/assignment-analytics (scaffolded)

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
  AreaChart, Area,
  Legend,
} from "recharts";
import { RefreshCw, TrendingUp, Clock, Users, Zap, AlertCircle } from "lucide-react";
import classNames from "classnames";
import type { AssignmentAnalytics, AssignmentAnalyticsFilters } from "@/types/assignmentRules";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"];

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  sub?: string;
}

function StatCard({ label, value, icon: Icon, color, sub }: StatCardProps) {
  return (
    <div className="bg-surface rounded-2xl border border-border p-5 flex items-start gap-4">
      <div className={classNames("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", color)}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-[12px] font-semibold text-text-muted uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-text mt-0.5">{value}</p>
        {sub && <p className="text-[11.5px] text-text-muted mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface rounded-2xl border border-border p-5">
      <h3 className="text-[13px] font-bold text-text mb-4">{title}</h3>
      {children}
    </div>
  );
}

interface AssignmentAnalyticsDashboardProps {
  analytics: AssignmentAnalytics | null;
  loading: boolean;
  error: string | null;
  backendAvailable: boolean;
  filters: AssignmentAnalyticsFilters;
  onFiltersChange: (f: AssignmentAnalyticsFilters) => void;
  onRefresh: () => void;
}

export function AssignmentAnalyticsDashboard({
  analytics, loading, error, backendAvailable,
  filters, onFiltersChange, onRefresh,
}: AssignmentAnalyticsDashboardProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface rounded-2xl border border-border p-5"><Skeleton variant="card" /></div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface rounded-2xl border border-border p-5 h-60"><Skeleton variant="card" /></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <EmptyState icon={AlertCircle} title="Failed to load analytics" description={error} button={<button onClick={onRefresh} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm">Retry</button>} />;
  }

  const data = analytics;

  return (
    <div className="space-y-5">
      {/* Date range + refresh toolbar */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <input type="date" value={filters.dateFrom} onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
            className="px-3 py-2 rounded-lg border border-border bg-background-secondary text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20" />
          <span className="text-text-muted text-sm">to</span>
          <input type="date" value={filters.dateTo} onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
            className="px-3 py-2 rounded-lg border border-border bg-background-secondary text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <button onClick={onRefresh} className="flex items-center gap-1.5 p-2 rounded-lg border border-border hover:bg-surface-hover text-text-muted transition-colors" title="Refresh">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Backend unavailable notice */}
      {!backendAvailable && data && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-warning-light border border-warning/20 text-warning-foreground">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-semibold">Analytics endpoint not yet available</p>
            <p className="text-[12px] mt-0.5 opacity-75">GET /leads/assignment-analytics is scaffolded and ready. Charts will populate when the backend ships this endpoint.</p>
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Assignments" value={data?.totalAssignments ?? 0} icon={Users} color="bg-primary" />
        <StatCard label="Avg Response Time" value={data?.avgResponseTime ? `${data.avgResponseTime}m` : "—"} icon={Clock} color="bg-purple-500" sub="minutes" />
        <StatCard label="Conversion Rate" value={data?.conversionRate ? `${data.conversionRate.toFixed(1)}%` : "—"} icon={TrendingUp} color="bg-success" />
        <StatCard label="Active Rules" value={data?.activeRules ?? 0} icon={Zap} color="bg-amber-500" />
      </div>

      {/* Charts row 1: Distribution + Response Time */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title="Assignment Distribution">
          {!data?.distribution?.length ? (
            <div className="h-48 flex items-center justify-center text-text-muted text-sm">No data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={data.distribution} dataKey="count" nameKey="assigneeName" cx="50%" cy="50%" outerRadius={80} label={({ assigneeName, percentage }) => `${assigneeName} (${percentage?.toFixed(0)}%)`} labelLine={false}>
                  {data.distribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [`${v} leads`, "Assigned"]} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Average Response Time (Line)">
          {!data?.overTime?.length ? (
            <div className="h-48 flex items-center justify-center text-text-muted text-sm">No data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.overTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={false} name="Assignments" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Charts row 2: Conversion Rate + Strategies */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title="Conversion Rate by Strategy (Bar)">
          {!data?.byStrategy?.length ? (
            <div className="h-48 flex items-center justify-center text-text-muted text-sm">No data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.byStrategy} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
                <YAxis dataKey="strategy" type="category" width={100} tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" name="Assignments" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Assignments Over Time (Area)">
          {!data?.overTime?.length ? (
            <div className="h-48 flex items-center justify-center text-text-muted text-sm">No data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data.overTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#10b981" fill="#10b981" fillOpacity={0.15} name="Assignments" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Top Performers leaderboard */}
      <ChartCard title="Top Performing Assignees">
        {!data?.topPerformers?.length ? (
          <div className="h-24 flex items-center justify-center text-text-muted text-sm">No data available</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Rank", "Assignee", "Total Assigned", "Converted", "Conversion Rate", "Avg Response"].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.topPerformers.map((p, i) => (
                  <tr key={p.assigneeId} className="hover:bg-surface-hover/50 transition-colors">
                    <td className="px-3 py-2.5">
                      <span className={classNames("w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white", i === 0 ? "bg-amber-400" : i === 1 ? "bg-gray-400" : i === 2 ? "bg-orange-400" : "bg-background-tertiary text-text-muted")}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-medium text-text">{p.assigneeName}</td>
                    <td className="px-3 py-2.5 text-text-secondary">{p.totalAssigned}</td>
                    <td className="px-3 py-2.5 text-text-secondary">{p.converted}</td>
                    <td className="px-3 py-2.5">
                      <span className={classNames("text-[12px] font-semibold", p.conversionRate >= 50 ? "text-success" : p.conversionRate >= 30 ? "text-warning" : "text-error")}>
                        {p.conversionRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-text-muted">{p.avgResponseTime != null ? `${p.avgResponseTime}m` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>

      {/* Rule Effectiveness table */}
      <ChartCard title="Rule Effectiveness">
        {!data?.ruleEffectiveness?.length ? (
          <div className="h-24 flex items-center justify-center text-text-muted text-sm">No data available</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Rule", "Total Triggered", "Success Rate", "Avg Conversion"].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.ruleEffectiveness.map((r) => (
                  <tr key={r.ruleId} className="hover:bg-surface-hover/50 transition-colors">
                    <td className="px-3 py-2.5 font-medium text-text">{r.ruleName}</td>
                    <td className="px-3 py-2.5 text-text-secondary">{r.totalTriggered}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-background-tertiary rounded-full h-1.5 max-w-[80px]">
                          <div className="h-1.5 rounded-full bg-primary" style={{ width: `${r.successRate}%` }} />
                        </div>
                        <span className="text-[12px] text-text-secondary">{r.successRate.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-text-secondary">{r.avgConversionRate.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>
    </div>
  );
}
