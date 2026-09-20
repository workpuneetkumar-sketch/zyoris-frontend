import type { Notification } from "@/types/notifications";

const ENTITY_ROUTES: Record<string, { list: string; detail?: string }> = {
  LEAD: { list: "/leads", detail: "/leads" },
  DEAL: { list: "/deals", detail: "/deals" },
  TASK: { list: "/tasks" },
  MEETING: { list: "/meetings" },
  CALL: { list: "/calls" },
  EMAIL: { list: "/email" },
  INVOICE: { list: "/finance/invoices" },
  PAYMENT: { list: "/payment/dashboard" },
};

function isInternalPath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//") && !/^[a-z][a-z\d+.-]*:/i.test(path);
}

export function getNotificationPath(notification: Notification): string | null {
  const route = notification.entityType
    ? ENTITY_ROUTES[notification.entityType.toUpperCase()]
    : undefined;
  if (!route) return null;
  const path = route.detail && notification.entityId
    ? `${route.detail}/${encodeURIComponent(notification.entityId)}`
    : route.list;
  return isInternalPath(path) ? path : null;
}