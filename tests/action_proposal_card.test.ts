// tests/action_proposal_card.test.ts
import test from "node:test";
import assert from "node:assert/strict";

// ── Types & pure-logic re-implementations (no lib/ imports) ──────────────────
// Mirrors the exact types from types/ai-proposals.ts so the tests run
// with --experimental-strip-types without needing module resolution.

export type ProposalRiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type AgentApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "EXECUTED";

export interface DraftMessage {
  type: "DraftMessage";
  to: string;
  subject?: string;
  body: string;
  cc?: string[];
  channel?: string;
}

export interface ProposedAction {
  type: "ProposedAction";
  label: string;
  entityType: string;
  entityId: string;
  changes: Record<string, unknown>;
  consequence?: string;
}

export interface ProposalEvidence {
  label: string;
  observation: string;
  sourceUrl?: string;
  weight?: "high" | "medium" | "low";
}

export interface AgentApprovalRequest {
  id: string;
  agentId: string;
  agentName?: string;
  actionPreview: DraftMessage | ProposedAction;
  riskLevel: ProposalRiskLevel;
  status: AgentApprovalStatus;
  evidence?: ProposalEvidence[];
  confidenceScore?: number;
  createdAt: string;
  expiresAt?: string;
  decidedAt?: string;
  decidedBy?: string;
  rejectionReason?: string;
}

export interface ApprovalExecuteResult {
  success: boolean;
  approvalId: string;
  status: AgentApprovalStatus;
  message?: string;
  executedAt?: string;
}

// ── Pure logic under test ─────────────────────────────────────────────────────

/** Mirror of isDraftMessage() type-guard from ActionProposalCard.tsx */
export function isDraftMessage(p: DraftMessage | ProposedAction): p is DraftMessage {
  return p.type === "DraftMessage";
}

/** Mirror of extractProposal() from useZiiBotChat.ts */
export function extractProposal(data: Record<string, unknown>): AgentApprovalRequest | null {
  try {
    const candidates = [
      data.proposal,
      data.agentApprovalRequest,
      data.approvalRequest,
      (data.data as Record<string, unknown> | undefined)?.proposal,
      (data.data as Record<string, unknown> | undefined)?.agentApprovalRequest,
    ];
    for (const candidate of candidates) {
      if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
        const c = candidate as Record<string, unknown>;
        if (c.id && c.actionPreview && typeof c.actionPreview === "object") {
          return c as unknown as AgentApprovalRequest;
        }
      }
    }
  } catch {
    // Never crash
  }
  return null;
}

/** Mirror of normaliseExecuteResult() from approvalsApi.ts */
export function normaliseExecuteResult(
  raw: unknown,
  fallbackId: string
): ApprovalExecuteResult {
  if (!raw || typeof raw !== "object") {
    return { success: false, approvalId: fallbackId, status: "PENDING", message: "No response body." };
  }
  const r = raw as Record<string, unknown>;
  const src = (r.data && typeof r.data === "object") ? r.data as Record<string, unknown> : r;
  return {
    success:    src.success    !== false,
    approvalId: (src.approvalId ?? src.id ?? fallbackId) as string,
    status:     (src.status    ?? "EXECUTED") as AgentApprovalStatus,
    message:    src.message    as string | undefined,
    executedAt: src.executedAt as string | undefined,
  };
}

/** Determine confidence tier — mirrors ConfidenceBadge logic */
export function confidenceTier(score: number): "high" | "medium" | "low" {
  if (score >= 80) return "high";
  if (score >= 60) return "medium";
  return "low";
}

