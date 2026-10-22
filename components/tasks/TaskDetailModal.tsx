// components/tasks/TaskDetailModal.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
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
    Check,
    Edit2,
    Tag,
    FolderKanban,
    Paperclip,
    Download,
    Building2,
    Users,
    UserCheck,
    ArrowRightLeft,
    ArrowLeft,
    ChevronDown,
    ChevronRight,
    MoreHorizontal,
} from "lucide-react";
import { AttachmentSection } from "@/components/workspace/AttachmentSection";
import { ExportModal } from "@/components/workspace/ExportModal";
import { ReassignTaskModal } from "@/components/tasks/ReassignTaskModal";
import { EffectiveAssignmentResponse } from "@/types/workspaceAssignment";
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
    getTaskAssignmentMap,
    saveTaskAssignment,
} from "@/lib/api/tasksApi";
import { fetchTeamMembers } from "@/lib/api/leadsApi";
import { getProjects, Project } from "@/lib/api/projectsApi";

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

function formatActivityValue(val: string | null | undefined): string | null {
    if (!val) return null;
    const str = String(val).trim();
    if (str.includes("/workspace/pages/")) return "Workspace Page";
    if (/^https?:\/\//i.test(str)) return "Page Link";
    if (/^cm[a-z0-9]{5,}$/i.test(str) || /^cuid[a-z0-9]+$/i.test(str) || /^(task|user|usr|proj|org)_[a-z0-9_]+$/i.test(str)) return null;
    if (str === "USER") return "Individual";
    if (str === "DEPARTMENT") return "Department Queue";
    if (/cm[a-z0-9]{7,}/i.test(str)) {
        const cleaned = str.replace(/cm[a-z0-9]{7,}/gi, "").trim();
        return cleaned || null;
    }
    return str;
}

interface ActivityHelperContext {
    members: TeamMember[];
    task: Task;
    canonicalAssignment: EffectiveAssignmentResponse | null;
    allTasks: Task[];
    projects: Project[];
}

function isRawId(val: string | null | undefined): boolean {
    if (!val) return false;
    const str = String(val).trim();
    return (
        /^cm[a-z0-9]{5,}$/i.test(str) ||
        /^c[a-z0-9]{20,}$/i.test(str) ||
        /^cuid[a-z0-9]+$/i.test(str) ||
        /^(task|user|usr|proj|org|evt|act|sub|dep|lead|deal)_[a-z0-9_]+$/i.test(str) ||
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
    );
}

function getValidActorName(
    actor?: { id?: string; name?: string } | null,
    members?: TeamMember[]
): string | null {
    if (!actor) return null;
    if (actor.name && !isRawId(actor.name)) {
        return actor.name.trim();
    }
    if (actor.id && members && members.length > 0) {
        const found = members.find((m) => m.id === actor.id);
        if (found?.name && !isRawId(found.name)) {
            return found.name.trim();
        }
    }
    return null;
}

function resolveAssigneeOrDepartment(
    idOrValue: string | null | undefined,
    metadata: Record<string, unknown> | null | undefined,
    ctx: ActivityHelperContext,
    isPrevious: boolean
): string | null {
    if (metadata) {
        if (isPrevious) {
            const prevName = metadata.previousAssigneeName || metadata.prevAssigneeName || metadata.oldAssigneeName;
            if (typeof prevName === "string" && prevName.trim() && !isRawId(prevName)) {
                return prevName.trim();
            }
            const prevDept = metadata.previousDepartment || metadata.prevDepartment;
            if (typeof prevDept === "string" && prevDept.trim()) {
                const trimmed = prevDept.trim();
                return trimmed.toLowerCase().includes("department") ? trimmed : `${trimmed} Department`;
            }
        } else {
            const nextName = metadata.newAssigneeName || metadata.targetUserName || metadata.assigneeName || metadata.userName;
            if (typeof nextName === "string" && nextName.trim() && !isRawId(nextName)) {
                return nextName.trim();
            }
            if (metadata.assigneeType === "DEPARTMENT") {
                const dept = metadata.department || metadata.targetDepartment;
                if (typeof dept === "string" && dept.trim()) {
                    const trimmed = dept.trim();
                    return trimmed.toLowerCase().includes("department") ? trimmed : `${trimmed} Department`;
                }
                return "Department Queue";
            }
        }
    }

    if (idOrValue) {
        const strVal = String(idOrValue).trim();
        if (strVal === "DEPARTMENT") {
            const deptFromMeta = metadata?.department || metadata?.targetDepartment || ctx.task.department || ctx.canonicalAssignment?.department;
            if (typeof deptFromMeta === "string" && deptFromMeta.trim()) {
                const trimmed = deptFromMeta.trim();
                return trimmed.toLowerCase().includes("department") ? trimmed : `${trimmed} Department`;
            }
            return "Department Queue";
        }

        const knownDepts = ["engineering", "sales", "marketing", "operations", "support", "product", "hr", "finance", "legal"];
        if (knownDepts.includes(strVal.toLowerCase()) || strVal.toLowerCase().includes("department")) {
            return strVal.toLowerCase().includes("department") ? strVal : `${strVal} Department`;
        }

        const matchedMember = ctx.members.find((m) => m.id === strVal);
        if (matchedMember?.name && !isRawId(matchedMember.name)) {
            return matchedMember.name.trim();
        }

        if (ctx.task.assignedTo?.id === strVal && ctx.task.assignedTo.name && !isRawId(ctx.task.assignedTo.name)) {
            return ctx.task.assignedTo.name.trim();
        }

        if (ctx.canonicalAssignment?.assignedTo?.id === strVal && ctx.canonicalAssignment.assignedTo.name && !isRawId(ctx.canonicalAssignment.assignedTo.name)) {
            return ctx.canonicalAssignment.assignedTo.name.trim();
        }

        const taskMatch = ctx.allTasks.find((t) => t.assignedTo?.id === strVal);
        if (taskMatch?.assignedTo?.name && !isRawId(taskMatch.assignedTo.name)) {
            return taskMatch.assignedTo.name.trim();
        }

        if (!isRawId(strVal) && !strVal.startsWith("http") && !strVal.includes("/")) {
            return strVal;
        }
    }

    const isDeptContext =
        metadata?.assigneeType === "DEPARTMENT" ||
        (!isPrevious && !idOrValue && (metadata?.department || ctx.task.department));

    if (isDeptContext) {
        const dept = (metadata?.department as string) || (metadata?.targetDepartment as string) || ctx.task.department || ctx.canonicalAssignment?.department;
        if (typeof dept === "string" && dept.trim()) {
            const trimmed = dept.trim();
            return trimmed.toLowerCase().includes("department") ? trimmed : `${trimmed} Department`;
        }
        return "Department Queue";
    }

    return null;
}

function formatActivityMessage(act: TaskActivity, ctx: ActivityHelperContext): string {
    const actorName = getValidActorName(act.actor, ctx.members);
    const meta = act.metadata as Record<string, unknown> | null | undefined;
    const isReassign =
        act.type === "TASK_REASSIGNED" ||
        (act.type === "TASK_ASSIGNED" && Boolean(act.oldValue) && Boolean(act.newValue)) ||
        meta?.source === "TASK_REASSIGN" ||
        meta?.source === "MANUAL_REASSIGN";

    const isUnassign =
        act.type === "TASK_UNASSIGNED" ||
        (act.type === "TASK_ASSIGNED" && Boolean(act.oldValue) && !act.newValue);

    if (isReassign) {
        const fromAssignee = resolveAssigneeOrDepartment(act.oldValue, meta, ctx, true);
        const toAssignee = resolveAssigneeOrDepartment(act.newValue, meta, ctx, false);

        if (fromAssignee && toAssignee) {
            return `Task reassigned → ${fromAssignee} → ${toAssignee}`;
        }
        return "Task reassignment updated";
    }

    if (isUnassign) {
        const fromAssignee = resolveAssigneeOrDepartment(act.oldValue, meta, ctx, true);
        if (fromAssignee) {
            return `Task unassigned → ${fromAssignee}`;
        }
        return "Task unassignment updated";
    }

    if (act.type === "TASK_ASSIGNED") {
        const toAssignee = resolveAssigneeOrDepartment(act.newValue, meta, ctx, false);
        if (toAssignee) {
            return `Task assigned → ${toAssignee}`;
        }
        return "Task assignment updated";
    }

    if (act.type === "TASK_CREATED") {
        const title = act.newValue && !isRawId(act.newValue) ? ` "${act.newValue}"` : "";
        return actorName ? `${actorName} created this task${title}` : `Task created${title}`;
    }

    if (act.type === "STATUS_CHANGED") {
        const statusMap: Record<string, string> = {
            TODO: "To Do",
            IN_PROGRESS: "In Progress",
            REVIEW: "Review",
            BLOCKED: "Blocked",
            DONE: "Done",
        };
        const oldStatus = act.oldValue ? statusMap[act.oldValue] || act.oldValue : null;
        const newStatus = act.newValue ? statusMap[act.newValue] || act.newValue : null;
        if (oldStatus && newStatus) {
            return actorName
                ? `${actorName} changed status: ${oldStatus} → ${newStatus}`
                : `Status changed: ${oldStatus} → ${newStatus}`;
        }
        if (newStatus) {
            return actorName
                ? `${actorName} set status to ${newStatus}`
                : `Status set to ${newStatus}`;
        }
        return actorName ? `${actorName} updated task status` : "Status updated";
    }

    if (act.type === "PRIORITY_CHANGED") {
        const priMap: Record<string, string> = {
            LOW: "Low",
            MEDIUM: "Medium",
            HIGH: "High",
        };
        const oldPri = act.oldValue ? priMap[act.oldValue] || act.oldValue : null;
        const newPri = act.newValue ? priMap[act.newValue] || act.newValue : null;
        if (oldPri && newPri) {
            return actorName
                ? `${actorName} changed priority: ${oldPri} → ${newPri}`
                : `Priority changed: ${oldPri} → ${newPri}`;
        }
        if (newPri) {
            return actorName
                ? `${actorName} set priority to ${newPri}`
                : `Priority set to ${newPri}`;
        }
        return actorName ? `${actorName} updated priority` : "Priority updated";
    }

    if (act.type === "DUE_DATE_CHANGED") {
        const formatD = (d?: string | null) => {
            if (!d) return null;
            try {
                return new Date(d).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                });
            } catch {
                return null;
            }
        };
        const oldDate = formatD(act.oldValue);
        const newDate = formatD(act.newValue);
        if (oldDate && newDate) {
            return actorName
                ? `${actorName} changed due date: ${oldDate} → ${newDate}`
                : `Due date changed: ${oldDate} → ${newDate}`;
        }
        if (newDate) {
            return actorName
                ? `${actorName} set due date to ${newDate}`
                : `Due date set to ${newDate}`;
        }
        return actorName ? `${actorName} updated due date` : "Due date updated";
    }

    if (act.type === "COMMENT_ADDED") {
        return actorName ? `${actorName} added a comment` : "Comment added";
    }
    if (act.type === "COMMENT_UPDATED") {
        return actorName ? `${actorName} updated a comment` : "Comment updated";
    }
    if (act.type === "COMMENT_DELETED") {
        return actorName ? `${actorName} deleted a comment` : "Comment deleted";
    }

    if (act.type === "SUBTASK_CREATED") {
        const title = act.newValue && !isRawId(act.newValue) ? `: "${act.newValue}"` : "";
        return actorName ? `${actorName} added subtask${title}` : `Subtask added${title}`;
    }
    if (act.type === "SUBTASK_UPDATED") {
        return actorName ? `${actorName} updated a subtask` : "Subtask updated";
    }
    if (act.type === "SUBTASK_DELETED") {
        return actorName ? `${actorName} deleted a subtask` : "Subtask deleted";
    }

    if (act.type === "DEPENDENCY_ADDED") {
        const depTask = ctx.allTasks.find((t) => t.id === act.newValue || t.id === act.oldValue);
        const depTitle = depTask ? `: "${depTask.title}"` : "";
        return actorName ? `${actorName} linked blocker${depTitle}` : `Blocker linked${depTitle}`;
    }
    if (act.type === "DEPENDENCY_REMOVED") {
        return actorName ? `${actorName} removed dependency` : "Dependency removed";
    }

    const oldFmt = formatActivityValue(act.oldValue);
    const newFmt = formatActivityValue(act.newValue);
    const typeLabel = act.type.replace(/_/g, " ").toLowerCase();
    if (oldFmt && newFmt) {
        return `${typeLabel}: ${oldFmt} → ${newFmt}`;
    }
    if (newFmt) {
        return `${typeLabel}: ${newFmt}`;
    }
    return typeLabel;
}

