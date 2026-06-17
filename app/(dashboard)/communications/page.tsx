"use client";

import React, { useEffect, useState } from "react";
import { Mail, Phone, MessageCircle, Calendar as CalendarIcon, Filter, Search } from "lucide-react";
import { getInbox, CommunicationItem, CommunicationType } from "@/lib/api/communicationsApi";
import { toast } from "sonner";

export default function CommunicationsPage() {
    const [items, setItems] = useState<CommunicationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | CommunicationType>("all");
    const [search, setSearch] = useState("");

    useEffect(() => {
        loadInbox();
    }, []);

    const loadInbox = async () => {
        setLoading(true);
        try {
            const data = await getInbox();
            setItems(data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load communications");
        } finally {
            setLoading(false);
        }
    };

    const filteredItems = items.filter(item => {
        if (filter !== "all" && item.type !== filter) return false;
        if (search) {
            const q = search.toLowerCase();
            return item.contact.toLowerCase().includes(q) || item.preview.toLowerCase().includes(q);
        }
        return true;
    });

    const getIcon = (type: CommunicationType) => {
        switch (type) {
            case "email": return <Mail className="text-blue-500" size={20} />;
            case "call": return <Phone className="text-green-500" size={20} />;
            case "whatsapp": return <MessageCircle className="text-emerald-500" size={20} />;
            case "meeting": return <CalendarIcon className="text-purple-500" size={20} />;
        }
    };

    const formatDate = (isoStr: string) => {
        const date = new Date(isoStr);
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    };

    return (
        <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] p-6 bg-gray-50/50">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Communication Hub</h1>
                    <p className="text-sm text-gray-500 mt-1">Unified inbox for all your interactions</p>
                </div>
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search communications..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                    />
                </div>
            </div>

            {/* Main Content */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex-1 flex flex-col overflow-hidden">
                {/* Filters */}
                <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 overflow-x-auto no-scrollbar shrink-0">
                    <Filter className="text-gray-400 mr-2" size={18} />
                    {(["all", "email", "whatsapp", "call", "meeting"] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setFilter(t)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap capitalize ${
                                filter === t 
                                    ? "bg-blue-50 text-blue-700" 
                                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                            }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <Mail className="text-gray-400" size={32} />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">No communications found</h3>
                            <p className="text-sm text-gray-500 mt-1">Try adjusting your filters or search.</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredItems.map(item => (
                                <div 
                                    key={item.id} 
                                    className="flex items-start gap-4 p-4 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer group"
                                >
                                    <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-white transition-colors border border-gray-100 group-hover:border-gray-200">
                                        {getIcon(item.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className="text-sm font-semibold text-gray-900 truncate">{item.contact}</h4>
                                            <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                                                {formatDate(item.timestamp)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 line-clamp-2">{item.preview}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
