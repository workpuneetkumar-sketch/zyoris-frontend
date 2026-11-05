// lib/api/taskCollaboratorsApi.ts
"use client";

import { getAssignableScopes } from "@/lib/api/workspaceApi";
import { fetchTeamMembers } from "@/lib/api/leadsApi";

export interface TaskCollaborator {
    id: string; // user id
    name: string;
    email?: string;
    department?: string;
    role?: string;
    avatarUrl?: string | null;
}

export interface TaskCollaboratorsRecord {
    taskId: string;
    collaborators: TaskCollaborator[];
    reason?: string;
    updatedAt: string;
}

const COLLABORATORS_STORAGE_KEY = "zyoris_task_collaborators";
const inMemoryCollaboratorsMap: Record<string, TaskCollaborator[]> = {};
const inMemoryReasonMap: Record<string, string> = {};

/**
 * Retrieve the full dictionary of task collaborators.
 * Backed by localStorage and in-memory cache for SSR safety.
 */
export function getTaskCollaboratorsMap(): Record<string, TaskCollaborator[]> {
    if (typeof window === "undefined" || !window.localStorage) {
        return inMemoryCollaboratorsMap;
    }
    try {
        const raw = localStorage.getItem(COLLABORATORS_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw) as Record<string, { collaborators: TaskCollaborator[]; reason?: string }>;
            const map: Record<string, TaskCollaborator[]> = {};
            for (const key of Object.keys(parsed)) {
                map[key] = parsed[key]?.collaborators ?? [];
            }
            return map;
        }
    } catch (e) {
        console.warn("Failed to read collaborators from localStorage:", e);
    }
    return inMemoryCollaboratorsMap;
}

/**
 * Get collaborators specifically aligned to a single task.
 */
export function getTaskCollaborators(taskId: string): TaskCollaborator[] {
    if (!taskId) return [];
    if (typeof window === "undefined" || !window.localStorage) {
        return inMemoryCollaboratorsMap[taskId] ?? [];
    }
    try {
        const raw = localStorage.getItem(COLLABORATORS_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed[taskId]) {
                return parsed[taskId].collaborators || [];
            }
        }
    } catch {
        // Fallback to in-memory cache
    }
    return inMemoryCollaboratorsMap[taskId] ?? [];
}

/**
 * Get the stored reason/context for aligning developers to this task.
 */
export function getTaskCollaboratorsReason(taskId: string): string {
    if (!taskId) return "";
    if (typeof window === "undefined" || !window.localStorage) {
        return inMemoryReasonMap[taskId] ?? "";
    }
    try {
        const raw = localStorage.getItem(COLLABORATORS_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed[taskId]) {
                return parsed[taskId].reason || "";
            }
        }
    } catch {
        // Fallback
    }
    return inMemoryReasonMap[taskId] ?? "";
}

/**
 * Persist aligned collaborators for a task.
 * Updates in-memory store, localStorage, and broadcasts a window CustomEvent
 * so all active components (table rows, Kanban cards, TaskDetailModal) update reactively.
 */
export function saveTaskCollaborators(
    taskId: string,
    collaborators: TaskCollaborator[],
    reason?: string
): void {
    if (!taskId) return;
    inMemoryCollaboratorsMap[taskId] = collaborators;
    if (reason !== undefined) inMemoryReasonMap[taskId] = reason;

    if (typeof window !== "undefined" && window.localStorage) {
        try {
            const raw = localStorage.getItem(COLLABORATORS_STORAGE_KEY);
            const current: Record<string, { collaborators: TaskCollaborator[]; reason?: string; updatedAt: string }> = raw
                ? JSON.parse(raw)
                : {};
            current[taskId] = {
                collaborators,
                reason: reason ?? current[taskId]?.reason ?? "",
                updatedAt: new Date().toISOString(),
            };
            localStorage.setItem(COLLABORATORS_STORAGE_KEY, JSON.stringify(current));
        } catch (e) {
            console.warn("Failed to persist collaborators to localStorage:", e);
        }
    }

    if (typeof window !== "undefined") {
        window.dispatchEvent(
            new CustomEvent("zyoris:task-collaborators-updated", {
                detail: { taskId, collaborators, reason },
            })
        );
    }
}

/**
 * Clear collaborators for a task.
 */
