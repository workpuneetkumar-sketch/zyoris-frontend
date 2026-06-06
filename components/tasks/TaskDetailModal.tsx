"use client";

import { useState, useEffect } from "react";
import {
    X,
    Calendar,
    User,
    Flag,
    ChevronRight,
    CheckCircle2,
    Circle,
    Clock,
    AlertCircle,
} from "lucide-react";
import { Task, TaskStatus, TaskPriority, UpdateTaskPayload } from "@/lib/api/tasksApi";
import { fetchTeamMembers } from "@/lib/api/leadsApi";

// ── Constants ─────────────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<TaskPriority, string> = {
    HIGH:   "bg-red-50   text-red-500   border border-red-200",
    MEDIUM: "bg-amber-50 text-amber-600 border border-amber-200",
    LOW:    "bg-green-50 text-green-600 border border-green-200",
};

const STATUS_FLOW: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];

const STATUS_LABELS: Record<TaskStatus, string> = {
    TODO:        "To Do",
    IN_PROGRESS: "In Progress",
    DONE:        "Done",
};

const STATUS_STYLES: Record<TaskStatus, string> = {
    TODO:        "bg-gray-100   text-gray-500   border border-gray-200",
    IN_PROGRESS: "bg-blue-50    text-blue-600   border border-blue-200",
    DONE:        "bg-green-50   text-green-600  border border-green-200",
};

