// components/tasks/TasksUI.tsx
"use client";

import { useState, useEffect, useRef } from "react";
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
    CheckSquare,
    Square,
    MinusSquare,
    Trash2,
    Check,
    Filter,
    Layers,
    Sparkles,
    AlertTriangle,
} from "lucide-react";
import {
    Task,
    TaskPriority,
    TaskStatus,
    CreateTaskPayload,
    BulkUpdateFields,
    BulkUpdateResponse,
} from "@/lib/api/tasksApi";
import { fetchTeamMembers } from "@/lib/api/leadsApi";
import { TaskFilter } from "@/hooks/useTasks";

// ── Constants ─────────────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<TaskPriority, string> = {
    HIGH:   "bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900",
    MEDIUM: "bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900",
    LOW:    "bg-green-50 text-green-600 border border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900",
};

const STATUS_STYLES: Record<TaskStatus, string> = {
    TODO:        "bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
    IN_PROGRESS: "bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900",
    DONE:        "bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900",
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
        <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold flex items-center justify-center shrink-0">
            {initials || <User size={12} />}
        </div>
    );
}

function StatusIcon({ status }: { status: TaskStatus }) {
    if (status === "DONE") return <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />;
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
        priority: "MEDIUM",
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
        await onSave(form);
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div
                className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-850">
                    <div className="flex items-center space-x-2.5">
                        <div className="p-2 bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
                            <Plus size={18} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">Create Jira Task</h2>
                            <p className="text-xs text-slate-500">Add a new task to your workspace</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-4">
                    {saveError && (
                        <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl flex items-center space-x-2 text-xs text-red-600 dark:text-red-400">
                            <AlertCircle size={15} className="shrink-0" />
                            <span>{saveError}</span>
                        </div>
                    )}

                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                            Title *
                        </label>
                        <input
                            name="title"
                            value={form.title}
                            onChange={handleChange}
                            placeholder="e.g. Implement OAuth login flow"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:border-blue-500"
                        />
                        {errors.title && <p className="text-[11px] text-red-500 mt-1">{errors.title}</p>}
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                            Description
                        </label>
                        <textarea
                            name="description"
                            rows={3}
                            value={form.description ?? ""}
                            onChange={handleChange}
                            placeholder="Detailed requirements, links, or notes..."
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:border-blue-500 resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                                Status
                            </label>
                            <select
                                name="status"
                                value={form.status}
                                onChange={handleChange}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none"
                            >
                                <option value="TODO">To Do</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="DONE">Done</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                                Priority
                            </label>
                            <select
                                name="priority"
                                value={form.priority}
                                onChange={handleChange}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none"
                            >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                                Assignee
                            </label>
                            <select
                                name="assignedToId"
                                value={form.assignedToId ?? ""}
                                onChange={handleChange}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none"
                            >
                                <option value="">Unassigned</option>
                                {members.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.name} ({m.role})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                                Due Date
                            </label>
                            <input
                                type="date"
                                name="dueDate"
                                value={form.dueDate ?? ""}
                                onChange={handleChange}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850 flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 disabled:opacity-60 flex items-center space-x-1.5 shadow-md shadow-blue-500/20"
                    >
                        {saving && <Loader2 size={14} className="animate-spin" />}
                        <span>{saving ? "Creating..." : "Create Task"}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Bulk Action Result Modal ──────────────────────────────────────────────────

interface BulkResultProps {
    result: BulkUpdateResponse;
    onClose: () => void;
}

function BulkResultModal({ result, onClose }: BulkResultProps) {
    const data = result.data;
    const hasFailures = data.totalFailed > 0;

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
                <div className="flex items-center space-x-3">
                    <div
                        className={`p-2.5 rounded-xl ${
                            hasFailures
                                ? "bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
                                : "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
                        }`}
                    >
                        {hasFailures ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                            Bulk Update Completed
                        </h3>
                        <p className="text-xs text-slate-500">
                            {data.totalUpdated} updated, {data.totalFailed} failed
                        </p>
                    </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1.5 text-xs">
                    <div className="flex justify-between">
                        <span className="text-slate-500">Total Requested:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{data.totalRequested}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-emerald-600 dark:text-emerald-400">Successfully Updated:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{data.totalUpdated}</span>
                    </div>
                    {data.totalFailed > 0 && (
                        <div className="flex justify-between">
                            <span className="text-red-500">Failed:</span>
                            <span className="font-bold text-red-500">{data.totalFailed}</span>
                        </div>
                    )}
                </div>

                {hasFailures && (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Failure Details</p>
                        {data.results
                            .filter((r) => !r.success)
                            .map((r) => (
                                <div
                                    key={r.taskId}
                                    className="p-2 bg-red-50 dark:bg-red-950/40 rounded-lg text-xs border border-red-100 dark:border-red-900 text-red-700 dark:text-red-300"
                                >
                                    <span className="font-mono font-bold">{r.taskId}:</span>{" "}
                                    {r.error || "Failed to update"}
                                </div>
                            ))}
                    </div>
                )}

                <div className="flex justify-end pt-2">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-xl text-xs font-bold hover:opacity-90"
                    >
                        Done
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
    priorityFilter: string;
    assigneeFilter: string;
    search: string;
    isCreateOpen: boolean;
    saving: boolean;
    saveError: string | null;
    selectedTaskIds: string[];
    isAllSelected: boolean;
    isIndeterminate: boolean;
    bulkUpdating: boolean;
    onFilterChange: (f: TaskFilter) => void;
    onStatusFilterChange: (s: string) => void;
    onPriorityFilterChange: (p: string) => void;
    onAssigneeFilterChange: (a: string) => void;
    onSearchChange: (s: string) => void;
    onToggleSelect: (taskId: string) => void;
    onSelectAll: () => void;
    onClearSelection: () => void;
    onBulkUpdate: (update: BulkUpdateFields) => Promise<BulkUpdateResponse>;
    onOpenCreate: () => void;
    onCloseCreate: () => void;
    onCreateTask: (data: CreateTaskPayload) => Promise<boolean>;
    onOpenDetail: (task: Task) => void;
    onCycleStatus: (task: Task) => void;
    onUpdateTask?: (id: string, data: { status: TaskStatus }) => Promise<boolean>;
    onDeleteTask?: (id: string) => Promise<boolean>;
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
    priorityFilter,
    assigneeFilter,
    search,
    isCreateOpen,
    saving,
    saveError,
    selectedTaskIds,
    isAllSelected,
    isIndeterminate,
    bulkUpdating,
    onFilterChange,
    onStatusFilterChange,
    onPriorityFilterChange,
    onAssigneeFilterChange,
    onSearchChange,
    onToggleSelect,
    onSelectAll,
    onClearSelection,
    onBulkUpdate,
    onOpenCreate,
    onCloseCreate,
    onCreateTask,
    onOpenDetail,
    onCycleStatus,
    onUpdateTask,
    onDeleteTask,
    onRetry,
}: TasksUIProps) {
    const [viewMode, setViewMode] = useState<ViewMode>("LIST");
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [bulkResult, setBulkResult] = useState<BulkUpdateResponse | null>(null);

    // Bulk action state
    const [bulkStatus, setBulkStatus] = useState<TaskStatus | "">("");
    const [bulkPriority, setBulkPriority] = useState<TaskPriority | "">("");
    const [bulkAssignee, setBulkAssignee] = useState<string>("");
    const [bulkDueDate, setBulkDueDate] = useState<string>("");

    // Drag and drop states for Kanban
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Indeterminate checkbox ref
    const selectAllCheckboxRef = useRef<HTMLInputElement | null>(null);
    useEffect(() => {
        if (selectAllCheckboxRef.current) {
            selectAllCheckboxRef.current.indeterminate = isIndeterminate;
        }
    }, [isIndeterminate]);

    useEffect(() => {
        fetchTeamMembers()
            .then((data) => setMembers(data.members ?? data ?? []))
            .catch(() => setMembers([]));
    }, []);

    const todoCount = tasks.filter((t) => t.status === "TODO").length;
    const inProgressCount = tasks.filter((t) => t.status === "IN_PROGRESS").length;
    const doneCount = tasks.filter((t) => t.status === "DONE").length;
    const overdueCount = tasks.filter((t) => {
        if (!t.dueDate || t.status === "DONE") return false;
        return new Date(t.dueDate) < new Date();
    }).length;

    const handleApplyBulkUpdate = async (fields: BulkUpdateFields) => {
        try {
            const res = await onBulkUpdate(fields);
            setBulkResult(res);
            // reset form selections
            setBulkStatus("");
            setBulkPriority("");
            setBulkAssignee("");
            setBulkDueDate("");
        } catch (err) {
            console.error("Bulk update failed", err);
        }
    };

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
        <div className="relative flex flex-col min-h-screen bg-slate-50/50 dark:bg-slate-950 pb-28">
            {/* ── Top Header ─────────────────────────────────────────────────── */}
            <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <div className="flex items-center space-x-3">
                            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
                                <Layers className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                                    Tasks Foundation
                                </h1>
                                <p className="text-xs text-slate-500">
                                    Jira-grade task management, selection, bulk mutations, and tracking
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        {/* View Mode Toggle */}
                        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700">
                            <button
                                onClick={() => setViewMode("LIST")}
                                title="List View"
                                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                    viewMode === "LIST"
                                        ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                                }`}
                            >
                                <LayoutList size={14} />
                                <span>List</span>
                            </button>
                            <button
                                onClick={() => setViewMode("KANBAN")}
                                title="Kanban View"
                                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                    viewMode === "KANBAN"
                                        ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                                }`}
                            >
                                <KanbanSquare size={14} />
                                <span>Board</span>
                            </button>
                        </div>

                        {/* Create Task Button */}
                        <button
                            onClick={onOpenCreate}
                            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-500/20 active:scale-95"
                        >
                            <Plus size={15} />
                            <span>Create Task</span>
                        </button>
                    </div>
                </div>

                {/* ── Stats Summary Bar ──────────────────────────────────────── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Total Tasks</span>
                        <span className="text-base font-bold text-slate-900 dark:text-white">{tasks.length}</span>
                    </div>
                    <div className="p-3 bg-blue-50/50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/50 flex items-center justify-between">
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">In Progress</span>
                        <span className="text-base font-bold text-blue-700 dark:text-blue-300">{inProgressCount}</span>
                    </div>
                    <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-between">
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Completed</span>
                        <span className="text-base font-bold text-emerald-700 dark:text-emerald-300">{doneCount}</span>
                    </div>
                    <div className="p-3 bg-red-50/50 dark:bg-red-950/30 rounded-xl border border-red-100 dark:border-red-900/50 flex items-center justify-between">
                        <span className="text-xs font-semibold text-red-600 dark:text-red-400">Overdue</span>
                        <span className="text-base font-bold text-red-700 dark:text-red-300">{overdueCount}</span>
                    </div>
                </div>

                {/* ── Filters & Search Controls ──────────────────────────────── */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    {/* Left: Quick Filters & Search */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Search Input */}
                        <div className="relative min-w-[200px] sm:min-w-[240px]">
                            <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search tasks by title..."
                                value={search}
                                onChange={(e) => onSearchChange(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500 text-slate-900 dark:text-white transition"
                            />
                        </div>

                        {/* Quick filter chips */}
                        <div className="flex items-center space-x-1">
                            {[
                                { key: "all", label: "All" },
                                { key: "my", label: "My Tasks" },
                                { key: "overdue", label: "Overdue" },
                            ].map((f) => (
                                <button
                                    key={f.key}
                                    onClick={() => onFilterChange(f.key as TaskFilter)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                                        filter === f.key
                                            ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                                    }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right: Dropdown Filters */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Status Filter */}
                        <select
                            value={statusFilter}
                            onChange={(e) => onStatusFilterChange(e.target.value)}
                            className="text-xs font-medium px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none"
                        >
                            <option value="all">Status: All</option>
                            <option value="TODO">To Do</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="DONE">Done</option>
                        </select>

                        {/* Priority Filter */}
                        <select
                            value={priorityFilter}
                            onChange={(e) => onPriorityFilterChange(e.target.value)}
                            className="text-xs font-medium px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none"
                        >
                            <option value="all">Priority: All</option>
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                        </select>

                        {/* Assignee Filter */}
                        <select
                            value={assigneeFilter}
                            onChange={(e) => onAssigneeFilterChange(e.target.value)}
                            className="text-xs font-medium px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none"
                        >
                            <option value="all">Assignee: All</option>
                            <option value="unassigned">Unassigned</option>
                            {members.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.name}
                                </option>
                            ))}
                        </select>

                        {/* Clear all active filters if any are set */}
                        {(statusFilter !== "all" || priorityFilter !== "all" || assigneeFilter !== "all" || filter !== "all" || search) && (
                            <button
                                onClick={() => {
                                    onStatusFilterChange("all");
                                    onPriorityFilterChange("all");
                                    onAssigneeFilterChange("all");
                                    onFilterChange("all");
                                    onSearchChange("");
                                }}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline px-2 py-1 font-semibold"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Main Content Area ──────────────────────────────────────────── */}
            <div className="p-6">
                {loading ? (
                    <div className="p-16 flex flex-col items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
                        <p className="text-xs text-slate-400 font-medium">Loading Tasks...</p>
                    </div>
                ) : filteredTasks.length === 0 ? (
                    <div className="p-16 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-3 bg-white dark:bg-slate-900/50">
                        <ListTodo className="w-10 h-10 text-slate-400 mx-auto" />
                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No tasks found</h3>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                            No tasks match your current search and filter settings. Try clearing filters or create a new task.
                        </p>
                        <button
                            onClick={onOpenCreate}
                            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
                        >
                            Create First Task
                        </button>
                    </div>
                ) : (
                    <>
                        {/* ──────────────── LIST VIEW (WITH CHECKBOXES & SELECT-ALL) ──────────────── */}
                        {viewMode === "LIST" && (
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/60 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                                                {/* Select All Checkbox Column */}
                                                <th className="w-10 px-4 py-3.5 text-center">
                                                    <input
                                                        type="checkbox"
                                                        ref={selectAllCheckboxRef}
                                                        checked={isAllSelected}
                                                        onChange={onSelectAll}
                                                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                                                        title={isAllSelected ? "Deselect All" : "Select All Visible"}
                                                    />
                                                </th>
                                                <th className="px-4 py-3.5">Title</th>
                                                <th className="px-4 py-3.5">Status</th>
                                                <th className="px-4 py-3.5">Priority</th>
                                                <th className="px-4 py-3.5">Assignee</th>
                                                <th className="px-4 py-3.5">Due Date</th>
                                                <th className="w-16 px-4 py-3.5 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                            {filteredTasks.map((task) => {
                                                const isSelected = selectedTaskIds.includes(task.id);
                                                const isOverdue =
                                                    task.dueDate &&
                                                    task.status !== "DONE" &&
                                                    new Date(task.dueDate) < new Date();

                                                return (
                                                    <tr
                                                        key={task.id}
                                                        className={`transition-colors group hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                                                            isSelected ? "bg-blue-50/40 dark:bg-blue-950/20" : ""
                                                        }`}
                                                    >
                                                        {/* Row Selection Checkbox */}
                                                        <td className="px-4 py-3.5 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => onToggleSelect(task.id)}
                                                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                                                            />
                                                        </td>

                                                        {/* Task Title & Key */}
                                                        <td className="px-4 py-3.5">
                                                            <div className="flex items-center space-x-2.5">
                                                                <button
                                                                    onClick={() => onCycleStatus(task)}
                                                                    title={`Status: ${STATUS_LABELS[task.status]} — click to advance`}
                                                                    className="hover:scale-110 transition-transform"
                                                                >
                                                                    <StatusIcon status={task.status} />
                                                                </button>
                                                                <button
                                                                    onClick={() => onOpenDetail(task)}
                                                                    className="text-left group-hover:text-blue-600 dark:group-hover:text-blue-400 transition"
                                                                >
                                                                    <div className="flex items-center space-x-2">
                                                                        <span className="text-[10px] font-mono text-slate-400 font-bold">
                                                                            TASK-{task.id.slice(-4).toUpperCase()}
                                                                        </span>
                                                                        <span
                                                                            className={`font-semibold text-sm ${
                                                                                task.status === "DONE"
                                                                                    ? "line-through text-slate-400 dark:text-slate-500"
                                                                                    : "text-slate-900 dark:text-white"
                                                                            }`}
                                                                        >
                                                                            {task.title}
                                                                        </span>
                                                                    </div>
                                                                    {task.description && (
                                                                        <p className="text-xs text-slate-400 truncate max-w-md mt-0.5">
                                                                            {task.description}
                                                                        </p>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </td>

                                                        {/* Status Badge */}
                                                        <td className="px-4 py-3.5 whitespace-nowrap">
                                                            <span
                                                                className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                                                    STATUS_STYLES[task.status]
                                                                }`}
                                                            >
                                                                {STATUS_LABELS[task.status]}
                                                            </span>
                                                        </td>

                                                        {/* Priority Badge */}
                                                        <td className="px-4 py-3.5 whitespace-nowrap">
                                                            <span
                                                                className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                                                    PRIORITY_STYLES[task.priority]
                                                                }`}
                                                            >
                                                                {task.priority.charAt(0) +
                                                                    task.priority.slice(1).toLowerCase()}
                                                            </span>
                                                        </td>

                                                        {/* Assignee */}
                                                        <td className="px-4 py-3.5 whitespace-nowrap">
                                                            {task.assignedTo ? (
                                                                <div className="flex items-center space-x-2">
                                                                    <Avatar name={task.assignedTo.name} />
                                                                    <span className="font-medium text-slate-800 dark:text-slate-200">
                                                                        {task.assignedTo.name}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-slate-400 flex items-center space-x-1">
                                                                    <User size={13} />
                                                                    <span>Unassigned</span>
                                                                </span>
                                                            )}
                                                        </td>

                                                        {/* Due Date */}
                                                        <td className="px-4 py-3.5 whitespace-nowrap">
                                                            {task.dueDate ? (
                                                                <span
                                                                    className={`flex items-center space-x-1 font-medium ${
                                                                        isOverdue
                                                                            ? "text-red-500 font-bold"
                                                                            : "text-slate-600 dark:text-slate-400"
                                                                    }`}
                                                                >
                                                                    <Calendar size={13} />
                                                                    <span>
                                                                        {new Date(task.dueDate).toLocaleDateString(
                                                                            "en-US",
                                                                            {
                                                                                month: "short",
                                                                                day: "numeric",
                                                                                year: "numeric",
                                                                            }
                                                                        )}
                                                                    </span>
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-400">—</span>
                                                            )}
                                                        </td>

                                                        {/* Row Quick Action */}
                                                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                                            <button
                                                                onClick={() => onOpenDetail(task)}
                                                                className="px-2.5 py-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition font-bold"
                                                            >
                                                                View
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* ──────────────── KANBAN VIEW ──────────────── */}
                        {viewMode === "KANBAN" && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
                                {(["TODO", "IN_PROGRESS", "DONE"] as TaskStatus[]).map((colStatus) => {
                                    const colTasks = filteredTasks.filter((t) => t.status === colStatus);
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
                                                        const found = tasks.find((t) => t.id === taskId);
                                                        if (found && found.status !== colStatus) {
                                                            onCycleStatus(found);
                                                        }
                                                    }
                                                }
                                                setDraggedTaskId(null);
                                            }}
                                            className={`flex flex-col rounded-2xl border p-4 min-h-[500px] transition-all ${
                                                isColOver
                                                    ? "bg-blue-50/60 dark:bg-blue-950/40 border-blue-400 ring-4 ring-blue-400/20"
                                                    : "bg-slate-100/60 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
                                                <div className="flex items-center space-x-2">
                                                    <StatusIcon status={colStatus} />
                                                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                                                        {STATUS_LABELS[colStatus]}
                                                    </span>
                                                </div>
                                                <span className="px-2 py-0.5 text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md">
                                                    {colTasks.length}
                                                </span>
                                            </div>

                                            <div className="space-y-3 flex-1">
                                                {colTasks.map((task) => {
                                                    const isSelected = selectedTaskIds.includes(task.id);
                                                    return (
                                                        <div
                                                            key={task.id}
                                                            draggable
                                                            onDragStart={(e) => {
                                                                e.dataTransfer.setData("text/plain", task.id);
                                                                setDraggedTaskId(task.id);
                                                            }}
                                                            onDragEnd={() => setDraggedTaskId(null)}
                                                            onClick={() => onOpenDetail(task)}
                                                            className={`p-4 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-750 shadow-sm hover:shadow-md transition cursor-grab active:cursor-grabbing space-y-2.5 ${
                                                                isSelected ? "ring-2 ring-blue-500" : ""
                                                            }`}
                                                        >
                                                            <div className="flex justify-between items-start">
                                                                <span
                                                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                                                        PRIORITY_STYLES[task.priority]
                                                                    }`}
                                                                >
                                                                    {task.priority}
                                                                </span>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    onChange={() => onToggleSelect(task.id)}
                                                                    className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                                                                />
                                                            </div>

                                                            <h4 className="font-semibold text-xs text-slate-900 dark:text-white leading-snug">
                                                                {task.title}
                                                            </h4>

                                                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                                                                <span>{task.assignedTo?.name || "Unassigned"}</span>
                                                                {task.dueDate && (
                                                                    <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── FLOATING BULK ACTION TOOLBAR ─────────────────────────────────── */}
            {selectedTaskIds.length > 0 && (
                <div className="fixed bottom-6 inset-x-0 z-40 flex justify-center px-4 animate-in slide-in-from-bottom-6 duration-300">
                    <div className="w-full max-w-3xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-6 py-4 rounded-2xl shadow-2xl border border-slate-800 dark:border-slate-200 flex flex-wrap items-center justify-between gap-4">
                        {/* Selected Counter */}
                        <div className="flex items-center space-x-3">
                            <span className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                {selectedTaskIds.length}
                            </span>
                            <div>
                                <p className="text-xs font-bold leading-tight">Tasks Selected</p>
                                <button
                                    onClick={onClearSelection}
                                    className="text-[11px] text-slate-400 dark:text-slate-600 hover:text-white dark:hover:text-black underline"
                                >
                                    Clear Selection
                                </button>
                            </div>
                        </div>

                        {/* Bulk Action Controls */}
                        <div className="flex flex-wrap items-center gap-2.5">
                            {/* Bulk Status Select */}
                            <select
                                value={bulkStatus}
                                onChange={(e) => {
                                    const val = e.target.value as TaskStatus;
                                    setBulkStatus(val);
                                    if (val) handleApplyBulkUpdate({ status: val });
                                }}
                                disabled={bulkUpdating}
                                className="px-3 py-1.5 rounded-xl bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 text-xs font-semibold outline-none border border-slate-700 dark:border-slate-300"
                            >
                                <option value="">Bulk Status...</option>
                                <option value="TODO">To Do</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="DONE">Done</option>
                            </select>

                            {/* Bulk Priority Select */}
                            <select
                                value={bulkPriority}
                                onChange={(e) => {
                                    const val = e.target.value as TaskPriority;
                                    setBulkPriority(val);
                                    if (val) handleApplyBulkUpdate({ priority: val });
                                }}
                                disabled={bulkUpdating}
                                className="px-3 py-1.5 rounded-xl bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 text-xs font-semibold outline-none border border-slate-700 dark:border-slate-300"
                            >
                                <option value="">Bulk Priority...</option>
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                            </select>

                            {/* Bulk Assignee Select */}
                            <select
                                value={bulkAssignee}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setBulkAssignee(val);
                                    if (val === "none") {
                                        handleApplyBulkUpdate({ assignedToId: null });
                                    } else if (val) {
                                        handleApplyBulkUpdate({ assignedToId: val });
                                    }
                                }}
                                disabled={bulkUpdating}
                                className="px-3 py-1.5 rounded-xl bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 text-xs font-semibold outline-none border border-slate-700 dark:border-slate-300"
                            >
                                <option value="">Bulk Assign...</option>
                                <option value="none">Unassigned</option>
                                {members.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.name}
                                    </option>
                                ))}
                            </select>

                            {/* Bulk Due Date Input */}
                            <input
                                type="date"
                                value={bulkDueDate}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setBulkDueDate(val);
                                    if (val) handleApplyBulkUpdate({ dueDate: val });
                                }}
                                disabled={bulkUpdating}
                                title="Bulk Set Due Date"
                                className="px-2.5 py-1 rounded-xl bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 text-xs font-semibold outline-none border border-slate-700 dark:border-slate-300"
                            />

                            {bulkUpdating && (
                                <div className="flex items-center space-x-1 text-xs text-blue-400">
                                    <Loader2 size={14} className="animate-spin" />
                                    <span>Updating...</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Create Task Modal */}
            {isCreateOpen && (
                <CreateTaskModal
                    saving={saving}
                    saveError={saveError}
                    onClose={onCloseCreate}
                    onSave={onCreateTask}
                />
            )}

            {/* Bulk Result Summary Modal */}
            {bulkResult && (
                <BulkResultModal
                    result={bulkResult}
                    onClose={() => setBulkResult(null)}
                />
            )}
        </div>
    );
}
