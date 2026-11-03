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
        <div className="flex-1 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs shadow-sm">
          <div className="flex items-center gap-1.5 font-bold text-rose-700 mb-1">
            <AlertCircle size={14} className="text-rose-600 flex-shrink-0" />
            <span>CRM Assistant Notice</span>
          </div>
          <p className="leading-relaxed mb-2.5 text-rose-800">{message.content}</p>
          {onRetry && message.failedText && (
            <button
              onClick={() => onRetry(message.failedText)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors shadow-sm active:scale-95"
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
      className={`flex items-end gap-2.5 my-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {!isUser && <ZiiBotAvatar size="message" isIdle={true} />}

      <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-[85%]`}>
        <div
          className={`px-4 py-3 rounded-2xl leading-relaxed text-xs sm:text-sm ${
            isUser
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-none shadow-md shadow-blue-500/15"
              : "bg-white text-gray-800 border border-gray-200/90 rounded-bl-none shadow-sm"
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
          <div className="flex items-center gap-2 mt-1 ml-1 text-gray-400 text-[11px]">
            <button
              onClick={handleCopy}
              className="p-1 hover:text-blue-600 hover:bg-gray-100 rounded transition-colors"
              title="Copy message"
            >
              {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
            </button>

            {rating ? (
              <span className="text-[10px] text-gray-400 italic">Feedback recorded</span>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleRating("up")}
                  className="p-1 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                  title="Helpful"
                >
                  <ThumbsUp size={12} />
                </button>
                <button
                  onClick={() => handleRating("down")}
                  className="p-1 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
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

// ─── Main Panel Component (Pure White Theme) ─────────────────────

export function ZiiBotPanel({
  isOpen,
  onClose,
  isFullscreen,
  onToggleFullscreen,
  chat,
}: ZiiBotPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(isFullscreen);
  const [isRecording, setIsRecording] = useState(false);
  const voiceService = getVoiceService();

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
      className={`fixed z-50 flex shadow-2xl overflow-hidden bg-white border border-gray-200 text-gray-900 ${
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
      <div className="flex-1 flex flex-col h-full min-w-0 bg-white">
        {/* Top Header */}
        <div className="relative flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            {/* Sidebar toggle */}
            <button
              onClick={() => setSidebarOpen((prev) => !prev)}
              className={`p-1.5 rounded-xl border transition-all ${
                sidebarOpen
                  ? "bg-blue-50 border-blue-200 text-blue-600"
                  : "bg-gray-50 border-gray-200 text-gray-500 hover:text-gray-800"
              }`}
              title={sidebarOpen ? "Hide chat history" : "Show chat history"}
            >
              {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
            </button>

            {/* Mascot Avatar */}
            <ZiiBotAvatar size="panel" isIdle={!chat.isTyping} isTyping={chat.isTyping} showStatus />

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm tracking-wide text-gray-900">ZII BOT</h3>
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-600 tracking-wider">
                  CRM AI
                </span>
              </div>
              <p className="text-[11px] text-gray-400 truncate max-w-[200px] sm:max-w-[260px]">
                {chat.activeSession?.title || "CRM Intelligence Assistant"}
              </p>
            </div>
          </div>

          {/* Action icons */}
          <div className="flex items-center gap-1">
            <button
              onClick={chat.toggleSound}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              title={chat.soundOn ? "Mute audio" : "Enable audio"}
            >
              {chat.soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            <button
              onClick={onToggleFullscreen}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              title={isFullscreen ? "Exit fullscreen" : "Expand fullscreen"}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Close assistant"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Conversation Message List ── */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-2 zii-chat-scroll bg-[#F8FAFC]"
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
              </div>

              <h4 className="text-base font-extrabold text-gray-900 mb-1 flex items-center gap-1.5 justify-center">
                <span>Welcome to ZII BOT</span>
                <Sparkles size={16} className="text-blue-600 animate-spin" style={{ animationDuration: "6s" }} />
              </h4>

              <p className="text-xs text-gray-600 max-w-sm mb-4 leading-relaxed">
                Your AI assistant specialized in Zyoris CRM. Ask about your authorized{" "}
                <span className="text-blue-600 font-semibold">Leads</span>,{" "}
                <span className="text-blue-600 font-semibold">Deals</span>,{" "}
                <span className="text-blue-600 font-semibold">Pipelines</span>,{" "}
                <span className="text-blue-600 font-semibold">Tasks</span>, and{" "}
                <span className="text-blue-600 font-semibold">Datasets</span>.
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
              <div className="px-4 py-2.5 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center gap-2">
                <span className="text-xs text-blue-600 font-medium">Querying CRM intelligence</span>
                <div className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* ── Input Box ── */}
        <div className="p-3 bg-white border-t border-gray-100">
          <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
            {/* Voice record button */}
            <button
              type="button"
              onClick={handleToggleVoice}
              className={`p-2.5 rounded-xl border transition-all ${
                isRecording
                  ? "bg-rose-50 border-rose-400 text-rose-600 animate-pulse"
                  : "bg-gray-50 border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-100"
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
              className="flex-1 px-3.5 py-2.5 bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl text-xs sm:text-sm text-gray-900 placeholder-gray-400 outline-none transition-all disabled:opacity-50"
            />

            {/* Send button */}
            <button
              type="submit"
              disabled={chat.isTyping || !inputValue.trim()}
              className={`p-2.5 rounded-xl flex items-center justify-center transition-all ${
                chat.isTyping || !inputValue.trim()
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 active:scale-95"
              }`}
              title="Send message"
            >
              <Send size={16} />
            </button>
          </form>

          {/* Subtext info */}
          <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-gray-400">
            <span>ZII BOT CRM Assistant</span>
            <span className="flex items-center gap-1 text-gray-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Live CRM Context Scoped
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
