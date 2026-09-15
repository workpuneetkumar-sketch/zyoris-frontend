export type ProposalRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type ProposalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'APPLIED';

export interface CrmUpdateProposal {
  id: string;
  organizationId: string;
  targetEntityType: string;
  targetEntityId: string;
  fieldChanges: Record<string, any>;
  evidenceIds: string[];
  riskLevel: ProposalRiskLevel;
  rationale: string;
  status: ProposalStatus;
  reviewedById?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Action Agent Proposal Types (Day 5) ──────────────────────────────────────

/**
 * Lifecycle status for an AgentApprovalRequest.
 * EXECUTED is the terminal success state (action ran on the backend).
 */
export type AgentApprovalStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXECUTED';

/**
 * A drafted email/message that the agent wants to send on the user's behalf.
 * The user can edit the body before approving.
 */
export interface DraftMessage {
  type: 'DraftMessage';
  to: string;
  subject?: string;
  /** Editable body — user can modify before approving */
  body: string;
  /** Optional CC recipients */
  cc?: string[];
  /** Channel: email | whatsapp | sms */
  channel?: 'email' | 'whatsapp' | 'sms' | string;
}

/**
 * A proposed CRM action (not a message send) — e.g. change deal stage,
 * update lead status, assign owner.
 */
export interface ProposedAction {
  type: 'ProposedAction';
  /** Short human-readable label, e.g. "Change deal stage to Won" */
  label: string;
  /** The entity type this action targets: lead | deal | contact | account */
  entityType: 'lead' | 'deal' | 'contact' | 'account' | string;
  /** The entity's ID */
  entityId: string;
  /** Key/value pairs showing what will change, e.g. { stage: "WON" } */
  changes: Record<string, unknown>;
  /** Optional: what happens if this is NOT done */
  consequence?: string;
}

/**
 * Evidence item explaining WHY the agent made this proposal.
 * Rendered in the "View Evidence" modal / tooltip.
 */
export interface ProposalEvidence {
  /** Short label, e.g. "Login activity" */
  label: string;
  /** The specific observation, e.g. "0 logins in 14 days" */
  observation: string;
  /** Optional link to the source record */
  sourceUrl?: string;
  /** Impact weight: how much this evidence contributed */
  weight?: 'high' | 'medium' | 'low';
}

/**
 * The top-level AgentApprovalRequest — what the backend creates when
 * an action agent proposes an action. Found inside
 * `AgentApprovalRequest.actionPreview` as a DraftMessage or ProposedAction.
 *
 * The frontend renders this as an ActionProposalCard instead of plain text.
 */
export interface AgentApprovalRequest {
  id: string;
  agentId: string;
  agentName?: string;
  /** Discriminated union — determines which card variant to render */
  actionPreview: DraftMessage | ProposedAction;
  /** Risk level of the proposed action */
  riskLevel: ProposalRiskLevel;
  /** Current lifecycle status */
  status: AgentApprovalStatus;
  /** WHY the agent proposed this — shown in evidence modal */
  evidence?: ProposalEvidence[];
  /** Agent's overall confidence 0–100 */
  confidenceScore?: number;
  /** ISO-8601 — when the agent created this request */
  createdAt: string;
  /** ISO-8601 — when this request expires (after which it cannot be executed) */
  expiresAt?: string;
  /** Set after the user decides */
  decidedAt?: string;
  decidedBy?: string;
  rejectionReason?: string;
}

/**
 * Response from POST /api/ai/approvals/:id/execute
 */
export interface ApprovalExecuteResult {
  success: boolean;
  approvalId: string;
  status: AgentApprovalStatus;
  message?: string;
  executedAt?: string;
}