export function clearTaskCollaborators(taskId: string): void {
    if (!taskId) return;
    delete inMemoryCollaboratorsMap[taskId];
    delete inMemoryReasonMap[taskId];

    if (typeof window !== "undefined" && window.localStorage) {
        try {
            const raw = localStorage.getItem(COLLABORATORS_STORAGE_KEY);
            if (raw) {
                const current = JSON.parse(raw);
                if (current && taskId in current) {
                    delete current[taskId];
                    localStorage.setItem(COLLABORATORS_STORAGE_KEY, JSON.stringify(current));
                }
            }
        } catch {}
    }

    if (typeof window !== "undefined") {
        window.dispatchEvent(
            new CustomEvent("zyoris:task-collaborators-updated", {
                detail: { taskId, collaborators: [] },
            })
        );
    }
}

/**
 * Fetch available organization members for collaborator selection.
 * Queries getAssignableScopes() first and falls back to fetchTeamMembers().
 */
export async function fetchAssignableDevelopers(): Promise<TaskCollaborator[]> {
    const list: TaskCollaborator[] = [];
    const seenIds = new Set<string>();

    try {
        const scopes = await getAssignableScopes();
        if (scopes && Array.isArray(scopes.employees)) {
            for (const emp of scopes.employees) {
                if (!emp.userId || seenIds.has(emp.userId)) continue;
                seenIds.add(emp.userId);
                list.push({
                    id: emp.userId,
                    name: emp.name || emp.email?.split("@")[0] || "Team Member",
                    email: emp.email,
                    department: emp.department || "Engineering",
                    role: emp.role || undefined,
                });
            }
        }
    } catch (e) {
        console.warn("Failed to load assignable scopes, trying fetchTeamMembers fallback:", e);
    }

    if (list.length === 0) {
        try {
            const teamRes = await fetchTeamMembers();
            const members = Array.isArray(teamRes)
                ? teamRes
                : teamRes?.members || teamRes?.data || [];
            for (const m of members) {
                const id = m.id || m.userId;
                if (!id || seenIds.has(id)) continue;
                seenIds.add(id);
                list.push({
                    id,
                    name: m.name || m.fullName || m.email?.split("@")[0] || "Team Member",
                    email: m.email,
                    department: m.department?.name || m.department || "Engineering",
                    role: m.role || undefined,
                });
            }
        } catch (e) {
            console.warn("fetchTeamMembers fallback also failed:", e);
        }
    }

    return list;
}

export const AVATAR_COLOR_PALETTES = [
    { bg: "bg-indigo-100 dark:bg-indigo-950/80", text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-300 dark:border-indigo-700" },
    { bg: "bg-purple-100 dark:bg-purple-950/80", text: "text-purple-700 dark:text-purple-300", border: "border-purple-300 dark:border-purple-700" },
    { bg: "bg-emerald-100 dark:bg-emerald-950/80", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-300 dark:border-emerald-700" },
    { bg: "bg-blue-100 dark:bg-blue-950/80", text: "text-blue-700 dark:text-blue-300", border: "border-blue-300 dark:border-blue-700" },
    { bg: "bg-rose-100 dark:bg-rose-950/80", text: "text-rose-700 dark:text-rose-300", border: "border-rose-300 dark:border-rose-700" },
    { bg: "bg-amber-100 dark:bg-amber-950/80", text: "text-amber-700 dark:text-amber-300", border: "border-amber-300 dark:border-amber-700" },
    { bg: "bg-teal-100 dark:bg-teal-950/80", text: "text-teal-700 dark:text-teal-300", border: "border-teal-300 dark:border-teal-700" },
];

export function getAvatarColors(name: string) {
    if (!name) return AVATAR_COLOR_PALETTES[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % AVATAR_COLOR_PALETTES.length;
    return AVATAR_COLOR_PALETTES[index];
}

export function getInitials(name: string): string {
    if (!name) return "?";
    return name
        .trim()
        .split(/\s+/)
        .map((p) => p[0]?.toUpperCase() ?? "")
        .join("")
        .slice(0, 2);
}

export function formatTaskDisplayCode(task: { id?: string; code?: string }): string {
    if (task.code) return task.code;
    if (!task.id) return "COMM-1001";
    if (task.id.startsWith("COMM-")) return task.id;
    const clean = task.id.replace(/[^a-zA-Z0-9]/g, "");
    if (clean.length >= 4) {
        return `COMM-${clean.slice(-4).toUpperCase()}`;
    }
    return `COMM-${task.id.toUpperCase()}`;
}

