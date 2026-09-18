// types/dealHealth.ts
// Contract types for Deal Health and Deal Risks based on Zyoris BE-2 Swagger specifications.

export type HealthStatusType =
  | "HEALTHY"
  | "GOOD"
  | "WARNING"
  | "AT_RISK"
  | "CRITICAL"
  | "UNKNOWN"
  | string;

export type RiskSeverityType = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface HealthFactor {
  name: string;
  score?: number;
  weight?: number;
  status?: string;
  details?: string;
  impact?: "POSITIVE" | "NEUTRAL" | "NEGATIVE" | string;
  [key: string]: unknown;
}

export interface DealHealthResponse {
  dealId?: string;
  healthScore: number;
  healthStatus: HealthStatusType;
  factors?: HealthFactor[] | Record<string, number | HealthFactor>;
  breakdown?: Record<string, unknown>;
  activeRisksCount?: number;
  activeRisks?: DealRisk[];
  asOfDate?: string;
  calculatedAt?: string;
  lastCalculatedAt?: string;
  [key: string]: unknown;
}

export interface RiskEvidence {
  summary?: string;
  detectedSignals?: string[];
  lastActivityDate?: string;
  sentimentScore?: number;
  details?: Record<string, unknown> | string;
  [key: string]: unknown;
}

export interface DealRisk {
  id: string;
  dealId: string;
  riskType: string;
  severity: RiskSeverityType;
  evidence?: RiskEvidence | string | Record<string, unknown>;
  status: "ACTIVE" | "RESOLVED" | string;
  isActive?: boolean;
  resolutionNotes?: string | null;
  resolvedAt?: string | null;
  resolvedById?: string | null;
  resolvedByName?: string | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface ResolveRiskPayload {
  resolutionNotes?: string;
}

export interface RiskDetectorConfig {
  detector: string;
  isEnabled: boolean;
  severity: RiskSeverityType;
  parameters?: Record<string, unknown>;
  updatedAt?: string;
}

export interface DealRiskFilters {
  severity?: RiskSeverityType;
  riskType?: string;
  isActive?: "true" | "false" | string;
}

export interface OrgRiskFilters extends DealRiskFilters {
  dealId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}
