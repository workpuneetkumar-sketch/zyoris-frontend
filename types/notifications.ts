export type NotificationCategory =
  | "all"
  | "unread"
  | "leads"
  | "messages"
  | "deals"
  | "tasks"
  | "system";

export type NotificationType =
  | "lead_assigned"
  | "lead_shared"
  | "task_assigned"
  | "mention"
  | "system_reminder"
  | "success"
  | "warning"
  | "error"
  | "info";

// Extended to include critical as per requirements
export type NotificationPriority = "critical" | "high" | "medium" | "low" | "urgent";

export interface NotificationActor {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  category?: NotificationCategory | string;
  priority: NotificationPriority;
  createdAt: string;
  read: boolean;
  deepLink?: string | null;
  actor?: NotificationActor | null;
  icon?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  groupKey?: string | null;
  aggregatedCount?: number | null;
}

export type NotificationFilter = NotificationCategory;

export interface UnreadCountData {
  total: number;
  categories: Record<string, number>;
}

export interface NotificationCategoryPreferences {
  inApp: boolean;
  email: boolean;
  push: boolean;
}

export type NotificationPreferences = Record<string, NotificationCategoryPreferences>;

