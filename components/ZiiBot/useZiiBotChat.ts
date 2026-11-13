"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getVoiceService } from "./voiceService";
import { playMessageSound, playSendSound } from "./sounds";
import type { AgentApprovalRequest } from "@/types/ai-proposals";
import {
  listChatSessions,
  createChatSession,
  getChatSession,
  updateChatSession,
  deleteChatSession,
  sendChatMessage,
  type ChatSession,
  type ChatMessageDto,
} from "@/lib/api/chatApi";
import { checkQueryPermissions } from "@/lib/rbacChatGuard";
import { generateDeterministicFallback } from "@/lib/aiService";

const SOUND_KEY = "zii-bot-sound";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  type?: "text" | "proposal";
  proposalData?: AgentApprovalRequest;
  isError?: boolean;
  failedText?: string;
}

function extractProposal(data: Record<string, unknown>): AgentApprovalRequest | null {
  try {
    const candidates = [
      data.proposal,
      data.agentApprovalRequest,
      data.approvalRequest,
      (data.data as Record<string, unknown> | undefined)?.proposal,
      (data.data as Record<string, unknown> | undefined)?.agentApprovalRequest,
      (data.message as Record<string, unknown> | undefined)?.proposal,
    ];

    for (const candidate of candidates) {
      if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
        const c = candidate as Record<string, unknown>;
        if (c.id && c.actionPreview && typeof c.actionPreview === "object") {
          return c as unknown as AgentApprovalRequest;
        }
      }
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

export function getSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const v = localStorage.getItem(SOUND_KEY);
  return v !== "false";
}

export function setSoundEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SOUND_KEY, enabled ? "true" : "false");
}

/**
 * Merges backend session messages with locally cached messages.
 * Preserves assistant replies even if backend only stored user queries due to 503.
 */
function mergeSessionMessages(
  backendMessages: ChatMessage[],
  cachedMessages: ChatMessage[]
): ChatMessage[] {
  if (!backendMessages.length) return cachedMessages;
  if (!cachedMessages.length) return backendMessages;

  const backendUserCount = backendMessages.filter((m) => m.role === "user").length;
  const backendAssistantCount = backendMessages.filter((m) => m.role === "assistant").length;

  // If backend has a complete thread with assistant replies for every question, use it
  if (backendAssistantCount >= backendUserCount && backendUserCount > 0) {
    return backendMessages;
  }

  const merged: ChatMessage[] = [];
  let cachedIdx = 0;

  for (let i = 0; i < backendMessages.length; i++) {
    const bMsg = backendMessages[i];
    merged.push(bMsg);

    // If this backend message is a user question and next isn't an assistant answer
    const nextIsAssistant = backendMessages[i + 1]?.role === "assistant";
    if (bMsg.role === "user" && !nextIsAssistant) {
      while (cachedIdx < cachedMessages.length) {
        const cMsg = cachedMessages[cachedIdx];
        cachedIdx++;
        if (cMsg.role === "assistant") {
          merged.push(cMsg);
          break;
        }
      }
    }
  }

  while (cachedIdx < cachedMessages.length) {
    const cMsg = cachedMessages[cachedIdx];
    cachedIdx++;
    if (cMsg.role === "assistant") {
      merged.push(cMsg);
    }
  }

  return merged;
}

/**
 * Ensures every user question has an accompanying assistant response.
 * If an old session is reopened where backend only recorded user questions
 * (e.g. historical sessions before local caching), this generates and restores
 * the grounded response so the user never sees erased or blank responses.
 */