interface TeamMember {
    id: string;
    name: string;
    role: string;
    email?: string;
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface TaskDetailModalProps {
    task: Task;
    allTasks?: Task[];
    saving: boolean;
    saveError: string | null;
    sourceView?: string;
    onClose: () => void;
    onUpdate: (id: string, data: UpdateTaskPayload) => Promise<boolean>;
    onDelete?: (id: string) => Promise<boolean>;
    onReassigned?: (assignment: EffectiveAssignmentResponse) => void;
    onRefresh?: () => void | Promise<void>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TaskDetailModal({
    task,
    allTasks = [],
    saving,
    saveError,
    sourceView,
    onClose,
    onUpdate,
    onDelete,
    onReassigned,
    onRefresh,
}: TaskDetailModalProps) {
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
    const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);

    // Collapsible sections state (Notion style)
    const [sectionsOpen, setSectionsOpen] = useState({
        subtasks: true,
        attachments: true,
        dependencies: true,
        comments: true,
        activity: false,
    });

    const toggleSection = (section: keyof typeof sectionsOpen) => {
        setSectionsOpen((prev) => ({ ...prev, [section]: !prev[section] }));
    };

    // Canonical assignment state
    const [canonicalAssignment, setCanonicalAssignment] = useState<EffectiveAssignmentResponse | null>(() => {
        if (task.effectiveAssignment) {
            return task.effectiveAssignment;
        }
        const storedMap = getTaskAssignmentMap();
        if (storedMap && storedMap.hasOwnProperty(task.id)) {
            return storedMap[task.id];
        }
        return null;
    });

    const prevTaskIdRef = useRef(task.id);
    const incomingEffectiveAssignment = task.effectiveAssignment;
    useEffect(() => {
        if (prevTaskIdRef.current !== task.id) {
            prevTaskIdRef.current = task.id;
            const storedMap = getTaskAssignmentMap();
            const stored = storedMap && storedMap.hasOwnProperty(task.id) ? storedMap[task.id] : null;
            setCanonicalAssignment(incomingEffectiveAssignment ?? stored ?? null);
        } else if (incomingEffectiveAssignment) {
            setCanonicalAssignment(incomingEffectiveAssignment);
        }
    }, [task.id, incomingEffectiveAssignment]);

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

    // Inline title editing
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleInput, setTitleInput] = useState(task.title);
    const titleInputRef = useRef<HTMLInputElement>(null);

