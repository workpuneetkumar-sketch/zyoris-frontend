import type {
  Notification,
  NotificationCategory,
} from "@/types/notifications";
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  archiveNotification as archiveNotificationApi,
  dismissNotification as dismissNotificationApi,
  snoozeNotification as snoozeNotificationApi,
  deleteNotification as deleteNotificationApi,
  bulkArchiveNotifications,
  createNotification as createNotificationApi,
  type NotificationDto,
  type BulkArchivePayload,
  type CreateNotificationPayload,
} from "@/lib/api/notificationsApi";
import { backendToTab, tabToBackend } from "@/utils/notificationCategories";
import { deduplicateNotifications } from "@/utils/notificationDeduplication";

function mapCategory(dto: NotificationDto): NotificationCategory {
  return dto.category !== null && dto.category !== undefined
    ? backendToTab(dto.category)
    : backendToTab(dto.entityType);
}

function mapPriority(dto: NotificationDto): string {
  return dto.priority || "normal";
}

export function dtoToNotification(dto: NotificationDto): Notification {
  return {
    id: String(dto.id),
    organizationId: dto.organizationId,
    userId: dto.userId,
    title: dto.title || "Notification",
    message: dto.message || "",
    type: dto.type || "INFO",
    category: mapCategory(dto),
    priority: mapPriority(dto),
    entityType: dto.entityType,
    entityId: dto.entityId,
    metadata: dto.metadata,
    eventId: dto.eventId,
    action: dto.action,
    actorId: dto.actorId,
    actorName: dto.actorName,
    actorAvatar: dto.actorAvatar,
    createdAt: dto.createdAt || new Date().toISOString(),
    read: Boolean(dto.read),
    readAt: dto.readAt,
    archivedAt: dto.archivedAt,
    dismissedAt: dto.dismissedAt,
    snoozedUntil: dto.snoozedUntil,
    deepLink: dto.deepLink,
    actor: dto.actor
      ? {
          id: dto.actor.id,
          name: dto.actor.name,
          avatarUrl: dto.actor.avatarUrl,
        }
      : null,
    icon: null,
  };
}

export interface GetNotificationsResult {
  notifications: Notification[];
  nextCursor: string | null;
  hasMore: boolean;
  unreadCount: number;
}

/**
 * Robustly extracts notification array from any response shape.
 */
function extractRawList(response: any): any[] {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.data)) return response.data;
  if (Array.isArray(response.notifications)) return response.notifications;
  if (Array.isArray(response.items)) return response.items;
  if (Array.isArray(response.results)) return response.results;
  if (Array.isArray(response.rows)) return response.rows;
  if (Array.isArray(response.data?.data)) return response.data.data;
  if (Array.isArray(response.data?.notifications)) return response.data.notifications;
  if (Array.isArray(response.data?.items)) return response.data.items;
  if (Array.isArray(response.data?.results)) return response.data.results;
  if (Array.isArray(response.data?.rows)) return response.data.rows;

  if (response.data && typeof response.data === "object") {
    for (const val of Object.values(response.data)) {
      if (Array.isArray(val)) return val;
    }
  }
  for (const val of Object.values(response)) {
    if (Array.isArray(val)) return val;
  }
  return [];
}

function isArchivedNotification(notification: any): boolean {
  const val = notification?.archivedAt;
  if (!val) return false;
  if (val === "null" || val === "undefined" || val === "false" || val === false) return false;
  return true;
}

export async function getNotifications(params?: {
  category?: string;
  cursor?: string;
  limit?: number;
  unreadOnly?: boolean;
  priority?: string;
  includeArchived?: boolean;
}): Promise<GetNotificationsResult> {
  const response = await fetchNotifications({
    limit: params?.limit ?? 50,
    unreadOnly: params?.unreadOnly ?? params?.category === "unread",
    cursor: params?.cursor,
    priority: params?.priority,
    includeArchived: params?.includeArchived,
  });

  const rawList = extractRawList(response);

  const notifications = deduplicateNotifications(
    rawList
      .map(dtoToNotification)
      .filter((notification) =>
        params?.includeArchived === true
          ? isArchivedNotification(notification)
          : !isArchivedNotification(notification)
      )
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
  );

  const nextCursor =
    (response as any)?.pagination?.nextCursor ??
    (response as any)?.nextCursor ??
    (response as any)?.data?.pagination?.nextCursor ??
    null;

  const hasMore = Boolean(
    (response as any)?.pagination?.hasNext ??
    (response as any)?.hasMore ??
    (response as any)?.data?.pagination?.hasNext ??
    false
  );

  const unreadCount =
    typeof (response as any)?.unreadCount === "number"
      ? (response as any).unreadCount
      : typeof (response as any)?.data?.unreadCount === "number"
      ? (response as any).data.unreadCount
      : typeof (response as any)?.total === "number" && params?.unreadOnly
      ? (response as any).total
      : notifications.filter((n) => !n.read).length;

  return {
    notifications,
    nextCursor,
    hasMore,
    unreadCount,
  };
}

export async function markAsRead(id: string): Promise<void> {
  await markNotificationAsRead(id);
}

export async function markAllRead(category?: string): Promise<void> {
  const backendCategories = tabToBackend(category || "all");
  if (backendCategories.length === 0) {
    await markAllNotificationsAsRead();
    return;
  }
  await Promise.all(backendCategories.map((backendCategory) => markAllNotificationsAsRead(backendCategory)));
}

export async function archiveNotification(id: string): Promise<void> {
  await archiveNotificationApi(id);
}

// TODO: enable once backend confirms PATCH /:id/dismiss exists.
export async function dismissNotification(id: string): Promise<void> {
  await dismissNotificationApi(id);
}

// TODO: enable once backend confirms PATCH /:id/snooze exists.
export async function snoozeNotification(id: string, until: string): Promise<void> {
  await snoozeNotificationApi(id, until);
}

export async function hardDeleteNotification(id: string): Promise<void> {
  await deleteNotificationApi(id);
}

export const deleteNotification = hardDeleteNotification;

export async function bulkArchive(payload?: BulkArchivePayload): Promise<void> {
  await bulkArchiveNotifications(payload);
}

export async function createNotification(payload: CreateNotificationPayload): Promise<Notification> {
  const dto = await createNotificationApi(payload);
  return dtoToNotification(dto);
}
