"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import type { Notification } from "@/types/notifications";
import {
  getNotifications,
  markAsRead,
  markAllRead as markAllReadAdapter,
  deleteNotification as deleteNotificationAdapter,
} from "@/services/notificationAdapter";
import { useAuth } from "@/context/AuthContext";
// import { useRealtimeNotifications } from "./useRealtimeNotifications"; // TODO: Re-enable when realtime is ready

interface NotificationContextValue {
  notifications: Notification[];
  loading: boolean;
  error: string | null;
  unreadCount: number;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // const realtime = useRealtimeNotifications(); // TODO: Re-enable

  const loadNotifications = useCallback(async () => {
    // This provider is mounted at the application root, including /login.
    // Do not call the protected notifications endpoint until a session exists.
    if (!isAuthenticated || !user) {
      setNotifications([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (err: any) {
      console.error("Failed to load notifications:", err);
      setError(err.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // TODO: Re-enable realtime handling when ready
  // useEffect(() => {
  //   const handleNewNotification = (e: any) => {
  //     const newNotif = e.detail;
  //     if (newNotif) {
  //       setNotifications((prev) => [newNotif, ...prev]);
  //     }
  //   };

  //   if (typeof window !== "undefined") {
  //     window.addEventListener("zyoris:notification-created", handleNewNotification);
  //     return () => window.removeEventListener("zyoris:notification-created", handleNewNotification);
  //   }
  // }, []);

  const markRead = useCallback(async (id: string) => {
    try {
      // Optimistic update
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      // TODO: realtime.markRead(id);
      await markAsRead(id);
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
      loadNotifications();
    }
  }, [loadNotifications]);

  const markAllRead = useCallback(async () => {
    try {
      // Optimistic update
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      // TODO: realtime.markAllRead();
      await markAllReadAdapter();
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
      loadNotifications();
    }
  }, [loadNotifications]);

  const removeNotification = useCallback(async (id: string) => {
    try {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      await deleteNotificationAdapter(id);
    } catch (err) {
      console.error("Failed to delete notification:", err);
      loadNotifications();
    }
  }, [loadNotifications]);

  // TODO: Merge with realtime notifications when ready
  // const mergedNotifications = useMemo(() => {
  //   const map = new Map<string, Notification>();
  //   notifications.forEach((n) => map.set(n.id, n));
  //   realtime.notifications.forEach((n) => {
  //     const existing = map.get(n.id);
  //     if (existing) {
  //       map.set(n.id, { ...existing, ...n, read: existing.read || n.read });
  //     } else {
  //       map.set(n.id, n);
  //     }
  //   });
  //   return Array.from(map.values()).sort(
  //     (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  //   );
  // }, [notifications, realtime.notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const value = {
    notifications,
    loading,
    error,
    unreadCount,
    markRead,
    markAllRead,
    removeNotification,
    refresh: loadNotifications,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
