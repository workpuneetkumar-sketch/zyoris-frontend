"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Bell, Check, CheckCheck, Info, BellRing, ChevronRight } from "lucide-react";
import Link from "next/link";
import classNames from "classnames";

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
        info:    "bg-blue-500",
        success: "bg-emerald-500",
        warning: "bg-amber-500",
        error:   "bg-rose-500",
    };
    
    const typeBg: Record<string, string> = {
        info:    "bg-blue-50 text-blue-600",
        success: "bg-emerald-50 text-emerald-600",
        warning: "bg-amber-50 text-amber-600",
        error:   "bg-rose-50 text-rose-600",
    };

    const colorClass = typeColor[notification.type ?? "info"] || typeColor.info;
    const bgClass = typeBg[notification.type ?? "info"] || typeBg.info;

    return (
        <div
            className={classNames(
                "group relative flex items-start gap-4 px-5 py-4 transition-all duration-300 hover:bg-gray-50/80",
                !notification.read ? "bg-blue-50/30" : "bg-transparent"
            )}
        >
            {/* Unread indicator line */}
            {!notification.read && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            )}

            <div className={classNames("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-white/50", bgClass)}>
                <Info size={18} strokeWidth={2.5} />
            </div>
            
            <div className="flex-1 min-w-0 pr-8">
                <div className="flex items-center gap-2">
                    <p className={classNames(
                        "text-[14px] font-semibold tracking-tight truncate",
                        notification.read ? "text-gray-600" : "text-gray-900"
                    )}>
                        {notification.title}
                    </p>
                    {!notification.read && (
                        <span className="flex w-2 h-2 rounded-full bg-blue-600 shrink-0 shadow-[0_0_5px_rgba(37,99,235,0.4)] animate-pulse" />
                    )}
                </div>
                <p className="text-[13px] text-gray-500 mt-1 leading-snug line-clamp-2">
                    {notification.message}
                </p>
                <p className="text-[11px] font-medium text-gray-400 mt-2 flex items-center gap-1.5">
                    {new Date(notification.createdAt).toLocaleString("en-US", {
                        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                </p>
            </div>

            {/* Actions overlay */}
            {!notification.read && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMarkRead(notification.id); }}
                        className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-gray-200 text-blue-600 hover:bg-blue-50 hover:border-blue-200 shadow-sm transition-all transform hover:scale-110"
                        title="Mark as read"
                    >
                        <Check size={16} strokeWidth={2.5} />
                    </button>
                </div>
            )}
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

interface NotificationBellProps {
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
    const [localNotifications, setLocalNotifications] = useState<AppNotification[]>([]);
    const [open, setOpen] = useState(false);
    const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const notifications = externalNotifications ?? localNotifications;
    const unreadCount = notifications.filter((n) => !n.read).length;

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
                className={classNames(
                    "relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200",
                    open ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100 text-gray-500 hover:text-gray-900"
                )}
                aria-label="Notifications"
                aria-haspopup="true"
                aria-expanded={open}
            >
                {unreadCount > 0 ? (
                    <BellRing size={20} strokeWidth={2} className="animate-bounce" />
                ) : (
                    <Bell size={20} strokeWidth={2} />
                )}
                
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] flex items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-bold leading-none px-1.5 shadow-[0_2px_8px_rgba(79,70,229,0.4)] border-2 border-white">
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown panel */}
            {open && (
                <div
                    ref={panelRef}
                    className="absolute right-0 top-full mt-3 w-[380px] bg-white/95 backdrop-blur-xl border border-gray-100/50 rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] z-[200] overflow-hidden transform origin-top-right transition-all animate-in fade-in zoom-in-95 duration-200"
                >
                    {/* Panel header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100/80 bg-white/50">
                        <div className="flex items-center gap-3">
                            <h3 className="text-base font-bold text-gray-900 tracking-tight">Notifications</h3>
                            {unreadCount > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[12px] font-bold shadow-sm">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                disabled={isMarkingAllRead}
                                className={classNames(
                                    "flex items-center gap-1.5 text-[13px] font-semibold transition-all px-2 py-1 rounded-md",
                                    isMarkingAllRead
                                        ? "text-gray-400 cursor-not-allowed"
                                        : "text-blue-600 hover:bg-blue-50 active:scale-95"
                                )}
                            >
                                <CheckCheck size={15} />
                                {isMarkingAllRead ? "Marking..." : "Mark all read"}
                            </button>
                        )}
                    </div>

                    {/* Content */}
                    <div className="max-h-[420px] overflow-y-auto relative scrollbar-thin scrollbar-thumb-gray-200">
                        {loading ? (
                            <div className="divide-y divide-gray-50/50">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="flex items-start gap-4 px-5 py-4 animate-pulse">
                                        <div className="w-10 h-10 rounded-xl bg-gray-100 shrink-0" />
                                        <div className="flex-1 space-y-3 py-1">
                                            <div className="h-3.5 bg-gray-100 rounded-full w-3/4" />
                                            <div className="h-3 bg-gray-100 rounded-full w-1/2" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : error ? (
                            <div className="py-12 flex flex-col items-center justify-center text-center px-6">
                                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
                                    <Info size={24} className="text-red-500" />
                                </div>
                                <p className="text-[14px] font-medium text-gray-900">Failed to load</p>
                                <p className="text-[13px] text-gray-500 mt-1">{error}</p>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="py-16 flex flex-col items-center justify-center text-center px-6">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center mb-4 shadow-inner border border-gray-50">
                                    <Bell size={32} className="text-gray-300" />
                                </div>
                                <h4 className="text-[15px] font-bold text-gray-900">All caught up!</h4>
                                <p className="text-[13px] text-gray-500 mt-1.5 leading-relaxed max-w-[200px]">
                                    You don't have any new notifications at the moment.
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {groupedNotifications.map((group) => (
                                    <div key={group.label}>
                                        {/* Sticky Group Header */}
                                        <div className="px-5 py-2 bg-gray-50/95 backdrop-blur-md sticky top-0 z-10 border-y border-gray-100/50 first:border-t-0 shadow-sm">
                                            <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                                {group.label}
                                            </h4>
                                        </div>
                                        {/* Group Notifications */}
                                        <div className="divide-y divide-gray-50/80 bg-white">
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
                        <div className="p-3 border-t border-gray-100 bg-gray-50/50">
                            <Link 
                                href="/notifications" 
                                onClick={() => setOpen(false)} 
                                className="flex items-center justify-center gap-1.5 w-full py-2.5 px-4 bg-white border border-gray-200 text-[13px] text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm group"
                            >
                                View all notifications
                                <ChevronRight size={14} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

