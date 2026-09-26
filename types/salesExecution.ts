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
  id?: string;
  sequenceId?: string;
  stepOrder: number;
  stepType:
    | "SEND_EMAIL"
    | "SEND_WHATSAPP"
    | "CALL_TASK"
    | "WAIT_DELAY"
    | "WAIT_CONDITION"
    | "BRANCH_CONDITION"
    | "CUSTOM_ACTION"
    | "EMAIL"
    | "CALL"
    | "TASK"
    | "WHATSAPP"
    | string;
  name?: string | null;
  config?: Record<string, unknown>;
  delayDays?: number;
  subject?: string;
  body?: string;
  [key: string]: unknown;
}

export interface CreateSequencePayload {
  name: string;
  description?: string;
  exitCriteria?: string;
  steps: SequenceStep[];
  [key: string]: unknown;
}

export interface SequenceRecord {
  id: string;
  name: string;
  description?: string;
  exitCriteria?: string;
  steps: SequenceStep[];
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface SequenceEnrollmentPayload {
  targetEntityType: "LEAD" | "CONTACT" | "CUSTOMER" | "DEAL" | string;
  targetEntityId: string;
  metadata?: Record<string, unknown>;
  contactId?: string;
  leadId?: string;
  customerId?: string;
  dealId?: string;
  [key: string]: unknown;
}

export interface SequenceEnrollment {
  id: string;
  organizationId?: string;
  sequenceId: string;
  targetEntityType?: string;
  targetEntityId?: string;
  contactId?: string;
  leadId?: string;
  customerId?: string;
  dealId?: string;
  currentStep?: number;
  currentStepOrder?: number;
  nextExecutionAt?: string | null;
  status:
    | "ACTIVE"
    | "PAUSED"
    | "COMPLETED"
    | "TERMINATED_REPLY"
    | "TERMINATED_OPT_OUT"
    | "TERMINATED_CONVERTED"
    | "CANCELLED"
    | "FAILED"
    | string;
  pauseReason?: string;
  terminationReason?: string | null;
  enrolledAt: string;
  completedAt?: string | null;
  lastStepExecutedAt?: string;
  [key: string]: unknown;
}

export interface AdvanceSequenceStepPayload {
  stepNumber?: number;
  action?: string;
}

export interface PauseSequencePayload {
  pauseReason?: string;
  status?: string;
}

// ── Task 1 — Activity & Identity Review Types ───────────────────────────────

export interface ActivityReviewItem {
  id: string;
  activityId: string;
  activity?: CapturedActivity;
  status: "PENDING" | "RESOLVED" | "DISMISSED" | string;
  reviewType: "DUPLICATE" | "IDENTITY" | string;
  conflictDetails?: Record<string, unknown>;
  confidence?: number;
  reason?: string;
  suggestedMatches?: Array<{
    id: string;
    name?: string;
    email?: string;
    confidence?: number;
  }>;
  createdAt: string;
  updatedAt?: string;
}

export interface ActivityReviewsResponse {
  success: boolean;
  data: ActivityReviewItem[];
  pagination?: SalesActivitiesPagination;
  message?: string;
}

export interface ResolveReviewPayload {
  resolution?: string;
  targetActivityId?: string;
  action?: string;
  customerId?: string;
  dealId?: string;
  contactId?: string;
  [key: string]: unknown;
}

export interface DismissReviewPayload {
  reason?: string;
  [key: string]: unknown;
}

// ── Task 2 — Proposals & Rules Types ────────────────────────────────────────

export type ProposalStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "APPLIED"
  | "CANCELLED";

export interface ProposalFieldChange {
  field: string;
  currentValue?: unknown;
  proposedValue?: unknown;
  reason?: string;
  confidence?: number;
  evidence?: string;
}

export interface SalesProposal {
  id: string;
  title?: string;
  targetEntityType?: "CUSTOMER" | "DEAL" | "CONTACT" | "COMPANY" | "LEAD" | string;
  targetEntityId?: string;
  field?: string;
  currentValue?: unknown;
  proposedValue?: unknown;
  rationale?: string;
  riskCategory?: string;
  riskLevel?: "LOW" | "MEDIUM" | "HIGH" | string;
  confidence?: number;
  dealId?: string;
  customerId?: string;
  deal?: { id: string; title: string; stage?: string };
  customer?: { id: string; name: string; email?: string };
  status: ProposalStatus | string;
  requiresApproval?: boolean;
  changes?: ProposalFieldChange[];
  proposedPrice?: number;
  discountPercentage?: number;
  notes?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  appliedAt?: string;
  evidenceIds?: string[];
  createdAt: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface CreateProposalPayload {
  targetEntityType: "CUSTOMER" | "DEAL" | "CONTACT" | "COMPANY" | "LEAD" | string;
  targetEntityId: string;
  field: string;
  proposedValue: unknown;
  rationale: string;
  currentValue?: unknown;
  confidence?: number;
  riskCategory?: "FINANCIAL" | "STAGE_CHANGE" | "OWNERSHIP" | "LIFECYCLE" | "SENSITIVE_DATA" | "METADATA" | string;
  evidenceIds?: string[];
  triggeringSignal?: string;
  source?: string;
  title?: string;
  dealId?: string;
  customerId?: string;
  proposedPrice?: number;
  discountPercentage?: number;
  changes?: ProposalFieldChange[];
  notes?: string;
  [key: string]: unknown;
}

export interface ProposalRule {
  id: string;
  name: string;
  condition: string;
  action: string;
  discountThreshold?: number;
  minDealValue?: number;
  autoApprove?: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface CreateProposalRulePayload {
  targetEntityType?: string;
  fieldName?: string;
  riskLevel?: "LOW" | "MEDIUM" | "HIGH" | string;
  approvalRequirement?: "AUTO_APPLY" | "REQUIRES_APPROVAL" | "BLOCKED" | string;
  minConfidenceAutoApply?: number;
  isActive?: boolean;
  description?: string;
  name?: string;
  condition?: string;
  action?: string;
  discountThreshold?: number;
  minDealValue?: number;
  autoApprove?: boolean;
  [key: string]: unknown;
}

// ── Task 2 — Outreach Generator & Drafts Types ──────────────────────────────

export type OutreachChannel = "EMAIL" | "WHATSAPP" | "CALL_SCRIPT" | "LINKEDIN";

export interface OutreachGeneratePayload {
  targetEntityType: "CUSTOMER" | "DEAL" | "CONTACT" | "COMPANY" | "LEAD" | string;
  targetEntityId: string;
  channel: OutreachChannel | string;
  tone?: string;
  objective?: string;
  templateId?: string;
  customPromptInstructions?: string;
  // Convenience aliases for UI flexibility
  leadId?: string;
  dealId?: string;
  customerId?: string;
  goal?: string;
  context?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface OutreachDraft {
  id: string;
  organizationId?: string;
  targetEntityType?: string;
  targetEntityId?: string;
  channel: OutreachChannel | string;
  subject?: string | null;
  body: string;
  content?: string;
  tone?: string;
  callToAction?: string | null;
  groundingMetadata?: Array<Record<string, unknown>>;
  groundedEvidence?: string[];
  personalizationFactors?: string[];
  templateId?: string | null;
  status: "DRAFT" | "APPROVED" | "SENT" | "DISCARDED" | "REJECTED" | string;
  createdAt: string;
  updatedAt?: string;
  leadId?: string;
  dealId?: string;
  customerId?: string;
  [key: string]: unknown;
}

// ── Task 2 — Sequence Executions & Detailed Enrollments ─────────────────────

export interface SequenceExecution {
  id: string;
  sequenceId: string;
  enrollmentId: string;
  stepNumber: number;
  channel: string;
  status: "SUCCESS" | "FAILED" | "PENDING" | "SKIPPED" | string;
  executedAt: string;
  error?: string;
  payload?: Record<string, unknown>;
}

