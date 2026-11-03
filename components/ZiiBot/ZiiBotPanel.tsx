"use client";

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ZiiBotAvatar } from "./ZiiBotAvatar";
import { ZiiBotSidebar } from "./ZiiBotSidebar";
import { MarkdownContent } from "./MarkdownContent";
import type { ChatMessage, useZiiBotChat } from "./useZiiBotChat";
import { ContextualSuggestions } from "./ContextualSuggestions";
import {
  Send,
  Minimize2,
  Maximize2,
  X,
  Volume2,
  VolumeX,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  Copy,
  Check,
  RotateCcw,
  AlertCircle,
  PanelLeftOpen,
  PanelLeftClose,
  Mic,
  MicOff,
  Sparkles,
} from "lucide-react";
import { getVoiceService } from "./voiceService";
import { toast } from "react-toastify";
import { ActionProposalCard } from "@/components/ai/ActionProposalCard";
import type { AgentApprovalRequest } from "@/types/ai-proposals";

interface ZiiBotPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  chat: ReturnType<typeof useZiiBotChat>;
  darkMode: boolean;
}

// ─── Message Bubble ─────────────────────────────────────────────

function MessageBubble({
  message,
  onRetry,
}: {
  message: ChatMessage;
  onRetry?: (text?: string) => void;
}) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [rating, setRating] = useState<"up" | "down" | null>(null);

  const handleCopy = () => {
    if (!message.content) return;
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRating = (type: "up" | "down") => {
    if (rating) return;
    setRating(type);
    if (type === "up") {
      toast.success("Thanks for your feedback!");
    } else {
      toast.info("Thanks! We'll refine CRM responses.");
    }
  };

  if (message.isError) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-2.5 my-2 max-w-[90%]"
      >
        <ZiiBotAvatar size="message" isIdle={false} />
        <div className="flex-1 p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs shadow-sm">
          <div className="flex items-center gap-1.5 font-semibold text-rose-300 mb-1">
            <AlertCircle size={14} className="text-rose-400 flex-shrink-0" />
            <span>CRM Assistant Error</span>
          </div>
          <p className="leading-relaxed mb-2.5">{message.content}</p>
          {onRetry && message.failedText && (
            <button
              onClick={() => onRetry(message.failedText)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs transition-colors shadow-sm active:scale-95"
            >
              <RotateCcw size={12} />
              <span>Retry question</span>
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={`flex items-end gap-2.5 my-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {!isUser && <ZiiBotAvatar size="message" isIdle={true} />}

      <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-[85%]`}>
        <div
          className={`px-4 py-3 rounded-2xl shadow-sm leading-relaxed text-xs sm:text-sm ${
            isUser
              ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white rounded-br-none shadow-blue-500/20"
              : "bg-slate-800/90 text-slate-100 border border-slate-700/60 rounded-bl-none shadow-black/20"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap select-text">{message.content}</p>
          ) : (
            <MarkdownContent content={message.content} />
          )}
        </div>

        {/* Message actions for assistant */}
        {!isUser && (
          <div className="flex items-center gap-2 mt-1.5 ml-1 text-slate-400 text-[11px]">
            <button
              onClick={handleCopy}
              className="p-1 hover:text-cyan-400 hover:bg-slate-800 rounded transition-colors"
              title="Copy message"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            </button>

            {rating ? (
              <span className="text-[10px] text-slate-400 italic">Feedback recorded</span>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleRating("up")}
                  className="p-1 hover:text-emerald-400 hover:bg-slate-800 rounded transition-colors"
                  title="Helpful"
                >
                  <ThumbsUp size={12} />
                </button>
                <button
                  onClick={() => handleRating("down")}
                  className="p-1 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                  title="Not helpful"
                >
                  <ThumbsDown size={12} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Panel Component ───────────────────────────────────────

export function ZiiBotPanel({
  isOpen,
  onClose,
  isFullscreen,
  onToggleFullscreen,
  chat,
  darkMode,
}: ZiiBotPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(isFullscreen);
  const [isRecording, setIsRecording] = useState(false);
  const voiceService = getVoiceService();

  // Keep sidebar visible in fullscreen, collapsible in compact mode
  useEffect(() => {
    if (isFullscreen) {
      setSidebarOpen(true);
    }
  }, [isFullscreen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [chat.messages, chat.isTyping]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = inputValue.trim();
    if (text && !chat.isTyping) {
      chat.sendMessage(text);
      setInputValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleToggleVoice = () => {
    if (isRecording) {
      voiceService.stopListening();
      setIsRecording(false);
      return;
    }

    setIsRecording(true);
    const success = voiceService.startListening(
      (text) => {
        setInputValue(text);
        if (text && !text.endsWith("...")) {
          setTimeout(() => {
            if (inputRef.current?.value) {
              handleSubmit();
              setIsRecording(false);
            }
          }, 600);
        }
      },
      (err) => {
        console.error("Voice recognition error:", err);
        setIsRecording(false);
        if (err === "not-allowed") {
          toast.warn("Microphone access denied.");
        }
      }
    );

    if (!success) {
      setIsRecording(false);
      toast.warn("Voice speech-to-text is not supported in this browser.");
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 30, scale: 0.96 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className={`fixed z-50 flex shadow-2xl overflow-hidden bg-slate-900 border border-slate-800 text-slate-100 ${
        isFullscreen
          ? "inset-0 w-screen h-screen rounded-none"
          : "bottom-24 right-6 w-[470px] max-w-[calc(100vw-2rem)] h-[660px] max-h-[calc(100vh-7rem)] rounded-3xl"
      }`}
    >
      {/* ── Left Sidebar (Conversations History) ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: isFullscreen ? 280 : 240, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 h-full overflow-hidden z-20"
          >
            <ZiiBotSidebar
              sessions={chat.sessions}
              activeSessionId={chat.activeSessionId}
              onSelectSession={chat.selectSession}
              onNewChat={() => chat.createNewSession()}
              onRenameSession={chat.renameSession}
              onDeleteSession={chat.deleteSession}
              isLoading={chat.isLoadingSessions}
              onCloseMobile={() => setSidebarOpen(false)}
              className="w-full h-full"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Chat Area ── */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-slate-900">
        {/* Top Header */}
        <div className="relative flex items-center justify-between px-4 py-3.5 bg-slate-950/90 border-b border-slate-800/80">
          <div className="flex items-center gap-3 min-w-0">
            {/* Sidebar toggle */}
            <button
              onClick={() => setSidebarOpen((prev) => !prev)}
              className={`p-1.5 rounded-xl border transition-all ${
                sidebarOpen
                  ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400"
                  : "bg-slate-800/80 border-slate-700/60 text-slate-400 hover:text-slate-200"
              }`}
              title={sidebarOpen ? "Hide chat history" : "Show chat history"}
            >
              {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
            </button>

            {/* Mascot Avatar */}
            <ZiiBotAvatar size="panel" isIdle={!chat.isTyping} isTyping={chat.isTyping} showStatus />

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm tracking-wide text-white">ZII BOT</h3>
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 tracking-wider">
                  CRM AI
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[200px] sm:max-w-[260px]">
                {chat.activeSession?.title || "CRM Intelligence Assistant"}
              </p>
            </div>
          </div>

          {/* Action icons */}
          <div className="flex items-center gap-1">
            <button
              onClick={chat.toggleSound}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              title={chat.soundOn ? "Mute audio" : "Enable audio"}
            >
              {chat.soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            <button
              onClick={onToggleFullscreen}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              title={isFullscreen ? "Exit fullscreen" : "Expand fullscreen"}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              title="Close assistant"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Conversation Message List ── */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-2 zii-chat-scroll bg-gradient-to-b from-slate-950/40 to-slate-900"
        >
          {/* Welcome Empty State */}
          {chat.showGreeting && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center text-center py-6 px-3"
            >
              <div className="mb-3 relative">
                <ZiiBotAvatar size="hero" isIdle={true} />
                <div className="absolute -inset-2 bg-cyan-500/10 rounded-full blur-xl -z-10" />
              </div>

              <h4 className="text-base font-bold text-white mb-1 flex items-center gap-1.5 justify-center">
                <span>Welcome to ZII BOT</span>
                <Sparkles size={16} className="text-cyan-400 animate-spin" style={{ animationDuration: "6s" }} />
              </h4>

              <p className="text-xs text-slate-300 max-w-sm mb-4 leading-relaxed">
                Your AI assistant specialized in Zyoris CRM. Ask about your authorized{" "}
                <span className="text-cyan-400 font-semibold">Leads</span>,{" "}
                <span className="text-cyan-400 font-semibold">Deals</span>,{" "}
                <span className="text-cyan-400 font-semibold">Pipelines</span>,{" "}
                <span className="text-cyan-400 font-semibold">Tasks</span>, and{" "}
                <span className="text-cyan-400 font-semibold">Datasets</span>.
              </p>

              <div className="w-full max-w-md">
                <ContextualSuggestions onSelect={(prompt) => chat.sendMessage(prompt)} />
              </div>
            </motion.div>
          )}

          {/* Messages */}
          {chat.messages.map((msg) =>
            msg.type === "proposal" && msg.proposalData ? (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="my-3"
              >
                <ActionProposalCard
                  proposal={msg.proposalData}
                  onStatusChange={(id, _status, patch) => chat.updateProposalStatus(id, patch)}
                />
              </motion.div>
            ) : (
              <MessageBubble
                key={msg.id}
                message={msg}
                onRetry={(text) => chat.retryLastMessage(text)}
              />
            )
          )}

          {/* Typing Indicator */}
          {chat.isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2.5 my-2"
            >
              <ZiiBotAvatar size="message" isIdle={false} isTyping={true} />
              <div className="px-4 py-2.5 rounded-2xl bg-slate-800/90 border border-slate-700/60 shadow-sm flex items-center gap-2">
                <span className="text-xs text-cyan-400 font-medium">Querying CRM intelligence</span>
                <div className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* ── Input Box ── */}
        <div className="p-3 bg-slate-950 border-t border-slate-800/80">
          <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
            {/* Voice record button */}
            <button
              type="button"
              onClick={handleToggleVoice}
              className={`p-2.5 rounded-xl border transition-all ${
                isRecording
                  ? "bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
              }`}
              title={isRecording ? "Stop voice listening" : "Speak CRM question"}
            >
              {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
            </button>

            {/* Text input */}
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isRecording
                  ? "Listening to speech..."
                  : "Ask a CRM question (e.g. leads, deals, tasks)..."
              }
              disabled={chat.isTyping}
              className="flex-1 px-3.5 py-2.5 bg-slate-900 border border-slate-800 focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/20 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-400 outline-none transition-all disabled:opacity-50"
            />

            {/* Send button */}
            <button
              type="submit"
              disabled={chat.isTyping || !inputValue.trim()}
              className={`p-2.5 rounded-xl flex items-center justify-center transition-all ${
                chat.isTyping || !inputValue.trim()
                  ? "bg-slate-800 text-slate-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-md shadow-blue-500/25 active:scale-95"
              }`}
              title="Send message"
            >
              <Send size={16} />
            </button>
          </form>

          {/* Subtext info */}
          <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-slate-400">
            <span>ZII BOT CRM Assistant</span>
            <span className="flex items-center gap-1 text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              Live CRM Context Scoped
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
