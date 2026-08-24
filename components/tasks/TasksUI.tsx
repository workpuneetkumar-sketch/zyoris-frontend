"use client";

import { useState, useEffect } from "react";
import {
    Plus,
    Search,
    ChevronRight,
    MoreVertical,
    CheckCircle2,
    Circle,
    Clock,
    AlertCircle,
    X,
    ListTodo,
    User,
    Calendar,
    Loader2,
    KanbanSquare,
    LayoutList,
    CalendarDays,
    ChevronLeft,
    GripVertical,
} from "lucide-react";
import { Task, TaskPriority, TaskStatus, CreateTaskPayload } from "@/lib/api/tasksApi";
import { fetchTeamMembers } from "@/lib/api/leadsApi";
import { TaskFilter } from "@/hooks/useTasks";

// ── Constants ─────────────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<TaskPriority, string> = {
    HIGH:   "bg-red-50   text-red-500   border border-red-200",
    MEDIUM: "bg-amber-50 text-amber-600 border border-amber-200",
    LOW:    "bg-green-50 text-green-600 border border-green-200",
};

const STATUS_STYLES: Record<TaskStatus, string> = {
    TODO:        "bg-gray-100   text-gray-500   border border-gray-200",
    IN_PROGRESS: "bg-blue-50    text-blue-600   border border-blue-200",
    DONE:        "bg-green-50   text-green-600  border border-green-200",
};

