"use client";
// NotificationBell: displays unread count badge and notification dropdown

import { useState, useRef, useEffect, useMemo } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  X,
  Archive,
  Search,
  BellRing,
  ChevronRight,
  User,
  Volume2,
  VolumeX,
  BellOff,
  Briefcase,
  MessageSquare,
  CheckSquare,
  ShieldAlert,
} from "lucide-react";
import classNames from "classnames";
import { useNotifications } from "@/hooks/useNotifications";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar } from "./ui/Avatar";
import { EmptyState } from "./ui/EmptyState";
import { Skeleton } from "./ui/Skeleton";
import type {
  Notification,
  NotificationCategory,
} from "@/types/notifications";
import {
  isSoundEnabled,
  setSoundEnabled,
  playNotificationSound,
  attachAudioUnlock,
} from "@/lib/notificationSound";
import {
  getPushPermissionStatus,
  requestPushPermission,
  type PushPermissionStatus,
} from "@/lib/browserPushPermission";
import { toast } from "sonner";
import { getNotificationPath } from "@/utils/notificationNavigation";

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

// Visual category icon mapping
function getCategoryIcon(category?: string) {
  const cat = (category || "").toLowerCase();
  switch (cat) {
    case "deals":
      return <Briefcase size={18} className="text-amber-500" />;
    case "messages":
      return <MessageSquare size={18} className="text-blue-500" />;
    case "tasks":
      return <CheckSquare size={18} className="text-emerald-500" />;
    case "leads":
      return <User size={18} className="text-purple-500" />;
    case "system":
    default:
      return <ShieldAlert size={18} className="text-rose-500" />;
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
        notification.priority.toLowerCase() === "critical" && "border-l-4 border-error",
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

      {/* Entity Category Icon / Avatar */}
      <div className="shrink-0">
        {notification.actor ? (
          <Avatar
            src={notification.actor.avatarUrl ?? undefined}
            alt={notification.actor.name}
            fallback={notification.actor.name.charAt(0).toUpperCase()}
            size="md"
          />
        ) : (
          <div
            className={classNames(
              "w-10 h-10 rounded-full flex items-center justify-center",
              getCategoryStyles(notification.category)
            )}
          >
            {getCategoryIcon(notification.category)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <h4
              className={classNames(
                "font-semibold text-sm truncate",
                notification.read ? "text-text-secondary" : "text-text"
              )}
            >
              {notification.title}
            </h4>
            {!notification.read && (
              <span className="w-2 h-2 rounded-full bg-primary shrink-0 animate-pulse" />
            )}
          </div>
        </div>
        <p
          className={classNames(
            "text-sm mt-1 line-clamp-2",
            notification.read ? "text-text-muted" : "text-text-secondary"
          )}
        >
          {notification.message}
        </p>
        {notification.actorName && (
          <p className="text-xs text-text-muted mt-2">From {notification.actorName}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-text-muted">
            {formatRelativeTime(notification.createdAt)}
          </span>
          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!notification.read && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkRead(notification.id);
                }}
                className="p-1.5 rounded-lg hover:bg-primary/10 text-text-muted hover:text-primary transition-colors"
                title="Mark as read"
              >
                <Check size={14} />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(notification.id);
              }}
              className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text-secondary transition-colors"
              title="Archive"
            >
              <Archive size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Category Tabs Definition
const CATEGORY_TABS: { id: NotificationCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "leads", label: "Leads" },
  { id: "messages", label: "Messages" },
  { id: "deals", label: "Deals" },
  { id: "tasks", label: "Tasks" },
  { id: "system", label: "System" },
];

// Settings Panel Component
function NotificationSettings({
  soundEnabled,
  onToggleSound,
  pushPermission,
  onRequestPush,
  onClose,
}: {
  soundEnabled: boolean;
  onToggleSound: () => void;
  pushPermission: PushPermissionStatus;
  onRequestPush: () => Promise<void>;
  onClose: () => void;
}) {
  const [requesting, setRequesting] = useState(false);
  const [testingSound, setTestingSound] = useState(false);

  const handleRequestPush = async () => {
    setRequesting(true);
    await onRequestPush();
    setRequesting(false);
  };

  const handleTestSound = async () => {
    setTestingSound(true);
    await playNotificationSound(true);
    setTimeout(() => setTestingSound(false), 500);
  };

  const pushStatusLabel =
    pushPermission === "granted"
      ? "Enabled"
      : pushPermission === "denied"
      ? "Blocked"
      : pushPermission === "unsupported"
      ? "Not supported"
      : "Not enabled";

  const pushStatusColor =
    pushPermission === "granted"
      ? "text-success"
      : pushPermission === "denied"
      ? "text-error"
      : "text-text-muted";

  return (
    <div className="p-4 space-y-5 overflow-y-auto max-h-[75vh]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-text flex items-center gap-2">
          Notification Settings
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-surface-hover text-text-muted transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Sound Toggle */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-background-secondary border border-border">
        <div className="flex items-center gap-3">
          {soundEnabled ? (
            <Volume2 size={18} className="text-primary" />
          ) : (
            <VolumeX size={18} className="text-text-muted" />
          )}
          <div>
            <p className="text-[13px] font-semibold text-text">Notification Sound</p>
            <p className="text-[11px] text-text-muted">Play sound on new notifications</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleTestSound}
            disabled={testingSound}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-primary border border-primary/30 hover:bg-primary/10 disabled:opacity-50 transition-colors"
          >
            Test
          </button>
          <button
            role="switch"
            aria-checked={soundEnabled}
            onClick={onToggleSound}
            className={classNames(
              "relative w-10 rounded-full transition-colors duration-200 border-2",
              soundEnabled ? "bg-primary border-primary" : "bg-background-tertiary border-border"
            )}
            style={{ height: "22px" }}
          >
            <span
              className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
              style={{ transform: soundEnabled ? "translateX(18px)" : "translateX(0)" }}
            />
          </button>
        </div>
      </div>

      {/* Push Permission */}
      <div className="p-3 rounded-xl bg-background-secondary border border-border space-y-2">
        <div className="flex items-center gap-3">
          <BellOff
            size={18}
            className={pushPermission === "granted" ? "text-primary" : "text-text-muted"}
          />
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-text">Browser Notifications</p>
            <p className={classNames("text-[11px]", pushStatusColor)}>
              Status: {pushStatusLabel}
            </p>
          </div>
        </div>
        {pushPermission !== "granted" &&
          pushPermission !== "denied" &&
          pushPermission !== "unsupported" && (
            <button
              onClick={handleRequestPush}
              disabled={requesting}
              className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-[12px] font-semibold hover:bg-primary-dark transition-colors disabled:opacity-60"
            >
              {requesting ? "Requesting..." : "Enable Browser Notifications"}
            </button>
          )}
        {pushPermission === "denied" && (
          <p className="text-[11px] text-text-muted bg-error-light rounded-lg p-2">
            Notifications are blocked in your browser. Please update your browser settings to allow them.
          </p>
        )}
      </div>
    </div>
  );
}

// Main Notification Panel Component
export function NotificationBell() {
  const router = useRouter();
  const {
    notifications,
    loading,
    error,
    unreadCount,
    categoryUnreadCounts,
    markRead,
    markAllRead,
    removeNotification,
    realtimeStatus,
    refresh,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<NotificationCategory>("all");
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [soundEnabled, setSoundEnabledState] = useState(() => isSoundEnabled());
  const [pushPermission, setPushPermission] = useState<PushPermissionStatus>(() =>
    getPushPermissionStatus()
  );

  const desktopPanelRef = useRef<HTMLDivElement>(null);
  const mobilePanelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Filter and search notifications (Smart Grouping)
  const filteredNotifications = useMemo(() => {
    const result = notifications.filter((n) => {
      const matchesSearch =
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.message.toLowerCase().includes(searchQuery.toLowerCase());

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

      return matchesSearch && matchesFilter;
    });

    return result.slice(0, 10);
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

    filteredNotifications.forEach((n) => {
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
    if (yesterdayGroup.length > 0)
      groups.push({ label: "Yesterday", notifications: yesterdayGroup });
    if (earlierGroup.length > 0) groups.push({ label: "Earlier", notifications: earlierGroup });

    return groups;
  }, [filteredNotifications]);

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const clickedInsidePanel =
        desktopPanelRef.current?.contains(e.target as Node) ||
        mobilePanelRef.current?.contains(e.target as Node);

      if (
        !clickedInsidePanel &&
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
      if (e.key === "Escape") {
        setIsOpen(false);
        setShowSettings(false);
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
    }
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen]);

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      try {
        await markRead(notification.id);
      } catch (cause: unknown) {
        toast.error(cause instanceof Error ? cause.message : "Failed to mark notification as read");
      }
    }
    setIsOpen(false);
    const path = getNotificationPath(notification);
    if (path) router.push(path);
  };

  // Handle mark all read (scoped to current filter category)
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

  // Toggle sound
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setSoundEnabledState(next);
    if (next) {
      playNotificationSound(true);
    }
  };

  // Request push permission
  const handleRequestPush = async () => {
    const status = await requestPushPermission();
    setPushPermission(status);
  };

  // Toggle open with settings reset
  const handleToggleOpen = () => {
    const newOpen = !isOpen;
    setIsOpen(newOpen);
    if (newOpen) {
      attachAudioUnlock();
    }
    if (!newOpen) {
      setShowSettings(false);
    }
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        ref={buttonRef}
        onClick={handleToggleOpen}
        className={classNames(
          "relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200",
          isOpen
            ? "bg-surface-active text-primary"
            : "hover:bg-surface-hover text-text-muted hover:text-text"
        )}
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        {unreadCount > 0 ? <BellRing size={20} /> : <Bell size={20} />}
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
              ref={desktopPanelRef}
              className="h-full bg-surface border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
            >
              {/* Header */}
              <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
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
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text transition-colors"
                    title="Notification settings"
                  >
                    <BellOff size={18} />
                  </button>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setShowSettings(false);
                    }}
                    className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Content - Settings or Search/Filter/List */}
              {showSettings ? (
                <NotificationSettings
                  soundEnabled={soundEnabled}
                  onToggleSound={toggleSound}
                  pushPermission={pushPermission}
                  onRequestPush={handleRequestPush}
                  onClose={() => setShowSettings(false)}
                />
              ) : (
                <>
                  {realtimeStatus !== "connected" && (
                    <div className="px-4 py-2 text-xs text-text-muted bg-background-secondary border-b border-border flex items-center justify-between">
                      <span>{realtimeStatus === "connecting" ? "Reconnecting..." : "Offline. Updates will resume when connected."}</span>
                      <button onClick={() => void refresh()} className="text-primary font-semibold hover:underline">Retry</button>
                    </div>
                  )}
                  {/* Search and Category Tabs */}
                  <div className="p-4 border-b border-border space-y-3 shrink-0">
                    <div className="relative">
                      <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                        size={18}
                      />
                      <input
                        type="text"
                        placeholder="Search notifications..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 rounded-lg bg-background-secondary border border-border text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    {/* Category Tabs with Badges */}
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                      {CATEGORY_TABS.map((tab) => {
                        const count = categoryUnreadCounts[tab.id] || 0;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setFilter(tab.id)}
                            className={classNames(
                              "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5",
                              filter === tab.id
                                ? "bg-primary text-primary-foreground font-semibold"
                                : "bg-background-secondary text-text-muted hover:bg-surface-hover"
                            )}
                          >
                            <span>{tab.label}</span>
                            {count > 0 && (
                              <span
                                className={classNames(
                                  "px-1.5 py-0.2 text-[10px] rounded-full font-bold",
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
                  </div>

                  {/* Notification List */}
                  <div className="flex-1 overflow-y-auto">
                    {loading ? (
                      <div className="p-4 space-y-4">
                        <Skeleton variant="notification" count={3} />
                      </div>
                    ) : error ? (
                      <div className="p-6 text-center"><p className="text-sm text-error">{error}</p><button onClick={() => void refresh()} className="mt-2 text-sm text-primary font-semibold hover:underline">Retry</button></div>
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
                      <div className="divide-y divide-border">
                        {groupedNotifications.map((group) => (
                          <div key={group.label}>
                            <div className="sticky top-0 z-10 bg-surface px-4 py-2 border-b border-border">
                              <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">
                                {group.label}
                              </h3>
                            </div>
                            {group.notifications.map((notification) => (
                              <NotificationItem
                                key={notification.id}
                                notification={notification}
                                onMarkRead={handleMarkRead}
                                onDelete={handleArchive}
                                onClick={() => handleNotificationClick(notification)}
                              />
                            ))}
                          </div>
                        ))}

                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="p-4 border-t border-border shrink-0">
                    <Link
                      href="/notifications"
                      onClick={() => setIsOpen(false)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary-dark transition-colors"
                    >
                      View all notifications
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Mobile Bottom Sheet */}
          <div className="md:hidden fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => {
                setIsOpen(false);
                setShowSettings(false);
              }}
            />
            <div
              ref={mobilePanelRef}
              className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-surface rounded-t-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom"
            >
              {/* Handle */}
              <div className="flex justify-center py-2 shrink-0">
                <div className="w-12 h-1.5 rounded-full bg-border" />
              </div>

              {/* Header */}
              <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
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
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text transition-colors"
                    title="Notification settings"
                  >
                    <BellOff size={18} />
                  </button>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setShowSettings(false);
                    }}
                    className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Content - Settings or Search/Filter/List */}
              {showSettings ? (
                <div className="flex-1 overflow-y-auto">
                  <NotificationSettings
                    soundEnabled={soundEnabled}
                    onToggleSound={toggleSound}
                    pushPermission={pushPermission}
                    onRequestPush={handleRequestPush}
                    onClose={() => setShowSettings(false)}
                  />
                </div>
              ) : (
                <>
                  {realtimeStatus !== "connected" && (
                    <div className="px-4 py-2 text-xs text-text-muted bg-background-secondary border-b border-border flex items-center justify-between">
                      <span>{realtimeStatus === "connecting" ? "Reconnecting..." : "Offline. Updates will resume when connected."}</span>
                      <button onClick={() => void refresh()} className="text-primary font-semibold hover:underline">Retry</button>
                    </div>
                  )}
                  {/* Search and Category Tabs */}
                  <div className="p-4 border-b border-border space-y-3 shrink-0">
                    <div className="relative">
                      <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                        size={18}
                      />
                      <input
                        type="text"
                        placeholder="Search notifications..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 rounded-lg bg-background-secondary border border-border text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                      {CATEGORY_TABS.map((tab) => {
                        const count = categoryUnreadCounts[tab.id] || 0;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setFilter(tab.id)}
                            className={classNames(
                              "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5",
                              filter === tab.id
                                ? "bg-primary text-primary-foreground font-semibold"
                                : "bg-background-secondary text-text-muted hover:bg-surface-hover"
                            )}
                          >
                            <span>{tab.label}</span>
                            {count > 0 && (
                              <span
                                className={classNames(
                                  "px-1.5 py-0.2 text-[10px] rounded-full font-bold",
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
                  </div>

                  {/* Notification List */}
                  <div className="flex-1 overflow-y-auto">
                    {loading ? (
                      <div className="p-4 space-y-4">
                        <Skeleton variant="notification" count={3} />
                      </div>
                    ) : error ? (
                      <div className="p-6 text-center"><p className="text-sm text-error">{error}</p><button onClick={() => void refresh()} className="mt-2 text-sm text-primary font-semibold hover:underline">Retry</button></div>
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
                      <div className="divide-y divide-border">
                        {groupedNotifications.map((group) => (
                          <div key={group.label}>
                            <div className="sticky top-0 z-10 bg-surface px-4 py-2 border-b border-border">
                              <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">
                                {group.label}
                              </h3>
                            </div>
                            {group.notifications.map((notification) => (
                              <NotificationItem
                                key={notification.id}
                                notification={notification}
                                onMarkRead={handleMarkRead}
                                onDelete={handleArchive}
                                onClick={() => handleNotificationClick(notification)}
                              />
                            ))}
                          </div>
                        ))}

                      </div>
                    )}
                  </div>
                  <div className="p-4 border-t border-border shrink-0">
                    <Link
                      href="/notifications"
                      onClick={() => setIsOpen(false)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary-dark transition-colors"
                    >
                      View all notifications
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
