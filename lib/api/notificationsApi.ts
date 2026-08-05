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
  offset?: number;
  cursor?: string | null;
  nextCursor?: string | null;
  data: NotificationDto[];
}

export const fetchNotifications = async (params?: {
  read?: string;
  category?: string;
  limit?: number;
  offset?: number;
  cursor?: string;
}) => {
  const response = await api.get<FetchNotificationsResponse>("/api/notifications", { params });
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

export const markAllNotificationsAsRead = async () => {
  const response = await api.patch("/api/notifications/read-all");
  return response.data;
};

/**
 * Soft delete / Archive notification via PATCH /notifications/:id/archive
 */
export const archiveNotification = async (id: string) => {
  try {
    const response = await api.patch<NotificationDto>(`/notifications/${id}/archive`);
    return response.data;
  } catch {
    const response = await api.patch<NotificationDto>(`/api/notifications/${id}/archive`);
    return response.data;
  }
};

export const deleteNotification = async (id: string) => {
  return archiveNotification(id);
};

/**
 * Fetch granular unread count per category via GET /notifications/unread-count
 */
export const fetchUnreadCounts = async (): Promise<UnreadCountData> => {
  try {
    const response = await api.get<UnreadCountData>("/notifications/unread-count");
    return response.data;
  } catch {
    const response = await api.get<UnreadCountData>("/api/notifications/unread-count");
    return response.data;
  }
};

/**
 * Fetch user notification preferences matrix via GET /notifications/preferences
 */
export const fetchNotificationPreferences = async (): Promise<NotificationPreferences> => {
  try {
    const response = await api.get<NotificationPreferences>("/notifications/preferences");
    return response.data;
  } catch {
    const response = await api.get<NotificationPreferences>("/api/notifications/preferences");
    return response.data;
  }
};

/**
 * Update user notification preferences matrix via PUT /notifications/preferences
 */
export const updateNotificationPreferences = async (
  preferences: NotificationPreferences
): Promise<NotificationPreferences> => {
  try {
    const response = await api.put<NotificationPreferences>("/notifications/preferences", preferences);
    return response.data;
  } catch {
    const response = await api.put<NotificationPreferences>("/api/notifications/preferences", preferences);
    return response.data;
  }
};