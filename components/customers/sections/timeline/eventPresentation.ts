// components/customers/sections/timeline/eventPresentation.ts
// Pure presentation logic for a Customer 360 timeline event.
//
// The backend `eventType` is a free-form, org-configured string (examples:
// "status_changed", "note_added", "invoice_paid"). We never re-map it before
// sending it back as a filter — this file only derives *display* affordances
// (category, icon, colour token, label) and pulls provenance / related-entity
// links out of the shapes the backend already returns.

import {
  Activity,
  CalendarClock,
  CheckSquare,
  CreditCard,
  FileText,
  Handshake,
  Mail,
  MessageCircle,
  Phone,
  Receipt,
  RefreshCw,
  StickyNote,
  type LucideIcon,
} from "lucide-react";
import type { CustomerTimelineEvent, Provenance } from "@/types/customer360";

export type TimelineCategory =
  | "activity"
  | "deal"
  | "task"
  | "invoice"
  | "payment"
  | "note"
  | "status"
  | "email"
  | "whatsapp"
  | "call"
  | "meeting"
  | "other";

export interface CategoryStyle {
  label: string;
  icon: LucideIcon;
  /** Tailwind classes bound to Global.css tokens — never hardcoded colours. */
  iconClass: string;
  chipClass: string;
}

// All colours resolve to CSS variables declared in app/globals.css
// (`--color-*` / `--color-cat-*`), surfaced through tailwind.config.js.
export const CATEGORY_STYLES: Record<TimelineCategory, CategoryStyle> = {
  activity: {
    label: "Activity",
    icon: Activity,
    iconClass: "bg-cat-crm-bg text-cat-crm",
    chipClass: "bg-cat-crm-bg text-cat-crm",
  },
  deal: {
    label: "Deal",
    icon: Handshake,
    iconClass: "bg-cat-projects-bg text-cat-projects",
    chipClass: "bg-cat-projects-bg text-cat-projects",
  },
  task: {
    label: "Task",
    icon: CheckSquare,
    iconClass: "bg-cat-comm-bg text-cat-comm",
    chipClass: "bg-cat-comm-bg text-cat-comm",
  },
  invoice: {
    label: "Invoice",
    icon: Receipt,
    iconClass: "bg-cat-finance-bg text-cat-finance",
    chipClass: "bg-cat-finance-bg text-cat-finance",
  },
  payment: {
    label: "Payment",
    icon: CreditCard,
    iconClass: "bg-success-light text-success",
    chipClass: "bg-success-light text-success",
  },
  note: {
    label: "Note",
    icon: StickyNote,
    iconClass: "bg-cat-custom-bg text-cat-custom",
    chipClass: "bg-cat-custom-bg text-cat-custom",
  },
  status: {
    label: "Status",
    icon: RefreshCw,
    iconClass: "bg-info-light text-info",
    chipClass: "bg-info-light text-info",
  },
  email: {
    label: "Email",
    icon: Mail,
    iconClass: "bg-cat-comm-bg text-cat-comm",
    chipClass: "bg-cat-comm-bg text-cat-comm",
  },
  whatsapp: {
    label: "WhatsApp",
    icon: MessageCircle,
    iconClass: "bg-cat-comm-bg text-cat-comm",
    chipClass: "bg-cat-comm-bg text-cat-comm",
  },
  call: {
    label: "Call",
    icon: Phone,
    iconClass: "bg-cat-crm-bg text-cat-crm",
    chipClass: "bg-cat-crm-bg text-cat-crm",
  },
  meeting: {
    label: "Meeting",
    icon: CalendarClock,
    iconClass: "bg-cat-marketing-bg text-cat-marketing",
    chipClass: "bg-cat-marketing-bg text-cat-marketing",
  },
  other: {
    label: "Event",
    icon: FileText,
    iconClass: "bg-background-secondary text-text-secondary",
    chipClass: "bg-background-secondary text-text-secondary",
  },
};

const PRODUCERS = ["activity", "deal", "task", "invoice", "payment"] as const;

/**
 * The producer that emitted the event. The timeline service stamps this into
 * `idempotencyKey` ("activity:activity_123_updated:created") and
 * `sourceEventId` ("activity_123_updated"), so it is a reliable signal for the
 * five first-class producers (Activity / Deal / Task / Invoice / Payment).
 */