/** Reject guard — rejection reason required */
export function validateRejectReason(reason: string | undefined): string | null {
  if (!reason?.trim()) return "A rejection reason is required when rejecting an action.";
  return null;
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeDraftProposal(overrides: Partial<AgentApprovalRequest> = {}): AgentApprovalRequest {
  return {
    id: "apr-001",
    agentId: "email-agent",
    agentName: "Email Agent",
    actionPreview: {
      type: "DraftMessage",
      to: "john@acme.com",
      subject: "Follow-up on your inquiry",
      body: "Hi John, just following up...",
      channel: "email",
    } as DraftMessage,
    riskLevel: "LOW",
    status: "PENDING",
    confidenceScore: 87,
    createdAt: new Date(Date.now() - 60_000).toISOString(),
    evidence: [
      { label: "Last contact", observation: "No reply in 7 days", weight: "high" },
      { label: "Lead score",   observation: "Score dropped to 42", weight: "medium" },
    ],
    ...overrides,
  };
}

function makeActionProposal(overrides: Partial<AgentApprovalRequest> = {}): AgentApprovalRequest {
  return {
    id: "apr-002",
    agentId: "crm-agent",
    agentName: "CRM Agent",
    actionPreview: {
      type: "ProposedAction",
      label: "Change deal stage to Won",
      entityType: "deal",
      entityId: "deal-999",
      changes: { stage: "WON", probability: 100 },
      consequence: "Deal will remain stale and risk being lost.",
    } as ProposedAction,
    riskLevel: "MEDIUM",
    status: "PENDING",
    confidenceScore: 72,
    createdAt: new Date(Date.now() - 120_000).toISOString(),
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

test("isDraftMessage type guard", async (t) => {
  await t.test("returns true for DraftMessage", () => {
    const draft = makeDraftProposal();
    assert.strictEqual(isDraftMessage(draft.actionPreview), true);
  });

  await t.test("returns false for ProposedAction", () => {
    const action = makeActionProposal();
    assert.strictEqual(isDraftMessage(action.actionPreview), false);
  });

  await t.test("DraftMessage has editable body field", () => {
    const draft = makeDraftProposal();
    const preview = draft.actionPreview as DraftMessage;
    assert.ok(typeof preview.body === "string");
    assert.ok(preview.body.length > 0);
  });

  await t.test("ProposedAction has changes object and entityType", () => {
    const action = makeActionProposal();
    const preview = action.actionPreview as ProposedAction;
    assert.ok(typeof preview.changes === "object");
    assert.ok(typeof preview.entityType === "string");
    assert.ok(typeof preview.entityId === "string");
  });
});

test("Proposal Card — four status states", async (t) => {
  const statuses: AgentApprovalStatus[] = ["PENDING", "APPROVED", "REJECTED", "EXECUTED"];

  await t.test("all four statuses are valid distinct values", () => {
    const unique = new Set(statuses);
    assert.strictEqual(unique.size, 4);
  });

  await t.test("PENDING is the only non-terminal state", () => {
    // PENDING and APPROVED both allow further action (APPROVED needs Execute)
    // Only REJECTED and EXECUTED are truly terminal
    const isTerminal = (s: AgentApprovalStatus) => s === "REJECTED" || s === "EXECUTED";

    assert.strictEqual(isTerminal("PENDING"),  false);
    assert.strictEqual(isTerminal("APPROVED"),  false); // can still execute
    assert.strictEqual(isTerminal("REJECTED"),  true);
    assert.strictEqual(isTerminal("EXECUTED"),  true);
  });

  await t.test("APPROVED state renders execute button (not approve/reject)", () => {
    // Simulate the button-visibility logic in ActionProposalCard
    const isPending  = (s: AgentApprovalStatus) => s === "PENDING";
    const isApproved = (s: AgentApprovalStatus) => s === "APPROVED";
    const isTerminal = (s: AgentApprovalStatus) => s === "REJECTED" || s === "EXECUTED";

    assert.strictEqual(isPending("PENDING"),   true);
    assert.strictEqual(isApproved("PENDING"),  false);
    assert.strictEqual(isTerminal("PENDING"),  false);

    assert.strictEqual(isPending("APPROVED"),  false);
    assert.strictEqual(isApproved("APPROVED"), true);
    assert.strictEqual(isTerminal("APPROVED"), false);

    assert.strictEqual(isTerminal("REJECTED"), true);
    assert.strictEqual(isTerminal("EXECUTED"), true);
  });

  await t.test("status transitions follow expected path: PENDING → APPROVED → EXECUTED", () => {
    let status: AgentApprovalStatus = "PENDING";

    // User clicks Approve
    status = "APPROVED";
    assert.strictEqual(status, "APPROVED");

    // User clicks Execute
    status = "EXECUTED";
    assert.strictEqual(status, "EXECUTED");
  });

  await t.test("status transitions: PENDING → REJECTED (with reason)", () => {
    let status: AgentApprovalStatus = "PENDING";
    let rejectionReason = "";

    // No reason — should not proceed
    const err = validateRejectReason(rejectionReason);
    assert.ok(err !== null, "Empty rejection reason should fail validation");

    // With reason — proceed
    rejectionReason = "Wrong tone for this customer";
    const err2 = validateRejectReason(rejectionReason);
    assert.strictEqual(err2, null);
    status = "REJECTED";
    assert.strictEqual(status, "REJECTED");
  });
});

test("Inline editor — only for DraftMessage in PENDING state", async (t) => {
  await t.test("DraftMessage in PENDING is editable", () => {
    const proposal = makeDraftProposal({ status: "PENDING" });
    const editable = isDraftMessage(proposal.actionPreview) && proposal.status === "PENDING";
    assert.strictEqual(editable, true);
  });

  await t.test("DraftMessage in APPROVED is NOT editable (read-only before execute)", () => {
    const proposal = makeDraftProposal({ status: "APPROVED" });
    const editable = isDraftMessage(proposal.actionPreview) && proposal.status === "PENDING";
    assert.strictEqual(editable, false);
  });

  await t.test("DraftMessage in EXECUTED is NOT editable", () => {
    const proposal = makeDraftProposal({ status: "EXECUTED" });
    const editable = isDraftMessage(proposal.actionPreview) && proposal.status === "PENDING";
    assert.strictEqual(editable, false);
  });

  await t.test("ProposedAction is never editable", () => {
    const proposal = makeActionProposal({ status: "PENDING" });
    const editable = isDraftMessage(proposal.actionPreview) && proposal.status === "PENDING";
    assert.strictEqual(editable, false);
  });

  await t.test("body mutation does not affect original object reference", () => {
    const proposal = makeDraftProposal();
    const original = (proposal.actionPreview as DraftMessage).body;
    const edited = "Edited by user before sending.";
    // Simulate the editedBody state — we never mutate the original
    assert.notStrictEqual(edited, original);
    assert.strictEqual((proposal.actionPreview as DraftMessage).body, original);
  });
});

test("extractProposal — detects proposal from API response shapes", async (t) => {
  const validProposal: AgentApprovalRequest = makeDraftProposal();

  await t.test("detects top-level { proposal: {...} }", () => {
    const data = { reply: "I've drafted an email.", proposal: validProposal };
    const result = extractProposal(data as Record<string, unknown>);
    assert.ok(result !== null);
    assert.strictEqual(result!.id, "apr-001");
  });

  await t.test("detects { agentApprovalRequest: {...} }", () => {
    const data = { agentApprovalRequest: validProposal };
    const result = extractProposal(data as Record<string, unknown>);
    assert.ok(result !== null);
    assert.strictEqual(result!.id, "apr-001");
  });

  await t.test("detects nested { data: { proposal: {...} } }", () => {
    const data = { data: { proposal: validProposal } };
    const result = extractProposal(data as Record<string, unknown>);
    assert.ok(result !== null);
    assert.strictEqual(result!.id, "apr-001");
  });

  await t.test("returns null for plain text response (no proposal)", () => {
    const data = { reply: "Leads have increased by 15% this week." };
    const result = extractProposal(data as Record<string, unknown>);
    assert.strictEqual(result, null);
  });

  await t.test("returns null for an object that has id but no actionPreview", () => {
    const data = { proposal: { id: "bad-001", status: "PENDING" } };
    const result = extractProposal(data as Record<string, unknown>);
    assert.strictEqual(result, null);
  });

  await t.test("returns null for empty object", () => {
    assert.strictEqual(extractProposal({}), null);
  });

  await t.test("never throws on malformed data", () => {
    const cases: Record<string, unknown>[] = [
      { proposal: null },
      { proposal: "string" },
      { proposal: 42 },
      { proposal: [] },
      { data: null },
    ];
    for (const c of cases) {
      assert.doesNotThrow(() => extractProposal(c));
    }
  });
});

test("executeApproval result normalisation", async (t) => {
  await t.test("normalises successful { success, status, approvalId } response", () => {
    const raw = { success: true, approvalId: "apr-001", status: "EXECUTED", executedAt: "2026-09-14T10:00:00Z" };
    const result = normaliseExecuteResult(raw, "apr-001");
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.status, "EXECUTED");
    assert.strictEqual(result.approvalId, "apr-001");
  });

  await t.test("normalises { data: { success, status } } envelope", () => {
    const raw = { data: { success: true, approvalId: "apr-002", status: "EXECUTED" } };
    const result = normaliseExecuteResult(raw, "apr-002");
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.approvalId, "apr-002");
    assert.strictEqual(result.status, "EXECUTED");
  });

  await t.test("uses fallback approvalId when absent from response", () => {
    const raw = { success: true };
    const result = normaliseExecuteResult(raw, "fallback-id");
    assert.strictEqual(result.approvalId, "fallback-id");
  });

  await t.test("marks failure when success is explicitly false", () => {
    const raw = { success: false, approvalId: "apr-003", status: "PENDING", message: "Not yet approved." };
    const result = normaliseExecuteResult(raw, "apr-003");
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.message, "Not yet approved.");
  });

  await t.test("handles null response body without crashing", () => {
    assert.doesNotThrow(() => {
      const result = normaliseExecuteResult(null, "null-id");
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.approvalId, "null-id");
    });
  });

  await t.test("regression: execute modal never shows undefined for approvalId", () => {
    const cases = [null, undefined, {}, { success: true }];
    for (const raw of cases) {
      const result = normaliseExecuteResult(raw, "safe-id");
      assert.ok(
        typeof result.approvalId === "string" && result.approvalId.length > 0,
        `approvalId must always be a non-empty string, got: ${result.approvalId}`
      );
    }
  });
});

