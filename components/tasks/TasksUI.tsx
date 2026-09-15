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
    Tag,
    FolderKanban,
    RotateCcw,
    MessageSquare,
    ListTree,
    Network,
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

export const PRIORITY_STYLES: Record<TaskPriority, string> = {
    HIGH:   "bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900",
    MEDIUM: "bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900",
    LOW:    "bg-green-50 text-green-600 border border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900",
};

export const STATUS_STYLES: Record<TaskStatus, string> = {
    TODO:        "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    IN_PROGRESS: "bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900",
    REVIEW:      "bg-purple-50 text-purple-600 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900",
    BLOCKED:     "bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900",
    DONE:        "bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900",
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
    TODO:        "To Do",
    IN_PROGRESS: "In Progress",
    REVIEW:      "Review",
    BLOCKED:     "Blocked",
    DONE:        "Done",
};

export const KANBAN_COLUMNS: {
    status: TaskStatus;
    label: string;
    color: string;
    accent: string;
    badge: string;
}[] = [
    {
        status: "TODO",
        label: "To Do",
        color: "border-slate-300 dark:border-slate-700",
        accent: "bg-slate-400",
        badge: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    },
    {
        status: "IN_PROGRESS",
        label: "In Progress",
        color: "border-blue-300 dark:border-blue-800",
        accent: "bg-blue-500",
        badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300",
    },
    {
        status: "REVIEW",
        label: "Review",
        color: "border-purple-300 dark:border-purple-800",
        accent: "bg-purple-500",
        badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300",
    },
    {
        status: "BLOCKED",
        label: "Blocked",
        color: "border-rose-300 dark:border-rose-800",
        accent: "bg-rose-500",
        badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300",
    },
    {
        status: "DONE",
        label: "Done",
        color: "border-emerald-300 dark:border-emerald-800",
        accent: "bg-emerald-500",
        badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300",
    },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function Avatar({ name }: { name: string }) {
    const initials = name
        .split(" ")
        .map((p) => p[0]?.toUpperCase() ?? "")
        .join("")
        .slice(0, 2);
    return (
        <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold flex items-center justify-center shrink-0">
            {initials || <User size={11} />}
        </div>
    );
}

export function StatusIcon({ status }: { status: TaskStatus }) {
    if (status === "DONE") return <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />;
    if (status === "IN_PROGRESS") return <Clock size={15} className="text-blue-500 shrink-0" />;
    if (status === "REVIEW") return <Sparkles size={15} className="text-purple-500 shrink-0" />;
    if (status === "BLOCKED") return <AlertTriangle size={15} className="text-rose-500 shrink-0" />;
    return <Circle size={15} className="text-slate-400 shrink-0" />;
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
    initialStatus?: TaskStatus;
    onClose: () => void;
    onSave: (data: CreateTaskPayload) => Promise<boolean>;
}

function CreateTaskModal({ saving, saveError, initialStatus = "TODO", onClose, onSave }: CreateTaskModalProps) {
    const [form, setForm] = useState<CreateTaskPayload>({
        title: "",
        description: "",
        priority: "MEDIUM",
        dueDate: "",
        assignedToId: "",
        status: initialStatus,
        leadId: "",
        dealId: "",
        projectId: "",
        labels: [],
    });
    const [tagInput, setTagInput] = useState("");
    const [errors, setErrors] = useState<{ title?: string }>({});
    const [members, setMembers] = useState<TeamMember[]>([]);

    useEffect(() => {
        fetchTeamMembers()
            .then((data) => setMembers(data.members ?? data ?? []))
            .catch(() => setMembers([]));
    }, []);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleAddTag = () => {
        const trimmed = tagInput.trim();
        if (trimmed && !form.labels?.includes(trimmed)) {
            setForm((prev) => ({ ...prev, labels: [...(prev.labels ?? []), trimmed] }));
            setTagInput("");
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setForm((prev) => ({
            ...prev,
            labels: (prev.labels ?? []).filter((t) => t !== tagToRemove),
        }));
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
                            <p className="text-xs text-slate-500">Add a new task to your Kanban board</p>
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
                            placeholder="Detailed requirements, acceptance criteria, or links..."
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
                                <option value="REVIEW">Review</option>
                                <option value="BLOCKED">Blocked</option>
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

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                                Project
                            </label>
                            <input
                                name="projectId"
                                value={form.projectId ?? ""}
                                onChange={handleChange}
                                placeholder="e.g. CORE-ENGINE, WEB-APP"
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                                Add Labels
                            </label>
                            <div className="flex space-x-1.5">
                                <input
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleAddTag();
                                        }
                                    }}
                                    placeholder="Tag name + Enter"
                                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddTag}
                                    className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl"
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Labels List */}
                    {form.labels && form.labels.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                            {form.labels.map((label) => (
                                <span
                                    key={label}
                                    className="inline-flex items-center space-x-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 rounded-lg text-xs font-semibold"
                                >
                                    <span>{label}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveTag(label)}
                                        className="hover:text-blue-800 dark:hover:text-blue-200"
                                    >
                                        <X size={12} />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
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
    const data = result.data ?? result;
    const hasFailures = (data.totalFailed ?? 0) > 0;

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
                            {data.totalUpdated ?? 0} updated, {data.totalFailed ?? 0} failed
                        </p>
                    </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1.5 text-xs">
                    <div className="flex justify-between">
                        <span className="text-slate-500">Total Requested:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{data.totalRequested ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-emerald-600 dark:text-emerald-400">Successfully Updated:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{data.totalUpdated ?? 0}</span>
                    </div>
                    {(data.totalFailed ?? 0) > 0 && (
                        <div className="flex justify-between">
                            <span className="text-red-500">Failed:</span>
                            <span className="font-bold text-red-500">{data.totalFailed}</span>
                        </div>
                    )}
                </div>

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
    projectFilter?: string;
    labelFilter?: string;
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
    onProjectFilterChange?: (p: string) => void;
    onLabelFilterChange?: (l: string) => void;
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

type ViewMode = "KANBAN" | "LIST";

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
    projectFilter = "all",
    labelFilter = "all",
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
    onProjectFilterChange,
    onLabelFilterChange,
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
    const [viewMode, setViewMode] = useState<ViewMode>("KANBAN");
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [bulkResult, setBulkResult] = useState<BulkUpdateResponse | null>(null);
    const [createColStatus, setCreateColStatus] = useState<TaskStatus>("TODO");

    // Bulk action state
    const [bulkStatus, setBulkStatus] = useState<TaskStatus | "">("");
    const [bulkPriority, setBulkPriority] = useState<TaskPriority | "">("");
    const [bulkAssignee, setBulkAssignee] = useState<string>("");

    // Drag and drop states for Kanban
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);

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

    // Unique projects and labels for filter dropdowns
    const availableProjects = Array.from(
        new Set(tasks.map((t) => t.projectId).filter(Boolean))
    ) as string[];

    const availableLabels = Array.from(
        new Set(
            tasks.flatMap((t) => (Array.isArray(t.labels) ? t.labels : [])).filter(Boolean)
        )
    ) as string[];

    const todoCount = tasks.filter((t) => t.status === "TODO").length;
    const inProgressCount = tasks.filter((t) => t.status === "IN_PROGRESS").length;
    const reviewCount = tasks.filter((t) => t.status === "REVIEW").length;
    const blockedCount = tasks.filter((t) => t.status === "BLOCKED").length;
    const doneCount = tasks.filter((t) => t.status === "DONE").length;

    const overdueCount = tasks.filter((t) => {
        if (!t.dueDate) return false;
        return new Date(t.dueDate) < new Date() && t.status !== "DONE";
    }).length;

    const hasActiveFilters =
        filter !== "all" ||
        statusFilter !== "all" ||
        priorityFilter !== "all" ||
        assigneeFilter !== "all" ||
        projectFilter !== "all" ||
        labelFilter !== "all" ||
        search.trim().length > 0;

    const handleClearAllFilters = () => {
        onFilterChange("all");
        onStatusFilterChange("all");
        onPriorityFilterChange("all");
        onAssigneeFilterChange("all");
        if (onProjectFilterChange) onProjectFilterChange("all");
        if (onLabelFilterChange) onLabelFilterChange("all");
        onSearchChange("");
    };

    const handleApplyBulkUpdate = async (fields: BulkUpdateFields) => {
        try {
            const res = await onBulkUpdate(fields);
            setBulkResult(res);
            setBulkStatus("");
            setBulkPriority("");
            setBulkAssignee("");
        } catch {
            // Handled in hook
        }
    };

    const openCreateWithStatus = (colStatus: TaskStatus) => {
        setCreateColStatus(colStatus);
        onOpenCreate();
    };

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
                <AlertCircle size={32} className="text-red-400" />
                <p className="text-red-500 text-sm font-medium">{error}</p>
                <button
                    onClick={onRetry}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition"
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
                                <KanbanSquare className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                                    Jira Board & Tasks
                                </h1>
                                <p className="text-xs text-slate-500">
                                    Kanban workflow with drag/drop transitions, real-time filters & collaboration
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        {/* View Mode Toggle: Board (Kanban) / List */}
                        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700">
                            <button
                                onClick={() => setViewMode("KANBAN")}
                                title="Kanban Board View"
                                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                    viewMode === "KANBAN"
                                        ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                                }`}
                            >
                                <KanbanSquare size={14} />
                                <span>Board</span>
                            </button>
                            <button
                                onClick={() => setViewMode("LIST")}
                                title="List View"
                                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                    viewMode === "LIST"
                                        ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                                }`}
                            >
                                <LayoutList size={14} />
                                <span>List</span>
                            </button>
                        </div>

                        {/* Create Task Button */}
                        <button
                            onClick={() => openCreateWithStatus("TODO")}
                            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-500/20 active:scale-95"
                        >
                            <Plus size={15} />
                            <span>Create Task</span>
                        </button>
                    </div>
                </div>

                {/* ── Status Metrics Bar ──────────────────────────────────────── */}
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 mt-5">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-500">Total</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{tasks.length}</span>
                    </div>
                    <div className="p-3 bg-slate-100/60 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">To Do</span>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{todoCount}</span>
                    </div>
                    <div className="p-3 bg-blue-50/50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/50 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">In Progress</span>
                        <span className="text-sm font-bold text-blue-700 dark:text-blue-300">{inProgressCount}</span>
                    </div>
                    <div className="p-3 bg-purple-50/50 dark:bg-purple-950/30 rounded-xl border border-purple-100 dark:border-purple-900/50 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">Review</span>
                        <span className="text-sm font-bold text-purple-700 dark:text-purple-300">{reviewCount}</span>
                    </div>
                    <div className="p-3 bg-rose-50/50 dark:bg-rose-950/30 rounded-xl border border-rose-100 dark:border-rose-900/50 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">Blocked</span>
                        <span className="text-sm font-bold text-rose-700 dark:text-rose-300">{blockedCount}</span>
                    </div>
                    <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Done</span>
                        <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{doneCount}</span>
                    </div>
                </div>

                {/* ── Filters & Search Controls ──────────────────────────────── */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Search Input */}
                        <div className="relative min-w-[200px] max-w-xs">
                            <Search
                                size={14}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => onSearchChange(e.target.value)}
                                placeholder="Search tasks or tags..."
                                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition"
                            />
                            {search && (
                                <button
                                    onClick={() => onSearchChange("")}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>

                        {/* Quick Filter: All / My Tasks / Overdue */}
                        <div className="flex items-center space-x-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
                            {(["all", "my", "overdue"] as TaskFilter[]).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => onFilterChange(f)}
                                    className={`px-3 py-1 rounded-lg transition capitalize ${
                                        filter === f
                                            ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold"
                                            : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                                    }`}
                                >
                                    {f === "all" ? "All Tasks" : f === "my" ? "My Tasks" : "Overdue"}
                                </button>
                            ))}
                        </div>

                        {/* Status Filter */}
                        <select
                            value={statusFilter}
                            onChange={(e) => onStatusFilterChange(e.target.value)}
                            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-blue-500"
                        >
                            <option value="all">Status: All</option>
                            <option value="TODO">To Do</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="REVIEW">Review</option>
                            <option value="BLOCKED">Blocked</option>
                            <option value="DONE">Done</option>
                        </select>

                        {/* Priority Filter */}
                        <select
                            value={priorityFilter}
                            onChange={(e) => onPriorityFilterChange(e.target.value)}
                            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-blue-500"
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
                            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-blue-500"
                        >
                            <option value="all">Assignee: All</option>
                            <option value="unassigned">Unassigned</option>
                            {members.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.name}
                                </option>
                            ))}
                        </select>

                        {/* Project Filter */}
                        {availableProjects.length > 0 && onProjectFilterChange && (
                            <select
                                value={projectFilter}
                                onChange={(e) => onProjectFilterChange(e.target.value)}
                                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-blue-500"
                            >
                                <option value="all">Project: All</option>
                                {availableProjects.map((proj) => (
                                    <option key={proj} value={proj}>
                                        {proj}
                                    </option>
                                ))}
                            </select>
                        )}

                        {/* Label Filter */}
                        {availableLabels.length > 0 && onLabelFilterChange && (
                            <select
                                value={labelFilter}
                                onChange={(e) => onLabelFilterChange(e.target.value)}
                                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-blue-500"
                            >
                                <option value="all">Label: All</option>
                                {availableLabels.map((lbl) => (
                                    <option key={lbl} value={lbl}>
                                        {lbl}
                                    </option>
                                ))}
                            </select>
                        )}

                        {/* Clear Filters button */}
                        {hasActiveFilters && (
                            <button
                                onClick={handleClearAllFilters}
                                className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
                            >
                                <RotateCcw size={12} />
                                <span>Reset Filters</span>
                            </button>
                        )}
                    </div>

                    <div className="text-xs text-slate-400 font-medium">
                        Showing <strong className="text-slate-700 dark:text-slate-200">{filteredTasks.length}</strong> of{" "}
                        {tasks.length} tasks
                    </div>
                </div>
            </div>

            {/* ── Main Work Area ─────────────────────────────────────────────────── */}
            <div className="p-6">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-80 space-y-3">
                        <Loader2 size={32} className="animate-spin text-blue-600" />
                        <span className="text-xs font-medium text-slate-500">Loading Jira board...</span>
                    </div>
                ) : filteredTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-xs">
                        <div className="p-4 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-2xl mb-3">
                            <ListTodo size={32} />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">No tasks match your filter</h3>
                        <p className="text-xs text-slate-500 max-w-sm mt-1">
                            Try adjusting your filters, searching for another keyword, or create a new task.
                        </p>
                        <div className="flex items-center space-x-3 mt-5">
                            {hasActiveFilters && (
                                <button
                                    onClick={handleClearAllFilters}
                                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                                >
                                    Clear Filters
                                </button>
                            )}
                            <button
                                onClick={() => openCreateWithStatus("TODO")}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
                            >
                                Create Task
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* ──────────────── 5-COLUMN KANBAN BOARD VIEW ──────────────── */}
                        {viewMode === "KANBAN" && (
                            <div className="overflow-x-auto pb-4">
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 min-w-[1100px] items-start">
                                    {KANBAN_COLUMNS.map((col) => {
                                        const colTasks = filteredTasks.filter((t) => t.status === col.status);
                                        const isColOver = dragOverCol === col.status;

                                        return (
                                            <div
                                                key={col.status}
                                                onDragOver={(e) => {
                                                    e.preventDefault();
                                                    e.dataTransfer.dropEffect = "move";
                                                }}
                                                onDragEnter={(e) => {
                                                    e.preventDefault();
                                                    setDragOverCol(col.status);
                                                }}
                                                onDragLeave={(e) => {
                                                    e.preventDefault();
                                                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                                        setDragOverCol(null);
                                                    }
                                                }}
                                                onDrop={async (e) => {
                                                    e.preventDefault();
                                                    setDragOverCol(null);
                                                    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
                                                    if (taskId) {
                                                        try {
                                                            if (onUpdateTask) {
                                                                await onUpdateTask(taskId, { status: col.status });
                                                            } else {
                                                                const found = tasks.find((t) => t.id === taskId);
                                                                if (found && found.status !== col.status) {
                                                                    onCycleStatus(found);
                                                                }
                                                            }
                                                        } catch (err) {
                                                            console.error("Failed to transition task status via drag and drop:", err);
                                                        }
                                                    }
                                                    setDraggedTaskId(null);
                                                }}
                                                className={`flex flex-col rounded-2xl border p-3.5 min-h-[550px] transition-all ${
                                                    isColOver
                                                        ? "bg-blue-50/70 dark:bg-blue-950/40 border-blue-400 ring-4 ring-blue-400/20 shadow-lg"
                                                        : "bg-slate-100/70 dark:bg-slate-900/90 border-slate-200/80 dark:border-slate-800 shadow-xs"
                                                }`}
                                            >
                                                {/* Column Header */}
                                                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/80 dark:border-slate-800">
                                                    <div className="flex items-center space-x-2">
                                                        <div className={`w-2.5 h-2.5 rounded-full ${col.accent}`} />
                                                        <span className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                                            {col.label}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center space-x-1.5">
                                                        <span className={`px-2 py-0.5 text-[11px] font-bold rounded-md ${col.badge}`}>
                                                            {colTasks.length}
                                                        </span>
                                                        <button
                                                            onClick={() => openCreateWithStatus(col.status)}
                                                            title={`Add task to ${col.label}`}
                                                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition"
                                                        >
                                                            <Plus size={14} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Column Task Cards */}
                                                <div className="space-y-3 flex-1">
                                                    {colTasks.map((task) => {
                                                        const isSelected = selectedTaskIds.includes(task.id);
                                                        const isOverdue =
                                                            task.dueDate &&
                                                            new Date(task.dueDate) < new Date() &&
                                                            task.status !== "DONE";

                                                        const subtasksCount = task.subtasks?.length ?? 0;
                                                        const completedSubtasks =
                                                            task.subtasks?.filter((s) => s.status === "DONE").length ?? 0;

                                                        const hasDependencies =
                                                            Array.isArray(task.dependencies) && task.dependencies.length > 0;

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
                                                                className={`p-3.5 bg-white dark:bg-slate-850 rounded-xl border border-slate-200/80 dark:border-slate-750 shadow-xs hover:shadow-md transition cursor-grab active:cursor-grabbing space-y-2.5 group relative ${
                                                                    isSelected ? "ring-2 ring-blue-500 bg-blue-50/20" : ""
                                                                } ${col.status === "DONE" ? "opacity-85" : ""}`}
                                                            >
                                                                {/* Card Top: Key, Priority, Selection */}
                                                                <div className="flex justify-between items-center">
                                                                    <div className="flex items-center space-x-2">
                                                                        <span className="text-[10px] font-mono font-bold text-slate-400">
                                                                            TASK-{task.id.slice(-4).toUpperCase()}
                                                                        </span>
                                                                        <span
                                                                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                                                                                PRIORITY_STYLES[task.priority]
                                                                            }`}
                                                                        >
                                                                            {task.priority}
                                                                        </span>
                                                                    </div>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isSelected}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        onChange={() => onToggleSelect(task.id)}
                                                                        className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                                                                    />
                                                                </div>

                                                                {/* Card Title */}
                                                                <h4
                                                                    className={`font-semibold text-xs text-slate-900 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition ${
                                                                        task.status === "DONE"
                                                                            ? "line-through text-slate-400 dark:text-slate-500"
                                                                            : ""
                                                                    }`}
                                                                >
                                                                    {task.title}
                                                                </h4>

                                                                {/* Description Snippet */}
                                                                {task.description && (
                                                                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                                                                        {task.description}
                                                                    </p>
                                                                )}

                                                                {/* Badges: Project, Labels, Dependencies */}
                                                                <div className="flex flex-wrap items-center gap-1">
                                                                    {task.projectId && (
                                                                        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-[9px] font-bold">
                                                                            <FolderKanban size={10} />
                                                                            <span>{task.projectId}</span>
                                                                        </span>
                                                                    )}

                                                                    {task.labels &&
                                                                        Array.isArray(task.labels) &&
                                                                        task.labels.map((lbl) => (
                                                                            <span
                                                                                key={lbl}
                                                                                className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/50 rounded text-[9px] font-semibold"
                                                                            >
                                                                                <span>#{lbl}</span>
                                                                            </span>
                                                                        ))}

                                                                    {hasDependencies && (
                                                                        <span
                                                                            title="Has task dependencies"
                                                                            className="inline-flex items-center space-x-1 px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900 rounded text-[9px] font-bold"
                                                                        >
                                                                            <Network size={10} />
                                                                            <span>{task.dependencies?.length} deps</span>
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {/* Subtask Progress indicator */}
                                                                {subtasksCount > 0 && (
                                                                    <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                                                                        <div className="flex justify-between text-[10px] text-slate-500">
                                                                            <span className="flex items-center space-x-1">
                                                                                <ListTree size={10} />
                                                                                <span>Subtasks</span>
                                                                            </span>
                                                                            <span>
                                                                                {completedSubtasks}/{subtasksCount}
                                                                            </span>
                                                                        </div>
                                                                        <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                                            <div
                                                                                className="h-full bg-blue-500 rounded-full"
                                                                                style={{
                                                                                    width: `${(completedSubtasks / subtasksCount) * 100}%`,
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Card Bottom: Assignee, Due Date */}
                                                                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                                                                    <div className="flex items-center space-x-1.5">
                                                                        {task.assignedTo?.name ? (
                                                                            <>
                                                                                <Avatar name={task.assignedTo.name} />
                                                                                <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[90px]">
                                                                                    {task.assignedTo.name}
                                                                                </span>
                                                                            </>
                                                                        ) : (
                                                                            <span className="text-slate-400 flex items-center space-x-1">
                                                                                <User size={12} />
                                                                                <span>Unassigned</span>
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {task.dueDate && (
                                                                        <span
                                                                            className={`inline-flex items-center space-x-1 font-semibold ${
                                                                                isOverdue
                                                                                    ? "text-rose-500"
                                                                                    : "text-slate-500 dark:text-slate-400"
                                                                            }`}
                                                                        >
                                                                            <Calendar size={11} />
                                                                            <span>
                                                                                {new Date(task.dueDate).toLocaleDateString("en-US", {
                                                                                    month: "short",
                                                                                    day: "numeric",
                                                                                })}
                                                                            </span>
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}

                                                    {colTasks.length === 0 && (
                                                        <div className="h-28 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-[11px] text-slate-400">
                                                            Drop tasks here
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Bottom Add button */}
                                                <button
                                                    onClick={() => openCreateWithStatus(col.status)}
                                                    className="w-full mt-3 py-2 bg-white/60 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1"
                                                >
                                                    <Plus size={13} />
                                                    <span>Add Task</span>
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ──────────────── LIST TABLE VIEW ──────────────── */}
                        {viewMode === "LIST" && (
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                                <th className="px-4 py-3 text-center w-10">
                                                    <input
                                                        ref={selectAllCheckboxRef}
                                                        type="checkbox"
                                                        checked={isAllSelected}
                                                        onChange={onSelectAll}
                                                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                                                    />
                                                </th>
                                                <th className="px-4 py-3">Task</th>
                                                <th className="px-4 py-3">Status</th>
                                                <th className="px-4 py-3">Priority</th>
                                                <th className="px-4 py-3">Assignee</th>
                                                <th className="px-4 py-3">Due Date</th>
                                                <th className="px-4 py-3 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                                            {filteredTasks.map((task) => {
                                                const isSelected = selectedTaskIds.includes(task.id);
                                                const isOverdue =
                                                    task.dueDate &&
                                                    new Date(task.dueDate) < new Date() &&
                                                    task.status !== "DONE";

                                                return (
                                                    <tr
                                                        key={task.id}
                                                        className={`transition-colors group hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                                                            isSelected ? "bg-blue-50/40 dark:bg-blue-950/20" : ""
                                                        }`}
                                                    >
                                                        {/* Checkbox */}
                                                        <td className="px-4 py-3.5 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => onToggleSelect(task.id)}
                                                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                                                            />
                                                        </td>

                                                        {/* Task Info */}
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
                                                                        {new Date(task.dueDate).toLocaleDateString("en-US", {
                                                                            month: "short",
                                                                            day: "numeric",
                                                                            year: "numeric",
                                                                        })}
                                                                    </span>
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-400">—</span>
                                                            )}
                                                        </td>

                                                        {/* Action */}
                                                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                                            <button
                                                                onClick={() => onOpenDetail(task)}
                                                                className="px-3 py-1 text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition font-bold"
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
                    </>
                )}
            </div>

            {/* ── Floating Bulk Action Toolbar ─────────────────────────────────── */}
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
                            {/* Bulk Status */}
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
                                <option value="">Set Status...</option>
                                <option value="TODO">To Do</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="REVIEW">Review</option>
                                <option value="BLOCKED">Blocked</option>
                                <option value="DONE">Done</option>
                            </select>

                            {/* Bulk Priority */}
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
                                <option value="">Set Priority...</option>
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                            </select>

                            {/* Bulk Assignee */}
                            <select
                                value={bulkAssignee}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setBulkAssignee(val);
                                    if (val) handleApplyBulkUpdate({ assignedToId: val === "unassigned" ? null : val });
                                }}
                                disabled={bulkUpdating}
                                className="px-3 py-1.5 rounded-xl bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 text-xs font-semibold outline-none border border-slate-700 dark:border-slate-300"
                            >
                                <option value="">Assign To...</option>
                                <option value="unassigned">Unassigned</option>
                                {members.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.name}
                                    </option>
                                ))}
                            </select>

                            {bulkUpdating && <Loader2 size={16} className="animate-spin text-blue-400" />}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Create Task Modal ─────────────────────────────────────────── */}
            {isCreateOpen && (
                <CreateTaskModal
                    saving={saving}
                    saveError={saveError}
                    initialStatus={createColStatus}
                    onClose={onCloseCreate}
                    onSave={onCreateTask}
                />
            )}

            {/* ── Bulk Result Modal ─────────────────────────────────────────── */}
            {bulkResult && (
                <BulkResultModal
                    result={bulkResult}
                    onClose={() => setBulkResult(null)}
                />
            )}
        </div>
    );
}
