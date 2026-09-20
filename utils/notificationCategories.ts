export type NotificationTab = "all" | "unread" | "leads" | "deals" | "tasks" | "messages" | "system";
export type NotificationDataTab = Exclude<NotificationTab, "all" | "unread">;

export function backendToTab(category?: string | null): NotificationDataTab {
  switch ((category || "").toUpperCase().replace(/S$/, "")) {
    case "LEAD":
      return "leads";
    case "DEAL":
      return "deals";
    case "TASK":
      return "tasks";
    case "WHATSAPP":
    case "EMAIL":
    case "CALL":
    case "MESSAGE":
      return "messages";
    default:
      return "system";
  }
}

export function tabToBackend(tab: string): string[] {
  switch (tab.toLowerCase()) {
    case "leads":
      return ["LEAD"];
    case "deals":
      return ["DEAL"];
    case "tasks":
      return ["TASK"];
    case "messages":
      return ["WHATSAPP", "EMAIL", "CALL"];
    case "system":
      return ["SYSTEM", "PAYMENT", "CALENDAR"];
    default:
      return [];
  }
}
