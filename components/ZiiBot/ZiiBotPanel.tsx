"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { ZiiBotSidebar } from "./ZiiBotSidebar";
import { MarkdownContent } from "./MarkdownContent";
import type { ChatMessage, useZiiBotChat } from "./useZiiBotChat";
import { ContextualSuggestions } from "./ContextualSuggestions";
import {
  ArrowUp,
  X,
  Volume2,
  VolumeX,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  RotateCcw,
  AlertCircle,
  Mic,
  MicOff,
  Paperclip,
  Scan,
  Sun,
  Moon,
  MessageSquare,
  Plus,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { getVoiceService } from "./voiceService";
import { toast } from "react-toastify";
import { ActionProposalCard } from "@/components/ai/ActionProposalCard";

interface ZiiBotPanelProps {
  isOpen: boolean;
  onClose: () => void;
  dockMode: "side" | "bottom";
  onToggleDock: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  chat: ReturnType<typeof useZiiBotChat>;
}

function DockToBottomIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <line x1="3" x2="21" y1="15" y2="15" />
    </svg>
  );
}

function DockToSideIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <line x1="15" x2="15" y1="3" y2="21" />
    </svg>
  );
}

function getRouteScope(pathname: string | null): string {
  if (!pathname || pathname === "/" || pathname === "/dashboard") return "Dashboard";
  const segment = pathname.split("/").filter(Boolean)[0] || "";
  const map: Record<string, string> = {
    domains: "Domains",
    leads: "Leads",
    deals: "Deals",
    customers: "Customers",
    contacts: "Contacts",
    companies: "Companies",
    workspace: "Workspace",
    documents: "Documents",
    analytics: "Analytics",
    reports: "Reports",
    finance: "Finance",
    tasks: "Tasks",
    calendar: "Calendar",
    automation: "Automation",
    workflows: "Workflows",
    agents: "Agents",
    tools: "Tools",
    settings: "Settings",
    whatsapp: "WhatsApp",
    email: "Email",
    messages: "Messages",
    support: "Support",
    integrations: "Integrations",
    connect: "Connect",
    ceo: "Executive",
    cfo: "Financial",
    team: "Team",
    hr: "HR",
    knowledge: "Knowledge",
    "knowledge-base": "Knowledge",
  };
  if (map[segment.toLowerCase()]) return map[segment.toLowerCase()];
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

// ─── Minimal Resend Message Bubble ──────────────────────────────

function MessageBubble({
  message,
  onRetry,
  isDark,
}: {
  message: ChatMessage;
  onRetry?: (text?: string) => void;
  isDark: boolean;
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
      toast.info("Thanks! We'll refine system responses.");
    }
  };

  if (message.isError) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="my-2 max-w-[95%]"
      >
        <div
          className={`p-3 rounded-xl border text-xs ${
            isDark
              ? "bg-rose-950/30 border-rose-900/60 text-rose-300"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-1.5 font-semibold text-rose-500 mb-1">
            <AlertCircle size={14} className="flex-shrink-0" />
            <span>System Notice</span>
          </div>
          <p className="leading-relaxed mb-2 opacity-90">{message.content}</p>
          {onRetry && message.failedText && (
            <button
              onClick={() => onRetry(message.failedText)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs transition-colors"
            >
              <RotateCcw size={11} />
              <span>Retry question</span>
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={`my-2 flex flex-col ${isUser ? "items-end" : "items-start"}`}
    >
      {isUser ? (
        <div
          className={`px-3.5 py-2 rounded-2xl max-w-[85%] text-xs sm:text-sm leading-relaxed ${
            isDark
              ? "bg-zinc-800 text-zinc-100 border border-zinc-700/60"
              : "bg-zinc-900 text-white"
          }`}
        >
          <p className="whitespace-pre-wrap select-text">{message.content}</p>
        </div>
      ) : (
        <div className="w-full text-xs sm:text-sm leading-relaxed px-1">
          <MarkdownContent content={message.content} isDark={isDark} />

          {/* Minimal actions bar */}
          <div
            className={`flex items-center gap-2 mt-1.5 text-[11px] ${
              isDark ? "text-zinc-500" : "text-zinc-400"
            }`}
          >
            <button
              onClick={handleCopy}
              className={`p-1 rounded transition-colors ${
                isDark ? "hover:text-zinc-200 hover:bg-zinc-800" : "hover:text-zinc-900 hover:bg-zinc-100"
              }`}
              title="Copy message"
            >
              {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
            </button>

            {rating ? (
              <span className="text-[10px] italic">Feedback noted</span>
            ) : (
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => handleRating("up")}
                  className={`p-1 rounded transition-colors ${
                    isDark ? "hover:text-emerald-400 hover:bg-zinc-800" : "hover:text-emerald-600 hover:bg-zinc-100"
                  }`}
                  title="Helpful"
                >
                  <ThumbsUp size={12} />
                </button>
                <button
                  onClick={() => handleRating("down")}
                  className={`p-1 rounded transition-colors ${
                    isDark ? "hover:text-rose-400 hover:bg-zinc-800" : "hover:text-rose-600 hover:bg-zinc-100"
                  }`}
                  title="Not helpful"
                >
                  <ThumbsDown size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Main Panel Component ────────────────────────────────────────

export function ZiiBotPanel({
  isOpen,
  onClose,
  dockMode,
  onToggleDock,
  isDark,
  onToggleTheme,
  chat,
}: ZiiBotPanelProps) {
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [inputValue, setInputValue] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null);

  const voiceService = getVoiceService();
  const currentScope = useMemo(() => getRouteScope(pathname), [pathname]);

  // Reset fullscreen when dockMode changes
  useEffect(() => {
    setIsFullscreen(false);
  }, [dockMode]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 120);
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

  /**
   * Requirement: When conversations part gets opened, automatically enter full screen
   */
  const handleToggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      if (next) {
        setIsFullscreen(true);
      } else {
        if (dockMode === "side") {
          setIsFullscreen(false);
        }
      }
      return next;
    });
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
    if (dockMode === "side") {
      setIsFullscreen(false);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const rawText = inputValue.trim();
    if (!rawText && !attachedFileName) return;
    if (chat.isTyping) return;

    let fullText = rawText;
    if (attachedFileName) {
      fullText = `[Context Attachment: ${attachedFileName}]\n${rawText}`;
      setAttachedFileName(null);
    }

    chat.sendMessage(fullText);
    setInputValue("");
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFileName(file.name);
      toast.info(`Attached context: ${file.name}`);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={
        isFullscreen
          ? { opacity: 0, scale: 0.98 }
          : dockMode === "side"
          ? { opacity: 0, x: 40 }
          : { opacity: 0, y: 40 }
      }
      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      exit={
        isFullscreen
          ? { opacity: 0, scale: 0.98 }
          : dockMode === "side"
          ? { opacity: 0, x: 40 }
          : { opacity: 0, y: 40 }
      }
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={`fixed z-50 flex overflow-hidden shadow-2xl transition-all duration-200 ${
        isDark ? "bg-[#09090b] text-zinc-100" : "bg-white text-zinc-900"
      } ${
        isFullscreen
          ? "inset-0 w-screen h-screen max-w-none max-h-none border-none rounded-none"
          : dockMode === "side"
          ? "top-0 right-0 bottom-8 w-[480px] max-w-full border-l " +
            (isDark ? "border-zinc-800" : "border-zinc-200")
          : "bottom-8 left-0 right-0 h-[400px] max-h-[75vh] w-full border-t " +
            (isDark ? "border-zinc-800" : "border-zinc-200")
      }`}
    >
      {/* ── Left Sidebar (History & Conversations Drawer) ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className={`flex-shrink-0 h-full overflow-hidden z-20 border-r ${
              isDark ? "border-zinc-800/80" : "border-zinc-200/80"
            }`}
          >
            <ZiiBotSidebar
              sessions={chat.sessions}
              activeSessionId={chat.activeSessionId}
              onSelectSession={(id) => {
                chat.selectSession(id);
                // When in full screen, user can keep reading or close
              }}
              onNewChat={() => chat.createNewSession()}
              onRenameSession={chat.renameSession}
              onDeleteSession={chat.deleteSession}
              isLoading={chat.isLoadingSessions}
              onCloseMobile={handleCloseSidebar}
              className="w-full h-full"
              isDark={isDark}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Chat Area ── */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {/* Top Header */}
        <div
          className={`flex items-center justify-between px-4 py-2.5 border-b flex-shrink-0 gap-3 ${
            isDark ? "border-zinc-800/80 bg-[#09090b]" : "border-zinc-200/80 bg-white"
          }`}
        >
          {/* Header Left: Title + Conversations button + Compact New button */}
          <div className="flex items-center gap-2 min-w-0 overflow-hidden">
            <h2 className="text-sm font-semibold tracking-tight whitespace-nowrap">Ask anything</h2>

            {/* View All Conversations toggle (auto fullscreens) */}
            <button
              type="button"
              onClick={handleToggleSidebar}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all whitespace-nowrap ${
                sidebarOpen
                  ? isDark
                    ? "bg-zinc-800 text-white border-zinc-700 shadow-xs"
                    : "bg-zinc-100 text-zinc-950 border-zinc-300 shadow-xs"
                  : isDark
                  ? "bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-zinc-800"
                  : "bg-zinc-100/80 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 border-zinc-200"
              }`}
              title={sidebarOpen ? "Hide conversations" : "View all conversations (opens fullscreen)"}
            >
              <MessageSquare size={13} />
              <span className="truncate">Conversations</span>
              {chat.sessions.length > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-mono leading-none ${
                    isDark ? "bg-zinc-800 text-zinc-300" : "bg-zinc-200 text-zinc-700"
                  }`}
                >
                  {chat.sessions.length}
                </span>
              )}
            </button>

            {/* Compact New Chat icon button */}
            <button
              type="button"
              onClick={() => {
                chat.createNewSession();
                toast.success("Started new chat");
              }}
              className={`p-1.5 rounded-lg border transition-all active:scale-95 flex-shrink-0 ${
                isDark
                  ? "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border-zinc-800"
                  : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-950 border-zinc-200"
              }`}
              title="Start a new chat session"
            >
              <Plus size={13} />
            </button>
          </div>

          {/* Action Icons Right (fixed size, never collapses into left buttons) */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Theme Toggle (Changes ONLY Chatbot Theme) */}
            <button
              onClick={onToggleTheme}
              className={`p-1.5 rounded-md transition-colors ${
                isDark
                  ? "text-zinc-400 hover:text-white hover:bg-zinc-800"
                  : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
              }`}
              title={isDark ? "Switch chatbot to light mode" : "Switch chatbot to dark mode"}
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* Audio Toggle */}
            <button
              onClick={chat.toggleSound}
              className={`p-1.5 rounded-md transition-colors ${
                isDark
                  ? "text-zinc-400 hover:text-white hover:bg-zinc-800"
                  : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
              }`}
              title={chat.soundOn ? "Mute audio" : "Enable audio"}
            >
              {chat.soundOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>

            {/* Enlarge / Fullscreen Button */}
            {dockMode === "side" && (
              <button
                onClick={() => setIsFullscreen((prev) => !prev)}
                className={`p-1.5 rounded-md transition-colors ${
                  isFullscreen
                    ? isDark
                      ? "text-white bg-zinc-800"
                      : "text-zinc-950 bg-zinc-100"
                    : isDark
                    ? "text-zinc-400 hover:text-white hover:bg-zinc-800"
                    : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                }`}
                title={isFullscreen ? "Restore side view" : "Enlarge to full screen"}
              >
                {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
            )}

            {/* Dock Toggle with Tooltip */}
            <button
              onClick={() => {
                setIsFullscreen(false);
                onToggleDock();
              }}
              className={`p-1.5 rounded-md transition-colors ${
                isDark
                  ? "text-zinc-400 hover:text-white hover:bg-zinc-800"
                  : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
              }`}
              title={dockMode === "side" ? "Dock to bottom" : "Dock to side"}
            >
              {dockMode === "side" ? <DockToBottomIcon /> : <DockToSideIcon />}
            </button>

            {/* Close */}
            <button
              onClick={() => {
                setIsFullscreen(false);
                setSidebarOpen(false);
                onClose();
              }}
              className={`p-1.5 rounded-md transition-colors ${
                isDark
                  ? "text-zinc-400 hover:text-white hover:bg-zinc-800"
                  : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
              }`}
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Conversation Message List ── */}
        <div
          ref={scrollRef}
          className={`flex-1 overflow-y-auto px-4 py-3 space-y-3 zii-chat-scroll ${
            isDark ? "bg-[#09090b]" : "bg-white"
          } ${dockMode === "bottom" || isFullscreen ? "max-w-4xl mx-auto w-full" : ""}`}
        >
          {/* Welcome / Suggestions State */}
          {chat.showGreeting && (
            <div className="flex flex-col justify-end h-full py-2">
              <ContextualSuggestions
                pathname={pathname}
                onSelect={(prompt) => chat.sendMessage(prompt)}
                isDark={isDark}
              />
            </div>
          )}

          {/* Render Messages */}
          {chat.messages.map((msg) =>
            msg.type === "proposal" && msg.proposalData ? (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
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
                isDark={isDark}
              />
            )
          )}

          {/* Typing Indicator */}
          {chat.isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 py-1 text-xs"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
              <span className={isDark ? "text-zinc-400" : "text-zinc-500"}>
                Analyzing system intelligence
              </span>
              <div className="flex gap-1 items-center">
                <span
                  className={`w-1 h-1 rounded-full animate-bounce ${isDark ? "bg-zinc-400" : "bg-zinc-500"}`}
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className={`w-1 h-1 rounded-full animate-bounce ${isDark ? "bg-zinc-400" : "bg-zinc-500"}`}
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className={`w-1 h-1 rounded-full animate-bounce ${isDark ? "bg-zinc-400" : "bg-zinc-500"}`}
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </motion.div>
          )}
        </div>

        {/* ── Input Box (Resend Style) ── */}
        <div
          className={`p-3 pt-2 flex-shrink-0 ${
            dockMode === "bottom" || isFullscreen ? "max-w-4xl mx-auto w-full" : ""
          }`}
        >
          {attachedFileName && (
            <div
              className={`flex items-center justify-between px-3 py-1 mb-2 rounded-lg text-xs border ${
                isDark
                  ? "bg-zinc-900 border-zinc-800 text-zinc-300"
                  : "bg-zinc-100 border-zinc-200 text-zinc-700"
              }`}
            >
              <span className="truncate flex items-center gap-1.5">
                <Paperclip size={12} className="opacity-70" />
                <span>{attachedFileName}</span>
              </span>
              <button
                onClick={() => setAttachedFileName(null)}
                className="hover:opacity-75 p-0.5"
                title="Remove attachment"
              >
                <X size={12} />
              </button>
            </div>
          )}

          <div
            className={`rounded-2xl border transition-all duration-150 p-2.5 ${
              isDark
                ? "bg-[#121214] border-zinc-800/90 focus-within:border-zinc-700 shadow-lg"
                : "bg-white border-zinc-200/90 focus-within:border-zinc-400 shadow-sm"
            }`}
          >
            {/* Top row: > prompt symbol + text input */}
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <span
                className={`font-mono text-sm font-medium select-none pl-1 ${
                  isDark ? "text-zinc-500" : "text-zinc-400"
                }`}
              >
                &gt;
              </span>

              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isRecording ? "Listening to voice..." : "What can I do for you today?"
                }
                disabled={chat.isTyping}
                className={`flex-1 bg-transparent text-xs sm:text-sm outline-none ${
                  isDark
                    ? "text-zinc-100 placeholder-zinc-500"
                    : "text-zinc-900 placeholder-zinc-400"
                }`}
              />
            </form>

            {/* Bottom row: Green dot, Scope badge, Attachments, Send */}
            <div className="flex items-center justify-between mt-2.5 pt-1">
              {/* Left: Green status dot + Scope pill */}
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] flex-shrink-0" />

                <div
                  className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border truncate select-none ${
                    isDark
                      ? "bg-zinc-800/80 border-zinc-700/60 text-zinc-300"
                      : "bg-zinc-100 border-zinc-200 text-zinc-700"
                  }`}
                  title={`Context scoped to ${currentScope}`}
                >
                  <Scan size={11} className={isDark ? "text-zinc-400" : "text-zinc-500"} />
                  <span className="truncate">{currentScope}</span>
                </div>
              </div>

              {/* Right: Hidden file input, Paperclip, Mic, Send */}
              <div className="flex items-center gap-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {/* Paperclip */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-1.5 rounded-md transition-colors ${
                    isDark
                      ? "text-zinc-400 hover:text-white hover:bg-zinc-800"
                      : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                  }`}
                  title="Attach file or context"
                >
                  <Paperclip size={14} />
                </button>

                {/* Mic */}
                <button
                  type="button"
                  onClick={handleToggleVoice}
                  className={`p-1.5 rounded-md transition-colors ${
                    isRecording
                      ? "text-rose-500 bg-rose-500/10 animate-pulse"
                      : isDark
                      ? "text-zinc-400 hover:text-white hover:bg-zinc-800"
                      : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                  }`}
                  title={isRecording ? "Stop listening" : "Voice input"}
                >
                  {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
                </button>

                {/* Send button (Up Arrow) */}
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={chat.isTyping || (!inputValue.trim() && !attachedFileName)}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                    !chat.isTyping && (inputValue.trim() || attachedFileName)
                      ? isDark
                        ? "bg-white text-zinc-950 hover:bg-zinc-200 shadow-sm active:scale-95 cursor-pointer"
                        : "bg-zinc-900 text-white hover:bg-black shadow-sm active:scale-95 cursor-pointer"
                      : isDark
                      ? "bg-zinc-800/60 text-zinc-600 cursor-not-allowed"
                      : "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                  }`}
                  title="Send"
                >
                  <ArrowUp size={14} strokeWidth={2.4} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
