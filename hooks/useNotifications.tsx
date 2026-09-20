"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "@/context/AuthContext";
import { getEffectiveAuthToken } from "@/lib/api/api";
import { fetchUnreadCounts, type NotificationDto } from "@/lib/api/notificationsApi";
import {
  archiveNotification,
  bulkArchive,
  createNotification as createNotificationAdapter,
  dtoToNotification,
  getNotifications,
  hardDeleteNotification,
  markAllRead as markAllReadAdapter,
  markAsRead,
} from "@/services/notificationAdapter";
import type { CreateNotificationPayload } from "@/lib/api/notificationsApi";
import type { Notification, NotificationCategory } from "@/types/notifications";
import { backendToTab, tabToBackend } from "@/utils/notificationCategories";

export type NotificationConnectionStatus = "connecting" | "connected" | "offline";
type NotificationListener = (notification: Notification) => void;
type Counts = Record<string, number>;

interface NotificationContextValue {
  notifications: Notification[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  unreadCount: number;
  categoryUnreadCounts: Counts;
  realtimeStatus: NotificationConnectionStatus;
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
  subscribeToNewNotifications: (listener: NotificationListener) => () => void;
}

const EMPTY_COUNTS: Counts = { all: 0, unread: 0, leads: 0, messages: 0, deals: 0, tasks: 0, system: 0 };
const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

function countsFromServer(total: number, byCategory: Record<string, number>): Counts {
  const counts: Counts = { ...EMPTY_COUNTS, all: total, unread: total };
  Object.entries(byCategory).forEach(([key, value]) => {
    const target = backendToTab(key);
    counts[target] += value;
  });
  return counts;
}

function isNotificationDto(value: unknown): value is NotificationDto {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<NotificationDto>;
  return typeof candidate.id === "string" && typeof candidate.userId === "string" &&
    typeof candidate.title === "string" && typeof candidate.message === "string" &&
    typeof candidate.createdAt === "string" && typeof candidate.read === "boolean";
}

function getEventNotification(value: unknown): Notification | null {
  return isNotificationDto(value) ? dtoToNotification(value) : null;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categoryUnreadCounts, setCategoryUnreadCounts] = useState<Counts>(EMPTY_COUNTS);
  const [realtimeStatus, setRealtimeStatus] = useState<NotificationConnectionStatus>("offline");
  const listeners = useRef(new Set<NotificationListener>());
  const knownIds = useRef(new Set<string>());
  const countRefreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstPageInFlight = useRef(false);
  const firstPageLoaded = useRef(false);
  const lastFirstPageLoadAt = useRef(0);
  const notificationCount = useRef(0);

  const refreshUnreadCounts = useCallback(async () => {
    if (!isAuthenticated || !userId) return;
    try {
      const result = await fetchUnreadCounts();
      setCategoryUnreadCounts(countsFromServer(result.total, result.byCategory));
    } catch {
      setRealtimeStatus((status) => status === "connected" ? status : "offline");
    }
  }, [isAuthenticated, userId]);

  const loadFirstPage = useCallback(async (force = false) => {
    if (!isAuthenticated || !userId) {
      setNotifications([]);
      knownIds.current.clear();
      setHasMore(false);
      setNextCursor(null);
      setError(null);
      firstPageLoaded.current = false;
      notificationCount.current = 0;
      return;
    }
    const now = Date.now();
    if (firstPageInFlight.current || (!force && firstPageLoaded.current && now - lastFirstPageLoadAt.current < 3000)) return;
    firstPageInFlight.current = true;
    if (!firstPageLoaded.current && notificationCount.current === 0) setLoading(true);
    if (notificationCount.current === 0) setError(null);
    try {
      const result = await getNotifications({ limit: 20 });
      setNotifications(result.notifications);
      notificationCount.current = result.notifications.length;
      knownIds.current = new Set(result.notifications.map((notification) => notification.id));
      setNextCursor(result.nextCursor);
      setHasMore(result.hasMore);
      firstPageLoaded.current = true;
      lastFirstPageLoadAt.current = Date.now();
      await refreshUnreadCounts();
    } catch (cause: unknown) {
      if (notificationCount.current === 0) {
        setError(cause instanceof Error ? cause.message : "Failed to load notifications");
      }
    } finally {
      firstPageInFlight.current = false;
      setLoading(false);
    }
  }, [isAuthenticated, userId, refreshUnreadCounts]);

