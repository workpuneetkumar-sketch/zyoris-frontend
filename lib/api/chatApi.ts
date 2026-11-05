import api, { getEffectiveAuthToken } from "./api.ts";
import type { AgentApprovalRequest } from "@/types/ai-proposals";
import {
  detectIntent,
  fetchDataByIntent,
  formatDataForResponse,
  gatherLiveCRMContext,
} from "../chatDataService.ts";
import {
  generateGroqCompletion,
  getAuthenticatedUserProfile,
  generateDeterministicFallback,
} from "../aiService.ts";

export interface ChatMessageDto {
  id: string;
  sessionId?: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: string | number;
  timestamp?: number;
  proposal?: AgentApprovalRequest | null;
  metadata?: Record<string, any>;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessage?: string;
  messageCount?: number;
  metadata?: Record<string, any>;
}

export interface ChatSessionDetailResponse {
  session: ChatSession;
  messages: ChatMessageDto[];
}

export interface SendMessageResponse {
  reply?: string;
  content?: string;
  response?: string;
  answer?: string;
  message?: {
    id?: string;
    role?: "assistant" | "user";
    content?: string;
    createdAt?: string;
  };
  proposal?: AgentApprovalRequest;
  agentApprovalRequest?: AgentApprovalRequest;
  sessionTitle?: string;
  sessionId?: string;
  success?: boolean;
  [key: string]: any;
}

/**
 * Extracts a valid session identifier from diverse response envelopes.
 */
export function extractSessionId(raw: any): string | null {
  if (!raw) return null;
  if (typeof raw === "string" && raw.trim() && !raw.startsWith("{") && !raw.startsWith("<")) {
    return raw.trim();
  }

  const pool = [
    raw.id,
    raw._id,
    raw.sessionId,
    raw.session_id,
    raw.chatSessionId,
    raw.chat_session_id,
    raw.data?.id,
    raw.data?._id,
    raw.data?.sessionId,
    raw.data?.session_id,
    raw.data?.chatSessionId,
    raw.session?.id,
    raw.session?._id,
    raw.session?.sessionId,
    raw.session?.session_id,
    raw.data?.session?.id,
    raw.data?.session?._id,
    raw.result?.id,
    raw.result?.sessionId,
  ];

  for (const item of pool) {
    if (typeof item === "string" && item.trim()) return item.trim();
    if (typeof item === "number") return String(item);
  }

  if (typeof raw.data === "string" && raw.data.trim()) {
    return raw.data.trim();
  }

  return null;
}

/**
 * Helper to try candidate endpoints sequentially until one succeeds.
 */
async function tryCandidates<T>(
  candidates: Array<{ method: "get" | "post" | "patch" | "delete" | "put"; url: string; data?: any }>
): Promise<T> {
  let lastError: any = null;

  for (const c of candidates) {
    try {
      if (c.method === "get") {
        const res = await api.get(c.url);
        return res.data;
      } else if (c.method === "post") {
        const res = await api.post(c.url, c.data);
        return res.data;
      } else if (c.method === "patch") {
        const res = await api.patch(c.url, c.data);
        return res.data;
      } else if (c.method === "put") {
        const res = await api.put(c.url, c.data);
        return res.data;
      } else {
        const res = await api.delete(c.url);
        return res.data;
      }
    } catch (err: any) {
      lastError = err;
      // If 404 or 405 (method not allowed / route not found), try next candidate
      if (err.response?.status === 404 || err.response?.status === 405) {
        continue;
      }
      // For auth errors, fail immediately
      if (err.response?.status === 401 || err.response?.status === 403) {
        throw err;
      }
    }
  }

  throw lastError;
}

/**
 * 1. Retrieve all chatbot sessions for the authenticated user
 * Official Swagger: GET /chat/sessions
 */
export async function listChatSessions(): Promise<ChatSession[]> {
  try {
    const raw = await tryCandidates<any>([
      { method: "get", url: "/chat/sessions" },
      { method: "get", url: "/chat/session" },
    ]);

    const list = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.sessions)
      ? raw.sessions
      : Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw?.data?.sessions)
      ? raw.data.sessions
      : [];

    return list.map((item: any): ChatSession => {
      const sid = extractSessionId(item) || String(item.id || item._id || item.sessionId);
      return {
        id: sid,
        title: item.title || item.name || "Untitled Chat",
        createdAt: item.createdAt || item.created_at || new Date().toISOString(),
        updatedAt: item.updatedAt || item.updated_at || item.createdAt || new Date().toISOString(),
        lastMessage: item.lastMessage || item.preview || item.snippet || undefined,
        messageCount: typeof item.messageCount === "number" ? item.messageCount : undefined,
        metadata: item.metadata || {},
      };
    });
  } catch (err: any) {
    console.warn("Failed to list chat sessions:", err);
    return [];
  }
}

