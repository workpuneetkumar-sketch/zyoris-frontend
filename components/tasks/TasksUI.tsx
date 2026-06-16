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
        
        // Match Swagger exactly: only include fields if they have a value.
        // dueDate MUST be ISO string.
        
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

                    {/* Context Links (Optional fields from Swagger) */}
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
    onRetry: () => void;
}

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
    onRetry,
}: TasksUIProps) {
    const [openMenu, setOpenMenu] = useState<string | null>(null);
    const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

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

            {/* Table card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Filter tabs + search */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between px-5 py-4 gap-4 border-b border-gray-100 bg-gray-50/30">
                    <div className="flex items-center gap-1 overflow-x-auto pb-2 lg:pb-0 no-scrollbar">
                        {FILTERS.map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => onFilterChange(key)}
                                className={`px-4 py-2 text-[13px] font-bold rounded-xl transition-all whitespace-nowrap ${
                                    filter === key
                                        ? "bg-blue-600 text-white shadow-md shadow-blue-100"
                                        : "text-gray-500 hover:bg-gray-100"
                                }`}
                            >
                                {label}
                                {key === "overdue" && overdueCount > 0 && (
                                    <span className={`ml-2 px-1.5 py-0.5 rounded-lg text-[10px] font-black ${filter === key ? "bg-white/20 text-white" : "bg-red-100 text-red-500"}`}>
                                        {overdueCount}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        {/* Status filter */}
                        <div className="relative w-full sm:w-auto">
                            <select
                                value={statusFilter}
                                onChange={(e) => onStatusFilterChange(e.target.value)}
                                className="appearance-none w-full sm:w-40 h-10 pl-4 pr-10 rounded-xl border border-gray-200 bg-white text-[13px] text-gray-900 font-bold focus:outline-none focus:ring-4 focus:ring-blue-50 transition-all cursor-pointer shadow-sm"
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
                            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search tasks..."
                                value={search}
                                onChange={(e) => onSearchChange(e.target.value)}
                                className="h-10 pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-[13px] text-gray-900 font-medium placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-50 transition-all w-full sm:w-56 shadow-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto w-full no-scrollbar">
                    <table className="w-full text-sm min-w-[800px]">
                        <thead>
                            <tr className="border-b border-gray-100">
                                {["", "Title", "Assignee", "Due Date", "Priority", "Status", ""].map((h, i) => (
                                    <th key={i} className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <tr key={i} className="border-b border-gray-50">
                                        {Array.from({ length: 7 }).map((_, j) => (
                                            <td key={j} className="px-5 py-4">
                                                <div className="h-3.5 bg-gray-100 rounded-md animate-pulse w-3/4" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : filteredTasks.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-16">
                                        <ListTodo size={32} className="text-gray-200 mx-auto mb-3" />
                                        <p className="text-gray-400 text-sm">No tasks found.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredTasks.map((task) => {
                                    const isOverdue =
                                        task.dueDate &&
                                        task.status !== "DONE" &&
                                        new Date(task.dueDate) < new Date();
                                    return (
                                        <tr
                                            key={task.id}
                                            className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors"
                                        >
                                            {/* Status icon — click to cycle */}
                                            <td className="pl-5 pr-2 py-3.5 whitespace-nowrap">
                                                <button
                                                    onClick={() => onCycleStatus(task)}
                                                    title={`Status: ${STATUS_LABELS[task.status]} — click to advance`}
                                                    className="hover:scale-110 transition-transform"
                                                >
                                                    <StatusIcon status={task.status} />
                                                </button>
                                            </td>
                                            {/* Title */}
                                            <td className="px-3 py-3.5 max-w-xs">
                                                <button
                                                    onClick={() => onOpenDetail(task)}
                                                    className="text-left"
                                                >
                                                    <p className={`font-medium text-[13px] ${task.status === "DONE" ? "line-through text-gray-400" : "text-gray-800"}`}>
                                                        {task.title}
                                                    </p>
                                                    {task.description && (
                                                        <p className="text-[11px] text-gray-400 truncate max-w-[280px]">{task.description}</p>
                                                    )}
                                                </button>
                                            </td>
                                            {/* Assignee */}
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                {task.assignedTo ? (
                                                    <div className="flex items-center gap-2">
                                                        <Avatar name={task.assignedTo.name} />
                                                        <span className="text-[13px] text-gray-700">{task.assignedTo.name}</span>
                                                    </div>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[12px] text-gray-400">
                                                        <User size={13} />
                                                        Unassigned
                                                    </span>
                                                )}
                                            </td>
                                            {/* Due Date */}
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                {task.dueDate ? (
                                                    <span className={`flex items-center gap-1 text-[13px] ${isOverdue ? "text-red-500 font-medium" : "text-gray-600"}`}>
                                                        <Calendar size={13} />
                                                        {new Date(task.dueDate).toLocaleDateString("en-US", {
                                                            month: "short", day: "numeric", year: "numeric",
                                                        })}
                                                    </span>
                                                ) : (
                                                    <span className="text-[13px] text-gray-400">—</span>
                                                )}
                                            </td>
                                            {/* Priority */}
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium ${PRIORITY_STYLES[task.priority]}`}>
                                                    {task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}
                                                </span>
                                            </td>
                                            {/* Status */}
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium ${STATUS_STYLES[task.status]}`}>
                                                    {STATUS_LABELS[task.status]}
                                                </span>
                                            </td>
                                            {/* Actions */}
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <button
                                                    onClick={(e) => {
                                                        if (openMenu === task.id) {
                                                            setOpenMenu(null);
                                                            setMenuPos(null);
                                                        } else {
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
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Row count */}
                {!loading && filteredTasks.length > 0 && (
                    <div className="px-5 py-3 border-t border-gray-100">
                        <p className="text-[13px] text-gray-400">
                            Showing {filteredTasks.length} of {tasks.length} tasks
                        </p>
                    </div>
                )}
            </div>

            {/* Context menu */}
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
