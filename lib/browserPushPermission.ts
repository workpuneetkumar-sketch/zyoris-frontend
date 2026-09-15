// lib/browserPushPermission.ts
// Browser Notification API wrapper

export type PushPermissionStatus = "granted" | "denied" | "default" | "unsupported";

export function getPushPermissionStatus(): PushPermissionStatus {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission as PushPermissionStatus;
}

export async function requestPushPermission(): Promise<PushPermissionStatus> {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window)) return "unsupported";

  try {
    const result = await Notification.requestPermission();
    return result as PushPermissionStatus;
  } catch {
    return "denied";
  }
}

export function showBrowserNotification(
  title: string,
  options?: { body?: string; icon?: string; tag?: string }
): void {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    new Notification(title, {
      body: options?.body,
      icon: options?.icon ?? "/icon.svg",
      tag: options?.tag,
    });
  } catch {
    // Notification creation failed silently
  }
}
