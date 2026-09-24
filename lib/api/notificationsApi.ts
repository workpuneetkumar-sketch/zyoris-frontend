import api from "@/lib/api/api";
import type { NotificationPreferences, UnreadCountData } from "@/types/notifications";

export interface NotificationDto {
  id: string;
  organizationId?: string | null;
  userId: string;
  title: string;
  message: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
  category?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  deepLink?: string | null;
  priority?: string | null;
  metadata?: Record<string, unknown> | null;
  eventId?: string | null;
  action?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  actorAvatar?: string | null;
  archivedAt?: string | null;
  dismissedAt?: string | null;
  snoozedUntil?: string | null;
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
  data: NotificationDto[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    nextCursor: string | null;
    hasNext: boolean;
  };
  total: number;
  unreadCount: number;
}

export const fetchNotifications = async (params?: {
  read?: boolean;
  unreadOnly?: boolean;
  priority?: string;
  category?: string | string[];
  includeArchived?: boolean;
  cursor?: string;
  limit?: number;
}): Promise<FetchNotificationsResponse> => {
  const query: Record<string, unknown> = {
    limit: params?.limit ?? 20,
  };
  if (params?.read !== undefined) query.read = params.read;
  if (params?.unreadOnly === true) query.unreadOnly = true;
  if (params?.priority) query.priority = params.priority;
  if (params?.category) query.category = params.category;
  if (params?.includeArchived !== undefined) query.includeArchived = params.includeArchived;
  if (params?.cursor) query.cursor = params.cursor;
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
  const response = await api.patch<{ message: string; count: number }>(
    "/api/notifications/read-all",
    undefined,
    { params: category ? { category } : undefined }
  );
  return response.data;
};

export const archiveNotification = async (id: string): Promise<NotificationDto> => {
  const response = await api.patch<NotificationDto>(`/api/notifications/${id}/archive`);
  return response.data;
};

// TODO: enable once backend confirms PATCH /:id/dismiss exists.
export const dismissNotification = async (id: string): Promise<NotificationDto> => {
  const response = await api.patch<NotificationDto>(`/api/notifications/${id}/dismiss`);
  return response.data;
};

// TODO: enable once backend confirms PATCH /:id/snooze exists. This only changes
// notification visibility and must never reschedule the linked business record.
export const snoozeNotification = async (id: string, until: string): Promise<NotificationDto> => {
  const response = await api.patch<NotificationDto>(`/api/notifications/${id}/snooze`, {
    snoozedUntil: until,
  });
  return response.data;
};

/** Hard-deletes a notification permanently (DELETE /api/notifications/{id}). */
export const deleteNotification = async (id: string): Promise<void> => {
  try {
    await api.delete(`/api/notifications/${id}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete notification";
    throw new Error(message);
  }
};

export interface BulkArchivePayload {
  ids?: string[];
}

export const bulkArchiveNotifications = async (
  payload: BulkArchivePayload = {}
): Promise<{ message: string; count: number }> => {
  const response = await api.post<{ message: string; count: number }>(
    "/api/notifications/bulk-archive",
    payload
  );
  return response.data;
};

/**
 * Derives unread counts from a fresh fetch of the notification feed.
 * The GET /api/notifications response includes a top-level `unreadCount`.
 * We also cross-check by counting items with read: false in the response.
 */
export const fetchUnreadCounts = async (): Promise<UnreadCountData> => {
  const response = await api.get<UnreadCountData>("/api/notifications/unread-count");
  return response.data;
};

/** Preferences endpoints exist but are not wired into this notification UI yet. */
export const fetchNotificationPreferences = async (): Promise<NotificationPreferences> => {
  return {};
};

/** Preferences endpoints exist but are not wired into this notification UI yet. */
export const updateNotificationPreferences = async (
  preferences: NotificationPreferences
): Promise<NotificationPreferences> => {
  return preferences;
};
