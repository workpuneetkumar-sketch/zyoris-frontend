/**
 * lib/api/workflowsApi.ts
 * ─────────────────────────────────────────────────────────────
 * Service layer for the Workflow-building Agent.
 *
 * Endpoints:
 *   GET  /api/workflows/drafts         — list all workflow drafts
 *   GET  /api/workflows/drafts/:id     — single draft detail
 *   POST /api/workflows/drafts/:id/submit — send draft into Approval Queue
 *
 * Mock flag: NEXT_PUBLIC_USE_MOCKS !== "false"
 *
 * Non-negotiable:
 * - "Send for Approval" uses the existing POST /api/approvals path via
 *   the dedicated /submit endpoint — no new approval logic.
 * - validationStatus is normalised to uppercase at this layer.
 * - A draft with unresolved validationIssues MUST NOT be submittable;
 *   that guard is enforced in the component but also validated here.
 */

import api from "@/lib/api/api";
import type {
  WorkflowDraftReview,
  WorkflowDraftStep,
  WorkflowValidationStatus,
  WorkflowSubmitResponse,
} from "@/lib/types/agent-results";

// ─── Mock flag ────────────────────────────────────────────────────────────────

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_DRAFTS: WorkflowDraftReview[] = [
  {
    id: "wf-draft-001",
    agentId: "workflow-building-agent",
    agentName: "Workflow-building Agent",
    type: "WorkflowDraftReview",
    workflowName: "Lead Nurture — CONTACTED to QUALIFIED",
    trigger: {
      label: "Lead status changes to CONTACTED",
      conditions: {
        objectType: "lead",
        fieldName: "status",
        operator: "EQUALS",
        value: "CONTACTED",
      },
    },
    steps: [
      {
        order: 1,
        actionLabel: "Wait 24 hours",
        actionType: "DELAY",
        params: { duration: "24h" },
      },
      {
        order: 2,
        actionLabel: "Send personalised follow-up email",
        actionType: "SEND_EMAIL",
        targetEntity: "lead",
        params: {
          templateId: "tpl-follow-up-1",
          senderId: "noreply@zyoris.com",
        },
      },
      {
        order: 3,
        actionLabel: "If email opened → update lead score +10",
        actionType: "CONDITIONAL_UPDATE",
        targetEntity: "lead",
        params: { field: "score", delta: 10, condition: "EMAIL_OPENED" },
      },
      {
        order: 4,
        actionLabel: "Assign to rep if score ≥ 50",
        actionType: "ASSIGN_LEAD",
        targetEntity: "lead",
        params: { scoreThreshold: 50, assignmentStrategy: "round_robin" },
      },
    ],
    validationStatus: "VALID",
    validationIssues: [],
    evidence: [
      {
        source: "Historical Lead Conversion Data",
        label: "24h follow-up lifts conversion by 18%",
        snippet: "Analysis of 1,200 leads over 6 months shows 18% better conversion with timely follow-up.",
      },
    ],
    confidenceScore: 85,
    draftState: "DRAFT",
    createdAt: new Date(Date.now() - 3_600_000 * 2).toISOString(),
    executionId: "exec-wf-draft-001",
  },
  {
    id: "wf-draft-002",
    agentId: "workflow-building-agent",
    agentName: "Workflow-building Agent",
    type: "WorkflowDraftReview",
    workflowName: "Overdue Invoice — Escalation",
    trigger: {
      label: "Invoice status changes to OVERDUE",
      conditions: { objectType: "invoice", fieldName: "status", value: "OVERDUE" },
    },
    steps: [
      {
        order: 1,
        actionLabel: "Send payment reminder email to customer",
        actionType: "SEND_EMAIL",
        targetEntity: "contact",
        params: { templateId: "tpl-invoice-reminder" },
      },
      {
        order: 2,
        actionLabel: "Create task for Account Manager to call",
        actionType: "CREATE_TASK",
        targetEntity: "user",
        params: { taskType: "CALL", priority: "HIGH", dueDays: 1 },
      },
      {
        order: 3,
        actionLabel: "Notify CFO dashboard if unpaid after 7 days",
        actionType: "NOTIFY_DASHBOARD",
        targetEntity: "dashboard",
        params: { dashboardId: "cfo", daysThreshold: 7 },
      },
    ],
    validationStatus: "NEEDS_REVIEW",
    validationIssues: [
      "Step 3 references a dashboard notification channel not yet configured in integrations.",
    ],
    evidence: [
      {
        source: "Finance Policy",
        label: "Overdue invoices require 3-touch escalation",
        snippet: "Finance SOP mandates email, call, and management alert within 7 days of overdue.",
      },
    ],
    confidenceScore: 72,
    draftState: "DRAFT",
    createdAt: new Date(Date.now() - 3_600_000 * 5).toISOString(),
  },
  {
    id: "wf-draft-003",
    agentId: "workflow-building-agent",
    agentName: "Workflow-building Agent",
    type: "WorkflowDraftReview",
    workflowName: "Deal Won — Onboarding Kickoff",
    trigger: {
      label: "Deal stage changes to CLOSED_WON",
      conditions: { objectType: "deal", fieldName: "stage", value: "CLOSED_WON" },
    },
    steps: [
      {
        order: 1,
        actionLabel: "Create onboarding project from template",
        actionType: "CREATE_PROJECT",
        targetEntity: "deal",
        params: { templateId: "tpl-onboarding-standard" },
      },
      {
        order: 2,
        actionLabel: "Invite customer to customer portal",
        actionType: "SEND_PORTAL_INVITE",
        targetEntity: "contact",
        params: { portalTier: "STANDARD" },
      },
      {
        order: 3,
        actionLabel: "Send internal Slack notification to CS team",
        actionType: "SEND_NOTIFICATION",
        params: { channel: "cs-team", message: "New customer onboarding started." },
      },
    ],
    validationStatus: "INVALID",
    validationIssues: [
      "Step 1: Template 'tpl-onboarding-standard' does not exist in the project templates library.",
      "Step 3: Slack integration is not connected. Go to Integrations to connect Slack first.",
    ],
    evidence: [
      {
        source: "CS Playbook",
        label: "Onboarding SLA: project created within 24h of close",
        snippet: "CS team requires a project and portal invite within 1 business day of deal close.",
      },
    ],
    confidenceScore: 61,
    draftState: "DRAFT",
    createdAt: new Date(Date.now() - 86_400_000).toISOString(),
  },
];

