// types/pipelines.ts
// Contract types for Sales Pipelines and Stages based on Zyoris BE-2 Swagger specifications.

export interface StageCriteriaItem {
  id?: string;
  field?: string;
  operator?: string;
  value?: unknown;
  description?: string;
  [key: string]: unknown;
}

export interface StageValidationRuleItem {
  id?: string;
  ruleName?: string;
  condition?: string;
  errorMessage?: string;
  [key: string]: unknown;
}

export interface PipelineStage {
  id: string;
  pipelineId?: string;
  name: string;
  description?: string | null;
  order: number;
  requiredFields?: string[];
  probability?: number;
  entryCriteria?: StageCriteriaItem[];
  exitCriteria?: StageCriteriaItem[];
  validationRules?: StageValidationRuleItem[];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface Pipeline {
  id: string;
  organizationId?: string;
  name: string;
  description?: string | null;
  product?: string | null;
  region?: string | null;
  businessUnit?: string | null;
  salesMotion?: string | null;
  isActive?: boolean;
  stages?: PipelineStage[];
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface CreatePipelineStageInput {
  name: string;
  order?: number;
  requiredFields?: string[];
}

export interface CreatePipelinePayload {
  name: string;
  description?: string;
  product?: string;
  region?: string;
  businessUnit?: string;
  salesMotion?: string;
  isActive?: boolean;
  stages?: CreatePipelineStageInput[];
}

export interface UpdatePipelinePayload {
  name?: string;
  description?: string;
  product?: string;
  region?: string;
  businessUnit?: string;
  salesMotion?: string;
  isActive?: boolean;
}

export interface CreateStagePayload {
  name: string;
  description?: string;
  order?: number;
  requiredFields?: string[];
  entryCriteria?: StageCriteriaItem[];
  exitCriteria?: StageCriteriaItem[];
  validationRules?: StageValidationRuleItem[];
  isActive?: boolean;
}

export interface UpdateStagePayload {
  name?: string;
  description?: string;
  order?: number;
  requiredFields?: string[];
  entryCriteria?: StageCriteriaItem[];
  exitCriteria?: StageCriteriaItem[];
  validationRules?: StageValidationRuleItem[];
  isActive?: boolean;
}

export interface StageOrderItem {
  stageId: string;
  order: number;
}

export interface ReorderStagesPayload {
  stageOrders: StageOrderItem[];
  stageIds?: string[];
}

export interface PipelineFilters {
  product?: string;
  region?: string;
  businessUnit?: string;
  salesMotion?: string;
  isActive?: "true" | "false" | string;
  page?: number;
  limit?: number;
}
