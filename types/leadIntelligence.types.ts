// Shared Types for AI Lead Intelligence Contract (analysisVersion 1.0.0)

export type IntentLevel = "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
export type RiskType = "BUDGET_CONCERN" | "TIMELINE_RISK" | "COMPETITOR_THREAT" | "INACTIVITY" | "OTHER";
export type RiskSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type DecisionMakerAuthority = "INFLUENCER" | "DECISION_MAKER" | "BUDGET_HOLDER" | "UNKNOWN";
export type CompetitorImpact = "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "BLOCKING";
export type RequirementStatus = "MENTIONED" | "CONFIRMED" | "BLOCKER";

export interface IntentExtraction {
  score: number; // 0.0 to 1.0
  level: IntentLevel;
  signals: string[];
  evidence?: string;
  confidence: number;
}

export interface RiskExtraction {
  type: RiskType;
  severity: RiskSeverity;
  evidence: string;
  confidence: number;
}

export interface TimelineExtraction {
  isoDate?: string;
  relativePeriod?: string;
  evidence: string;
  confidence: number;
}

export interface BudgetExtraction {
  amount: number | null;
  currency: string;
  minRange: number | null;
  maxRange: number | null;
  evidence: string;
  confidence: number;
}

export interface DecisionMakerExtraction {
  authority: DecisionMakerAuthority;
  evidence: string;
  confidence: number;
}

export interface CompetitorExtraction {
  name: string;
  impact: CompetitorImpact;
  context: string;
  confidence: number;
}

export interface RequirementExtraction {
  requirement: string;
  status: RequirementStatus;
  evidence: string;
  confidence: number;
}

export interface NBAExtraction {
  actionType: string;
  specificMessage: string;
  reason: string;
  confidence: number;
}

export interface LeadIntelligenceContract {
  analysisVersion: "1.0.0";
  modelVersion?: string;
  promptVersion?: string;
  
  intent?: IntentExtraction;
  risks: RiskExtraction[];
  timeline?: TimelineExtraction;
  budget?: BudgetExtraction;
  decisionMaker?: DecisionMakerExtraction;
  competitors: CompetitorExtraction[];
  requirements: RequirementExtraction[];
  nextBestAction?: NBAExtraction;
  
  lastUpdated: string;
}
