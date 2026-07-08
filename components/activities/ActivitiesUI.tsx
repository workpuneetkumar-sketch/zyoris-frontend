// components/activities/ActivitiesUI.tsx
"use client";

import {
  Search,
  Plus,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Filter,
  Calendar,
  LayoutList,
  Phone,
  Users,
  Mail,
  FileText,
  MessageCircle,
  Trash2,
  Edit,
  Eye,
} from "lucide-react";
import {
  Activity,
  ActivityStats,
  ActivityType,
  ActivityStatus,
  ActivityPriority,
  OverdueActivity,
  ActivityTypeBreakdown,
  ActivitiesFilters,
} from "@/types/activities";

// ── Helper: Get relative time ─────────────────────────────────────────────────
function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return "just now";
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  } else if (diffDays === 1) {
    return "yesterday";
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────
const TABS: Array<ActivitiesFilters["tab"]> = [
  "All Activities", "Task", "Call", "Meeting", "Email", "Note", "WhatsApp",
];

const TYPE_ICON: Record<ActivityType, React.ReactNode> = {
  Task: <LayoutList size={16} />,
  Call: <Phone size={16} />,
  Meeting: <Users size={16} />,
  Email: <Mail size={16} />,
  Note: <FileText size={16} />,
  WhatsApp: <MessageCircle size={16} />,
};

const TYPE_COLORS: Record<ActivityType, string> = {
  Task: "bg-blue-50 text-blue-600 border-blue-200",
  Call: "bg-green-50 text-green-600 border-green-200",
  Meeting: "bg-purple-50 text-purple-600 border-purple-200",
  Email: "bg-amber-50 text-amber-600 border-amber-200",
  Note: "bg-gray-50 text-gray-600 border-gray-200",
  WhatsApp: "bg-emerald-50 text-emerald-600 border-emerald-200",
};

const STATUS_STYLES: Record<ActivityStatus, string> = {
  Upcoming: "bg-blue-50 text-blue-600 border border-blue-200",
  Completed: "bg-green-50 text-green-600 border border-green-200",
  Overdue: "bg-red-50 text-red-500 border border-red-200",
};

const PRIORITY_STYLES: Record<ActivityPriority, string> = {
  High: "bg-red-50 text-red-500 border border-red-200",
  Medium: "bg-amber-50 text-amber-600 border border-amber-200",
  Low: "bg-green-50 text-green-600 border border-green-200",
};

// ── Sub-components ────────────────────────────────────────────────────────────
function Avatar({ initials }: { initials: string }) {
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0 shadow-sm">
      {initials}
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
export interface ActivitiesTableProps {
    activities: Activity[];
    total: number;
    page: number;
    perPage: number;
    filters: ActivitiesFilters;
    loading: boolean;
    openMenu: string | null;
    stats: ActivityStats | null;
    overdue: OverdueActivity[];
    breakdown: ActivityTypeBreakdown[];
    dateRange: { from: string; to: string };
    onPageChange: (page: number) => void;
    onFiltersChange: (f: Partial<ActivitiesFilters>) => void;
    onTabChange: (tab: ActivitiesFilters["tab"]) => void;
    onNewActivity: () => void;
    onAction: (action: string, activity: Activity) => void;
    setOpenMenu: (id: string | null) => void;
}

// ── Main Component ────────────────────────────────────────────────────────────
export function ActivitiesTable({
    activities,
    total,
    page,
    perPage,
    filters,
    loading,
    openMenu,
    dateRange,
    onPageChange,
    onFiltersChange,
    onTabChange,
    onNewActivity,
    onAction,
    setOpenMenu,
}: ActivitiesTableProps) {
    const totalPages = Math.max(1, Math.ceil(total / perPage));

    return (
        <div className="min-h-full">
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 leading-tight">Activities</h1>
                    <p className="text-gray-500 mt-1">Track and manage all your tasks, calls, meetings, and activities in one place.</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <button className="flex items-center gap-2 h-10 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all">
                        <Calendar size={18} />
                        <span className="hidden sm:inline">{dateRange.from} – {dateRange.to}</span>
                    </button>
                    <button className="flex items-center gap-2 h-10 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all">
                        <Filter size={18} />
                        <span className="hidden sm:inline">Filter</span>
                    </button>
                    <button
                        onClick={onNewActivity}
                        className="flex items-center gap-2 h-10 px-5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                    >
                        <Plus size={18} />
                        <span>Add Activity</span>
                    </button>
                </div>
            </div>

            {/* ── Tabs ────────────────────────────────────────────────────── */}
            <div className="flex items-center gap-1 overflow-x-auto mb-6 pb-2">
                {TABS.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => onTabChange(tab)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap shrink-0
                            ${filters.tab === tab
                                ? "bg-blue-50 text-blue-700"
                                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                            }`}
                    >
                        {tab !== "All Activities" && TYPE_ICON[tab as ActivityType]}
                        {tab}
                    </button>
                ))}
                <div className="relative ml-auto shrink-0">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search activities..."
                        value={filters.search}
                        onChange={(e) => onFiltersChange({ search: e.target.value })}
                        className="w-full sm:w-64 pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                    />
                </div>
            </div>

            {/* ── Table Container ────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* ── Table ───────────────────────────────────────────────────── */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/50">
                                {["Activity", "Related To", "Type", "Owner", "Due Date", "Status", "Priority", ""].map((h) => (
                                    <th key={h} className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="bg-white">
                                        {Array.from({ length: 8 }).map((_, j) => (
                                            <td key={j} className="px-6 py-4">
                                                <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : (activities ?? []).length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-16">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center">
                                                <LayoutList size={32} className="text-gray-300" />
                                            </div>
                                            <p className="text-gray-500 font-medium">No activities found</p>
                                            <p className="text-gray-400 text-sm">Create your first activity to get started</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                (activities ?? []).map((activity) => (
                                    <tr key={activity.id} className="bg-white hover:bg-gray-50/80 transition-colors group">
                                        {/* Activity */}
                                        <td className="px-6 py-4">
                                            <div className="max-w-xs">
                                                <p className="font-semibold text-gray-900 truncate">{activity.title}</p>
                                                <p className="text-sm text-gray-500 truncate mt-0.5">{activity.description}</p>
                                            </div>
                                        </td>
                                        {/* Related To */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-sm text-blue-600 font-medium hover:text-blue-700 cursor-pointer">
                                                    {activity.relatedToCompany}
                                                </span>
                                                {activity.relatedTo && (
                                                    <span className="text-xs text-gray-400">{activity.relatedTo}</span>
                                                )}
                                            </div>
                                        </td>
                                        {/* Type */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${TYPE_COLORS[activity.type]}`}>
                                                {TYPE_ICON[activity.type]}
                                                {activity.type}
                                            </span>
                                        </td>
                                        {/* Owner */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <Avatar initials={activity.ownerAvatar} />
                                                <span className="text-sm text-gray-700 font-medium">{activity.owner}</span>
                                            </div>
                                        </td>
                                        {/* Due Date */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <p className="text-sm text-gray-700 font-medium">
                                                    {activity.createdAt ? getRelativeTime(activity.createdAt) : activity.dueDate}
                                                </p>
                                                <p className="text-xs text-gray-400">{activity.dueTime}</p>
                                            </div>
                                        </td>
                                        {/* Status */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${STATUS_STYLES[activity.status]}`}>
                                                {activity.status}
                                            </span>
                                        </td>
                                        {/* Priority */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${PRIORITY_STYLES[activity.priority]}`}>
                                                {activity.priority}
                                            </span>
                                        </td>
                                        {/* Actions */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => onAction("View", activity)}
                                                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100"
                                                    title="View"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button
                                                    onClick={() => onAction("Edit", activity)}
                                                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Edit"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => setOpenMenu(openMenu === activity.id ? null : activity.id)}
                                                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                                                >
                                                    <MoreVertical size={16} />
                                                </button>
                                            </div>
                                            {openMenu === activity.id && (
                                                <div className="absolute right-4 mt-2 z-30 bg-white border border-gray-100 rounded-xl shadow-xl py-2 w-44">
                                                    <button
                                                        onClick={() => { onAction("View", activity); setOpenMenu(null); }}
                                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                    >
                                                        <Eye size={16} />
                                                        View Details
                                                    </button>
                                                    <button
                                                        onClick={() => { onAction("Edit", activity); setOpenMenu(null); }}
                                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                    >
                                                        <Edit size={16} />
                                                        Edit Activity
                                                    </button>
                                                    <div className="border-t border-gray-100 my-1" />
                                                    <button
                                                        onClick={() => { onAction("Delete", activity); setOpenMenu(null); }}
                                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                        Delete Activity
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* ── Pagination ─────────────────────────────────────────────── */}
                <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 border-t border-gray-100 bg-gray-50/30">
                    <p className="text-sm text-gray-500">
                        {loading
                            ? "Loading activities..."
                            : `Showing ${total === 0 ? 0 : (page - 1) * perPage + 1} to ${Math.min(page * perPage, total)} of ${total} activities`}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onPageChange(Math.max(1, page - 1))}
                            disabled={page === 1 || loading}
                            className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1)
                                .map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => onPageChange(p)}
                                        disabled={loading}
                                        className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-semibold transition-all ${page === p
                                            ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                                            : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                                        }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                        </div>
                        <button
                            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                            disabled={page === totalPages || loading}
                            className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {openMenu !== null && (
                <div className="fixed inset-0 z-20" onClick={() => setOpenMenu(null)} />
            )}
        </div>
    );
}
