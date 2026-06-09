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
    Loader2,
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

        const payload: UpdateTaskPayload = {
            title: form.title.trim(),
            description: form.description?.trim() || "",
            status: form.status,
            priority: form.priority,
        };

        if (form.assignedToId !== undefined) payload.assignedToId = (form.assignedToId as string)?.trim() || null;
        if (form.leadId !== undefined) payload.leadId = (form.leadId as string)?.trim() || null;
        if (form.dealId !== undefined) payload.dealId = (form.dealId as string)?.trim() || null;
        if (form.projectId !== undefined) payload.projectId = (form.projectId as string)?.trim() || null;
        
        if (form.dueDate !== undefined) {
            payload.dueDate = form.dueDate ? new Date(form.dueDate).toISOString() : null;
        }

        const ok = await onUpdate(task.id, payload);
        if (ok) setIsEditing(false);
    };

    const handleStatusChange = async (newStatus: TaskStatus) => {
        await onUpdate(task.id, { status: newStatus });
    };

    const currentStatusIdx = STATUS_FLOW.indexOf(task.status);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 md:p-4">
            <div className="bg-gray-50 w-full max-w-lg rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-5 md:px-6 py-4 bg-white border-b border-gray-200">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 leading-tight">
                            {isEditing ? "Edit Task" : "Task Detail"}
                        </h2>
                        <p className="text-sm text-gray-400 font-medium mt-0.5">
                            {isEditing ? "Update task details" : "View and manage this task"}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {!isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="h-9 px-4 rounded-xl border border-gray-200 text-[12px] font-black text-gray-600 hover:bg-gray-50 transition-all active:scale-95 shadow-sm bg-white"
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
                <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6">

                    {(saveError || localSaveError) && (
                        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-[13px] text-red-600 flex items-center gap-2 animate-in slide-in-from-top duration-300">
                            <AlertCircle size={14} />
                            {saveError || localSaveError}
                        </div>
                    )}

                    {/* Status flow — always visible */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 ml-1">Current Status</p>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            {STATUS_FLOW.map((status, idx) => {
                                const isActive = task.status === status;
                                const isPast = idx < currentStatusIdx;
                                return (
                                    <button
                                        key={status}
                                        onClick={() => handleStatusChange(status)}
                                        disabled={saving}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[12px] font-bold transition-all disabled:opacity-60 active:scale-[0.98] ${
                                            isActive
                                                ? STATUS_STYLES[status] + " shadow-sm"
                                                : isPast
                                                ? "bg-gray-50 text-gray-400 border-gray-100"
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
                    </div>

                    {isEditing ? (
                        /* ── Edit mode ── */
                        <div className="space-y-5 animate-in fade-in duration-300">
                            {/* Title */}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                                    Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    name="title"
                                    value={form.title ?? ""}
                                    onChange={handleChange}
                                    className="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all bg-white"
                                />
                            </div>
                            {/* Description */}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Description</label>
                                <textarea
                                    name="description"
                                    value={form.description ?? ""}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none resize-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all bg-white"
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
                                        className="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all bg-white"
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
                                    <option value="">{membersLoading ? "Loading..." : "Unassigned"}</option>
                                    {members.map((m) => (
                                        <option key={m.id} value={m.id}>{m.name} — {m.role}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Optional Links */}
                            <div className="pt-2 border-t border-gray-100 mt-2">
                                <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-4 text-center">Optional Links</p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Lead ID</label>
                                        <input
                                            name="leadId"
                                            value={form.leadId ?? ""}
                                            onChange={handleChange}
                                            className="w-full h-9 rounded-lg border border-gray-200 px-3 text-[12px] text-gray-900 outline-none focus:border-blue-500 transition-all bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Deal ID</label>
                                        <input
                                            name="dealId"
                                            value={form.dealId ?? ""}
                                            onChange={handleChange}
                                            className="w-full h-9 rounded-lg border border-gray-200 px-3 text-[12px] text-gray-900 outline-none focus:border-blue-500 transition-all bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Project ID</label>
                                        <input
                                            name="projectId"
                                            value={form.projectId ?? ""}
                                            onChange={handleChange}
                                            className="w-full h-9 rounded-lg border border-gray-200 px-3 text-[12px] text-gray-900 outline-none focus:border-blue-500 transition-all bg-white"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* ── View mode ── */
                        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm animate-in fade-in duration-300">
                            <div className="px-5 py-4 border-b border-gray-50 bg-gray-50/50">
                                <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Task Information</h3>
                            </div>
                            <div className="p-6 space-y-6">
                                <div>
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Title</p>
                                    <p className="text-[15px] font-black text-gray-900 tracking-tight leading-snug">{task.title}</p>
                                </div>
                                {task.description && (
                                    <div>
                                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Description</p>
                                        <p className="text-[13px] text-gray-600 font-medium leading-relaxed">{task.description}</p>
                                    </div>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0 shadow-sm border border-blue-100">
                                            <Flag size={18} />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Priority</p>
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${PRIORITY_STYLES[task.priority]}`}>
                                                {task.priority}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0 shadow-sm border border-indigo-100">
                                            <Calendar size={18} />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Due Date</p>
                                            <p className="text-[13px] font-black text-gray-800 tracking-tight">
                                                {task.dueDate
                                                    ? new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                                    : "No Due Date"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0 shadow-sm border border-emerald-100">
                                            <User size={18} />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Assignee</p>
                                            <p className="text-[13px] font-black text-gray-800 tracking-tight">
                                                {task.assignedTo?.name ?? "Unassigned"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600 shrink-0 shadow-sm border border-slate-100">
                                            <Clock size={18} />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Created</p>
                                            <p className="text-[13px] font-black text-gray-800 tracking-tight">
                                                {new Date(task.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Context IDs display in view mode */}
                                 {(task.leadId || task.dealId || task.projectId) && (
                                     <div className="pt-4 border-t border-gray-50 flex flex-wrap gap-4">
                                         {task.leadId && (
                                             <div>
                                                 <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-0.5">Lead ID</p>
                                                 <p className="text-[12px] font-mono text-gray-500 font-medium">{String(task.leadId)}</p>
                                             </div>
                                         )}
                                         {task.dealId && (
                                             <div>
                                                 <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-0.5">Deal ID</p>
                                                 <p className="text-[12px] font-mono text-gray-500 font-medium">{String(task.dealId)}</p>
                                             </div>
                                         )}
                                         {task.projectId && (
                                             <div>
                                                 <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-0.5">Project ID</p>
                                                 <p className="text-[12px] font-mono text-gray-500 font-medium">{String(task.projectId)}</p>
                                             </div>
                                         )}
                                     </div>
                                 )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 px-5 md:px-6 py-4 bg-white border-t border-gray-200">
                    {isEditing ? (
                        <>
                            <button
                                onClick={() => { setIsEditing(false); setLocalSaveError(null); }}
                                className="h-11 px-6 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-all active:scale-95"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="h-11 px-8 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-70 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2 active:scale-95"
                            >
                                {saving && <Loader2 size={16} className="animate-spin" />}
                                {saving ? "Saving..." : "Save Changes"}
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={onClose}
                            className="h-11 px-8 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-gray-200"
                        >
                            Close
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
