"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import type { Notification, NotificationCategory } from "@/types/notifications";
import {
  getNotifications,
  markAsRead,
  markAllRead as markAllReadAdapter,
  archiveNotification,
  dtoToNotification,
} from "@/services/notificationAdapter";
import { fetchUnreadCounts } from "@/lib/api/notificationsApi";
import { useAuth } from "@/context/AuthContext";
import { playNotificationSound, isSoundEnabled, setSoundEnabled } from "@/lib/notificationSound";
import {
  getPushPermissionStatus,
  requestPushPermission,
  showBrowserNotification,
  type PushPermissionStatus,
} from "@/lib/browserPushPermission";

interface NotificationContextValue {
  notifications: Notification[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  unreadCount: number;
  categoryUnreadCounts: Record<string, number>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  fetchNextPage: () => Promise<void>;
  // Sound
  soundEnabled: boolean;
  toggleSound: () => void;
  // Browser push
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
  const [error, setError] = useState<string | null>(null);
  const [categoryUnreadCounts, setCategoryUnreadCounts] = useState<Record<string, number>>({
    all: 0,
    unread: 0,
    leads: 0,
    messages: 0,
    deals: 0,
    tasks: 0,
    system: 0,
  });

  const [soundEnabled, setSoundEnabledState] = useState(() => isSoundEnabled());
  const [pushPermission, setPushPermission] = useState<PushPermissionStatus>(() =>
    getPushPermissionStatus()
  );

  const knownIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);

  // Fetch granular unread count
  const loadUnreadCounts = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    try {
      const res = await fetchUnreadCounts();
      if (res && res.categories) {
        setCategoryUnreadCounts((prev) => ({
          ...prev,
          ...res.categories,
          all: res.total ?? res.categories.all ?? prev.all,
        }));
      }
    } catch {
      // Fallback: derive from state if API unavailable
    }
  }, [isAuthenticated, user]);

  // Load initial notifications (Cursor-based)
  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setNotifications([]);
      setLoading(false);
      setError(null);
      setHasMore(false);
      setNextCursor(null);
      knownIdsRef.current = new Set();
      isFirstLoadRef.current = true;
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await getNotifications({ limit: 20 });
      setNotifications(res.notifications);
      setNextCursor(res.nextCursor || null);
      setHasMore(Boolean(res.nextCursor));

      knownIdsRef.current = new Set(res.notifications.map((n) => n.id));
      isFirstLoadRef.current = false;
      void loadUnreadCounts();
    } catch (err: any) {
      console.error("Failed to load notifications:", err);
      setError(err.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user, loadUnreadCounts]);

  // Fetch next page via Cursor
  const fetchNextPage = useCallback(async () => {
    if (!isAuthenticated || !user || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await getNotifications({ cursor: nextCursor, limit: 20 });
      setNotifications((prev) => {
        const existingIds = new Set(prev.map((n) => n.id));
        const newItems = res.notifications.filter((n) => !existingIds.has(n.id));
        return [...prev, ...newItems];
      });
      setNextCursor(res.nextCursor || null);
      setHasMore(Boolean(res.nextCursor));
    } catch (err) {
      console.error("Failed to fetch next page of notifications:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [isAuthenticated, user, nextCursor, loadingMore]);

  // Initial load
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Active WebSocket Listeners for notification.created, notification.read, notification.archived, notification.count.updated
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

        // 1. Listen for notification.created
        socket.on("notification.created", (data: any) => {
          if (!isSubscribed) return;
          const newNotif: Notification = data.id && data.title ? (data as Notification) : dtoToNotification(data);

          setNotifications((prev) => {
            if (prev.some((n) => n.id === newNotif.id)) return prev;
            return [newNotif, ...prev];
          });

          // Update unread count state
          if (!newNotif.read) {
            setCategoryUnreadCounts((prev) => {
              const cat = (newNotif.category || "system").toLowerCase();
              return {
                ...prev,
                all: (prev.all || 0) + 1,
                unread: (prev.unread || 0) + 1,
                [cat]: (prev[cat] || 0) + 1,
              };
            });

            // Sound & Push
            void playNotificationSound();
            showBrowserNotification(newNotif.title, {
              body: newNotif.message,
              tag: `zyoris-notif-${newNotif.id}`,
            });
          }
        });

        // 2. Listen for notification.read
        socket.on("notification.read", (data: { id?: string; notificationId?: string }) => {
          if (!isSubscribed) return;
          const id = data.id || data.notificationId;
          if (!id) return;

          setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
          );
          void loadUnreadCounts();
        });

        // 3. Listen for notification.archived
        socket.on("notification.archived", (data: { id?: string; notificationId?: string }) => {
          if (!isSubscribed) return;
          const id = data.id || data.notificationId;
          if (!id) return;

          setNotifications((prev) => prev.filter((n) => n.id !== id));
          void loadUnreadCounts();
        });

        // 4. Listen for notification.count.updated
        socket.on("notification.count.updated", (data: any) => {
          if (!isSubscribed || !data) return;
          if (data.categories) {
            setCategoryUnreadCounts((prev) => ({
              ...prev,
              ...data.categories,
              all: data.total ?? data.categories.all ?? prev.all,
            }));
          }
        });
      } catch (wsErr) {
        console.warn("WebSocket connection unavailable, fallback active:", wsErr);
      }
    };

    void setupWebSockets();

    return () => {
      isSubscribed = false;
      if (socket) {
        socket.disconnect();
      }
    };
  }, [isAuthenticated, user, loadUnreadCounts]);

  const markRead = useCallback(async (id: string) => {
    try {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => {
          if (n.id === id && !n.read) {
            const cat = (n.category || "system").toLowerCase();
            setCategoryUnreadCounts((counts) => ({
              ...counts,
              all: Math.max(0, (counts.all || 0) - 1),
              unread: Math.max(0, (counts.unread || 0) - 1),
              [cat]: Math.max(0, (counts[cat] || 0) - 1),
            }));
            return { ...n, read: true };
          }
          return n;
        })
      );
      await markAsRead(id);
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
      void loadNotifications();
    }
  }, [loadNotifications]);

  const markAllRead = useCallback(async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setCategoryUnreadCounts({
        all: 0,
        unread: 0,
        leads: 0,
        messages: 0,
        deals: 0,
        tasks: 0,
        system: 0,
      });
      await markAllReadAdapter();
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
      void loadNotifications();
    }
  }, [loadNotifications]);

  const removeNotification = useCallback(async (id: string) => {
    try {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      knownIdsRef.current.delete(id);
      await archiveNotification(id);
      void loadUnreadCounts();
    } catch (err) {
      console.error("Failed to archive notification:", err);
      void loadNotifications();
    }
  }, [loadNotifications, loadUnreadCounts]);

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

  const unreadCount = categoryUnreadCounts.all ?? notifications.filter((n) => !n.read).length;

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
    refresh: loadNotifications,
    fetchNextPage,
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