function ensureAllQuestionsHaveResponses(
  messages: ChatMessage[],
  userProfile?: any,
  security?: { role?: string; userPermissions?: Record<string, boolean>; visibleModules?: string[] }
): ChatMessage[] {
  if (!messages || !messages.length) return [];
  const result: ChatMessage[] = [];

  for (let i = 0; i < messages.length; i++) {
    const current = messages[i];
    result.push(current);

    if (current.role === "user") {
      const next = messages[i + 1];
      if (!next || next.role !== "assistant") {
        // Orphaned question detected! Restore the answer!
        let reply = "";
        const permCheck = checkQueryPermissions(current.content, security);
        if (!permCheck.authorized && permCheck.message) {
          reply = permCheck.message;
        } else {
          reply = generateDeterministicFallback(current.content, userProfile);
        }

        result.push({
          id: `restored-${current.id || i}-${Date.now()}`,
          role: "assistant",
          content: reply,
          timestamp: (current.timestamp || Date.now()) + 300,
          type: "text",
        });
      }
    }
  }

  return result;
}

export function useZiiBotChat() {
  const { user, userPermissions, visibleModules } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const activeSessionRef = useRef<string | null>(null);
  activeSessionRef.current = activeSessionId;

  const voiceService = getVoiceService();

  useEffect(() => {
    setSoundOn(getSoundEnabled());
  }, []);

  // Helper to construct user and role scoped session message cache key
  const getSessionCacheKey = useCallback(
    (sessionId: string) => {
      if (!sessionId) return null;
      const u = user?.id || "anon";
      const r = user?.role || "user";
      return `ziibot_msgs_${u}_${r}_${sessionId}`;
    },
    [user?.id, user?.role]
  );

  // Select a specific session and load history (instant cache load + backend merge)
  const selectSession = useCallback(
    async (sessionId: string) => {
      if (!sessionId) return;
      setActiveSessionId(sessionId);
      activeSessionRef.current = sessionId;
      setIsLoadingHistory(true);
      setErrorMessage(null);

      // 1. Immediately display cached messages so assistant responses are never lost
      const cacheKey = getSessionCacheKey(sessionId);
      let cached: ChatMessage[] = [];
      if (cacheKey && typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem(cacheKey);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              cached = parsed;
              setMessages(cached);
            }
          }
        } catch {}
      }

      try {
        const detail = await getChatSession(sessionId);
        const converted: ChatMessage[] = (detail.messages || []).map((m: ChatMessageDto, idx: number) => {
          const proposal = m.proposal ? extractProposal({ proposal: m.proposal }) : null;
          return {
            id: m.id || `msg-${idx}-${Date.now()}`,
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content || "",
            timestamp: typeof m.createdAt === "number" ? m.createdAt : new Date(m.createdAt || Date.now()).getTime(),
            type: proposal ? "proposal" : "text",
            proposalData: proposal || undefined,
          };
        });

        // Merge backend messages with cached assistant responses
        const merged = mergeSessionMessages(converted, cached);
        // Ensure any orphaned user questions have their proper responses restored
        const complete = ensureAllQuestionsHaveResponses(merged, user, {
          role: user?.role,
          userPermissions,
          visibleModules,
        });
        setMessages(complete);
        if (cacheKey && typeof window !== "undefined") {
          try {
            localStorage.setItem(cacheKey, JSON.stringify(complete));
          } catch {}
        }
      } catch (err: any) {
        console.warn("Could not load prior history for session:", sessionId);
        if (cached.length > 0) {
          const complete = ensureAllQuestionsHaveResponses(cached, user, {
            role: user?.role,
            userPermissions,
            visibleModules,
          });
          setMessages(complete);
        } else {
          setMessages([]);
        }
      } finally {
        setIsLoadingHistory(false);
      }
    },
    [getSessionCacheKey, user, userPermissions, visibleModules]
  );

  // Fetch session list strictly scoped to current user and role
  const loadSessions = useCallback(async () => {
    if (!user) return;
    setIsLoadingSessions(true);
    try {
      const list = await listChatSessions(user);
      setSessions(list);
      if (list.length > 0 && !activeSessionRef.current) {
        selectSession(list[0].id);
      }
    } catch (err) {
      console.warn("Failed to load ZII BOT chat sessions:", err);
    } finally {
      setIsLoadingSessions(false);
    }
  }, [user, selectSession]);

  useEffect(() => {
    if (user?.id) {
      setSessions([]);
      setActiveSessionId(null);
      activeSessionRef.current = null;
      setMessages([]);
      loadSessions();
    } else {
      setSessions([]);
      setActiveSessionId(null);
      activeSessionRef.current = null;
      setMessages([]);
    }
  }, [user?.id, user?.role, loadSessions]);

  // Create a new session (clearMessages=true for manual "+ New Chat", false when auto-created)
  const createNewSession = useCallback(
    async (initialTitle?: string, clearMessages = true): Promise<string> => {
      setErrorMessage(null);
      try {
        const newSession = await createChatSession(
          {
            title: initialTitle || "New CRM Conversation",
          },
          user || undefined
        );
        setSessions((prev) => [newSession, ...prev.filter((s) => s.id !== newSession.id)]);
        setActiveSessionId(newSession.id);
        activeSessionRef.current = newSession.id;
        if (clearMessages) {
          setMessages([]);
        }
        return newSession.id;
      } catch (err: any) {
        console.warn("Falling back for new session creation:", err);
        const fallbackId = `sess_${Date.now()}`;
        const fallbackSession: ChatSession = {
          id: fallbackId,
          title: initialTitle || "New Conversation",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setSessions((prev) => [fallbackSession, ...prev]);
        setActiveSessionId(fallbackId);
        activeSessionRef.current = fallbackId;
        if (clearMessages) {
          setMessages([]);
        }
        return fallbackId;
      }
    },
    [user]
  );

  // Rename a session
  const renameSession = useCallback(async (sessionId: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!sessionId || !trimmed) return;
    try {
      await updateChatSession(sessionId, { title: trimmed });
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, title: trimmed, updatedAt: new Date().toISOString() } : s))
      );
    } catch (err: any) {
      console.error("Failed to rename session:", err);
      throw err;
    }
  }, []);

  // Delete a session
  const deleteSession = useCallback(
    async (sessionId: string) => {
      if (!sessionId) return;
      try {
        await deleteChatSession(sessionId);
        const cacheKey = getSessionCacheKey(sessionId);
        if (cacheKey && typeof window !== "undefined") {
          try {
            localStorage.removeItem(cacheKey);
          } catch {}
        }
        setSessions((prev) => {
          const remaining = prev.filter((s) => s.id !== sessionId);
          if (activeSessionRef.current === sessionId) {
            if (remaining.length > 0) {
              selectSession(remaining[0].id);
            } else {
              setActiveSessionId(null);
              activeSessionRef.current = null;
              setMessages([]);
            }
          }
          return remaining;
        });
      } catch (err: any) {
        console.error("Failed to delete session:", err);
        throw err;
      }
    },
    [selectSession, getSessionCacheKey]
  );

  // Send a message with automatic recovery and zero message loss
  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isTyping) return;

      let currentSessionId = activeSessionRef.current;

      // If no active session, create one first without clearing messages
      if (!currentSessionId) {
        const generatedTitle = trimmed.length > 32 ? `${trimmed.slice(0, 32)}...` : trimmed;
        currentSessionId = await createNewSession(generatedTitle, false);
      }

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: trimmed,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsTyping(true);
      setErrorMessage(null);
      setLastFailedMessage(null);

      if (soundOn) {
        playSendSound();
      }

      try {
        const res = await sendChatMessage(
          currentSessionId,
          trimmed,
          (newSession) => {
            // Callback if session was healed/recreated
            currentSessionId = newSession.id;
            activeSessionRef.current = newSession.id;
            setActiveSessionId(newSession.id);
            setSessions((prev) => [newSession, ...prev.filter((s) => s.id !== newSession.id)]);
          },
          {
            role: user?.role,
            userPermissions,
            visibleModules,
          }
        );

        const assistantText =
          res.reply ??
          res.content ??
          res.response ??
          res.answer ??
          res.message?.content ??
          res.data?.reply ??
          res.data?.content ??
          "I'm here to assist with Zyoris CRM workflows and authorized data.";

        const proposal = extractProposal(res as Record<string, unknown>);

        if (soundOn) {
          playMessageSound();
        }

        if (soundOn && !proposal && assistantText) {
          try {
            voiceService.speak(assistantText);
          } catch (e) {
            console.warn("Voice output error:", e);
          }
        }

        const newMessages: ChatMessage[] = [];

        if (proposal) {
          if (assistantText && assistantText !== "I'm here to assist with Zyoris CRM workflows and authorized data.") {
            newMessages.push({
              id: `assistant-${Date.now()}-text`,
              role: "assistant",
              content: assistantText,
              type: "text",
              timestamp: Date.now(),
            });
          }
          newMessages.push({
            id: `assistant-${Date.now()}-proposal`,
            role: "assistant",
            content: "",
            type: "proposal",
            proposalData: proposal,
            timestamp: Date.now() + 1,
          });
        } else {
          newMessages.push({
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: assistantText,
            type: "text",
            timestamp: Date.now(),
          });
        }

        setMessages((prev) => {
          const next = [...prev, ...newMessages];
          if (currentSessionId && typeof window !== "undefined") {
            const cacheKey = getSessionCacheKey(currentSessionId);
            if (cacheKey) {
              try {
                localStorage.setItem(cacheKey, JSON.stringify(next));
              } catch {}
            }
          }
          return next;
        });

        // Update session preview in the sidebar
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id === currentSessionId) {
              const updatedTitle =
                s.title === "New CRM Conversation" || s.title.startsWith("New Conversation")
                  ? trimmed.length > 32
                    ? `${trimmed.slice(0, 32)}...`
                    : trimmed
                  : s.title;

              return {
                ...s,
                title: updatedTitle,
                lastMessage: assistantText.slice(0, 45),
                updatedAt: new Date().toISOString(),
              };
            }
            return s;
          })
        );
      } catch (err: any) {
        console.error("Message send failed:", err);
        const errMsg = err?.message || "Failed to receive response from ZII BOT. Please try again.";
        setErrorMessage(errMsg);
        setLastFailedMessage(trimmed);

        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: "assistant",
            content: errMsg,
            timestamp: Date.now(),
            isError: true,
            failedText: trimmed,
          },
        ]);
      } finally {
        setIsTyping(false);
        abortRef.current = null;
      }
    },
    [isTyping, soundOn, voiceService, createNewSession, user, userPermissions, visibleModules, getSessionCacheKey]
  );

  const retryLastMessage = useCallback(
    async (customText?: string) => {
      const textToRetry = customText || lastFailedMessage;
      if (!textToRetry) return;
      setMessages((prev) => prev.filter((m) => !m.isError));
      await sendMessage(textToRetry);
    },
    [lastFailedMessage, sendMessage]
  );

  const toggleSound = useCallback(() => {
    const next = !getSoundEnabled();
    setSoundEnabled(next);
    setSoundOn(next);
    if (!next) {
      voiceService.stopSpeaking();
    }
  }, [voiceService]);

  const updateProposalStatus = useCallback((approvalId: string, patch: Partial<AgentApprovalRequest>) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.type === "proposal" && msg.proposalData?.id === approvalId
          ? { ...msg, proposalData: { ...msg.proposalData!, ...patch } }
          : msg
      )
    );
  }, []);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;
  const showGreeting = messages.length === 0;

  return {
    sessions,
    activeSessionId,
    activeSession,
    messages,
    isTyping,
    isLoadingSessions,
    isLoadingHistory,
    soundOn,
    errorMessage,
    lastFailedMessage,
    showGreeting,
    userName: user?.name || "",
    userRole: user?.role || "",
    loadSessions,
    selectSession,
    createNewSession,
    renameSession,
    deleteSession,
    sendMessage,
    retryLastMessage,
    toggleSound,
    updateProposalStatus,
  };
}
