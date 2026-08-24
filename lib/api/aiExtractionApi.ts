// lib/api/aiExtractionApi.ts
// Ad-hoc AI extraction endpoints — B-12 Risk Engine
// All six endpoints accept { sourceText, sourceType } and return extracted intelligence.
// Results are NOT persisted to any lead; they are purely ad-hoc analysis.

import api from "@/lib/api/api";
import type {
  RiskExtraction,
  TimelineExtraction,
  DecisionMakerExtraction,
  CompetitorExtraction,
  RequirementExtraction,
  NBAExtraction,
} from "@/types/leadIntelligence.types";

// ── Shared request shape ────────────────────────────────────────────────────

export type AiSourceType =
  | "EMAIL"
  | "CALL"
  | "MEETING"
  | "NOTE"
  | "WHATSAPP"
  | "CHAT";

export interface AiExtractionRequest {
  sourceText: string;
  sourceType: AiSourceType;
}

// ── Response wrappers ────────────────────────────────────────────────────────

export interface RisksExtractionResponse {
  risks: RiskExtraction[];
}

export interface TimelineExtractionResponse {
  timeline: TimelineExtraction | null;
}

export interface DecisionMakerExtractionResponse {
  decisionMaker: DecisionMakerExtraction;
}

export interface CompetitorExtractionResponse {
  competitors: CompetitorExtraction[];
}

export interface RequirementsExtractionResponse {
  requirements: RequirementExtraction[];
}

export interface NbaExtractionResponse {
  nextBestAction: NBAExtraction;
}

// ── Aggregate response for running all six in one shot ───────────────────────

export interface AiExtractionBundle {
  risks: RiskExtraction[];
  timeline: TimelineExtraction | null;
  decisionMaker: DecisionMakerExtraction | null;
  competitors: CompetitorExtraction[];
  requirements: RequirementExtraction[];
  nextBestAction: NBAExtraction | null;
}

// ── Individual API calls ─────────────────────────────────────────────────────

/**
 * POST /ai/risks/extract
 * Extracts and classifies potential risks (budget, timeline, competitor threats) from text.
 */
export async function extractRisks(
  req: AiExtractionRequest
): Promise<RisksExtractionResponse> {
  const res = await api.post<RisksExtractionResponse>("/ai/risks/extract", req);
  const d = res.data?.risks ? res.data : (res.data as any)?.data ?? res.data;
  return { risks: Array.isArray(d?.risks) ? d.risks : [] };
}

/**
 * POST /ai/timeline/extract
 * Detects and normalises explicit or implied purchase / decision timelines.
 */
export async function extractTimeline(
  req: AiExtractionRequest
): Promise<TimelineExtractionResponse> {
  const res = await api.post<TimelineExtractionResponse>("/ai/timeline/extract", req);
  const d = (res.data as any)?.data ?? res.data;
  return { timeline: d?.timeline ?? null };
}

/**
 * POST /ai/decision-maker/extract
 * Classifies purchasing authority: Influencer, Decision Maker, or Budget Holder.
 */
export async function extractDecisionMaker(
  req: AiExtractionRequest
): Promise<DecisionMakerExtractionResponse> {
  const res = await api.post<DecisionMakerExtractionResponse>(
    "/ai/decision-maker/extract",
    req
  );
  const d = (res.data as any)?.data ?? res.data;
  return { decisionMaker: d?.decisionMaker ?? null };
}

/**
 * POST /ai/competitor/extract
 * Identifies competitor mentions and their deal impact: Positive, Neutral, Negative, Blocking.
 */
export async function extractCompetitors(
  req: AiExtractionRequest
): Promise<CompetitorExtractionResponse> {
  const res = await api.post<CompetitorExtractionResponse>(
    "/ai/competitor/extract",
    req
  );
  const d = (res.data as any)?.data ?? res.data;
  return { competitors: Array.isArray(d?.competitors) ? d.competitors : [] };
}

/**
 * POST /ai/requirements/extract
 * Pulls out product/service requirements with status: Mentioned, Confirmed, or Blocker.
 */
export async function extractRequirements(
  req: AiExtractionRequest
): Promise<RequirementsExtractionResponse> {
  const res = await api.post<RequirementsExtractionResponse>(
    "/ai/requirements/extract",
    req
  );
  const d = (res.data as any)?.data ?? res.data;
  return { requirements: Array.isArray(d?.requirements) ? d.requirements : [] };
}

/**
 * POST /ai/nba/generate
 * Generates exactly one concrete "Next Best Action" recommendation.
 */
export async function generateNba(
  req: AiExtractionRequest
): Promise<NbaExtractionResponse> {
  const res = await api.post<NbaExtractionResponse>("/ai/nba/generate", req);
  const d = (res.data as any)?.data ?? res.data;
  return { nextBestAction: d?.nextBestAction ?? null };
}

// ── Convenience: run all six in parallel ────────────────────────────────────

/**
 * Runs all six extraction endpoints in parallel against the same text.
 * Partial failures are tolerated — failed extractions return their zero-value.
 */
export async function extractAll(
  req: AiExtractionRequest
): Promise<AiExtractionBundle> {
  const [risksRes, timelineRes, dmRes, compRes, reqRes, nbaRes] =
    await Promise.allSettled([
      extractRisks(req),
      extractTimeline(req),
      extractDecisionMaker(req),
      extractCompetitors(req),
      extractRequirements(req),
      generateNba(req),
    ]);

  return {
    risks:
      risksRes.status === "fulfilled" ? risksRes.value.risks : [],
    timeline:
      timelineRes.status === "fulfilled" ? timelineRes.value.timeline : null,
    decisionMaker:
      dmRes.status === "fulfilled" ? dmRes.value.decisionMaker : null,
    competitors:
      compRes.status === "fulfilled" ? compRes.value.competitors : [],
    requirements:
      reqRes.status === "fulfilled" ? reqRes.value.requirements : [],
    nextBestAction:
      nbaRes.status === "fulfilled" ? nbaRes.value.nextBestAction : null,
  };
}
