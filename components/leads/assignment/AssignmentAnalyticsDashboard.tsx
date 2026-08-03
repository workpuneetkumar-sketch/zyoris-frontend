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
}export function AssignmentAnalyticsDashboard({
  analytics, loading, error, backendAvailable,
  filters, onFiltersChange, onRefresh,
}: AssignmentAnalyticsDashboardProps) {
  if (loading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface rounded-2xl border border-border p-6"><Skeleton variant="card" /></div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface rounded-2xl border border-border p-6 h-64"><Skeleton variant="card" /></div>
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
    <div className="space-y-6">
      {/* Date range + filters toolbar */}
      <div className="flex flex-wrap items-center gap-3 justify-between bg-white p-4 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <input type="date" value={filters.dateFrom} onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
              className="px-3 py-2 rounded-lg border border-border bg-background-secondary text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20" />
            <span className="text-text-muted text-sm">to</span>
            <input type="date" value={filters.dateTo} onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
              className="px-3 py-2 rounded-lg border border-border bg-background-secondary text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>

          <div className="h-4 w-px bg-border hidden sm:block" />

          {/* Strategy filter */}
          <select
            value={filters.strategy}
            onChange={(e) => onFiltersChange({ ...filters, strategy: e.target.value })}
            className="px-3 py-2 rounded-lg border border-border bg-background-secondary text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
          >
            <option value="All">All Strategies</option>
            <option value="ROUND_ROBIN">Round Robin</option>
            <option value="EQUAL_DISTRIBUTION">Equal Distribution</option>
            <option value="COUNTRY">Country Match</option>
            <option value="LANGUAGE">Language Match</option>
            <option value="PIN_CODE">Pin Code Match</option>
            <option value="AI_RECOMMENDATION">AI Recommendation</option>
            <option value="MANUAL">Manual</option>
          </select>

          {/* Group By filter */}
          <select
            value={filters.groupBy || "DAY"}
            onChange={(e) => onFiltersChange({ ...filters, groupBy: e.target.value as any })}
            className="px-3 py-2 rounded-lg border border-border bg-background-secondary text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
          >
            <option value="DAY">Group by Day</option>
            <option value="WEEK">Group by Week</option>
            <option value="MONTH">Group by Month</option>
            <option value="USER">Group by User</option>
            <option value="STRATEGY">Group by Strategy</option>
          </select>
        </div>
        <button onClick={onRefresh} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border hover:bg-surface-hover text-text-muted hover:text-text transition-all text-sm font-medium" title="Refresh">
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Assignments" value={data?.totalAssignments ?? 0} icon={Users} color="bg-blue-500" />
        <StatCard label="Total Converted" value={data?.totalConverted ?? 0} icon={TrendingUp} color="bg-emerald-500" sub="leads converted" />
        <StatCard label="Conversion Rate" value={data?.conversionRate ? `${data.conversionRate.toFixed(1)}%` : "0.0%"} icon={TrendingUp} color="bg-teal-500" />
        <StatCard label="Avg Response Time" value={data?.avgResponseTime ? `${data.avgResponseTime}m` : "—"} icon={Clock} color="bg-indigo-500" sub="minutes (avg)" />
      </div>

      {/* Charts row 1: Distribution + Response Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Assignment Distribution">
          {!data?.distribution?.length ? (
            <div className="h-64 flex items-center justify-center text-text-muted text-sm">No data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={data.distribution} dataKey="count" nameKey="assigneeName" cx="50%" cy="50%" outerRadius={85} label={({ assigneeName, percentage }) => `${assigneeName} (${percentage?.toFixed(0)}%)`} labelLine={true}>
                  {data.distribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }} formatter={(v) => [`${v} leads`, "Assigned"]} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Average Response Time Over Time">
          {!data?.overTime?.length ? (
            <div className="h-64 flex items-center justify-center text-text-muted text-sm">No data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.overTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }} />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} activeDot={{ r: 6 }} name="Assignments" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Charts row 2: Conversion Rate + Strategies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Assignments by Strategy">
          {!data?.byStrategy?.length ? (
            <div className="h-64 flex items-center justify-center text-text-muted text-sm">No data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.byStrategy} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis dataKey="strategy" type="category" width={110} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }} />
                <Bar dataKey="count" fill="#8b5cf6" name="Assignments" radius={[0, 6, 6, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Assignments Volume Over Time">
          {!data?.overTime?.length ? (
            <div className="h-64 flex items-center justify-center text-text-muted text-sm">No data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.overTime}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }} />
                <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" name="Assignments" />
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
                <tr className="border-b border-border text-left">
                  {["Rank", "Assignee", "Total Assigned", "Converted", "Conversion Rate", "Avg Response"].map((h) => (
                    <th key={h} className="pb-3 text-[11px] font-bold uppercase tracking-wider text-text-muted whitespace-nowrap px-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.topPerformers.map((p, i) => (
                  <tr key={p.assigneeId} className="hover:bg-surface-hover/50 transition-colors">
                    <td className="py-3 px-3">
                      <span className={classNames("w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-sm", i === 0 ? "bg-amber-400" : i === 1 ? "bg-slate-400" : i === 2 ? "bg-orange-400" : "bg-background-tertiary text-text-muted")}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-text">{p.assigneeName}</td>
                    <td className="py-3 px-3 text-text-secondary">{p.totalAssigned}</td>
                    <td className="py-3 px-3 text-text-secondary">{p.converted}</td>
                    <td className="py-3 px-3">
                      <span className={classNames("text-[12px] font-bold", p.conversionRate >= 50 ? "text-success" : p.conversionRate >= 30 ? "text-warning" : "text-error")}>
                        {p.conversionRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-text-muted font-medium">{p.avgResponseTime != null ? `${p.avgResponseTime}m` : "—"}</td>
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
                <tr className="border-b border-border text-left">
                  {["Rule", "Total Triggered", "Success Rate", "Avg Conversion"].map((h) => (
                    <th key={h} className="pb-3 text-[11px] font-bold uppercase tracking-wider text-text-muted px-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.ruleEffectiveness.map((r) => (
                  <tr key={r.ruleId} className="hover:bg-surface-hover/50 transition-colors">
                    <td className="py-3 px-3 font-semibold text-text">{r.ruleName}</td>
                    <td className="py-3 px-3 text-text-secondary">{r.totalTriggered}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-background-tertiary rounded-full h-1.5 max-w-[100px] overflow-hidden">
                          <div className="h-1.5 rounded-full bg-primary" style={{ width: `${r.successRate}%` }} />
                        </div>
                        <span className="text-[12px] text-text-secondary font-bold">{r.successRate.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-text-secondary font-medium">{r.avgConversionRate.toFixed(1)}%</td>
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
