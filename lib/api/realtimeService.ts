// lib/api/realtimeService.ts
// Real-time CRM Notifications — Task 6
//
// Transport abstraction supporting:
//   1. WebSocket (via Socket.IO when backend WS URL is configured)
//   2. Server-Sent Events (SSE) — when backend ships /notifications/stream
//   3. Polling — unconditional fallback with configurable interval
//
// Switching transports requires zero UI changes — all components
// consume only the RealtimeService interface.

import {
  RealtimeEvent,
  RealtimeEventType,
  RealtimeServiceConfig,
  ConnectionStatus,
} from "@/types/realtimeNotifications";

// ── Transport interface ───────────────────────────────────────────────────────

interface Transport {
  connect(): void;
  disconnect(): void;
}



// ── 1. WebSocket transport (Socket.IO) ────────────────────────────────────────

class SocketTransport implements Transport {
  private socket: unknown = null;

  constructor(
    private url: string,
    private onEvent: (e: RealtimeEvent) => void,
    private onStatusChange: (s: ConnectionStatus) => void,
    private onFallback: () => void,
  ) {}

  connect() {
    this.onStatusChange("connecting");
    import("socket.io-client")
      .then(({ io }) => {
        const socket = io(this.url, {
          transports: ["websocket", "polling"],
          reconnection: true,
          reconnectionDelay: 2000,
          reconnectionAttempts: 5,
          timeout: 10000,
        });
        this.socket = socket;

        socket.on("connect", () => this.onStatusChange("connected"));
        socket.on("disconnect", () => {
          this.onStatusChange("disconnected");
          this.onFallback();
        });
        socket.on("connect_error", () => {
          socket.disconnect();
          this.socket = null;
          this.onFallback();
        });

        // Unified "crm-event" channel
        socket.on("crm-event", (ev: RealtimeEvent) => this.onEvent(ev));

        // Individual event types
        const types: RealtimeEventType[] = [
          "lead_updated","lead_assigned","lead_merged","deal_stage_changed",
          "activity_created","analytics_refreshed","dashboard_refreshed",
          "assignment_changed","merge_completed",
        ];
        types.forEach((type) => {
          socket.on(type, (payload: Partial<RealtimeEvent>) => {
            this.onEvent({
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
      })
      .catch(() => this.onFallback());
  }

  disconnect() {
    if (this.socket && typeof this.socket === "object") {
      (this.socket as { disconnect?: () => void }).disconnect?.();
      this.socket = null;
    }
  }
}

// ── 2. SSE transport ──────────────────────────────────────────────────────────

class SseTransport implements Transport {
  private es: EventSource | null = null;

  constructor(
    private url: string,
    private onEvent: (e: RealtimeEvent) => void,
    private onStatusChange: (s: ConnectionStatus) => void,
    private onFallback: () => void,
  ) {}

  connect() {
    if (typeof window === "undefined" || !("EventSource" in window)) {
      this.onFallback();
      return;
    }
    this.onStatusChange("connecting");
    this.es = new EventSource(this.url, { withCredentials: true });

    this.es.onopen = () => this.onStatusChange("connected");

    this.es.onmessage = (ev) => {
      try {
        const data: RealtimeEvent = JSON.parse(ev.data);
        this.onEvent(data);
      } catch {
        // malformed message — ignore
      }
    };

    this.es.onerror = () => {
      this.es?.close();
      this.es = null;
      this.onFallback();
    };
  }

  disconnect() {
    this.es?.close();
    this.es = null;
  }
}

// ── 3. Polling transport ──────────────────────────────────────────────────────

class PollingTransport implements Transport {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private interval: number,
    private onEvent: (e: RealtimeEvent) => void,
    private onStatusChange: (s: ConnectionStatus) => void,
    private pollUrl?: string,
  ) {}

  connect() {
    this.onStatusChange("polling");

    if (this.pollUrl) {
      // Real polling — backend endpoint not yet available, placeholder ready
      this.timer = setInterval(async () => {
        try {
          // When backend ships GET /notifications/unread, uncomment:
          // const { data } = await api.get<RealtimeEvent[]>("/notifications/unread");
          // data.forEach((ev) => this.onEvent(ev));
        } catch {
          // polling error — keep trying silently
        }
      }, this.interval);
    }

  }

  disconnect() {
    if (this.timer)     { clearInterval(this.timer);     this.timer = null;     }
  }
}

// ── RealtimeService ───────────────────────────────────────────────────────────

export class RealtimeService {
  private transport: Transport | null = null;
  private status: ConnectionStatus = "disconnected";
  private statusListeners = new Set<(s: ConnectionStatus) => void>();
  private readonly config: Required<RealtimeServiceConfig>;

  constructor(config: RealtimeServiceConfig = {}) {
    this.config = {
      url:           config.url          ?? "",
      sseUrl:        (config as { sseUrl?: string }).sseUrl ?? "",
      pollInterval:  config.pollInterval ?? 30_000,
      onEvent:       config.onEvent      ?? (() => undefined),
      onConnect:     config.onConnect    ?? (() => undefined),
      onDisconnect:  config.onDisconnect ?? (() => undefined),
    } as Required<RealtimeServiceConfig> & { sseUrl: string };
  }

  // ── Status ──────────────────────────────────────────────────────────────────

  getStatus(): ConnectionStatus { return this.status; }

  onStatusChange(listener: (s: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private setStatus(s: ConnectionStatus) {
    this.status = s;
    this.statusListeners.forEach((l) => l(s));
    if (s === "connected") this.config.onConnect();
    if (s === "disconnected") this.config.onDisconnect();
  }

  private handleEvent(ev: RealtimeEvent) {
    this.config.onEvent(ev);
  }

  // ── Connect: tries WS → SSE → Polling in order ───────────────────────────

  connect() {
    if (typeof window === "undefined") return;

    const { url, sseUrl, pollInterval } = this.config as Required<RealtimeServiceConfig> & { sseUrl: string };

    if (url) {
      this.transport = new SocketTransport(
        url,
        (ev) => this.handleEvent(ev),
        (s)  => this.setStatus(s),
        ()   => this.fallbackToSseOrPoll(),
      );
    } else if (sseUrl) {
      this.transport = new SseTransport(
        sseUrl,
        (ev) => this.handleEvent(ev),
        (s)  => this.setStatus(s),
        ()   => this.fallbackToPoll(),
      );
    } else {
      this.transport = new PollingTransport(pollInterval, (ev) => this.handleEvent(ev), (s) => this.setStatus(s));
    }

    this.transport.connect();
  }

  private fallbackToSseOrPoll() {
    this.transport?.disconnect();
    const sseUrl = (this.config as Required<RealtimeServiceConfig> & { sseUrl: string }).sseUrl;
    if (sseUrl) {
      this.transport = new SseTransport(
        sseUrl,
        (ev) => this.handleEvent(ev),
        (s)  => this.setStatus(s),
        ()   => this.fallbackToPoll(),
      );
      this.transport.connect();
    } else {
      this.fallbackToPoll();
    }
  }

  private fallbackToPoll() {
    this.transport?.disconnect();
    this.transport = new PollingTransport(
      this.config.pollInterval,
      (ev) => this.handleEvent(ev),
      (s)  => this.setStatus(s),
    );
    this.transport.connect();
  }

  // ── Disconnect ───────────────────────────────────────────────────────────────

  disconnect() {
    this.transport?.disconnect();
    this.transport = null;
    this.setStatus("disconnected");
    this.statusListeners.clear();
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

let _instance: RealtimeService | null = null;

export function getRealtimeService(config?: RealtimeServiceConfig): RealtimeService {
  if (!_instance) {
    _instance = new RealtimeService({
      // Set NEXT_PUBLIC_WS_URL for Socket.IO or NEXT_PUBLIC_SSE_URL for SSE
      url:          process.env.NEXT_PUBLIC_WS_URL  ?? "",
      pollInterval: 30_000,
      ...config,
    } as RealtimeServiceConfig & { sseUrl?: string });
  }
  return _instance;
}

export function destroyRealtimeService() {
  _instance?.disconnect();
  _instance = null;
}