function producerOf(event: CustomerTimelineEvent): TimelineCategory | null {
  const head = (event.idempotencyKey || "").split(":")[0]?.toLowerCase();
  if (head && (PRODUCERS as readonly string[]).includes(head)) {
    return head as TimelineCategory;
  }
  const src = (event.sourceEventId || "").toLowerCase();
  for (const p of PRODUCERS) {
    if (src === p || src.startsWith(`${p}_`) || src.startsWith(`${p}-`) || src.startsWith(`${p}:`)) {
      return p;
    }
  }
  const meta = metaRecord(event);
  const hint = String(
    meta.category ?? meta.entityType ?? meta.producer ?? meta.kind ?? ""
  ).toLowerCase();
  for (const p of PRODUCERS) if (hint === p) return p;
  return null;
}

function keywordCategory(eventType: string): TimelineCategory {
  const t = eventType.toLowerCase();
  if (/invoice|bill/.test(t)) return "invoice";
  if (/payment|charge|refund|payout|dunning/.test(t)) return "payment";
  if (/deal|opportunity|pipeline|stage|quote/.test(t)) return "deal";
  if (/task|todo|to_do/.test(t)) return "task";
  if (/note|comment/.test(t)) return "note";
  if (/whatsapp|wa_message|wa_msg/.test(t)) return "whatsapp";
  if (/email|mail/.test(t)) return "email";
  if (/\bcall\b|dialer|voip/.test(t)) return "call";
  if (/meeting|calendar|event_scheduled/.test(t)) return "meeting";
  if (/status|stage_changed|state_changed|lifecycle/.test(t)) return "status";
  if (/activity|logged|touchpoint|interaction/.test(t)) return "activity";
  return "other";
}

/**
 * Map the backend `channel` (e.g. "EMAIL", "WHATSAPP", "CALL", "MEETING") to a
 * display category. Only the four communication channels are recognised — every
 * other channel value falls through to producer / keyword classification.
 */
function channelCategory(channel?: string | null): TimelineCategory | null {
  if (!channel) return null;
  const c = channel.toLowerCase();
  if (/whatsapp|^wa$/.test(c)) return "whatsapp";
  if (/mail/.test(c)) return "email";
  if (/call|phone|voice|dialer|telephony/.test(c)) return "call";
  if (/meeting|calendar|video|conference/.test(c)) return "meeting";
  return null;
}

export function categoryOf(event: CustomerTimelineEvent): TimelineCategory {
  return (
    producerOf(event) ??
    channelCategory(event.channel) ??
    keywordCategory(event.eventType || "")
  );
}

