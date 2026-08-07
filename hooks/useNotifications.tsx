"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import type {
  Notification,
  NotificationCategory,
  UnreadCountData,
  WebsocketNotificationPayload,
  WebsocketCountUpdatedPayload,
} from "@/types/notifications";
import {
  getNotifications,
  markAsRead,
  markAllRead as markAllReadAdapter,
  archiveNotification,
  hardDeleteNotification as hardDeleteNotificationApi,
  bulkArchive,
  createNotification as createNotificationAdapter,
  dtoToNotification,
} from "@/services/notificationAdapter";
import { fetchUnreadCounts } from "@/lib/api/notificationsApi";
import type { CreateNotificationPayload } from "@/lib/api/notificationsApi";
import { useAuth } from "@/context/AuthContext";
import { playNotificationSound, isSoundEnabled, setSoundEnabled } from "@/lib/notificationSound";
import {
  getPushPermissionStatus,
  requestPushPermission,
  showBrowserNotification,
  type PushPermissionStatus,
} from "@/lib/browserPushPermission";

type UnreadCountsMap = Record<string, number>;

function normalizeUnreadCounts(res: UnreadCountData | undefined | null): UnreadCountsMap {
  if (!res) return { all: 0, unread: 0, leads: 0, messages: 0, deals: 0, tasks: 0, system: 0 };
  const byCategory = res.byCategory ?? (res as any).categories ?? {};
  const serverTotal = typeof res.total === "number" ? res.total : 0;

  const normalized: UnreadCountsMap = {
    all: 0,
    unread: 0,
    leads: 0,
    messages: 0,
    deals: 0,
    tasks: 0,
    system: 0,
  };

  const KNOWN = ["leads", "messages", "deals", "tasks", "system"];

  // Remap backend category keys (could be uppercase like LEAD, DEAL etc.) to lowercase frontend keys
  Object.entries(byCategory).forEach(([rawKey, val]) => {
    const key = String(rawKey).toLowerCase();
    const count = typeof val === "number" ? val : 0;
    if (KNOWN.includes(key)) {
      normalized[key] = count;
    }
    // Unknown/UNCATEGORIZED keys: only count toward "all"/"unread" totals,
    // do NOT assign to any named tab — the items themselves will render under
    // the correct tab based on their entityType / type inference.
  });

  // Sum known category counts to get a reliable total
  const sumOfKnown = KNOWN.reduce((s, k) => s + (normalized[k] || 0), 0);

  // Use server total when available and sensible; fall back to sum of known categories
  const total = serverTotal > 0 ? serverTotal : sumOfKnown;
  normalized.all = total;
  normalized.unread = total;

  return normalized;
}

