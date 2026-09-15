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
    Edit2,
    Sparkles,
    AlertTriangle,
    Tag,
    FolderKanban,
    Paperclip,
    Download,
} from "lucide-react";
import { AttachmentSection } from "@/components/workspace/AttachmentSection";
import { ExportModal } from "@/components/workspace/ExportModal";
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
    updateTaskComment,
    deleteTaskComment,
    fetchTaskSubtasks,
    createTaskSubtask,
    updateTaskSubtask,
    deleteTaskSubtask,
    fetchTaskDependencies,
    createTaskDependency,
    deleteTaskDependency,
    normaliseTaskDependenciesResponse,
    fetchTaskActivity,
    getTaskLabelsMap,
    saveTaskLabels,
} from "@/lib/api/tasksApi";
import { fetchTeamMembers } from "@/lib/api/leadsApi";

// ── Constants ─────────────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<TaskPriority, string> = {
    HIGH:   "bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900",
    MEDIUM: "bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900",
    LOW:    "bg-green-50 text-green-600 border border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900",
};

const STATUS_STYLES: Record<TaskStatus, string> = {
    TODO:        "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    IN_PROGRESS: "bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900",
    REVIEW:      "bg-purple-50 text-purple-600 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900",
    BLOCKED:     "bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900",
    DONE:        "bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900",
};

const STATUS_LABELS: Record<TaskStatus, string> = {
    TODO:        "To Do",
    IN_PROGRESS: "In Progress",
    REVIEW:      "Review",
    BLOCKED:     "Blocked",
    DONE:        "Done",
};

interface TeamMember {
    id: string;
    name: string;
    role: string;
    email?: string;
}

type TabType = "details" | "subtasks" | "dependencies" | "comments" | "activity" | "attachments";

// ── Props ─────────────────────────────────────────────────────────────────────

export interface TaskDetailModalProps {
    task: Task;
    allTasks?: Task[];
    saving: boolean;
    saveError: string | null;
    onClose: () => void;
    onUpdate: (id: string, data: UpdateTaskPayload) => Promise<boolean>;
    onDelete?: (id: string) => Promise<boolean>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TaskDetailModal({
    task,
    allTasks = [],
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
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);

    // Form state
    const [form, setForm] = useState<UpdateTaskPayload>(() => {
        const stored = getTaskLabelsMap()[task.id];
        const initialLabels = task.labels && task.labels.length > 0 ? task.labels : (stored ?? []);
        return {
            title: task.title,
            description: task.description ?? "",
            priority: task.priority,
            dueDate: task.dueDate?.split("T")[0] ?? "",
            assignedToId: task.assignedToId ?? "",
            status: task.status,
            leadId: (task.leadId as string) ?? "",
            dealId: (task.dealId as string) ?? "",
            projectId: (task.projectId as string) ?? "",
            labels: initialLabels,
        };
    });

    const [members, setMembers] = useState<TeamMember[]>([]);
    const [localSaveError, setLocalSaveError] = useState<string | null>(null);
    const [newTagInput, setNewTagInput] = useState("");

    // Keep form in sync with task updates (e.g. status/priority changes) when not actively editing
    useEffect(() => {
        if (!isEditing) {
            const stored = getTaskLabelsMap()[task.id];
            const currentLabels = task.labels && task.labels.length > 0 ? task.labels : (stored ?? []);
            setForm({
                title: task.title,
                description: task.description ?? "",
                priority: task.priority,
                dueDate: task.dueDate?.split("T")[0] ?? "",
                assignedToId: task.assignedToId ?? "",
                status: task.status,
                leadId: (task.leadId as string) ?? "",
                dealId: (task.dealId as string) ?? "",
                projectId: (task.projectId as string) ?? "",
                labels: currentLabels,
            });
        }
    }, [task, isEditing]);

    // Sub-resources states
    const [comments, setComments] = useState<TaskComment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editingCommentText, setEditingCommentText] = useState("");
    const [submittingComment, setSubmittingComment] = useState(false);

    const [subtasks, setSubtasks] = useState<TaskSubtask[]>([]);
    const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
    const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
    const [editingSubtaskTitle, setEditingSubtaskTitle] = useState("");
    const [submittingSubtask, setSubmittingSubtask] = useState(false);