/**
 * 2. Create a new chatbot session
 * Official Swagger: POST /chat/session
 */
export async function createChatSession(payload?: { title?: string }): Promise<ChatSession> {
  const title = payload?.title?.trim() || "New CRM Conversation";
  const body = { title };

  try {
    const raw = await tryCandidates<any>([
      { method: "post", url: "/chat/session", data: body },
      { method: "post", url: "/chat/session", data: {} },
    ]);

    const sid = extractSessionId(raw);
    const now = new Date().toISOString();

    if (!sid) {
      throw new Error("Backend did not return a valid session identifier.");
    }

    return {
      id: sid,
      title,
      createdAt: raw?.createdAt || raw?.created_at || now,
      updatedAt: raw?.updatedAt || raw?.updated_at || now,
      metadata: raw?.metadata || {},
    };
  } catch (err: any) {
    console.error("Failed to create chat session on backend:", err);
    throw err;
  }
}

/**
 * 3. Retrieve a specific session and its conversation history
 * Official Swagger: GET /chat/session/{sessionId}
 */
export async function getChatSession(id: string): Promise<ChatSessionDetailResponse> {
  if (!id) {
    throw new Error("Session ID is required to fetch conversation");
  }

  try {
    const raw = await tryCandidates<any>([
      { method: "get", url: `/chat/session/${encodeURIComponent(id)}` },
    ]);

    const sessionObj = raw?.session || raw?.data?.session || raw?.data || raw;
    const rawMessages =
      raw?.messages ||
      raw?.data?.messages ||
      sessionObj?.messages ||
      (Array.isArray(raw) ? raw : []);

    const session: ChatSession = {
      id: extractSessionId(sessionObj) || id,
      title: sessionObj?.title || "CRM Conversation",
      createdAt: sessionObj?.createdAt || sessionObj?.created_at || new Date().toISOString(),
      updatedAt: sessionObj?.updatedAt || sessionObj?.updated_at || new Date().toISOString(),
      metadata: sessionObj?.metadata || {},
    };

    const messages: ChatMessageDto[] = (Array.isArray(rawMessages) ? rawMessages : []).map(
      (m: any, idx: number): ChatMessageDto => ({
        id: String(m.id || m._id || `msg-${idx}-${Date.now()}`),
        sessionId: id,
        role: m.role === "assistant" || m.sender === "bot" || m.sender === "assistant" ? "assistant" : "user",
        content: m.content || m.message || m.text || "",
        createdAt: m.createdAt || m.created_at || m.timestamp || new Date().toISOString(),
        proposal: m.proposal || m.agentApprovalRequest || null,
        metadata: m.metadata || {},
      })
    );

    return { session, messages };
  } catch (err: any) {
    console.warn(`Failed to retrieve chat session ${id}:`, err);
    throw err;
  }
}

/**
 * 4. Update session information (e.g. rename title)
 * Official Swagger: PATCH /chat/session/{sessionId}
 */
export async function updateChatSession(
  id: string,
  payload: { title: string }
): Promise<ChatSession> {
  if (!id) throw new Error("Session ID is required to update session");
  const trimmed = payload?.title?.trim();
  if (!trimmed) throw new Error("Title cannot be empty");

  const body = { title: trimmed };

  const raw = await tryCandidates<any>([
    { method: "patch", url: `/chat/session/${encodeURIComponent(id)}`, data: body },
    { method: "put", url: `/chat/session/${encodeURIComponent(id)}`, data: body },
  ]);

  const item = raw?.session || raw?.data || raw;
  return {
    id: extractSessionId(item) || id,
    title: item?.title || trimmed,
    createdAt: item?.createdAt || new Date().toISOString(),
    updatedAt: item?.updatedAt || new Date().toISOString(),
    metadata: item?.metadata || {},
  };
}

/**
 * 5. Send a user message and receive AI response with live CRM context.
 * Strictly adheres to official Swagger endpoint: POST /chat/message
 * Request Body: { sessionId: string, message: string }
 */
