"use client";

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ZiiBotAvatar, ZII_GREETING } from "./ZiiBotAvatar";
import type { ChatMessage } from "./useZiiBotChat";
import { ContextualSuggestions } from "./ContextualSuggestions";
import { Send, Mic, Minimize2, Maximize2, X, Volume2, VolumeX } from "lucide-react";
import { getVoiceService } from "./voiceService";

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
  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`flex items-end gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {!isUser && (
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-blue-500/30">
          Z
        </div>
      )}
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[85%]`}>
        <div
          className={`px-4 py-3 rounded-2xl text-[14px] leading-relaxed ${
            isUser
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-sm shadow-lg shadow-blue-500/30'
              : 'bg-white text-gray-800 border border-gray-200 rounded-tl-sm shadow-md shadow-gray-200/50'
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
        <span className="text-[10px] mt-1 text-gray-400 px-1">
          {time}
        </span>
      </div>
      {isUser && (
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-purple-500/30">
          Y
        </div>
      )}
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
          {/* ── Header: White with Blue Gradient ── */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
            <div className="flex items-center gap-3">
              <div className="relative">
                <ZiiBotAvatar isIdle={!isTyping} isTyping={isTyping} size="button" />
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white bg-green-500" />
              </div>
              <div>
                <h3 className="font-semibold text-[15px] text-gray-900">
                  ZII BOT
                </h3>
                <p className="text-xs text-gray-500">
                  {isTyping ? (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      <span className="ml-1">Typing...</span>
                    </span>
                  ) : (
                    "Online • Ready to help"
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={onToggleSound}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-all"
                aria-label={soundOn ? "Mute sound" : "Unmute sound"}
              >
                {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>
              <button
                onClick={onToggleFullscreen}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-all"
                aria-label="Toggle fullscreen"
              >
                {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-500 transition-all"
                aria-label="Close chat"
              >
                <X size={18} />
              </button>
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
                className="flex flex-col items-center justify-center h-full text-center gap-4 py-8"
              >
                <div className="w-20 h-20">
                  <ZiiBotAvatar isIdle={false} isTyping={false} size="panel" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900">
                    Hi, I'm ZII BOT 👋
                  </h4>
                  <div className="text-sm mt-2 text-gray-500 max-w-xs">
                    <div 
                      className="prose prose-sm max-w-none [&_strong]:font-bold [&_strong]:text-blue-600"
                      dangerouslySetInnerHTML={{ 
                        __html: ZII_GREETING.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>')
                      }} 
                    />
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
            <div className="px-4 pt-2 bg-white border-t border-gray-100">
              <ContextualSuggestions onSelect={onSend} />
            </div>
          )}

          {/* ── Input Area: White with Blue Accent ── */}
          <form
            onSubmit={handleSubmit}
            className="flex items-end gap-2 px-4 py-3 border-t border-gray-100 bg-white"
          >
            <button
              type="button"
              className={`p-2.5 rounded-xl transition-all flex-shrink-0 hover:bg-gray-100 text-gray-500 hover:text-gray-700 ${isRecording ? 'ring-2 ring-red-500' : ''}`}
              onClick={startRecording}
              title={isRecording ? "Stop recording" : "Start voice input"}
            >
              <Mic size={20} className={isRecording ? "text-red-500 animate-pulse" : ""} />
            </button>
            
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isRecording ? recordingText || "🎤 Listening..." : "Ask ZII BOT anything..."}
                className="w-full px-4 py-2.5 text-sm rounded-xl outline-none transition-all bg-gray-100 text-gray-900 placeholder-gray-500 border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                disabled={isTyping}
              />
            </div>

            <button
              type="submit"
              disabled={isTyping || !inputValue.trim()}
              className={`p-2.5 rounded-xl transition-all flex-shrink-0 ${
                isTyping || !inputValue.trim()
                  ? "bg-gray-200 cursor-not-allowed text-gray-400"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40"
              }`}
              aria-label="Send message"
            >
              <Send size={20} />
            </button>
          </form>

          {/* ── Footer ── */}
          <div className="px-4 py-2.5 text-center text-[10px] text-gray-400 border-t border-gray-100 bg-white">
            Zyoris AI Assistant • Powered by ZII {voiceService.isSpeechSupported() ? '🎤' : ''}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
