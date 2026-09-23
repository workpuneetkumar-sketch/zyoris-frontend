/**
 * utils/notificationDeduplication.ts
 *
 * Dedicated, pure deduplication and normalization utilities for notifications.
 * Deduplication is keyed strictly and exclusively by String(notification.id).
 *
 * Never deduplicates by title, message, type, createdAt, or any other field,
 * because different notifications can legitimately share identical values for those fields.
 */

/**
 * Normalizes any notification ID to a consistent string.
 */
export function normalizeNotificationId(id: unknown): string {
  if (id === null || id === undefined) return "";
  return String(id).trim();
}

/**
 * Deduplicates a list of notifications strictly by String(item.id).
 * Preserves the original order, keeping the first occurrence of each unique ID.
 */
export function deduplicateNotifications<T extends { id: string | number }>(
  items: T[]
): T[] {
  if (!Array.isArray(items) || items.length === 0) return [];

  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    if (!item) continue;
    const key = normalizeNotificationId(item.id);
    if (!key) continue;

    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result;
}

/**
 * Safely merges incoming REST notifications with current/existing frontend state.
 *
 * Rules:
 * 1. Realtime notifications received via Socket.IO that are in `current` but not
 *    yet returned in `incoming` (e.g. backend replication/indexing delay) are
 *    preserved at the top (newest-first).
 * 2. Incoming notifications from the REST response are included in order.
 * 3. Every notification is strictly deduplicated by String(item.id) — no item
 *    appears more than once.
 */
export function mergeNotifications<T extends { id: string | number }>(
  incoming: T[],
  current: T[]
): T[] {
  const safeIncoming = Array.isArray(incoming) ? incoming : [];
  const safeCurrent = Array.isArray(current) ? current : [];

  const incomingIdSet = new Set(
    safeIncoming.map((item) => normalizeNotificationId(item.id))
  );

  const seen = new Set<string>();
  const merged: T[] = [];

  // 1. Keep realtime/local notifications currently in state that are NOT yet in incoming REST
  for (const item of safeCurrent) {
    if (!item) continue;
    const key = normalizeNotificationId(item.id);
    if (!key) continue;

    if (!incomingIdSet.has(key) && !seen.has(key)) {
      seen.add(key);
      merged.push(item);
    }
  }

  // 2. Append incoming REST items
  for (const item of safeIncoming) {
    if (!item) continue;
    const key = normalizeNotificationId(item.id);
    if (!key) continue;

    if (!seen.has(key)) {
      seen.add(key);
      merged.push(item);
    }
  }

  return merged;
}

/**
 * Prepends a new notification to the existing list, strictly enforcing uniqueness by String(id).
 * If the notification ID is already present in `current`, `current` is returned unchanged.
 */
export function prependNotification<T extends { id: string | number }>(
  current: T[],
  newItem: T
): T[] {
  if (!newItem) return current || [];
  const key = normalizeNotificationId(newItem.id);
  if (!key) return current || [];

  const safeCurrent = Array.isArray(current) ? current : [];
  if (safeCurrent.some((item) => normalizeNotificationId(item.id) === key)) {
    return safeCurrent;
  }

  return [newItem, ...safeCurrent];
}
