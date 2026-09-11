// components/tasks/TaskDetailModal.tsx
"use client";

import { useState, useEffect } from "react";
import {
    X,
    Calendar,
    User,
    Flag,
    CheckCircle2,
    Circle,
    Clock,
    AlertCircle,
    Loader2,
    Trash2,
    Plus,
    Send,
    MessageSquare,
    ListTree,
    Network,
    History,
    FileText,
    ExternalLink,
    Check,
} from "lucide-react";
import {
    Task,
    TaskStatus,
    TaskPriority,
    UpdateTaskPayload,
    TaskComment,
    TaskSubtask,
    TaskDependency,
    TaskActivity,
    fetchTaskComments,
    createTaskComment,
    fetchTaskSubtasks,
    createTaskSubtask,
    fetchTaskDependencies,
    createTaskDependency,
    fetchTaskActivity,
    updateTask,
} from "@/lib/api/tasksApi";
import { fetchTeamMembers } from "@/lib/api/leadsApi";

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

interface TeamMember {
    id: string;
    name: string;
    role: string;
    email?: string;
}

type TabType = "details" | "subtasks" | "dependencies" | "activity" | "comments";

// ── Props ─────────────────────────────────────────────────────────────────────

interface TaskDetailModalProps {
    task: Task;
    saving: boolean;
    saveError: string | null;
    onClose: () => void;
    onUpdate: (id: string, data: UpdateTaskPayload) => Promise<boolean>;
    onDelete?: (id: string) => Promise<boolean>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TaskDetailModal({
    task,
    saving,
    saveError,
    onClose,
    onUpdate,
    onDelete,
}: TaskDetailModalProps) {
    const [activeTab, setActiveTab] = useState<TabType>("details");
    const [isEditing, setIsEditing] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Form state
    const [form, setForm] = useState<UpdateTaskPayload>({
        title: task.title,
        description: task.description ?? "",
        priority: task.priority,
        dueDate: task.dueDate?.split("T")[0] ?? "",
        assignedToId: task.assignedToId ?? "",
        status: task.status,
        leadId: (task.leadId as string) ?? "",
        dealId: (task.dealId as string) ?? "",
        projectId: (task.projectId as string) ?? "",
    });

    const [members, setMembers] = useState<TeamMember[]>([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [localSaveError, setLocalSaveError] = useState<string | null>(null);

    // Sub-resources states
    const [comments, setComments] = useState<TaskComment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [submittingComment, setSubmittingComment] = useState(false);

    const [subtasks, setSubtasks] = useState<TaskSubtask[]>([]);
    const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
    const [submittingSubtask, setSubmittingSubtask] = useState(false);

    const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
    const [newDepId, setNewDepId] = useState("");
    const [submittingDep, setSubmittingDep] = useState(false);

    const [activities, setActivities] = useState<TaskActivity[]>([]);
    const [subLoading, setSubLoading] = useState(false);

    // Load team members
    useEffect(() => {
        setMembersLoading(true);
        fetchTeamMembers()
            .then((data) => setMembers(data.members ?? data ?? []))
            .catch(() => setMembers([]))
            .finally(() => setMembersLoading(false));
    }, []);

    // Load sub-resources when tabs change
    useEffect(() => {
        if (!task?.id) return;
        if (activeTab === "comments") {
            setSubLoading(true);
            fetchTaskComments(task.id)
                .then(setComments)
                .finally(() => setSubLoading(false));
        } else if (activeTab === "subtasks") {
            setSubLoading(true);
            fetchTaskSubtasks(task.id)
                .then(setSubtasks)
                .finally(() => setSubLoading(false));
        } else if (activeTab === "dependencies") {
            setSubLoading(true);
            fetchTaskDependencies(task.id)
                .then(setDependencies)
                .finally(() => setSubLoading(false));
        } else if (activeTab === "activity") {
            setSubLoading(true);
            fetchTaskActivity(task.id)
                .then(setActivities)
                .finally(() => setSubLoading(false));
        }
    }, [activeTab, task.id]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSave = async () => {
        if (!form.title?.trim()) {
            setLocalSaveError("Title cannot be empty");
            return;
        }
        setLocalSaveError(null);
        const ok = await onUpdate(task.id, form);
        if (ok) {
            setIsEditing(false);
        }
    };

    const handleQuickStatusChange = async (newStatus: TaskStatus) => {
        setForm((prev) => ({ ...prev, status: newStatus }));
        await onUpdate(task.id, { status: newStatus });
    };

    const handleQuickPriorityChange = async (newPriority: TaskPriority) => {
        setForm((prev) => ({ ...prev, priority: newPriority }));
        await onUpdate(task.id, { priority: newPriority });
    };

    const handleDelete = async () => {
        if (!onDelete) return;
        setDeleting(true);
        try {
            await onDelete(task.id);
            onClose();
        } finally {
            setDeleting(false);
        }
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        setSubmittingComment(true);
        try {
            const comment = await createTaskComment(task.id, newComment.trim());
            setComments((prev) => [comment, ...prev]);
            setNewComment("");
        } finally {
            setSubmittingComment(false);
        }
    };

    const handleAddSubtask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSubtaskTitle.trim()) return;
        setSubmittingSubtask(true);
        try {
            const subtask = await createTaskSubtask(task.id, {
                title: newSubtaskTitle.trim(),
                status: "TODO",
                priority: task.priority,
            });
            setSubtasks((prev) => [...prev, subtask]);
            setNewSubtaskTitle("");
        } finally {
            setSubmittingSubtask(false);
        }
    };

    const handleToggleSubtask = async (sub: TaskSubtask) => {
        const nextStatus: TaskStatus = sub.status === "DONE" ? "TODO" : "DONE";
        setSubtasks((prev) =>
            prev.map((s) => (s.id === sub.id ? { ...s, status: nextStatus } : s))
        );
        try {
            await updateTask(sub.id, { status: nextStatus });
        } catch {
            // rollback
            setSubtasks((prev) =>
                prev.map((s) => (s.id === sub.id ? { ...s, status: sub.status } : s))
            );
        }
    };

    const handleAddDependency = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDepId.trim()) return;
        setSubmittingDep(true);
        try {
            const dep = await createTaskDependency(task.id, newDepId.trim());
            setDependencies((prev) => [...prev, dep]);
            setNewDepId("");
        } finally {
            setSubmittingDep(false);
        }
    };