    // Inline description editing
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [descInput, setDescInput] = useState(task.description ?? "");

    const [members, setMembers] = useState<TeamMember[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [localSaveError, setLocalSaveError] = useState<string | null>(null);
    const [newTagInput, setNewTagInput] = useState("");
    const [isAddingTag, setIsAddingTag] = useState(false);

    // Synchronize form when task prop updates and not actively editing
    useEffect(() => {
        if (!isEditingTitle && !isEditingDescription) {
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
            setTitleInput(task.title);
            setDescInput(task.description ?? "");
        }
    }, [task, isEditingTitle, isEditingDescription]);

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

    // Escape key listener for closing modal
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !isExportModalOpen && !isReassignModalOpen) {
                if (isEditingTitle) {
                    setIsEditingTitle(false);
                    setTitleInput(task.title);
                } else if (isEditingDescription) {
                    setIsEditingDescription(false);
                    setDescInput(task.description ?? "");
                } else {
                    onClose();
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose, isExportModalOpen, isReassignModalOpen, isEditingTitle, isEditingDescription, task.title, task.description]);

    // Load team members and projects
    useEffect(() => {
        fetchTeamMembers()
            .then((data) => setMembers(data.members ?? data ?? []))
            .catch(() => setMembers([]));
        getProjects()
            .then((data) => setProjects(Array.isArray(data) ? data : []))
            .catch(() => setProjects([]));
    }, []);

    // Load all sub-resources concurrently on task change for complete Notion-like document view
    useEffect(() => {
        if (!task?.id) return;
        setSubLoading(true);
        Promise.all([
            fetchTaskComments(task.id).then(setComments).catch(() => setComments([])),
            fetchTaskSubtasks(task.id).then(setSubtasks).catch(() => setSubtasks([])),
            fetchTaskDependencies(task.id).then((data) => {
                setDependencies(Array.isArray(data) ? data : []);
            }).catch(() => setDependencies([])),
            fetchTaskActivity(task.id, 1, 30, activityFilter === "ALL" ? undefined : activityFilter).then(setActivities).catch(() => setActivities([])),
        ]).finally(() => setSubLoading(false));
    }, [task.id, activityFilter]);

    // ── Handlers ───────────────────────────────────────────────────────────────

    const handleSaveTitle = async () => {
        const trimmed = titleInput.trim();
        if (!trimmed) {
            setTitleInput(task.title);
            setIsEditingTitle(false);
            return;
        }
        if (trimmed !== task.title) {
            setForm((prev) => ({ ...prev, title: trimmed }));
            await onUpdate(task.id, { title: trimmed });
        }
        setIsEditingTitle(false);
    };

    const handleSaveDescription = async () => {
        const trimmed = descInput;
        if (trimmed !== (task.description ?? "")) {
            setForm((prev) => ({ ...prev, description: trimmed }));
            await onUpdate(task.id, { description: trimmed });
        }
        setIsEditingDescription(false);
    };

    const handleQuickStatusChange = async (newStatus: TaskStatus) => {
        setForm((prev) => ({ ...prev, status: newStatus }));
        await onUpdate(task.id, { status: newStatus });
    };

    const handleQuickPriorityChange = async (newPriority: TaskPriority) => {
        setForm((prev) => ({ ...prev, priority: newPriority }));
        await onUpdate(task.id, { priority: newPriority });
    };

