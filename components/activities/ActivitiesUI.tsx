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
    Clock,
    CheckCircle2,
    AlertCircle,
    AlertTriangle,
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
    Task: <LayoutList size={13} />,
    Call: <Phone size={13} />,
    Meeting: <Users size={13} />,
    Email: <Mail size={13} />,
    Note: <FileText size={13} />,
    WhatsApp: <MessageCircle size={13} />,
};

const TYPE_COLORS: Record<ActivityType, string> = {
    Task: "bg-blue-50   text-blue-600   border-blue-200",
    Call: "bg-green-50  text-green-600  border-green-200",
    Meeting: "bg-violet-50 text-violet-600 border-violet-200",
    Email: "bg-amber-50  text-amber-600  border-amber-200",
    Note: "bg-slate-50  text-slate-600  border-slate-200",
    WhatsApp: "bg-emerald-50 text-emerald-600 border-emerald-200",
};

const TYPE_CHART_COLORS: Record<ActivityType, string> = {
    Task: "#3b82f6",
    Call: "#22c55e",
    Meeting: "#8b5cf6",
    Email: "#f59e0b",
    Note: "#64748b",
    WhatsApp: "#10b981",
};

const STATUS_STYLES: Record<ActivityStatus, string> = {
    Upcoming: "bg-blue-50   text-blue-600   border border-blue-200",
    Completed: "bg-green-50  text-green-600  border border-green-200",
    Overdue: "bg-red-50    text-red-500    border border-red-200",
};

const PRIORITY_STYLES: Record<ActivityPriority, string> = {
    High: "bg-red-50   text-red-500   border border-red-200",
    Medium: "bg-amber-50 text-amber-600 border border-amber-200",
    Low: "bg-green-50 text-green-600 border border-green-200",
};

// ── Sub-components ────────────────────────────────────────────────────────────
function Avatar({ initials }: { initials: string }) {
    return (
        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 text-[11px] font-bold flex items-center justify-center shrink-0">
            {initials}
        </div>
    );
}

function StatCard({
    icon,
    label,
    value,
    change,
    iconBg,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
    change: number;
    iconBg: string;
}) {
    const isPositive = change >= 0;
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-[12px] text-gray-400 font-medium">{label}</p>
                <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                    vs last month{" "}
                    <span className={isPositive ? "text-green-500 font-semibold" : "text-red-500 font-semibold"}>
                        {isPositive ? "↑" : "↓"} {Math.abs(change)}%
                    </span>
                </p>
            </div>
        </div>
    );
}

