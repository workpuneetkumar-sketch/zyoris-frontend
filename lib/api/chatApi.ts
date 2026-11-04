import api, { getEffectiveAuthToken } from "./api";
import type { AgentApprovalRequest } from "@/types/ai-proposals";
import {
  detectIntent,
  fetchDataByIntent,
  formatDataForResponse,
  gatherLiveCRMContext,
} from "@/lib/chatDataService";
import {
  generateGroqCompletion,
  getAuthenticatedUserProfile,
  generateDeterministicFallback,
} from "@/lib/aiService";

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
 * GET /chat/sessions (Swagger) or GET /api/chat/sessions (Handoff)
 */
export async function listChatSessions(): Promise<ChatSession[]> {
  try {
    const raw = await tryCandidates<any>([
      { method: "get", url: "/chat/sessions" },
      { method: "get", url: "/api/chat/sessions" },
      { method: "get", url: "/chat/session" },
      { method: "get", url: "/api/chat/session" },
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
 * POST /chat/session (Swagger) or POST /api/chat/sessions (Handoff)
 */
export async function createChatSession(payload?: { title?: string }): Promise<ChatSession> {
  const title = payload?.title?.trim() || "New CRM Conversation";
  const body = { title };

  try {
    const raw = await tryCandidates<any>([
      // Swagger spec: POST /chat/session
      { method: "post", url: "/chat/session", data: body },
      // Handoff spec: POST /api/chat/sessions
      { method: "post", url: "/api/chat/sessions", data: body },
      { method: "post", url: "/chat/sessions", data: body },
      { method: "post", url: "/api/chat/session", data: body },
      // Optional empty body fallbacks
      { method: "post", url: "/chat/session", data: {} },
      { method: "post", url: "/api/chat/sessions", data: {} },
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
 * GET /chat/session/:sessionId or GET /api/chat/sessions/:id
 */
export async function getChatSession(id: string): Promise<ChatSessionDetailResponse> {
  if (!id) {
    throw new Error("Session ID is required to fetch conversation");
  }

  try {
    const raw = await tryCandidates<any>([
      { method: "get", url: `/chat/session/${encodeURIComponent(id)}` },
      { method: "get", url: `/api/chat/sessions/${encodeURIComponent(id)}` },
      { method: "get", url: `/chat/sessions/${encodeURIComponent(id)}` },
      { method: "get", url: `/api/chat/session/${encodeURIComponent(id)}` },
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
    { method: "patch", url: `/api/chat/sessions/${encodeURIComponent(id)}`, data: body },
    { method: "patch", url: `/chat/sessions/${encodeURIComponent(id)}`, data: body },
    { method: "patch", url: `/chat/session/${encodeURIComponent(id)}`, data: body },
    { method: "patch", url: `/api/chat/session/${encodeURIComponent(id)}`, data: body },
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
 * Implements full endpoint coverage (Swagger & Handoff) and intelligent CRM fallback.
 */
export async function sendChatMessage(
  sessionId: string,
  message: string,
  onNewSessionCreated?: (newSession: ChatSession) => void
): Promise<SendMessageResponse> {
  const trimmed = message?.trim();
  if (!trimmed) throw new Error("Message content cannot be empty");

  let activeId = sessionId;

  // Direct swagger payload: { sessionId, message }
  const swaggerPayload = {
    sessionId: activeId,
    message: trimmed,
  };

  // Sub-resource messages payload: { message, content }
  const subresourcePayload = {
    message: trimmed,
    content: trimmed,
  };

  try {
    const raw = await tryCandidates<any>([
      // Primary Swagger endpoint: POST /chat/message
      { method: "post", url: "/chat/message", data: swaggerPayload },
      // Primary Handoff endpoint: POST /api/chat/sessions/:id/messages
      { method: "post", url: `/api/chat/sessions/${encodeURIComponent(activeId)}/messages`, data: subresourcePayload },
      { method: "post", url: `/chat/sessions/${encodeURIComponent(activeId)}/messages`, data: subresourcePayload },
      // Direct alternate endpoints
      { method: "post", url: "/api/chat/message", data: swaggerPayload },
      { method: "post", url: `/api/chat/session/${encodeURIComponent(activeId)}/messages`, data: subresourcePayload },
      { method: "post", url: `/chat/session/${encodeURIComponent(activeId)}/messages`, data: subresourcePayload },
    ]);

    const res = raw?.data || raw;
    return res;
  } catch (err: any) {
    // If backend returns 404 (Session not found or route not mounted)
    if (err.response?.status === 404) {
      console.warn(`Session ${activeId} returned 404; attempting fresh session creation...`);
      try {
        const freshSession = await createChatSession({
          title: trimmed.length > 32 ? `${trimmed.slice(0, 32)}...` : trimmed,
        });
        if (freshSession?.id && freshSession.id !== activeId) {
          activeId = freshSession.id;
          if (onNewSessionCreated) {
            onNewSessionCreated(freshSession);
          }
          // Retry sending message with verified new session
          const retryRes = await tryCandidates<any>([
            { method: "post", url: "/chat/message", data: { sessionId: activeId, message: trimmed } },
            { method: "post", url: `/api/chat/sessions/${encodeURIComponent(activeId)}/messages`, data: subresourcePayload },
            { method: "post", url: `/chat/sessions/${encodeURIComponent(activeId)}/messages`, data: subresourcePayload },
            { method: "post", url: "/api/chat/message", data: { sessionId: activeId, message: trimmed } },
          ]);
          return retryRes?.data || retryRes;
        }
      } catch (sessionErr) {
        console.warn("Could not create fresh backend session for message retry:", sessionErr);
      }
    }

    // ─── Direct Groq AI Engine Integration ───────────────────────────
    // If backend AI provider is misconfigured (e.g. invalid key) or returns 404/500/503,
    // seamlessly generate an accurate, grounded AI response using Groq.
    try {
      const token = getEffectiveAuthToken() || "";
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
          success: true,
          sessionId: activeId,
        };
      }
    } catch (groqErr) {
      console.warn("Direct Groq AI generation failed:", groqErr);
    }

    // ─── Deterministic Offline Fallback ──────────────────────────────
    try {
      const userProfile = getAuthenticatedUserProfile();
      const offlineReply = generateDeterministicFallback(trimmed, userProfile);
      if (offlineReply) {
        return {
          reply: offlineReply,
          content: offlineReply,
          success: true,
          sessionId: activeId,
        };
      }
    } catch {}

    // ─── CRM Intelligence Live Fallback ──────────────────────────────
    try {
      const token = getEffectiveAuthToken() || "";
      const intent = detectIntent(trimmed);

      if (intent && intent !== "general") {
        const intentData = await fetchDataByIntent(intent, token);
        if (intentData) {
          const formattedReply = formatDataForResponse(intent, intentData);
          if (formattedReply) {
            return {
              reply: formattedReply,
              content: formattedReply,
              success: true,
              sessionId: activeId,
            };
          }
        }
      }
    } catch (fallbackErr) {
      console.warn("CRM Live Fallback error:", fallbackErr);
    }

    // Standard friendly error message if everything failed
    if (err.response?.status === 503) {
      throw new Error(
        err.response?.data?.message ||
          "ZII BOT AI Provider is temporarily unavailable. Please verify API key configuration."
      );
    }
    if (err.response?.status === 401 || err.response?.status === 403) {
      throw new Error(
        err.response?.data?.message ||
          "Session expired or unauthorized. Please re-login to access CRM intelligence."
      );
    }

    const messageText =
      err.response?.data?.message ||
      err.response?.data?.error ||
      "ZII BOT encountered an error reaching the AI service. Please try asking again.";

    const error = new Error(messageText);
    (error as any).status = err.response?.status;
    throw error;
  }
}

/**
 * 6. Delete a chatbot session
 */
export async function deleteChatSession(id: string): Promise<void> {
  if (!id) throw new Error("Session ID is required to delete session");

  await tryCandidates<any>([
    { method: "delete", url: `/chat/session/${encodeURIComponent(id)}` },
    { method: "delete", url: `/api/chat/sessions/${encodeURIComponent(id)}` },
    { method: "delete", url: `/chat/sessions/${encodeURIComponent(id)}` },
    { method: "delete", url: `/api/chat/session/${encodeURIComponent(id)}` },
  ]);
}