interface TeamMember {
    id: string;
    name: string;
    role: string;
    email?: string;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface TaskDetailModalProps {
    task: Task;
    saving: boolean;
    saveError: string | null;
    onClose: () => void;
    onUpdate: (id: string, data: UpdateTaskPayload) => Promise<boolean>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TaskDetailModal({
    task,
    saving,
    saveError,
    onClose,
    onUpdate,
}: TaskDetailModalProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState<UpdateTaskPayload>({
        title: task.title,
        description: task.description ?? "",
        priority: task.priority,
        dueDate: task.dueDate ?? "",
        assignedToId: task.assignedToId ?? "",
        status: task.status,
    });
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [localSaveError, setLocalSaveError] = useState<string | null>(null);

    useEffect(() => {
        if (isEditing && members.length === 0) {
            setMembersLoading(true);
            fetchTeamMembers()
                .then((data) => setMembers(data.members ?? data ?? []))
                .catch(() => setMembers([]))
                .finally(() => setMembersLoading(false));
        }
    }, [isEditing, members.length]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSave = async () => {
        if (!form.title?.trim()) {
            setLocalSaveError("Title is required");
            return;
        }
        setLocalSaveError(null);
        const ok = await onUpdate(task.id, {
            ...form,
            dueDate: form.dueDate || null,
            assignedToId: (form.assignedToId as string)?.trim() || null,
        });
        if (ok) setIsEditing(false);
    };

    const handleStatusChange = async (newStatus: TaskStatus) => {
        await onUpdate(task.id, { status: newStatus });
    };

    const currentStatusIdx = STATUS_FLOW.indexOf(task.status);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-gray-50 w-full max-w-lg rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            {isEditing ? "Edit Task" : "Task Detail"}
                        </h2>
                        <p className="text-sm text-gray-400 mt-0.5">
                            {isEditing ? "Update task details" : "View and manage this task"}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {!isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="h-8 px-3 rounded-lg border border-gray-200 text-[12px] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                Edit
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                            aria-label="Close"
                        >
                            <X size={16} className="text-gray-500" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">

                    {(saveError || localSaveError) && (
                        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-[13px] text-red-600 flex items-center gap-2">
                            <AlertCircle size={14} />
                            {saveError || localSaveError}
                        </div>
                    )}

                    {/* Status flow — always visible */}
                    <div className="bg-white rounded-xl border border-gray-100 p-4">
                        <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-3">Status</p>
                        <div className="flex items-center gap-2">
                            {STATUS_FLOW.map((status, idx) => {
                                const isActive = task.status === status;
                                const isPast = idx < currentStatusIdx;
                                return (
                                    <button
                                        key={status}
                                        onClick={() => handleStatusChange(status)}
                                        disabled={saving}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-[12px] font-medium transition-colors disabled:opacity-60 ${
                                            isActive
                                                ? STATUS_STYLES[status] + " font-semibold"
                                                : isPast
                                                ? "bg-gray-50 text-gray-400 border-gray-200"
                                                : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                                        }`}
                                    >
                                        {status === "DONE" && <CheckCircle2 size={13} />}
                                        {status === "IN_PROGRESS" && <Clock size={13} />}
                                        {status === "TODO" && <Circle size={13} />}
                                        {STATUS_LABELS[status]}
                                    </button>
                                );
                            })}
                        </div>
                        {saving && (
                            <p className="text-[11px] text-gray-400 mt-2 text-center">Saving...</p>
                        )}
                    </div>

                    {isEditing ? (
                        /* ── Edit mode ── */
                        <div className="space-y-4">
                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    name="title"
                                    value={form.title ?? ""}
                                    onChange={handleChange}
                                    className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    name="description"
                                    value={form.description ?? ""}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {/* Priority */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                                    <select
                                        name="priority"
                                        value={form.priority}
                                        onChange={handleChange}
                                        className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="LOW">Low</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HIGH">High</option>
                                    </select>
                                </div>
                                {/* Due Date */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                                    <input
                                        type="date"
                                        name="dueDate"
                                        value={form.dueDate ?? ""}
                                        onChange={handleChange}
                                        className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            {/* Assignee */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
                                <select
                                    name="assignedToId"
                                    value={form.assignedToId ?? ""}
                                    onChange={handleChange}
                                    disabled={membersLoading}
                                    className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                                >
                                    <option value="">{membersLoading ? "Loading..." : "Unassigned"}</option>
                                    {members.map((m) => (
                                        <option key={m.id} value={m.id}>{m.name} — {m.role}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    ) : (
                        /* ── View mode ── */
                        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                            <div className="px-5 py-3 border-b border-gray-50 bg-gray-50/50">
                                <h3 className="text-sm font-semibold text-gray-700">Details</h3>
                            </div>
                            <div className="p-5 space-y-4">
                                <div>
                                    <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Title</p>
                                    <p className="text-[14px] font-medium text-gray-800">{task.title}</p>
                                </div>
                                {task.description && (
                                    <div>
                                        <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Description</p>
                                        <p className="text-[13px] text-gray-600 whitespace-pre-wrap">{task.description}</p>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-start gap-2.5">
                                        <Flag size={14} className="text-gray-400 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-[11px] text-gray-400 mb-0.5">Priority</p>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${PRIORITY_STYLES[task.priority]}`}>
                                                {task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2.5">
                                        <Calendar size={14} className="text-gray-400 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-[11px] text-gray-400 mb-0.5">Due Date</p>
                                            <p className="text-[13px] text-gray-700">
                                                {task.dueDate
                                                    ? new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                                    : "—"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2.5">
                                        <User size={14} className="text-gray-400 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-[11px] text-gray-400 mb-0.5">Assignee</p>
                                            <p className="text-[13px] text-gray-700">
                                                {task.assignedTo?.name ?? "Unassigned"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2.5">
                                        <Calendar size={14} className="text-gray-400 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-[11px] text-gray-400 mb-0.5">Created</p>
                                            <p className="text-[13px] text-gray-700">
                                                {new Date(task.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 bg-white border-t border-gray-200">
                    {isEditing ? (
                        <>
                            <button
                                onClick={() => { setIsEditing(false); setLocalSaveError(null); }}
                                className="h-10 px-5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="h-10 px-5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-70 transition-colors"
                            >
                                {saving ? "Saving..." : "Save Changes"}
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={onClose}
                            className="h-10 px-5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition-colors"
                        >
                            Close
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
