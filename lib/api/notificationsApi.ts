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
export const deleteNotification = async (id: string) => {
  await api.delete(`/api/notifications/${id}`);
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

export const fetchNotificationPreferences = async (): Promise<NotificationPreferences> => {
  const response = await api.get<NotificationPreferences>("/api/notifications/preferences");
  return response.data;
};

export const updateNotificationPreferences = async (
  preferences: NotificationPreferences
): Promise<NotificationPreferences> => {
  const response = await api.put<NotificationPreferences>(
    "/api/notifications/preferences",
    preferences
  );
  return response.data;
};
