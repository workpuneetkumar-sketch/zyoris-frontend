"use client";

import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api/api";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Briefcase,
  DollarSign,
  TrendingUp,
  Shield,
  Settings,
  AlertCircle,
  RefreshCw,
  Activity,
  Database,
  CheckCircle2,
  Zap,
  BarChart2,
  Globe,
  KeyRound,
  UserCog,
  FileSearch,
  ChevronRight,
} from "lucide-react";
import { toast } from "react-toastify";


interface AdminOverview {
  totalUsers?: number;
  totalLeads?: number;
  totalDeals?: number;
  totalRevenue?: number;
  totalOrganizations?: number;
  [key: string]: unknown;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface LeadsStats {
  total?: number;
  count?: number;
  totalLeads?: number;
  [key: string]: unknown;
}

interface PipelineStage {
  stage?: string;
  amount?: number;
  totalAmount?: number;
  value?: number;
  [key: string]: unknown;
}

interface PipelineStats {
  stages?: PipelineStage[];
  pipeline?: PipelineStage[];
  data?: PipelineStage[];
  totalValue?: number;
  [key: string]: unknown;
}

function extractLeadsCount(data: LeadsStats | null): number | null {
  if (!data) return null;
  if (typeof data.total === "number") return data.total;
  if (typeof data.count === "number") return data.count;
  if (typeof data.totalLeads === "number") return data.totalLeads;
  return null;
}

function sumPipelineValue(data: PipelineStats | null): number | null {
  if (!data) return null;
  if (typeof data.totalValue === "number") return data.totalValue;
  const stages = data.stages ?? data.pipeline ?? data.data;
  if (!Array.isArray(stages) || stages.length === 0) return null;
  return stages.reduce((sum, s) => {
    const amt = s.amount ?? s.totalAmount ?? s.value ?? 0;
    return sum + (typeof amt === "number" ? amt : 0);
  }, 0);
}

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  color: "blue" | "violet" | "emerald" | "amber" | "red" | "slate";
  sub?: string;
}

function StatCard({ label, value, icon: Icon, color, sub }: StatCardProps) {
  const colorMap = {
    blue: { bg: "bg-blue-50", border: "border-blue-100", text: "text-blue-600", val: "text-blue-700" },
    violet: { bg: "bg-violet-50", border: "border-violet-100", text: "text-violet-600", val: "text-violet-700" },
    emerald: { bg: "bg-emerald-50", border: "border-emerald-100", text: "text-emerald-600", val: "text-emerald-700" },
    amber: { bg: "bg-amber-50", border: "border-amber-100", text: "text-amber-600", val: "text-amber-700" },
    red: { bg: "bg-red-50", border: "border-red-100", text: "text-red-600", val: "text-red-700" },
    slate: { bg: "bg-slate-50", border: "border-slate-100", text: "text-slate-600", val: "text-slate-700" },
  };
  const c = colorMap[color];

  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">{label}</p>
        <div className={`p-2 rounded-xl ${c.bg} ${c.border} border group-hover:scale-110 transition-transform`}>
          <Icon size={16} className={c.text} />
        </div>
      </div>
      <p className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1.5 font-medium">{sub}</p>}
    </div>
  );
}

interface RoleBadgeProps {
  role: string;
}