    const completedSubtasksCount = subtasks.filter((s) => s.status === "DONE").length;

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
            {/* Drawer container: slides in from right */}
            <div
                className="w-full max-w-2xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-300 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* ── Top Header Bar ─────────────────────────────────────────── */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/80">
                    <div className="flex items-center space-x-3">
                        <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-1 rounded-md border border-blue-200/60 dark:border-blue-800">
                            TASK-{task.id.slice(-6).toUpperCase()}
                        </span>

                        {/* Status dropdown quick toggle */}
                        <select
                            value={task.status}
                            onChange={(e) => handleQuickStatusChange(e.target.value as TaskStatus)}
                            className={`text-xs font-semibold px-2.5 py-1 rounded-lg outline-none cursor-pointer ${STATUS_STYLES[task.status]}`}
                        >
                            <option value="TODO">To Do</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="DONE">Done</option>
                        </select>

                        {/* Priority dropdown quick toggle */}
                        <select
                            value={task.priority}
                            onChange={(e) => handleQuickPriorityChange(e.target.value as TaskPriority)}
                            className={`text-xs font-semibold px-2.5 py-1 rounded-lg outline-none cursor-pointer ${PRIORITY_STYLES[task.priority]}`}
                        >
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                        </select>
                    </div>

                    <div className="flex items-center space-x-2">
                        {onDelete && !confirmDelete && (
                            <button
                                onClick={() => setConfirmDelete(true)}
                                title="Delete Task"
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                        {confirmDelete && (
                            <div className="flex items-center space-x-2 bg-red-50 dark:bg-red-950/60 p-1 rounded-lg border border-red-200 dark:border-red-900">
                                <span className="text-[11px] font-semibold text-red-600 dark:text-red-400 px-1">Confirm delete?</span>
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="px-2 py-0.5 bg-red-600 text-white rounded text-[11px] font-bold hover:bg-red-700 transition"
                                >
                                    {deleting ? "..." : "Yes"}
                                </button>
                                <button
                                    onClick={() => setConfirmDelete(false)}
                                    className="px-2 py-0.5 bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded text-[11px] font-bold"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* ── Tabs Navigation ────────────────────────────────────────── */}
                <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-white dark:bg-slate-900 space-x-6 text-xs font-semibold text-slate-500 overflow-x-auto">
                    {[
                        { key: "details", label: "Overview", icon: FileText },
                        { key: "subtasks", label: `Subtasks (${subtasks.length})`, icon: ListTree },
                        { key: "dependencies", label: `Dependencies (${dependencies.length})`, icon: Network },
                        { key: "comments", label: `Comments (${comments.length})`, icon: MessageSquare },
                        { key: "activity", label: "Activity", icon: History },
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const isCurrent = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key as TabType)}
                                className={`flex items-center space-x-1.5 py-3 border-b-2 transition whitespace-nowrap ${
                                    isCurrent
                                        ? "border-blue-600 text-blue-600 dark:text-blue-400 font-bold"
                                        : "border-transparent hover:text-slate-800 dark:hover:text-slate-200"
                                }`}
                            >
                                <Icon size={14} />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Error Banner */}
                {(saveError || localSaveError) && (
                    <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl flex items-center gap-2 text-red-600 dark:text-red-400 text-xs font-medium">
                        <AlertCircle size={15} className="shrink-0" />
                        <span>{saveError || localSaveError}</span>
                    </div>
                )}

                {/* ── Scrollable Body ────────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* TAB 1: OVERVIEW / DETAILS */}
                    {activeTab === "details" && (
                        <div className="space-y-6">
                            {/* Title & Edit Toggle */}
                            <div className="flex items-start justify-between gap-4">
                                {isEditing ? (
                                    <div className="flex-1">
                                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                                            Task Title
                                        </label>
                                        <input
                                            name="title"
                                            value={form.title ?? ""}
                                            onChange={handleChange}
                                            className="w-full text-base font-bold px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex-1">
                                        <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
                                            {task.title}
                                        </h2>
                                    </div>
                                )}
                                <button
                                    onClick={() => {
                                        if (isEditing) handleSave();
                                        else setIsEditing(true);
                                    }}
                                    disabled={saving}
                                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                                >
                                    {saving ? "Saving..." : isEditing ? "Save" : "Edit"}
                                </button>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                                    Description
                                </label>
                                {isEditing ? (
                                    <textarea
                                        name="description"
                                        rows={4}
                                        value={form.description ?? ""}
                                        onChange={handleChange}
                                        placeholder="Add a detailed description..."
                                        className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
                                    />
                                ) : (
                                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs text-slate-700 dark:text-slate-300 leading-relaxed min-h-[70px]">
                                        {task.description || <span className="text-slate-400 italic">No description provided.</span>}
                                    </div>
                                )}
                            </div>

                            {/* Metadata Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                {/* Assignee */}
                                <div className="p-3 bg-slate-50/60 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Assignee</p>
                                    {isEditing ? (
                                        <select
                                            name="assignedToId"
                                            value={form.assignedToId ?? ""}
                                            onChange={handleChange}
                                            className="w-full text-xs p-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                                        >
                                            <option value="">Unassigned</option>
                                            {members.map((m) => (
                                                <option key={m.id} value={m.id}>
                                                    {m.name} ({m.role})
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 flex items-center justify-center text-[10px] font-bold">
                                                {task.assignedTo?.name ? task.assignedTo.name.slice(0, 2).toUpperCase() : <User size={12} />}
                                            </div>
                                            <span>{task.assignedTo?.name ?? "Unassigned"}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Due Date */}
                                <div className="p-3 bg-slate-50/60 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Due Date</p>
                                    {isEditing ? (
                                        <input
                                            type="date"
                                            name="dueDate"
                                            value={form.dueDate ?? ""}
                                            onChange={handleChange}
                                            className="w-full text-xs p-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                                        />
                                    ) : (
                                        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                                            <Calendar size={14} className="text-slate-400" />
                                            <span>
                                                {task.dueDate
                                                    ? new Date(task.dueDate).toLocaleDateString("en-US", {
                                                          month: "short",
                                                          day: "numeric",
                                                          year: "numeric",
                                                      })
                                                    : "No due date"}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Created At */}
                                <div className="p-3 bg-slate-50/60 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Created</p>
                                    <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-400">
                                        <Clock size={14} />
                                        <span>
                                            {new Date(task.createdAt).toLocaleString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                hour: "numeric",
                                                minute: "2-digit",
                                            })}
                                        </span>
                                    </div>
                                </div>

                                {/* Project Context */}
                                <div className="p-3 bg-slate-50/60 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Project Context</p>
                                    <span className="text-xs text-slate-600 dark:text-slate-400">
                                        {task.projectId ? String(task.projectId) : "General Workspace"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: SUBTASKS */}
                    {activeTab === "subtasks" && (
                        <div className="space-y-4">
                            {/* Progress bar */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    <span>Subtasks Progress</span>
                                    <span>
                                        {completedSubtasksCount}/{subtasks.length} Done
                                    </span>
                                </div>
                                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-500 transition-all duration-300"
                                        style={{
                                            width: `${
                                                subtasks.length > 0 ? (completedSubtasksCount / subtasks.length) * 100 : 0
                                            }%`,
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Subtask list */}
                            <div className="space-y-2">
                                {subtasks.map((s) => (
                                    <div
                                        key={s.id}
                                        className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-slate-300 transition"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <button
                                                onClick={() => handleToggleSubtask(s)}
                                                className={`w-5 h-5 rounded border flex items-center justify-center transition ${
                                                    s.status === "DONE"
                                                        ? "bg-emerald-500 border-emerald-500 text-white"
                                                        : "border-slate-300 dark:border-slate-600 hover:border-emerald-500"
                                                }`}
                                            >
                                                {s.status === "DONE" && <Check size={13} />}
                                            </button>
                                            <span
                                                className={`text-xs font-medium ${
                                                    s.status === "DONE"
                                                        ? "line-through text-slate-400"
                                                        : "text-slate-800 dark:text-slate-200"
                                                }`}
                                            >
                                                {s.title}
                                            </span>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${STATUS_STYLES[s.status]}`}>
                                            {STATUS_LABELS[s.status]}
                                        </span>
                                    </div>
                                ))}

                                {subtasks.length === 0 && !subLoading && (
                                    <p className="text-xs text-slate-400 text-center py-6">No subtasks yet. Create one below.</p>
                                )}
                            </div>

                            {/* Create subtask form */}
                            <form onSubmit={handleAddSubtask} className="flex gap-2 pt-2">
                                <input
                                    type="text"
                                    placeholder="Add subtask title..."
                                    value={newSubtaskTitle}
                                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                    className="flex-1 text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                />
                                <button
                                    type="submit"
                                    disabled={submittingSubtask || !newSubtaskTitle.trim()}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition flex items-center space-x-1"
                                >
                                    <Plus size={14} />
                                    <span>Add</span>
                                </button>
                            </form>
                        </div>
                    )}

                    {/* TAB 3: DEPENDENCIES */}
                    {activeTab === "dependencies" && (
                        <div className="space-y-4">
                            <p className="text-xs text-slate-500">
                                Manage blocker and blocked-by dependencies for this task.
                            </p>

                            <div className="space-y-2">
                                {dependencies.map((dep) => (
                                    <div
                                        key={dep.id}
                                        className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 text-xs flex justify-between items-center"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <Network size={14} className="text-blue-500" />
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                Depends on: {dep.dependencyId}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-slate-400">
                                            {new Date(dep.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                ))}

                                {dependencies.length === 0 && !subLoading && (
                                    <p className="text-xs text-slate-400 text-center py-6">No dependencies defined.</p>
                                )}
                            </div>

                            <form onSubmit={handleAddDependency} className="flex gap-2 pt-2">
                                <input
                                    type="text"
                                    placeholder="Task ID to depend on (e.g. task_xyz)..."
                                    value={newDepId}
                                    onChange={(e) => setNewDepId(e.target.value)}
                                    className="flex-1 text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                />
                                <button
                                    type="submit"
                                    disabled={submittingDep || !newDepId.trim()}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition"
                                >
                                    Link
                                </button>
                            </form>
                        </div>
                    )}

                    {/* TAB 4: COMMENTS */}
                    {activeTab === "comments" && (
                        <div className="space-y-4">
                            {/* Comments thread */}
                            <div className="space-y-3">
                                {comments.map((c) => (
                                    <div
                                        key={c.id}
                                        className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1.5"
                                    >
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="font-bold text-slate-800 dark:text-slate-200">
                                                {c.author?.name || "Team Member"}
                                            </span>
                                            <span className="text-slate-400">
                                                {new Date(c.createdAt).toLocaleString("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                    hour: "numeric",
                                                    minute: "2-digit",
                                                })}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                            {c.content}
                                        </p>
                                    </div>
                                ))}

                                {comments.length === 0 && !subLoading && (
                                    <p className="text-xs text-slate-400 text-center py-6">
                                        No comments yet. Leave a note below.
                                    </p>
                                )}
                            </div>

                            {/* Comment Input */}
                            <form onSubmit={handleAddComment} className="flex gap-2 pt-2">
                                <input
                                    type="text"
                                    placeholder="Write a comment..."
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    className="flex-1 text-xs px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                />
                                <button
                                    type="submit"
                                    disabled={submittingComment || !newComment.trim()}
                                    className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition flex items-center space-x-1"
                                >
                                    <Send size={13} />
                                    <span>Send</span>
                                </button>
                            </form>
                        </div>
                    )}

                    {/* TAB 5: ACTIVITY TIMELINE */}
                    {activeTab === "activity" && (
                        <div className="space-y-4">
                            <div className="relative pl-6 border-l-2 border-slate-100 dark:border-slate-800 space-y-4">
                                {activities.map((act) => (
                                    <div key={act.id} className="relative space-y-1">
                                        <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-blue-500 ring-4 ring-white dark:ring-slate-900" />
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                {act.actor?.name || "System"}
                                            </span>
                                            <span className="text-slate-400">
                                                {new Date(act.createdAt).toLocaleTimeString([], {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-600 dark:text-slate-400">
                                            {act.type.replace(/_/g, " ").toLowerCase()}:{" "}
                                            {act.oldValue && act.newValue ? (
                                                <span className="font-mono text-[11px]">
                                                    {act.oldValue} → {act.newValue}
                                                </span>
                                            ) : (
                                                act.newValue || act.type
                                            )}
                                        </p>
                                    </div>
                                ))}

                                {activities.length === 0 && !subLoading && (
                                    <p className="text-xs text-slate-400 text-center py-6">No recorded activity yet.</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Footer ─────────────────────────────────────────────────── */}
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 flex justify-between items-center">
                    <span className="text-[11px] text-slate-400 font-mono">
                        ID: {task.id}
                    </span>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-xl text-xs font-bold hover:opacity-90 transition"
                    >
                        Close Drawer
                    </button>
                </div>
            </div>
        </div>
    );
}
