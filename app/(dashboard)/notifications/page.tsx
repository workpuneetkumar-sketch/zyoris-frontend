"use client";

import { useRouter } from "next/navigation";
import { useNotifications } from "@/hooks/useNotifications";
import {
  Bell,
  Check,
  CheckCheck,
  Search,
  Briefcase,
  MessageSquare,
  CheckSquare,
  User,
  ShieldAlert,
  Loader2,
  Archive,
} from "lucide-react";
import classNames from "classnames";
import { useState, useMemo } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Notification, NotificationCategory } from "@/types/notifications";
import { getNotificationPath } from "@/utils/notificationNavigation";
import { toast } from "sonner";
import { SuccessStatusIcon, InfoStatusIcon, WarningStatusIcon, ErrorStatusIcon, MinimalCloseIcon, type ToastType } from "@/components/ui/Toast";

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
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getCategoryIcon(category?: string) {
  const cat = (category || "").toLowerCase();
  switch (cat) {
    case "deals":
      return <Briefcase size={20} className="text-amber-500" />;
    case "messages":
      return <MessageSquare size={20} className="text-blue-500" />;
    case "tasks":
      return <CheckSquare size={20} className="text-emerald-500" />;
    case "leads":
      return <User size={20} className="text-purple-500" />;
    case "system":
    default:
      return <ShieldAlert size={20} className="text-rose-500" />;
  }
}

function getCategoryStyles(category?: string) {
  const cat = (category || "").toLowerCase();
  switch (cat) {
    case "deals":
      return "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400";
    case "messages":
      return "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400";
    case "tasks":
      return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400";
    case "leads":
      return "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400";
    case "system":
    default:
      return "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400";
  }
}

const CATEGORY_TABS: { id: NotificationCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "leads", label: "Leads" },
  { id: "messages", label: "Messages" },
  { id: "deals", label: "Deals" },
  { id: "tasks", label: "Tasks" },
  { id: "system", label: "System" },
];

