"use client";

// NotificationBell.tsx
// UI-only notification bell component.
// No notification API exists in the deployed Swagger (https://zyoris.onrender.com/docs).
// This component renders the bell icon with an unread badge, a dropdown panel,
// and the appropriate loading / empty / error states — ready to wire up to a
// real API whenever the backend ships the endpoint.

import { useState, useRef, useEffect, useMemo } from "react";
import { Bell, X, CheckCheck, Info } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AppNotification {
    id: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
    type?: "info" | "success" | "warning" | "error";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function NotificationItem({
    notification,
    onMarkRead,
}: {
    notification: AppNotification;
    onMarkRead: (id: string) => void;
}) {
    const typeColor: Record<string, string> = {
        info:    "bg-blue-50   text-blue-500",
        success: "bg-green-50  text-green-500",
        warning: "bg-amber-50  text-amber-500",
        error:   "bg-red-50    text-red-500",
    };
    const colorClass = typeColor[notification.type ?? "info"];

    return (
        <div
            className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                !notification.read ? "bg-blue-50/40" : ""
            }`}
        >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${colorClass}`}>
                <Info size={14} />
            </div>
            <div className="flex-1 min-w-0">
                <p className={`text-[13px] font-medium leading-snug ${notification.read ? "text-gray-600" : "text-gray-800"}`}>
                    {notification.title}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5 truncate">{notification.message}</p>
                <p className="text-[10px] text-gray-300 mt-0.5">
                    {new Date(notification.createdAt).toLocaleString("en-US", {
                        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                </p>
            </div>
            {!notification.read && (
                <button
                    onClick={() => onMarkRead(notification.id)}
                    className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors shrink-0 mt-0.5"
                    title="Mark as read"
                >
                    <X size={11} />
                </button>
            )}
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

interface NotificationBellProps {
    /** Pass real notifications here once the backend API is available */
    notifications?: AppNotification[];
    loading?: boolean;
    error?: string | null;
    onMarkRead?: (id: string) => Promise<void> | void;
    onMarkAllRead?: () => Promise<void> | void;
}

export function NotificationBell({
    notifications: externalNotifications,
    loading = false,
    error = null,
    onMarkRead,
    onMarkAllRead,
}: NotificationBellProps) {
    // Local state — used when no external notifications are provided
    const [localNotifications, setLocalNotifications] = useState<AppNotification[]>([]);
    const [open, setOpen] = useState(false);
    const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const notifications = externalNotifications ?? localNotifications;
    const unreadCount = notifications.filter((n) => !n.read).length;

    // Group notifications by date (memoized to avoid repeated sorting)
    const groupedNotifications = useMemo(() => {
        const groups: { label: string; notifications: AppNotification[] }[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const last7Days = new Date(today);
        last7Days.setDate(last7Days.getDate() - 7);

        const sortedNotifications = [...notifications].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        const todayGroup: AppNotification[] = [];
        const yesterdayGroup: AppNotification[] = [];
        const last7DaysGroup: AppNotification[] = [];
        const earlierGroup: AppNotification[] = [];

        sortedNotifications.forEach((n) => {
            const date = new Date(n.createdAt);
            if (date >= today) todayGroup.push(n);
            else if (date >= yesterday) yesterdayGroup.push(n);
            else if (date >= last7Days) last7DaysGroup.push(n);
            else earlierGroup.push(n);
        });

        if (todayGroup.length > 0) groups.push({ label: "Today", notifications: todayGroup });
        if (yesterdayGroup.length > 0) groups.push({ label: "Yesterday", notifications: yesterdayGroup });
        if (last7DaysGroup.length > 0) groups.push({ label: "Last 7 Days", notifications: last7DaysGroup });
        if (earlierGroup.length > 0) groups.push({ label: "Earlier", notifications: earlierGroup });

        return groups;
    }, [notifications]);

    // Close panel on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (
                panelRef.current &&
                !panelRef.current.contains(e.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        }
        if (open) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    async function handleMarkRead(id: string) {
        if (onMarkRead) {
            await onMarkRead(id);
        } else if (!externalNotifications) {
            setLocalNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, read: true } : n))
            );
        }
    }

    async function handleMarkAllRead() {
        if (unreadCount === 0 || isMarkingAllRead) return;
        
        setIsMarkingAllRead(true);
        try {
            if (onMarkAllRead) {
                await onMarkAllRead();
            } else if (!externalNotifications) {
                // Optimistic update for local state
                setLocalNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            }
        } finally {
            setIsMarkingAllRead(false);
        }
    }

    return (
        <div className="relative">
            {/* Bell button */}
            <button
                ref={buttonRef}
                onClick={() => setOpen((v) => !v)}
                className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Notifications"
                aria-haspopup="true"
                aria-expanded={open}
            >
                <Bell size={18} strokeWidth={1.8} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-blue-600 text-white text-[9px] font-bold leading-none px-1 pointer-events-none">
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown panel */}
            {open && (
                <div
                    ref={panelRef}
                    className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-100 rounded-2xl shadow-xl z-[200] overflow-hidden"
                >
                    {/* Panel header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                            <h3 className="text-[14px] font-semibold text-gray-800">Notifications</h3>
                            {unreadCount > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 text-[11px] font-semibold">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                disabled={isMarkingAllRead}
                                className={`flex items-center gap-1 text-[12px] font-medium transition-colors ${
                                    isMarkingAllRead
                                        ? "text-gray-400 cursor-not-allowed"
                                        : "text-blue-600 hover:underline"
                                }`}
                            >
                                <CheckCheck size={13} />
                                {isMarkingAllRead ? "Marking..." : "Mark all read"}
                            </button>
                        )}
                    </div>

                    {/* Content */}
                    <div className="max-h-[360px] overflow-y-auto relative">
                        {loading ? (
                            <div className="divide-y divide-gray-50">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="flex items-start gap-3 px-4 py-3 animate-pulse">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 shrink-0" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-3 bg-gray-100 rounded w-3/4" />
                                            <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : error ? (
                            <div className="py-8 text-center">
                                <p className="text-[13px] text-red-400">{error}</p>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="py-10 text-center">
                                <Bell size={28} className="text-gray-200 mx-auto mb-2" />
                                <p className="text-[13px] text-gray-400">No notifications yet</p>
                                <p className="text-[11px] text-gray-300 mt-0.5">You're all caught up!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {groupedNotifications.map((group) => (
                                    <div key={group.label}>
                                        {/* Sticky Group Header */}
                                        <div className="px-4 py-2 bg-gray-50/90 backdrop-blur-sm sticky top-0 z-10 border-y border-gray-100 first:border-t-0">
                                            <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                                                {group.label}
                                            </h4>
                                        </div>
                                        {/* Group Notifications */}
                                        <div className="divide-y divide-gray-50">
                                            {group.notifications.map((n) => (
                                                <NotificationItem
                                                    key={n.id}
                                                    notification={n}
                                                    onMarkRead={handleMarkRead}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Panel footer */}
                    {notifications.length > 0 && (
                        <div className="px-4 py-3 border-t border-gray-100 text-center">
                            <button className="text-[12px] text-blue-600 font-medium hover:underline">
                                View all notifications
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

