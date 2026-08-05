import type { Notification, NotificationType, NotificationCategory } from "@/types/notifications";
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  archiveNotification as archiveNotificationApi,
  deleteNotification as deleteNotificationApi,
  type NotificationDto,
} from "@/lib/api/notificationsApi";

function getEntityDeepLink(entityType?: string | null, entityId?: string | null): string | null {
  const entity = entityType?.trim().toLowerCase().replace(/[\s_-]/g, "") || "";

  switch (entity) {
    // These are the only notification entities with individual detail routes.
    case "lead":
    case "leads":
      return entityId ? `/leads/${entityId}` : "/leads";
    case "deal":
    case "deals":
      return entityId ? `/deals/${entityId}` : "/deals";

    // The remaining entities are managed from their list or module page.
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
  if (dto.category) {
    const cat = dto.category.toLowerCase();
    if (["leads", "messages", "deals", "tasks", "system"].includes(cat)) {
      return cat as NotificationCategory;
    }
  }

  const combined = `${dto.type || ""} ${dto.entityType || ""}`.toLowerCase();
  if (combined.includes("lead")) return "leads";
  if (combined.includes("message") || combined.includes("chat") || combined.includes("mention") || combined.includes("call")) return "messages";
  if (combined.includes("deal")) return "deals";
  if (combined.includes("task")) return "tasks";

  return "system";
}

// Map API types to app types and generate routes that exist in this frontend.
function getNotificationTypeAndDeepLink(dto: NotificationDto): { type: NotificationType; deepLink: string | null } {
  const lowerType = dto.type.toLowerCase();
  const entityDeepLink = getEntityDeepLink(dto.entityType, dto.entityId);
  
  // Type mapping first
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

// Convert API DTO to our app's Notification type
export function dtoToNotification(dto: NotificationDto): Notification {
  const { type, deepLink } = getNotificationTypeAndDeepLink(dto);
  return {
    id: dto.id,
    title: dto.title,
    message: dto.message,
    type,
    category: mapCategory(dto),
    priority: "medium", // Default priority since API doesn't have it yet
    createdAt: dto.createdAt,
    read: dto.read,
    deepLink,
    actor: null,
    icon: null,
    entityType: dto.entityType,
    entityId: dto.entityId,
    groupKey: dto.groupKey ?? null,
    aggregatedCount: dto.aggregatedCount ?? null,
  };
}

export interface GetNotificationsResult {
  notifications: Notification[];
  nextCursor?: string | null;
  unreadCount?: number;
  total?: number;
}

export async function getNotifications(params?: {
  category?: string;
  cursor?: string;
  limit?: number;
  read?: string;
}): Promise<GetNotificationsResult> {
  const response = await fetchNotifications({
    category: params?.category === "all" || params?.category === "unread" ? undefined : params?.category,
    read: params?.category === "unread" ? "false" : params?.read,
    cursor: params?.cursor,
    limit: params?.limit || 20,
  });

  const notifications = (response.data || []).map(dtoToNotification).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return {
    notifications,
    nextCursor: response.nextCursor || response.cursor || null,
    unreadCount: response.unreadCount,
    total: response.total,
  };
}

export async function markAsRead(id: string): Promise<void> {
  await markNotificationAsRead(id);
}

export async function markAllRead(): Promise<void> {
  await markAllNotificationsAsRead();
}

export async function archiveNotification(id: string): Promise<void> {
  await archiveNotificationApi(id);
}

export async function deleteNotification(id: string): Promise<void> {
  await archiveNotificationApi(id);
}