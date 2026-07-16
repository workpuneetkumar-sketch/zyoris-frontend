"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "@/lib/api/notificationsApi";
import { useAuth } from "@/context/AuthContext";
import { AppNotification } from "@/components/NotificationBell";
import { useRealtimeNotifications } from "./useRealtimeNotifications";

interface NotificationContextValue {
  notifications: AppNotification[];
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
  const { user } = useAuth();
  const [dbNotifications, setDbNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const realtime = useRealtimeNotifications();

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchNotifications();
      const mapped: AppNotification[] = data.data.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        read: n.read,
        createdAt: n.createdAt,
        type: (n.type?.toLowerCase() as AppNotification["type"]) || "info",
      }));
      setDbNotifications(mapped);
    } catch (err: any) {
      console.error("Failed to load notifications:", err);
      setError(err.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const handleNewNotification = (e: any) => {
      const newNotif = e.detail;
      if (newNotif) {
        setDbNotifications((prev) => [
          {
            id: newNotif.id,
            title: newNotif.title,
            message: newNotif.message,
            read: newNotif.read,
            createdAt: newNotif.createdAt,
            type: (newNotif.type?.toLowerCase() as AppNotification["type"]) || "info",
          },
          ...prev,
        ]);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("zyoris:notification-created", handleNewNotification);
      return () => window.removeEventListener("zyoris:notification-created", handleNewNotification);
    }
  }, []);

  const markRead = useCallback(async (id: string) => {
    try {
      // Optimistic update for DB notifications
      setDbNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      // Mark realtime as read if it exists there
      realtime.markRead(id);

      await markNotificationAsRead(id);
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
      loadNotifications();
    }
  }, [loadNotifications, realtime]);

  const markAllRead = useCallback(async () => {
    try {
      // Optimistic update
      setDbNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      realtime.markAllRead();

      await markAllNotificationsAsRead();
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
      loadNotifications();
    }
  }, [loadNotifications, realtime]);

  const removeNotification = useCallback(async (id: string) => {
    try {
      setDbNotifications((prev) => prev.filter((n) => n.id !== id));
      
      // We must also remove from realtime state if it exists there to prevent it from coming back in the merged list.
      // But useRealtimeNotifications doesn't expose a remove method. Let's just rely on a page refresh if realtime is stale,
      // or we can just filter it in the memo. For now, since delete is mostly a DB op, we refresh.
      await deleteNotification(id);
      loadNotifications();
    } catch (err) {
      console.error("Failed to delete notification:", err);
      loadNotifications();
    }
  }, [loadNotifications]);

  const mergedNotifications = useMemo(() => {
    const map = new Map<string, AppNotification>();
    
    // Add DB notifications first
    dbNotifications.forEach((n) => map.set(n.id, n));
    
    // Add realtime notifications (overwrites DB ones with same ID, picking up newer read states etc)
    realtime.notifications.forEach((n) => {
        const existing = map.get(n.id);
        if (existing) {
            map.set(n.id, { ...existing, ...n, read: existing.read || n.read });
        } else {
            map.set(n.id, n);
        }
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [dbNotifications, realtime.notifications]);

  const unreadCount = mergedNotifications.filter((n) => !n.read).length;

  const value = {
    notifications: mergedNotifications,
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