    const handleDueDateChange = async (newDate: string) => {
        const todayStr = new Date().toISOString().split("T")[0];
        if (newDate && newDate < todayStr) {
            setLocalSaveError("Due date cannot be in the past. Please select today or a future date.");
            return;
        }
        setLocalSaveError(null);
        setForm((prev) => ({ ...prev, dueDate: newDate }));
        await onUpdate(task.id, { dueDate: newDate ? newDate : null });
    };

    const handleProjectChange = async (newProjectId: string) => {
        setForm((prev) => ({ ...prev, projectId: newProjectId }));
        await onUpdate(task.id, { projectId: newProjectId ? newProjectId.trim() : null });
    };

    const handleAddLabel = async () => {
        const trimmed = newTagInput.trim();
        if (trimmed && !form.labels?.includes(trimmed)) {
            const updated = [...(form.labels ?? []), trimmed];
            setForm((prev) => ({ ...prev, labels: updated }));
            saveTaskLabels(task.id, updated);
            setNewTagInput("");
            setIsAddingTag(false);
            await onUpdate(task.id, { labels: updated });
        }
    };

    const handleRemoveLabel = async (tagToRemove: string) => {
        const updated = (form.labels ?? []).filter((t) => t !== tagToRemove);
        setForm((prev) => ({ ...prev, labels: updated }));
        saveTaskLabels(task.id, updated);
        await onUpdate(task.id, { labels: updated });
    };

