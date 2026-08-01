"use client";

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ZiiBotAvatar, ZII_GREETING } from "./ZiiBotAvatar";
import type { ChatMessage } from "./useZiiBotChat";
import { ContextualSuggestions } from "./ContextualSuggestions";
import { Send, Bot, Paperclip, Smile, Minimize2, Maximize2, X, Volume2, VolumeX, ThumbsUp, ThumbsDown, MoreVertical, ChevronDown } from "lucide-react";
import { getVoiceService } from "./voiceService";
import { toast } from "react-toastify";

interface ZiiBotPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  messages: ChatMessage[];
  isTyping: boolean;
  onSend: (text: string) => void;
  soundOn: boolean;
  onToggleSound: () => void;
  showGreeting: boolean;
  darkMode: boolean;
  userName?: string;
}

// ─── Helper: Format message with HTML ─────────────────────────

function formatMessageContent(content: string): string {
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-blue-700">$1</strong>')
    .replace(/\n/g, '<br/>')
    .replace(/• /g, '<span class="text-blue-500 font-bold mr-1">•</span> ')
    .replace(/\d\. /g, (match) => `<span class="font-bold text-blue-600">${match}</span>`);
}

// ─── Message bubble ─────────────────────────────────────────────

function MessageBubble({ message, isUser }: { message: ChatMessage; isUser: boolean; darkMode: boolean }) {
  const [rating, setRating] = useState<'up' | 'down' | null>(null);

  const handleRating = (type: 'up' | 'down') => {
    if (rating) return; // Prevent multiple ratings
    setRating(type);
    if (type === 'up') {
      toast.success("Thanks for your feedback!");
    } else {
      toast.info("Thanks, we'll try to improve.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`flex items-end gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[85%]`}>
        <div
          className={`px-[18px] py-[12px] text-[14px] leading-relaxed shadow-sm ${
            isUser
              ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-3xl rounded-br-sm'
              : 'bg-[#F2F2F2] text-gray-800 rounded-3xl rounded-bl-sm'
          }`}
        >
          <div 
            className="prose prose-sm max-w-none 
              [&_strong]:font-bold [&_strong]:text-blue-700
              [&_ul]:list-none [&_ul]:p-0 [&_ul]:m-0
              [&_li]:flex [&_li]:items-start [&_li]:gap-1.5 [&_li]:my-1
              [&_.bullet]:text-blue-500 [&_.bullet]:font-bold
              [&_br]:block [&_br]:my-0.5
              [&_p]:m-0
              [&_p]:text-gray-800"
            dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }} 
          />
        </div>
        {!isUser && (
          <div className="flex items-center gap-2 mt-2 ml-2">
            {rating ? (
              <span className="text-[11px] text-gray-400 font-medium italic">Feedback recorded</span>
            ) : (
              <>
                <span className="text-[11px] text-gray-500 font-medium">Was this helpful?</span>
                <button onClick={() => handleRating('up')} className="p-1 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"><ThumbsUp size={14} /></button>
                <button onClick={() => handleRating('down')} className="p-1 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"><ThumbsDown size={14} /></button>
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function ZiiBotPanel({
  isOpen,
  onClose,
  isFullscreen,
  onToggleFullscreen,
  messages,
  isTyping,
  onSend,
  soundOn,
  onToggleSound,
  showGreeting,
  darkMode,
  userName,
}: ZiiBotPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingText, setRecordingText] = useState("");
  const voiceService = getVoiceService();

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (text) {
      onSend(text);
      setInputValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const startRecording = () => {
    if (isRecording) {
      stopRecording();
      return;
    }
    
    setIsRecording(true);
    setRecordingText("🎤 Listening...");
    
    const success = voiceService.startListening(
      (text) => {
        setRecordingText(text);
        setInputValue(text);
        if (text && !text.endsWith('...')) {
          setTimeout(() => {
            if (inputRef.current?.value) {
              handleSubmit(new Event('submit') as any);
            }
          }, 500);
        }
      },
      (error) => {
        console.error('Voice error:', error);
        setIsRecording(false);
        setRecordingText("");
        if (error === 'not-allowed') {
          alert('Please allow microphone access to use voice input.');
        }
      }
    );
    
    if (!success) {
      setIsRecording(false);
      setRecordingText("");
      alert('Voice input is not supported in this browser.');
    }
  };

  const stopRecording = () => {
    voiceService.stopListening();
    setIsRecording(false);
    setRecordingText("");
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={`fixed bottom-24 right-6 z-50 w-[440px] max-w-[calc(100vw-2rem)] h-[640px] max-h-[calc(100vh-8rem)] rounded-2xl shadow-2xl flex flex-col overflow-hidden bg-white ${isFullscreen ? "fullscreen-mode" : ""}`}
        >
          {/* ── Header: Solid Blue Gradient with Wavy Border ── */}
          <div className="relative bg-gradient-to-br from-blue-600 to-cyan-500 pt-5 pb-8 px-5">
            <div className="flex items-center justify-between text-white relative z-10">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ZiiBotAvatar isIdle={!isTyping} isTyping={isTyping} size="button" />
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white bg-green-500" />
                </div>
                <div>
                  <p className="text-xs text-blue-100 opacity-90 font-medium mb-0.5">Chat with</p>
                  <h3 className="font-bold text-[17px] leading-tight flex items-center gap-1.5">
                    ZII BOT
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onToggleSound}
                  className="p-1.5 rounded-full hover:bg-white/20 transition-all text-white"
                  aria-label={soundOn ? "Mute sound" : "Unmute sound"}
                >
                  {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </button>
                <button className="p-1.5 rounded-full hover:bg-white/20 transition-all text-white">
                  <MoreVertical size={18} />
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full hover:bg-white/20 transition-all text-white"
                  aria-label="Close chat"
                >
                  <ChevronDown size={22} />
                </button>
              </div>
            </div>
            
            <div className="mt-4 relative z-10">
              <p className="text-[13px] text-white/90">We typically reply in few minutes.</p>
            </div>

            {/* Wavy bottom SVG */}
            <div className="absolute -bottom-[1px] left-0 right-0 w-full overflow-hidden leading-none z-0">
              <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-full h-[25px]">
                <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C89.71,117.43,205.85,78.29,321.39,56.44Z" fill="#ffffff"></path>
              </svg>
            </div>
          </div>

          {/* ── Messages: Light Gray Background ── */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-gray-50/80"
          >
            {/* Greeting */}
            {showGreeting && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col h-full items-start pt-8 pb-4 px-2"
              >
                <div className="flex items-end gap-3 w-full">
                  <div className={`px-[18px] py-[12px] text-[14px] leading-relaxed shadow-sm bg-[#F2F2F2] text-gray-800 rounded-3xl rounded-bl-sm`}>
                    <div className="font-medium">
                      Hey{userName ? ` ${userName.split(' ')[0]}` : ''} 👋 I'm ZII BOT. How can I help you today?
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Messages */}
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} isUser={msg.role === "user"} darkMode={false} />
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-blue-500/30">
                  Z
                </div>
                <div className="px-4 py-3 rounded-2xl bg-white shadow-sm border border-gray-100">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* ── Contextual Suggestions ── */}
          {showGreeting && (
            <div className="px-4 pb-2 bg-white">
              <ContextualSuggestions onSelect={onSend} />
            </div>
          )}

          {/* ── Input Area: Minimal with Blue Send Button ── */}
          <form
            onSubmit={handleSubmit}
            className="flex flex-col px-4 pt-2 pb-3 bg-white"
          >
            <div className="flex items-center border-t border-gray-100 pt-3">
              <button 
                type="button" 
                onClick={() => toast.info("Bot triggers coming soon!")}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Bot size={18} />
              </button>
              <button 
                type="button" 
                onClick={() => toast.info("File attachments coming soon!")}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Paperclip size={18} />
              </button>
              <button 
                type="button" 
                onClick={() => toast.info("Emoji picker coming soon!")}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Smile size={18} />
              </button>
              
              <div className="flex-1 px-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter your message..."
                  className="w-full text-[14px] bg-transparent outline-none text-gray-800 placeholder-gray-400"
                  disabled={isTyping}
                />
              </div>

              <button
                type="submit"
                disabled={isTyping || !inputValue.trim()}
                className={`w-[42px] h-[42px] rounded-full flex items-center justify-center transition-all flex-shrink-0 ml-2 ${
                  isTyping || !inputValue.trim()
                    ? "bg-gray-200 cursor-not-allowed text-gray-400"
                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20"
                }`}
                aria-label="Send message"
              >
                <Send size={18} className="ml-0.5" />
              </button>
            </div>
            
            {/* ── Footer ── */}
            <div className="flex justify-center items-center gap-1 mt-3">
              <span className="text-[9px] font-semibold text-gray-400 tracking-wide uppercase">Powered by</span>
              <span className="text-[11px] font-bold text-blue-500 tracking-tight">ZYORIS</span>
            </div>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