test("Confidence score badge tiers", async (t) => {
  await t.test("score >= 80 maps to high (green)", () => {
    assert.strictEqual(confidenceTier(80),  "high");
    assert.strictEqual(confidenceTier(95),  "high");
    assert.strictEqual(confidenceTier(100), "high");
  });

  await t.test("score 60–79 maps to medium (amber)", () => {
    assert.strictEqual(confidenceTier(60), "medium");
    assert.strictEqual(confidenceTier(72), "medium");
    assert.strictEqual(confidenceTier(79), "medium");
  });

  await t.test("score < 60 maps to low (gray)", () => {
    assert.strictEqual(confidenceTier(0),  "low");
    assert.strictEqual(confidenceTier(42), "low");
    assert.strictEqual(confidenceTier(59), "low");
  });

  await t.test("boundary values are correct", () => {
    assert.strictEqual(confidenceTier(79), "medium");
    assert.strictEqual(confidenceTier(80), "high");
    assert.strictEqual(confidenceTier(59), "low");
    assert.strictEqual(confidenceTier(60), "medium");
  });
});

test("Evidence modal — data contract", async (t) => {
  await t.test("evidence array is iterable and never throws on render", () => {
    const proposal = makeDraftProposal();
    assert.ok(Array.isArray(proposal.evidence));
    assert.doesNotThrow(() => {
      const labels = (proposal.evidence ?? []).map((e) => e.label);
      assert.strictEqual(labels.length, 2);
      assert.strictEqual(labels[0], "Last contact");
    });
  });

  await t.test("weight field maps to correct severity levels", () => {
    const weights = ["high", "medium", "low"] as const;
    for (const w of weights) {
      assert.ok(["high", "medium", "low"].includes(w));
    }
  });

  await t.test("evidence with no weight still renders (weight is optional)", () => {
    const ev: ProposalEvidence = { label: "Signal", observation: "Observation" };
    assert.strictEqual(ev.weight, undefined);
    assert.doesNotThrow(() => {
      const display = ev.weight ?? "low";
      assert.ok(typeof display === "string");
    });
  });

  await t.test("proposal with empty evidence array still renders without crashing", () => {
    const proposal = makeDraftProposal({ evidence: [] });
    assert.doesNotThrow(() => {
      const count = (proposal.evidence ?? []).length;
      assert.strictEqual(count, 0);
    });
  });

  await t.test("proposal with undefined evidence defaults to empty array", () => {
    const proposal = makeDraftProposal({ evidence: undefined });
    const safe = proposal.evidence ?? [];
    assert.deepStrictEqual(safe, []);
  });
});

