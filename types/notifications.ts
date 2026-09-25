export type NotificationCategory =
  | "all"
  | "unread"
  | "leads"
  | "messages"
  | "deals"
  | "tasks"
  | "system";

export type NotificationType =
  | "INFO"
  | "SUCCESS"
  | "WARNING"
  | "ERROR";

export type NotificationPriority = string;

export type NotificationEntityType =
  | "LEAD"
  | "DEAL"
  | "TASK"
  | "MEETING"
  | "CALL"
  | "EMAIL"
  | "INVOICE"
  | "PAYMENT";

export interface NotificationActor {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

export interface Notification {
  id: string;
  organizationId?: string | null;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  category?: NotificationCategory | string;
  priority: NotificationPriority;
  entityType?: NotificationEntityType | string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  eventId?: string | null;
  action?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  actorAvatar?: string | null;
  createdAt: string;
  read: boolean;
  readAt?: string | null;
  archivedAt?: string | null;
  dismissedAt?: string | null;
  snoozedUntil?: string | null;
  deepLink?: string | null;
  actor?: NotificationActor | null;
  icon?: string | null;
}

export type NotificationFilter = NotificationCategory;

export interface UnreadCountData {
  total: number;
  byCategory: Record<string, number>;
}

export interface NotificationCategoryPreferences {
  inApp?: boolean;
  email?: boolean;
  push?: boolean;
  sound?: boolean;
}

export type NotificationPreferences = Record<string, NotificationCategoryPreferences>;

export interface CursorPaginationResponse<T> {
  data: T[];
  pagination: { limit: number; nextCursor: string | null; hasNext: boolean };
  unreadCount: number;
}

export type WebsocketNotificationPayload = Notification;

export interface WebsocketCountUpdatedPayload {
  userId: string;
}

