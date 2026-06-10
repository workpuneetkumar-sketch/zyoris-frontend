"use client";

import { useState, useRef, useEffect } from "react";
import { Send, User, AlertTriangle, MessageCircle } from "lucide-react";
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
    const messagesEndRef = useRef<HTMLDivElement>(null);

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
        <div className="h-[calc(100vh-120px)] flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight">WhatsApp</h1>
                    <p className="text-sm text-gray-400 mt-0.5">Manage customer conversations</p>
                </div>
            </div>

            {isDemoMode && (
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-orange-50 border border-orange-200 text-[13px] text-orange-700 font-medium">
                    <AlertTriangle size={16} className="shrink-0" />
                    Demo Mode: The Meta API is currently unreachable. Displaying mock conversations.
                </div>
            )}

            <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex">
                {/* Left Panel - Conversation List */}
                <div className="w-[320px] border-r border-gray-100 flex flex-col bg-white shrink-0">
                    <div className="p-4 border-b border-gray-100">
                        <h2 className="text-sm font-semibold text-gray-700">Conversations</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="p-6 text-center text-sm text-gray-400">Loading conversations...</div>
                        ) : conversations.length === 0 ? (
                            <div className="p-6 text-center text-sm text-gray-400">No conversations found.</div>
                        ) : (
                            conversations.map(conv => {
                                const lastMsg = conv.messages[conv.messages.length - 1];
                                const isSelected = conv.id === selectedConversationId;
                                return (
                                    <button
                                        key={conv.id}
                                        onClick={() => setSelectedConversationId(conv.id)}
                                        className={`w-full text-left p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-semibold text-gray-900 text-sm">{conv.contactName}</span>
                                            {lastMsg && (
                                                <span className="text-xs text-gray-400 shrink-0 ml-2">
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
                <div className="flex-1 flex flex-col bg-gray-50/30">
                    {selectedConversation ? (
                        <>
                            {/* Chat Header */}
                            <div className="px-6 py-4 border-b border-gray-100 bg-white flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                                    <User size={20} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 text-sm">{selectedConversation.contactName}</h3>
                                    <p className="text-xs text-gray-400">{selectedConversation.contactPhone}</p>
                                </div>
                            </div>

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {selectedConversation.messages.map((msg) => {
                                    const isUser = msg.sender === 'user';
                                    return (
                                        <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm ${
                                                isUser ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'
                                            }`}>
                                                <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                                <p className={`text-[10px] mt-1 text-right ${isUser ? 'text-blue-200' : 'text-gray-400'}`}>
                                                    {formatTime(msg.timestamp)}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <div className="p-4 bg-white border-t border-gray-100">
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        placeholder="Type a message..."
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                        className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={!messageInput.trim() || sending}
                                        className="bg-blue-600 text-white w-11 h-11 rounded-xl flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0 shadow-sm"
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
