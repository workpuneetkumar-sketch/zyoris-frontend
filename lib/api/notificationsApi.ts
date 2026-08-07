import api from "@/lib/api/api";
import type { UnreadCountData, NotificationPreferences } from "@/types/notifications";

export interface NotificationDto {
  id: string;
  organizationId?: string | null;
  userId: string;
  title: string;
  message: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "ERROR" | string;
  category?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  groupKey?: string | null;
  aggregatedCount?: number | null;
  priority?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "URGENT" | string | null;
  actor?: { id: string; name: string; avatarUrl?: string } | null;
  read: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface CreateNotificationPayload {
  userId: string;
  title: string;
  message: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "ERROR" | string;
  entityType?: string;
  entityId?: string;
}

export interface FetchNotificationsResponse {
  limit: number;
  nextCursor: string | null;
  // Backend may return items under "data" or "notifications"
  data?: NotificationDto[];
  notifications?: NotificationDto[];
}

export const fetchNotifications = async (params?: {
  category?: string;
  unreadOnly?: boolean;
  limit?: number;
  cursor?: string;
}) => {
  const query: Record<string, unknown> = {
    limit: params?.limit ?? 20,
  };
  if (params?.cursor) query.cursor = params.cursor;
  if (params?.category && params.category !== "all" && params.category !== "unread") {
    query.category = params.category;
  }
  if (params?.unreadOnly === true || params?.category === "unread") {
    query.unreadOnly = true;
  }
  const response = await api.get<FetchNotificationsResponse>("/api/notifications", { params: query });
  return response.data;
};

export const createNotification = async (payload: CreateNotificationPayload) => {
  const response = await api.post<NotificationDto>("/api/notifications", payload);
  return response.data;
};

export const markNotificationAsRead = async (id: string) => {
  const response = await api.patch<NotificationDto>(`/api/notifications/${id}/read`);
  return response.data;
};

export const markAllNotificationsAsRead = async (category?: string) => {
  const params = category && category !== "all" && category !== "unread" ? { category } : undefined;
  const response = await api.patch("/api/notifications/read-all", undefined, { params });
  return response.data;
};

export const archiveNotification = async (id: string) => {
  const response = await api.patch<NotificationDto>(`/api/notifications/${id}/archive`);
  return response.data;
};

/** Hard-deletes a notification permanently (DELETE /api/notifications/{id}). */
export const deleteNotification = async (id: string): Promise<void> => {
  try {
    await api.delete(`/api/notifications/${id}`);
  } catch (err: any) {
    const message =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      "Failed to delete notification";
    throw new Error(message);
  }
};

export interface BulkArchivePayload {
  ids?: string[];
}

export const bulkArchiveNotifications = async (payload: BulkArchivePayload = {}) => {
  const response = await api.post("/api/notifications/bulk-archive", payload);
  return response.data;
};

export const fetchUnreadCounts = async (): Promise<UnreadCountData> => {
  const response = await api.get<UnreadCountData>("/api/notifications/unread-count");
  return response.data;
};

// Maps frontend category names → backend enum values for preferences API
const CATEGORY_TO_BACKEND: Record<string, string> = {
  leads:    "LEAD",
  messages: "WHATSAPP",   // closest multi-channel match; backend uses WHATSAPP/EMAIL/CALL
  deals:    "DEAL",
  tasks:    "TASK",
  system:   "SYSTEM",
};

const BACKEND_TO_CATEGORY: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_TO_BACKEND).map(([k, v]) => [v, k])
);

export const fetchNotificationPreferences = async (): Promise<NotificationPreferences> => {
  try {
    const response = await api.get<NotificationPreferences>("/api/notifications/preferences");
    const raw = response.data ?? {};
    // Remap backend keys (LEAD, DEAL…) to frontend keys (leads, deals…)
    const mapped: NotificationPreferences = {};
    Object.entries(raw).forEach(([k, v]) => {
      const frontKey = BACKEND_TO_CATEGORY[k] ?? k.toLowerCase();
      mapped[frontKey] = v;
    });
    return mapped;
  } catch (err: any) {
    if (err?.response?.status === 404) return {};
    throw err;
  }
};

export const updateNotificationPreferences = async (
  preferences: NotificationPreferences
): Promise<NotificationPreferences> => {
  // Remap frontend keys (leads, deals…) → backend enum keys (LEAD, DEAL…)
  const payload: NotificationPreferences = {};
  Object.entries(preferences).forEach(([k, v]) => {
    const backendKey = CATEGORY_TO_BACKEND[k] ?? k.toUpperCase();
    payload[backendKey] = v;
  });
  try {
    const response = await api.put<NotificationPreferences>(
      "/api/notifications/preferences",
      payload
    );
    const raw = response.data ?? payload;
    // Remap response back to frontend keys
    const mapped: NotificationPreferences = {};
    Object.entries(raw).forEach(([k, v]) => {
      const frontKey = BACKEND_TO_CATEGORY[k] ?? k.toLowerCase();
      mapped[frontKey] = v;
    });
    return mapped;
  } catch (err: any) {
    if (err?.response?.status === 404) return preferences;
    throw err;
  }
};
