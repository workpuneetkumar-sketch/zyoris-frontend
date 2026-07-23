import type { Notification, NotificationType } from "@/types/notifications";
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
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
      return "/ai-insights";
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

// Map API types to app types and generate routes that exist in this frontend.
function getNotificationTypeAndDeepLink(dto: NotificationDto): { type: NotificationType; deepLink: string | null } {
  const lowerType = dto.type.toLowerCase();
  const lowerEntityType = dto.entityType?.toLowerCase() || "";
  const lowerTitle = dto.title.toLowerCase();
  const entityDeepLink = getEntityDeepLink(dto.entityType, dto.entityId);
  
  // Type mapping first
  let type: NotificationType = "info";
  let deepLink: string | null = null;

  if (lowerType.includes("lead") || lowerEntityType.includes("lead") || lowerTitle.includes("lead")) {
    if (lowerType.includes("assigned")) type = "lead_assigned";
    else if (lowerType.includes("shared")) type = "lead_shared";
    else type = "info";
    deepLink = entityDeepLink || "/leads";
  } else if (lowerType.includes("deal") || lowerEntityType.includes("deal") || lowerTitle.includes("deal")) {
    type = "info";
    deepLink = entityDeepLink || "/deals";
  } else if (lowerType.includes("task") || lowerEntityType.includes("task") || lowerTitle.includes("task")) {
    type = "task_assigned";
    deepLink = entityDeepLink || "/tasks";
  } else if (lowerType.includes("mention") || lowerType.includes("chat") || lowerEntityType.includes("mention") || lowerEntityType.includes("chat") || lowerTitle.includes("mention") || lowerTitle.includes("chat")) {
    type = "mention";
    deepLink = entityDeepLink || "/messages";
  } else if (lowerType.includes("meeting") || lowerType.includes("calendar") || lowerEntityType.includes("meeting") || lowerEntityType.includes("calendar") || lowerTitle.includes("meeting") || lowerTitle.includes("calendar")) {
    type = "system_reminder";
    deepLink = entityDeepLink || "/calendar";
  } else if (lowerType.includes("activity") || lowerEntityType.includes("activity") || lowerTitle.includes("activity")) {
    type = "info";
    deepLink = entityDeepLink || "/activities";
  } else if (lowerType.includes("invoice") || lowerType.includes("payment") || lowerType.includes("finance") || lowerEntityType.includes("invoice") || lowerEntityType.includes("payment") || lowerEntityType.includes("finance") || lowerTitle.includes("invoice") || lowerTitle.includes("payment") || lowerTitle.includes("finance")) {
    type = lowerType.includes("success") ? "success" : "info";
    deepLink = entityDeepLink || "/finance";
  } else if (lowerType.includes("ingestion") || lowerType.includes("upload") || lowerEntityType.includes("ingestion") || lowerEntityType.includes("upload") || lowerTitle.includes("ingestion") || lowerTitle.includes("upload")) {
    type = lowerType.includes("success") ? "success" : "info";
    deepLink = entityDeepLink || "/ai-insights";
  } else if (lowerType.includes("success")) {
    type = "success";
  } else if (lowerType.includes("warning")) {
    type = "warning";
  } else if (lowerType.includes("error")) {
    type = "error";
  }

  // Most automatic notifications have a generic type such as SUCCESS but
  // include the affected entity. Send those to its valid module page.
  deepLink = deepLink || entityDeepLink || "/notifications";

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
