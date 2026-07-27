"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import type { Notification } from "@/types/notifications";
import {
  getNotifications,
  markAsRead,
  markAllRead as markAllReadAdapter,
  deleteNotification as deleteNotificationAdapter,
} from "@/services/notificationAdapter";
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
  error: string | null;
  unreadCount: number;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  // Sound
  soundEnabled: boolean;
  toggleSound: () => void;
  // Browser push
  pushPermission: PushPermissionStatus;
  requestPush: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

// Polling interval — refetch notifications every 60 seconds
const POLL_INTERVAL_MS = 60_000;

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabledState] = useState(() => isSoundEnabled());
  const [pushPermission, setPushPermission] = useState<PushPermissionStatus>(() =>
    getPushPermissionStatus()
  );

  // Track previously seen notification IDs to detect new ones
  const knownIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setNotifications([]);
      setLoading(false);
      setError(null);
      knownIdsRef.current = new Set();
      isFirstLoadRef.current = true;
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getNotifications();
      setNotifications(data);

      // Detect new unread notifications (only after first load)
      if (!isFirstLoadRef.current) {
        const newUnread = data.filter(
          (n) => !n.read && !knownIdsRef.current.has(n.id)
        );
        if (newUnread.length > 0) {
          // Play sound for new notifications
          void playNotificationSound();
          // Show browser push for the latest new notification
          if (newUnread[0]) {
            showBrowserNotification(newUnread[0].title, {
              body: newUnread[0].message,
              tag: `zyoris-notif-${newUnread[0].id}`,
            });
          }
        }
      }

      // Update known IDs
      knownIdsRef.current = new Set(data.map((n) => n.id));
      isFirstLoadRef.current = false;
    } catch (err: any) {
      console.error("Failed to load notifications:", err);
      setError(err.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  // Initial load
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Polling for new notifications
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const timer = setInterval(() => {
      void loadNotifications();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isAuthenticated, user, loadNotifications]);

  const markRead = useCallback(async (id: string) => {
    try {
      // Optimistic update
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      await markAsRead(id);
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
      void loadNotifications();
    }
  }, [loadNotifications]);

  const markAllRead = useCallback(async () => {
    try {
      // Optimistic update
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      await markAllReadAdapter();
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
      void loadNotifications();
    }
  }, [loadNotifications]);

  const removeNotification = useCallback(async (id: string) => {
    try {
      // Optimistic update
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      knownIdsRef.current.delete(id);
      await deleteNotificationAdapter(id);
    } catch (err) {
      console.error("Failed to delete notification:", err);
      void loadNotifications();
    }
  }, [loadNotifications]);

  // Sound toggle
  const toggleSound = useCallback(() => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setSoundEnabledState(next);
    if (next) {
      void playNotificationSound(true);
    }
  }, [soundEnabled]);

  // Browser push permission
  const requestPush = useCallback(async () => {
    const status = await requestPushPermission();
    setPushPermission(status);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const value: NotificationContextValue = {
    notifications,
    loading,
    error,
    unreadCount,
    markRead,
    markAllRead,
    removeNotification,
    refresh: loadNotifications,
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
