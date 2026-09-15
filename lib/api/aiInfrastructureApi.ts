import api from "@/lib/api/api";

export type ModelTier = "FAST" | "REASONING" | "AUDIO";

export interface AiTelemetryMetrics {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  modelUsed: string;
  timestamp: string;
  totalExecutionMs?: number;
}

export interface ModelRouteInfo {
  tier: ModelTier;
  model: string;
  maxTokensDefault: number;
  temperatureDefault: number;
  description: string;
}

export interface VectorStoreStatus {
  tableName: string;
  embeddingDimension: number;
  distanceMetric: string;
  chunkSize: number;
  chunkOverlap: number;
  isPgVectorEnabled: boolean;
  fallbackMode: string;
}

export interface AiInfrastructureStatusResponse {
  status: string;
  sprint: string;
  modelRegistry: Record<ModelTier, ModelRouteInfo>;
  vectorStoreConfig: VectorStoreStatus;
  promptTemplatesCount: number;
  registeredPromptKeys: string[];
  telemetry: {
    totalCalls: number;
    totalTokens: number;
    avgLatencyMs: number;
    recentLogs: AiTelemetryMetrics[];
  };
}

export interface TestCompletionRequest {
  tier?: ModelTier;
  systemPrompt?: string;
  userPrompt?: string;
  templateKey?: string;
  templateVars?: Record<string, any>;
  jsonFormat?: boolean;
}

export interface TestCompletionResponse<T = any> {
  success: boolean;
  data: T | null;
  rawText: string;
  error?: string;
  aiTelemetry: AiTelemetryMetrics;
}

export interface TestEmbeddingResponse {
  success: boolean;
  docId: string;
  embeddingDimension: number;
  isPgVectorEnabled: boolean;
  similarityResults: any[];
  aiTelemetry: {
    latencyMs: number;
    operation: string;
  };
}

/**
 * Fetches real-time status of the AI Model Router, Vector Store, and Prompts.
 * Can be inspected directly in the Network tab or via browser console during demos.
 */
export async function getAiInfrastructureStatus(): Promise<AiInfrastructureStatusResponse> {
  const response = await api.get<AiInfrastructureStatusResponse>("/ai/infrastructure/status");
  return response.data;
}

/**
 * Retrieves all registered system prompt definitions and variables for the sprint.
 */
export async function listAiPrompts(): Promise<Record<string, any>> {
  const response = await api.get("/ai/infrastructure/prompts");
  return response.data?.prompts || response.data;
}

/**
 * Executes a test AI completion through the Model Router.
 * Returns the parsed JSON payload along with detailed `aiTelemetry` (tokens, latency, model used).
 */
export async function testAiCompletion<T = any>(
  payload: TestCompletionRequest
): Promise<TestCompletionResponse<T>> {
  const response = await api.post<TestCompletionResponse<T>>("/ai/infrastructure/test-completion", payload);
  return response.data;
}

/**
 * Executes a test vector embedding generation and similarity search against the memory store.
 */
export async function testAiEmbedding(payload?: {
  text?: string;
  organizationId?: string;
  entityType?: string;
}): Promise<TestEmbeddingResponse> {
  const response = await api.post<TestEmbeddingResponse>("/ai/infrastructure/test-embedding", payload || {});
  return response.data;
}
