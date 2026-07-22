import type { Notification, NotificationType } from "@/types/notifications";
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification as deleteNotificationApi,
  type NotificationDto,
} from "@/lib/api/notificationsApi";

// Map API types to app types and generate deep links
function getNotificationTypeAndDeepLink(dto: NotificationDto): { type: NotificationType; deepLink: string | null } {
  const lowerType = dto.type.toLowerCase();
  
  // Type mapping first
  let type: NotificationType = "info";
  let deepLink: string | null = null;

  if (lowerType.includes("lead")) {
    if (lowerType.includes("assigned")) type = "lead_assigned";
    else if (lowerType.includes("shared")) type = "lead_shared";
    else type = "info";
    if (dto.entityId && (dto.entityType?.toLowerCase() === "lead" || lowerType.includes("lead"))) {
      deepLink = `/leads/${dto.entityId}`;
    }
  } else if (lowerType.includes("deal")) {
    type = "info";
    if (dto.entityId) deepLink = `/deals/${dto.entityId}`;
  } else if (lowerType.includes("task")) {
    type = "task_assigned";
    if (dto.entityId) deepLink = `/tasks/${dto.entityId}`;
  } else if (lowerType.includes("mention") || lowerType.includes("chat")) {
    type = "mention";
    if (dto.entityId) deepLink = `/messages/${dto.entityId}`;
  } else if (lowerType.includes("meeting") || lowerType.includes("calendar")) {
    type = "system_reminder";
    if (dto.entityId) deepLink = `/calendar`;
    else deepLink = `/meetings`;
  } else if (lowerType.includes("activity")) {
    type = "info";
    if (dto.entityId) deepLink = `/activities/${dto.entityId}`;
    else deepLink = `/activities`;
  } else if (lowerType.includes("invoice") || lowerType.includes("payment")) {
    type = "info";
    if (dto.entityId) deepLink = `/finance/invoices/${dto.entityId}`;
    else deepLink = `/payment/invoices`;
  } else if (lowerType.includes("success")) {
    type = "success";
  } else if (lowerType.includes("warning")) {
    type = "warning";
  } else if (lowerType.includes("error")) {
    type = "error";
  }

  // Fallback deep link
  if (!deepLink && dto.entityType && dto.entityId) {
    deepLink = `/${dto.entityType.toLowerCase()}/${dto.entityId}`;
  }

  return { type, deepLink };
}

// Convert API DTO to our app's Notification type
function dtoToNotification(dto: NotificationDto): Notification {
  const { type, deepLink } = getNotificationTypeAndDeepLink(dto);
  return {
    id: dto.id,
    title: dto.title,
    message: dto.message,
    type,
    priority: "medium", // Default priority since API doesn't have it yet
    createdAt: dto.createdAt,
    read: dto.read,
    deepLink,
    actor: null, // API doesn't have actor yet
    icon: null, // API doesn't have icon yet
  };
}

export async function getNotifications(): Promise<Notification[]> {
  const response = await fetchNotifications({ limit: 50, offset: 0 });
  return response.data.map(dtoToNotification).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function markAsRead(id: string): Promise<void> {
  await markNotificationAsRead(id);
}

export async function markAllRead(): Promise<void> {
  await markAllNotificationsAsRead();
}

export async function deleteNotification(id: string): Promise<void> {
  await deleteNotificationApi(id);
}
