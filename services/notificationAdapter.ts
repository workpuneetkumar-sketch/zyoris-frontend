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
    id: dto.id,
    organizationId: dto.organizationId,
    userId: dto.userId,
    title: dto.title,
    message: dto.message,
    type: dto.type,
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
    createdAt: dto.createdAt,
    read: dto.read,
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

export async function getNotifications(params?: {
  category?: string;
  cursor?: string;
  limit?: number;
  unreadOnly?: boolean;
  priority?: string;
  includeArchived?: boolean;
}): Promise<GetNotificationsResult> {
  const response = await fetchNotifications({
    limit: params?.limit ?? 20,
    unreadOnly: params?.unreadOnly ?? params?.category === "unread",
    cursor: params?.cursor,
    priority: params?.priority,
    includeArchived: params?.includeArchived,
  });
  const notifications = response.data
    .map(dtoToNotification)
    .filter((notification) => params?.includeArchived !== true || (
      notification.archivedAt !== null && notification.archivedAt !== undefined
    ))
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  return {
    notifications,
    nextCursor: response.pagination.nextCursor,
    hasMore: response.pagination.hasNext,
    unreadCount: response.unreadCount,
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

// TODO: enable once backend confirms PATCH /:id/snooze exists. This only changes
// notification visibility and must never reschedule the linked business record.
export async function snoozeNotification(id: string, until: string): Promise<void> {
  await snoozeNotificationApi(id, until);
}

/** Permanently hard-deletes a notification via DELETE /api/notifications/{id}. */
export async function hardDeleteNotification(id: string): Promise<void> {
  await deleteNotificationApi(id);
}

export async function deleteNotification(id: string): Promise<void> {
  await archiveNotificationApi(id);
}

export async function bulkArchive(payload: BulkArchivePayload = {}): Promise<void> {
  await bulkArchiveNotifications(payload);
}

export async function createNotification(
  payload: CreateNotificationPayload
): Promise<Notification> {
  const dto = await createNotificationApi(payload);
  return dtoToNotification(dto);
}
