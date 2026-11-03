import api from "./api";
import type { AgentApprovalRequest } from "@/types/ai-proposals";

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
 * Helper to try candidate endpoints sequentially until one succeeds.
 * Highly resilient against singular/plural and prefix differences.
 */
async function tryCandidates<T>(
  candidates: Array<{ method: "get" | "post" | "patch" | "delete"; url: string; data?: any }>
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
      // For auth or server 500/503 errors, fail immediately or allow fallback if more candidates
      if (err.response?.status === 401 || err.response?.status === 403) {
        throw err;
      }
    }
  }

  throw lastError;
}

/**
 * 1. Retrieve all chatbot sessions for the authenticated user
 * GET /api/chat/sessions or GET /chat/sessions
 */
export async function listChatSessions(): Promise<ChatSession[]> {
  try {
    const raw = await tryCandidates<any>([
      { method: "get", url: "/api/chat/sessions" },
      { method: "get", url: "/chat/sessions" },
      { method: "get", url: "/api/chat/session" },
      { method: "get", url: "/chat/session" },
    ]);

    const list = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.sessions)
      ? raw.sessions
      : Array.isArray(raw?.data)
      ? raw.data
      : [];

    return list.map((item: any): ChatSession => ({
      id: String(item.id || item._id || item.sessionId),
      title: item.title || item.name || "Untitled Chat",
      createdAt: item.createdAt || item.created_at || new Date().toISOString(),
      updatedAt: item.updatedAt || item.updated_at || item.createdAt || new Date().toISOString(),
      lastMessage: item.lastMessage || item.preview || item.snippet || undefined,
      messageCount: typeof item.messageCount === "number" ? item.messageCount : undefined,
      metadata: item.metadata || {},
    }));
  } catch (err: any) {
    console.warn("Failed to list chat sessions:", err);
    return [];
  }
}

/**
 * 2. Create a new chatbot session
 * POST /api/chat/sessions, /chat/sessions, /api/chat/session, /chat/session
 */
export async function createChatSession(payload?: { title?: string }): Promise<ChatSession> {
  const title = payload?.title || "New CRM Conversation";
  const body = { title };

  try {
    const raw = await tryCandidates<any>([
      { method: "post", url: "/api/chat/sessions", data: body },
      { method: "post", url: "/chat/sessions", data: body },
      { method: "post", url: "/api/chat/session", data: body },
      { method: "post", url: "/chat/session", data: body },
    ]);

    const item = raw?.session || raw?.data?.session || raw?.data || raw;
    const now = new Date().toISOString();

    return {
      id: String(item?.id || item?._id || item?.sessionId || `sess_${Date.now()}`),
      title: item?.title || title,
      createdAt: item?.createdAt || item?.created_at || now,
      updatedAt: item?.updatedAt || item?.updated_at || now,
      metadata: item?.metadata || {},
    };
  } catch (err: any) {
    console.error("Failed to create chat session on backend:", err);
    throw err;
  }
}

/**
 * 3. Retrieve a specific session and its conversation history
 */
export async function getChatSession(id: string): Promise<ChatSessionDetailResponse> {
  if (!id) {
    throw new Error("Session ID is required to fetch conversation");
  }

  try {
    const raw = await tryCandidates<any>([
      { method: "get", url: `/api/chat/sessions/${encodeURIComponent(id)}` },
      { method: "get", url: `/chat/sessions/${encodeURIComponent(id)}` },
      { method: "get", url: `/api/chat/session/${encodeURIComponent(id)}` },
      { method: "get", url: `/chat/session/${encodeURIComponent(id)}` },
    ]);

    const sessionObj = raw?.session || raw?.data?.session || raw?.data || raw;
    const rawMessages =
      raw?.messages ||
      raw?.data?.messages ||
      sessionObj?.messages ||
      (Array.isArray(raw) ? raw : []);

    const session: ChatSession = {
      id: String(sessionObj?.id || sessionObj?._id || sessionObj?.sessionId || id),
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
    { method: "patch", url: `/api/chat/session/${encodeURIComponent(id)}`, data: body },
    { method: "patch", url: `/chat/session/${encodeURIComponent(id)}`, data: body },
  ]);

  const item = raw?.session || raw?.data || raw;
  return {
    id: String(item?.id || item?._id || id),
    title: item?.title || trimmed,
    createdAt: item?.createdAt || new Date().toISOString(),
    updatedAt: item?.updatedAt || new Date().toISOString(),
    metadata: item?.metadata || {},
  };
}

/**
 * 5. Send a user message and receive AI response with live CRM context
 * Supports /api/chat/sessions/:id/messages AND /chat/message with auto-recovery!
 */
export async function sendChatMessage(
  sessionId: string,
  message: string
): Promise<SendMessageResponse> {
  const trimmed = message?.trim();
  if (!trimmed) throw new Error("Message content cannot be empty");

  const payload = {
    sessionId,
    message: trimmed,
    content: trimmed,
  };

  try {
    const raw = await tryCandidates<any>([
      // Primary routes: sub-resource messages
      { method: "post", url: `/api/chat/sessions/${encodeURIComponent(sessionId)}/messages`, data: payload },
      { method: "post", url: `/chat/sessions/${encodeURIComponent(sessionId)}/messages`, data: payload },
      // Direct message routes: { sessionId, message }
      { method: "post", url: "/api/chat/message", data: payload },
      { method: "post", url: "/chat/message", data: payload },
      { method: "post", url: "/api/chat/messages", data: payload },
      { method: "post", url: "/chat/messages", data: payload },
    ]);

    const res = raw?.data || raw;
    return res;
  } catch (err: any) {
    console.error(`Failed to send message to session ${sessionId}:`, err);

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
      err.message ||
      "An unexpected error occurred while communicating with ZII BOT.";

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
    { method: "delete", url: `/api/chat/sessions/${encodeURIComponent(id)}` },
    { method: "delete", url: `/chat/sessions/${encodeURIComponent(id)}` },
    { method: "delete", url: `/api/chat/session/${encodeURIComponent(id)}` },
    { method: "delete", url: `/chat/session/${encodeURIComponent(id)}` },
  ]);
}
