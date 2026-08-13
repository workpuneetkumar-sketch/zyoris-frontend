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

export interface LeadScoreConfig {
  id: string;
  organizationId: string;
  version: number;
  isActive: boolean;
  sourceWeights: Record<string, number>;
  statusWeights: Record<string, number>;
  emailWeight: number;
  callWeight: number;
  meetingWeight: number;
  assignedWeight: number;
  newLeadWeight: number;
  agingPenaltyPerDay: number;
  dimensions: LeadScoreConfigDimension[];
}

export interface LeadScoreConfigPayload {
  sourceWeights: Record<string, number>;
  statusWeights: Record<string, number>;
  emailWeight: number;
  callWeight: number;
  meetingWeight: number;
  assignedWeight: number;
  newLeadWeight: number;
  agingPenaltyPerDay: number;
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

export async function getLeadScoreConfig(): Promise<LeadScoreConfig> {
  const response = await api.get("/leads/admin/lead-score-config");
  return unwrapResponse<LeadScoreConfig>(response);
}

export async function updateLeadScoreConfig(payload: LeadScoreConfigPayload): Promise<LeadScoreConfig> {
  const response = await api.patch("/leads/admin/lead-score-config", payload);
  return unwrapResponse<LeadScoreConfig>(response);
}