  const fetchNextPage = useCallback(async () => {
    if (!isAuthenticated || !userId || !hasMore || loadingMore || !nextCursor) return;
    setLoadingMore(true);
    try {
      const result = await getNotifications({ cursor: nextCursor, limit: 20 });
      setNotifications((current) => {
        const existing = new Set(current.map((notification) => notification.id));
        const additions = result.notifications.filter((notification) => !existing.has(notification.id));
        additions.forEach((notification) => knownIds.current.add(notification.id));
        return [...current, ...additions];
      });
      setNextCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch {
      setError("Failed to load more notifications");
    } finally {
      setLoadingMore(false);
    }
  }, [isAuthenticated, userId, hasMore, loadingMore, nextCursor]);

  const scheduleCountRefresh = useCallback(() => {
    if (countRefreshTimer.current) clearTimeout(countRefreshTimer.current);
    countRefreshTimer.current = setTimeout(() => void refreshUnreadCounts(), 300);
  }, [refreshUnreadCounts]);

  useEffect(() => { void loadFirstPage(); }, [loadFirstPage]);

  useEffect(() => {
    notificationCount.current = notifications.length;
  }, [notifications]);

  useEffect(() => {
    if (!isAuthenticated || !userId || typeof window === "undefined") return;
    const url = (process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/+$/, "");
    if (!url) return;

    setRealtimeStatus("connecting");
    const socket = io(url, { auth: (callback) => callback({ token: getEffectiveAuthToken() }), reconnection: true, transports: ["websocket", "polling"] });
    const isMine = (notification: Notification) => notification.userId === userId;

    socket.on("connect", () => {
      setRealtimeStatus("connected");
      void loadFirstPage();
      void refreshUnreadCounts();
    });
    socket.on("disconnect", () => setRealtimeStatus("offline"));
    socket.on("connect_error", () => setRealtimeStatus("offline"));
    socket.on("notification.created", (payload: unknown) => {
      const notification = getEventNotification(payload);
      if (!notification || !isMine(notification) || knownIds.current.has(notification.id)) return;
      knownIds.current.add(notification.id);
      setNotifications((current) => [notification, ...current.filter((item) => item.id !== notification.id)]);
      if (!notification.read) listeners.current.forEach((listener) => listener(notification));
      scheduleCountRefresh();
    });
    socket.on("notification.read", (payload: unknown) => {
      const notification = getEventNotification(payload);
      if (!notification || !isMine(notification)) return;
      setNotifications((current) => current.map((item) => item.id === notification.id ? notification : item));
      scheduleCountRefresh();
    });
    socket.on("notification.archived", (payload: unknown) => {
      const notification = getEventNotification(payload);
      if (!notification || !isMine(notification)) return;
      setNotifications((current) => current.filter((item) => item.id !== notification.id));
      knownIds.current.delete(notification.id);
      scheduleCountRefresh();
    });
    socket.on("notification.count.updated", (payload: unknown) => {
      if (payload && typeof payload === "object" && (payload as { userId?: unknown }).userId === userId) {
        scheduleCountRefresh();
      }
    });

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void loadFirstPage();
        void refreshUnreadCounts();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      socket.disconnect();
      setRealtimeStatus("offline");
    };
  }, [isAuthenticated, userId, loadFirstPage, refreshUnreadCounts, scheduleCountRefresh]);

  const updateUnreadLocally = useCallback((notification: Notification, delta: number) => {
    if (notification.read) return;
    setCategoryUnreadCounts((current) => {
      const category = backendToTab(notification.category);
      return { ...current, all: Math.max(0, current.all + delta), unread: Math.max(0, current.unread + delta), [category]: Math.max(0, current[category] + delta) };
    });
  }, []);

  const markRead = useCallback(async (id: string) => {
    const target = notifications.find((notification) => notification.id === id);
    if (!target || target.read) return;
    setNotifications((current) => current.map((notification) => notification.id === id ? { ...notification, read: true } : notification));
    updateUnreadLocally(target, -1);
    try { await markAsRead(id); void refreshUnreadCounts(); }
    catch (cause: unknown) {
      setNotifications((current) => current.map((notification) => notification.id === id ? target : notification));
      updateUnreadLocally(target, 1);
      throw cause;
    }
  }, [notifications, updateUnreadLocally, refreshUnreadCounts]);

