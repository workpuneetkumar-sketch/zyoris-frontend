// lib/api/pipelinesApi.ts
// Network calls for Sales Pipelines and Stage Management based on verified BE-2 Swagger specifications.

import api from "@/lib/api/api";
import {
  Pipeline,
  PipelineStage,
  CreatePipelinePayload,
  UpdatePipelinePayload,
  CreateStagePayload,
  UpdateStagePayload,
  ReorderStagesPayload,
  PipelineFilters,
} from "@/types/pipelines";

function extractData<T>(raw: any): T {
  if (raw && typeof raw === "object") {
    if (raw.data !== undefined) return raw.data as T;
    if (raw.pipelines !== undefined) return raw.pipelines as T;
    if (raw.stages !== undefined) return raw.stages as T;
    if (raw.pipeline !== undefined) return raw.pipeline as T;
    if (raw.stage !== undefined) return raw.stage as T;
  }
  return raw as T;
}

// ── Pipeline Endpoints ───────────────────────────────────────────────────────

/**
 * List all pipelines for the organization with stage metadata
 * GET /pipelines
 */
export async function fetchPipelines(filters?: PipelineFilters): Promise<Pipeline[]> {
  const params = new URLSearchParams();
  if (filters?.product) params.append("product", filters.product);
  if (filters?.region) params.append("region", filters.region);
  if (filters?.businessUnit) params.append("businessUnit", filters.businessUnit);
  if (filters?.salesMotion) params.append("salesMotion", filters.salesMotion);
  if (filters?.isActive !== undefined) params.append("isActive", String(filters.isActive));
  if (filters?.page) params.append("page", String(filters.page));
  if (filters?.limit) params.append("limit", String(filters.limit));

  const qs = params.toString();
  const url = qs ? `/pipelines?${qs}` : "/pipelines";
  const res = await api.get(url);
  const data = extractData<Pipeline[]>(res.data);
  return Array.isArray(data) ? data : [];
}

/**
 * Get pipeline details with ordered stages and validation rules
 * GET /pipelines/:id
 */
export async function fetchPipelineById(id: string): Promise<Pipeline> {
  const res = await api.get(`/pipelines/${id}`);
  return extractData<Pipeline>(res.data);
}

/**
 * Create a new sales pipeline with optional stages
 * POST /pipelines
 */
export async function createPipeline(payload: CreatePipelinePayload): Promise<Pipeline> {
  const res = await api.post("/pipelines", payload);
  return extractData<Pipeline>(res.data);
}

/**
 * Update pipeline configuration
 * PATCH /pipelines/:id
 */
export async function updatePipeline(
  id: string,
  payload: UpdatePipelinePayload
): Promise<Pipeline> {
  const res = await api.patch(`/pipelines/${id}`, payload);
  return extractData<Pipeline>(res.data);
}

/**
 * Delete or deactivate pipeline
 * DELETE /pipelines/:id
 */
export async function deletePipeline(id: string): Promise<void> {
  await api.delete(`/pipelines/${id}`);
}

// ── Stage Endpoints ─────────────────────────────────────────────────────────

/**
 * List all stages for a pipeline in persistent order
 * GET /pipelines/:pipelineId/stages
 */
export async function fetchStages(pipelineId: string): Promise<PipelineStage[]> {
  const res = await api.get(`/pipelines/${pipelineId}/stages`);
  const data = extractData<PipelineStage[]>(res.data);
  const stages = Array.isArray(data) ? data : [];
  return stages.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/**
 * Get stage details with required fields, criteria, and validation rules
 * GET /pipelines/:pipelineId/stages/:stageId
 */
export async function fetchStageById(
  pipelineId: string,
  stageId: string
): Promise<PipelineStage> {
  const res = await api.get(`/pipelines/${pipelineId}/stages/${stageId}`);
  return extractData<PipelineStage>(res.data);
}

/**
 * Create a stage in a pipeline with criteria and validation rules
 * POST /pipelines/:pipelineId/stages
 */
export async function createStage(
  pipelineId: string,
  payload: CreateStagePayload
): Promise<PipelineStage> {
  const res = await api.post(`/pipelines/${pipelineId}/stages`, payload);
  return extractData<PipelineStage>(res.data);
}

/**
 * Update stage configuration, criteria, or validation rules
 * PATCH /pipelines/:pipelineId/stages/:stageId
 */
export async function updateStage(
  pipelineId: string,
  stageId: string,
  payload: UpdateStagePayload
): Promise<PipelineStage> {
  const res = await api.patch(`/pipelines/${pipelineId}/stages/${stageId}`, payload);
  return extractData<PipelineStage>(res.data);
}

/**
 * Delete stage and re-index remaining stages
 * DELETE /pipelines/:pipelineId/stages/:stageId
 */
export async function deleteStage(
  pipelineId: string,
  stageId: string
): Promise<void> {
  await api.delete(`/pipelines/${pipelineId}/stages/${stageId}`);
}

/**
 * Reorder pipeline stages and persist positions
 * PATCH /pipelines/:pipelineId/stages/reorder
 */
export async function reorderStages(
  pipelineId: string,
  payload: ReorderStagesPayload
): Promise<PipelineStage[]> {
  const body: Record<string, unknown> = {};
  if (payload.stageOrders && payload.stageOrders.length > 0) {
    body.stageOrders = payload.stageOrders;
    body.stageIds = payload.stageIds || payload.stageOrders.map((s) => s.stageId);
  } else if (payload.stageIds && payload.stageIds.length > 0) {
    body.stageIds = payload.stageIds;
    body.stageOrders = payload.stageIds.map((id, idx) => ({ stageId: id, order: idx + 1 }));
  }
  const res = await api.patch(`/pipelines/${pipelineId}/stages/reorder`, body);
  const data = extractData<PipelineStage[]>(res.data);
  const stages = Array.isArray(data) ? data : [];
  return stages.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
