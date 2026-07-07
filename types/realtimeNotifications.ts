// types/realtimeNotifications.ts
// Types for Real-time CRM Notifications (Task 6)

export type RealtimeEventType =
  | "lead_updated"
  | "lead_assigned"
  | "lead_merged"
  | "deal_stage_changed"
  | "activity_created"
  | "analytics_refreshed"
  | "dashboard_refreshed"
  | "assignment_changed"
  | "merge_completed";

export interface RealtimeEvent {
  id: string;
  type: RealtimeEventType;
  title: string;
  message: string;
  payload?: Record<string, unknown>;
  timestamp: string;
  read: boolean;
  userId?: string;
}

export interface RealtimeServiceConfig {
  url?: string;
  pollInterval?: number; // ms, used as fallback if no WS/SSE
  onEvent?: (event: RealtimeEvent) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "polling";
