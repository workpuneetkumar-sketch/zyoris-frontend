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

export function useZiiBotChat() {
  const { user } = useAuth();
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

  // Load sound setting on mount
  useEffect(() => {
    setSoundOn(getSoundEnabled());
  }, []);

  // Select a specific session and load history
  const selectSession = useCallback(async (sessionId: string) => {
    if (!sessionId) return;
    setActiveSessionId(sessionId);
    activeSessionRef.current = sessionId;
    setIsLoadingHistory(true);
    setErrorMessage(null);

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
      setMessages(converted);
    } catch (err: any) {
      console.error("Failed to load session history:", err);
      // Fallback empty messages if session has no prior history
      setMessages([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // Fetch session list
  const loadSessions = useCallback(async () => {
    if (!user) return;
    setIsLoadingSessions(true);
    try {
      const list = await listChatSessions();
      setSessions(list);
      // If we don't have an active session yet, select the most recent one
      if (list.length > 0 && !activeSessionRef.current) {
        selectSession(list[0].id);
      }
    } catch (err) {
      console.error("Failed to load ZII BOT chat sessions:", err);
    } finally {
      setIsLoadingSessions(false);
    }
  }, [user, selectSession]);

  // Load sessions when user changes
  useEffect(() => {
    if (user?.id) {
      loadSessions();
    } else {
      setSessions([]);
      setActiveSessionId(null);
      setMessages([]);
    }
  }, [user?.id, loadSessions]);

  // Create a new session
  const createNewSession = useCallback(async (initialTitle?: string): Promise<string> => {
    setErrorMessage(null);
    try {
      const newSession = await createChatSession({
        title: initialTitle || "New CRM Conversation",
      });
      setSessions((prev) => [newSession, ...prev.filter((s) => s.id !== newSession.id)]);
      setActiveSessionId(newSession.id);
      activeSessionRef.current = newSession.id;
      setMessages([]);
      return newSession.id;
    } catch (err: any) {
      console.error("Failed to create new chat session:", err);
      // Fallback to local session ID if network fails
      const fallbackId = `zii-local-${Date.now()}`;
      const fallbackSession: ChatSession = {
        id: fallbackId,
        title: initialTitle || "New Conversation",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setSessions((prev) => [fallbackSession, ...prev]);
      setActiveSessionId(fallbackId);
      activeSessionRef.current = fallbackId;
      setMessages([]);
      return fallbackId;
    }
  }, []);

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
  const deleteSession = useCallback(async (sessionId: string) => {
    if (!sessionId) return;
    try {
      await deleteChatSession(sessionId);
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
  }, [selectSession]);

  // Send a message
  const sendMessage = useCallback(async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || isTyping) return;

    let currentSessionId = activeSessionRef.current;

    // If no active session, automatically create one with a preview of the prompt
    if (!currentSessionId) {
      const generatedTitle = trimmed.length > 30 ? `${trimmed.slice(0, 30)}...` : trimmed;
      currentSessionId = await createNewSession(generatedTitle);
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
      const res = await sendChatMessage(currentSessionId, trimmed);

      const assistantText =
        res.reply ??
        res.content ??
        res.message?.content ??
        "I'm here to assist with Zyoris CRM workflows and authorized data.";

      // Check for embedded proposal
      const proposal = extractProposal(res as Record<string, unknown>);

      if (soundOn) {
        playMessageSound();
      }

      // Voice output if speech enabled and text available
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

      setMessages((prev) => [...prev, ...newMessages]);

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
              lastMessage: assistantText.slice(0, 40),
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

      // Render error message bubble with retry action
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
  }, [isTyping, soundOn, voiceService, createNewSession]);

  // Retry sending last failed message
  const retryLastMessage = useCallback(async (customText?: string) => {
    const textToRetry = customText || lastFailedMessage;
    if (!textToRetry) return;
    // Remove the last error message from the conversation before retrying
    setMessages((prev) => prev.filter((m) => !m.isError));
    await sendMessage(textToRetry);
  }, [lastFailedMessage, sendMessage]);

  const toggleSound = useCallback(() => {
    const next = !getSoundEnabled();
    setSoundEnabled(next);
    setSoundOn(next);
    if (!next) {
      voiceService.stopSpeaking();
    }
  }, [voiceService]);

  const updateProposalStatus = useCallback((
    approvalId: string,
    patch: Partial<AgentApprovalRequest>
  ) => {
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
