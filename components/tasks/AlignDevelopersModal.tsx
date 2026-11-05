// components/tasks/AlignDevelopersModal.tsx
"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
    X,
    Users,
    Search,
    Check,
    Loader2,
    FileText,
    User,
    CheckCircle2,
    AlertCircle,
    Info,
} from "lucide-react";
import {
    TaskCollaborator,
    fetchAssignableDevelopers,
    saveTaskCollaborators,
    getTaskCollaborators,
    getTaskCollaboratorsReason,
    getAvatarColors,
    getInitials,
    formatTaskDisplayCode,
} from "@/lib/api/taskCollaboratorsApi";

export interface AlignDevelopersModalProps {
    isOpen: boolean;
    taskId: string;
    taskTitle: string;
    taskCode?: string;
    primaryAssignee?: {
        id?: string | null;
        name?: string | null;
        email?: string | null;
        department?: string | null;
    } | null;
    existingCollaborators?: TaskCollaborator[];
    onClose: () => void;
    onSuccess: (collaborators: TaskCollaborator[], reason?: string) => void;
}

export const AlignDevelopersModal: React.FC<AlignDevelopersModalProps> = ({
    isOpen,
    taskId,
    taskTitle,
    taskCode,
    primaryAssignee,
    existingCollaborators,
    onClose,
    onSuccess,
}) => {
    const [mounted, setMounted] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [availableDevelopers, setAvailableDevelopers] = useState<TaskCollaborator[]>([]);
    const [selectedDevIds, setSelectedDevIds] = useState<Set<string>>(new Set());
    const [selectedDevMap, setSelectedDevMap] = useState<Map<string, TaskCollaborator>>(new Map());
    const [reason, setReason] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const isSubmittingRef = useRef(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Initialize state on open
    useEffect(() => {
        if (!isOpen || !taskId) return;

        isSubmittingRef.current = false;
        setIsSubmitting(false);
        setSuccessMessage(null);
        setError(null);
        setSearchQuery("");

        // Prepopulate existing collaborators
        const initialCollaborators =
            existingCollaborators && existingCollaborators.length > 0
                ? existingCollaborators
                : getTaskCollaborators(taskId);

        const initialMap = new Map<string, TaskCollaborator>();
        const initialIds = new Set<string>();
        for (const c of initialCollaborators) {
            initialMap.set(c.id, c);
            initialIds.add(c.id);
        }
        setSelectedDevMap(initialMap);
        setSelectedDevIds(initialIds);

        // Prepopulate existing reason
        const storedReason = getTaskCollaboratorsReason(taskId);
        setReason(storedReason || "");

        // Fetch available organization members
        let active = true;
        setIsLoading(true);
        fetchAssignableDevelopers()
            .then((devs) => {
                if (!active) return;
                setAvailableDevelopers(devs);
                // Also ensure any existing collaborators are in available list if missing
                for (const c of initialCollaborators) {
                    if (!devs.some((d) => d.id === c.id)) {
                        devs.push(c);
                    }
                }
            })
            .catch((err) => {
                if (!active) return;
                console.error("Failed to load developers:", err);
                setError("Unable to load team members. Please check your connection.");
            })
            .finally(() => {
                if (active) setIsLoading(false);
            });

        return () => {
            active = false;
        };
    }, [isOpen, taskId, existingCollaborators]);

    // Handle ESC key to close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen && !isSubmitting) {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, isSubmitting, onClose]);

    // Determine primary assignee ID to exclude from selection list
    const primaryAssigneeId = primaryAssignee?.id || null;
    const primaryAssigneeName = primaryAssignee?.name || "Unassigned";

    // Filter available developers:
    // 1. Exclude the primary assignee
    // 2. Filter by search query (name, email, department)
    const filteredDevelopers = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return availableDevelopers.filter((dev) => {
            // Exclude primary assignee
            if (primaryAssigneeId && dev.id === primaryAssigneeId) {
                return false;
            }
            if (!query) return true;
            const nameMatch = dev.name?.toLowerCase().includes(query);
            const emailMatch = dev.email?.toLowerCase().includes(query);
            const deptMatch = dev.department?.toLowerCase().includes(query);
            return Boolean(nameMatch || emailMatch || deptMatch);
        });
    }, [availableDevelopers, primaryAssigneeId, searchQuery]);

    const toggleDeveloper = (dev: TaskCollaborator) => {
        if (isSubmitting) return;
        setSelectedDevIds((prev) => {
            const next = new Set(prev);
            const nextMap = new Map(selectedDevMap);
            if (next.has(dev.id)) {
                next.delete(dev.id);
                nextMap.delete(dev.id);
            } else {
                next.add(dev.id);
                nextMap.set(dev.id, dev);
            }
            setSelectedDevMap(nextMap);
            return next;
        });
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmittingRef.current || isSubmitting) return;

        isSubmittingRef.current = true;
        setIsSubmitting(true);
        setError(null);

        const collaboratorsToSave = Array.from(selectedDevMap.values());
        const trimmedReason = reason.trim();

        try {
            // Save to frontend persistent store & broadcast update event
            saveTaskCollaborators(taskId, collaboratorsToSave, trimmedReason);

            setSuccessMessage("Developers aligned successfully!");
            setTimeout(() => {
                onSuccess(collaboratorsToSave, trimmedReason);
                onClose();
            }, 500);
        } catch (err) {
            console.error("Error aligning developers:", err);
            setError("Failed to align developers. Please try again.");
            setIsSubmitting(false);
            isSubmittingRef.current = false;
        }
    };

    if (!isOpen || !mounted) return null;

    const displayCode = formatTaskDisplayCode({ id: taskId, code: taskCode });
    const selectedCount = selectedDevIds.size;
    const primaryColors = getAvatarColors(primaryAssigneeName);

    const modalContent = (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
                onClick={() => {
                    if (!isSubmitting) onClose();
                }}
            />

            {/* Modal Dialog */}
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-10 overflow-hidden flex flex-col my-8">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                            <Users size={18} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                Align Developers
                            </h2>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
                        title="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleFormSubmit} className="flex-1 flex flex-col">
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        {/* Status messages */}
                        {error && (
                            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-center space-x-2 text-xs text-red-600 dark:text-red-400">
                                <AlertCircle size={15} className="shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}
                        {successMessage && (
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center space-x-2 text-xs text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 size={15} className="shrink-0" />
                                <span>{successMessage}</span>
                            </div>
                        )}

                        {/* Current Task Box */}
                        <div>
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                Current Task
                            </div>
                            <div className="flex items-center space-x-2.5 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                                <FileText size={16} className="text-purple-500 shrink-0" />
                                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate flex-1">
                                    <span>{taskTitle}</span>
                                    <span className="ml-1.5 text-slate-400 dark:text-slate-500 font-normal">
                                        ({displayCode})
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Primary Assignee */}
                        <div>
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                Primary Assignee
                            </div>
                            <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-850 rounded-xl border border-slate-200/80 dark:border-slate-800">
                                <div className="flex items-center space-x-2.5">
                                    <div
                                        className={`w-7 h-7 rounded-full ${primaryColors.bg} ${primaryColors.text} text-[11px] font-bold flex items-center justify-center shrink-0 border ${primaryColors.border}`}
                                    >
                                        {primaryAssigneeName !== "Unassigned" ? (
                                            getInitials(primaryAssigneeName)
                                        ) : (
                                            <User size={13} />
                                        )}
                                    </div>
                                    <div>
                                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                            {primaryAssigneeName}
                                        </div>
                                        {primaryAssignee?.department && (
                                            <div className="text-[10px] text-slate-400">
                                                {primaryAssignee.department}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300">
                                    Task Owner
                                </span>
                            </div>
                        </div>

                        {/* Developer Selection Section */}
                        <div>
                            <div className="flex items-baseline justify-between mb-1">
                                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                    Select Developers <span className="text-purple-600">*</span>
                                </label>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                                Choose one or more developers to collaborate on this task.
                            </p>

                            {/* Search bar */}
                            <div className="relative mb-2">
                                <Search
                                    size={14}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search team members..."
                                    className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery("")}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                                    >
                                        <X size={13} />
                                    </button>
                                )}
                            </div>

                            {/* Developer List */}
                            <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800/80 max-h-56 overflow-y-auto bg-white dark:bg-slate-900">
                                {isLoading ? (
                                    <div className="py-8 flex flex-col items-center justify-center space-y-2 text-slate-400">
                                        <Loader2 size={20} className="animate-spin text-purple-600" />
                                        <span className="text-xs">Loading team members...</span>
                                    </div>
                                ) : filteredDevelopers.length === 0 ? (
                                    <div className="py-8 text-center text-xs text-slate-400">
                                        {searchQuery
                                            ? `No developers found matching "${searchQuery}"`
                                            : "No available developers found."}
                                    </div>
                                ) : (
                                    filteredDevelopers.map((dev) => {
                                        const isSelected = selectedDevIds.has(dev.id);
                                        const devColors = getAvatarColors(dev.name);

                                        return (
                                            <div
                                                key={dev.id}
                                                onClick={() => toggleDeveloper(dev)}
                                                className={`flex items-center justify-between px-3.5 py-2.5 cursor-pointer transition select-none ${
                                                    isSelected
                                                        ? "bg-purple-50/50 dark:bg-purple-950/20"
                                                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                                }`}
                                            >
                                                <div className="flex items-center space-x-3">
                                                    {/* Checkbox indicator */}
                                                    <div
                                                        className={`w-4 h-4 rounded flex items-center justify-center transition border ${
                                                            isSelected
                                                                ? "bg-purple-600 border-purple-600 text-white"
                                                                : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                                                        }`}
                                                    >
                                                        {isSelected && <Check size={11} strokeWidth={3} />}
                                                    </div>

                                                    {/* Avatar */}
                                                    <div
                                                        className={`w-7 h-7 rounded-full ${devColors.bg} ${devColors.text} border ${devColors.border} text-[10px] font-bold flex items-center justify-center shrink-0`}
                                                    >
                                                        {getInitials(dev.name)}
                                                    </div>

                                                    {/* Details */}
                                                    <div>
                                                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                                            {dev.name}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400">
                                                            {dev.department || dev.role || "Team Member"}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Reason (Optional) */}
                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                Reason (Optional)
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Aligning developers for frontend and backend integration."
                                rows={2}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition resize-none"
                            />
                        </div>

                        {/* Helper note */}
                        <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
                            <Info size={12} className="shrink-0 text-slate-400" />
                            <span>
                                Collaborators can participate, view task details, and coordinate on this task.
                            </span>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-3.5 bg-slate-50/80 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {selectedCount} developer{selectedCount === 1 ? "" : "s"} selected
                        </span>

                        <div className="flex items-center space-x-2">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition border border-slate-200 dark:border-slate-700"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition shadow-xs flex items-center space-x-1.5"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 size={13} className="animate-spin" />
                                        <span>Aligning...</span>
                                    </>
                                ) : (
                                    <>
                                        <Users size={13} />
                                        <span>Align Developers</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