const STATUS_LABELS: Record<TaskStatus, string> = {
    TODO:        "To Do",
    IN_PROGRESS: "In Progress",
    DONE:        "Done",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function Avatar({ name }: { name: string }) {
    const initials = name
        .split(" ")
        .map((p) => p[0]?.toUpperCase() ?? "")
        .join("")
        .slice(0, 2);
    return (
        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 text-[11px] font-bold flex items-center justify-center shrink-0">
            {initials}
        </div>
    );
}

function StatusIcon({ status }: { status: TaskStatus }) {
    if (status === "DONE") return <CheckCircle2 size={16} className="text-green-500 shrink-0" />;
    if (status === "IN_PROGRESS") return <Clock size={16} className="text-blue-500 shrink-0" />;
    return <Circle size={16} className="text-gray-400 shrink-0" />;
}

// ── Create Task Modal ─────────────────────────────────────────────────────────

interface TeamMember {
    id: string;
    name: string;
    role: string;
    email?: string;
}

interface CreateTaskModalProps {
    saving: boolean;
    saveError: string | null;
    onClose: () => void;
    onSave: (data: CreateTaskPayload) => Promise<boolean>;
}

function CreateTaskModal({ saving, saveError, onClose, onSave }: CreateTaskModalProps) {
    const [form, setForm] = useState<CreateTaskPayload>({
        title: "",
        description: "",
        priority: "LOW",
        dueDate: "",
        assignedToId: "",
        status: "TODO",
        leadId: "",
        dealId: "",
        projectId: "",
    });
    const [errors, setErrors] = useState<{ title?: string }>({});
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [membersLoading, setMembersLoading] = useState(false);

    useEffect(() => {
        setMembersLoading(true);
        fetchTeamMembers()
            .then((data) => setMembers(data.members ?? data ?? []))
            .catch(() => setMembers([]))
            .finally(() => setMembersLoading(false));
    }, []);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async () => {
        if (!form.title.trim()) {
            setErrors({ title: "Title is required" });
            return;
        }
        setErrors({});
        
        const payload: CreateTaskPayload = {
            title: form.title.trim(),
            status: form.status,
            priority: form.priority,
        };

        if (form.description?.trim()) payload.description = form.description.trim();
        if (form.assignedToId?.trim()) payload.assignedToId = form.assignedToId.trim();
        if (form.leadId?.trim()) payload.leadId = form.leadId.trim();
        if (form.dealId?.trim()) payload.dealId = form.dealId.trim();
        if (form.projectId?.trim()) payload.projectId = form.projectId.trim();
        
        if (form.dueDate) {
            payload.dueDate = new Date(form.dueDate).toISOString();
        }

        await onSave(payload);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 md:p-4">
            <div className="bg-gray-50 w-full max-w-xl rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-5 md:px-6 py-4 bg-white border-b border-gray-200">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Create Task</h2>
                        <p className="text-sm text-gray-400 mt-0.5">Add a new task to the list</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                        aria-label="Close"
                    >
                        <X size={16} className="text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 md:p-6 max-h-[75vh] overflow-y-auto space-y-5">
                    {saveError && (
                        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-[13px] text-red-600 flex items-center gap-2">
                            <AlertCircle size={14} />
                            {saveError}
                        </div>
                    )}

                    {/* Title */}
                    <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                            Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            name="title"
                            value={form.title}
                            onChange={handleChange}
                            placeholder="Task title..."
                            className={`w-full h-11 rounded-xl border px-4 text-sm text-gray-900 outline-none focus:ring-4 focus:ring-blue-50 transition-all ${
                                errors.title ? "border-red-400" : "border-gray-200 focus:border-blue-500"
                            }`}
                        />
                        {errors.title && <p className="text-xs text-red-500 mt-1.5 ml-1">{errors.title}</p>}
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Description</label>
                        <textarea
                            name="description"
                            value={form.description ?? ""}
                            onChange={handleChange}
                            placeholder="Task description..."
                            rows={3}
                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none resize-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Priority */}
                        <div>
                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Priority</label>
                            <select
                                name="priority"
                                value={form.priority}
                                onChange={handleChange}
                                className="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all bg-white appearance-none"
                            >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                            </select>
                        </div>

                        {/* Due Date */}
                        <div>
                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Due Date</label>
                            <input
                                type="date"
                                name="dueDate"
                                value={form.dueDate ?? ""}
                                onChange={handleChange}
                                className="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all"
                            />
                        </div>
                    </div>

                    {/* Assignee */}
                    <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Assignee</label>
                        <select
                            name="assignedToId"
                            value={form.assignedToId ?? ""}
                            onChange={handleChange}
                            disabled={membersLoading}
                            className="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all disabled:bg-gray-50 bg-white appearance-none"
                        >
                            <option value="">
                                {membersLoading ? "Loading members..." : "Unassigned"}
                            </option>
                            {members.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.name} — {m.role}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Context Links */}
                    <div className="pt-2 border-t border-gray-100 mt-2">
                         <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-4 text-center">Optional Links</p>
                         <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Lead ID</label>
                                <input
                                    name="leadId"
                                    value={form.leadId ?? ""}
                                    onChange={handleChange}
                                    placeholder="Optional"
                                    className="w-full h-9 rounded-lg border border-gray-200 px-3 text-[12px] text-gray-900 outline-none focus:border-blue-500 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Deal ID</label>
                                <input
                                    name="dealId"
                                    value={form.dealId ?? ""}
                                    onChange={handleChange}
                                    placeholder="Optional"
                                    className="w-full h-9 rounded-lg border border-gray-200 px-3 text-[12px] text-gray-900 outline-none focus:border-blue-500 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Project ID</label>
                                <input
                                    name="projectId"
                                    value={form.projectId ?? ""}
                                    onChange={handleChange}
                                    placeholder="Optional"
                                    className="w-full h-9 rounded-lg border border-gray-200 px-3 text-[12px] text-gray-900 outline-none focus:border-blue-500 transition-all"
                                />
                            </div>
                         </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 px-5 md:px-6 py-4 bg-white border-t border-gray-200">
                    <button
                        onClick={onClose}
                        className="h-11 px-6 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-all active:scale-95"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="h-11 px-8 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-70 transition-all shadow-lg shadow-blue-100 active:scale-95 flex items-center justify-center gap-2"
                    >
                        {saving && <Loader2 size={16} className="animate-spin" />}
                        {saving ? "Creating..." : "Create Task"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface TasksUIProps {
    tasks: Task[];
    filteredTasks: Task[];
    loading: boolean;
    error: string | null;
    filter: TaskFilter;
    statusFilter: string;
    search: string;
    isCreateOpen: boolean;
    saving: boolean;
    saveError: string | null;
    onFilterChange: (f: TaskFilter) => void;
    onStatusFilterChange: (s: string) => void;
    onSearchChange: (s: string) => void;
    onOpenCreate: () => void;
    onCloseCreate: () => void;
    onCreateTask: (data: CreateTaskPayload) => Promise<boolean>;
    onOpenDetail: (task: Task) => void;
    onCycleStatus: (task: Task) => void;
    onUpdateTask?: (id: string, data: { status: TaskStatus }) => Promise<boolean>;
    onRetry: () => void;
}

type ViewMode = "LIST" | "KANBAN" | "CALENDAR";

// ── Main Component ────────────────────────────────────────────────────────────

export function TasksUI({
    tasks,
    filteredTasks,
    loading,
    error,
    filter,
    statusFilter,
    search,
    isCreateOpen,
    saving,
    saveError,
    onFilterChange,
    onStatusFilterChange,
    onSearchChange,
    onOpenCreate,
    onCloseCreate,
    onCreateTask,
    onOpenDetail,
    onCycleStatus,
    onUpdateTask,
    onRetry,
}: TasksUIProps) {
    const [viewMode, setViewMode] = useState<ViewMode>("KANBAN"); // Default Kanban for modern feel
    const [openMenu, setOpenMenu] = useState<string | null>(null);
    const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Drag and drop states & microanimations for Kanban
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);
    const [justDroppedId, setJustDroppedId] = useState<string | null>(null);

    const todoCount     = tasks.filter((t) => t.status === "TODO").length;
    const inProgressCount = tasks.filter((t) => t.status === "IN_PROGRESS").length;
    const doneCount     = tasks.filter((t) => t.status === "DONE").length;
    const overdueCount  = tasks.filter((t) => {
        if (!t.dueDate || t.status === "DONE") return false;
        return new Date(t.dueDate) < new Date();
    }).length;

    const FILTERS: { key: TaskFilter; label: string }[] = [
        { key: "all",     label: "All Tasks" },
        { key: "my",      label: "My Tasks" },
        { key: "overdue", label: "Overdue" },
    ];

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
                <AlertCircle size={32} className="text-red-400" />
                <p className="text-red-500 text-sm">{error}</p>
                <button
                    onClick={onRetry}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    // Generate Calendar Days
    const generateCalendarDays = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        const days = [];
        const startPadding = firstDay.getDay(); // 0 is Sunday
        
        // Add previous month padding
        for (let i = startPadding - 1; i >= 0; i--) {
            const d = new Date(year, month, -i);
            days.push({ date: d, isCurrentMonth: false });
        }
        
        // Add current month days
        for (let i = 1; i <= lastDay.getDate(); i++) {
            const d = new Date(year, month, i);
            days.push({ date: d, isCurrentMonth: true });
        }
        
        // Add next month padding
        const endPadding = 42 - days.length; // 6 rows * 7 days
        for (let i = 1; i <= endPadding; i++) {
            const d = new Date(year, month + 1, i);
            days.push({ date: d, isCurrentMonth: false });
        }
        
        return days;
    };

    return (
        <div className="min-h-full space-y-6 md:space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 leading-tight tracking-tight">Tasks</h1>
                    <p className="text-sm text-gray-400 font-medium mt-0.5">Manage and track all your tasks.</p>
                </div>
                <button
                    onClick={onOpenCreate}
                    className="flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-blue-600 text-white text-[13px] font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
                >
                    <Plus size={18} />
                    Create Task
                </button>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Total Tasks",  value: tasks.length,  icon: <ListTodo size={20} className="text-blue-600" />,   bg: "bg-blue-50"  },
                    { label: "To Do",        value: todoCount,      icon: <Circle size={20} className="text-gray-500" />,     bg: "bg-gray-50"  },
                    { label: "In Progress",  value: inProgressCount,icon: <Clock size={20} className="text-amber-500" />,    bg: "bg-amber-50" },
                    { label: "Done",         value: doneCount,      icon: <CheckCircle2 size={20} className="text-green-500" />,bg:"bg-green-50"},
                ].map(({ label, value, icon, bg }) => (
                    <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-5 flex items-center gap-4 transition-all hover:shadow-md">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
                            {icon}
                        </div>
                        <div>
                            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">{label}</p>
                            <p className="text-2xl font-black text-gray-900 leading-tight">{loading ? "—" : value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                {/* Toolbar (Filters + View Toggle) */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between px-5 py-4 gap-4 border-b border-gray-100 bg-gray-50/30">
                    <div className="flex items-center gap-4 overflow-x-auto pb-2 lg:pb-0 no-scrollbar">
                        {/* View Toggle */}
                        <div className="flex p-1 bg-gray-100 rounded-xl shrink-0">
                            {[
                                { mode: "LIST", icon: LayoutList, label: "List" },
                                { mode: "KANBAN", icon: KanbanSquare, label: "Kanban" },
                                { mode: "CALENDAR", icon: CalendarDays, label: "Calendar" }
                            ].map((v) => (
                                <button
                                    key={v.mode}
                                    onClick={() => setViewMode(v.mode as ViewMode)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-bold transition-all ${
                                        viewMode === v.mode
                                            ? "bg-white text-blue-600 shadow-sm"
                                            : "text-gray-500 hover:text-gray-700"
                                    }`}
                                >
                                    <v.icon size={15} />
                                    <span className="hidden sm:inline">{v.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="w-px h-6 bg-gray-200 shrink-0" />

                        {/* Filter Buttons */}
                        <div className="flex items-center gap-1">
                            {FILTERS.map(({ key, label }) => (
                                <button
                                    key={key}
                                    onClick={() => onFilterChange(key)}
                                    className={`px-4 py-1.5 text-[13px] font-bold rounded-lg transition-all whitespace-nowrap ${
                                        filter === key
                                            ? "bg-blue-600 text-white shadow-md shadow-blue-100"
                                            : "text-gray-500 hover:bg-gray-100"
                                    }`}
                                >
                                    {label}
                                    {key === "overdue" && overdueCount > 0 && (
                                        <span className={`ml-2 px-1.5 py-0.5 rounded-md text-[10px] font-black ${filter === key ? "bg-white/20 text-white" : "bg-red-100 text-red-500"}`}>
                                            {overdueCount}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        {/* Status filter */}
                        <div className="relative w-full sm:w-auto">
                            <select
                                value={statusFilter}
                                onChange={(e) => onStatusFilterChange(e.target.value)}
                                className="appearance-none w-full sm:w-36 h-9 pl-3 pr-8 rounded-xl border border-gray-200 bg-white text-[13px] text-gray-900 font-bold focus:outline-none focus:ring-4 focus:ring-blue-50 transition-all cursor-pointer shadow-sm"
                            >
                                <option value="all">All Status</option>
                                <option value="TODO">To Do</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="DONE">Done</option>
                            </select>
                            <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" />
                        </div>

                        {/* Search */}
                        <div className="relative w-full sm:w-auto">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search tasks..."
                                value={search}
                                onChange={(e) => onSearchChange(e.target.value)}
                                className="h-9 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-[13px] text-gray-900 font-medium placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-50 transition-all w-full sm:w-48 shadow-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* Loading State Container */}
                {loading ? (
                    <div className="p-8 flex items-center justify-center min-h-[400px]">
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 size={32} className="animate-spin text-blue-500" />
                            <p className="text-gray-400 text-sm font-medium">Loading Tasks...</p>
                        </div>
                    </div>
                ) : filteredTasks.length === 0 ? (
                    <div className="text-center py-20 min-h-[400px] flex flex-col items-center justify-center">
                        <ListTodo size={40} className="text-gray-200 mx-auto mb-4" />
                        <h3 className="text-gray-900 font-bold text-lg">No tasks found</h3>
                        <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or search.</p>
                    </div>
                ) : (
                    <>
                        {/* ──────────────── LIST VIEW ──────────────── */}
                        {viewMode === "LIST" && (
                            <div className="overflow-x-auto w-full no-scrollbar">
                                <table className="w-full text-sm min-w-[800px]">
                                    <thead>
                                        <tr className="border-b border-gray-100 bg-gray-50/50">
                                            {["", "Title", "Assignee", "Due Date", "Priority", "Status", ""].map((h, i) => (
                                                <th key={i} className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredTasks.map((task) => {
                                            const isOverdue =
                                                task.dueDate &&
                                                task.status !== "DONE" &&
                                                new Date(task.dueDate) < new Date();
                                            return (
                                                <tr key={task.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                                                    <td className="pl-5 pr-2 py-3.5 whitespace-nowrap">
                                                        <button
                                                            onClick={() => onCycleStatus(task)}
                                                            title={`Status: ${STATUS_LABELS[task.status]} — click to advance`}
                                                            className="hover:scale-110 transition-transform"
                                                        >
                                                            <StatusIcon status={task.status} />
                                                        </button>
                                                    </td>
                                                    <td className="px-3 py-3.5 max-w-xs">
                                                        <button onClick={() => onOpenDetail(task)} className="text-left block w-full group">
                                                            <p className={`font-medium text-[13px] group-hover:text-blue-600 transition-colors ${task.status === "DONE" ? "line-through text-gray-400" : "text-gray-800"}`}>
                                                                {task.title}
                                                            </p>
                                                        </button>
                                                    </td>
                                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                                        {task.assignedTo ? (
                                                            <div className="flex items-center gap-2">
                                                                <Avatar name={task.assignedTo.name} />
                                                                <span className="text-[13px] text-gray-700">{task.assignedTo.name}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-[12px] text-gray-400">
                                                                <User size={13} /> Unassigned
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                                        {task.dueDate ? (
                                                            <span className={`flex items-center gap-1 text-[13px] ${isOverdue ? "text-red-500 font-medium" : "text-gray-600"}`}>
                                                                <Calendar size={13} />
                                                                {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[13px] text-gray-400">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium ${PRIORITY_STYLES[task.priority]}`}>
                                                            {task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium ${STATUS_STYLES[task.status]}`}>
                                                            {STATUS_LABELS[task.status]}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                                        <button
                                                            onClick={(e) => {
                                                                if (openMenu === task.id) { setOpenMenu(null); setMenuPos(null); } 
                                                                else {
                                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                                    setMenuPos({ top: rect.bottom + 4, left: rect.right - 140 });
                                                                    setOpenMenu(task.id);
                                                                }
                                                            }}
                                                            className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                                                        >
                                                            <MoreVertical size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* ──────────────── KANBAN VIEW ──────────────── */}
                        {viewMode === "KANBAN" && (
                            <div className="p-5 overflow-x-auto no-scrollbar">
                                <div className="flex gap-5 min-w-[900px] h-full items-stretch">
                                    {(["TODO", "IN_PROGRESS", "DONE"] as TaskStatus[]).map((colStatus) => {
                                        const colTasks = filteredTasks.filter(t => t.status === colStatus);
                                        const isColOver = dragOverCol === colStatus;
                                        return (
                                            <div 
                                                key={colStatus} 
                                                onDragOver={(e) => {
                                                    e.preventDefault();
                                                    e.dataTransfer.dropEffect = "move";
                                                }}
                                                onDragEnter={(e) => {
                                                    e.preventDefault();
                                                    setDragOverCol(colStatus);
                                                }}
                                                onDragLeave={(e) => {
                                                    e.preventDefault();
                                                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                                        setDragOverCol(null);
                                                    }
                                                }}
                                                onDrop={(e) => {
                                                    e.preventDefault();
                                                    setDragOverCol(null);
                                                    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
                                                    if (taskId) {
                                                        if (onUpdateTask) {
                                                            onUpdateTask(taskId, { status: colStatus });
                                                        } else {
                                                            const foundTask = tasks.find(t => t.id === taskId);
                                                            if (foundTask && foundTask.status !== colStatus) {
                                                                onCycleStatus(foundTask);
                                                            }
                                                        }
                                                        setJustDroppedId(taskId);
                                                        setTimeout(() => setJustDroppedId(null), 600);
                                                    }
                                                    setDraggedTaskId(null);
                                                }}
                                                className={`flex-1 flex flex-col rounded-2xl border p-3 min-h-[500px] transition-all duration-300 ${
                                                    isColOver 
                                                        ? "bg-blue-50/80 border-blue-400 ring-4 ring-blue-400/20 scale-[1.01] shadow-lg shadow-blue-100/50" 
                                                        : "bg-gray-50/50 border-gray-100"
                                                }`}
                                            >
                                                {/* Column Header */}
                                                <div className="flex items-center justify-between px-2 mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <StatusIcon status={colStatus} />
                                                        <h3 className="font-bold text-gray-900 text-sm tracking-wide">{STATUS_LABELS[colStatus]}</h3>
                                                        <span className="ml-1 bg-gray-200 text-gray-600 text-[10px] font-black px-1.5 py-0.5 rounded-md">
                                                            {colTasks.length}
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                {/* Column Tasks */}
                                                <div className="flex flex-col gap-3 flex-1">
                                                    {colTasks.map(task => {
                                                        const isOverdue = task.dueDate && task.status !== "DONE" && new Date(task.dueDate) < new Date();
                                                        const isDraggingThis = draggedTaskId === task.id;
                                                        const isJustDropped = justDroppedId === task.id;

                                                        return (
                                                            <div 
                                                                key={task.id} 
                                                                draggable={true}
                                                                onDragStart={(e) => {
                                                                    e.dataTransfer.setData("text/plain", task.id);
                                                                    e.dataTransfer.effectAllowed = "move";
                                                                    setDraggedTaskId(task.id);
                                                                }}
                                                                onDragEnd={() => {
                                                                    setDraggedTaskId(null);
                                                                    setDragOverCol(null);
                                                                }}
                                                                onClick={() => onOpenDetail(task)}
                                                                className={`bg-white p-4 rounded-xl border transition-all duration-200 cursor-grab active:cursor-grabbing group ${
                                                                    isDraggingThis 
                                                                        ? "opacity-40 scale-95 rotate-2 border-blue-400 shadow-2xl ring-4 ring-blue-500/20" 
                                                                        : isJustDropped
                                                                        ? "border-emerald-400 ring-2 ring-emerald-400/50 animate-in zoom-in-95 duration-300 shadow-md"
                                                                        : "border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-blue-300"
                                                                }`}
                                                            >
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <GripVertical size={13} className="text-gray-300 group-hover:text-blue-500 transition-colors shrink-0" />
                                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-widest ${PRIORITY_STYLES[task.priority]}`}>
                                                                            {task.priority}
                                                                        </span>
                                                                    </div>
                                                                    {task.assignedTo ? (
                                                                        <Avatar name={task.assignedTo.name} />
                                                                    ) : (
                                                                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                                                                            <User size={12} />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <h4 className={`text-sm font-bold mb-2 group-hover:text-blue-600 transition-colors ${task.status === "DONE" ? "line-through text-gray-400" : "text-gray-900"}`}>
                                                                    {task.title}
                                                                </h4>
                                                                {task.dueDate && (
                                                                    <div className={`flex items-center gap-1.5 text-[11px] font-semibold mt-4 ${isOverdue ? "text-red-500" : "text-gray-400"}`}>
                                                                        <Calendar size={12} />
                                                                        {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                    {isColOver && draggedTaskId && (
                                                        <div className="border-2 border-dashed border-blue-400 rounded-xl p-3 bg-blue-100/40 text-blue-600 text-xs font-bold text-center animate-pulse transition-all">
                                                            Drop task here
                                                        </div>
                                                    )}
                                                    {colTasks.length === 0 && !isColOver && (
                                                        <div className="text-center p-6 rounded-xl border-2 border-dashed border-gray-200">
                                                            <p className="text-xs text-gray-400 font-medium tracking-wide">No tasks</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ──────────────── CALENDAR VIEW ──────────────── */}
                        {viewMode === "CALENDAR" && (
                            <div className="p-5">
                                {/* Calendar Header */}
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-black text-gray-900">
                                        {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                                    </h2>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                                            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                        <button 
                                            onClick={() => setCurrentMonth(new Date())}
                                            className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-[12px] font-bold text-gray-600"
                                        >
                                            Today
                                        </button>
                                        <button 
                                            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                                            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Calendar Grid */}
                                <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-xl overflow-hidden">
                                    {/* Week Days */}
                                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                                        <div key={day} className="bg-gray-50 p-2 text-center text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                                            {day}
                                        </div>
                                    ))}
                                    
                                    {/* Days */}
                                    {generateCalendarDays().map((dayObj, i) => {
                                        const isToday = dayObj.date.toDateString() === new Date().toDateString();
                                        
                                        // Find tasks for this day
                                        const dayTasks = filteredTasks.filter(t => {
                                            if (!t.dueDate) return false;
                                            return new Date(t.dueDate).toDateString() === dayObj.date.toDateString();
                                        });

                                        return (
                                            <div 
                                                key={i} 
                                                className={`min-h-[100px] bg-white p-2 ${!dayObj.isCurrentMonth ? "opacity-40" : ""}`}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className={`text-[12px] font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-blue-600 text-white" : "text-gray-700"}`}>
                                                        {dayObj.date.getDate()}
                                                    </span>
                                                </div>
                                                <div className="space-y-1 mt-1 max-h-[80px] overflow-y-auto no-scrollbar">
                                                    {dayTasks.map(task => (
                                                        <button
                                                            key={task.id}
                                                            onClick={() => onOpenDetail(task)}
                                                            className={`w-full text-left px-1.5 py-1 rounded truncate text-[10px] font-bold ${
                                                                task.status === "DONE" 
                                                                    ? "bg-green-50 text-green-600 line-through" 
                                                                    : task.priority === "HIGH"
                                                                        ? "bg-red-50 text-red-600"
                                                                        : "bg-blue-50 text-blue-600"
                                                            }`}
                                                        >
                                                            {task.title}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Footer counts (only for LIST view to maintain cleanliness) */}
                        {viewMode === "LIST" && (
                            <div className="px-5 py-3 border-t border-gray-100">
                                <p className="text-[13px] text-gray-400">
                                    Showing {filteredTasks.length} of {tasks.length} tasks
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Context menu for List View */}
            {openMenu !== null && (
                <>
                    <div
                        className="fixed inset-0 z-[9998]"
                        onClick={() => { setOpenMenu(null); setMenuPos(null); }}
                    />
                    {menuPos && (
                        <div
                            className="fixed z-[9999] bg-white border border-gray-100 rounded-xl shadow-lg py-1 w-36"
                            style={{ top: menuPos.top, left: menuPos.left }}
                        >
                            {["View / Edit"].map((action) => (
                                <button
                                    key={action}
                                    onClick={() => {
                                        const task = filteredTasks.find((t) => t.id === openMenu);
                                        setOpenMenu(null);
                                        setMenuPos(null);
                                        if (task) onOpenDetail(task);
                                    }}
                                    className="w-full text-left px-4 py-2 text-[13px] hover:bg-gray-50 transition-colors text-gray-700"
                                >
                                    {action}
                                </button>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Create modal */}
            {isCreateOpen && (
                <CreateTaskModal
                    saving={saving}
                    saveError={saveError}
                    onClose={onCloseCreate}
                    onSave={onCreateTask}
                />
            )}
        </div>
    );
}
