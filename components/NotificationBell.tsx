"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  Bell, Check, CheckCheck, X, Trash2, Search, BellRing, ChevronRight,
  User, Volume2, VolumeX, BellOff, AlertCircle, AlertTriangle,
  Info, CheckCircle, Zap, Users, MessageSquare, Calendar,
  Shield,
} from "lucide-react";
import classNames from "classnames";
import { useNotifications } from "@/hooks/useNotifications";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar } from "./ui/Avatar";
import { EmptyState } from "./ui/EmptyState";
import { Skeleton } from "./ui/Skeleton";
import { attachAudioUnlock, playNotificationSound } from "@/lib/notificationSound";
import type { Notification, NotificationType, NotificationPriority, NotificationFilter } from "@/types/notifications";

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Type icon & style helpers ─────────────────────────────────────────────────

function getTypeIcon(type: NotificationType) {
  switch (type) {
    case "success": return CheckCircle;
    case "error": return AlertCircle;
    case "warning": return AlertTriangle;
    case "lead_assigned": return Users;
    case "lead_shared": return Users;
    case "task_assigned": return CheckCheck;
    case "mention": return MessageSquare;
    case "system_reminder": return Calendar;
    default: return Info;
  }
}

function getTypeStyles(type: NotificationType): string {
  switch (type) {
    case "success": return "bg-success-light text-success";
    case "error": return "bg-error-light text-error";
    case "warning": return "bg-warning-light text-warning";
    case "lead_assigned":
    case "lead_shared": return "bg-primary/10 text-primary";
    case "task_assigned": return "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400";
    case "mention": return "bg-blue-100 dark:bg-blue-900/30 text-blue-600";
    case "system_reminder": return "bg-amber-100 dark:bg-amber-900/30 text-amber-600";
    default: return "bg-info-light text-info";
  }
}

// ── Priority styling ──────────────────────────────────────────────────────────

interface PriorityConfig {
  label: string;
  classes: string;
  dot: string;
  icon: typeof AlertCircle;
}

