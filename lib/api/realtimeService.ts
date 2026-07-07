// lib/api/realtimeService.ts
// Real-time CRM Notifications service (Task 6).
//
// Strategy:
//   1. Try to connect via Socket.IO (socket.io-client is already installed)
//   2. If WS unavailable, fall back to polling
//   3. Provides a unified abstraction compatible with both strategies
//
// When backend WebSocket events are available, only configure the socket URL.
// The interface stays the same — no component changes needed.

import {
  RealtimeEvent,
  RealtimeEventType,
  RealtimeServiceConfig,
  ConnectionStatus,
} from "@/types/realtimeNotifications";

// ── Mock event generator ──────────────────────────────────────────────────────

const MOCK_EVENT_TEMPLATES: Array<{
  type: RealtimeEventType;
  title: string;
  message: string;
}> = [
  {
    type: "lead_updated",
    title: "Lead Updated",
    message: "James Carter's status changed to HOT",
  },
  {
    type: "lead_assigned",
    title: "Lead Assigned",
    message: "Sarah Mitchell has been assigned to you",
  },
  {
    type: "deal_stage_changed",
    title: "Deal Stage Changed",
    message: "Acme Corp Enterprise moved to WON",
  },
  {
    type: "activity_created",
    title: "New Activity",
    message: "Follow-up call scheduled with TechWave",
  },
  {
    type: "analytics_refreshed",
    title: "Analytics Updated",
    message: "Pipeline data refreshed with latest figures",
  },
  {
    type: "assignment_changed",
    title: "Assignment Changed",
    message: "CloudWave deal reassigned to Jordan Lee",
  },
];

let mockEventIndex = 0;

function generateMockEvent(): RealtimeEvent {
  const template = MOCK_EVENT_TEMPLATES[mockEventIndex % MOCK_EVENT_TEMPLATES.length];
  mockEventIndex++;
  return {
    id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: template.type,
    title: template.title,
    message: template.message,
    timestamp: new Date().toISOString(),
    read: false,
  };
}

// ── Realtime Service Class ────────────────────────────────────────────────────

export class RealtimeService {
  private config: RealtimeServiceConfig;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private socket: unknown = null;
  private status: ConnectionStatus = "disconnected";
  private statusListeners: Array<(s: ConnectionStatus) => void> = [];
  private mockDemoTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: RealtimeServiceConfig = {}) {
    this.config = {
      pollInterval: 30_000, // 30s default polling interval
      ...config,
    };
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  onStatusChange(listener: (s: ConnectionStatus) => void) {
    this.statusListeners.push(listener);
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== listener);
    };
  }

  private setStatus(s: ConnectionStatus) {
    this.status = s;
    this.statusListeners.forEach((l) => l(s));
  }

  // ── Connect ─────────────────────────────────────────────────────────────────

  connect() {
    // Try Socket.IO first
    if (typeof window !== "undefined" && this.config.url) {
      this.connectSocket();
    } else {
      // Fall back to polling / mock demo
      this.startMockDemo();
    }
  }

  private connectSocket() {
    try {
      // Dynamically import socket.io-client to avoid SSR issues
      // When backend WebSocket is ready, set config.url to ws server URL
      import("socket.io-client").then(({ io }) => {
        const socket = io(this.config.url!, {
          transports: ["websocket", "polling"],
          reconnection: true,
          reconnectionDelay: 2000,
          reconnectionAttempts: 5,
        });

        this.socket = socket;
        this.setStatus("connecting");

        socket.on("connect", () => {
          this.setStatus("connected");
          this.config.onConnect?.();
        });

        socket.on("disconnect", () => {
          this.setStatus("disconnected");
          this.config.onDisconnect?.();
          // Fall back to polling on disconnect
          this.startPolling();
        });

        socket.on("crm-event", (event: RealtimeEvent) => {
          this.config.onEvent?.(event);
        });

        // Standard CRM event names
        const eventTypes: RealtimeEventType[] = [
          "lead_updated",
          "lead_assigned",
          "lead_merged",
          "deal_stage_changed",
          "activity_created",
          "analytics_refreshed",
          "dashboard_refreshed",
          "assignment_changed",
          "merge_completed",
        ];

        eventTypes.forEach((type) => {
          socket.on(type, (payload: Partial<RealtimeEvent>) => {
            this.config.onEvent?.({
              id: `${type}-${Date.now()}`,
              type,
              title: payload.title ?? type.replace(/_/g, " "),
              message: payload.message ?? "",
              timestamp: new Date().toISOString(),
              read: false,
              payload: payload.payload,
            });
          });
        });

        socket.on("connect_error", () => {
          // Socket failed — use polling instead
          socket.disconnect();
          this.socket = null;
          this.startPolling();
        });
      }).catch(() => {
        this.startPolling();
      });
    } catch {
      this.startPolling();
    }
  }

  // ── Polling fallback ─────────────────────────────────────────────────────────

  private startPolling() {
    if (this.pollTimer) return;
    this.setStatus("polling");

    this.pollTimer = setInterval(async () => {
      try {
        // When backend notifications endpoint is ready, call it here:
        // const { data } = await api.get("/notifications/unread");
        // data.forEach((event: RealtimeEvent) => this.config.onEvent?.(event));

        // MOCK DATA — emit periodic demo events while polling
        const event = generateMockEvent();
        // Only emit occasionally (30% chance per poll cycle) to avoid noise
        if (Math.random() < 0.3) {
          this.config.onEvent?.(event);
        }
      } catch {
        // polling error — keep trying
      }
    }, this.config.pollInterval);
  }

  // ── Mock demo emitter ────────────────────────────────────────────────────────
  // Emits demo events to show the notification UI working
  // Remove this when backend events are available

  private startMockDemo() {
    this.setStatus("polling");

    // Initial batch of demo notifications (delayed to show fresh ones)
    this.mockDemoTimer = setInterval(() => {
      // MOCK DATA — emit one event every 45 seconds for demo
      if (Math.random() < 0.5) {
        const event = generateMockEvent();
        this.config.onEvent?.(event);
      }
    }, 45_000);
  }

  // ── Disconnect ───────────────────────────────────────────────────────────────

  disconnect() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.mockDemoTimer) {
      clearInterval(this.mockDemoTimer);
      this.mockDemoTimer = null;
    }
    if (this.socket && typeof this.socket === "object") {
      const s = this.socket as { disconnect?: () => void };
      s.disconnect?.();
      this.socket = null;
    }
    this.setStatus("disconnected");
    this.config.onDisconnect?.();
  }
}

// ── Singleton instance ────────────────────────────────────────────────────────

let instance: RealtimeService | null = null;

export function getRealtimeService(config?: RealtimeServiceConfig): RealtimeService {
  if (!instance) {
    instance = new RealtimeService(config);
  }
  return instance;
}

export function destroyRealtimeService() {
  instance?.disconnect();
  instance = null;
}