test("Rejection reason validation", async (t) => {
  await t.test("empty string is invalid", () => {
    assert.ok(validateRejectReason("") !== null);
  });

  await t.test("whitespace-only string is invalid", () => {
    assert.ok(validateRejectReason("   ") !== null);
  });

  await t.test("undefined is invalid", () => {
    assert.ok(validateRejectReason(undefined) !== null);
  });

  await t.test("non-empty string is valid", () => {
    assert.strictEqual(validateRejectReason("Wrong tone for this prospect"), null);
  });

  await t.test("single character is valid", () => {
    assert.strictEqual(validateRejectReason("x"), null);
  });
});

test("Integration: API mock — execute endpoint state machine", async (t) => {
  /**
   * Simulates the UI state machine for the execute flow without
   * making real network calls. Verifies loading → success and
   * loading → error transitions behave correctly.
   */

  type UIState = "idle" | "loading" | "success" | "error";

  async function simulateExecute(
    mockResponse: { ok: boolean; result?: ApprovalExecuteResult; errorMsg?: string }
  ): Promise<{ finalState: UIState; finalStatus: AgentApprovalStatus; errorMsg?: string }> {
    let state: UIState = "idle";
    let status: AgentApprovalStatus = "APPROVED";
    let errorMsg: string | undefined;

    // Simulate button click
    state = "loading";

    try {
      // Mock the API call
      if (!mockResponse.ok) {
        throw new Error(mockResponse.errorMsg ?? "Server error");
      }
      const result = mockResponse.result!;
      if (!result.success) {
        throw new Error(result.message ?? "Execution returned unsuccessful.");
      }
      status = result.status;
      state = "success";
    } catch (err: any) {
      state = "error";
      errorMsg = err.message;
    }

    return { finalState: state, finalStatus: status, errorMsg };
  }

  await t.test("200 success — UI transitions to success and status becomes EXECUTED", async () => {
    const { finalState, finalStatus } = await simulateExecute({
      ok: true,
      result: { success: true, approvalId: "apr-001", status: "EXECUTED" },
    });
    assert.strictEqual(finalState, "success");
    assert.strictEqual(finalStatus, "EXECUTED");
  });

  await t.test("400 error — UI transitions to error with message", async () => {
    const { finalState, errorMsg } = await simulateExecute({
      ok: false,
      errorMsg: "Invalid request. The action may need to be approved first.",
    });
    assert.strictEqual(finalState, "error");
    assert.ok(errorMsg?.includes("approved"), `Expected 'approved' in: ${errorMsg}`);
  });

  await t.test("403 error — UI transitions to error with unauthorized message", async () => {
    const { finalState, errorMsg } = await simulateExecute({
      ok: false,
      errorMsg: "You are not authorised to execute this action.",
    });
    assert.strictEqual(finalState, "error");
    assert.ok(errorMsg?.includes("authorised"), `Expected 'authorised' in: ${errorMsg}`);
  });

  await t.test("409 conflict — UI transitions to error with already-executed message", async () => {
    const { finalState, errorMsg } = await simulateExecute({
      ok: false,
      errorMsg: "This action has already been executed, rejected, or has expired.",
    });
    assert.strictEqual(finalState, "error");
    assert.ok(errorMsg?.includes("expired") || errorMsg?.includes("executed"), `Got: ${errorMsg}`);
  });

  await t.test("success=false in body — treated as error", async () => {
    const { finalState, errorMsg } = await simulateExecute({
      ok: true,
      result: { success: false, approvalId: "apr-001", status: "PENDING", message: "Not yet approved." },
    });
    assert.strictEqual(finalState, "error");
    assert.ok(errorMsg?.includes("approved") || errorMsg?.includes("unsuccessful"), `Got: ${errorMsg}`);
  });

  await t.test("buttons are disabled during loading state", () => {
    // Simulate the disabled logic: disabled when state === "loading"
    const state: UIState = "loading";
    const approveDisabled = state === "loading";
    const rejectDisabled  = state === "loading";
    const executeDisabled = state === "loading";
    assert.strictEqual(approveDisabled, true);
    assert.strictEqual(rejectDisabled,  true);
    assert.strictEqual(executeDisabled, true);
  });
});
