import api from "./api";

export interface ZiiActionParameter {
  name: string;
  value: any;
  label?: string;
  type?: string;
}

export interface ZiiStructuredAction {
  id?: string;
  actionType:
    | "CREATE_TASK"
    | "UPDATE_LEAD"
    | "SCHEDULE_MEETING"
    | "CREATE_DEAL"
    | "CREATE_NOTE"
    | "SEND_FOLLOWUP"
    | "CREATE_TICKET"
    | string;
  title: string;
  description?: string;
  targetEntityType?: "TASK" | "LEAD" | "DEAL" | "MEETING" | "NOTE" | "PROJECT" | string;
  targetEntityId?: string;
  parameters?: Record<string, any>;
  confidence?: number; // 0 - 100
  requiresApproval?: boolean;
  status?: "PENDING" | "EXECUTED" | "REQUIRES_APPROVAL" | "FAILED" | "CANCELLED";
}

export interface ZiiConversationSummary {
  sessionId: string;
  summary: string;
  keyPoints?: string[];
  decisions?: string[];
  actionItems?: ZiiStructuredAction[];
  sentiment?: "POSITIVE" | "NEUTRAL" | "CONSTRUCTIVE" | "URGENT" | string;
  participantCount?: number;
  messageCount?: number;
  createdAt?: string;
  [key: string]: any;
}

export interface ZiiSummaryRequestPayload {
  channelId?: string;
  conversationId?: string;
  messageLimit?: number;
  timeframe?: string;
}

export interface ZiiExecuteActionPayload {
  sessionId: string;
  actionType: string;
  targetEntityType?: string;
  targetEntityId?: string;
  parameters?: Record<string, any>;
  confirmed: boolean;
  channelId?: string;
  conversationId?: string;
  [key: string]: any;
}

export interface ZiiExecuteActionResponse {
  success: boolean;
  actionId?: string;
  actionType?: string;
  status: "EXECUTED" | "PENDING_APPROVAL" | "REQUIRES_APPROVAL" | "FAILED" | string;
  message: string;
  entityId?: string;
  entityType?: string;
  result?: Record<string, any>;
  executedAt?: string;
}

/**
 * Generate or fetch structured AI summary for a communication session.
 * POST /api/zii/sessions/:sessionId/summary
 *
 * @param sessionId The channel ID, conversation ID, or communication session ID
 * @param payload Optional scope parameters (channelId, conversationId, messageLimit)
 */
export async function getSessionSummary(
  sessionId: string,
  payload?: ZiiSummaryRequestPayload
): Promise<ZiiConversationSummary> {
  if (!sessionId) {
    throw new Error("sessionId is required to generate ZII conversation summary");
  }

  const res = await api.post(
    `/api/zii/sessions/${encodeURIComponent(sessionId)}/summary`,
    {
      channelId: payload?.channelId,
      conversationId: payload?.conversationId,
      messageLimit: payload?.messageLimit || 50,
      timeframe: payload?.timeframe || "all",
    }
  );

  const data = res.data?.data || res.data;

  // Extract structured summary shape
  const summaryText =
    typeof data === "string"
      ? data
      : data?.summary || data?.content || data?.overview || "No summary available for this conversation.";

  const rawActions: any[] = data?.actionItems || data?.actions || data?.suggestedActions || [];
  const actionItems: ZiiStructuredAction[] = rawActions.map((a: any, idx: number) => ({
    id: a.id || `action-${idx}-${Date.now()}`,
    actionType: a.actionType || a.type || "CREATE_TASK",
    title: a.title || a.name || a.label || "Action Item",
    description: a.description || a.rationale || "",
    targetEntityType: a.targetEntityType || a.entityType || "TASK",
    targetEntityId: a.targetEntityId || a.entityId,
    parameters: a.parameters || a.params || a.payload || {},
    confidence: typeof a.confidence === "number" ? a.confidence : 90,
    requiresApproval: Boolean(a.requiresApproval ?? a.needsApproval),
    status: a.status || "PENDING",
  }));

  return {
    sessionId: data?.sessionId || sessionId,
    summary: summaryText,
    keyPoints: Array.isArray(data?.keyPoints) ? data.keyPoints : data?.highlights || [],
    decisions: Array.isArray(data?.decisions) ? data.decisions : [],
    actionItems,
    sentiment: data?.sentiment || "NEUTRAL",
    participantCount: data?.participantCount,
    messageCount: data?.messageCount,
    createdAt: data?.createdAt || new Date().toISOString(),
  };
}

/**
 * Submit and execute a structured action proposed by ZII.
 * POST /api/zii/actions
 *
 * @param payload Action details, target entity, parameters, and user confirmation
 */
export async function executeZiiAction(
  payload: ZiiExecuteActionPayload
): Promise<ZiiExecuteActionResponse> {
  if (!payload.sessionId) {
    throw new Error("sessionId is required to execute ZII action");
  }
  if (!payload.actionType) {
    throw new Error("actionType is required to execute ZII action");
  }

  const res = await api.post("/api/zii/actions", {
    sessionId: payload.sessionId,
    actionType: payload.actionType,
    targetEntityType: payload.targetEntityType,
    targetEntityId: payload.targetEntityId,
    parameters: payload.parameters || {},
    confirmed: Boolean(payload.confirmed),
    channelId: payload.channelId,
    conversationId: payload.conversationId,
  });

  const raw = res.data?.data || res.data;

  return {
    success: raw?.success !== false,
    actionId: raw?.actionId || raw?.id,
    actionType: raw?.actionType || payload.actionType,
    status: raw?.status || "EXECUTED",
    message: raw?.message || "Action executed successfully.",
    entityId: raw?.entityId || raw?.targetEntityId,
    entityType: raw?.entityType || raw?.targetEntityType,
    result: raw?.result || raw?.data,
    executedAt: raw?.executedAt || new Date().toISOString(),
  };
}