    const handleReassignSuccess = (updatedAssignment: EffectiveAssignmentResponse) => {
        saveTaskAssignment(task.id, updatedAssignment);
        setCanonicalAssignment(updatedAssignment);
        if (updatedAssignment.assignedTo) {
            setForm((prev) => ({ ...prev, assignedToId: updatedAssignment.assignedTo?.id ?? "" }));
        } else {
            setForm((prev) => ({ ...prev, assignedToId: "" }));
        }
        fetchTaskActivity(task.id, 1, 30, activityFilter === "ALL" ? undefined : activityFilter)
            .then(setActivities)
            .catch(() => {});
        if (onReassigned) onReassigned(updatedAssignment);
        if (onRefresh) onRefresh();
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
    const dependencyCandidates = allTasks.filter((t) => t.id !== task.id);

    // Derived assignment display
    const department = canonicalAssignment?.department ?? task.department ?? null;
    const effectiveAssigneeType =
        canonicalAssignment?.assigneeType ??
        task.assigneeType ??
        (department && !task.assignedTo ? "DEPARTMENT" : (task.assignedTo ? "USER" : null));
    const hasIndividualAssignee = Boolean(canonicalAssignment?.assignedTo || task.assignedTo);
    const isDeptQueue = effectiveAssigneeType === "DEPARTMENT" && !hasIndividualAssignee;
    let displayAssigneeName = "Unassigned";
    if (isDeptQueue) {
        displayAssigneeName = department ? `${department} Queue` : "Department Queue";
    } else if (canonicalAssignment?.assignedTo?.name) {
        displayAssigneeName = canonicalAssignment.assignedTo.name;
    } else if (task.assignedTo?.name) {
        displayAssigneeName = task.assignedTo.name;
    }

    const assignmentTypeLabel =
        effectiveAssigneeType === "DEPARTMENT"
            ? "Department Queue"
            : effectiveAssigneeType === "USER"
            ? "Individual"
            : null;

    const sourcePageTitle =
        canonicalAssignment?.pageContext?.pageTitle ||
        (task as any).pageTitle ||
        (task as any).page?.title ||
        null;

    const sourcePageId =
        canonicalAssignment?.pageContext?.pageId ||
        (task as any).pageId ||
        (task as any).page?.id ||
        null;

    const matchedProject = projects.find((p) => p.id === (form.projectId || task.projectId));
    const displayProjectName =
        matchedProject?.name ||
        (task as any).projectName ||
        (task as any).project?.name ||
        (task.projectId && !task.projectId.startsWith("cm") && !task.projectId.startsWith("proj_")
            ? String(task.projectId)
            : null);

    return (
        <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col">
            {/* ── Top Header Navigation Bar (non-sticky, natural scrolling) ───────────────────────────────── */}
            <div className="px-6 sm:px-10 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    {/* Left: Back button & Breadcrumbs */}
                    <div className="flex items-center space-x-3 overflow-hidden">
                        <button
                            onClick={onClose}
                            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
                            title="Back to tasks"
                        >
                            <ArrowLeft size={14} />
                            <span>Back</span>
                        </button>

                        <div className="hidden sm:flex items-center space-x-2 text-xs font-medium text-slate-400 dark:text-slate-500 truncate">
                            <span className="text-slate-300 dark:text-slate-700">/</span>
                            <Link
                                href="/workspace"
                                className="hover:text-slate-700 dark:hover:text-slate-300 transition shrink-0"
                            >
                                Workspace
                            </Link>
                            <span className="text-slate-300 dark:text-slate-700">/</span>
                            <button
                                onClick={onClose}
                                className="hover:text-slate-700 dark:hover:text-slate-300 transition shrink-0"
                            >
                                {sourceView || "Tasks"}
                            </button>
                            <span className="text-slate-300 dark:text-slate-700">/</span>
                            <span className="text-slate-700 dark:text-slate-300 font-semibold truncate max-w-[200px]">
                                {task.title}
                            </span>
                        </div>
                    </div>

                    {/* Right: Contextual Actions & Close */}
                    <div className="flex items-center space-x-2">
                        {/* Contextual Options Menu */}
                        <div className="relative">
                            <button
                                onClick={() => setIsActionsMenuOpen(!isActionsMenuOpen)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                                title="More options"
                            >
                                <MoreHorizontal size={18} />
                            </button>

                            {isActionsMenuOpen && (
                                <div
                                    className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-30 animate-in fade-in duration-150"
                                    onClick={() => setIsActionsMenuOpen(false)}
                                >
                                    <button
                                        onClick={() => setIsReassignModalOpen(true)}
                                        className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition"
                                    >
                                        <ArrowRightLeft size={14} className="text-indigo-500" />
                                        <span>Reassign Task</span>
                                    </button>

                                    <button
                                        onClick={() => setIsExportModalOpen(true)}
                                        className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition"
                                    >
                                        <Download size={14} className="text-blue-500" />
                                        <span>Export Task</span>
                                    </button>

                                    {onDelete && (
                                        <>
                                            <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setConfirmDelete(true);
                                                    setIsActionsMenuOpen(false);
                                                }}
                                                className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                            >
                                                <Trash2 size={14} />
                                                <span>Delete Task</span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Inline Delete Confirmation Dialog */}
                        {confirmDelete && (
                            <div className="flex items-center space-x-2 bg-rose-50 dark:bg-rose-950/60 p-1.5 rounded-lg border border-rose-200 dark:border-rose-900">
                                <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 px-1">
                                    Delete this task?
                                </span>
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="px-2.5 py-1 bg-rose-600 text-white rounded text-[11px] font-bold hover:bg-rose-700 transition"
                                >
                                    {deleting ? "Deleting..." : "Yes, Delete"}
                                </button>
                                <button
                                    onClick={() => setConfirmDelete(false)}
                                    className="px-2.5 py-1 bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded text-[11px] font-bold"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                            title="Close (Esc)"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Error Banner */}
                {(saveError || localSaveError) && (
                    <div className="mx-6 sm:mx-10 mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center justify-between text-rose-600 dark:text-rose-400 text-xs font-medium">
                        <div className="flex items-center space-x-2">
                            <AlertCircle size={15} className="shrink-0" />
                            <span>{saveError || localSaveError}</span>
                        </div>
                        <button
                            onClick={() => setLocalSaveError(null)}
                            className="text-xs font-bold hover:underline"
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                {/* ── Notion Document Body ───────────────────────────────────── */}
                <div className="px-6 sm:px-12 md:px-16 py-8 sm:py-10 space-y-8 flex-1">
                    {/* 1. Large Content-First Task Heading */}
                    <div className="space-y-1">
                        {isEditingTitle ? (
                            <div className="relative">
                                <input
                                    ref={titleInputRef}
                                    type="text"
                                    value={titleInput}
                                    onChange={(e) => setTitleInput(e.target.value)}
                                    onBlur={handleSaveTitle}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleSaveTitle();
                                        if (e.key === "Escape") {
                                            setTitleInput(task.title);
                                            setIsEditingTitle(false);
                                        }
                                    }}
                                    autoFocus
                                    className="w-full text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white bg-transparent border-b-2 border-blue-500 outline-none pb-1 tracking-tight"
                                    placeholder="Task title..."
                                />
                                <span className="absolute right-0 -bottom-5 text-[10px] text-slate-400">
                                    Press Enter or click away to save
                                </span>
                            </div>
                        ) : (
                            <div className="group flex items-start justify-between gap-3">
                                <h1
                                    onClick={() => setIsEditingTitle(true)}
                                    className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl -ml-2 p-2 cursor-text transition leading-tight flex-1"
                                    title="Click to edit title"
                                >
                                    {form.title || task.title}
                                </h1>
                                <button
                                    onClick={() => setIsEditingTitle(true)}
                                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-blue-600 rounded-lg transition shrink-0"
                                    title="Edit title"
                                >
                                    <Edit2 size={16} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* 2. Compact 2-Column Notion Property List */}
                    <div className="grid grid-cols-[130px_1fr] sm:grid-cols-[160px_1fr] gap-y-3.5 gap-x-4 items-center text-sm py-4 border-y border-slate-100 dark:border-slate-800">
                        {/* Status */}
                        <div className="flex items-center space-x-2 text-xs font-medium text-slate-400 dark:text-slate-500">
                            <Circle size={14} className="text-slate-400" />
                            <span>Status</span>
                        </div>
                        <div>
                            <select
                                value={task.status}
                                onChange={(e) => handleQuickStatusChange(e.target.value as TaskStatus)}
                                className={`text-xs font-semibold px-2.5 py-1 rounded-lg outline-none cursor-pointer border transition ${STATUS_STYLES[task.status]}`}
                            >
                                <option value="TODO">To Do</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="REVIEW">Review</option>
                                <option value="BLOCKED">Blocked</option>
                                <option value="DONE">Done</option>
                            </select>
                        </div>

                        {/* Priority */}
                        <div className="flex items-center space-x-2 text-xs font-medium text-slate-400 dark:text-slate-500">
                            <Flag size={14} className="text-slate-400" />
                            <span>Priority</span>
                        </div>
                        <div>
                            <select
                                value={task.priority}
                                onChange={(e) => handleQuickPriorityChange(e.target.value as TaskPriority)}
                                className={`text-xs font-semibold px-2.5 py-1 rounded-lg outline-none cursor-pointer border transition ${PRIORITY_STYLES[task.priority]}`}
                            >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                            </select>
                        </div>

                        {/* Assignee */}
                        <div className="flex items-center space-x-2 text-xs font-medium text-slate-400 dark:text-slate-500">
                            <User size={14} className="text-slate-400" />
                            <span>Assignee</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center space-x-2 py-1 px-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/60 dark:border-slate-700/60 text-xs font-semibold text-slate-800 dark:text-slate-200">
                                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                                    {displayAssigneeName && displayAssigneeName !== "Unassigned" ? (
                                        displayAssigneeName.slice(0, 2).toUpperCase()
                                    ) : (
                                        <User size={11} />
                                    )}
                                </div>
                                <span className="truncate max-w-[180px]">{displayAssigneeName}</span>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsReassignModalOpen(true)}
                                className="inline-flex items-center space-x-1 px-2 py-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition"
                                title="Reassign task"
                            >
                                <ArrowRightLeft size={11} />
                                <span>Reassign</span>
                            </button>

                            {department && (
                                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                    in {department}
                                </span>
                            )}

                            {sourcePageId && (
                                <div className="flex items-center space-x-1 text-[11px] text-slate-500 dark:text-slate-400 ml-1">
                                    <FileText size={11} className="text-purple-500" />
                                    <Link
                                        href={`/workspace/pages/${sourcePageId}`}
                                        className="text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                        {sourcePageTitle || "Document"}
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Due Date */}
                        <div className="flex items-center space-x-2 text-xs font-medium text-slate-400 dark:text-slate-500">
                            <Calendar size={14} className="text-slate-400" />
                            <span>Due date</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <input
                                type="date"
                                name="dueDate"
                                value={form.dueDate ?? ""}
                                onChange={(e) => handleDueDateChange(e.target.value)}
                                className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 cursor-pointer"
                            />
                            {task.dueDate && (
                                <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
                                    (
                                    {new Date(task.dueDate).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                    })}
                                    )
                                </span>
                            )}
                        </div>

                        {/* Project */}
                        <div className="flex items-center space-x-2 text-xs font-medium text-slate-400 dark:text-slate-500">
                            <FolderKanban size={14} className="text-slate-400" />
                            <span>Project</span>
                        </div>
                        <div>
                            <select
                                value={form.projectId ?? ""}
                                onChange={(e) => handleProjectChange(e.target.value)}
                                className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 cursor-pointer max-w-xs"
                            >
                                <option value="">General Workspace (No Project)</option>
                                {projects.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name}
                                    </option>
                                ))}
                                {form.projectId && !projects.some((p) => p.id === form.projectId) && (
                                    <option value={form.projectId}>
                                        {displayProjectName || "Selected Project"}
                                    </option>
                                )}
                            </select>
                        </div>

                        {/* Labels / Tags */}
                        <div className="flex items-center space-x-2 text-xs font-medium text-slate-400 dark:text-slate-500">
                            <Tag size={14} className="text-slate-400" />
                            <span>Labels</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                            {form.labels && form.labels.length > 0 ? (
                                form.labels.map((lbl) => (
                                    <span
                                        key={lbl}
                                        className="inline-flex items-center space-x-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900 rounded-md text-xs font-medium"
                                    >
                                        <span>#{lbl}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveLabel(lbl)}
                                            className="hover:text-rose-500 transition ml-0.5"
                                        >
                                            <X size={10} />
                                        </button>
                                    </span>
                                ))
                            ) : null}

                            {isAddingTag ? (
                                <div className="inline-flex items-center space-x-1">
                                    <input
                                        type="text"
                                        value={newTagInput}
                                        onChange={(e) => setNewTagInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleAddLabel();
                                            }
                                            if (e.key === "Escape") {
                                                setIsAddingTag(false);
                                                setNewTagInput("");
                                            }
                                        }}
                                        autoFocus
                                        placeholder="Tag name..."
                                        className="text-xs px-2 py-0.5 border border-blue-400 rounded-md outline-none w-28 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddLabel}
                                        className="px-2 py-0.5 bg-blue-600 text-white rounded text-[11px] font-bold"
                                    >
                                        Add
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsAddingTag(false)}
                                        className="text-slate-400 hover:text-slate-600 text-xs px-1"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setIsAddingTag(true)}
                                    className="inline-flex items-center space-x-1 px-2 py-0.5 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border border-dashed border-slate-200 dark:border-slate-700 hover:border-slate-400 rounded-md transition"
                                >
                                    <Plus size={11} />
                                    <span>Add tag</span>
                                </button>
                            )}
                        </div>

                        {/* Created At */}
                        <div className="flex items-center space-x-2 text-xs font-medium text-slate-400 dark:text-slate-500">
                            <Clock size={14} className="text-slate-400" />
                            <span>Created</span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(task.createdAt).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                            })}
                        </div>
                    </div>

                    {/* 3. Description & Content-First Body */}
                    <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Description
                            </h2>
                            {!isEditingDescription && (
                                <button
                                    onClick={() => setIsEditingDescription(true)}
                                    className="inline-flex items-center space-x-1 text-xs text-slate-400 hover:text-blue-600 transition"
                                >
                                    <Edit2 size={12} />
                                    <span>Edit</span>
                                </button>
                            )}
                        </div>

                        {isEditingDescription ? (
                            <div className="space-y-2">
                                <textarea
                                    value={descInput}
                                    onChange={(e) => setDescInput(e.target.value)}
                                    placeholder="Write a description, acceptance criteria, or notes..."
                                    rows={5}
                                    autoFocus
                                    className="w-full text-base p-3.5 border border-blue-500/80 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-slate-800 text-slate-900 dark:text-white leading-relaxed resize-y"
                                />
                                <div className="flex items-center justify-end space-x-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDescInput(task.description ?? "");
                                            setIsEditingDescription(false);
                                        }}
                                        className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSaveDescription}
                                        disabled={saving}
                                        className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition"
                                    >
                                        {saving ? "Saving..." : "Save Description"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div
                                onClick={() => setIsEditingDescription(true)}
                                className="group cursor-text p-3 -ml-3 rounded-xl hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                                title="Click to edit description"
                            >
                                {task.description?.trim() ? (
                                    <p className="text-base text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                                        {task.description}
                                    </p>
                                ) : (
                                    <p className="text-base text-slate-400 dark:text-slate-500 italic">
                                        Write a description, acceptance criteria, or notes... (click to add)
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── Secondary Information Sections (Sequential, Notion-like) ──── */}
                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-6">
                        {/* Section A: Subtasks */}
                        <div className="space-y-3">
                            <button
                                onClick={() => toggleSection("subtasks")}
                                className="w-full flex items-center justify-between text-left py-1 group"
                            >
                                <div className="flex items-center space-x-2">
                                    {sectionsOpen.subtasks ? (
                                        <ChevronDown size={16} className="text-slate-400" />
                                    ) : (
                                        <ChevronRight size={16} className="text-slate-400" />
                                    )}
                                    <ListTree size={16} className="text-blue-500" />
                                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                        Subtasks
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                        {completedSubtasksCount} / {subtasks.length}
                                    </span>
                                </div>
                            </button>

                            {sectionsOpen.subtasks && (
                                <div className="pl-6 space-y-3 pt-1">
                                    {/* Progress bar */}
                                    {subtasks.length > 0 && (
                                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-600 transition-all duration-300"
                                                style={{
                                                    width: `${(completedSubtasksCount / subtasks.length) * 100}%`,
                                                }}
                                            />
                                        </div>
                                    )}

                                    {/* Subtask items */}
                                    <div className="space-y-1.5">
                                        {subtasks.map((s) => (
                                            <div
                                                key={s.id}
                                                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 group transition"
                                            >
                                                <div className="flex items-center space-x-3 flex-1 mr-2">
                                                    <button
                                                        onClick={() => handleToggleSubtask(s)}
                                                        className={`w-4 h-4 rounded border flex items-center justify-center transition ${
                                                            s.status === "DONE"
                                                                ? "bg-emerald-500 border-emerald-500 text-white"
                                                                : "border-slate-300 dark:border-slate-600 hover:border-emerald-500"
                                                        }`}
                                                    >
                                                        {s.status === "DONE" && <Check size={11} />}
                                                    </button>

                                                    {editingSubtaskId === s.id ? (
                                                        <div className="flex items-center space-x-2 flex-1">
                                                            <input
                                                                value={editingSubtaskTitle}
                                                                onChange={(e) => setEditingSubtaskTitle(e.target.value)}
                                                                className="flex-1 text-xs px-2 py-1 border border-blue-400 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
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
                                                            className={`text-xs flex-1 ${
                                                                s.status === "DONE"
                                                                    ? "line-through text-slate-400 dark:text-slate-500"
                                                                    : "text-slate-800 dark:text-slate-200"
                                                            }`}
                                                        >
                                                            {s.title}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition">
                                                    <button
                                                        onClick={() => {
                                                            setEditingSubtaskId(s.id);
                                                            setEditingSubtaskTitle(s.title);
                                                        }}
                                                        className="p-1 text-slate-400 hover:text-blue-600 rounded transition"
                                                        title="Edit subtask"
                                                    >
                                                        <Edit2 size={12} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteSubtask(s.id)}
                                                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                                                        title="Delete subtask"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                        {subtasks.length === 0 && (
                                            <p className="text-xs text-slate-400 italic py-1">
                                                No subtasks yet. Add one below.
                                            </p>
                                        )}
                                    </div>

                                    {/* Add subtask form */}
                                    <form onSubmit={handleAddSubtask} className="flex gap-2 pt-1 max-w-md">
                                        <input
                                            type="text"
                                            placeholder="Add a new subtask..."
                                            value={newSubtaskTitle}
                                            onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                            className="flex-1 text-xs px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                        />
                                        <button
                                            type="submit"
                                            disabled={submittingSubtask || !newSubtaskTitle.trim()}
                                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition flex items-center space-x-1"
                                        >
                                            {submittingSubtask ? (
                                                <Loader2 size={12} className="animate-spin" />
                                            ) : (
                                                <Plus size={12} />
                                            )}
                                            <span>Add</span>
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>

                        {/* Section B: Attachments */}
                        <div className="space-y-3">
                            <button
                                onClick={() => toggleSection("attachments")}
                                className="w-full flex items-center justify-between text-left py-1 group"
                            >
                                <div className="flex items-center space-x-2">
                                    {sectionsOpen.attachments ? (
                                        <ChevronDown size={16} className="text-slate-400" />
                                    ) : (
                                        <ChevronRight size={16} className="text-slate-400" />
                                    )}
                                    <Paperclip size={16} className="text-amber-500" />
                                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                        Attachments
                                    </span>
                                </div>
                            </button>

                            {sectionsOpen.attachments && (
                                <div className="pl-6 pt-1">
                                    <AttachmentSection
                                        entityType="TASK"
                                        entityId={task.id}
                                        canManage={true}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Section C: Dependencies */}
                        <div className="space-y-3">
                            <button
                                onClick={() => toggleSection("dependencies")}
                                className="w-full flex items-center justify-between text-left py-1 group"
                            >
                                <div className="flex items-center space-x-2">
                                    {sectionsOpen.dependencies ? (
                                        <ChevronDown size={16} className="text-slate-400" />
                                    ) : (
                                        <ChevronRight size={16} className="text-slate-400" />
                                    )}
                                    <Network size={16} className="text-purple-500" />
                                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                        Dependencies
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                        {Array.isArray(dependencies) ? dependencies.length : 0}
                                    </span>
                                </div>
                            </button>

                            {sectionsOpen.dependencies && (
                                <div className="pl-6 space-y-3 pt-1">
                                    {/* Error */}
                                    {dependenciesError && (
                                        <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400 flex items-center justify-between">
                                            <span>{dependenciesError}</span>
                                            <button
                                                type="button"
                                                onClick={() => setDependenciesError(null)}
                                                className="text-[11px] font-bold underline ml-2"
                                            >
                                                Dismiss
                                            </button>
                                        </div>
                                    )}

                                    {/* List */}
                                    <div className="space-y-1.5">
                                        {(Array.isArray(dependencies) ? dependencies : []).map((dep) => {
                                            const linkedTask = allTasks.find((t) => t.id === dep.dependencyId) || dep.task;
                                            const isBlocker = dep.direction !== "DEPENDED_ON_BY";
                                            return (
                                                <div
                                                    key={dep.id}
                                                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs"
                                                >
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-slate-400">
                                                            {isBlocker ? "Depends on:" : "Depended on by:"}
                                                        </span>
                                                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                                                            {linkedTask ? linkedTask.title : "Linked Task"}
                                                        </span>
                                                        {linkedTask?.status && (
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                                                {linkedTask.status}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <button
                                                        onClick={() => handleDeleteDependency(dep)}
                                                        className="p-1 text-slate-400 hover:text-rose-600 transition"
                                                        title="Remove dependency"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            );
                                        })}

                                        {(Array.isArray(dependencies) ? dependencies.length : 0) === 0 && (
                                            <p className="text-xs text-slate-400 italic py-1">
                                                No dependencies linked to this task.
                                            </p>
                                        )}
                                    </div>

                                    {/* Add dependency form */}
                                    <form onSubmit={handleAddDependency} className="flex gap-2 pt-1 max-w-md">
                                        {dependencyCandidates.length > 0 ? (
                                            <select
                                                value={newDepId}
                                                onChange={(e) => setNewDepId(e.target.value)}
                                                className="flex-1 text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                            >
                                                <option value="">Select task to depend on...</option>
                                                {dependencyCandidates.map((t) => (
                                                    <option key={t.id} value={t.id}>
                                                        {t.title}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                type="text"
                                                placeholder="Enter task ID to depend on..."
                                                value={newDepId}
                                                onChange={(e) => setNewDepId(e.target.value)}
                                                className="flex-1 text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                            />
                                        )}
                                        <button
                                            type="submit"
                                            disabled={submittingDep || !newDepId.trim()}
                                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition"
                                        >
                                            {submittingDep ? "Linking..." : "Link Blocker"}
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>

                        {/* Section D: Comments & Discussion */}
                        <div className="space-y-3">
                            <button
                                onClick={() => toggleSection("comments")}
                                className="w-full flex items-center justify-between text-left py-1 group"
                            >
                                <div className="flex items-center space-x-2">
                                    {sectionsOpen.comments ? (
                                        <ChevronDown size={16} className="text-slate-400" />
                                    ) : (
                                        <ChevronRight size={16} className="text-slate-400" />
                                    )}
                                    <MessageSquare size={16} className="text-emerald-500" />
                                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                        Discussion & Comments
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                        {comments.length}
                                    </span>
                                </div>
                            </button>

                            {sectionsOpen.comments && (
                                <div className="pl-6 space-y-4 pt-1">
                                    {/* Comments list */}
                                    <div className="space-y-3">
                                        {comments.map((c) => (
                                            <div
                                                key={c.id}
                                                className="p-3.5 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2 group"
                                            >
                                                <div className="flex items-center justify-between text-[11px]">
                                                    <div className="flex items-center space-x-2">
                                                        <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 flex items-center justify-center text-[9px] font-bold">
                                                            {(c.author?.name || "U").slice(0, 1).toUpperCase()}
                                                        </div>
                                                        <span className="font-bold text-slate-800 dark:text-slate-200">
                                                            {c.author?.name || "Team Member"}
                                                        </span>
                                                        <span className="text-slate-400 text-[10px]">
                                                            {new Date(c.createdAt).toLocaleString("en-US", {
                                                                month: "short",
                                                                day: "numeric",
                                                                hour: "numeric",
                                                                minute: "2-digit",
                                                            })}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition">
                                                        <button
                                                            onClick={() => {
                                                                setEditingCommentId(c.id);
                                                                setEditingCommentText(c.content);
                                                            }}
                                                            className="p-1 text-slate-400 hover:text-blue-600 rounded transition"
                                                            title="Edit comment"
                                                        >
                                                            <Edit2 size={12} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteComment(c.id)}
                                                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
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
                                                            className="w-full text-xs p-2 border border-blue-400 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none resize-none"
                                                        />
                                                        <div className="flex justify-end space-x-2">
                                                            <button
                                                                onClick={() => setEditingCommentId(null)}
                                                                className="px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-lg"
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
                                                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap pl-7">
                                                        {c.content}
                                                    </p>
                                                )}
                                            </div>
                                        ))}

                                        {comments.length === 0 && (
                                            <p className="text-xs text-slate-400 italic py-1">
                                                No comments yet. Leave a note below.
                                            </p>
                                        )}
                                    </div>

                                    {/* Comment input form */}
                                    <form onSubmit={handleAddComment} className="flex gap-2 pt-1">
                                        <input
                                            type="text"
                                            placeholder="Write a comment..."
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            className="flex-1 text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                        />
                                        <button
                                            type="submit"
                                            disabled={submittingComment || !newComment.trim()}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition flex items-center space-x-1"
                                        >
                                            {submittingComment ? (
                                                <Loader2 size={13} className="animate-spin" />
                                            ) : (
                                                <Send size={13} />
                                            )}
                                            <span>Send</span>
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>

                        {/* Section E: Activity Timeline */}
                        <div className="space-y-3">
                            <button
                                onClick={() => toggleSection("activity")}
                                className="w-full flex items-center justify-between text-left py-1 group"
                            >
                                <div className="flex items-center space-x-2">
                                    {sectionsOpen.activity ? (
                                        <ChevronDown size={16} className="text-slate-400" />
                                    ) : (
                                        <ChevronRight size={16} className="text-slate-400" />
                                    )}
                                    <History size={16} className="text-slate-500" />
                                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                        Activity History
                                    </span>
                                </div>
                            </button>

                            {sectionsOpen.activity && (
                                <div className="pl-6 space-y-3 pt-1">
                                    {/* Activity Filter */}
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
                                                className={`px-2 py-0.5 rounded-md transition whitespace-nowrap ${
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
                                    <div className="relative pl-5 border-l-2 border-slate-100 dark:border-slate-800 space-y-3 pt-1">
                                        {activities.map((act) => {
                                            const actorDisplayName = getValidActorName(act.actor, members) || "System";
                                            const activityMessage = formatActivityMessage(act, {
                                                members,
                                                task,
                                                canonicalAssignment,
                                                allTasks,
                                                projects,
                                            });
                                            const meta = act.metadata as Record<string, unknown> | null | undefined;
                                            const isAssignmentEvent =
                                                act.type === "TASK_ASSIGNED" ||
                                                act.type === "TASK_REASSIGNED" ||
                                                act.type === "TASK_UNASSIGNED" ||
                                                meta?.source === "TASK_REASSIGN" ||
                                                meta?.source === "MANUAL_REASSIGN";
                                            const reasonText =
                                                meta?.reason && typeof meta.reason === "string" && !isRawId(meta.reason)
                                                    ? meta.reason.trim()
                                                    : null;

                                            return (
                                                <div key={act.id} className="relative space-y-0.5">
                                                    <div className="absolute -left-[27px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-white dark:ring-slate-900" />
                                                    <div className="flex items-center justify-between text-[11px]">
                                                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                            {!isAssignmentEvent ? actorDisplayName : null}
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
                                                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                                                        {activityMessage}
                                                    </p>
                                                    {reasonText && (
                                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                                                            Reason: &ldquo;{reasonText}&rdquo;
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {activities.length === 0 && (
                                            <p className="text-xs text-slate-400 italic py-2">
                                                No activity recorded for this task.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
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

            {/* Reassign Task Modal */}
            {isReassignModalOpen && (
                <ReassignTaskModal
                    isOpen={isReassignModalOpen}
                    taskId={task.id}
                    currentAssignment={
                        canonicalAssignment || {
                            department: task.department ?? null,
                            assignedTo: task.assignedTo ?? null,
                            assigneeType:
                                task.assigneeType ??
                                (task.assignedTo ? "USER" : (task.department ? "DEPARTMENT" : undefined)),
                        }
                    }
                    onClose={() => setIsReassignModalOpen(false)}
                    onSuccess={handleReassignSuccess}
                />
            )}
        </div>
    );
}
