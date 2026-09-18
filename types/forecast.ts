// types/forecast.ts
// Swagger contract types for BE-2 Day 4 Forecast, Aging, Velocity, and Snapshots.
// Source of truth:
//   GET /api/deals/forecast
//   GET /api/deals/forecast/snapshots
//   GET /api/deals/{id}/forecast

export interface ForecastCategoryRollup {
  dealCount?: number;
  totalAmount?: number;
  convertedAmount?: number;
  dealIds?: string[];
  [key: string]: unknown;
}

export interface ForecastRollupResponse {
  organizationId?: string;
  reportingCurrency?: string;
  asOfDate?: string;
  commit?: ForecastCategoryRollup;
  bestCase?: ForecastCategoryRollup;
  pipeline?: ForecastCategoryRollup;
  totalDealsCount?: number;
  totalConvertedAmount?: number;
  exchangeRates?: Record<string, number>;
  ratesTimestamp?: string;
  rulesVersion?: string;
  snapshotId?: string;
  [key: string]: unknown;
}

export interface ForecastSnapshot {
  id?: string;
  snapshotId?: string;
  organizationId?: string;
  reportingCurrency?: string;
  currency?: string;
  asOfDate?: string;
  createdAt?: string;
  timestamp?: string;
  commit?: ForecastCategoryRollup;
  bestCase?: ForecastCategoryRollup;
  pipeline?: ForecastCategoryRollup;
  totalDealsCount?: number;
  totalConvertedAmount?: number;
  exchangeRates?: Record<string, number>;
  ratesTimestamp?: string;
  rulesVersion?: string;
  [key: string]: unknown;
}

export interface StageVelocityItem {
  stage?: string;
  stageName?: string;
  days?: number;
  durationDays?: number;
  dwellTimeDays?: number;
  [key: string]: unknown;
}

export interface DealSlippageInfo {
  hasSlippage?: boolean;
  isSlipped?: boolean;
  slippageDays?: number;
  daysSlipped?: number;
  originalCloseDate?: string | null;
  currentCloseDate?: string | null;
  targetCloseDate?: string | null;
  message?: string;
  reasons?: string[];
  [key: string]: unknown;
}

export interface DealAgingInfo {
  days?: number;
  ageInDays?: number;
  totalDays?: number;
  createdDate?: string;
  [key: string]: unknown;
}

export interface DealForecastResponse {
  dealId?: string;
  forecastCategory?: string;
  category?: string;
  aging?: number | DealAgingInfo;
  dealAging?: number | DealAgingInfo;
  agingDays?: number;
  stageVelocity?: StageVelocityItem[] | Record<string, number>;
  velocity?: StageVelocityItem[] | Record<string, number>;
  stageDwellTimes?: StageVelocityItem[] | Record<string, number>;
  slippage?: boolean | number | DealSlippageInfo | string;
  slippageInfo?: DealSlippageInfo;
  hasSlippage?: boolean;
  amount?: number;
  originalAmount?: number;
  currency?: string;
  convertedAmount?: number;
  reportingCurrency?: string;
  exchangeRate?: number;
  asOfDate?: string;
  [key: string]: unknown;
}

export interface ForecastFilterParams {
  reportingCurrency?: string;
  asOfDate?: string;
}
