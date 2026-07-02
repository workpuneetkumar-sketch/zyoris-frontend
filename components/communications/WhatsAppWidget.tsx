"use client";

import React, { useEffect, useState } from "react";
import { MessageCircle, ArrowRight } from "lucide-react";
import { fetchConversations, WhatsAppConversation } from "@/lib/api/whatsappApi";
import Link from "next/link";

export default function WhatsAppWidget() {
    const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const res = await fetchConversations();
                setConversations(res.slice(0, 4)); // Show top 4
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const getInitials = (name: string) => {
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden">
            <div className="p-5 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                        <MessageCircle size={18} />
                    </div>
                    <h3 className="font-semibold text-gray-900">Recent Chats</h3>
                </div>
                <Link href="/whatsapp" className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-medium">
                    View all <ArrowRight size={14} />
                </Link>
            </div>
            <div className="flex-1 p-5 overflow-y-auto no-scrollbar">
                {loading ? (
                    <div className="flex justify-center items-center h-full">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
                    </div>
                ) : conversations.length === 0 ? (
                    <div className="text-center text-sm text-gray-500 py-8">No recent chats</div>
                ) : (
                    <div className="space-y-4">
                        {conversations.map(chat => (
                            <div key={chat.id} className="flex gap-3 group cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded-xl transition-colors">
                                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 text-xs font-bold relative">
                                    {getInitials(chat.contactName || "Un")}
                                    {chat.unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[9px] font-bold ring-2 ring-white">
                                            {chat.unreadCount}
                                        </span>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <p className="text-sm font-semibold text-gray-900 truncate pr-2">{chat.contactName}</p>
                                        <span className="text-xs text-gray-400 shrink-0">
                                            {chat.updatedAt ? new Date(chat.updatedAt).toLocaleDateString() : ""}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 truncate">
                                        {chat.messages?.[chat.messages.length - 1]?.text || "No messages"}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