    const [dependencies, setDependencies] = useState<TaskDependency[]>(() => {
        if (Array.isArray(task.dependencies) && task.dependencies.length > 0) {
            return task.dependencies;
        }
        if (Array.isArray((task as any).dependsOn) && (task as any).dependsOn.length > 0) {
            return normaliseTaskDependenciesResponse((task as any).dependsOn, task.id);
        }
        return [];
    });
    const [dependenciesError, setDependenciesError] = useState<string | null>(null);
    const [newDepId, setNewDepId] = useState("");
    const [submittingDep, setSubmittingDep] = useState(false);

    const [activities, setActivities] = useState<TaskActivity[]>([]);
    const [activityFilter, setActivityFilter] = useState<string>("ALL");
    const [subLoading, setSubLoading] = useState(false);

    // Preload dependencies on task change so header badge count is immediately accurate
    useEffect(() => {
        if (!task?.id) return;
        fetchTaskDependencies(task.id)
            .then((data) => {
                setDependencies(Array.isArray(data) ? data : []);
            })
            .catch(() => {});
    }, [task.id]);

    // Load team members
    useEffect(() => {
        fetchTeamMembers()
            .then((data) => setMembers(data.members ?? data ?? []))
            .catch(() => setMembers([]));
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
            setDependenciesError(null);
            fetchTaskDependencies(task.id)
                .then((data) => {
                    setDependencies(Array.isArray(data) ? data : []);
                })
                .catch((err: any) => {
                    const backendMsg = err?.response?.data?.message || err?.response?.data?.error;
                    const msg = backendMsg || (err instanceof Error ? err.message : "Failed to load dependencies.");
                    setDependenciesError(msg);
                    setDependencies([]);
                })
                .finally(() => setSubLoading(false));
        } else if (activeTab === "activity") {
            setSubLoading(true);
            const typeParam = activityFilter === "ALL" ? undefined : activityFilter;
            fetchTaskActivity(task.id, 1, 30, typeParam)
                .then(setActivities)
                .finally(() => setSubLoading(false));
        }
    }, [activeTab, task.id, activityFilter]);

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

        // Build a clean payload containing ONLY modified fields
        // Ensures title/description edits never send unrelated empty foreign keys (preventing DB_FOREIGN_KEY)
        // and never send or alter status, priority, or other unmodified fields
        const payload: UpdateTaskPayload = {};

        if (form.title.trim() !== task.title) {
            payload.title = form.title.trim();
        }
        if ((form.description ?? "") !== (task.description ?? "")) {
            payload.description = form.description ?? "";
        }
        if ((form.assignedToId ?? "") !== (task.assignedToId ?? "")) {
            payload.assignedToId = form.assignedToId ? form.assignedToId : null;
        }
        const initialDueDate = task.dueDate ? task.dueDate.split("T")[0] : "";
        if ((form.dueDate ?? "") !== initialDueDate) {
            payload.dueDate = form.dueDate ? form.dueDate : null;
        }
        const initialProjectId = task.projectId ? String(task.projectId) : "";
        if ((form.projectId ?? "") !== initialProjectId) {
            payload.projectId = form.projectId?.trim() ? form.projectId.trim() : null;
        }

        // If no fields were modified, simply exit editing mode
        if (Object.keys(payload).length === 0) {
            setIsEditing(false);
            return;
        }

        const ok = await onUpdate(task.id, payload);
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

    const handleAddLabel = async () => {
        const trimmed = newTagInput.trim();
        if (trimmed && !form.labels?.includes(trimmed)) {
            const updated = [...(form.labels ?? []), trimmed];
            setForm((prev) => ({ ...prev, labels: updated }));
            saveTaskLabels(task.id, updated);
            setNewTagInput("");
            await onUpdate(task.id, { labels: updated });
        }
    };

    const handleRemoveLabel = async (tagToRemove: string) => {
        const updated = (form.labels ?? []).filter((t) => t !== tagToRemove);
        setForm((prev) => ({ ...prev, labels: updated }));
        saveTaskLabels(task.id, updated);
        await onUpdate(task.id, { labels: updated });
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

    // ── Comments CRUD ──────────────────────────────────────────────────────────
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

    const handleSaveEditedComment = async (commentId: string) => {
        if (!editingCommentText.trim()) return;
        try {
            const updated = await updateTaskComment(task.id, commentId, editingCommentText.trim());
            setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, ...updated } : c)));
            setEditingCommentId(null);
        } catch {
            // failed
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        try {
            await deleteTaskComment(task.id, commentId);
            setComments((prev) => prev.filter((c) => c.id !== commentId));
        } catch {
            // failed
        }
    };

    // ── Subtasks CRUD ──────────────────────────────────────────────────────────
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
            await updateTaskSubtask(task.id, sub.id, { status: nextStatus });
        } catch {
            // rollback
            setSubtasks((prev) =>
                prev.map((s) => (s.id === sub.id ? { ...s, status: sub.status } : s))
            );
        }
    };

    const handleSaveEditedSubtask = async (subtaskId: string) => {
        if (!editingSubtaskTitle.trim()) return;
        try {
            const updated = await updateTaskSubtask(task.id, subtaskId, {
                title: editingSubtaskTitle.trim(),
            });
            setSubtasks((prev) => prev.map((s) => (s.id === subtaskId ? { ...s, ...updated } : s)));
            setEditingSubtaskId(null);
        } catch {
            // failed
        }
    };

    const handleDeleteSubtask = async (subtaskId: string) => {
        try {
            await deleteTaskSubtask(task.id, subtaskId);
            setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));
        } catch {
            // failed
        }
    };

    // ── Dependencies CRUD ──────────────────────────────────────────────────────
    const handleAddDependency = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDepId.trim()) return;
        setSubmittingDep(true);
        setDependenciesError(null);
        try {
            const dep = await createTaskDependency(task.id, newDepId.trim());
            setDependencies((prev) => [...(Array.isArray(prev) ? prev : []), dep]);
            setNewDepId("");
        } catch (err: any) {
            const backendMsg = err?.response?.data?.message || err?.response?.data?.error;
            const msg = backendMsg || (err instanceof Error ? err.message : "Failed to add dependency (cycle detected or invalid ID).");
            setDependenciesError(msg);
        } finally {
            setSubmittingDep(false);
        }
    };

    const handleDeleteDependency = async (depOrId: TaskDependency | string) => {
        try {
            const depId = typeof depOrId === "string" ? depOrId : (depOrId.dependencyId || depOrId.id);
            const internalId = typeof depOrId === "string" ? depOrId : depOrId.id;
            await deleteTaskDependency(task.id, depId);
            setDependencies((prev) => (Array.isArray(prev) ? prev.filter((d) => d.id !== internalId && d.dependencyId !== depId) : []));
        } catch (err: any) {
            const backendMsg = err?.response?.data?.message || err?.response?.data?.error;
            setDependenciesError(backendMsg || "Failed to remove dependency.");
        }
    };

    const completedSubtasksCount = subtasks.filter((s) => s.status === "DONE").length;

    // Filter candidate tasks for dependency selector
    const dependencyCandidates = allTasks.filter((t) => t.id !== task.id);

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
            {/* Slide-over Drawer */}
            <div
                className="w-full max-w-2xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-300 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* ── Top Header Bar ─────────────────────────────────────────── */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/80">
                    <div className="flex items-center space-x-2.5">
                        <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-md border border-blue-200/60 dark:border-blue-800">
                            TASK-{task.id.slice(-6).toUpperCase()}
                        </span>

                        {/* Status dropdown quick toggle */}
                        <select
                            value={task.status}
                            onChange={(e) => handleQuickStatusChange(e.target.value as TaskStatus)}
                            className={`text-xs font-bold px-3 py-1 rounded-lg outline-none cursor-pointer ${STATUS_STYLES[task.status]}`}
                        >
                            <option value="TODO">To Do</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="REVIEW">Review</option>
                            <option value="BLOCKED">Blocked</option>
                            <option value="DONE">Done</option>
                        </select>

                        {/* Priority dropdown quick toggle */}
                        <select
                            value={task.priority}
                            onChange={(e) => handleQuickPriorityChange(e.target.value as TaskPriority)}
                            className={`text-xs font-bold px-2.5 py-1 rounded-lg outline-none cursor-pointer ${PRIORITY_STYLES[task.priority]}`}
                        >
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                        </select>
                    </div>

                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setIsExportModalOpen(true)}
                            title="Export Task"
                            className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg transition"
                        >
                            <Download size={14} />
                            <span>Export</span>
                        </button>
                        {onDelete && !confirmDelete && (
                            <button
                                onClick={() => setConfirmDelete(true)}
                                title="Delete Task"
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                        {confirmDelete && (
                            <div className="flex items-center space-x-2 bg-rose-50 dark:bg-rose-950/60 p-1 rounded-lg border border-rose-200 dark:border-rose-900">
                                <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 px-1">
                                    Delete?
                                </span>
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="px-2 py-0.5 bg-rose-600 text-white rounded text-[11px] font-bold hover:bg-rose-700 transition"
                                >
                                    {deleting ? "..." : "Yes"}
                                </button>
                                <button
                                    onClick={() => setConfirmDelete(false)}
                                    className="px-2 py-0.5 bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded text-[11px] font-bold"
                                >
                                    No
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
                        { key: "details", label: "Details", icon: FileText },
                        { key: "attachments", label: "Attachments", icon: Paperclip },
                        { key: "subtasks", label: `Subtasks (${subtasks.length})`, icon: ListTree },
                        {
                            key: "dependencies",
                            label: `Dependencies (${Array.isArray(dependencies) ? dependencies.length : 0})`,
                            icon: Network,
                        },
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
                    <div className="mx-6 mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-medium">
                        <AlertCircle size={15} className="shrink-0" />
                        <span>{saveError || localSaveError}</span>
                    </div>
                )}

                {/* ── Scrollable Body ────────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* TAB 1: DETAILS & ATTRIBUTES */}
                    {activeTab === "details" && (
                        <div className="space-y-6">
                            {/* Title & Inline Edit */}
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
                                <div className="flex items-center space-x-2">
                                    {isEditing && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsEditing(false);
                                                setLocalSaveError(null);
                                                setForm({
                                                    title: task.title,
                                                    description: task.description ?? "",
                                                    priority: task.priority,
                                                    dueDate: task.dueDate?.split("T")[0] ?? "",
                                                    assignedToId: task.assignedToId ?? "",
                                                    status: task.status,
                                                    leadId: (task.leadId as string) ?? "",
                                                    dealId: (task.dealId as string) ?? "",
                                                    projectId: (task.projectId as string) ?? "",
                                                    labels:
                                                        task.labels && task.labels.length > 0
                                                            ? task.labels
                                                            : getTaskLabelsMap()[task.id] ?? [],
                                                });
                                            }}
                                            disabled={saving}
                                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (isEditing) handleSave();
                                            else setIsEditing(true);
                                        }}
                                        disabled={saving}
                                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                                            isEditing
                                                ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                                                : "border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                                        }`}
                                    >
                                        {saving ? "Saving..." : isEditing ? "Save" : "Edit"}
                                    </button>
                                </div>
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
                                        {task.description || (
                                            <span className="text-slate-400 italic">No description provided.</span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Labels & Tags Manager */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                        Labels & Tags
                                    </label>
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                                    {form.labels && form.labels.length > 0 ? (
                                        form.labels.map((lbl) => (
                                            <span
                                                key={lbl}
                                                className="inline-flex items-center space-x-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 rounded-lg text-xs font-semibold"
                                            >
                                                <span>#{lbl}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveLabel(lbl)}
                                                    className="hover:text-rose-500 transition"
                                                >
                                                    <X size={11} />
                                                </button>
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-xs text-slate-400 italic">No labels assigned.</span>
                                    )}
                                </div>
                                <div className="flex space-x-1.5 max-w-xs">
                                    <input
                                        value={newTagInput}
                                        onChange={(e) => setNewTagInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleAddLabel();
                                            }
                                        }}
                                        placeholder="Add a label..."
                                        className="flex-1 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddLabel}
                                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl"
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>

                            {/* Attributes Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                {/* Assignee */}
                                <div className="p-3 bg-slate-50/60 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                                        Assignee
                                    </p>
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
                                                {task.assignedTo?.name ? (
                                                    task.assignedTo.name.slice(0, 2).toUpperCase()
                                                ) : (
                                                    <User size={12} />
                                                )}
                                            </div>
                                            <span>{task.assignedTo?.name ?? "Unassigned"}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Due Date */}
                                <div className="p-3 bg-slate-50/60 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                                        Due Date
                                    </p>
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

                                {/* Project Context */}
                                <div className="p-3 bg-slate-50/60 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                                        Project
                                    </p>
                                    {isEditing ? (
                                        <input
                                            name="projectId"
                                            value={form.projectId ?? ""}
                                            onChange={handleChange}
                                            placeholder="e.g. CORE-DEV"
                                            className="w-full text-xs p-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                                        />
                                    ) : (
                                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            {task.projectId ? String(task.projectId) : "General Workspace"}
                                        </span>
                                    )}
                                </div>

                                {/* Created At */}
                                <div className="p-3 bg-slate-50/60 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                                        Created
                                    </p>
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
                                        {completedSubtasksCount}/{subtasks.length} Completed
                                    </span>
                                </div>
                                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-600 transition-all duration-300"
                                        style={{
                                            width: `${
                                                subtasks.length > 0
                                                    ? (completedSubtasksCount / subtasks.length) * 100
                                                    : 0
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
                                        className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition"
                                    >
                                        <div className="flex items-center space-x-3 flex-1 mr-3">
                                            <button
                                                onClick={() => handleToggleSubtask(s)}
                                                className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                                                    s.status === "DONE"
                                                        ? "bg-emerald-500 border-emerald-500 text-white"
                                                        : "border-slate-300 dark:border-slate-600 hover:border-emerald-500"
                                                }`}
                                            >
                                                {s.status === "DONE" && <Check size={13} />}
                                            </button>

                                            {editingSubtaskId === s.id ? (
                                                <div className="flex items-center space-x-2 flex-1">
                                                    <input
                                                        value={editingSubtaskTitle}
                                                        onChange={(e) => setEditingSubtaskTitle(e.target.value)}
                                                        className="flex-1 text-xs px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                                    />
                                                    <button
                                                        onClick={() => handleSaveEditedSubtask(s.id)}
                                                        className="px-2 py-1 bg-blue-600 text-white rounded text-[11px] font-bold"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingSubtaskId(null)}
                                                        className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[11px]"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <span
                                                    className={`text-xs font-medium flex-1 ${
                                                        s.status === "DONE"
                                                            ? "line-through text-slate-400 dark:text-slate-500"
                                                            : "text-slate-800 dark:text-slate-200"
                                                    }`}
                                                >
                                                    {s.title}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center space-x-2">
                                            <span
                                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${STATUS_STYLES[s.status]}`}
                                            >
                                                {STATUS_LABELS[s.status]}
                                            </span>
                                            <button
                                                onClick={() => {
                                                    setEditingSubtaskId(s.id);
                                                    setEditingSubtaskTitle(s.title);
                                                }}
                                                className="p-1 text-slate-400 hover:text-blue-600 rounded transition"
                                                title="Edit subtask"
                                            >
                                                <Edit2 size={13} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteSubtask(s.id)}
                                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                                                title="Delete subtask"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {subtasks.length === 0 && !subLoading && (
                                    <p className="text-xs text-slate-400 text-center py-6">
                                        No subtasks yet. Add one below.
                                    </p>
                                )}
                            </div>

                            {/* Create subtask form */}
                            <form onSubmit={handleAddSubtask} className="flex gap-2 pt-2">
                                <input
                                    type="text"
                                    placeholder="Add new subtask title..."
                                    value={newSubtaskTitle}
                                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                    className="flex-1 text-xs px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                />
                                <button
                                    type="submit"
                                    disabled={submittingSubtask || !newSubtaskTitle.trim()}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition flex items-center space-x-1"
                                >
                                    {submittingSubtask && <Loader2 size={13} className="animate-spin" />}
                                    <Plus size={14} />
                                    <span>Add Subtask</span>
                                </button>
                            </form>
                        </div>
                    )}

                    {/* TAB 3: DEPENDENCIES */}
                    {activeTab === "dependencies" && (
                        <div className="space-y-4">
                            <p className="text-xs text-slate-500">
                                Link blocker and dependent tasks. Cycle detection is enforced by BE-2.
                            </p>

                            {/* Error state */}
                            {dependenciesError && (
                                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400 flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <AlertCircle size={14} className="shrink-0" />
                                        <span>{dependenciesError}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSubLoading(true);
                                            setDependenciesError(null);
                                            fetchTaskDependencies(task.id)
                                                .then((data) => setDependencies(Array.isArray(data) ? data : []))
                                                .catch((err) => {
                                                    setDependenciesError(
                                                        err instanceof Error
                                                            ? err.message
                                                            : "Failed to load dependencies."
                                                    );
                                                })
                                                .finally(() => setSubLoading(false));
                                        }}
                                        className="text-[11px] font-bold underline hover:no-underline ml-2"
                                    >
                                        Retry
                                    </button>
                                </div>
                            )}

                            {/* Loading state */}
                            {subLoading && (
                                <div className="flex items-center justify-center py-8 text-slate-400 space-x-2">
                                    <Loader2 size={16} className="animate-spin text-blue-500" />
                                    <span className="text-xs">Loading dependencies...</span>
                                </div>
                            )}

                            {/* Dependencies list */}
                            {!subLoading && (
                                <div className="space-y-2">
                                    {(Array.isArray(dependencies) ? dependencies : []).map((dep) => {
                                        const linkedTask = allTasks.find((t) => t.id === dep.dependencyId) || dep.task;
                                        const isBlocker = dep.direction !== "DEPENDED_ON_BY";
                                        return (
                                            <div
                                                key={dep.id}
                                                className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 text-xs flex justify-between items-center"
                                            >
                                                <div className="flex items-center space-x-2.5">
                                                    <Network size={15} className="text-amber-500" />
                                                    <div>
                                                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                            {isBlocker ? "Depends on: " : "Depended on by: "}
                                                            <span className="font-mono text-blue-600 dark:text-blue-400">
                                                                {linkedTask ? linkedTask.title : dep.dependencyId}
                                                            </span>
                                                        </span>
                                                        {linkedTask?.status && (
                                                            <span className="ml-2 text-[10px] text-slate-400">
                                                                ({linkedTask.status})
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-3">
                                                    <span className="text-[10px] text-slate-400">
                                                        {new Date(dep.createdAt).toLocaleDateString()}
                                                    </span>
                                                    <button
                                                        onClick={() => handleDeleteDependency(dep)}
                                                        className="p-1 text-slate-400 hover:text-rose-600 transition"
                                                        title="Remove dependency"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {(Array.isArray(dependencies) ? dependencies.length : 0) === 0 &&
                                        !dependenciesError && (
                                            <p className="text-xs text-slate-400 text-center py-6">
                                                No dependencies linked to this task.
                                            </p>
                                        )}
                                </div>
                            )}

                            {/* Add Dependency form */}
                            <form onSubmit={handleAddDependency} className="space-y-2 pt-2">
                                <div className="flex gap-2">
                                    {dependencyCandidates.length > 0 ? (
                                        <select
                                            value={newDepId}
                                            onChange={(e) => setNewDepId(e.target.value)}
                                            className="flex-1 text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                        >
                                            <option value="">Select task to depend on...</option>
                                            {dependencyCandidates.map((t) => (
                                                <option key={t.id} value={t.id}>
                                                    TASK-{t.id.slice(-4).toUpperCase()}: {t.title}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            placeholder="Task ID to depend on (e.g. task_xyz)..."
                                            value={newDepId}
                                            onChange={(e) => setNewDepId(e.target.value)}
                                            className="flex-1 text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                        />
                                    )}
                                    <button
                                        type="submit"
                                        disabled={submittingDep || !newDepId.trim()}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition flex items-center space-x-1"
                                    >
                                        {submittingDep && <Loader2 size={13} className="animate-spin" />}
                                        <span>Link Blocker</span>
                                    </button>
                                </div>
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
                                        className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2 group"
                                    >
                                        <div className="flex items-center justify-between text-[11px]">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 flex items-center justify-center text-[9px] font-bold">
                                                    {(c.author?.name || "U").slice(0, 1).toUpperCase()}
                                                </div>
                                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                                    {c.author?.name || "Team Member"}
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <span className="text-slate-400 text-[10px]">
                                                    {new Date(c.createdAt).toLocaleString("en-US", {
                                                        month: "short",
                                                        day: "numeric",
                                                        hour: "numeric",
                                                        minute: "2-digit",
                                                    })}
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        setEditingCommentId(c.id);
                                                        setEditingCommentText(c.content);
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-600 rounded transition"
                                                    title="Edit comment"
                                                >
                                                    <Edit2 size={12} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteComment(c.id)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded transition"
                                                    title="Delete comment"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </div>

                                        {editingCommentId === c.id ? (
                                            <div className="space-y-2 pt-1">
                                                <textarea
                                                    rows={2}
                                                    value={editingCommentText}
                                                    onChange={(e) => setEditingCommentText(e.target.value)}
                                                    className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 resize-none"
                                                />
                                                <div className="flex justify-end space-x-2">
                                                    <button
                                                        onClick={() => setEditingCommentId(null)}
                                                        className="px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={() => handleSaveEditedComment(c.id)}
                                                        className="px-3 py-1 bg-blue-600 text-white text-[11px] font-bold rounded-lg hover:bg-blue-700"
                                                    >
                                                        Save
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                                {c.content}
                                            </p>
                                        )}
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
                                    {submittingComment && <Loader2 size={13} className="animate-spin" />}
                                    <Send size={13} />
                                    <span>Send</span>
                                </button>
                            </form>
                        </div>
                    )}

                    {/* TAB 5: ACTIVITY TIMELINE */}
                    {activeTab === "activity" && (
                        <div className="space-y-4">
                            {/* Activity Type Filter */}
                            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[11px] font-semibold">
                                {[
                                    { key: "ALL", label: "All Events" },
                                    { key: "STATUS_CHANGED", label: "Status" },
                                    { key: "COMMENT_ADDED", label: "Comments" },
                                    { key: "SUBTASK_CREATED", label: "Subtasks" },
                                    { key: "DEPENDENCY_ADDED", label: "Dependencies" },
                                ].map((item) => (
                                    <button
                                        key={item.key}
                                        onClick={() => setActivityFilter(item.key)}
                                        className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                                            activityFilter === item.key
                                                ? "bg-blue-600 text-white font-bold"
                                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>

                            {/* Timeline items */}
                            <div className="relative pl-6 border-l-2 border-slate-100 dark:border-slate-800 space-y-4 pt-1">
                                {activities.map((act) => (
                                    <div key={act.id} className="relative space-y-1">
                                        <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-blue-500 ring-4 ring-white dark:ring-slate-900" />
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                {act.actor?.name || "System"}
                                            </span>
                                            <span className="text-slate-400 text-[10px]">
                                                {new Date(act.createdAt).toLocaleString("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                    hour: "numeric",
                                                    minute: "2-digit",
                                                })}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-600 dark:text-slate-400">
                                            <strong className="font-semibold text-slate-700 dark:text-slate-300">
                                                {act.type.replace(/_/g, " ").toLowerCase()}
                                            </strong>
                                            {act.oldValue && act.newValue ? (
                                                <span className="font-mono text-[11px] ml-1.5">
                                                    {act.oldValue} → {act.newValue}
                                                </span>
                                            ) : (
                                                act.newValue ? `: ${act.newValue}` : ""
                                            )}
                                        </p>
                                    </div>
                                ))}

                                {activities.length === 0 && !subLoading && (
                                    <p className="text-xs text-slate-400 text-center py-6">
                                        No activity recorded for this task.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Tab 6: Attachments ────────────────────────────────────── */}
                    {activeTab === "attachments" && (
                        <div className="p-6">
                            <AttachmentSection
                                entityType="TASK"
                                entityId={task.id}
                                canManage={true}
                            />
                        </div>
                    )}
                </div>

                {/* ── Footer ─────────────────────────────────────────────────── */}
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 flex justify-between items-center">
                    <span className="text-[11px] text-slate-400 font-mono">
                        TASK ID: {task.id}
                    </span>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-xl text-xs font-bold hover:opacity-90 transition"
                    >
                        Close Drawer
                    </button>
                </div>
            </div>

            {/* Export Modal Dialog */}
            <ExportModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                entityType="TASK"
                entityId={task.id}
                entityName={task.title}
            />
        </div>
    );
}
