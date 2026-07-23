"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Bell, Check, CheckCheck, X, Trash2, Search, Filter, BellRing, ChevronRight, User } from "lucide-react";
import { useRouter } from "next/navigation";
import classNames from "classnames";
import { useNotifications } from "@/hooks/useNotifications";
import { useTheme } from "@/context/ThemeContext";
import { Avatar } from "./ui/Avatar";
import { PriorityTag } from "./ui/PriorityTag";
import { EmptyState } from "./ui/EmptyState";
import { Skeleton } from "./ui/Skeleton";
import type { Notification, NotificationType, NotificationPriority } from "@/types/notifications";

// Helper to format date
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Get type icon
function getTypeIcon(type: NotificationType) {
  // We'll use different background colors based on type instead of different icons
  return null;
}

function getTypeStyles(type: NotificationType) {
  switch (type) {
    case "success":
      return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400";
    case "warning":
      return "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400";
    case "error":
      return "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400";
    case "info":
    case "system_reminder":
    case "lead_assigned":
    case "lead_shared":
    case "task_assigned":
    case "mention":
    default:
      return "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400";
  }
}

// Notification Item Component
function NotificationItem({
  notification,
  onMarkRead,
  onDelete,
  onClick,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onClick: () => void;
}) {
  return (
    <div
      className={classNames(
        "group relative flex flex-col sm:flex-row items-start gap-3 p-4 transition-all duration-200 cursor-pointer",
        !notification.read
          ? "bg-primary/5 dark:bg-primary/10"
          : "hover:bg-surface-hover dark:hover:bg-surface-hover"
      )}
      onClick={onClick}
    >
      {/* Unread indicator */}
      {!notification.read && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
      )}

      {/* Avatar / Icon */}
      <div className="shrink-0">
        {notification.actor ? (
          <Avatar
            src={notification.actor.avatarUrl}
            alt={notification.actor.name}
            fallback={notification.actor.name.charAt(0).toUpperCase()}
            size="md"
          />
        ) : (
          <div className={classNames("w-10 h-10 rounded-full flex items-center justify-center", getTypeStyles(notification.type))}>
            <User size={18} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <h4 className={classNames("font-semibold text-sm truncate", notification.read ? "text-text-secondary" : "text-text")}>
              {notification.title}
            </h4>
            {!notification.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 animate-pulse" />}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <PriorityTag priority={notification.priority} className="text-[10px] px-1.5 py-0.5" />
          </div>
        </div>
        <p className={classNames("text-sm mt-1 line-clamp-2", notification.read ? "text-text-muted" : "text-text-secondary")}>
          {notification.message}
        </p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-text-muted">{formatRelativeTime(notification.createdAt)}</span>
          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!notification.read && (
              <button
                onClick={(e) => { e.stopPropagation(); onMarkRead(notification.id); }}
                className="p-1.5 rounded-lg hover:bg-primary/10 text-text-muted hover:text-primary transition-colors"
                title="Mark as read"
              >
                <Check size={14} />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(notification.id); }}
              className="p-1.5 rounded-lg hover:bg-error/10 text-text-muted hover:text-error transition-colors"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Filter options
type FilterOption = "all" | "unread" | "mentions" | "assignments" | "system";

// Main Notification Panel Component
export function NotificationBell() {
  const { notifications, loading, error, unreadCount, markRead, markAllRead, removeNotification } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterOption>("all");
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const { isDark } = useTheme();
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Filter and search notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.message.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = (() => {
        switch (filter) {
          case "unread": return !n.read;
          case "mentions": return n.type === "mention";
          case "assignments": return n.type === "lead_assigned" || n.type === "task_assigned";
          case "system": return n.type === "system_reminder" || n.type === "success" || n.type === "warning" || n.type === "error";
          default: return true;
        }
      })();
      return matchesSearch && matchesFilter;
    });
  }, [notifications, searchQuery, filter]);

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    const groups: { label: string; notifications: Notification[] }[] = [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayGroup: Notification[] = [];
    const yesterdayGroup: Notification[] = [];
    const earlierGroup: Notification[] = [];

    filteredNotifications.forEach(n => {
      const date = new Date(n.createdAt);
      const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      if (dateOnly.getTime() === today.getTime()) {
        todayGroup.push(n);
      } else if (dateOnly.getTime() === yesterday.getTime()) {
        yesterdayGroup.push(n);
      } else {
        earlierGroup.push(n);
      }
    });

    if (todayGroup.length > 0) groups.push({ label: "Today", notifications: todayGroup });
    if (yesterdayGroup.length > 0) groups.push({ label: "Yesterday", notifications: yesterdayGroup });
    if (earlierGroup.length > 0) groups.push({ label: "Earlier", notifications: earlierGroup });

    return groups;
  }, [filteredNotifications]);

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
    }
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen]);

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) markRead(notification.id);
    if (notification.deepLink) {
      router.push(notification.deepLink);
    }
    setIsOpen(false);
  };

  // Handle mark all read
  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || isMarkingAllRead) return;
    setIsMarkingAllRead(true);
    try {
      await markAllRead();
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  const handleViewAllNotifications = () => {
    // Use a normal browser navigation here. The notification panel unmounts
    // as it closes, which can interrupt client-side navigation in this overlay.
    window.location.assign("/notifications");
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={classNames(
          "relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200",
          isOpen
            ? "bg-surface-active text-primary"
            : "hover:bg-surface-hover text-text-muted hover:text-text"
        )}
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        {unreadCount > 0 ? <BellRing size={20} className="animate-bounce" /> : <Bell size={20} />}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] flex items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold px-1 border-2 border-surface">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <>
          {/* Desktop Slide-over */}
          <div className="hidden md:block fixed inset-y-0 right-0 z-50 w-96">
            <div
              ref={panelRef}
              className="h-full bg-surface border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
            >
              {/* Header */}
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-text">Notifications</h2>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      disabled={isMarkingAllRead}
                      className={classNames(
                        "flex items-center gap-1.5 text-sm font-semibold transition-all px-2 py-1 rounded-lg",
                        isMarkingAllRead
                          ? "text-text-muted cursor-not-allowed"
                          : "text-primary hover:bg-primary/10"
                      )}
                    >
                      <CheckCheck size={16} />
                      {isMarkingAllRead ? "Marking..." : "Mark all read"}
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Search and Filter */}
              <div className="p-4 border-b border-border space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                  <input
                    type="text"
                    placeholder="Search notifications..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 rounded-lg bg-background-secondary border border-border text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {(["all", "unread", "mentions", "assignments", "system"] as FilterOption[]).map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={classNames(
                        "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                        filter === f
                          ? "bg-primary text-primary-foreground"
                          : "bg-background-secondary text-text-muted hover:bg-surface-hover"
                      )}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notification List */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="p-4 space-y-4">
                    <Skeleton variant="notification" count={3} />
                  </div>
                ) : error ? (
                  <EmptyState
                    icon={Search}
                    title="Failed to load notifications"
                    description={error}
                  />
                ) : groupedNotifications.length === 0 ? (
                  <EmptyState
                    icon={Bell}
                    title="All caught up!"
                    description={searchQuery || filter !== "all" ? "No notifications match your filters." : "You don't have any notifications yet."}
                  />
                ) : (
                  <div className="divide-y divide-border">
                    {groupedNotifications.map(group => (
                      <div key={group.label}>
                        <div className="sticky top-0 z-10 bg-surface px-4 py-2 border-b border-border">
                          <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">{group.label}</h3>
                        </div>
                        {group.notifications.map(notification => (
                          <NotificationItem
                            key={notification.id}
                            notification={notification}
                            onMarkRead={markRead}
                            onDelete={removeNotification}
                            onClick={() => handleNotificationClick(notification)}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
            <div className="p-4 border-t border-border">
                <button
                    type="button"
                    onClick={handleViewAllNotifications}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary-dark transition-colors"
                >
                    View all notifications
                    <ChevronRight size={16} />
                </button>
            </div>
            </div>
          </div>

          {/* Mobile Bottom Sheet */}
          <div className="md:hidden fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setIsOpen(false)}
            />
            <div
              ref={panelRef}
              className="absolute bottom-0 left-0 right-0 max-h-[80vh] bg-surface rounded-t-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom"
            >
              {/* Handle */}
              <div className="flex justify-center py-2">
                <div className="w-12 h-1.5 rounded-full bg-border" />
              </div>

              {/* Header */}
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-text">Notifications</h2>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      disabled={isMarkingAllRead}
                      className={classNames(
                        "flex items-center gap-1.5 text-sm font-semibold transition-all px-2 py-1 rounded-lg",
                        isMarkingAllRead
                          ? "text-text-muted cursor-not-allowed"
                          : "text-primary hover:bg-primary/10"
                      )}
                    >
                      <CheckCheck size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Search and Filter (mobile) */}
              <div className="p-4 border-b border-border space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                  <input
                    type="text"
                    placeholder="Search notifications..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 rounded-lg bg-background-secondary border border-border text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {(["all", "unread", "mentions", "assignments", "system"] as FilterOption[]).map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={classNames(
                        "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                        filter === f
                          ? "bg-primary text-primary-foreground"
                          : "bg-background-secondary text-text-muted hover:bg-surface-hover"
                      )}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notification List (mobile) */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="p-4 space-y-4">
                    <Skeleton variant="notification" count={3} />
                  </div>
                ) : error ? (
                  <EmptyState
                    icon={Search}
                    title="Failed to load notifications"
                    description={error}
                  />
                ) : groupedNotifications.length === 0 ? (
                  <EmptyState
                    icon={Bell}
                    title="All caught up!"
                    description={searchQuery || filter !== "all" ? "No notifications match your filters." : "You don't have any notifications yet."}
                  />
                ) : (
                  <div className="divide-y divide-border">
                    {groupedNotifications.map(group => (
                      <div key={group.label}>
                        <div className="sticky top-0 z-10 bg-surface px-4 py-2 border-b border-border">
                          <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">{group.label}</h3>
                        </div>
                        {group.notifications.map(notification => (
                          <NotificationItem
                            key={notification.id}
                            notification={notification}
                            onMarkRead={markRead}
                            onDelete={removeNotification}
                            onClick={() => handleNotificationClick(notification)}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
