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

// ── Day 1 — Ingest & Timeline Types ─────────────────────────────────────────

export interface IngestActivityPayload {
  idempotencyKey?: string;
  eventType?: string;
  entityType?: string;
  entityId?: string;
  channel?: SalesChannel | string;
  source?: string;
  payload?: Record<string, unknown>;
  occurredAt?: string;
  customerId?: string;
  dealId?: string;
  contactId?: string;
  leadId?: string;
}

export interface TimelineFilter {
  entityType?: string;
  entityId?: string;
  channel?: string;
  page?: number;
  limit?: number;
}

// ── Day 2 — Sequences & Playbooks Types ─────────────────────────────────────

export interface SequenceStep {
  stepOrder: number;
  stepType: "EMAIL" | "CALL" | "TASK" | "WHATSAPP" | string;
  delayDays?: number;
  subject?: string;
  body?: string;
}

export interface CreateSequencePayload {
  name: string;
  description?: string;
  steps: SequenceStep[];
}

export interface SequenceRecord {
  id: string;
  name: string;
  description?: string;
  steps: SequenceStep[];
  status?: string;
  createdAt?: string;
}

export interface SequenceEnrollmentPayload {
  contactId?: string;
  leadId?: string;
  customerId?: string;
  dealId?: string;
}

export interface SequenceEnrollment {
  id: string;
  sequenceId: string;
  contactId?: string;
  leadId?: string;
  customerId?: string;
  dealId?: string;
  currentStep: number;
  status: "ACTIVE" | "PAUSED" | "COMPLETED" | string;
  pauseReason?: string;
  enrolledAt: string;
}

export interface AdvanceSequenceStepPayload {
  stepNumber?: number;
  action?: string;
}

export interface PauseSequencePayload {
  pauseReason?: string;
  status?: string;
}

export interface PlaybookStep {
  order: number;
  title: string;
  description: string;
  actionType: "DISCOVERY" | "DEMO" | "PROPOSAL" | "CLOSING" | "FOLLOW_UP" | string;
}

export interface CreatePlaybookPayload {
  name: string;
  description?: string;
  steps: PlaybookStep[];
}

export interface PlaybookRecord {
  id: string;
  name: string;
  description?: string;
  steps: PlaybookStep[];
  createdAt?: string;
}

export interface EvaluatePlaybookPayload {
  playbookId?: string;
  dealId?: string;
  leadId?: string;
  customerId?: string;
  context?: Record<string, unknown>;
}

export interface PlaybookEvaluationResult {
  playbookId?: string;
  score: number;
  recommendations: string[];
  nextBestActions: string[];
  status: string;
  evaluatedAt: string;
}

// ── Day 3 — Quotes & E-Sign Types ──────────────────────────────────────────

export interface QuoteItem {
  name?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  total?: number;
}

export interface CreateQuotePayload {
  title?: string;
  dealId?: string;
  customerId?: string;
  validUntil?: string;
  currency?: string;
  taxRate?: number;
  discount?: number;
  items: QuoteItem[];
}

export interface QuoteRecord {
  id: string;
  title: string;
  dealId?: string;
  customerId?: string;
  totalAmount: number;
  currency: string;
  status: "DRAFT" | "APPROVED" | "PDF_GENERATED" | "SENT_FOR_ESIGN" | "SIGNED" | string;
  items: QuoteItem[];
  validUntil?: string;
  pdfUrl?: string;
  envelopeId?: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface ApproveQuotePayload {
  comment?: string;
  approvedBy?: string;
}

export interface GenerateQuotePdfPayload {
  theme?: string;
  headerText?: string;
}

export interface EsignSigner {
  name: string;
  email: string;
  role?: string;
}

export interface QuoteEsignPayload {
  signers?: EsignSigner[];
  signerEmail?: string;
  message?: string;
}

export interface EsignWebhookPayload {
  eventId: string;
  envelopeId: string;
  eventType: "ENVELOPE_SENT" | "ENVELOPE_DELIVERED" | "ENVELOPE_SIGNED" | "ENVELOPE_DECLINED" | "ENVELOPE_EXPIRED" | string;
  status?: string;
  signerEmail?: string;
  payload?: Record<string, unknown>;
}