function NotificationPageItem({
  notification,
  onMarkRead,
  onDelete,
  onOpen,
  archived = false,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onOpen: (notification: Notification) => void;
  archived?: boolean;
}) {
  const normType = (notification.type || "").toLowerCase();
  const type: ToastType =
    normType === "success"
      ? "success"
      : normType === "error" || normType === "danger"
      ? "error"
      : normType === "warning"
      ? "warning"
      : "info";

  const variantStyles = {
    success: {
      bg: "bg-[#EDFAF3]",
      border: "border-[#7FE2BA]",
      icon: <SuccessStatusIcon />,
    },
    info: {
      bg: "bg-[#EEF6FF]",
      border: "border-[#99CCF9]",
      icon: <InfoStatusIcon />,
    },
    warning: {
      bg: "bg-[#FFF9EE]",
      border: "border-[#FCD38D]",
      icon: <WarningStatusIcon />,
    },
    error: {
      bg: "bg-[#FDF2F1]",
      border: "border-[#F8B4AF]",
      icon: <ErrorStatusIcon />,
    },
  }[type];

  const title =
    notification.title?.trim() ||
    (notification.action && notification.action.includes("WHATSAPP")
      ? "WhatsApp Message Received"
      : "Notification");

  return (
    <div
      className={classNames(
        "group relative flex items-start gap-4 p-5 rounded-2xl border shadow-[0_4px_16px_-2px_rgba(0,0,0,0.05),_0_2px_6px_-1px_rgba(0,0,0,0.03)] transition-all font-sans text-left cursor-pointer",
        variantStyles.bg,
        variantStyles.border,
        !notification.read ? "ring-1 ring-black/5" : "opacity-95"
      )}
      onClick={() => onOpen(notification)}
    >
      {/* Status squircle icon */}
      {variantStyles.icon}

      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-[#1E293B] leading-snug truncate">
              {title}
            </h3>
            {!archived && !notification.read && (
              <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 animate-pulse" />
            )}
          </div>
          <span className="text-xs text-[#64748B] font-medium shrink-0">
            {formatRelativeTime(notification.createdAt)}
          </span>
        </div>
        {notification.message && (
          <p className="text-[14px] font-normal text-[#475569] leading-relaxed mt-1 whitespace-pre-line">
            {notification.message}
          </p>
        )}
        {notification.actorName && (
          <p className="text-xs text-[#64748B] mt-2">From {notification.actorName}</p>
        )}
      </div>

      {notification.action && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(notification);
          }}
          className="shrink-0 ml-2 px-4 py-2 rounded-lg border border-[#94A3B8] bg-white text-[13px] font-medium text-[#334155] hover:bg-slate-50 hover:border-slate-400 transition-colors cursor-pointer self-center shadow-none"
        >
          {notification.action.includes(".") ? "View" : notification.action}
        </button>
      )}

      <div className="flex items-center gap-1 shrink-0 ml-auto self-start">
        {!archived && !notification.read && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead(notification.id);
            }}
            className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#475569] hover:bg-black/5 transition-colors"
            title="Mark as read"
          >
            <Check size={16} />
          </button>
        )}
        {!archived && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(notification.id);
            }}
            className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#475569] hover:bg-black/5 transition-colors"
            title="Archive / Dismiss"
          >
            <MinimalCloseIcon />
          </button>
        )}
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const {
    notifications,
    loading,
    loadingMore,
    hasMore,
    error,
    unreadCount,
    categoryUnreadCounts,
    markRead,
    markAllRead,
    removeNotification,
    bulkArchiveAllRead,
    fetchNextPage,
    realtimeStatus,
    refresh,
  } = useNotifications();

  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<NotificationCategory>("all");
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [isArchivingAllRead, setIsArchivingAllRead] = useState(false);
  const [priority, setPriority] = useState("all");

  // Filter and search notifications (Smart Grouping)
  const filteredNotifications = useMemo(() => {
    const result = (notifications || []).filter((n) => {
      const matchesSearch =
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.message.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPriority = priority === "all" || n.priority.toLowerCase() === priority;

      const matchesFilter = (() => {
        switch (filter) {
          case "unread":
            return !n.read;
          case "leads":
          case "messages":
          case "deals":
          case "tasks":
          case "system":
            return (n.category || "").toLowerCase() === filter;
          case "all":
          default:
            return true;
        }
      })();

      return matchesSearch && matchesFilter && matchesPriority;
    });

    return result;
  }, [notifications, searchQuery, filter, priority]);

  // Group by date
  const groupedNotifications = useMemo(() => {
    const groups: { label: string; notifications: Notification[] }[] = [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const todayGroup: Notification[] = [];
    const yesterdayGroup: Notification[] = [];
    const lastWeekGroup: Notification[] = [];
    const earlierGroup: Notification[] = [];

    filteredNotifications.forEach((n) => {
      const date = new Date(n.createdAt);
      const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      if (dateOnly.getTime() === today.getTime()) {
        todayGroup.push(n);
      } else if (dateOnly.getTime() === yesterday.getTime()) {
        yesterdayGroup.push(n);
      } else if (dateOnly >= lastWeek) {
        lastWeekGroup.push(n);
      } else {
        earlierGroup.push(n);
      }
    });

    if (todayGroup.length > 0) groups.push({ label: "Today", notifications: todayGroup });
    if (yesterdayGroup.length > 0)
      groups.push({ label: "Yesterday", notifications: yesterdayGroup });
    if (lastWeekGroup.length > 0)
      groups.push({ label: "Last 7 days", notifications: lastWeekGroup });
    if (earlierGroup.length > 0) groups.push({ label: "Earlier", notifications: earlierGroup });

    return groups;
  }, [filteredNotifications]);

  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || isMarkingAllRead) return;
    setIsMarkingAllRead(true);
    try {
      await markAllRead(filter);
    } catch (cause: unknown) {
      toast.error(cause instanceof Error ? cause.message : "Failed to mark notifications as read");
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  const handleArchiveAllRead = async () => {
    if (isArchivingAllRead) return;
    setIsArchivingAllRead(true);
    try {
      await bulkArchiveAllRead();
    } catch (cause: unknown) {
      toast.error(cause instanceof Error ? cause.message : "Failed to archive read notifications");
    } finally {
      setIsArchivingAllRead(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await markRead(id);
    } catch (cause: any) {
      if (!cause?.message?.includes("404") && cause?.response?.status !== 404) {
        toast.error(cause instanceof Error ? cause.message : "Failed to mark notification as read");
      }
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await removeNotification(id);
    } catch (cause: unknown) {
      toast.error(cause instanceof Error ? cause.message : "Failed to archive notification");
    }
  };

  const handleNotificationOpen = async (notification: Notification) => {
    if (!notification.read) await handleMarkRead(notification.id);
    const path = getNotificationPath(notification);
    if (path) router.push(path);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text flex items-center gap-3">
            Notifications
            {unreadCount > 0 && (
              <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                {unreadCount} new
              </span>
            )}
          </h1>
          <p className="text-text-secondary mt-1">
            Manage your notifications and stay updated
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={isMarkingAllRead}
            className={classNames(
              "flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all",
              isMarkingAllRead
                ? "bg-surface text-text-muted cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:bg-primary-dark"
            )}
          >
            <CheckCheck size={18} />
            {isMarkingAllRead ? "Marking all as read..." : "Mark all as read"}
          </button>
        )}
        {notifications.some((n) => n.read) && (
          <button
            onClick={handleArchiveAllRead}
            disabled={isArchivingAllRead}
            className={classNames(
              "flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all border",
              isArchivingAllRead
                ? "bg-surface text-text-muted cursor-not-allowed border-border"
                : "bg-surface border-border text-text-secondary hover:bg-surface-hover"
            )}
          >
            <Archive size={18} />
            {isArchivingAllRead ? "Archiving..." : "Archive all read"}
          </button>
        )}
      </div>
      {realtimeStatus !== "connected" && (
        <div className="text-xs text-text-muted flex items-center gap-3">
          <span>{realtimeStatus === "connecting" ? "Reconnecting..." : "Offline. Updates will resume when connected."}</span>
          <button onClick={() => void refresh()} className="text-primary font-semibold hover:underline">Retry</button>
        </div>
      )}

      {/* Search and Category Tabs */}
      <div className="bg-surface border border-border rounded-2xl p-4 space-y-4">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            size={20}
          />
          <input
            type="text"
            placeholder="Search notifications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background-secondary border border-border text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_TABS.map((tab) => {
            const count = categoryUnreadCounts[tab.id] || 0;
            return (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={classNames(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                  filter === tab.id
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "bg-background-secondary text-text-muted hover:bg-surface-hover"
                )}
              >
                <span>{tab.label}</span>
                {count > 0 && (
                  <span
                    className={classNames(
                      "px-2 py-0.5 text-xs rounded-full font-bold",
                      filter === tab.id
                        ? "bg-white/20 text-white"
                        : "bg-primary/10 text-primary"
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <select
          value={priority}
          onChange={(event) => setPriority(event.target.value)}
          className="rounded-xl bg-background-secondary border border-border px-3 py-2 text-sm text-text"
          aria-label="Filter by priority"
        >
          <option value="all">All priorities</option>
          <option value="normal">Normal</option>
          <option value="reminder">Reminder</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      {/* Notifications List */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        {loading && notifications.length === 0 ? (
          <div className="p-6 space-y-4">
            <Skeleton variant="notification" count={4} />
          </div>
        ) : error ? (
          <div className="p-8 text-center"><p className="text-error">{error}</p><button onClick={() => void refresh()} className="mt-2 text-primary font-semibold hover:underline">Retry</button></div>
        ) : groupedNotifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="All caught up!"
            description={
              searchQuery || filter !== "all"
                ? "No notifications match your filters."
                : "You don't have any notifications yet."
            }
          />
        ) : (
          <div className="p-4 space-y-3">
            {groupedNotifications.map((group) => (
              <div key={group.label}>
                <div className="px-6 py-3 bg-background-secondary border-b border-border">
                  <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider">
                    {group.label}
                  </h2>
                </div>
                {group.notifications.map((notification) => (
                  <NotificationPageItem
                    key={notification.id}
                    notification={notification}
                    onMarkRead={handleMarkRead}
                    onDelete={handleArchive}
                    onOpen={handleNotificationOpen}
                  />
                ))}
              </div>
            ))}

            {hasMore && (
              <div className="p-4 text-center">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={loadingMore}
                  className="px-4 py-2 text-sm text-primary font-semibold hover:underline flex items-center justify-center gap-2 mx-auto"
                >
                  {loadingMore && <Loader2 size={16} className="animate-spin" />}
                  {loadingMore ? "Loading more..." : "Load older notifications"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

