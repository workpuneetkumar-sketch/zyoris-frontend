// hooks/useRealtimeNotifications.ts
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getRealtimeService, destroyRealtimeService } from "@/lib/api/realtimeService";
import { RealtimeEvent, ConnectionStatus } from "@/types/realtimeNotifications";
import type { Notification, NotificationType } from "@/types/notifications";

const MAX_NOTIFICATIONS = 50;

function realtimeEventToNotification(event: RealtimeEvent): Notification {
  const typeMap: Record<string, NotificationType> = {
    lead_updated: "INFO",
    lead_assigned: "INFO",
    lead_merged: "SUCCESS",
    deal_stage_changed: "SUCCESS",
    activity_created: "INFO",
    analytics_refreshed: "INFO",
    dashboard_refreshed: "INFO",
    assignment_changed: "WARNING",
    merge_completed: "SUCCESS",
  };

  return {
    id: event.id,
    userId: event.userId ?? "",
    title: event.title,
    message: event.message,
    read: false,
    createdAt: event.timestamp,
    type: typeMap[event.type] ?? "info",
    priority: "medium",
  };
}

export function useRealtimeNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const serviceRef = useRef<ReturnType<typeof getRealtimeService> | null>(null);

  const handleNewEvent = useCallback((event: RealtimeEvent) => {
    const notification = realtimeEventToNotification(event);
    setNotifications((prev) => {
      const next = [notification, ...prev];
      return next.slice(0, MAX_NOTIFICATIONS);
    });

    // Trigger dashboard / widget refresh
    if (["analytics_refreshed", "dashboard_refreshed"].includes(event.type)) {
      setRefreshTrigger((n) => n + 1);
    }
  }, []);

  useEffect(() => {
    const service = getRealtimeService({
      onEvent: handleNewEvent,
      onConnect: () => setStatus("connected"),
      onDisconnect: () => setStatus("disconnected"),
    });
    serviceRef.current = service;
    service.connect();

    const unsubscribe = service.onStatusChange((s) => setStatus(s));

    return () => {
      unsubscribe();
      // Don't destroy the singleton on component unmount — just unsubscribe
    };
  }, [handleNewEvent]);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    status,
    refreshTrigger,
    markRead,
    markAllRead,
    clearAll,
  };
}