function DonutChart({ breakdown }: { breakdown: ActivityTypeBreakdown[] }) {
    const total = breakdown.reduce((s, b) => s + b.count, 0);
    const size = 120;
    const r = 42;
    const cx = size / 2;
    const cy = size / 2;
    const circumference = 2 * Math.PI * r;

    let offset = 0;
    const segments = breakdown.map((b) => {
        const pct = b.count / total;
        const dash = pct * circumference;
        const gap = circumference - dash;
        const seg = { ...b, dash, gap, offset };
        offset += dash;
        return seg;
    });

    return (
        <div className="flex items-center gap-5">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={18} />
                {segments.map((seg) => (
                    <circle
                        key={seg.type}
                        cx={cx} cy={cy} r={r}
                        fill="none"
                        stroke={TYPE_CHART_COLORS[seg.type]}
                        strokeWidth={18}
                        strokeDasharray={`${seg.dash} ${seg.gap}`}
                        strokeDashoffset={-seg.offset}
                        style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
                    />
                ))}
            </svg>
            <div className="space-y-1.5">
                {breakdown.map((b) => (
                    <div key={b.type} className="flex items-center gap-2">
                        <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ background: TYPE_CHART_COLORS[b.type] }}
                        />
                        <span className="text-[12px] text-gray-600">{b.type}</span>
                        <span className="text-[12px] text-gray-400 ml-auto pl-3">{b.count} ({b.percentage}%)</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function MiniCalendar({ month, year }: { month: string; year: string }) {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const grid = [
        [28, 29, 30, 1, 2, 3, 4],
        [5, 6, 7, 8, 9, 10, 11],
        [12, 13, 14, 15, 16, 17, 18],
        [19, 20, 21, 22, 23, 24, 25],
        [26, 27, 28, 29, 30, 31, 1],
    ];
    const highlighted = [22];
    const hasActivity = [16, 17, 19, 20, 22, 23];

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <button className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 transition-colors">
                    <ChevronLeft size={13} />
                </button>
                <span className="text-[13px] font-semibold text-gray-700">{month} {year}</span>
                <button className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 transition-colors">
                    <ChevronRight size={13} />
                </button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 mb-1">
                {days.map((d) => (
                    <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1">{d}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
                {grid.flat().map((d, i) => {
                    const isHighlighted = highlighted.includes(d) && i > 6;
                    const hasAct = hasActivity.includes(d) && i > 6;
                    const isGray = i < 3 || (i >= 32);
                    return (
                        <button
                            key={i}
                            className={`relative w-full aspect-square flex items-center justify-center text-[12px] rounded-lg transition-colors
                                ${isHighlighted ? "bg-blue-600 text-white font-bold" : ""}
                                ${!isHighlighted && hasAct ? "font-semibold text-gray-800 hover:bg-blue-50" : ""}
                                ${!isHighlighted && !hasAct ? "text-gray-400 hover:bg-gray-50" : ""}
                                ${isGray ? "opacity-30" : ""}
                            `}
                        >
                            {d}
                            {hasAct && !isHighlighted && (
                                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400" />
                            )}
                        </button>
                    );
                })}
            </div>
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
    stats,
    overdue,
    breakdown,
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
        <div className="min-h-full space-y-5">

            {/* ── Header ──────────────────────────────────────────────────── */}
            {/* RESPONSIVE: flex-col on mobile, flex-row on sm+ with wrapping */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight">Activities</h1>
                    <p className="text-sm text-gray-400 mt-0.5">Track and manage all your tasks, calls, meetings, and activities.</p>
                </div>
                {/* RESPONSIVE: buttons wrap on small screens */}
                <div className="flex items-center gap-2.5 flex-wrap">
                    {/* RESPONSIVE: hide the long date-range label on xs, show on sm+ */}
                    <button className="hidden sm:flex items-center gap-1.5 h-9 px-4 rounded-lg border border-gray-200 bg-white text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                        <Calendar size={14} />
                        {dateRange.from} – {dateRange.to}
                        <ChevronRight size={12} className="rotate-90 text-gray-400" />
                    </button>
                    {/* RESPONSIVE: show icon-only date button on xs */}
                    <button className="sm:hidden flex items-center gap-1.5 h-9 px-3 rounded-lg border border-gray-200 bg-white text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                        <Calendar size={14} />
                    </button>
                    <button className="flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-gray-200 bg-white text-[13px] font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                        <Filter size={13} />
                        <span className="hidden sm:inline">Filter</span>
                    </button>
                    <button
                        onClick={onNewActivity}
                        className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-blue-600 text-white text-[13px] font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
                    >
                        <Plus size={15} />
                        <span className="hidden sm:inline">Add Activity</span>
                    </button>
                </div>
            </div>

            {/* ── Stats cards ─────────────────────────────────────────────── */}
            {/* RESPONSIVE: 2-col on mobile, 4-col on sm+ */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard
                    icon={<LayoutList size={18} className="text-blue-600" />}
                    label="All Activities"
                    value={stats?.all ?? 0}
                    change={stats?.allChange ?? 0}
                    iconBg="bg-blue-50"
                />
                <StatCard
                    icon={<Clock size={18} className="text-amber-500" />}
                    label="Upcoming"
                    value={stats?.upcoming ?? 0}
                    change={stats?.upcomingChange ?? 0}
                    iconBg="bg-amber-50"
                />
                <StatCard
                    icon={<CheckCircle2 size={18} className="text-green-500" />}
                    label="Completed"
                    value={stats?.completed ?? 0}
                    change={stats?.completedChange ?? 0}
                    iconBg="bg-green-50"
                />
                <StatCard
                    icon={<AlertCircle size={18} className="text-red-500" />}
                    label="Overdue"
                    value={stats?.overdue ?? 0}
                    change={stats?.overdueChange ?? 0}
                    iconBg="bg-red-50"
                />
            </div>

            {/* ── Main content grid ────────────────────────────────────────── */}
            {/* RESPONSIVE: single column on mobile, fixed sidebar on lg+ */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 items-start">

                {/* Left — Table */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

                    {/* Tabs + Search */}
                    {/* RESPONSIVE: allow tabs row to scroll horizontally on small screens */}
                    <div className="flex items-center gap-1 px-5 pt-4 border-b border-gray-100 overflow-x-auto">
                        {TABS.map((tab) => (
                            <button
                                key={tab}
                                onClick={() => onTabChange(tab)}
                                className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-t-lg transition-colors whitespace-nowrap shrink-0
                                    ${filters.tab === tab
                                        ? "text-blue-600 border-b-2 border-blue-600 -mb-px"
                                        : "text-gray-500 hover:text-gray-700"
                                    }`}
                            >
                                {tab !== "All Activities" && TYPE_ICON[tab as ActivityType]}
                                {tab}
                            </button>
                        ))}
                        {/* Search — pinned to the right, shrinks on small screens */}
                        <div className="relative ml-auto mb-2 shrink-0">
                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search activities..."
                                value={filters.search}
                                onChange={(e) => onFiltersChange({ search: e.target.value })}
                                className="h-8 pl-8 pr-4 rounded-lg border border-gray-200 bg-gray-50 text-[13px] text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-32 sm:w-48"
                            />
                        </div>
                    </div>

                    {/* Table — always scrollable horizontally */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    {["Activity", "Related To", "Type", "Owner", "Due Date", "Status", "Priority", ""].map((h) => (
                                        <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    Array.from({ length: perPage }).map((_, i) => (
                                        <tr key={i} className="border-b border-gray-50">
                                            {Array.from({ length: 8 }).map((_, j) => (
                                                <td key={j} className="px-5 py-4">
                                                    <div className="h-3.5 bg-gray-100 rounded-md animate-pulse w-3/4" />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : (activities ?? []).length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="text-center py-16 text-gray-400 text-sm">
                                            No activities found.
                                        </td>
                                    </tr>
                                ) : (
                                    (activities ?? []).map((activity) => (
                                        <tr key={activity.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                                            {/* Activity */}
                                            <td className="px-5 py-3.5 max-w-[220px]">
                                                <p className="font-medium text-gray-800 text-[13px] truncate">{activity.title}</p>
                                                <p className="text-[11px] text-gray-400 truncate">{activity.description}</p>
                                            </td>
                                            {/* Related To */}
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <span className="text-[13px] text-blue-600 font-medium hover:underline cursor-pointer">
                                                    {activity.relatedToCompany}
                                                </span>
                                            </td>
                                            {/* Type */}
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[12px] font-medium border ${TYPE_COLORS[activity.type]}`}>
                                                    {TYPE_ICON[activity.type]}
                                                    {activity.type}
                                                </span>
                                            </td>
                                            {/* Owner */}
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <Avatar initials={activity.ownerAvatar} />
                                                    <span className="text-[13px] text-gray-700">{activity.owner}</span>
                                                </div>
                                            </td>
                                            {/* Due Date */}
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <p className="text-[13px] text-gray-700">{activity.createdAt ? getRelativeTime(activity.createdAt) : activity.dueDate}</p>
                                                <p className="text-[11px] text-gray-400">{activity.dueTime}</p>
                                            </td>
                                            {/* Status */}
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium ${STATUS_STYLES[activity.status]}`}>
                                                    {activity.status}
                                                </span>
                                            </td>
                                            {/* Priority */}
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium ${PRIORITY_STYLES[activity.priority]}`}>
                                                    {activity.priority}
                                                </span>
                                            </td>
                                            {/* Actions */}
                                            <td className="px-5 py-3.5 whitespace-nowrap relative">
                                                <button
                                                    onClick={() => setOpenMenu(openMenu === activity.id ? null : activity.id)}
                                                    className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                                                >
                                                    <MoreVertical size={16} />
                                                </button>
                                                {openMenu === activity.id && (
                                                    <div className="absolute right-4 top-10 z-20 bg-white border border-gray-100 rounded-xl shadow-lg py-1 w-36">
                                                        {["View", "Edit", "Delete"].map((action) => (
                                                            <button
                                                                key={action}
                                                                onClick={() => { onAction(action, activity); setOpenMenu(null); }}
                                                                className={`w-full text-left px-4 py-2 text-[13px] hover:bg-gray-50 transition-colors ${action === "Delete" ? "text-red-500" : "text-gray-700"}`}
                                                            >
                                                                {action}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {/* RESPONSIVE: wrap on very small screens */}
                    <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 border-t border-gray-100">
                        <p className="text-[13px] text-gray-400">
                            {loading
                                ? "Loading..."
                                : `Showing ${total === 0 ? 0 : (page - 1) * perPage + 1} to ${Math.min(page * perPage, total)} of ${total} activities`}
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => onPageChange(Math.max(1, page - 1))}
                                disabled={page === 1 || loading}
                                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter((p) => p <= 5 || p === totalPages)
                                .map((p, idx, arr) => (
                                    <span key={p} className="contents">
                                        {idx > 0 && arr[idx - 1] !== p - 1 && (
                                            <span className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm">…</span>
                                        )}
                                        <button
                                            onClick={() => onPageChange(p)}
                                            disabled={loading}
                                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-[13px] font-medium transition-colors ${page === p
                                                    ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                                                    : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                                                }`}
                                        >
                                            {p}
                                        </button>
                                    </span>
                                ))}
                            <button
                                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                                disabled={page === totalPages || loading}
                                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right sidebar */}
                <div className="space-y-4">

                    {/* Calendar */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <h3 className="text-[13px] font-semibold text-gray-700 mb-4">Activity Calendar</h3>
                        <MiniCalendar month="May" year="2024" />
                        {/* RESPONSIVE: wrap legend items if sidebar is narrow */}
                        <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-gray-100">
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                                <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" /> 32 Upcoming
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                                <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" /> 78 Completed
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                                <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" /> 18 Overdue
                            </div>
                        </div>
                    </div>

                    {/* Activity by Type */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <h3 className="text-[13px] font-semibold text-gray-700 mb-4">Activity by Type</h3>
                        {breakdown.length > 0 ? (
                            <DonutChart breakdown={breakdown} />
                        ) : (
                            <div className="h-20 flex items-center justify-center text-[13px] text-gray-400">No data</div>
                        )}
                    </div>

                    {/* Overdue Activities */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[13px] font-semibold text-gray-700">Overdue Activities</h3>
                            <button className="text-[12px] text-blue-600 font-medium hover:underline">View All</button>
                        </div>
                        <div className="space-y-3">
                            {overdue.length === 0 ? (
                                <p className="text-[13px] text-gray-400 text-center py-4">No overdue activities</p>
                            ) : (
                                overdue.map((item) => (
                                    <div key={item.id} className="flex items-start gap-3">
                                        <div className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
                                            <AlertTriangle size={13} className="text-red-500" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[12px] font-medium text-gray-800 leading-snug">{item.title}</p>
                                            <p className="text-[11px] text-gray-400 mt-0.5">
                                                Due {item.dueDate} •{" "}
                                                <span className={`font-semibold ${item.priority === "High" ? "text-red-500" : "text-amber-500"}`}>
                                                    {item.priority}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        {overdue.length > 0 && (
                            <button className="w-full mt-4 py-2.5 rounded-xl border border-red-200 text-red-500 text-[12px] font-semibold hover:bg-red-50 transition-colors">
                                View all overdue activities
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {openMenu !== null && (
                <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
            )}
        </div>
    );
}