interface NotificationContextValue {
  notifications: Notification[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  unreadCount: number;
  categoryUnreadCounts: Record<string, number>;
  markRead: (id: string) => Promise<void>;
  markAllRead: (category?: NotificationCategory | string) => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
  hardDeleteNotification: (id: string) => Promise<void>;
  createNotification: (payload: CreateNotificationPayload) => Promise<void>;
  bulkArchiveByIds: (ids: string[]) => Promise<void>;
  bulkArchiveAllRead: () => Promise<void>;
  refresh: () => Promise<void>;
  fetchNextPage: () => Promise<void>;
  refreshUnreadCounts: () => Promise<void>;
  soundEnabled: boolean;
  toggleSound: () => void;
  pushPermission: PushPermissionStatus;
  requestPush: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [categoryUnreadCounts, setCategoryUnreadCounts] = useState<UnreadCountsMap>({
    all: 0,
    unread: 0,
    leads: 0,
    messages: 0,
    deals: 0,
    tasks: 0,
    system: 0,
  });
  const [markingRead, setMarkingRead] = useState<Set<string>>(new Set());
  const [archiving, setArchiving] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [bulkArchiving, setBulkArchiving] = useState(false);

  const [soundEnabled, setSoundEnabledState] = useState(() => isSoundEnabled());
  const [pushPermission, setPushPermission] = useState<PushPermissionStatus>(() =>
    getPushPermissionStatus()
  );

  const knownIdsRef = useRef<Set<string>>(new Set());
  const feedCategoryRef = useRef<NotificationCategory | string>("all");

  const refreshUnreadCounts = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    try {
      const res = await fetchUnreadCounts();
      setCategoryUnreadCounts(normalizeUnreadCounts(res));
    } catch (e: any) {
      console.warn("Failed to refresh unread counts:", e?.message || e);
    }
  }, [isAuthenticated, user]);

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setNotifications([]);
      setLoading(false);
      setError(null);
      setHasMore(false);
      setNextCursor(null);
      setCurrentOffset(0);
      knownIdsRef.current = new Set();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const category = feedCategoryRef.current;
      const res = await getNotifications({
        limit: 20,
        offset: 0,
        unreadOnly: category === "unread",
      });
      setNotifications(res.notifications);
      setNextCursor(res.nextCursor);
      setCurrentOffset(res.notifications.length);
      setHasMore(Boolean(res.nextCursor));
      knownIdsRef.current = new Set(res.notifications.map((n) => n.id));
      void refreshUnreadCounts();
    } catch (err: any) {
      console.error("Failed to load notifications:", err);
      setError(err?.message || "Failed to load notifications");
      toast.error(err?.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user, refreshUnreadCounts]);

  const fetchNextPage = useCallback(async () => {
    if (!isAuthenticated || !user || !hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const category = feedCategoryRef.current;
      const res = await getNotifications({
        offset: currentOffset,
        limit: 20,
        unreadOnly: category === "unread",
      });
      setNotifications((prev) => {
        const existingIds = new Set(prev.map((n) => n.id));
        const newItems = res.notifications.filter((n) => !existingIds.has(n.id));
        newItems.forEach((n) => knownIdsRef.current.add(n.id));
        return [...prev, ...newItems];
      });
      setNextCursor(res.nextCursor);
      setCurrentOffset((prev) => prev + res.notifications.length);
      setHasMore(Boolean(res.nextCursor));
    } catch (err: any) {
      console.error("Failed to fetch next page of notifications:", err);
      toast.error(err?.message || "Failed to load more notifications");
    } finally {
      setLoadingMore(false);
    }
  }, [isAuthenticated, user, hasMore, currentOffset, loadingMore]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  /* ---------- WebSocket Event Handlers ---------- */
  useEffect(() => {
    if (!isAuthenticated || !user || typeof window === "undefined") return;

    let socket: any = null;
    let isSubscribed = true;

    const setupWebSockets = async () => {
      try {
        const { io } = await import("socket.io-client");
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || window.location.origin;

        socket = io(wsUrl, {
          transports: ["websocket", "polling"],
          reconnection: true,
          reconnectionDelay: 2000,
          timeout: 10000,
        });

        // 1. notification.created -> prepend, play sound, push
        socket.on("notification.created", (data: any) => {
          if (!isSubscribed || !data) return;
          let newNotif: Notification;
          if (data.id && data.title && typeof data.type === "string" && typeof data.read === "boolean") {
            newNotif = data as Notification;
          } else {
            try {
              newNotif = dtoToNotification(data);
            } catch {
              return;
            }
          }
          if (knownIdsRef.current.has(newNotif.id)) return;

          const currentCategory = feedCategoryRef.current;
          const cat = (newNotif.category || "system").toLowerCase();
          const isInFeedCategory =
            currentCategory === "all" ||
            (currentCategory === "unread" && !newNotif.read) ||
            currentCategory === cat;

          if (isInFeedCategory) {
            setNotifications((prev) => {
              if (prev.some((n) => n.id === newNotif.id)) return prev;
              knownIdsRef.current.add(newNotif.id);
              return [newNotif, ...prev];
            });
          } else {
            knownIdsRef.current.add(newNotif.id);
          }

          if (!newNotif.read) {
            void playNotificationSound();
            try {
              showBrowserNotification(newNotif.title, {
                body: newNotif.message,
                tag: `zyoris-notif-${newNotif.id}`,
              });
            } catch {
              /* ignore */
            }
          }
          // Do NOT manually patch counters after ws sync.
          // Backend will emit notification.count.updated.
          void refreshUnreadCounts();
        });

        // 2. notification.read -> update item in-place
        socket.on("notification.read", (data: WebsocketNotificationPayload) => {
          if (!isSubscribed || !data) return;
          const id = data.id || data.notificationId;
          if (!id) return;
          setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
          );
          // Do NOT manually patch counters here. Use server values.
          void refreshUnreadCounts();
        });

        // 3. notification.archived -> remove from feed
        socket.on("notification.archived", (data: WebsocketNotificationPayload) => {
          if (!isSubscribed || !data) return;
          const id = data.id || data.notificationId;
          if (!id) return;
          setNotifications((prev) => prev.filter((n) => n.id !== id));
          knownIdsRef.current.delete(id);
          void refreshUnreadCounts();
        });

        // 4. notification.count.updated -> server values are the source of truth
        socket.on("notification.count.updated", (data: WebsocketCountUpdatedPayload | any) => {
          if (!isSubscribed || !data) return;
          setCategoryUnreadCounts(normalizeUnreadCounts(data as UnreadCountData));
        });
      } catch (wsErr) {
        console.warn("WebSocket connection unavailable, fallback to polling counts:", wsErr);
      }
    };

    void setupWebSockets();

    let pollInterval: ReturnType<typeof setInterval> | null = null;
    if (typeof window !== "undefined") {
      pollInterval = setInterval(() => {
        void refreshUnreadCounts();
      }, 30000);
    }

    return () => {
      isSubscribed = false;
      if (pollInterval) clearInterval(pollInterval);
      if (socket) {
        try {
          socket.disconnect();
        } catch {
          /* ignore */
        }
      }
    };
  }, [isAuthenticated, user, refreshUnreadCounts]);

  /* ---------- Mutations with optimistic + rollback ---------- */

  const markRead = useCallback(
    async (id: string) => {
      if (markingRead.has(id)) return;
      let snapshot: Notification[] | null = null;
      let countsSnapshot: UnreadCountsMap | null = null;

      setMarkingRead((prev) => new Set(prev).add(id));
      try {
        const target = notifications.find((n) => n.id === id);
        if (target && !target.read) {
          snapshot = notifications.slice();
          countsSnapshot = { ...categoryUnreadCounts };
          const cat = (target.category || "system").toLowerCase();
          setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
          );
          setCategoryUnreadCounts((prev) => {
            const next = { ...prev };
            next.all = Math.max(0, (next.all || 0) - 1);
            next.unread = Math.max(0, (next.unread || 0) - 1);
            if (typeof next[cat] === "number") next[cat] = Math.max(0, next[cat] - 1);
            return next;
          });
        }
        await markAsRead(id);
        toast.success("Marked as read");
        void refreshUnreadCounts();
      } catch (err: any) {
        console.error("Failed to mark notification as read:", err);
        if (snapshot) setNotifications(snapshot);
        if (countsSnapshot) setCategoryUnreadCounts(countsSnapshot);
        toast.error(err?.message || "Failed to mark as read");
      } finally {
        setMarkingRead((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [notifications, categoryUnreadCounts, markingRead, refreshUnreadCounts]
  );

  const markAllRead = useCallback(
    async (category?: NotificationCategory | string) => {
      if (markingAllRead) return;
      let notifSnapshot: Notification[] | null = null;
      let countsSnapshot: UnreadCountsMap | null = null;

      setMarkingAllRead(true);
      try {
        notifSnapshot = notifications.slice();
        countsSnapshot = { ...categoryUnreadCounts };

        // Optimistic UI
        if (!category || category === "all") {
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
          setCategoryUnreadCounts((prev) => ({ ...prev, all: 0, unread: 0 }));
        } else if (category === "unread") {
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
          setCategoryUnreadCounts((prev) => ({ ...prev, all: 0, unread: 0 }));
        } else {
          const cat = String(category).toLowerCase();
          setNotifications((prev) =>
            prev.map((n) =>
              (n.category || "system").toLowerCase() === cat ? { ...n, read: true } : n
            )
          );
          setCategoryUnreadCounts((prev) => {
            const next = { ...prev };
            if (typeof next[cat] === "number") {
              const removed = next[cat];
              next[cat] = 0;
              next.all = Math.max(0, (next.all || 0) - removed);
              next.unread = Math.max(0, (next.unread || 0) - removed);
            }
            return next;
          });
        }

        await markAllReadAdapter(category);
        toast.success(category && category !== "all" ? `Marked ${category} as read` : "All marked as read");
        void refreshUnreadCounts();
      } catch (err: any) {
        console.error("Failed to mark all as read:", err);
        if (notifSnapshot) setNotifications(notifSnapshot);
        if (countsSnapshot) setCategoryUnreadCounts(countsSnapshot);
        toast.error(err?.message || "Failed to mark all as read");
      } finally {
        setMarkingAllRead(false);
      }
    },
    [notifications, categoryUnreadCounts, markingAllRead, refreshUnreadCounts]
  );

  const removeNotification = useCallback(
    async (id: string) => {
      if (archiving.has(id)) return;
      let notifSnapshot: Notification[] | null = null;
      let countsSnapshot: UnreadCountsMap | null = null;

      setArchiving((prev) => new Set(prev).add(id));
      try {
        const target = notifications.find((n) => n.id === id);
        notifSnapshot = notifications.slice();
        countsSnapshot = { ...categoryUnreadCounts };

        setNotifications((prev) => prev.filter((n) => n.id !== id));
        knownIdsRef.current.delete(id);

        if (target && !target.read) {
          const cat = (target.category || "system").toLowerCase();
          setCategoryUnreadCounts((prev) => {
            const next = { ...prev };
            next.all = Math.max(0, (next.all || 0) - 1);
            next.unread = Math.max(0, (next.unread || 0) - 1);
            if (typeof next[cat] === "number") next[cat] = Math.max(0, next[cat] - 1);
            return next;
          });
        }

        await archiveNotification(id);
        toast.success("Notification archived");
        void refreshUnreadCounts();
      } catch (err: any) {
        console.error("Failed to archive notification:", err);
        if (notifSnapshot) {
          setNotifications(notifSnapshot);
          notifSnapshot.forEach((n) => knownIdsRef.current.add(n.id));
        }
        if (countsSnapshot) setCategoryUnreadCounts(countsSnapshot);
        toast.error(err?.message || "Failed to archive notification");
      } finally {
        setArchiving((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [notifications, categoryUnreadCounts, archiving, refreshUnreadCounts]
  );

  const hardDeleteNotification = useCallback(
    async (id: string) => {
      if (deleting.has(id)) return;
      let notifSnapshot: Notification[] | null = null;
      let countsSnapshot: UnreadCountsMap | null = null;

      setDeleting((prev) => new Set(prev).add(id));

      // Capture target BEFORE any state updates
      const target = notifications.find((n) => n.id === id);

      try {
        notifSnapshot = notifications.slice();
        countsSnapshot = { ...categoryUnreadCounts };

        // Optimistic remove from UI
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        knownIdsRef.current.delete(id);

        // Optimistically decrement unread counts only if it was unread
        if (target && !target.read) {
          const cat = (target.category || "system").toLowerCase();
          setCategoryUnreadCounts((prev) => {
            const next = { ...prev };
            next.all = Math.max(0, (next.all || 0) - 1);
            next.unread = Math.max(0, (next.unread || 0) - 1);
            if (typeof next[cat] === "number") next[cat] = Math.max(0, next[cat] - 1);
            return next;
          });
        }

        // Call the DELETE API endpoint
        await hardDeleteNotificationApi(id);
        toast.success("Notification deleted");

        // Sync counts from server after delete to ensure accuracy
        void refreshUnreadCounts();
      } catch (err: any) {
        console.error("Failed to delete notification:", err);
        // Rollback optimistic update
        if (notifSnapshot) {
          setNotifications(notifSnapshot);
          notifSnapshot.forEach((n) => knownIdsRef.current.add(n.id));
        }
        if (countsSnapshot) setCategoryUnreadCounts(countsSnapshot);
        toast.error(err?.message || "Failed to delete notification");
      } finally {
        setDeleting((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notifications, categoryUnreadCounts, deleting, refreshUnreadCounts]
  );

  const createNotification = useCallback(
    async (payload: CreateNotificationPayload) => {
      try {
        const newNotif = await createNotificationAdapter(payload);
        // Prepend into feed if it belongs to the current category
        const currentCategory = feedCategoryRef.current;
        const cat = (newNotif.category || "system").toLowerCase();
        const isInFeedCategory =
          currentCategory === "all" ||
          (currentCategory === "unread" && !newNotif.read) ||
          currentCategory === cat;

        if (isInFeedCategory && !knownIdsRef.current.has(newNotif.id)) {
          knownIdsRef.current.add(newNotif.id);
          setNotifications((prev) => [newNotif, ...prev]);
        }

        if (!newNotif.read) {
          void refreshUnreadCounts();
        }

        toast.success("Notification created");
      } catch (err: any) {
        console.error("Failed to create notification:", err);
        toast.error(err?.message || "Failed to create notification");
        throw err;
      }
    },
    [refreshUnreadCounts]
  );

  const bulkArchiveByIds = useCallback(
    async (ids: string[]) => {
      if (bulkArchiving || ids.length === 0) return;
      let notifSnapshot: Notification[] | null = null;
      let countsSnapshot: UnreadCountsMap | null = null;

      setBulkArchiving(true);
      try {
        notifSnapshot = notifications.slice();
        countsSnapshot = { ...categoryUnreadCounts };

        const targeted = notifications.filter((n) => ids.includes(n.id));
        setNotifications((prev) => prev.filter((n) => !ids.includes(n.id)));
        ids.forEach((id) => knownIdsRef.current.delete(id));

        let unreadRemovedTotal = 0;
        const unreadRemovedByCat: Record<string, number> = {};
        targeted.forEach((n) => {
          if (!n.read) {
            unreadRemovedTotal += 1;
            const cat = (n.category || "system").toLowerCase();
            unreadRemovedByCat[cat] = (unreadRemovedByCat[cat] || 0) + 1;
          }
        });
        if (unreadRemovedTotal > 0) {
          setCategoryUnreadCounts((prev) => {
            const next = { ...prev };
            next.all = Math.max(0, (next.all || 0) - unreadRemovedTotal);
            next.unread = Math.max(0, (next.unread || 0) - unreadRemovedTotal);
            Object.entries(unreadRemovedByCat).forEach(([cat, val]) => {
              if (typeof next[cat] === "number") next[cat] = Math.max(0, next[cat] - val);
            });
            return next;
          });
        }

        await bulkArchive({ ids });
        toast.success(`Archived ${ids.length} notification${ids.length === 1 ? "" : "s"}`);
        void refreshUnreadCounts();
      } catch (err: any) {
        console.error("Failed to bulk archive:", err);
        if (notifSnapshot) {
          setNotifications(notifSnapshot);
          notifSnapshot.forEach((n) => knownIdsRef.current.add(n.id));
        }
        if (countsSnapshot) setCategoryUnreadCounts(countsSnapshot);
        toast.error(err?.message || "Failed to archive notifications");
      } finally {
        setBulkArchiving(false);
      }
    },
    [notifications, categoryUnreadCounts, bulkArchiving, refreshUnreadCounts]
  );

  const bulkArchiveAllRead = useCallback(async () => {
    if (bulkArchiving) return;
    let notifSnapshot: Notification[] | null = null;
    let countsSnapshot: UnreadCountsMap | null = null;

    setBulkArchiving(true);
    try {
      notifSnapshot = notifications.slice();
      countsSnapshot = { ...categoryUnreadCounts };

      // Archive all read notifications (empty payload = archive all read on backend)
      // Optimistic: remove read notifications locally
      setNotifications((prev) => {
        const remaining = prev.filter((n) => !n.read);
        prev
          .filter((n) => n.read)
          .forEach((n) => knownIdsRef.current.delete(n.id));
        return remaining;
      });

      await bulkArchive({});
      toast.success("Archived read notifications");
      void refreshUnreadCounts();
    } catch (err: any) {
      console.error("Failed to bulk archive read notifications:", err);
      if (notifSnapshot) {
        setNotifications(notifSnapshot);
        notifSnapshot.forEach((n) => knownIdsRef.current.add(n.id));
      }
      if (countsSnapshot) setCategoryUnreadCounts(countsSnapshot);
      toast.error(err?.message || "Failed to archive read notifications");
    } finally {
      setBulkArchiving(false);
    }
  }, [notifications, categoryUnreadCounts, bulkArchiving, refreshUnreadCounts]);

  const toggleSound = useCallback(() => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setSoundEnabledState(next);
    if (next) {
      void playNotificationSound(true);
    }
  }, [soundEnabled]);

  const requestPush = useCallback(async () => {
    const status = await requestPushPermission();
    setPushPermission(status);
  }, []);

  const unreadCount =
    typeof categoryUnreadCounts.all === "number" ? categoryUnreadCounts.all : 0;

  const value: NotificationContextValue = {
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
    createNotification,
    bulkArchiveByIds,
    bulkArchiveAllRead,
    refresh: loadNotifications,
    fetchNextPage,
    refreshUnreadCounts,
    soundEnabled,
    toggleSound,
    pushPermission,
    requestPush,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}

