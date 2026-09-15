import api from "@/lib/api/api";

export type LeadSignalSource = "LEAD" | "ACTIVITY" | "EMAIL" | "MEETING" | "WEBHOOK" | "TIMELINE";

export interface LeadSignalEnvelope {
  leadId: string;
  source: LeadSignalSource;
  eventType: string;
  occurredAt: string;
  idempotencyKey?: string;
  payload?: Record<string, unknown>;
}

export interface LeadSignalRecord {
  id: string;
  idempotencyKey: string;
  source: LeadSignalSource | string;
  eventType: string;
  occurredAt: string;
}

export interface LeadIntelligenceEvidence {
  factorKey: string;
  contribution: number;
  evidence: Record<string, unknown>;
}

export interface LeadIntelligenceDimension {
  key: string;
  label: string;
  score: number;
  maxScore: number;
  evidence: LeadIntelligenceEvidence[];
}

export interface LeadNextBestAction {
  action: string;
  rationale: string;
  priority: number;
  metadata: Record<string, unknown>;
}

export interface LeadIntelligenceScore {
  total: number;
  max: number;
  configVersion: number;
  generatedAt: string;
}

export interface LeadIntelligenceSnapshot {
  leadId: string;
  organizationId: string;
  score: LeadIntelligenceScore;
  dimensions: LeadIntelligenceDimension[];
  nextBestActions: LeadNextBestAction[];
}

export interface LeadScoreConfigDimension {
  key: string;
  label: string;
  description: string;
  weight: number;
}

export interface LeadScorePreviewFactor {
  factor: string;
  contribution: number;
  maxContribution: number;
  explanation: string;
}

export interface LeadScorePreviewSection {
  score?: number;
  lambda?: number;
  contributions?: Record<string, unknown>[];
  factors?: LeadScorePreviewFactor[];
  deterministicScore?: number;
  aiContribution?: number;
  acceptedAiEvidence?: Record<string, unknown>[];
  reasons?: string[];
  trend?: string;
  velocity?: number;
  change?: number;
  recentSignals?: number;
  priorSignals?: number;
  level?: string;
}

export interface LeadScorePreviewData {
  total: number;
  fit: {
    score: number;
    factors: LeadScorePreviewFactor[];
  };
  engagement: {
    score: number;
    lambda: number;
    contributions: Record<string, unknown>[];
  };
  intent: {
    score: number;
    deterministicScore: number;
    aiContribution: number;
    acceptedAiEvidence: Record<string, unknown>[];
    reasons: string[];
  };
  momentum: {
    trend: string;
    velocity: number;
    change: number;
    recentSignals: number;
    priorSignals: number;
  };
  risk: {
    score: number;
    level: string;
    reasons: string[];
    deterministicScore: number;
    aiContribution: number;
  };
}

export interface LeadScorePreviewResponse {
  success: boolean;
  data: LeadScorePreviewData;
}

export interface LeadScoreConfig {
  id: string;
  organizationId: string;
  version: number;
  isActive: boolean;
  sourceWeights?: Record<string, number>;
  statusWeights?: Record<string, number>;
  icpCriteria?: Record<string, unknown>;
  engagementWeights?: Record<string, number>;
  cadenceLambdas?: Record<string, number>;
  cadenceThresholds?: Record<string, number>;
  riskRules?: Record<string, unknown>;
  aiConfidenceThreshold?: number;
  emailWeight?: number;
  callWeight?: number;
  meetingWeight?: number;
  assignedWeight?: number;
  newLeadWeight?: number;
  agingPenaltyPerDay?: number;
  dimensions: LeadScoreConfigDimension[];
}

export interface LeadScoreConfigPayload {
  sourceWeights?: Record<string, number>;
  statusWeights?: Record<string, number>;
  icpCriteria?: Record<string, unknown>;
  engagementWeights?: Record<string, number>;
  cadenceLambdas?: Record<string, number>;
  cadenceThresholds?: Record<string, number>;
  riskRules?: Record<string, unknown>;
  aiConfidenceThreshold?: number;
  emailWeight?: number;
  callWeight?: number;
  meetingWeight?: number;
  assignedWeight?: number;
  newLeadWeight?: number;
  agingPenaltyPerDay?: number;
  dimensions: LeadScoreConfigDimension[];
}

function unwrapResponse<T>(response: any): T {
  return response?.data?.data ?? response?.data ?? response;
}

export async function postLeadSignal(payload: LeadSignalEnvelope): Promise<LeadSignalRecord> {
  const response = await api.post("/lead-intelligence/signals", payload);
  return unwrapResponse<LeadSignalRecord>(response);
}

export async function getLeadIntelligence(leadId: string): Promise<LeadIntelligenceSnapshot> {
  const response = await api.get(`/lead-intelligence/${leadId}`);
  return unwrapResponse<LeadIntelligenceSnapshot>(response);
}

export async function getLeadScorePreview(
  leadId: string,
  cadence: string = "weekly"
): Promise<LeadScorePreviewResponse> {
  const response = await api.get(`/lead-intelligence/${leadId}/score-preview`, {
    params: { cadence },
  });
  return unwrapResponse<LeadScorePreviewResponse>(response);
}

export async function getLeadScoreConfig(): Promise<LeadScoreConfig> {
  const response = await api.get("/leads/admin/lead-score-config");
  return unwrapResponse<LeadScoreConfig>(response);
}

export async function updateLeadScoreConfig(payload: LeadScoreConfigPayload): Promise<LeadScoreConfig> {
  const response = await api.patch("/leads/admin/lead-score-config", payload);
  return unwrapResponse<LeadScoreConfig>(response);
}