function getPriorityConfig(priority: NotificationPriority): PriorityConfig {
  switch (priority) {
    case "critical":
      return { label: "Critical", classes: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", dot: "bg-red-500", icon: Zap };
    case "urgent":
      return { label: "Urgent", classes: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400", dot: "bg-rose-500", icon: AlertCircle };
    case "high":
      return { label: "High", classes: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", dot: "bg-orange-500", icon: AlertTriangle };
    case "medium":
      return { label: "Medium", classes: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", dot: "bg-amber-400", icon: Info };
    case "low":
    default:
      return { label: "Low", classes: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", dot: "bg-green-400", icon: Shield };
  }
}

// ── Priority Badge ────────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: NotificationPriority }) {
  const cfg = getPriorityConfig(priority);
  if (priority === "low" || priority === "medium") return null; // Only show for high+
  return (
    <span className={classNames("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold", cfg.classes)}>
      <span className={classNames("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

// ── Notification Item ─────────────────────────────────────────────────────────

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
  const TypeIcon = getTypeIcon(notification.type);
  const typeStyles = getTypeStyles(notification.type);
  const isUnread = !notification.read;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${notification.title}${isUnread ? " — unread" : ""}`}
      className={classNames(
        "group relative flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-all duration-150 outline-none",
        "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40",
        isUnread
          ? "bg-primary/5 hover:bg-primary/8"
          : "hover:bg-surface-hover"
      )}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
    >
      {/* Unread left border indicator */}
      {isUnread && (
        <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-primary rounded-r-full" />
      )}

      {/* Avatar / Icon */}
      <div className="shrink-0 mt-0.5">
        {notification.actor ? (
          <Avatar
            src={notification.actor.avatarUrl}
            alt={notification.actor.name}
            fallback={notification.actor.name.charAt(0).toUpperCase()}
            size="md"
          />
        ) : (
          <div className={classNames("w-9 h-9 rounded-full flex items-center justify-center", typeStyles)}>
            <TypeIcon size={16} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start gap-2 justify-between">
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            <span className={classNames("text-[13px] font-semibold truncate", isUnread ? "text-text" : "text-text-secondary")}>
              {notification.title}
            </span>
            {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 animate-pulse" />}
          </div>
          <div className="shrink-0 flex items-center gap-1">
            <PriorityBadge priority={notification.priority} />
          </div>
        </div>

        <p className={classNames("text-[12.5px] leading-relaxed line-clamp-2", isUnread ? "text-text-secondary" : "text-text-muted")}>
          {notification.message}
        </p>

        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[11px] text-text-muted">{formatRelativeTime(notification.createdAt)}</span>

          {/* Hover actions */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
            {isUnread && (
              <button
                aria-label="Mark as read"
                onClick={(e) => { e.stopPropagation(); onMarkRead(notification.id); }}
                className="p-1.5 rounded-lg hover:bg-primary/10 text-text-muted hover:text-primary transition-colors"
              >
                <Check size={13} />
              </button>
            )}
            <button
              aria-label="Delete notification"
              onClick={(e) => { e.stopPropagation(); onDelete(notification.id); }}
              className="p-1.5 rounded-lg hover:bg-error/10 text-text-muted hover:text-error transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Settings Panel ────────────────────────────────────────────────────────────

function NotificationSettings({
  soundEnabled,
  onToggleSound,
  pushPermission,
  onRequestPush,
  onClose,
}: {
  soundEnabled: boolean;
  onToggleSound: () => void;
  pushPermission: string;
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

  const pushStatusLabel = pushPermission === "granted" ? "Enabled" : pushPermission === "denied" ? "Blocked" : pushPermission === "unsupported" ? "Not supported" : "Not enabled";
  const pushStatusColor = pushPermission === "granted" ? "text-success" : pushPermission === "denied" ? "text-error" : "text-text-muted";

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-text">Notification Settings</h3>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-hover text-text-muted transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Sound toggle */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-background-secondary border border-border">
        <div className="flex items-center gap-3">
          {soundEnabled ? <Volume2 size={18} className="text-primary" /> : <VolumeX size={18} className="text-text-muted" />}
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
              "relative w-10 h-5.5 rounded-full transition-colors duration-200 border-2",
              soundEnabled ? "bg-primary border-primary" : "bg-background-tertiary border-border"
            )}
            style={{ height: "22px" }}
          >
            <span
              className={classNames(
                "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200",
                soundEnabled ? "translate-x-4.5" : "translate-x-0"
              )}
              style={{ transform: soundEnabled ? "translateX(18px)" : "translateX(0)" }}
            />
          </button>
        </div>
      </div>

      {/* Browser push */}
      <div className="p-3 rounded-xl bg-background-secondary border border-border space-y-2">
        <div className="flex items-center gap-3">
          <BellOff size={18} className={pushPermission === "granted" ? "text-primary" : "text-text-muted"} />
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-text">Browser Notifications</p>
            <p className={classNames("text-[11px]", pushStatusColor)}>Status: {pushStatusLabel}</p>
          </div>
        </div>
        {pushPermission !== "granted" && pushPermission !== "denied" && pushPermission !== "unsupported" && (
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

// ── Main NotificationBell Component ──────────────────────────────────────────

const FILTERS: { id: NotificationFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "mentions", label: "Mentions" },
  { id: "assignments", label: "Assignments" },
  { id: "system", label: "System" },
];

export function NotificationBell() {
  const router = useRouter();
  const {
    notifications, loading, error, unreadCount,
    markRead, markAllRead, removeNotification,
    soundEnabled, toggleSound, pushPermission, requestPush,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Filter + search
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q);
      const matchesFilter = (() => {
        switch (filter) {
          case "unread": return !n.read;
          case "mentions": return n.type === "mention";
          case "assignments": return n.type === "lead_assigned" || n.type === "task_assigned" || n.type === "lead_shared";
          case "system": return ["system_reminder", "success", "warning", "error", "info"].includes(n.type);
          default: return true;
        }
      })();
      return matchesSearch && matchesFilter;
    });
  }, [notifications, searchQuery, filter]);

  // Group by date
  const groupedNotifications = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups: { label: string; items: Notification[] }[] = [];
    const todayItems: Notification[] = [];
    const yesterdayItems: Notification[] = [];
    const earlierItems: Notification[] = [];

    filteredNotifications.forEach((n) => {
      const d = new Date(n.createdAt);
      d.setHours(0, 0, 0, 0);
      if (d.getTime() === today.getTime()) todayItems.push(n);
      else if (d.getTime() === yesterday.getTime()) yesterdayItems.push(n);
      else earlierItems.push(n);
    });

    if (todayItems.length) groups.push({ label: "Today", items: todayItems });
    if (yesterdayItems.length) groups.push({ label: "Yesterday", items: yesterdayItems });
    if (earlierItems.length) groups.push({ label: "Earlier", items: earlierItems });
    return groups;
  }, [filteredNotifications]);

  // Click outside to close
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        panelRef.current?.contains(e.target as Node) ||
        buttonRef.current?.contains(e.target as Node)
      ) return;
      setIsOpen(false);
    }
    if (isOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  // Keyboard: Escape to close, focus search on open
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") { setIsOpen(false); setShowSettings(false); }
    }
    if (isOpen) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && !showSettings) {
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [isOpen, showSettings]);

  const handleOpen = () => {
    // Unlock AudioContext on user gesture — needed for sound to work
    attachAudioUnlock();
    setIsOpen((o) => !o);
    setShowSettings(false);
    setSearchQuery("");
    setFilter("all");
  };

  const handleNotificationClick = (n: Notification) => {
    if (!n.read) void markRead(n.id);
    setIsOpen(false);
    const target = n.deepLink || "/notifications";
    router.push(target);
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || isMarkingAllRead) return;
    setIsMarkingAllRead(true);
    try { await markAllRead(); } finally { setIsMarkingAllRead(false); }
  };

  const PanelContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div ref={isMobile ? undefined : panelRef} className="h-full flex flex-col bg-surface">
      {showSettings ? (
        <NotificationSettings
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
          pushPermission={pushPermission}
          onRequestPush={requestPush}
          onClose={() => setShowSettings(false)}
        />
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-text">Notifications</h2>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={isMarkingAllRead}
                  className={classNames(
                    "flex items-center gap-1.5 text-[12px] font-semibold px-2 py-1 rounded-lg transition-all",
                    isMarkingAllRead ? "text-text-muted cursor-not-allowed" : "text-primary hover:bg-primary/10"
                  )}
                >
                  <CheckCheck size={14} />
                  {isMobile ? "" : (isMarkingAllRead ? "Marking..." : "Mark all read")}
                </button>
              )}
              <button
                onClick={() => setShowSettings(true)}
                aria-label="Notification settings"
                className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text transition-colors"
              >
                <BellOff size={16} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close notifications"
                className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-4 py-3 border-b border-border shrink-0 space-y-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={15} />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-background-secondary border border-border text-sm text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={classNames(
                    "px-3 py-1 rounded-full text-[11.5px] font-medium whitespace-nowrap transition-all",
                    filter === f.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-background-secondary text-text-muted hover:bg-surface-hover"
                  )}
                >
                  {f.label}
                  {f.id === "unread" && unreadCount > 0 && (
                    <span className="ml-1 font-bold">{unreadCount}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {loading ? (
              <div className="p-4 space-y-4"><Skeleton variant="notification" count={4} /></div>
            ) : error ? (
              <EmptyState icon={AlertCircle} title="Failed to load" description={error} />
            ) : groupedNotifications.length === 0 ? (
              <EmptyState
                icon={Bell}
                title="All caught up!"
                description={
                  searchQuery || filter !== "all"
                    ? "No notifications match your filters."
                    : "No notifications yet."
                }
              />
            ) : (
              groupedNotifications.map((group) => (
                <div key={group.label}>
                  <div className="sticky top-0 z-10 bg-surface/95 backdrop-blur-sm px-4 py-1.5 border-b border-border/50">
                    <span className="text-[10.5px] font-bold text-text-muted uppercase tracking-wider">{group.label}</span>
                  </div>
                  {group.items.map((n) => (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      onMarkRead={markRead}
                      onDelete={removeNotification}
                      onClick={() => handleNotificationClick(n)}
                    />
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-border shrink-0">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary-dark transition-colors"
            >
              View all notifications
              <ChevronRight size={15} />
            </Link>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        ref={buttonRef}
        onClick={handleOpen}
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={classNames(
          "relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200",
          isOpen ? "bg-surface-active text-primary" : "hover:bg-surface-hover text-text-muted hover:text-text"
        )}
      >
        {unreadCount > 0 ? <BellRing size={20} className="animate-bounce" style={{ animationDuration: "2s" }} /> : <Bell size={20} />}
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-error text-white text-[10px] font-bold px-1 border-2 border-surface"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Desktop panel */}
      {isOpen && (
        <>
          <div className="hidden md:block fixed inset-y-0 right-0 z-50 w-96 shadow-2xl border-l border-border">
            <PanelContent />
          </div>

          {/* Mobile bottom sheet */}
          <div className="md:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
            <div ref={panelRef} className="absolute bottom-0 left-0 right-0 max-h-[85vh] rounded-t-2xl overflow-hidden flex flex-col shadow-2xl">
              <div className="flex justify-center py-2 bg-surface cursor-grab">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>
              <PanelContent isMobile />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
