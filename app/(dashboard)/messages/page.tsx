"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, UserCircle2, MessageCircle, AlertCircle, ChevronLeft } from "lucide-react";
import { getChatSessions, getSessionMessages, sendMessage, ChatSession, ChatMessage } from "@/lib/api/messagesApi";
import { io, Socket } from "socket.io-client";

export default function MessagesPage() {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState("");
    const [loading, setLoading] = useState(true);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showMobileChat, setShowMobileChat] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const socketRef = useRef<Socket | null>(null);
    const activeSessionRef = useRef<ChatSession | null>(null);

    useEffect(() => {
        // Load user from localStorage
        const raw = localStorage.getItem("zyoris-auth");
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (parsed?.user?.id) {
                    setCurrentUserId(parsed.user.id);
                }
            } catch (e) {
                console.error("Failed to parse user auth", e);
            }
        }
        loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        activeSessionRef.current = activeSession;
        if (activeSession) {
            loadMessages(activeSession.id);
            // Fetch cross-browser history from the local Next.js socket server memory
            if (socketRef.current && currentUserId) {
                socketRef.current.emit("fetchHistory", { user1: currentUserId, user2: activeSession.id });
            }
        }
    }, [activeSession, currentUserId]);

    useEffect(() => {
        // Scroll to bottom when messages change
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Socket.IO Integration (Local Node.js Frontend Server)
    useEffect(() => {
        if (!currentUserId) return;

        // Connect to the Next.js local API route running the Socket.IO server
        const socket = io({
            path: "/api/socket",
        });

        socketRef.current = socket;

        // Listen for history response from local socket memory
        socket.on("historyResponse", (data: any) => {
            const { user1, user2, history } = data;
            if (activeSessionRef.current && 
               ((user1 === currentUserId && user2 === activeSessionRef.current.id) || 
                (user2 === currentUserId && user1 === activeSessionRef.current.id))) {
                
                const formatted = history.map((msg: any) => ({
                    id: msg.id || `msg-${Date.now()}-${Math.random()}`,
                    sessionId: activeSessionRef.current!.id,
                    text: msg.content || msg.text || "",
                    senderId: msg.senderId,
                    timestamp: msg.createdAt || msg.timestamp || new Date().toISOString()
                }));
                
                setMessages(prev => {
                    const merged = [...prev];
                    formatted.forEach((msg: any) => {
                        if (!merged.some(p => p.id === msg.id || (p.senderId === msg.senderId && p.text === msg.text))) {
                            merged.push(msg);
                        }
                    });
                    return merged.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                });
            }
        });

        socket.on("newMessage", (msg: any) => {
            const conversationId = msg.senderId === currentUserId ? msg.receiverId : msg.senderId;

            const formattedMsg: ChatMessage = {
                id: msg.id || `msg-${Date.now()}-${Math.random()}`,
                sessionId: conversationId,
                text: msg.content || msg.text || "",
                senderId: msg.senderId,
                timestamp: msg.createdAt || msg.timestamp || new Date().toISOString()
            };

            // Persist to local storage cache for robust demo history
            try {
                const cacheKey = `chat_history_${[currentUserId, conversationId].sort().join('_')}`;
                const cached = localStorage.getItem(cacheKey);
                let localMessages: ChatMessage[] = [];
                if (cached) localMessages = JSON.parse(cached);
                
                // Avoid duplicating the optimistic message
                if (!localMessages.some(m => m.id === formattedMsg.id || (m.senderId === formattedMsg.senderId && m.text === formattedMsg.text))) {
                    localMessages.push(formattedMsg);
                    localStorage.setItem(cacheKey, JSON.stringify(localMessages));
                }
            } catch (e) {}

            if (activeSessionRef.current?.id === conversationId) {
                setMessages(prev => {
                    if (prev.some(p => p.id === formattedMsg.id)) return prev;

                    if (formattedMsg.senderId === currentUserId) {
                        const isDuplicateOptimistic = prev.some(
                            p => p.senderId === currentUserId && p.text === formattedMsg.text && p.id.startsWith("msg-")
                        );
                        if (isDuplicateOptimistic) {
                            return prev.map(p => 
                                (p.senderId === currentUserId && p.text === formattedMsg.text && p.id.startsWith("msg-")) 
                                    ? formattedMsg 
                                    : p
                            );
                        }
                    }
                    return [...prev, formattedMsg];
                });
            }

            setSessions(prev => {
                const sessionIndex = prev.findIndex(s => s.id === conversationId);
                if (sessionIndex > -1) {
                    const updatedSessions = [...prev];
                    updatedSessions[sessionIndex] = {
                        ...updatedSessions[sessionIndex],
                        lastMessage: formattedMsg.text,
                        updatedAt: formattedMsg.timestamp
                    };
                    const [movedSession] = updatedSessions.splice(sessionIndex, 1);
                    return [movedSession, ...updatedSessions];
                }
                return prev;
            });
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [currentUserId]);

    const loadSessions = async () => {
        try {
            setError(null);
            const data = await getChatSessions();
            setSessions(data);
            if (data.length > 0 && !activeSessionRef.current) {
                setActiveSession(data[0]);
            }
        } catch (error) {
            console.error("Failed to load chat sessions", error);
            setError("Failed to load chat sessions. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const loadMessages = async (sessionId: string) => {
        setMessagesLoading(true);
        try {
            const data = await getSessionMessages(sessionId);
            setMessages(data);
        } catch (error) {
            console.error("Failed to load messages", error);
        } finally {
            setMessagesLoading(false);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || !activeSession) return;

        const text = inputText;
        setInputText("");

        try {
            const newMsgs = await sendMessage(activeSession.id, text, currentUserId || undefined);
            setMessages(prev => [...prev, ...newMsgs]);
            
            // Emit to local Socket.IO server for real-time frontend syncing
            if (socketRef.current) {
                newMsgs.forEach(msg => {
                    // Send with receiverId to match socket logic
                    socketRef.current?.emit("sendMessage", { ...msg, receiverId: activeSession.id });
                });
            }

            setSessions(prev => prev.map(s => 
                s.id === activeSession.id 
                    ? { ...s, lastMessage: text, updatedAt: new Date().toISOString() } 
                    : s
            ));
        } catch (error) {
            console.error("Failed to send message", error);
        }
    };

    const formatTime = (isoString: string) => {
        if (!isoString) return "";
        return new Date(isoString).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    };

    return (
        <div className="flex h-[calc(100vh-theme(spacing.16))] p-0 md:p-4 lg:p-8 bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/30">
            <div className="w-full max-w-6xl mx-auto flex bg-white/70 backdrop-blur-xl md:rounded-[2rem] shadow-xl shadow-indigo-100/50 border border-white/80 overflow-hidden">
                
                {/* Left Panel - Team Members */}
                <div className={`w-full md:w-[340px] border-r border-indigo-50/60 flex-col bg-white/40 shrink-0 ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-6 border-b border-indigo-50/60 shrink-0">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                <MessageCircle size={18} />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Team Chat</h2>
                        </div>
                        <p className="text-sm font-medium text-gray-500 ml-11">Direct messages</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {error ? (
                            <div className="flex flex-col items-center justify-center h-full p-6 text-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
                                    <AlertCircle size={24} className="text-red-500" />
                                </div>
                                <p className="text-sm font-medium text-red-600">{error}</p>
                            </div>
                        ) : loading ? (
                            <div className="flex justify-center items-center h-full p-4">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                            </div>
                        ) : sessions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full p-6 text-center text-gray-400">
                                <div className="w-16 h-16 rounded-3xl bg-gray-50 flex items-center justify-center mb-4 border border-gray-100">
                                    <MessageCircle size={28} className="text-gray-300" />
                                </div>
                                <p className="text-sm font-bold text-gray-600">No chats available</p>
                                <p className="text-xs font-medium mt-1">Start a new conversation to see it here.</p>
                            </div>
                        ) : sessions.map(session => (
                            <div 
                                key={session.id}
                                onClick={() => { setActiveSession(session); setShowMobileChat(true); }}
                                className={`flex items-center gap-4 p-3.5 rounded-2xl cursor-pointer transition-all duration-200 border ${
                                    activeSession?.id === session.id 
                                        ? "bg-white border-indigo-100 shadow-sm shadow-indigo-100/50" 
                                        : "border-transparent hover:bg-white/60 hover:border-gray-100"
                                }`}
                            >
                                <div className="relative">
                                    {session.avatar ? (
                                        <img src={session.avatar} alt={session.name} className="w-12 h-12 rounded-2xl object-cover shadow-sm" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-100 to-blue-100 text-indigo-600 flex items-center justify-center shadow-sm">
                                            <span className="text-lg font-bold">{session.name.charAt(0).toUpperCase()}</span>
                                        </div>
                                    )}
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="text-sm font-bold text-gray-900 truncate pr-2">{session.name}</h3>
                                        <span className="text-[10px] font-bold text-gray-400 shrink-0 uppercase tracking-wider">{formatTime(session.updatedAt)}</span>
                                    </div>
                                    <p className={`text-xs truncate font-medium ${activeSession?.id === session.id ? "text-indigo-600" : "text-gray-500"}`}>
                                        {session.lastMessage || "No messages yet"}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Panel - Chat Area */}
                <div className={`flex-1 flex flex-col min-w-0 bg-white/60 backdrop-blur-sm ${!showMobileChat ? 'hidden md:flex' : 'flex'}`}>
                    {activeSession ? (
                        <>
                            {/* Chat Header */}
                            <div className="flex items-center p-4 md:p-6 border-b border-indigo-50/60 bg-white/40 shrink-0">
                                <button onClick={() => setShowMobileChat(false)} className="md:hidden p-2 mr-3 -ml-2 rounded-xl hover:bg-white hover:shadow-sm text-gray-500 transition-all">
                                    <ChevronLeft size={20} />
                                </button>
                                <div className="relative mr-4">
                                    {activeSession.avatar ? (
                                        <img src={activeSession.avatar} alt={activeSession.name} className="w-12 h-12 rounded-2xl object-cover shadow-sm" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-100 to-blue-100 text-indigo-600 flex items-center justify-center shadow-sm">
                                            <span className="text-lg font-bold">{activeSession.name.charAt(0).toUpperCase()}</span>
                                        </div>
                                    )}
                                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm"></div>
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-gray-900">{activeSession.name}</h3>
                                    <p className="text-xs font-medium text-emerald-600 flex items-center gap-1.5 mt-0.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Online
                                    </p>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
                                {messagesLoading ? (
                                    <div className="flex justify-center items-center h-full">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                    </div>
                                ) : (
                                    <>
                                        {messages.map((msg, idx) => {
                                            const isMe = currentUserId && msg.senderId === currentUserId;
                                            return (
                                                <div key={msg.id || idx} className={`flex flex-col ${isMe ? "items-end" : "items-start"} group`}>
                                                    <div className={`max-w-[85%] md:max-w-[70%] px-5 py-3.5 text-[15px] leading-relaxed shadow-sm transition-all hover:shadow-md ${
                                                        isMe 
                                                            ? "bg-gradient-to-br from-indigo-600 to-blue-600 text-white rounded-[1.5rem] rounded-tr-sm" 
                                                            : "bg-white border border-gray-100 text-gray-800 rounded-[1.5rem] rounded-tl-sm"
                                                    } break-words`}>
                                                        {msg.text}
                                                    </div>
                                                    <span className={`text-[10px] font-bold text-gray-400 mt-1.5 px-2 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest ${isMe ? "text-right" : "text-left"}`}>
                                                        {formatTime(msg.timestamp)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                        <div ref={messagesEndRef} />
                                    </>
                                )}
                            </div>

                            {/* Input Area */}
                            <div className="p-4 md:p-6 bg-white/40 border-t border-indigo-50/60 shrink-0">
                                <form onSubmit={handleSend} className="max-w-4xl mx-auto flex items-end gap-3">
                                    <div className="flex-1 bg-white rounded-3xl p-1.5 flex items-center shadow-sm border border-gray-100 focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-50 transition-all">
                                        <input 
                                            type="text" 
                                            value={inputText}
                                            onChange={(e) => setInputText(e.target.value)}
                                            placeholder="Type your message..." 
                                            className="flex-1 bg-transparent px-5 py-3 text-[15px] font-medium text-gray-900 placeholder-gray-400 outline-none"
                                        />
                                        <button 
                                            type="submit" 
                                            disabled={!inputText.trim()}
                                            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed shadow-md shadow-indigo-200/50 shrink-0 mr-1"
                                        >
                                            <Send size={18} className="ml-0.5" />
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                            <div className="w-24 h-24 rounded-[2rem] bg-indigo-50 flex items-center justify-center mb-6 shadow-inner border border-indigo-100/50">
                                <MessageCircle size={40} className="text-indigo-300" />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 tracking-tight mb-2">Your Messages</h3>
                            <p className="text-sm font-medium text-gray-500 max-w-xs text-center">Select a team member from the sidebar to start a conversation.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}