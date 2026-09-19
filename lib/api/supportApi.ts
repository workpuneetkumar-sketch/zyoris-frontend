/**
 * lib/api/supportApi.ts
 * ─────────────────────────────────────────────────────────────
 * Service layer for the Support Agent.
 *
 * Endpoint: POST /api/agents/support/query
 *   Request:  SupportQueryPayload  { question, context? }
 *   Response: KnowledgeAnswer
 *
 * The backend Day 6 endpoint is being built in parallel.
 * While NEXT_PUBLIC_USE_MOCKS is not "false", every call
 * returns rich mock data so UI development is unblocked.
 * Swapping to live data is a one-line env-var change — zero
 * component edits required.
 *
 * Non-negotiable rules carried from Days 1–5:
 * - Normalise response shapes defensively (multiple key names).
 * - Normalise status / enum fields to uppercase at this layer.
 * - Throw Error with a user-friendly message; never return null
 *   on failure.
 */

import api from "@/lib/api/api";
import type {
  KnowledgeAnswer,
  SupportQueryPayload,
} from "@/lib/types/agent-results";

// ─── Mock flag ────────────────────────────────────────────────────────────────

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";

// ─── Mock data ────────────────────────────────────────────────────────────────

function buildMockAnswer(question: string): KnowledgeAnswer {
  return {
    id: `mock-support-${Date.now()}`,
    agentId: "support-agent",
    agentName: "Support Agent",
    type: "KnowledgeAnswer",
    question,
    answer:
      "Based on the knowledge base and recent case history, the recommended resolution " +
      "is to first verify the customer's subscription tier, then reset their API credentials " +
      "via the admin portal. If the issue persists after 10 minutes, escalate to Tier 2 " +
      "referencing case #CS-4821 which covers an identical root cause.",
    sources: [
      {
        id: "kb-001",
        title: "API Credential Reset — Step-by-Step Guide",
        snippet:
          "Navigate to Admin → Credentials → Reset. The change propagates within 5–10 minutes.",
        url: "/knowledge-base/kb-001",
        sourceType: "kb_article",
      },
      {
        id: "case-4821",
        title: "Case #CS-4821: Auth token not refreshing after plan upgrade",
        snippet:
          "Root cause was a stale session cache. Resolved by forcing credential regeneration.",
        sourceType: "case",
      },
      {
        id: "macro-reset",
        title: "Macro: Force API Credential Reset",
        snippet: "One-click macro that triggers credential regeneration for a customer.",
        sourceType: "macro",
      },
    ],
    evidence: [
      {
        source: "KB Article kb-001",
        label: "API Reset Guide",
        url: "/knowledge-base/kb-001",
        snippet: "Verified resolution path for auth-related issues.",
      },
      {
        source: "Case CS-4821",
        label: "Prior case with identical root cause",
        snippet: "Credential regeneration resolved the issue within 10 minutes.",
      },
    ],
    confidenceScore: 87,
    createdAt: new Date().toISOString(),
    executionId: `exec-support-${Date.now()}`,
  };
}

// ─── Response normalisation ───────────────────────────────────────────────────

function normaliseAnswer(raw: unknown): KnowledgeAnswer {
  // Handle { data: KnowledgeAnswer } envelope
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    if (r.data && typeof r.data === "object") {
      return normaliseAnswer(r.data);
    }
    // answer may be keyed as "result" or "output" in some adapters
    if (r.result && typeof r.result === "object") {
      return normaliseAnswer(r.result);
    }
    if (r.output && typeof r.output === "object") {
      return normaliseAnswer(r.output);
    }
  }
  const answer = raw as KnowledgeAnswer;
  // Ensure sources is always an array
  if (!Array.isArray(answer.sources)) {
    (answer as any).sources = [];
  }
  // Ensure evidence is always an array
  if (!Array.isArray(answer.evidence)) {
    (answer as any).evidence = [];
  }
  return answer;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * POST /api/agents/support/query
 *
 * Ask the Support Agent a question. Returns a KnowledgeAnswer with
 * the answer text and the knowledgebase / case sources it drew from.
 *
 * An answer with zero sources is a valid (but explicit) state — the
 * component must show "no supporting sources" rather than hiding it.
 */
export async function querySupportAgent(
  payload: SupportQueryPayload
): Promise<KnowledgeAnswer> {
  if (USE_MOCKS) {
    // Simulate network latency in dev
    await new Promise((r) => setTimeout(r, 900));
    return buildMockAnswer(payload.question);
  }

  try {
    const res = await api.post("/api/agents/support/query", payload);
    return normaliseAnswer(res.data);
  } catch (err: any) {
    if (err.response?.status === 403) {
      throw new Error(
        "You are not authorised to query the Support Agent. " +
          (err.response?.data?.message ?? "")
      );
    }
    throw new Error(
      err.response?.data?.message ||
        err.message ||
        "Support Agent query failed. Please try again."
    );
  }
}

// Re-export types for convenience
export type { KnowledgeAnswer, KnowledgeSource } from "@/lib/types/agent-results";
