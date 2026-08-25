"use client";
// NotificationBell: displays unread count badge and notification dropdown

import { useState, useRef, useEffect, useMemo } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  X,
  Trash2,
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
  Layers,
  Loader2,
} from "lucide-react";
import classNames from "classnames";
import { useNotifications } from "@/hooks/useNotifications";
import { useTheme } from "@/context/ThemeContext";
import { useRouter } from "next/navigation";
import { Avatar } from "./ui/Avatar";
import { EmptyState } from "./ui/EmptyState";
import { Skeleton } from "./ui/Skeleton";
import type {
  Notification,
  NotificationCategory,
  NotificationCategoryPreferences,
  NotificationPreferences,
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
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
} from "@/lib/api/notificationsApi";

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
  onHardDelete,
  onClick,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onHardDelete: (id: string) => void;
  onClick: () => void;
}) {
  const isAggregated = Boolean(
    notification.groupKey || (notification.aggregatedCount && notification.aggregatedCount > 1)
  );

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

      {/* Entity Category Icon / Avatar */}
      <div className="shrink-0">
        {notification.actor ? (
          <Avatar
            src={notification.actor.avatarUrl}
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
            {isAggregated && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold">
                <Layers size={10} />
                {notification.aggregatedCount ? `${notification.aggregatedCount}` : "Grouped"}
              </span>
            )}
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
            <button
              onClick={(e) => {
                e.stopPropagation();
                onHardDelete(notification.id);
              }}
              className="p-1.5 rounded-lg hover:bg-error/10 text-text-muted hover:text-error transition-colors"
              title="Delete permanently"
            >
              <Trash2 size={14} />
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

const DEFAULT_PREFERENCES: NotificationPreferences = {
  leads: { inApp: true, email: true, push: true, sound: false },
  messages: { inApp: true, email: true, push: false, sound: false },
  deals: { inApp: true, email: true, push: true, sound: false },
  tasks: { inApp: true, email: false, push: true, sound: false },
  system: { inApp: true, email: true, push: false, sound: true },
};

// Settings Panel Component with User Preference Matrix
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
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [savingPrefs, setSavingPrefs] = useState<Set<string>>(new Set());
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const originalPrefsRef = useRef<NotificationPreferences>(DEFAULT_PREFERENCES);

  // Load preferences from API
  useEffect(() => {
    let active = true;
    fetchNotificationPreferences()
      .then((res) => {
        if (active) {
          let merged: NotificationPreferences;
          if (res && Object.keys(res).length > 0) {
            merged = { ...DEFAULT_PREFERENCES };
            Object.keys(DEFAULT_PREFERENCES).forEach((cat) => {
              merged[cat] = { ...DEFAULT_PREFERENCES[cat], ...(res[cat] || {}) };
            });
            Object.keys(res).forEach((cat) => {
              if (!merged[cat]) merged[cat] = { ...res[cat] };
              else merged[cat] = { ...merged[cat], ...res[cat] };
            });
          } else {
            merged = { ...DEFAULT_PREFERENCES };
          }
          setPreferences(merged);
          originalPrefsRef.current = JSON.parse(JSON.stringify(merged));
        }
      })
      .catch((err: any) => {
        toast.error(err?.message || "Failed to load preferences");
      })
      .finally(() => {
        if (active) setLoadingPrefs(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleTogglePreference = async (
    category: string,
    channel: keyof NotificationCategoryPreferences
  ) => {
    const key = `${category}:${String(channel)}`;
    if (savingPrefs.has(key)) return;

    const original = JSON.parse(JSON.stringify(preferences)) as NotificationPreferences;
    const originalCategory = { ...(preferences[category] || {}) };
    const newChannelValue = !(preferences[category]?.[channel] ?? true);

    const updated = {
      ...preferences,
      [category]: {
        ...(preferences[category] || {
          inApp: true,
          email: true,
          push: false,
          sound: false,
        }),
        [channel]: newChannelValue,
      },
    };

    // Optimistic UI update
    setPreferences(updated);
    setSavingPrefs((prev) => new Set(prev).add(key));

    const payloadKey = category;
    const payloadCategory = {
      ...updated[category],
    };
    Object.entries(payloadCategory).forEach(([k, v]) => {
      // save-only-changed: only include the channel that actually changed vs original
    });
    const savePayload: NotificationPreferences = {
      [payloadKey]: { [channel]: newChannelValue } as NotificationCategoryPreferences,
    };

    try {
      await updateNotificationPreferences(savePayload);
      // Keep the optimistic state — it's already correct.
      // Just sync the ref so future rollbacks use the saved value.
      originalPrefsRef.current = JSON.parse(JSON.stringify(updated));
      toast.success("Preference saved");
    } catch (err: any) {
      // Rollback to pre-toggle state
      setPreferences({ ...original, [category]: { ...originalCategory } });
      toast.error(err?.message || "Failed to save preference");
    } finally {
      setSavingPrefs((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

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

  const categories = ["leads", "messages", "deals", "tasks", "system"];

  return (
    <div className="p-4 space-y-5 overflow-y-auto max-h-[75vh]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-text flex items-center gap-2">
          Notification Settings
          {savingPrefs.size > 0 && <Loader2 size={12} className="animate-spin text-primary" />}
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-surface-hover text-text-muted transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* User Preference Matrix */}
      <div className="rounded-xl border border-border bg-background-secondary p-3 space-y-3">
        <div>
          <h4 className="text-xs font-bold text-text">Channel Preferences Matrix</h4>
          <p className="text-[11px] text-text-muted">Customize notifications per category</p>
        </div>

        {loadingPrefs ? (
          <div className="py-4 text-center">
            <Loader2 size={18} className="animate-spin text-primary mx-auto" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-text-muted">
                  <th className="py-2 font-semibold">Category</th>
                  <th className="py-2 text-center font-semibold">In-App</th>
                  <th className="py-2 text-center font-semibold">Email</th>
                  <th className="py-2 text-center font-semibold">Push</th>
                  <th className="py-2 text-center font-semibold">Sound</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {categories.map((cat) => {
                  const prefs = preferences[cat] || {
                    inApp: true,
                    email: true,
                    push: false,
                    sound: false,
                  };
                  const changeKey = (ch: string) => `${cat}:${ch}`;
                  const isSaving = (ch: keyof NotificationCategoryPreferences) =>
                    savingPrefs.has(changeKey(String(ch)));
                  return (
                    <tr key={cat} className="hover:bg-surface-hover/50">
                      <td className="py-2 font-medium capitalize text-text">{cat}</td>
                      <td className="py-2 text-center">
                        <input
                          type="checkbox"
                          checked={Boolean(prefs.inApp)}
                          disabled={isSaving("inApp")}
                          onChange={() => handleTogglePreference(cat, "inApp")}
                          className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer disabled:opacity-50"
                        />
                      </td>
                      <td className="py-2 text-center">
                        <input
                          type="checkbox"
                          checked={Boolean(prefs.email)}
                          disabled={isSaving("email")}
                          onChange={() => handleTogglePreference(cat, "email")}
                          className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer disabled:opacity-50"
                        />
                      </td>
                      <td className="py-2 text-center">
                        <input
                          type="checkbox"
                          checked={Boolean(prefs.push)}
                          disabled={isSaving("push")}
                          onChange={() => handleTogglePreference(cat, "push")}
                          className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer disabled:opacity-50"
                        />
                      </td>
                      <td className="py-2 text-center">
                        <input
                          type="checkbox"
                          checked={Boolean(prefs.sound)}
                          disabled={isSaving("sound")}
                          onChange={() => handleTogglePreference(cat, "sound")}
                          className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer disabled:opacity-50"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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
    loadingMore,
    hasMore,
    error,
    unreadCount,
    categoryUnreadCounts,
    markRead,
    markAllRead,
    removeNotification,
    hardDeleteNotification,
    fetchNextPage,
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
    let result = notifications.filter((n) => {
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

    // Grouping by groupKey client-side if multiple notifications share a groupKey
    const groupedMap = new Map<string, Notification>();
    const finalItems: Notification[] = [];

    result.forEach((n) => {
      if (n.groupKey) {
        if (!groupedMap.has(n.groupKey)) {
          groupedMap.set(n.groupKey, { ...n, aggregatedCount: 1 });
          finalItems.push(n);
        } else {
          const existing = groupedMap.get(n.groupKey)!;
          existing.aggregatedCount = (existing.aggregatedCount || 1) + 1;
        }
      } else {
        finalItems.push(n);
      }
    });

    return finalItems;
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
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) markRead(notification.id);
    setIsOpen(false);
    router.push(notification.deepLink || "/notifications");
  };

  // Handle mark all read (scoped to current filter category)
  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || isMarkingAllRead) return;
    setIsMarkingAllRead(true);
    try {
      await markAllRead(filter);
    } finally {
      setIsMarkingAllRead(false);
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
                      <EmptyState
                        icon={Search}
                        title="Failed to load notifications"
                        description={error}
                      />
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
                                onMarkRead={markRead}
                                onDelete={removeNotification}
                                onHardDelete={hardDeleteNotification}
                                onClick={() => handleNotificationClick(notification)}
                              />
                            ))}
                          </div>
                        ))}

                        {/* Infinite scroll load more button */}
                        {hasMore && (
                          <div className="p-3 text-center">
                            <button
                              onClick={() => fetchNextPage()}
                              disabled={loadingMore}
                              className="text-xs text-primary font-semibold hover:underline flex items-center justify-center gap-1.5 mx-auto"
                            >
                              {loadingMore && <Loader2 size={12} className="animate-spin" />}
                              {loadingMore ? "Loading more..." : "Load older notifications"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="p-4 border-t border-border shrink-0">
                    <a
                      href="/notifications"
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary-dark transition-colors"
                    >
                      View all notifications
                      <ChevronRight size={16} />
                    </a>
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
                      <EmptyState
                        icon={Search}
                        title="Failed to load notifications"
                        description={error}
                      />
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
                                onMarkRead={markRead}
                                onDelete={removeNotification}
                                onHardDelete={hardDeleteNotification}
                                onClick={() => handleNotificationClick(notification)}
                              />
                            ))}
                          </div>
                        ))}

                        {hasMore && (
                          <div className="p-3 text-center">
                            <button
                              onClick={() => fetchNextPage()}
                              disabled={loadingMore}
                              className="text-xs text-primary font-semibold hover:underline flex items-center justify-center gap-1.5 mx-auto"
                            >
                              {loadingMore && <Loader2 size={12} className="animate-spin" />}
                              {loadingMore ? "Loading more..." : "Load older notifications"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
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
