import type {
  Notification,
  NotificationType,
  NotificationCategory,
  NotificationPriority,
} from "@/types/notifications";
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  archiveNotification as archiveNotificationApi,
  deleteNotification as deleteNotificationApi,
  bulkArchiveNotifications,
  createNotification as createNotificationApi,
  type NotificationDto,
  type BulkArchivePayload,
  type CreateNotificationPayload,
} from "@/lib/api/notificationsApi";

function getEntityDeepLink(entityType?: string | null, entityId?: string | null): string | null {
  const entity = entityType?.trim().toLowerCase().replace(/[\s_-]/g, "") || "";

  switch (entity) {
    case "lead":
    case "leads":
      return entityId ? `/leads/${entityId}` : "/leads";
    case "deal":
    case "deals":
      return entityId ? `/deals/${entityId}` : "/deals";
    case "task":
    case "tasks":
      return "/tasks";
    case "message":
    case "messages":
    case "chat":
      return "/messages";
    case "meeting":
    case "meetings":
    case "calendar":
      return "/calendar";
    case "activity":
    case "activities":
      return "/activities";
    case "invoice":
    case "invoices":
      return "/finance/invoices";
    case "finance":
      return "/finance";
    case "payment":
    case "payments":
      return "/payment/dashboard";
    case "contact":
    case "contacts":
      return "/contacts";
    case "company":
    case "companies":
      return "/companies";
    case "project":
    case "projects":
      return "/projects";
    case "document":
    case "documents":
      return "/documents";
    case "email":
    case "emails":
      return "/email";
    case "call":
    case "calls":
      return "/calls";
    case "whatsapp":
      return "/whatsapp";
    case "report":
    case "reports":
      return "/reports";
    case "analytic":
    case "analytics":
      return "/analytics";
    case "marketing":
    case "campaign":
    case "campaigns":
      return "/marketing";
    case "automation":
    case "rule":
    case "rules":
      return "/automation";
    case "note":
    case "notes":
      return "/notes";
    case "knowledge":
    case "knowledgebase":
      return "/knowledge-base";
    case "employee":
    case "employees":
      return "/hr/employees";
    case "leave":
    case "leaves":
      return "/hr/leaves";
    case "attendance":
      return "/hr/attendance";
    case "payroll":
      return "/hr/payroll";
    case "expense":
    case "expenses":
      return "/finance/expenses";
    case "dashboard":
    case "dashboards":
      return "/dashboard";
    case "ai":
    case "aiinsight":
    case "aiinsights":
      return "/ai-insights";
    case "savedview":
    case "savedviews":
    case "duplicate":
    case "duplicates":
    case "bulkoperation":
    case "bulkoperations":
      return "/leads";
    case "upload":
    case "uploads":
    case "ingestion":
      return "/ingestion";
    case "user":
    case "users":
    case "rbac":
    case "permission":
    case "permissions":
      return "/admin";
    case "role":
    case "roles":
      return "/admin/roles";
    case "userrole":
    case "userroles":
    case "roleassignment":
    case "roleassignments":
      return "/admin/user-roles";
    case "organization":
    case "organizations":
      return "/settings";
    default:
      return null;
  }
}

function mapCategory(dto: NotificationDto): NotificationCategory {
  // 1. Explicit category from backend (trusted if it's a known value)
  if (dto.category) {
    const cat = dto.category.toLowerCase();
    if (["leads", "messages", "deals", "tasks", "system"].includes(cat)) {
      return cat as NotificationCategory;
    }
  }

  // 2. Infer from entityType first (most reliable signal)
  if (dto.entityType) {
    const et = dto.entityType.toLowerCase();
    if (et === "lead" || et === "leads") return "leads";
    if (et === "deal" || et === "deals") return "deals";
    if (et === "task" || et === "tasks") return "tasks";
    if (
      et === "message" || et === "messages" ||
      et === "chat" || et === "whatsapp" || et === "call"
    ) return "messages";
  }

  // 3. Infer from type string
  const t = (dto.type || "").toLowerCase();
  if (t.includes("lead")) return "leads";
  if (t.includes("deal")) return "deals";
  if (t.includes("task")) return "tasks";
  if (
    t.includes("message") || t.includes("chat") ||
    t.includes("mention") || t.includes("call") || t.includes("whatsapp")
  ) return "messages";

  return "system";
}

function mapPriority(dto: NotificationDto): NotificationPriority {
  if (!dto.priority) return "medium";
  const p = String(dto.priority).toLowerCase();
  // API uses: normal, reminder, critical
  if (p === "critical") return "critical";
  if (p === "high" || p === "urgent") return "high";
  if (p === "medium" || p === "reminder") return "medium";
  if (p === "low" || p === "normal") return "low";
  return "medium";
}

