"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ZII_GREETING } from "./ZiiBotAvatar";
import { getOrgSummary, getRoleContext, OrgSummary } from "@/lib/api/organizationsApi";
import { useAuth } from "@/context/AuthContext";
import { getVoiceService } from "./voiceService";
import api from "@/lib/api/api";
import type { AgentApprovalRequest } from "@/types/ai-proposals";

const SESSION_KEY = "zii-bot-session";
const HISTORY_KEY = "zii-bot-history";
const SOUND_KEY = "zii-bot-sound";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  /**
   * "text"     — standard assistant reply, rendered as HTML via formatMessageContent()
   * "proposal" — an AgentApprovalRequest; rendered as ActionProposalCard instead of text
   */
  type?: "text" | "proposal";
  /** Present only when type === "proposal" */
  proposalData?: AgentApprovalRequest;
}

// ─── Helper: detect and extract an AgentApprovalRequest from the API response ──
//
// The backend may embed the approval request in several shapes:
//   { reply: "...", proposal: { id, agentId, actionPreview, ... } }
//   { proposal: { ... } }
//   { data: { proposal: { ... } } }
//   { agentApprovalRequest: { ... } }
//
// Returns null if no proposal is found (treat as a normal text message).
function extractProposal(data: Record<string, unknown>): AgentApprovalRequest | null {
  try {
    // Direct top-level
    const candidates = [
      data.proposal,
      data.agentApprovalRequest,
      data.approvalRequest,
      (data.data as Record<string, unknown> | undefined)?.proposal,
      (data.data as Record<string, unknown> | undefined)?.agentApprovalRequest,
    ];

    for (const candidate of candidates) {
      if (
        candidate &&
        typeof candidate === "object" &&
        !Array.isArray(candidate)
      ) {
        const c = candidate as Record<string, unknown>;
        // Validate it looks like an AgentApprovalRequest
        if (c.id && c.actionPreview && typeof c.actionPreview === "object") {
          return c as unknown as AgentApprovalRequest;
        }
      }
    }
  } catch {
    // Never crash the chat over a parse error
  }
  return null;
}

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let s = sessionStorage.getItem(SESSION_KEY);
  if (!s) {
    s = `zii-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    sessionStorage.setItem(SESSION_KEY, s);
  }
  return s;
}

function loadHistory(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatMessage[];
    return Array.isArray(parsed) ? parsed.slice(-50) : [];
  } catch {
    return [];
  }
}

function saveHistory(messages: ChatMessage[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-50)));
  } catch {
    // Ignore
  }
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

function playNotificationSound() {
  if (!getSoundEnabled() || typeof window === "undefined") return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // Ignore
  }
}

export function useZiiBotChat() {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadHistory());
  const [isTyping, setIsTyping] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [orgContext, setOrgContext] = useState<OrgSummary | null>(null);
  const [roleContext, setRoleContext] = useState<string>("");
  const sessionIdRef = useRef<string>("");
  const abortRef = useRef<AbortController | null>(null);
  const contextLoadedRef = useRef(false);
  const voiceService = getVoiceService();

  // Load organization context on mount
  useEffect(() => {
    async function loadContext() {
      if (contextLoadedRef.current) return;
      contextLoadedRef.current = true;
      
      const org = await getOrgSummary();
      setOrgContext(org);
      
      if (user?.role) {
        const ctx = await getRoleContext(user.role);
        setRoleContext(ctx);
      }
    }
    loadContext();
  }, [user]);

  useEffect(() => {
    sessionIdRef.current = getSessionId();
  }, []);

  // Clear messages if user logs out or changes
  useEffect(() => {
    if (user?.id) {
      // It's a new user login or refresh with active user, keep their session or clear if they want it fresh
      // The user requested: "whenever I login I should see a clean chatbot"
      // Since it's in sessionStorage, it's tied to the tab. But just to be sure on auth state change:
      const savedUser = sessionStorage.getItem('zii-bot-user-id');
      if (savedUser !== user.id) {
        sessionStorage.setItem('zii-bot-user-id', user.id);
        sessionStorage.removeItem(HISTORY_KEY);
        setMessages([]);
      }
    } else {
      sessionStorage.removeItem('zii-bot-user-id');
      sessionStorage.removeItem(HISTORY_KEY);
      setMessages([]);
    }
  }, [user?.id]);

  useEffect(() => {
    setSoundOn(getSoundEnabled());
  }, []);

  useEffect(() => {
    if (messages.length > 0) saveHistory(messages);
  }, [messages]);

  const sendMessage = useCallback(async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || isTyping) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const res = await api.post("/chat/message", {
          sessionId: sessionIdRef.current || getSessionId(),
          message: trimmed
      }, {
          signal: (abortRef.current = new AbortController()).signal,
      });

      const data = res.data;
      const assistantText = data.reply ?? data.message?.content ?? "I'm here to help. Try asking how Zyoris can increase your revenue or improve your sales strategy.";

      // ── Check for an embedded AgentApprovalRequest ──────────────────────────
      // If the backend included a proposal, render a ProposalCard instead of text.
      const proposal = extractProposal(data as Record<string, unknown>);

      // Play notification sound
      playNotificationSound();

      // 🎤 Speak the response aloud (if sound is on and it's a text reply)
      if (soundOn && !proposal) {
        try {
          voiceService.speak(assistantText);
        } catch (e) {
          console.warn("Voice output error:", e);
        }
      }

      if (proposal) {
        // Proposal path — render ActionProposalCard; also add a brief text preamble if present
        const messages: ChatMessage[] = [];

        // Optional preamble text (e.g. "I've drafted an email for you:")
        if (assistantText && assistantText !== "I'm here to help. Try asking how Zyoris can increase your revenue or improve your sales strategy.") {
          messages.push({
            id: `assistant-${Date.now()}-text`,
            role: "assistant",
            content: assistantText,
            type: "text",
            timestamp: Date.now(),
          });
        }

        // The proposal card message
        messages.push({
          id: `assistant-${Date.now()}-proposal`,
          role: "assistant",
          content: "",
          type: "proposal",
          proposalData: proposal,
          timestamp: Date.now() + 1,
        });

        setMessages((prev) => [...prev, ...messages]);
      } else {
        // Normal text path
        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: assistantText,
          type: "text",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      const errMsg = (e as Error).message || "Could not get a response. Please try again.";
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: errMsg,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsTyping(false);
      abortRef.current = null;
    }
  }, [isTyping, soundOn, voiceService]);

  const toggleSound = useCallback(() => {
    const next = !getSoundEnabled();
    setSoundEnabled(next);
    setSoundOn(next);
    
    // If turning off sound, stop any ongoing speech
    if (!next) {
      voiceService.stopSpeaking();
    }
  }, [voiceService]);

  /**
   * Called by ActionProposalCard after a status change (approve/reject/execute).
   * Updates the proposalData in the corresponding message so the card
   * re-renders with the new status without a full refetch.
   */
  const updateProposalStatus = useCallback((
    approvalId: string,
    patch: Partial<import("@/types/ai-proposals").AgentApprovalRequest>
  ) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.type === "proposal" && msg.proposalData?.id === approvalId
          ? { ...msg, proposalData: { ...msg.proposalData!, ...patch } }
          : msg
      )
    );
  }, []);

  const showGreeting = messages.length === 0;
  
  return {
    messages,
    sendMessage,
    updateProposalStatus,
    isTyping,
    soundOn,
    toggleSound,
    showGreeting,
    userName: user?.name || "",
  };
}