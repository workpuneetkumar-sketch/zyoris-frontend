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
  X,
  ExternalLink,
  UserRound,
} from "lucide-react";
import classNames from "classnames";
import { useState, useMemo, useEffect } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Notification, NotificationCategory } from "@/types/notifications";
import { getNotificationPath } from "@/utils/notificationNavigation";
import { toast } from "sonner";

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
  return (
    <div
      className={classNames(
        "group relative flex flex-col sm:flex-row items-start gap-4 p-5 transition-all duration-200 rounded-xl cursor-pointer",
        notification.priority.toLowerCase() === "critical" && "border-l-4 border-error",
        !notification.read
          ? "bg-primary/5 dark:bg-primary/10"
          : "hover:bg-surface-hover dark:hover:bg-surface-hover"
      )}
      onClick={() => onOpen(notification)}
    >
      {/* Unread indicator */}
      {!archived && !notification.read && (
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary rounded-r-full" />
      )}

      {/* Entity Category Icon / Avatar */}
      <div className="shrink-0">
        {notification.actor ? (
          <Avatar
            src={notification.actor.avatarUrl ?? undefined}
            alt={notification.actor.name}
            fallback={notification.actor.name.charAt(0).toUpperCase()}
            size="lg"
          />
        ) : (
          <div
            className={classNames(
              "w-12 h-12 rounded-full flex items-center justify-center",
              getCategoryStyles(notification.category)
            )}
          >
            {getCategoryIcon(notification.category)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3
              className={classNames(
                "font-bold text-base truncate",
                notification.read ? "text-text-secondary" : "text-text"
              )}
            >
              {notification.title}
            </h3>
            {!archived && !notification.read && (
              <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 animate-pulse" />
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {!notification.read && (
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onMarkRead(notification.id);
                  }}
                  className="p-2 rounded-lg hover:bg-primary/10 text-text-muted hover:text-primary transition-colors"
                  title="Mark as read"
                >
                  <Check size={16} />
                </button>
              )}
              {!archived && <button
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(notification.id);
                }}
                className="p-2 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text-secondary transition-colors"
                title="Archive"
              >
                <Archive size={16} />
              </button>}
            </div>
          </div>
        </div>
        <p
          className={classNames(
            "text-base mt-2 leading-relaxed",
            notification.read ? "text-text-muted" : "text-text-secondary"
          )}
        >
          {notification.message}
        </p>
        {notification.actorName && (
          <p className="text-xs text-text-muted mt-2">From {notification.actorName}</p>
        )}
        <div className="flex items-center mt-3">
          <span className="text-sm text-text-muted">
            {formatRelativeTime(notification.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const {
    notifications,
    archivedNotifications,
    archivedLoading,
    archivedLoadingMore,
    archivedError,
    archivedHasMore,
    archivedUnavailable,
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
    loadArchived,
    fetchNextArchivedPage,
    realtimeStatus,
    refresh,
  } = useNotifications();

  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<NotificationCategory>("all");
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [isArchivingAllRead, setIsArchivingAllRead] = useState(false);
  const [priority, setPriority] = useState("all");
  const [view, setView] = useState<"active" | "archived">("active");
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  useEffect(() => {
    if (view === "archived") void loadArchived();
  }, [loadArchived, view]);

  // Filter and search notifications (Smart Grouping)
  const filteredNotifications = useMemo(() => {
    const result = notifications.filter((n) => {
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

  const filteredArchivedNotifications = useMemo(() => archivedNotifications.filter((notification) =>
    notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    notification.message.toLowerCase().includes(searchQuery.toLowerCase())
  ), [archivedNotifications, searchQuery]);

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
    } catch (cause: unknown) {
      toast.error(cause instanceof Error ? cause.message : "Failed to mark notification as read");
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
    setSelectedNotification(notification);
    if (!notification.read) await handleMarkRead(notification.id);
  };

  const handleOpenLinkedRecord = () => {
    if (!selectedNotification) return;
    const path = getNotificationPath(selectedNotification);
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
          <button
            onClick={() => setView("active")}
            className={classNames("px-4 py-2 rounded-full text-sm font-medium transition-all", view === "active" ? "bg-primary text-primary-foreground font-semibold" : "bg-background-secondary text-text-muted hover:bg-surface-hover")}
          >All notifications</button>
          <button
            onClick={() => setView("archived")}
            className={classNames("px-4 py-2 rounded-full text-sm font-medium transition-all", view === "archived" ? "bg-primary text-primary-foreground font-semibold" : "bg-background-secondary text-text-muted hover:bg-surface-hover")}
          >Archived</button>
        </div>
        {view === "active" && <div className="flex flex-wrap gap-2">
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
        </div>}
        {view === "active" && <select
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
        </select>}
      </div>

      {/* Notifications List */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        {view === "archived" && archivedUnavailable ? (
          <div className="p-8 text-center text-text-secondary">Archived notifications aren&apos;t retrievable yet &mdash; ask backend to add an <code className="text-sm">archived</code> filter to GET /api/notifications</div>
        ) : view === "archived" && archivedLoading && archivedNotifications.length === 0 ? (
          <div className="p-6 space-y-4"><Skeleton variant="notification" count={4} /></div>
        ) : view === "archived" && archivedError ? (
          <div className="p-8 text-center"><p className="text-error">{archivedError}</p><button onClick={() => void loadArchived()} className="mt-2 text-primary font-semibold hover:underline">Retry</button></div>
        ) : view === "active" && loading && notifications.length === 0 ? (
          <div className="p-6 space-y-4">
            <Skeleton variant="notification" count={4} />
          </div>
        ) : view === "active" && error ? (
          <div className="p-8 text-center"><p className="text-error">{error}</p><button onClick={() => void refresh()} className="mt-2 text-primary font-semibold hover:underline">Retry</button></div>
        ) : view === "archived" && filteredArchivedNotifications.length === 0 ? (
          <EmptyState icon={Archive} title="No archived notifications" description="Archived notifications will appear here when the backend supports retrieving them." />
        ) : view === "active" && groupedNotifications.length === 0 ? (
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
          <div className="divide-y divide-border">
            {view === "archived" && filteredArchivedNotifications.map((notification) => (
              <NotificationPageItem key={notification.id} notification={notification} archived onMarkRead={handleMarkRead} onDelete={handleArchive} onOpen={handleNotificationOpen} />
            ))}
            {view === "active" && groupedNotifications.map((group) => (
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

            {view === "active" && hasMore && (
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
            {view === "archived" && archivedHasMore && (
              <div className="p-4 text-center"><button onClick={() => void fetchNextArchivedPage()} disabled={archivedLoadingMore} className="px-4 py-2 text-sm text-primary font-semibold hover:underline">{archivedLoadingMore ? "Loading more..." : "Load more"}</button></div>
            )}
          </div>
        )}
      </div>

      {selectedNotification && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setSelectedNotification(null)}>
          <aside className="h-full w-full max-w-xl overflow-y-auto bg-surface shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="sticky top-0 flex items-center justify-between border-b border-border bg-surface p-5">
              <h2 className="text-lg font-bold text-text">Notification details</h2>
              <button onClick={() => setSelectedNotification(null)} className="rounded-lg p-2 text-text-muted hover:bg-surface-hover" title="Close"><X size={20} /></button>
            </div>
            <div className="space-y-6 p-6">
              <div><h3 className="text-xl font-bold text-text">{selectedNotification.title}</h3><p className="mt-3 whitespace-pre-wrap text-text-secondary">{selectedNotification.message}</p></div>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div><dt className="text-text-muted">Actor</dt><dd className="mt-1 flex items-center gap-2 text-text"> <UserRound size={15} />{selectedNotification.actorName || selectedNotification.actor?.name || "System"}</dd></div>
                <div><dt className="text-text-muted">Category</dt><dd className="mt-1 text-text">{selectedNotification.category || "Uncategorized"}</dd></div>
                <div><dt className="text-text-muted">Priority</dt><dd className="mt-1 text-text">{selectedNotification.priority}</dd></div>
                <div><dt className="text-text-muted">Created</dt><dd className="mt-1 text-text">{new Date(selectedNotification.createdAt).toLocaleString()}</dd></div>
                <div><dt className="text-text-muted">Read</dt><dd className="mt-1 text-text">{selectedNotification.readAt ? new Date(selectedNotification.readAt).toLocaleString() : "Unread"}</dd></div>
              </dl>
              <div className="flex flex-wrap gap-2">
                {!selectedNotification.read && <button onClick={() => void handleMarkRead(selectedNotification.id)} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Mark as read</button>}
                <button onClick={() => void handleArchive(selectedNotification.id)} className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-surface-hover">Archive</button>
                {getNotificationPath(selectedNotification) && <button onClick={handleOpenLinkedRecord} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-surface-hover">Open linked record <ExternalLink size={15} /></button>}
              </div>
              <p className="text-xs text-text-muted">Mark as unread, dismiss, snooze, and unarchive are unavailable until the backend exposes those notification routes.</p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