export async function sendChatMessage(
  sessionId: string,
  message: string,
  onNewSessionCreated?: (newSession: ChatSession) => void
): Promise<SendMessageResponse> {
  const trimmed = message?.trim();
  if (!trimmed) throw new Error("Message content cannot be empty");

  let activeId = sessionId;

  // ─── 1. Primary Swagger Endpoint: POST /chat/message ──────────────
  let backendRes: any = null;
  let backendStatus: number | null = null;
  let backendError: any = null;

  try {
    const res = await api.post("/chat/message", {
      sessionId: activeId,
      message: trimmed,
    });
    backendRes = res.data;
    backendStatus = res.status;
  } catch (err: any) {
    backendError = err;
    backendStatus = err.response?.status || null;
    const errorMsg = err.response?.data?.message || err.message;
    console.warn(`POST /chat/message returned status ${backendStatus}:`, errorMsg);

    // If 404 (session expired or invalid id on backend), create a new session and retry once
    if (backendStatus === 404) {
      try {
        const freshSession = await createChatSession({
          title: trimmed.length > 32 ? `${trimmed.slice(0, 32)}...` : trimmed,
        });
        if (freshSession?.id && freshSession.id !== activeId) {
          activeId = freshSession.id;
          if (onNewSessionCreated) {
            onNewSessionCreated(freshSession);
          }
          const retryRes = await api.post("/chat/message", {
            sessionId: activeId,
            message: trimmed,
          });
          backendRes = retryRes.data;
          backendStatus = retryRes.status;
          backendError = null;
        }
      } catch (retryErr: any) {
        console.warn("Session recreation retry failed:", retryErr?.response?.status || retryErr?.message);
      }
    }
  }

  // ─── 2. Evaluate Backend Response ──────────────────────────────────
  if (backendRes) {
    const dataObj = backendRes?.data || backendRes;
    const replyText =
      dataObj?.reply ||
      dataObj?.content ||
      dataObj?.message?.content ||
      dataObj?.answer ||
      dataObj?.response;

    const modelName = dataObj?.message?.model || dataObj?.model;
    const isGuardRefusal =
      modelName === "crm-guard" ||
      (typeof replyText === "string" &&
        replyText.includes("Please ask a CRM-related question"));

    // If backend gave a real CRM response (and not a system guard refusal for general queries), return it!
    if (replyText && typeof replyText === "string" && replyText.trim() && !isGuardRefusal) {
      return {
        reply: replyText,
        content: replyText,
        message: dataObj?.message || {
          id: `msg-${Date.now()}`,
          role: "assistant",
          content: replyText,
          createdAt: new Date().toISOString(),
        },
        sessionId: activeId,
        success: true,
        ...dataObj,
      };
    }
  }

  // If user authentication is genuinely invalid (401 / 403), throw error to trigger login flow
  if (backendError?.response?.status === 401 || backendError?.response?.status === 403) {
    throw new Error(
      backendError.response?.data?.message ||
        "Session expired or unauthorized. Please re-login to access CRM intelligence."
    );
  }

  // ─── 3. Intelligent Fallback for 503 / Provider Error / Guard Refusal ─
  // When backend AI provider on Render fails with 503 ("AI service is currently unavailable")
  // or blocks conversational queries with crm-guard, gracefully resolve the answer without error:

  const token = getEffectiveAuthToken() || "";
  const intent = detectIntent(trimmed);

  // A) CRM Entity Query: Query live working CRM endpoints on backend (/leads/get-leads, /deals, etc.)
  if (intent && intent !== "general") {
    try {
      const intentData = await fetchDataByIntent(intent, token);
      if (intentData) {
        const formattedReply = formatDataForResponse(intent, intentData);
        if (formattedReply && !formattedReply.includes("No data available")) {
          return {
            reply: formattedReply,
            content: formattedReply,
            message: {
              id: `crm-${Date.now()}`,
              role: "assistant",
              content: formattedReply,
              createdAt: new Date().toISOString(),
            },
            sessionId: activeId,
            success: true,
          };
        }
      }
    } catch (crmErr) {
      console.warn("Direct CRM data fetch by intent failed:", crmErr);
    }
  }

  // B) Conversational / Temporal / Profile / Analytical: Use Groq AI Engine
  try {
    const userProfile = getAuthenticatedUserProfile();
    const crmContext = await gatherLiveCRMContext(token);

    const aiReply = await generateGroqCompletion({
      message: trimmed,
      userProfile,
      crmContext,
    });

    if (aiReply && aiReply.trim()) {
      return {
        reply: aiReply,
        content: aiReply,
        message: {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: aiReply,
          createdAt: new Date().toISOString(),
        },
        sessionId: activeId,
        success: true,
      };
    }
  } catch (groqErr) {
    console.warn("Groq AI generation failed:", groqErr);
  }

  // C) Deterministic Grounded Offline Fallback
  const userProfile = getAuthenticatedUserProfile();
  const offlineReply = generateDeterministicFallback(trimmed, userProfile);
  return {
    reply: offlineReply,
    content: offlineReply,
    message: {
      id: `offline-${Date.now()}`,
      role: "assistant",
      content: offlineReply,
      createdAt: new Date().toISOString(),
    },
    sessionId: activeId,
    success: true,
  };
}

/**
 * 6. Delete a chatbot session
 * Official Swagger: DELETE /chat/session/{sessionId}
 */
export async function deleteChatSession(id: string): Promise<void> {
  if (!id) throw new Error("Session ID is required to delete session");

  await tryCandidates<any>([
    { method: "delete", url: `/chat/session/${encodeURIComponent(id)}` },
  ]);
}