function getNotificationTypeAndDeepLink(
  dto: NotificationDto
): { type: NotificationType; deepLink: string | null } {
  const lowerType = dto.type.toLowerCase();
  const entityDeepLink = getEntityDeepLink(dto.entityType, dto.entityId);

  let type: NotificationType = "info";
  let deepLink: string | null = null;

  if (lowerType.includes("lead")) {
    if (lowerType.includes("assigned")) type = "lead_assigned";
    else if (lowerType.includes("shared")) type = "lead_shared";
    else type = "info";
    deepLink = entityDeepLink || "/leads";
  } else if (lowerType.includes("deal")) {
    type = "info";
    deepLink = entityDeepLink || "/deals";
  } else if (lowerType.includes("task")) {
    type = "task_assigned";
    deepLink = entityDeepLink || "/tasks";
  } else if (lowerType.includes("mention") || lowerType.includes("chat")) {
    type = "mention";
    deepLink = entityDeepLink || "/messages";
  } else if (lowerType.includes("meeting") || lowerType.includes("calendar")) {
    type = "system_reminder";
    deepLink = entityDeepLink || "/calendar";
  } else if (lowerType.includes("activity")) {
    type = "info";
    deepLink = entityDeepLink || "/activities";
  } else if (lowerType.includes("invoice") || lowerType.includes("payment")) {
    type = "info";
    deepLink = entityDeepLink || "/finance/invoices";
  } else if (lowerType.includes("success")) {
    type = "success";
  } else if (lowerType.includes("warning")) {
    type = "warning";
  } else if (lowerType.includes("error")) {
    type = "error";
  }

  deepLink = deepLink || entityDeepLink || "/notifications";

  return { type, deepLink };
}

export function dtoToNotification(dto: NotificationDto): Notification {
  const { type, deepLink: inferredDeepLink } = getNotificationTypeAndDeepLink(dto);
  // Prefer the backend-provided deepLink over the inferred one
  const deepLink = dto.deepLink || inferredDeepLink || "/notifications";
  return {
    id: dto.id,
    title: dto.title,
    message: dto.message,
    type,
    category: mapCategory(dto),
    priority: mapPriority(dto),
    createdAt: dto.createdAt,
    read: dto.read,
    deepLink,
    actor: dto.actor
      ? {
          id: dto.actor.id,
          name: dto.actor.name,
          avatarUrl: dto.actor.avatarUrl,
        }
      : null,
    icon: null,
    entityType: dto.entityType,
    entityId: dto.entityId,
    groupKey: dto.groupKey ?? null,
    aggregatedCount: dto.aggregatedCount ?? null,
  };
}

export interface GetNotificationsResult {
  notifications: Notification[];
  nextCursor: string | null;
  total: number;
  offset: number;
}

export async function getNotifications(params?: {
  category?: string;
  cursor?: string;
  offset?: number;
  limit?: number;
  unreadOnly?: boolean;
}): Promise<GetNotificationsResult> {
  // Convert legacy cursor param to offset (cursor was stored as stringified offset)
  let offset = params?.offset ?? 0;
  if (params?.cursor && !params.offset) {
    const parsed = parseInt(params.cursor, 10);
    if (!isNaN(parsed)) offset = parsed;
  }

  const response = await fetchNotifications({
    limit: params?.limit ?? 20,
    offset,
    unreadOnly: params?.unreadOnly ?? params?.category === "unread",
  });

  // API returns { total, unreadCount, limit, offset, data: [...] }
  // Handle both { data: [...] } and direct array responses defensively
  let raw: NotificationDto[] = [];
  if (Array.isArray(response)) {
    // Bare array response
    raw = response as NotificationDto[];
  } else if (Array.isArray((response as any).data)) {
    raw = (response as any).data;
  } else if (Array.isArray((response as any).notifications)) {
    raw = (response as any).notifications;
  } else if (Array.isArray((response as any).items)) {
    raw = (response as any).items;
  }

  // Log in dev so we can see the real shape
  if (process.env.NODE_ENV === "development") {
    console.log("[NotificationAdapter] raw response keys:", Object.keys(response as any));
    console.log("[NotificationAdapter] raw items count:", raw.length);
    if (raw.length > 0) console.log("[NotificationAdapter] first item:", raw[0]);
  }

  const notifications = raw.map(dtoToNotification).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const limit = params?.limit ?? 20;
  const total = (response as any).total ?? raw.length;
  const hasMore = offset + raw.length < total;
  const nextCursor = hasMore ? String(offset + raw.length) : null;

  return {
    notifications,
    nextCursor,
    total,
    offset,
  };
}

export async function markAsRead(id: string): Promise<void> {
  await markNotificationAsRead(id);
}

export async function markAllRead(category?: string): Promise<void> {
  await markAllNotificationsAsRead(category);
}

export async function archiveNotification(id: string): Promise<void> {
  await archiveNotificationApi(id);
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
