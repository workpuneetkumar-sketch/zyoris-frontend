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
  success?: boolean;
  [key: string]: any;
}

// Prefix configuration: defaults to /api/chat as specified in handoff report
const PRIMARY_PREFIX = "/api/chat";
const FALLBACK_PREFIX = "/chat";

/**
 * Execute request with automatic fallback between /api/chat and /chat
 */
async function requestWithFallback<T>(
  method: "get" | "post" | "patch" | "delete",
  subPath: string,
  data?: any
): Promise<T> {
  const primaryUrl = `${PRIMARY_PREFIX}${subPath}`;
  try {
    if (method === "get") {
      const res = await api.get(primaryUrl);
      return res.data;
    } else if (method === "post") {
      const res = await api.post(primaryUrl, data);
      return res.data;
    } else if (method === "patch") {
      const res = await api.patch(primaryUrl, data);
      return res.data;
    } else {
      const res = await api.delete(primaryUrl);
      return res.data;
    }
  } catch (err: any) {
    // If 404 on /api/chat, attempt fallback to /chat
    if (err.response?.status === 404) {
      const fallbackUrl = `${FALLBACK_PREFIX}${subPath}`;
      try {
        if (method === "get") {
          const res = await api.get(fallbackUrl);
          return res.data;
        } else if (method === "post") {
          const res = await api.post(fallbackUrl, data);
          return res.data;
        } else if (method === "patch") {
          const res = await api.patch(fallbackUrl, data);
          return res.data;
        } else {
          const res = await api.delete(fallbackUrl);
          return res.data;
        }
      } catch (fallbackErr) {
        throw fallbackErr;
      }
    }
    throw err;
  }
}

/**
 * 1. Retrieve all chatbot sessions for the authenticated user
 * GET /api/chat/sessions
 */
export async function listChatSessions(): Promise<ChatSession[]> {
  try {
    const raw = await requestWithFallback<any>("get", "/sessions");
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
    console.error("Failed to list chat sessions:", err);
    throw err;
  }
}

/**
 * 2. Create a new chatbot session
 * POST /api/chat/sessions
 */
export async function createChatSession(payload?: { title?: string }): Promise<ChatSession> {
  try {
    const raw = await requestWithFallback<any>("post", "/sessions", {
      title: payload?.title || "New CRM Conversation",
    });

    const item = raw?.session || raw?.data || raw;
    const now = new Date().toISOString();

    return {
      id: String(item.id || item._id || item.sessionId || `session-${Date.now()}`),
      title: item.title || payload?.title || "New CRM Conversation",
      createdAt: item.createdAt || item.created_at || now,
      updatedAt: item.updatedAt || item.updated_at || now,
      metadata: item.metadata || {},
    };
  } catch (err: any) {
    console.error("Failed to create chat session:", err);
    throw err;
  }
}

/**
 * 3. Retrieve a specific session and its conversation history
 * GET /api/chat/sessions/:id
 */
export async function getChatSession(id: string): Promise<ChatSessionDetailResponse> {
  if (!id) {
    throw new Error("Session ID is required to fetch conversation");
  }

  try {
    const raw = await requestWithFallback<any>("get", `/sessions/${encodeURIComponent(id)}`);
    const sessionObj = raw?.session || raw?.data?.session || raw?.data || raw;
    const rawMessages =
      raw?.messages ||
      raw?.data?.messages ||
      sessionObj?.messages ||
      (Array.isArray(raw) ? raw : []);

    const session: ChatSession = {
      id: String(sessionObj.id || sessionObj._id || sessionObj.sessionId || id),
      title: sessionObj.title || "CRM Conversation",
      createdAt: sessionObj.createdAt || sessionObj.created_at || new Date().toISOString(),
      updatedAt: sessionObj.updatedAt || sessionObj.updated_at || new Date().toISOString(),
      metadata: sessionObj.metadata || {},
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
    console.error(`Failed to retrieve chat session ${id}:`, err);
    throw err;
  }
}

/**
 * 4. Update session information (e.g. rename title)
 * PATCH /api/chat/sessions/:id
 */
export async function updateChatSession(
  id: string,
  payload: { title: string }
): Promise<ChatSession> {
  if (!id) throw new Error("Session ID is required to update session");
  if (!payload?.title?.trim()) throw new Error("Title cannot be empty");

  try {
    const raw = await requestWithFallback<any>(
      "patch",
      `/sessions/${encodeURIComponent(id)}`,
      { title: payload.title.trim() }
    );

    const item = raw?.session || raw?.data || raw;
    return {
      id: String(item.id || item._id || id),
      title: item.title || payload.title.trim(),
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || new Date().toISOString(),
      metadata: item.metadata || {},
    };
  } catch (err: any) {
    console.error(`Failed to update session ${id}:`, err);
    throw err;
  }
}

/**
 * 5. Send a user message and receive AI response with live CRM context
 * POST /api/chat/sessions/:id/messages
 */
export async function sendChatMessage(
  sessionId: string,
  message: string
): Promise<SendMessageResponse> {
  if (!sessionId) throw new Error("Session ID is required to send message");
  const trimmed = message?.trim();
  if (!trimmed) throw new Error("Message content cannot be empty");

  try {
    const payload = {
      message: trimmed,
      content: trimmed, // for broader backend compatibility
    };

    const raw = await requestWithFallback<any>(
      "post",
      `/sessions/${encodeURIComponent(sessionId)}/messages`,
      payload
    );

    return raw?.data || raw;
  } catch (err: any) {
    console.error(`Failed to send message to session ${sessionId}:`, err);
    // Provide clean, actionable error messages
    if (err.response?.status === 503) {
      throw new Error(
        err.response?.data?.message ||
          "ZII BOT AI Provider is temporarily unavailable. Please try again shortly."
      );
    }
    if (err.response?.status === 404) {
      throw new Error(
        "Chat session not found or expired. Please create a new chat session."
      );
    }
    if (err.response?.status === 401 || err.response?.status === 403) {
      throw new Error(
        err.response?.data?.message ||
          "You are not authorized to access this CRM chat session."
      );
    }

    const messageText =
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message ||
      "An unexpected error occurred while communicating with ZII BOT.";

    throw new Error(messageText);
  }
}

/**
 * 6. Delete a chatbot session
 * DELETE /api/chat/sessions/:id
 */
export async function deleteChatSession(id: string): Promise<void> {
  if (!id) throw new Error("Session ID is required to delete session");

  try {
    await requestWithFallback<any>("delete", `/sessions/${encodeURIComponent(id)}`);
  } catch (err: any) {
    console.error(`Failed to delete session ${id}:`, err);
    throw err;
  }
}
