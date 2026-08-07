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
  deepLink?: string | null;
  groupKey?: string | null;
  aggregatedCount?: number | null;
  priority?: "normal" | "reminder" | "critical" | string | null;
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
  total: number;
  unreadCount: number;
  limit: number;
  offset: number;
  data: NotificationDto[];
}

export const fetchNotifications = async (params?: {
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
}) => {
  const query: Record<string, unknown> = {
    limit: params?.limit ?? 20,
    offset: params?.offset ?? 0,
  };
  // Filter to unread only if requested
  if (params?.unreadOnly === true) {
    query.read = false;
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

export const markAllNotificationsAsRead = async (_category?: string) => {
  const response = await api.patch("/api/notifications/read-all");
  return response.data;
};

/** Archive = delete (no dedicated archive endpoint on this API) */
export const archiveNotification = async (id: string): Promise<void> => {
  await deleteNotification(id);
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

/** Bulk archive = bulk delete (no dedicated bulk-archive endpoint on this API) */
export const bulkArchiveNotifications = async (payload: BulkArchivePayload = {}): Promise<void> => {
  if (payload.ids && payload.ids.length > 0) {
    await Promise.all(payload.ids.map((id) => deleteNotification(id)));
  }
  // empty payload = "archive all read" — no-op since we have no bulk endpoint
};

/**
 * Derives unread counts from a fresh fetch of the notification feed.
 * The GET /api/notifications response includes a top-level `unreadCount`.
 */
export const fetchUnreadCounts = async (): Promise<UnreadCountData> => {
  const response = await fetchNotifications({ limit: 1, offset: 0 });
  return {
    total: response.unreadCount ?? 0,
    byCategory: {},
  } as UnreadCountData;
};

// Maps frontend category names → backend enum values for preferences API
const CATEGORY_TO_BACKEND: Record<string, string> = {
  leads:    "LEAD",
  messages: "WHATSAPP",
  deals:    "DEAL",
  tasks:    "TASK",
  system:   "SYSTEM",
};

const BACKEND_TO_CATEGORY: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_TO_BACKEND).map(([k, v]) => [v, k])
);

/** Preferences are not supported by this API — return empty object */
export const fetchNotificationPreferences = async (): Promise<NotificationPreferences> => {
  return {};
};

/** Preferences are not supported by this API — no-op */
export const updateNotificationPreferences = async (
  preferences: NotificationPreferences
): Promise<NotificationPreferences> => {
  return preferences;
};
