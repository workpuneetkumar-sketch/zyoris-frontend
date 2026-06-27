"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, UserCircle2, MessageCircle, AlertCircle, Edit, Trash2, Menu, ChevronDown } from "lucide-react";
import { getChatSessions, getSessionMessages, sendMessage, updateMessage, deleteMessage, ChatSession, ChatMessage } from "@/lib/api/messagesApi";

export default function MessagesPage() {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState("");
    const [loading, setLoading] = useState(true);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    // Edit state
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editText, setEditText] = useState("");

    useEffect(() => {
        loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (activeSession) {
            loadMessages(activeSession.id);
        }
    }, [activeSession]);

    useEffect(() => {
        // Scroll to bottom when messages change
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const loadSessions = async () => {
        try {
            setError(null);
            const data = await getChatSessions();
            setSessions(data);
            if (data.length > 0 && !activeSession) {
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

    const handleEditStart = (message: ChatMessage) => {
        setEditingMessageId(message.id);
        setEditText(message.text);
    };

    const handleEditCancel = () => {
        setEditingMessageId(null);
        setEditText("");
    };

    const handleEditSave = async (message: ChatMessage) => {
        if (!editText.trim()) {
            handleEditCancel();
            return;
        }

        try {
            const updatedMessage = await updateMessage(message.id, editText.trim());
            if (updatedMessage) {
                setMessages(prev => 
                    prev.map(m => m.id === message.id ? updatedMessage : m)
                );
            }
            handleEditCancel();
        } catch (error) {
            console.error("Failed to update message", error);
        }
    };

    const handleDelete = async (message: ChatMessage) => {
        try {
            const success = await deleteMessage(message.id);
            if (success) {
                setMessages(prev => prev.filter(m => m.id !== message.id));
            }
        } catch (error) {
            console.error("Failed to delete message", error);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || !activeSession) return;

        const text = inputText;
        setInputText("");

        try {
            const newMsgs = await sendMessage(activeSession.id, text);
            setMessages(prev => [...prev, ...newMsgs]);
            
            // Update session last message
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
        return new Date(isoString).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    };

    return (
        <div className="flex h-[calc(100vh-theme(spacing.16))] p-6 bg-gray-50/50">
            <div className="w-full max-w-6xl mx-auto flex bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                
                {/* Left Panel - Team Members */}
                <div className="w-80 border-r border-gray-100 flex flex-col bg-gray-50/30">
                    <div className="p-4 border-b border-gray-100 bg-white shrink-0">
                        <h2 className="text-lg font-bold text-gray-900">Team Chat</h2>
                        <p className="text-sm text-gray-500">Direct messages</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {error ? (
                            <div className="flex flex-col items-center justify-center h-full p-6 text-center gap-2">
                                <AlertCircle size={24} className="text-red-400" />
                                <p className="text-sm text-red-500">{error}</p>
                            </div>
                        ) : loading ? (
                            <div className="flex justify-center items-center h-full p-4">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            </div>
                        ) : sessions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full p-6 text-center text-gray-400">
                                <MessageCircle size={32} className="mb-3 text-gray-300" />
                                <p className="text-sm font-medium">No chats available.</p>
                                <p className="text-xs mt-1">Start a new conversation to see it here.</p>
                            </div>
                        ) : sessions.map(session => (
                            <div 
                                key={session.id}
                                onClick={() => setActiveSession(session)}
                                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                                    activeSession?.id === session.id 
                                        ? "bg-blue-50 hover:bg-blue-100" 
                                        : "hover:bg-gray-100"
                                }`}
                            >
                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                    <UserCircle2 size={24} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h3 className="text-sm font-medium text-gray-900 truncate pr-2">{session.name}</h3>
                                        <span className="text-[10px] text-gray-500 shrink-0">{formatTime(session.updatedAt)}</span>
                                    </div>
                                    <p className={`text-xs truncate ${activeSession?.id === session.id ? "text-blue-600 font-medium" : "text-gray-500"}`}>
                                        {session.lastMessage || "No messages yet"}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Panel - Chat Area */}
                <div className="flex-1 flex flex-col min-w-0 bg-white">
                    {activeSession ? (
                        <>
                            {/* Chat Header */}
                            <div className="flex items-center p-4 border-b border-gray-100 shrink-0">
                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3">
                                    <UserCircle2 size={24} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">{activeSession.name}</h3>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30">
                                {messagesLoading ? (
                                    <div className="flex justify-center items-center h-full p-4">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                    </div>
                                ) : (
                                    <>
{messages.map((msg, idx) => {
                                            const isMe = msg.senderId === "me";
                                            const isEditing = editingMessageId === msg.id;
                                            
                                            return (
                                                <div key={msg.id || idx} className={`flex flex-col ${isMe ? "items-end" : "items-start"} mb-4 position-relative`}>
                                                    {/* Message actions (hover to show for sender's messages) */}
                                                    {isMe && !isEditing && (
                                                        <div className="absolute right-0 top-0 -mt-2 -mr-2 flex items-center space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleEditStart(msg);
                                                                }}
                                                                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1"
                                                                title="Edit"
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDelete(msg);
                                                                }}
                                                                className="text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-full p-1"
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Message content */}
                                                    <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                                                        isMe 
                                                            ? isEditing 
                                                                ? "bg-blue-50 border border-blue-200 rounded-tr-sm" 
                                                                : "bg-blue-600 text-white rounded-tr-sm" 
                                                            : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm"
                                                    }`}>
                                                        {isEditing ? (
                                                            <textarea
                                                                value={editText}
                                                                onChange={(e) => setEditText(e.target.value)}
                                                                className="w-full resize-none border-none bg-transparent text-sm py-1 px-0 focus:outline-none focus:ring-0"
                                                                autoFocus
                                                                rows={2}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                                        e.preventDefault();
                                                                        handleEditSave(msg);
                                                                    }
                                                                    if (e.key === 'Escape') {
                                                                        handleEditCancel();
                                                                    }
                                                                }}
                                                            />
                                                        ) : (
                                                                <span>{msg.text}</span>
                                                            )}
                                                    </div>
                                                    
                                                    {/* Edit controls when editing */}
                                                    {isEditing && isMe && (
                                                        <div className="mt-2 flex w-full justify-end space-x-2">
                                                            <button
                                                                onClick={() => handleEditSave(msg)}
                                                                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                                            >
                                                                Save
                                                            </button>
                                                            <button
                                                                onClick={handleEditCancel}
                                                                className="px-3 py-1 text-sm bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    )}
                                                    
                                                    <span className="text-[10px] text-gray-400 mt-1 px-1">
                                                        {formatTime(msg.timestamp)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                        <div ref={messagesEndRef} />
                                    </ul>
                                )}
                            </div>

                            {/* Input Area */}
                            <div className="p-4 bg-white border-t border-gray-100 shrink-0">
                                <form onSubmit={handleSend} className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        placeholder="Type a message..." 
                                        className="flex-1 border border-gray-200 rounded-full px-5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all bg-gray-50 hover:bg-white focus:bg-white"
                                    />
                                    <button 
                                        type="submit" 
                                        disabled={!inputText.trim()}
                                        className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                                    >
                                        <Send size={18} className="ml-1" />
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
                            <MessageCircle size={48} className="mb-4 text-gray-300" />
                            <p className="text-lg font-medium text-gray-600">Select a conversation</p>
                            <p className="text-sm mt-1">Choose a team member from the list to start chatting.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}