  const markAllRead = useCallback(async (category?: NotificationCategory | string) => {
    const normalizedCategory = category?.toLowerCase();
    const backendCategories = tabToBackend(normalizedCategory || "all");
    const affected = notifications.filter((notification) => !notification.read && (!normalizedCategory || normalizedCategory === "all" || normalizedCategory === "unread" || backendCategories.length > 0 && backendToTab(notification.category) === normalizedCategory));
    if (affected.length === 0) return;
    setNotifications((current) => current.map((notification) => affected.some((item) => item.id === notification.id) ? { ...notification, read: true } : notification));
    affected.forEach((notification) => updateUnreadLocally(notification, -1));
    try { await markAllReadAdapter(category); void refreshUnreadCounts(); }
    catch (cause: unknown) {
      setNotifications((current) => current.map((notification) => affected.some((item) => item.id === notification.id) ? { ...notification, read: false } : notification));
      affected.forEach((notification) => updateUnreadLocally(notification, 1));
      throw cause;
    }
  }, [notifications, updateUnreadLocally, refreshUnreadCounts]);

  const removeNotification = useCallback(async (id: string) => {
    const target = notifications.find((notification) => notification.id === id);
    if (!target) return;
    setNotifications((current) => current.filter((notification) => notification.id !== id));
    knownIds.current.delete(id);
    updateUnreadLocally(target, -1);
    try { await archiveNotification(id); void refreshUnreadCounts(); }
    catch (cause: unknown) {
      setNotifications((current) => [target, ...current]);
      knownIds.current.add(id);
      updateUnreadLocally(target, 1);
      throw cause;
    }
  }, [notifications, updateUnreadLocally, refreshUnreadCounts]);

  const hardDelete = useCallback(async (id: string) => {
    await hardDeleteNotification(id);
    setNotifications((current) => current.filter((notification) => notification.id !== id));
    knownIds.current.delete(id);
    void refreshUnreadCounts();
  }, [refreshUnreadCounts]);

  const bulkArchiveByIds = useCallback(async (ids: string[]) => {
    const snapshot = notifications;
    const removed = snapshot.filter((notification) => ids.includes(notification.id));
    setNotifications((current) => current.filter((notification) => !ids.includes(notification.id)));
    removed.forEach((notification) => { knownIds.current.delete(notification.id); updateUnreadLocally(notification, -1); });
    try { await bulkArchive({ ids }); void refreshUnreadCounts(); }
    catch (cause: unknown) {
      setNotifications(snapshot);
      removed.forEach((notification) => { knownIds.current.add(notification.id); updateUnreadLocally(notification, 1); });
      throw cause;
    }
  }, [notifications, updateUnreadLocally, refreshUnreadCounts]);

  const bulkArchiveAllRead = useCallback(async () => {
    const snapshot = notifications;
    const removed = snapshot.filter((notification) => notification.read);
    setNotifications((current) => current.filter((notification) => !notification.read));
    removed.forEach((notification) => knownIds.current.delete(notification.id));
    try { await bulkArchive(); void refreshUnreadCounts(); }
    catch (cause: unknown) {
      setNotifications(snapshot);
      removed.forEach((notification) => knownIds.current.add(notification.id));
      throw cause;
    }
  }, [notifications, refreshUnreadCounts]);

  const createNotification = useCallback(async (payload: CreateNotificationPayload) => {
    const notification = await createNotificationAdapter(payload);
    if (!knownIds.current.has(notification.id)) {
      knownIds.current.add(notification.id);
      setNotifications((current) => [notification, ...current]);
    }
    void refreshUnreadCounts();
  }, [refreshUnreadCounts]);

  const subscribeToNewNotifications = useCallback((listener: NotificationListener) => {
    listeners.current.add(listener);
    return () => listeners.current.delete(listener);
  }, []);

  const value: NotificationContextValue = {
    notifications, loading, loadingMore, hasMore, error,
    unreadCount: categoryUnreadCounts.all, categoryUnreadCounts, realtimeStatus,
    markRead, markAllRead, removeNotification, hardDeleteNotification: hardDelete,
    createNotification, bulkArchiveByIds, bulkArchiveAllRead,
    refresh: () => loadFirstPage(true), fetchNextPage, refreshUnreadCounts, subscribeToNewNotifications,
  };
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications must be used within a NotificationProvider");
  return context;
}

export function useNotificationSubscription(listener: NotificationListener): void {
  const { subscribeToNewNotifications } = useNotifications();
  useEffect(() => subscribeToNewNotifications(listener), [listener, subscribeToNewNotifications]);
}