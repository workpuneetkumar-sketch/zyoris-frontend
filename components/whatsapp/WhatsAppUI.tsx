"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Send, User, AlertTriangle, MessageCircle, Plus, AlertCircle, ChevronLeft } from "lucide-react";
import { WhatsAppConversation } from "@/lib/api/whatsappApi";

interface WhatsAppUIProps {
    conversations: WhatsAppConversation[];
    selectedConversation: WhatsAppConversation | null;
    selectedConversationId: string | null;
    setSelectedConversationId: (id: string | null) => void;
    loading: boolean;
    error: string | null;
    isDemoMode: boolean;
    sending: boolean;
    onSendMessage: (text: string) => Promise<boolean>;
}

function formatTime(isoStr: string) {
    try {
        const d = new Date(isoStr);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
        return "";
    }
}

export function WhatsAppUI({
    conversations,
    selectedConversation,
    selectedConversationId,
    setSelectedConversationId,
    loading,
    error,
    isDemoMode,
    sending,
    onSendMessage
}: WhatsAppUIProps) {
    const [messageInput, setMessageInput] = useState("");
    const [showMobileChat, setShowMobileChat] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [selectedConversation?.messages]);

    const handleSend = async () => {
        if (!messageInput.trim() || sending) return;
        const success = await onSendMessage(messageInput);
        if (success) setMessageInput("");
    };

    return (
        <div className="h-[calc(100vh-120px)] flex flex-col gap-4 p-0 md:p-0">
            <div className="flex items-center justify-between px-4 md:px-0 pt-4 md:pt-0">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">WhatsApp</h1>
                    <p className="text-[15px] text-gray-500 mt-1.5 font-medium">Manage customer conversations in real-time</p>
                </div>
            </div>

            {isDemoMode && (
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-orange-50 border border-orange-200 text-[13px] text-orange-700 font-medium">
                    <AlertTriangle size={16} className="shrink-0" />
                    Demo Mode: The Meta API is currently unreachable. Displaying mock conversations.
                </div>
            )}

            <div className="flex-1 bg-white md:rounded-2xl md:border border-gray-100 shadow-sm overflow-hidden flex">
                {/* Left Panel - Conversation List */}
                <div className={`w-full md:w-[340px] border-r border-gray-100 flex-col bg-white shrink-0 ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-5 border-b border-gray-100 bg-gray-50/30">
                        <h2 className="text-[15px] font-bold tracking-tight text-gray-800">Conversations</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {error ? (
                            <div className="flex flex-col items-center justify-center h-full p-6 text-center gap-2">
                                <AlertCircle size={24} className="text-red-400" />
                                <p className="text-sm text-red-500">{error}</p>
                            </div>
                        ) : loading ? (
                            <div className="flex justify-center items-center h-full p-4">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            </div>
                        ) : conversations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full p-6 text-center text-gray-400">
                                <MessageCircle size={32} className="mb-3 text-gray-300" />
                                <p className="text-sm font-medium">No conversations found.</p>
                                <p className="text-xs mt-1">When you receive messages, they will appear here.</p>
                            </div>
                        ) : (
                            conversations.map(conv => {
                                const lastMsg = conv.messages[conv.messages.length - 1];
                                const isSelected = conv.id === selectedConversationId;
                                return (
                                    <button
                                        key={conv.id}
                                        onClick={() => { setSelectedConversationId(conv.id); setShowMobileChat(true); }}
                                        className={`w-full text-left p-4 border-b border-gray-50 hover:bg-gray-50/80 transition-all duration-200 ${isSelected ? 'bg-gradient-to-r from-blue-50/80 to-indigo-50/30 border-l-4 border-l-blue-600' : 'border-l-4 border-l-transparent'}`}
                                    >
                                        <div className="flex justify-between items-start mb-1.5">
                                            <span className={`font-semibold text-[14px] ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>{conv.contactName}</span>
                                            {lastMsg && (
                                                <span className={`text-[11px] font-medium shrink-0 ml-2 ${isSelected ? 'text-blue-500' : 'text-gray-400'}`}>
                                                    {formatTime(lastMsg.timestamp)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex justify-between items-center gap-2">
                                            <p className="text-xs text-gray-500 truncate flex-1">
                                                {lastMsg ? lastMsg.text : "No messages"}
                                            </p>
                                            {conv.unreadCount > 0 && (
                                                <span className="shrink-0 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                                                    {conv.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right Panel - Chat Window */}
                <div className={`flex-1 flex flex-col bg-gray-50/30 min-w-0 ${!showMobileChat ? 'hidden md:flex' : 'flex'}`}>
                    {selectedConversation ? (
                        <>
                            {/* Chat Header */}
                            <div className="px-4 md:px-6 py-4 border-b border-gray-100 bg-white flex items-center justify-between gap-3 shrink-0">
                                <div className="flex items-center gap-2 md:gap-3">
                                    <button onClick={() => setShowMobileChat(false)} className="md:hidden p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
                                        <ChevronLeft size={20} />
                                    </button>
                                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 shrink-0 shadow-sm border border-blue-200/50">
                                        <User size={22} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2.5">
                                            <h3 className="font-bold text-gray-900 text-[15px] tracking-tight">{selectedConversation.contactName}</h3>
                                            {selectedConversation.leadStatus && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-200">
                                                    {selectedConversation.leadStatus}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400">
                                            {selectedConversation.contactPhone}
                                            {selectedConversation.leadName && ` • Lead: ${selectedConversation.leadName}`}
                                        </p>
                                    </div>
                                </div>
                                {!selectedConversation.leadId && (
                                    <button 
                                        onClick={() => router.push(`/leads/new?phone=${encodeURIComponent(selectedConversation.contactPhone)}&name=${encodeURIComponent(selectedConversation.contactName)}`)}
                                        className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-200 bg-white text-[12px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        <Plus size={14} />
                                        Create Lead
                                    </button>
                                )}
                            </div>

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {selectedConversation.messages.map((msg) => {
                                    const isUser = msg.sender === 'user';
                                    return (
                                        <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 shadow-md ${
                                                isUser ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-br-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm'
                                            } break-words transition-all duration-200`}>
                                                <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                                <p className={`text-[11px] mt-1.5 text-right font-medium ${isUser ? 'text-blue-100/80' : 'text-gray-400'}`}>
                                                    {formatTime(msg.timestamp)}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <div className="p-4 pr-20 md:pr-4 bg-white border-t border-gray-100">
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        placeholder="Type a message..."
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                        className="flex-1 rounded-2xl border border-gray-200 px-5 py-3 text-[15px] outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-gray-50/50 focus:bg-white shadow-sm"
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={!messageInput.trim() || sending}
                                        className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white w-12 h-12 rounded-2xl flex items-center justify-center hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 transition-all duration-200 shrink-0 shadow-md shadow-blue-200"
                                    >
                                        <Send size={18} className="ml-1" />
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                            <MessageCircle size={48} className="mb-4 opacity-20" />
                            <p className="text-sm font-medium">Select a conversation to start messaging</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
