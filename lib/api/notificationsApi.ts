import api from "@/lib/api/api";
import type { NotificationPreferences, NotificationCategoryPreferences, UnreadCountData } from "@/types/notifications";

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
  offset?: number;
  limit?: number;
}): Promise<FetchNotificationsResponse> => {
  const query: Record<string, unknown> = {
    limit: params?.limit ?? 50,
  };
  if (params?.read !== undefined) query.read = params.read;
  if (params?.unreadOnly === true) {
    query.unreadOnly = true;
    query.read = false;
  }
  if (params?.priority) query.priority = params.priority;
  if (params?.category) query.category = params.category;
  if (params?.includeArchived !== undefined) query.includeArchived = params.includeArchived;
  if (params?.cursor) query.cursor = params.cursor;
  if (params?.offset !== undefined) query.offset = params.offset;
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

/**
 * GET /api/notifications/preferences
 * Returns the per-category channel matrix: { leads: { inApp, email, push, sound }, … }
 * Backend also returns quietHours and dnd — we extract only the preferences matrix here.
 *
 * Backend category keys are uppercase (LEAD, DEAL, TASK, SYSTEM, …).
 * We normalise them to lowercase UI keys (lead→lead, etc.) for the UI matrix.
 */
export const fetchNotificationPreferences = async (): Promise<NotificationPreferences> => {
  try {
    const response = await api.get<{
      preferences: Record<string, NotificationCategoryPreferences>;
      quietHours?: unknown;
      dnd?: boolean;
    }>("/api/notifications/preferences");
    const raw = response.data?.preferences ?? {};
    // Normalise keys: backend sends uppercase, UI uses lowercase
    const normalised: NotificationPreferences = {};
    Object.entries(raw).forEach(([k, v]) => {
      normalised[k.toLowerCase()] = v;
    });
    return normalised;
  } catch {
    // Non-fatal: fall back to defaults so the UI still renders
    return {};
  }
};

/**
 * PUT /api/notifications/preferences
 * Accepts the full or partial category matrix.
 * Backend requires uppercase category keys (LEAD, DEAL, TASK, SYSTEM, …).
 * Maps: leads→LEAD, messages→MESSAGE, deals→DEAL, tasks→TASK, system→SYSTEM.
 */
const FE_TO_BE_CATEGORY: Record<string, string> = {
  leads:    "LEAD",
  messages: "MESSAGE",
  deals:    "DEAL",
  tasks:    "TASK",
  system:   "SYSTEM",
};

export const updateNotificationPreferences = async (
  preferences: NotificationPreferences
): Promise<NotificationPreferences> => {
  // Map UI lowercase keys → backend uppercase enum values
  const payload: Record<string, NotificationCategoryPreferences> = {};
  Object.entries(preferences).forEach(([k, v]) => {
    const beKey = FE_TO_BE_CATEGORY[k] ?? k.toUpperCase();
    payload[beKey] = v;
  });
  const response = await api.put<{ preferences: Record<string, NotificationCategoryPreferences> }>(
    "/api/notifications/preferences",
    payload
  );
  // Normalise response back to lowercase for the UI
  const raw = response.data?.preferences ?? payload;
  const normalised: NotificationPreferences = {};
  Object.entries(raw).forEach(([k, v]) => {
    normalised[k.toLowerCase()] = v;
  });
  return normalised;
};