/** "invoice_paid" -> "Invoice paid" ; "STATUS_CHANGED" -> "Status changed". */
export function humanizeEventType(eventType: string): string {
  const spaced = (eventType || "")
    .replace(/[._-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim()
    .toLowerCase();
  if (!spaced) return "Event";
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// ── Provenance ──────────────────────────────────────────────────────────────

function metaRecord(event: CustomerTimelineEvent): Record<string, unknown> {
  return event.metadata && typeof event.metadata === "object"
    ? (event.metadata as Record<string, unknown>)
    : {};
}

function provenanceRecord(event: CustomerTimelineEvent): Record<string, unknown> | null {
  return event.provenance && typeof event.provenance === "object"
    ? (event.provenance as Record<string, unknown>)
    : null;
}

/**
 * Build a `Provenance` for the shared <ProvenanceBadge> from whatever the
 * backend attached. Returns null for purely-internal events with no attribution.
 */
export function eventProvenance(event: CustomerTimelineEvent): Provenance | null {
  const p = provenanceRecord(event);
  const isExternal = Boolean(event.source) && event.source !== "INTERNAL";
  const hasAny =
    isExternal ||
    Boolean(p && Object.keys(p).length) ||
    Boolean(event.channel) ||
    event.confidence != null ||
    Boolean(event.externalId);

  if (!hasAny) return null;

  const str = (v: unknown): string | null =>
    typeof v === "string" && v.trim() ? v : typeof v === "number" ? String(v) : null;

  const fromP = (...keys: string[]): string | null => {
    if (!p) return null;
    for (const k of keys) {
      const hit = str(p[k]);
      if (hit) return hit;
    }
    return null;
  };

  const confidence =
    event.confidence ??
    (p && typeof p.confidence === "number" ? (p.confidence as number) : null);

  return {
    source: event.source && event.source !== "INTERNAL"
      ? event.source
      : fromP("provider", "source", "system") ?? "EXTERNAL",
    channel: event.channel ?? fromP("channel"),
    confidence,
    externalId:
      event.externalId ?? fromP("recordId", "externalId", "id", "sourceId"),
    observedAt: fromP("observedAt", "syncedAt") ?? event.timestamp ?? null,
    details: p,
  };
}

// ── Related entities ────────────────────────────────────────────────────────

export interface RelatedEntityRef {
  id: string;
  label: string;
  type?: string;
  href?: string;
}

// Only entities with a real detail route in this app get a link.
const ENTITY_ROUTES: Record<string, (id: string) => string> = {
  deal: (id) => `/deals/${id}`,
  lead: (id) => `/leads/${id}`,
  customer: (id) => `/customers/${id}`,
  account: (id) => `/customers/${id}`,
  invoice: (id) => `/payment/${id}`,
};

function shortenId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function hrefFor(type: string | null | undefined, id: string): string | undefined {
  if (!type) return undefined;
  const key = type.toLowerCase().replace(/s$/, "");
  return ENTITY_ROUTES[key]?.(id);
}

/**
 * Resolve the entities an event relates to, richest signal first:
 *   1. structured `metadata.relatedEntities` / `metadata.related` ({id,type,label})
 *   2. typed id keys in metadata (dealId, invoiceId, companyId, …)
 *   3. bare `relatedEntityIds` (id only — rendered as a non-link chip)
 */
export function relatedEntitiesOf(event: CustomerTimelineEvent): RelatedEntityRef[] {
  const meta = metaRecord(event);
  const out: RelatedEntityRef[] = [];
  const seen = new Set<string>();

  const push = (ref: RelatedEntityRef) => {
    if (!ref.id || seen.has(ref.id)) return;
    seen.add(ref.id);
    out.push(ref);
  };

  const structured =
    (Array.isArray(meta.relatedEntities) && meta.relatedEntities) ||
    (Array.isArray(meta.related) && meta.related) ||
    null;

  if (structured) {
    for (const raw of structured) {
      if (!raw || typeof raw !== "object") continue;
      const e = raw as Record<string, unknown>;
      const id = String(e.id ?? e.entityId ?? e.refId ?? "");
      if (!id) continue;
      const type = e.type ?? e.entityType ?? e.kind;
      const typeStr = type ? String(type) : undefined;
      push({
        id,
        type: typeStr,
        label: String(e.label ?? e.name ?? (typeStr ? `${titleCase(typeStr)} ${shortenId(id)}` : shortenId(id))),
        href: hrefFor(typeStr, id),
      });
    }
  }

  const IGNORED_ID_KEYS = new Set([
    "customerId",
    "organizationId",
    "orgId",
    "actorId",
    "userId",
    "idempotencyKey",
  ]);

  for (const [key, value] of Object.entries(meta)) {
    if (typeof value !== "string" && typeof value !== "number") continue;
    if (IGNORED_ID_KEYS.has(key)) continue;
    const m = /^([a-zA-Z]+)Id$/.exec(key);
    if (!m) continue;
    const type = m[1];
    const id = String(value);
    push({
      id,
      type,
      label: `${titleCase(type)} ${shortenId(id)}`,
      href: hrefFor(type, id),
    });
  }

  for (const raw of event.relatedEntityIds || []) {
    const id = String(raw ?? "");
    if (id) push({ id, label: shortenId(id) });
  }

  return out;
}

/** Human-readable one-liner for the event body, if the backend supplied one. */
export function eventSummary(event: CustomerTimelineEvent): string | null {
  const meta = metaRecord(event);
  for (const key of [
    "__backend_pending_title",
    "summary",
    "description",
    "message",
    "title",
    "note",
    "body",
  ]) {
    const v = meta[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  // status transitions are common and worth spelling out
  const prev = meta.previousStatus ?? meta.fromStatus ?? meta.from;
  const next = meta.currentStatus ?? meta.toStatus ?? meta.to;
  if (typeof prev === "string" && typeof next === "string") {
    return `${prev} → ${next}`;
  }
  // detail fields we can assemble inline (e.g. deal_amount, invoice total)
  const dealName = meta.dealName ?? meta.deal;
  const stageInfo =
    typeof meta.fromStage === "string" && typeof meta.toStage === "string"
      ? `${String(meta.fromStage)} → ${String(meta.toStage)}`
      : null;
  if (typeof dealName === "string" && stageInfo) {
    return `${String(dealName)} — ${stageInfo}`;
  }
  return null;
}

// ── Communication events ────────────────────────────────────────────────────
// Email / WhatsApp / Call / Meeting events flow through the SAME common timeline
// DTO (Prashant's Customer Timeline service) — there is no channel-specific API.
// The communication-specific facts live in the free-form `metadata` bag, so we
// read them defensively (multiple candidate key names, every field optional),
// exactly as the rest of this file already treats `metadata`. If Prashant later
// publishes a fixed metadata schema, tighten the key lists below to match.

const COMMUNICATION_CATEGORIES: ReadonlySet<TimelineCategory> = new Set<TimelineCategory>([
  "email",
  "whatsapp",
  "call",
  "meeting",
]);

/** True when the event should render the communication-detail affordances. */
export function isCommunicationEvent(event: CustomerTimelineEvent): boolean {
  return COMMUNICATION_CATEGORIES.has(categoryOf(event));
}

export type CommunicationDirection = "inbound" | "outbound" | "internal";

export interface CommunicationParticipant {
  /** Display name when known, otherwise the address / handle / number. */
  label: string;
  email?: string;
  phone?: string;
  /** "from" | "to" | "cc" | "bcc" | "attendee" | free-form backend value. */
  role?: string;
}

export interface CommunicationCallDetails {
  outcome: string | null;
  status: string | null;
  recordingUrl: string | null;
  fromNumber: string | null;
  toNumber: string | null;
}

export interface CommunicationMeetingDetails {
  joinUrl: string | null;
  location: string | null;
  startsAt: string | null;
  endsAt: string | null;
  provider: string | null;
}

export interface CommunicationDetails {
  direction: CommunicationDirection | null;
  subject: string | null;
  participants: CommunicationParticipant[];
  /** Normalised to whole seconds when any duration hint was supplied. */
  durationSeconds: number | null;
  call: CommunicationCallDetails;
  meeting: CommunicationMeetingDetails;
  threadIds: Array<{ label: string; value: string }>;
  /** True when at least one communication-specific field was found. */
  hasAny: boolean;
}

function readString(v: unknown): string | null {
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}

function readNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) {
    return Number(v);
  }
  return null;
}

function pickString(
  meta: Record<string, unknown>,
  keys: string[]
): string | null {
  for (const k of keys) {
    const hit = readString(meta[k]);
    if (hit) return hit;
  }
  return null;
}

function normalizeDirection(raw: string | null): CommunicationDirection | null {
  if (!raw) return null;
  const t = raw.toLowerCase();
  if (/in(bound|coming)?|received|from[_ -]?customer/.test(t)) return "inbound";
  if (/out(bound|going)?|sent|to[_ -]?customer/.test(t)) return "outbound";
  if (/internal|note/.test(t)) return "internal";
  return null;
}

function toParticipant(
  raw: unknown,
  roleHint?: string
): CommunicationParticipant | null {
  if (raw == null) return null;
  if (typeof raw === "string" || typeof raw === "number") {
    const s = String(raw).trim();
    if (!s) return null;
    return { label: s, email: s.includes("@") ? s : undefined, role: roleHint };
  }
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const name = pickString(o, ["name", "displayName", "display_name", "fullName", "full_name"]);
    const email = pickString(o, ["email", "emailAddress", "email_address", "address"]);
    const phone = pickString(o, ["phone", "phoneNumber", "phone_number", "number", "msisdn"]);
    const role = pickString(o, ["role", "type", "kind"]) ?? roleHint;
    const label = name ?? email ?? phone;
    if (!label) return null;
    return {
      label,
      email: email ?? undefined,
      phone: phone ?? undefined,
      role: role ?? undefined,
    };
  }
  return null;
}

function collectParticipants(
  meta: Record<string, unknown>
): CommunicationParticipant[] {
  const out: CommunicationParticipant[] = [];
  const seen = new Set<string>();

  const add = (p: CommunicationParticipant | null) => {
    if (!p) return;
    const key = (p.email ?? p.phone ?? p.label).toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(p);
  };

  const fromSource = (v: unknown, roleHint?: string) => {
    if (Array.isArray(v)) v.forEach((el) => add(toParticipant(el, roleHint)));
    else if (v != null) add(toParticipant(v, roleHint));
  };

  fromSource(meta.from ?? meta.sender, "from");
  fromSource(meta.to ?? meta.recipients, "to");
  fromSource(meta.cc, "cc");
  fromSource(meta.bcc, "bcc");
  fromSource(meta.attendees, "attendee");
  fromSource(meta.participants);
  fromSource(meta.members);

  return out;
}

function readDurationSeconds(meta: Record<string, unknown>): number | null {
  const sec = readNumber(
    meta.durationSeconds ?? meta.duration_seconds ?? meta.durationSec ?? meta.duration_sec
  );
  if (sec != null) return Math.round(sec);
  const min = readNumber(
    meta.durationMinutes ?? meta.duration_minutes ?? meta.durationMins ?? meta.duration_min
  );
  if (min != null) return Math.round(min * 60);
  const ms = readNumber(meta.durationMs ?? meta.duration_ms ?? meta.durationMillis);
  if (ms != null) return Math.round(ms / 1000);
  const raw = readNumber(meta.duration);
  if (raw != null) return Math.round(raw); // assume seconds when unit-less
  return null;
}

function readThreadIds(
  meta: Record<string, unknown>
): Array<{ label: string; value: string }> {
  const probes: Array<[string, string[]]> = [
    ["Thread", ["threadId", "thread_id", "gmailThreadId", "emailThreadId"]],
    ["Message", ["messageId", "message_id", "providerMessageId", "waMessageId", "wamid"]],
    ["Conversation", ["conversationId", "conversation_id", "chatId", "chat_id"]],
    ["Call", ["callId", "call_id", "callSid", "call_sid"]],
    ["Meeting", ["meetingId", "meeting_id", "icalUid", "iCalUID", "eventId"]],
  ];
  const out: Array<{ label: string; value: string }> = [];
  const seen = new Set<string>();
  for (const [label, keys] of probes) {
    const value = pickString(meta, keys);
    if (value && !seen.has(value)) {
      seen.add(value);
      out.push({ label, value });
    }
  }
  return out;
}

/**
 * Pull the communication-specific facts out of a timeline event's `metadata`.
 * Every field is optional; `hasAny` is false when the backend supplied none.
 */
export function communicationDetailsOf(
  event: CustomerTimelineEvent
): CommunicationDetails {
  const meta = metaRecord(event);

  const direction = normalizeDirection(
    pickString(meta, [
      "direction",
      "messageDirection",
      "message_direction",
      "callDirection",
      "call_direction",
    ])
  );
  const subject = pickString(meta, [
    "subject",
    "emailSubject",
    "email_subject",
    "title",
    "topic",
    "headline",
  ]);
  const participants = collectParticipants(meta);
  const durationSeconds = readDurationSeconds(meta);

  const call: CommunicationCallDetails = {
    outcome: pickString(meta, ["outcome", "callOutcome", "call_outcome", "disposition", "callDisposition"]),
    status: pickString(meta, ["callStatus", "call_status", "status"]),
    recordingUrl: pickString(meta, ["recordingUrl", "recording_url", "callRecordingUrl", "recording"]),
    fromNumber: pickString(meta, ["fromNumber", "from_number", "callerNumber", "caller"]),
    toNumber: pickString(meta, ["toNumber", "to_number", "calleeNumber", "callee"]),
  };

  const meeting: CommunicationMeetingDetails = {
    joinUrl: pickString(meta, [
      "joinUrl", "join_url", "meetingUrl", "meeting_url",
      "conferenceUrl", "conference_url", "hangoutLink", "videoUrl",
    ]),
    location: pickString(meta, ["location", "meetingLocation", "meeting_location", "place"]),
    startsAt: pickString(meta, ["startTime", "start_time", "startsAt", "starts_at", "start", "scheduledStart"]),
    endsAt: pickString(meta, ["endTime", "end_time", "endsAt", "ends_at", "end", "scheduledEnd"]),
    provider: pickString(meta, ["meetingProvider", "meeting_provider", "conferenceProvider", "platform"]),
  };

  const threadIds = readThreadIds(meta);

  const hasAny = Boolean(
    direction ||
      subject ||
      participants.length ||
      durationSeconds != null ||
      call.outcome ||
      call.status ||
      call.recordingUrl ||
      call.fromNumber ||
      call.toNumber ||
      meeting.joinUrl ||
      meeting.location ||
      meeting.startsAt ||
      meeting.endsAt ||
      meeting.provider ||
      threadIds.length
  );

  return { direction, subject, participants, durationSeconds, call, meeting, threadIds, hasAny };
}

export function directionLabel(
  direction: CommunicationDirection | null
): string | null {
  if (!direction) return null;
  if (direction === "inbound") return "Inbound";
  if (direction === "outbound") return "Outbound";
  return "Internal";
}

/** "3665" seconds -> "1h 1m" ; "95" -> "1m 35s" ; "12" -> "12s". */
export function formatDuration(totalSeconds: number | null): string | null {
  if (totalSeconds == null || !Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return null;
  }
  const s = Math.round(totalSeconds);
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  return `${seconds}s`;
}