// ─── Normalisation ────────────────────────────────────────────────────────────

function normaliseDraft(raw: WorkflowDraftReview): WorkflowDraftReview {
  return {
    ...raw,
    validationStatus: (typeof raw.validationStatus === "string"
      ? raw.validationStatus.toUpperCase()
      : raw.validationStatus) as WorkflowValidationStatus,
    // Ensure draftState is always "DRAFT" — never trust a different value
    draftState: "DRAFT",
    steps: Array.isArray(raw.steps)
      ? [...raw.steps].sort((a, b) => a.order - b.order)
      : [],
    validationIssues: Array.isArray(raw.validationIssues)
      ? raw.validationIssues
      : [],
    evidence: Array.isArray(raw.evidence) ? raw.evidence : [],
  };
}

function normaliseList(raw: unknown): WorkflowDraftReview[] {
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    if (r.data && typeof r.data === "object") return normaliseList(r.data);
  }
  if (Array.isArray(raw)) return (raw as WorkflowDraftReview[]).map(normaliseDraft);

  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const list: WorkflowDraftReview[] | null =
      Array.isArray(obj.drafts)  ? (obj.drafts as WorkflowDraftReview[])  :
      Array.isArray(obj.items)   ? (obj.items as WorkflowDraftReview[])   :
      Array.isArray(obj.results) ? (obj.results as WorkflowDraftReview[]) :
      Array.isArray(obj.data)    ? (obj.data as WorkflowDraftReview[])    :
      null;

    if (list !== null) return list.map(normaliseDraft);
  }

  console.warn("[workflowsApi] Unexpected list response shape:", raw);
  return [];
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * GET /api/workflows/drafts
 * All workflow drafts (paginated if the backend supports it).
 */
export async function getWorkflowDrafts(): Promise<WorkflowDraftReview[]> {
  if (USE_MOCKS) {
    await new Promise((r) => setTimeout(r, 650));
    return MOCK_DRAFTS.map(normaliseDraft);
  }

  try {
    const res = await api.get("/api/workflows/drafts");
    return normaliseList(res.data);
  } catch (err: any) {
    throw new Error(
      err.response?.data?.message ||
        err.message ||
        "Failed to load workflow drafts."
    );
  }
}

/**
 * GET /api/workflows/drafts/:draftId
 * Single draft with full step details and evidence.
 */
export async function getWorkflowDraft(
  draftId: string
): Promise<WorkflowDraftReview> {
  if (USE_MOCKS) {
    await new Promise((r) => setTimeout(r, 400));
    const found = MOCK_DRAFTS.find((d) => d.id === draftId);
    if (!found) throw new Error(`Workflow draft "${draftId}" not found.`);
    return normaliseDraft(found);
  }

  try {
    const res = await api.get(`/api/workflows/drafts/${draftId}`);
    const raw = res.data?.data ?? res.data;
    return normaliseDraft(raw as WorkflowDraftReview);
  } catch (err: any) {
    throw new Error(
      err.response?.data?.message ||
        err.message ||
        `Failed to load workflow draft "${draftId}".`
    );
  }
}

/**
 * POST /api/workflows/drafts/:draftId/submit
 * Send the draft into the existing Approval Queue.
 *
 * Guard: drafts with unresolved validationIssues cannot be submitted —
 * this is enforced in the component BUT also validated here so no
 * accidental request ever reaches the server.
 */
export async function submitWorkflowDraftForApproval(
  draftId: string,
  draft: WorkflowDraftReview
): Promise<WorkflowSubmitResponse> {
  const blockingIssues = (draft.validationIssues ?? []).filter(Boolean);
  if (draft.validationStatus === "INVALID" || blockingIssues.length > 0) {
    throw new Error(
      "This workflow draft has unresolved validation issues and cannot be sent for approval."
    );
  }

  if (USE_MOCKS) {
    await new Promise((r) => setTimeout(r, 700));
    const mockId = `mock-approval-wf-${Date.now()}`;
    // Mutate in-place so re-fetches show the link
    const found = MOCK_DRAFTS.find((d) => d.id === draftId);
    if (found) found.approvalRequestId = mockId;
    return { approvalRequestId: mockId, message: "Workflow draft sent for approval." };
  }

  try {
    const res = await api.post(`/api/workflows/drafts/${draftId}/submit`, {
      workflowName: draft.workflowName,
    });
    const data = res.data?.data ?? res.data;
    return {
      approvalRequestId:
        data.approvalRequestId ??
        data.approvalId ??
        data.id,
      message: data.message,
    };
  } catch (err: any) {
    if (err.response?.status === 409) {
      throw new Error(
        err.response?.data?.message ||
          "This draft has already been submitted for approval."
      );
    }
    throw new Error(
      err.response?.data?.message ||
        err.message ||
        `Failed to submit workflow draft "${draftId}" for approval.`
    );
  }
}

// Re-export types
export type {
  WorkflowDraftReview,
  WorkflowDraftStep,
  WorkflowSubmitResponse,
} from "@/lib/types/agent-results";
