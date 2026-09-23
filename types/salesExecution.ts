// types/salesExecution.ts
// FE-1 Day 1: Sales Execution Activity Capture, Meeting Prep, and Meeting Intelligence

export type SalesChannel =
  | "EMAIL"
  | "CALENDAR"
  | "CALLS"
  | "MEETINGS"
  | "WHATSAPP";

export type ChannelFilterOption = SalesChannel | "ALL";

export type ActivityDuplicateStatus =
  | "UNIQUE"
  | "EXACT_DUPLICATE"
  | "LIKELY_DUPLICATE"
  | "CONFLICT"
  | string;

export type ActivityIdentityStatus =
  | "RESOLVED"
  | "POTENTIALLY_MATCHED"
  | "AMBIGUOUS"
  | "UNRESOLVED"
  | "MANUAL_REVIEW"
  | string;

export interface ActivityParticipant {
  role?: string;
  email?: string;
  name?: string;
  isExternal?: boolean;
  phone?: string;
  [key: string]: unknown;
}

export interface CapturedActivity {
  id: string;
  organizationId: string;
  channel: SalesChannel;
  activityType: string;
  source: string;
  externalId?: string | null;
  idempotencyKey?: string;
  fingerprint?: string;
  duplicateStatus: ActivityDuplicateStatus;
  identityStatus: ActivityIdentityStatus;
  identityConfidence?: number | null;
  identityMatchReasons?: string[];
  customerId?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  dealId?: string | null;
  leadId?: string | null;
  subject?: string | null;
  content?: string | null;
  participants?: ActivityParticipant[];
  actor?: {
    email?: string;
    name?: string;
    phone?: string;
  } | null;
  sourceMetadata?: Record<string, unknown> | null;
  rawPayload?: Record<string, unknown> | null;
  processingStatus?: string;
  errorMessage?: string | null;
  occurredAt: string;
  receivedAt: string;
  createdAt?: string;
  updatedAt?: string;
  customer?: {
    id: string;
    name?: string;
    companyName?: string;
    email?: string;
    phone?: string;
  } | null;
  deal?: {
    id: string;
    title?: string;
    name?: string;
    stage?: string;
    amount?: number;
    value?: number;
    currency?: string;
  } | null;
  contact?: {
    id: string;
    name?: string;
    email?: string;
    phone?: string;
    title?: string;
  } | null;
  company?: {
    id: string;
    name?: string;
    domain?: string;
  } | null;
}

export interface SalesActivitiesFilter {
  channel?: SalesChannel | string;
  customerId?: string;
  dealId?: string;
  contactId?: string;
  identityStatus?: string;
  page?: number;
  limit?: number;
  search?: string;
}

export interface SalesActivitiesPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SalesActivitiesResponse {
  success: boolean;
  data: CapturedActivity[];
  pagination: SalesActivitiesPagination;
  message?: string;
}

export interface SingleActivityResponse {
  success: boolean;
  data: CapturedActivity;
  message?: string;
}

export interface CreateSalesActivityPayload {
  channel: SalesChannel;
  source?: string;
  externalId?: string;
  payload: Record<string, unknown>;
  customerId?: string;
  dealId?: string;
  contactId?: string;
  leadId?: string;
}

// ── Meeting Prep Types ────────────────────────────────────────────────────────

export interface StakeholderBrief {
  name: string;
  role?: string;
  email?: string;
  title?: string;
  influence?: string;
}

export interface PrepObservedActivity {
  type?: string;
  channel?: string;
  summary?: string;
  timestamp?: string;
  source?: string;
  evidence?: string;
}

export interface PrepCommitment {
  description: string;
  owner?: string;
  status?: string;
  sourceDate?: string;
  evidence?: string;
  confidence?: number;
}

export interface PrepActionItem {
  task: string;
  assignee?: string;
  dueDate?: string | null;
  evidence?: string;
  confidence?: number;
}

export interface PrepRisk {
  risk?: string;
  description?: string;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | string;
  evidence?: string;
  category?: string;
}

export interface PrepAgendaItem {
  topic: string;
  durationMins?: number;
  rationale?: string;
}

export interface MeetingPrepBrief {
  meetingContext: {
    title: string;
    scheduledStartTime?: string;
    account?: {
      id?: string;
      name?: string;
      domain?: string;
      industry?: string;
    } | null;
    customer?: {
      id?: string;
      name?: string;
      email?: string;
      company?: string;
    } | null;
    deal?: {
      id?: string;
      title?: string;
      name?: string;
      stage?: string;
      amount?: number;
      probability?: number;
    } | null;
    stakeholders?: StakeholderBrief[];
  };
  observedFacts: {
    recentActivities?: PrepObservedActivity[];
    previousCommitments?: PrepCommitment[];
    openActionItems?: PrepActionItem[];
    knownRisks?: PrepRisk[];
  };
  derivedContext?: {
    dealHealth?: string;
    engagementVelocity?: string;
    talkingPoints?: string[];
  };
  recommendations: {
    suggestedAgenda?: PrepAgendaItem[];
    openQuestions?: string[];
  };
}

export interface MeetingPrepResponse {
  success: boolean;
  data: MeetingPrepBrief;
  message?: string;
}

// ── Meeting Transcript & Intelligence Types ──────────────────────────────────

export type IntelligenceStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface IntelligenceActionItem {
  task: string;
  dueDate?: string | null;
  assignee?: string;
  evidence?: string;
  confidence?: number;
}

export interface IntelligenceCommitment {
  owner: string;
  status: string;
  description: string;
  evidence?: string;
  confidence?: number;
}

export interface IntelligenceObjection {
  objection: string;
  objectionType?: string;
  evidence?: string;
  resolved: boolean;
  response?: string;
  confidence?: number;
}

export interface IntelligenceRequirement {
  requirement: string;
  status?: string;
  evidence?: string;
  confidence?: number;
}

export interface IntelligenceRisk {
  type?: string;
  severity?: string;
  description: string;
  evidence?: string;
}

export interface IntelligenceParticipant {
  name: string;
  role?: string;
  sentiment?: "POSITIVE" | "NEUTRAL" | "NEGATIVE" | string;
}

export interface MeetingIntelligence {
  id: string;
  meetingId?: string | null;
  activityId?: string | null;
  dealId?: string | null;
  customerId?: string | null;
  contactId?: string | null;
  status: IntelligenceStatus;
  summary: string | null;
  actionItems: IntelligenceActionItem[];
  commitments: IntelligenceCommitment[];
  objections: IntelligenceObjection[];
  requirements: IntelligenceRequirement[];
  importantTopics: string[];
  risks: IntelligenceRisk[];
  participants: IntelligenceParticipant[];
  modelMetadata?: {
    model?: string;
    provider?: string;
    latencyMs?: number;
    promptVersion?: string;
    [key: string]: unknown;
  } | null;
  errorMessage?: string | null;
  processedAt?: string | null;
}

export interface MeetingIntelligenceResponse {
  success: boolean;
  data: MeetingIntelligence;
  message?: string;
}

export interface SubmitTranscriptPayload {
  transcript: string;
  meetingId?: string;
  activityId?: string;
  dealId?: string;
  customerId?: string;
  contactId?: string;
}
