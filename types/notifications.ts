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

export type NotificationPriority = "high" | "medium" | "low" | "urgent";

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
  priority: NotificationPriority;
  createdAt: string;
  read: boolean;
  deepLink?: string | null;
  actor?: NotificationActor | null;
  icon?: string | null;
}
