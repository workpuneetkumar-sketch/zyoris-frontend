// types/winProbability.ts
// Swagger contract types for BE-2 Day 3 Win Probability and Prediction Snapshots.
// Source of truth: GET /api/deals/{id}/win-probability & GET /api/deals/{id}/win-probability/snapshots

export interface FactorBreakdownItem {
  factor?: string;
  name?: string;
  impact?: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "HIGH" | "MEDIUM" | "LOW" | string;
  score?: number;
  weight?: number;
  description?: string;
  value?: unknown;
  [key: string]: unknown;
}

export interface WinProbabilityResponse {
  dealId: string;
  probability: number; // 0 - 100 percentage
  confidence: number;  // 0.0 - 1.0 confidence score
  predictedOutcome?: "WON" | "LOST" | string;
  modelVersion?: string;
  evidenceTimestamp?: string;
  predictionTimestamp?: string;
  features?: Record<string, unknown>;
  factorBreakdown?: Record<string, unknown> | FactorBreakdownItem[];
  snapshotId?: string;
  [key: string]: unknown;
}

export interface WinProbabilitySnapshot {
  id: string;
  dealId: string;
  probability: number;
  confidence: number;
  modelVersion?: string;
  predictionTimestamp: string;
  evidenceTimestamp?: string;
  features?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface WinProbabilitySnapshotsResponse {
  dealId: string;
  count: number;
  snapshots: WinProbabilitySnapshot[];
  [key: string]: unknown;
}