function RoleBadge({ role }: RoleBadgeProps) {
  const map: Record<string, string> = {
    ADMIN: "bg-red-50 text-red-600 border-red-100",
    CEO: "bg-purple-50 text-purple-600 border-purple-100",
    CFO: "bg-blue-50 text-blue-600 border-blue-100",
    SALES_HEAD: "bg-emerald-50 text-emerald-600 border-emerald-100",
    OPERATIONS_HEAD: "bg-amber-50 text-amber-600 border-amber-100",
  };
  const cls = map[role] ?? "bg-gray-100 text-gray-600 border-gray-200";
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cls}`}>
      {role}
    </span>
  );
}

export default function AdminDashboardPage() {
  const { user, token } = useAuth();
  const router = useRouter();

  const [leadsCount, setLeadsCount] = useState<number | null>(null);
  const [dealValue, setDealValue] = useState<number | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [ingestionSummary, setIngestionSummary] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const loadData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);

      const [leadsRes, pipelineRes, teamRes, ingestionRes] = await Promise.all([
        api.get<LeadsStats>("/leads/stats").catch(() => ({ data: null })),
        api.get<PipelineStats>("/api/deals/pipeline-stats").catch(() => ({ data: null })),
        api.get<any>("/organizations/team-members").catch(() => ({ data: { members: [] } })),
        api.get<any>("/ingestion/summary").catch(() => ({ data: null })),
      ]);

      setLeadsCount(extractLeadsCount(leadsRes.data));
      setDealValue(sumPipelineValue(pipelineRes.data));

      const rawMembers = teamRes.data?.members ?? teamRes.data?.data ?? teamRes.data ?? [];
      setTeamMembers(Array.isArray(rawMembers) ? rawMembers : []);

      if (ingestionRes.data) {
        // /ingestion/summary can return multiple shapes:
        // Shape A: { leads, deals, expenses, inventory }          ← ideal
        // Shape B: { totalRows, totalValue, topProducts, ... }    ← observed
        // Shape C: { data: { leads, deals, ... } }                ← nested
        // Shape D: { data: { totalRows, totalValue, ... } }       ← nested + alt keys
        const wrapper = ingestionRes.data as Record<string, unknown>;
        const raw: Record<string, unknown> =
          wrapper.data && typeof wrapper.data === "object"
            ? (wrapper.data as Record<string, unknown>)
            : wrapper;

        const normalised: Record<string, number> = {
          leads:
            typeof raw.leads     === "number" ? raw.leads     :
            typeof raw.totalRows === "number" ? raw.totalRows : 0,
          deals:
            typeof raw.deals     === "number" ? raw.deals     : 0,
          expenses:
            typeof raw.expenses   === "number" ? raw.expenses   :
            typeof raw.totalValue === "number" ? Math.round(raw.totalValue as number) : 0,
          inventory:
            typeof raw.inventory  === "number" ? raw.inventory  : 0,
        };
        setIngestionSummary(normalised);
      }
    } catch (err: any) {
      console.error("Admin dashboard load error", err);
      setError("Failed to load admin dashboard data.");
      toast.error("Error loading admin dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded-lg w-1/3" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-64 bg-gray-200 rounded-2xl lg:col-span-2" />
          <div className="h-64 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h3 className="text-lg font-bold text-gray-900 mb-2">Error Loading Dashboard</h3>
        <p className="text-sm text-gray-500 max-w-md mb-6">{error}</p>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all"
        >
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  // Derive role distribution
  const roleDistribution = teamMembers.reduce<Record<string, number>>((acc, m) => {
    acc[m.role] = (acc[m.role] ?? 0) + 1;
    return acc;
  }, {});

  const ingestionCards = ingestionSummary
    ? [
        { label: "Leads Ingested", value: ingestionSummary.leads ?? 0, color: "blue" as const },
        { label: "Deals Ingested", value: ingestionSummary.deals ?? 0, color: "violet" as const },
        { label: "Total Expenses", value: ingestionSummary.expenses ?? 0, color: "amber" as const },
        { label: "Inventory Items", value: ingestionSummary.inventory ?? 0, color: "emerald" as const },
      ]
    : [];

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Admin Control Center</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
            <Zap size={14} className="text-amber-500 fill-amber-500" />
            Full platform view: organization health, pipeline status, and team directory.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 bg-red-50 text-red-600 text-xs font-bold uppercase tracking-wider rounded-xl border border-red-100 flex items-center gap-1.5">
            <Shield size={13} />
            Role: ADMIN
          </div>
          <button
            onClick={() => router.push("/settings")}
            className="p-2 rounded-xl bg-white border border-gray-200 shadow-sm text-gray-500 hover:text-gray-700 hover:shadow transition-all"
            title="Settings"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Leads"
          value={leadsCount != null ? leadsCount.toLocaleString() : "--"}
          icon={Users}
          color="blue"
          sub="From CRM leads database"
        />
        <StatCard
          label="Pipeline Value"
          value={dealValue != null ? `$${Math.round(dealValue).toLocaleString()}` : "--"}
          icon={Briefcase}
          color="violet"
          sub="Total active deal value"
        />
        <StatCard
          label="Team Size"
          value={teamMembers.length > 0 ? teamMembers.length.toLocaleString() : "--"}
          icon={Globe}
          color="emerald"
          sub="Registered org members"
        />
        <StatCard
          label="Active Roles"
          value={Object.keys(roleDistribution).length > 0 ? Object.keys(roleDistribution).length.toLocaleString() : "--"}
          icon={Activity}
          color="amber"
          sub="Distinct roles in org"
        />
      </div>

      {/* Data Ingestion Summary */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Database size={16} className="text-blue-600" />
            <h3 className="text-sm font-bold text-gray-800">Data Warehouse Summary</h3>
          </div>
          <button
            onClick={() => router.push("/ingestion")}
            className="text-xs text-blue-600 hover:underline font-semibold"
          >
            Manage →
          </button>
        </div>
        {ingestionCards.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {ingestionCards.map((card) => {
              const colorMap = {
                blue: "bg-blue-50 text-blue-600",
                violet: "bg-violet-50 text-violet-600",
                amber: "bg-amber-50 text-amber-600",
                emerald: "bg-emerald-50 text-emerald-600",
              };
              return (
                <div key={card.label} className={`rounded-xl p-4 ${colorMap[card.color]}`}>
                  <p className="text-xs font-semibold opacity-70 mb-1">{card.label}</p>
                  <p className="text-2xl font-extrabold">{card.value.toLocaleString()}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <Database size={28} className="text-gray-200 mb-2" />
            <p className="text-sm">No ingestion data available yet.</p>
            <button
              onClick={() => router.push("/ingestion")}
              className="mt-3 text-xs text-blue-600 hover:underline font-semibold"
            >
              Upload data →
            </button>
          </div>
        )}
      </div>

      {/* Team Directory + Role Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Directory */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col" style={{ maxHeight: 420 }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-blue-600" />
              <h3 className="text-sm font-bold text-gray-800">Team Directory</h3>
            </div>
            <button
              onClick={() => router.push("/team")}
              className="text-xs text-blue-600 hover:underline font-semibold"
            >
              View All
            </button>
          </div>
          <div className="overflow-y-auto flex-1">
            {teamMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                <Users size={28} className="text-gray-200 mb-2" />
                <p className="text-sm">No team members found</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50">
                    {["Name", "Email", "Role"].map((h) => (
                      <th
                        key={h}
                        className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.slice(0, 20).map((member) => (
                    <tr key={member.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-800 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold flex items-center justify-center shrink-0">
                            {member.name?.slice(0, 2).toUpperCase() || "??"}
                          </div>
                          {member.name}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs truncate max-w-[180px]">{member.email}</td>
                      <td className="px-5 py-3">
                        <RoleBadge role={member.role} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Role Distribution */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={16} className="text-violet-600" />
            <h3 className="text-sm font-bold text-gray-800">Role Distribution</h3>
          </div>
          {Object.keys(roleDistribution).length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <BarChart2 size={28} className="text-gray-200 mb-2" />
              <p className="text-sm">No role data available</p>
            </div>
          ) : (
            <div className="space-y-3 flex-1">
              {Object.entries(roleDistribution)
                .sort(([, a], [, b]) => b - a)
                .map(([role, count]) => {
                  const maxCount = Math.max(...Object.values(roleDistribution));
                  const pct = Math.round((count / maxCount) * 100);
                  return (
                    <div key={role}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <RoleBadge role={role} />
                        <span className="font-bold text-gray-700 font-mono">{count}</span>
                      </div>
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Quick Nav */}
          <div className="mt-4 pt-4 border-t border-gray-50 space-y-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              Quick Navigation
            </p>
            {[
              { label: "Analytics", href: "/analytics", icon: BarChart2 },
              { label: "Leads", href: "/leads", icon: TrendingUp },
              { label: "Finance", href: "/finance", icon: DollarSign },
              { label: "HR", href: "/hr", icon: Users },
              { label: "Settings", href: "/settings", icon: Settings },
            ].map(({ label, href, icon: NavIcon }) => (
              <button
                key={href}
                onClick={() => router.push(href)}
                className="w-full flex items-center gap-2 text-xs font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors text-left"
              >
                <NavIcon size={13} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* RBAC Management Quick-Links */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={16} className="text-blue-600" />
          <h3 className="text-sm font-bold text-gray-800">Access Control (RBAC)</h3>
          <span className="ml-auto text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 uppercase tracking-wider">
            Admin Only
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            {
              href: "/admin/roles",
              icon: KeyRound,
              title: "Roles",
              desc: "Create, edit, delete roles and manage their permissions",
              color: "blue",
            },
            {
              href: "/admin/user-roles",
              icon: UserCog,
              title: "User Roles",
              desc: "Assign roles to team members and inspect effective permissions",
              color: "purple",
            },
            {
              href: "/admin/audit",
              icon: FileSearch,
              title: "Audit Logs",
              desc: "Browse paginated system event logs and inspect action details",
              color: "emerald",
            },
          ].map(({ href, icon: Icon, title, desc, color }) => {
            const colorMap: Record<string, { bg: string; text: string; hover: string }> = {
              blue: { bg: "bg-blue-50", text: "text-blue-600", hover: "hover:border-blue-300 hover:bg-blue-50/40" },
              purple: { bg: "bg-purple-50", text: "text-purple-600", hover: "hover:border-purple-300 hover:bg-purple-50/40" },
              emerald: { bg: "bg-emerald-50", text: "text-emerald-600", hover: "hover:border-emerald-300 hover:bg-emerald-50/40" },
            };
            const c = colorMap[color];
            return (
              <button
                key={href}
                onClick={() => router.push(href)}
                className={`flex items-center gap-3 text-left p-4 rounded-xl border border-gray-100 transition-all group ${c.hover}`}
              >
                <div className={`w-9 h-9 ${c.bg} rounded-lg flex items-center justify-center shrink-0`}>
                  <Icon size={18} className={c.text} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{title}</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{desc}</p>
                </div>
                <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 shrink-0 transition-colors" />
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}

