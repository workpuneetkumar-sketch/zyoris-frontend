/**
 * notifyAction.ts
 *
 * Call this after any CRM action (create lead, delete deal, send message, etc.)
 * to guarantee a notification is stored in the DB.
 *
 * This is a safety net: the backend SHOULD create notifications itself, but
 * on Render.com free tier with cold starts / background job delays, it sometimes
 * doesn't. This ensures the notification always exists.
 *
 * Usage:
 *   import { notifyAction } from "@/lib/notifyAction";
 *   await createLead(data);
 *   notifyAction({ title: "Lead Created", message: `${data.name} was added`, entityType: "lead", entityId: newLead.id });
 */

import { createNotification } from "@/lib/api/notificationsApi";

interface NotifyActionParams {
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  type?: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
}

function getCurrentUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("zyoris-auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.user?.id || parsed?.userId || null;
  } catch {
    return null;
  }
}

/**
 * Fire-and-forget notification creation.
 * Silently swallows errors — never throws.
 */
export function notifyAction(params: NotifyActionParams): void {
  const userId = getCurrentUserId();
  if (!userId) return;

  createNotification({
    userId,
    title: params.title,
    message: params.message,
    type: params.type ?? "INFO",
    entityType: params.entityType,
    entityId: params.entityId,
  }).catch((err) => {
    // Silently ignore — this is a best-effort supplementary call
    console.warn("[notifyAction] Failed to create notification:", err?.message || err);
  });
}
