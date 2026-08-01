"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
    Send, 
    User, 
    AlertTriangle, 
    MessageCircle, 
    Plus, 
    AlertCircle, 
    ChevronLeft,
    Pin,
    PinOff,
    Archive,
    ArchiveRestore,
    Tag,
    X,
    RefreshCw,
    Check,
    Sparkles,
    Radio
} from "lucide-react";
import { WhatsAppConversation, fetchAISentiment } from "@/lib/api/whatsappApi";
import { WhatsAppTab } from "@/hooks/useWhatsApp";
import { AIInsightsPanel } from "@/components/whatsapp/AIInsightsPanel";
import { BroadcastComposerModal } from "@/components/whatsapp/BroadcastComposerModal";

interface WhatsAppUIProps {
    conversations: WhatsAppConversation[];
    selectedConversation: WhatsAppConversation | null;
    selectedConversationId: string | null;
    setSelectedConversationId: (id: string | null) => void;
    activeTab: WhatsAppTab;
    setActiveTab: (tab: WhatsAppTab) => void;
    loading: boolean;
    error: string | null;
    isDemoMode: boolean;
    sending: boolean;
    onSendMessage: (text: string) => Promise<boolean>;
    onSetLabels: (id: string, labels: string[]) => Promise<boolean>;
    onTogglePin: (id: string, pinned: boolean) => Promise<boolean>;
    onToggleArchive: (id: string, archived: boolean) => Promise<boolean>;
    onRetry?: () => void;
}

const PRESET_LABELS = ["VIP", "Follow-up", "Urgent", "Lead", "Support", "Customer"];

function formatTime(isoStr: string) {
    if (!isoStr) return "";
    try {
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return "";
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
        return "";
    }
}

function getLabelBadgeStyle(label: string) {
    const l = label.toLowerCase();
    if (l.includes("vip")) return "bg-purple-100 text-purple-800 border-purple-200";
    if (l.includes("follow")) return "bg-amber-100 text-amber-800 border-amber-200";
    if (l.includes("urgent")) return "bg-red-100 text-red-800 border-red-200";
    if (l.includes("lead")) return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (l.includes("support")) return "bg-blue-100 text-blue-800 border-blue-200";
    return "bg-gray-100 text-gray-700 border-gray-200";
}

export function WhatsAppUI({
    conversations,
    selectedConversation,
    selectedConversationId,
    setSelectedConversationId,
    activeTab,
    setActiveTab,
    loading,
    error,
    isDemoMode,
    sending,
    onSendMessage,
    onSetLabels,
    onTogglePin,
    onToggleArchive,
    onRetry
}: WhatsAppUIProps) {
    const [messageInput, setMessageInput] = useState("");
    const [showMobileChat, setShowMobileChat] = useState(false);
    const [showLabelManager, setShowLabelManager] = useState(false);
    const [customLabelInput, setCustomLabelInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [showAIInsights, setShowAIInsights] = useState(false);
    const [showBroadcastModal, setShowBroadcastModal] = useState(false);
    const [sentimentMap, setSentimentMap] = useState<Record<string, { loading: boolean; sentiment?: string }>>({});

    const handleFetchSentiment = async (id: string) => {
        if (sentimentMap[id]?.loading) return;
        setSentimentMap(prev => ({ ...prev, [id]: { loading: true } }));
        try {
            const res = await fetchAISentiment(id);
            setSentimentMap(prev => ({ ...prev, [id]: { loading: false, sentiment: res.sentiment } }));
        } catch (err) {
            setSentimentMap(prev => ({ ...prev, [id]: { loading: false, sentiment: "Unavailable" } }));
        }
    };

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

    const handleAddCustomLabel = async () => {
        if (!selectedConversation || !customLabelInput.trim()) return;
        const current = selectedConversation.labels || [];
        const trimmed = customLabelInput.trim();
        if (!current.includes(trimmed)) {
            const updated = [...current, trimmed];
            await onSetLabels(selectedConversation.id, updated);
        }
        setCustomLabelInput("");
    };

    const handleTogglePresetLabel = async (label: string) => {
        if (!selectedConversation) return;
        const current = selectedConversation.labels || [];
        const exists = current.includes(label);
        const updated = exists ? current.filter(l => l !== label) : [...current, label];
        await onSetLabels(selectedConversation.id, updated);
    };

    const handleRemoveLabel = async (label: string) => {
        if (!selectedConversation) return;
        const current = selectedConversation.labels || [];
        const updated = current.filter(l => l !== label);
        await onSetLabels(selectedConversation.id, updated);
    };

    // Filter conversations by active tab and optional search query
    const filteredConversations = conversations.filter(conv => {
        const matchesTab = activeTab === "archived" ? Boolean(conv.archived) : !conv.archived;
        if (!matchesTab) return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            conv.contactName.toLowerCase().includes(q) ||
            conv.contactPhone.toLowerCase().includes(q) ||
            (conv.labels && conv.labels.some(l => l.toLowerCase().includes(q)))
        );
    });

    const pinnedConversations = filteredConversations.filter(conv => conv.pinned);
    const unpinnedConversations = filteredConversations.filter(conv => !conv.pinned);

    const inboxCount = conversations.filter(c => !c.archived).length;
    const archivedCount = conversations.filter(c => c.archived).length;

    const renderConversationCard = (conv: WhatsAppConversation) => {
        const lastMsg = conv.messages[conv.messages.length - 1];
        const isSelected = conv.id === selectedConversationId;

        return (
            <div
                key={conv.id}
                onClick={() => { setSelectedConversationId(conv.id); setShowMobileChat(true); }}
                className={`w-full text-left p-3.5 border-b border-gray-50 cursor-pointer transition-all duration-200 group hover:bg-gray-50/80 ${
                    isSelected 
                        ? 'bg-gradient-to-r from-blue-50/90 to-indigo-50/40 border-l-4 border-l-blue-600' 
                        : 'border-l-4 border-l-transparent'
                }`}
            >
                <div className="flex justify-between items-start mb-1">
                    <span className={`font-semibold text-[14px] truncate max-w-[180px] ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                        {conv.contactName}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {lastMsg && (
                            <span className={`text-[11px] font-medium ${isSelected ? 'text-blue-600' : 'text-gray-400'}`}>
                                {formatTime(lastMsg.timestamp)}
                            </span>
                        )}
                        {/* Quick Actions */}
                        <div className="hidden group-hover:flex items-center gap-1 bg-white/90 rounded px-1 shadow-sm border border-gray-100" onClick={e => e.stopPropagation()}>
                            <button
                                title={conv.pinned ? "Unpin chat" : "Pin chat"}
                                onClick={() => onTogglePin(conv.id, !conv.pinned)}
                                className={`p-1 rounded hover:bg-gray-100 transition-colors ${conv.pinned ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                {conv.pinned ? <PinOff size={13} /> : <Pin size={13} />}
                            </button>
                            <button
                                title={conv.archived ? "Unarchive chat" : "Archive chat"}
                                onClick={() => onToggleArchive(conv.id, !conv.archived)}
                                className={`p-1 rounded hover:bg-gray-100 transition-colors ${conv.archived ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                {conv.archived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-center gap-2 mb-1.5">
                    <p className="text-xs text-gray-500 truncate flex-1">
                        {lastMsg ? lastMsg.text : "No messages"}
                    </p>
                    {conv.unreadCount > 0 && (
                        <span className="shrink-0 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                            {conv.unreadCount}
                        </span>
                    )}
                </div>

                {/* Label Badges */}
                {conv.labels && conv.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                        {conv.labels.map((lbl, idx) => (
                            <span 
                                key={idx} 
                                className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium border ${getLabelBadgeStyle(lbl)}`}
                            >
                                {lbl}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="h-[calc(100vh-120px)] flex flex-col gap-4 p-0 md:p-0">
            {/* Header */}
            <div className="flex items-center justify-between px-4 md:px-0 pt-4 md:pt-0">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">WhatsApp Workspace</h1>
                    <p className="text-[15px] text-gray-500 mt-1 font-medium">Manage labels, pinned chats, AI insights, and broadcast campaigns</p>
                </div>

                <button
                    onClick={() => setShowBroadcastModal(true)}
                    className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg hover:shadow-blue-200 transition-all flex items-center gap-2 shrink-0"
                >
                    <Radio size={16} />
                    <span>Broadcast Message</span>
                </button>
            </div>

            {/* Demo Banner */}
            {isDemoMode && (
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-orange-50 border border-orange-200 text-[13px] text-orange-800 font-medium shrink-0">
                    <AlertTriangle size={16} className="shrink-0 text-orange-600" />
                    <span>Demo Mode: backend or Meta API is using mock data fallback. All label, pin, and archive actions work optimistically.</span>
                </div>
            )}

            {/* Main Panel */}
            <div className="flex-1 bg-white md:rounded-2xl md:border border-gray-100 shadow-sm overflow-hidden flex">
                {/* Left Panel - Conversations List */}
                <div className={`w-full md:w-[350px] border-r border-gray-100 flex-col bg-white shrink-0 ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
                    
                    {/* Navigation Tabs */}
                    <div className="p-3 border-b border-gray-100 bg-gray-50/50 flex gap-2 shrink-0">
                        <button
                            onClick={() => setActiveTab("inbox")}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                                activeTab === "inbox"
                                    ? "bg-white text-blue-600 shadow-sm border border-gray-200/80"
                                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-100/50"
                            }`}
                        >
                            <MessageCircle size={14} />
                            Inbox
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === "inbox" ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-600"}`}>
                                {inboxCount}
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab("archived")}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                                activeTab === "archived"
                                    ? "bg-white text-blue-600 shadow-sm border border-gray-200/80"
                                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-100/50"
                            }`}
                        >
                            <Archive size={14} />
                            Archived
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === "archived" ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-600"}`}>
                                {archivedCount}
                            </span>
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="p-3 border-b border-gray-100 bg-white">
                        <input
                            type="text"
                            placeholder="Search chats or labels..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:bg-white transition-all"
                        />
                    </div>

                    {/* Conversation List / Content Area */}
                    <div className="flex-1 overflow-y-auto">
                        {error ? (
                            <div className="flex flex-col items-center justify-center h-full p-6 text-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                                    <AlertCircle size={22} />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-red-600">{error}</p>
                                    <p className="text-[11px] text-gray-400 mt-0.5">Please check authentication or server connection.</p>
                                </div>
                                {onRetry && (
                                    <button
                                        onClick={onRetry}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium transition-colors"
                                    >
                                        <RefreshCw size={13} />
                                        Retry Connection
                                    </button>
                                )}
                            </div>
                        ) : loading ? (
                            <div className="flex justify-center items-center h-full p-6">
                                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div>
                            </div>
                        ) : activeTab === "archived" ? (
                            /* Archived Tab Content */
                            filteredConversations.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full p-6 text-center text-gray-400 gap-2">
                                    <Archive size={36} className="text-gray-300" />
                                    <p className="text-sm font-medium text-gray-700">No archived chats</p>
                                    <p className="text-xs text-gray-400">Conversations you archive will appear here.</p>
                                </div>
                            ) : (
                                <div>
                                    <div className="px-3 py-2 bg-gray-50/80 border-b border-gray-100 flex items-center gap-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                        <Archive size={12} className="text-blue-600" />
                                        Archived Conversations ({filteredConversations.length})
                                    </div>
                                    {filteredConversations.map(renderConversationCard)}
                                </div>
                            )
                        ) : (
                            /* Inbox Tab Content (Pinned + Regular) */
                            <div>
                                {/* Pinned Chats Section */}
                                <div className="border-b border-gray-100">
                                    <div className="px-3 py-2 bg-blue-50/40 border-b border-blue-100/50 flex items-center justify-between text-[11px] font-bold text-blue-800 uppercase tracking-wider">
                                        <span className="flex items-center gap-1.5">
                                            <Pin size={12} className="text-blue-600 fill-blue-600" />
                                            Pinned ({pinnedConversations.length})
                                        </span>
                                    </div>
                                    {pinnedConversations.length === 0 ? (
                                        <div className="p-3 text-center text-xs text-gray-400 italic bg-gray-50/30">
                                            No pinned chats yet. Hover a chat to pin it.
                                        </div>
                                    ) : (
                                        pinnedConversations.map(renderConversationCard)
                                    )}
                                </div>

                                {/* All / Unpinned Conversations Section */}
                                <div>
                                    <div className="px-3 py-2 bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                        All Messages ({unpinnedConversations.length})
                                    </div>
                                    {unpinnedConversations.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center p-8 text-center text-gray-400 gap-2">
                                            <MessageCircle size={32} className="text-gray-300" />
                                            <p className="text-xs font-medium text-gray-600">No unpinned conversations found.</p>
                                        </div>
                                    ) : (
                                        unpinnedConversations.map(renderConversationCard)
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel - Active Chat Window & AI Insights Panel */}
                <div className={`flex-1 flex bg-gray-50/30 min-w-0 ${!showMobileChat ? 'hidden md:flex' : 'flex'}`}>
                    {selectedConversation ? (
                        <>
                            <div className="flex-1 flex flex-col min-w-0">
                                {/* Chat Header */}
                                <div className="px-4 md:px-6 py-3.5 border-b border-gray-100 bg-white flex items-center justify-between gap-3 shrink-0 relative">
                                    <div className="flex items-center gap-2 md:gap-3 min-w-0">
                                        <button onClick={() => setShowMobileChat(false)} className="md:hidden p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
                                            <ChevronLeft size={20} />
                                        </button>
                                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 shrink-0 shadow-sm border border-blue-200/50">
                                            <User size={22} />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-gray-900 text-[15px] tracking-tight truncate">{selectedConversation.contactName}</h3>
                                                {selectedConversation.leadStatus && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-200 shrink-0">
                                                        {selectedConversation.leadStatus}
                                                    </span>
                                                )}
                                                {/* 📊 Sentiment Pill */}
                                                <button
                                                    onClick={() => handleFetchSentiment(selectedConversation.id)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors shrink-0 shadow-2xs"
                                                    title="Check customer sentiment"
                                                >
                                                    <span>📊 Sentiment</span>
                                                    {sentimentMap[selectedConversation.id]?.loading ? (
                                                        <RefreshCw size={11} className="animate-spin text-amber-600 ml-0.5" />
                                                    ) : sentimentMap[selectedConversation.id]?.sentiment ? (
                                                        <span className="font-semibold text-amber-900 ml-0.5">({sentimentMap[selectedConversation.id].sentiment})</span>
                                                    ) : null}
                                                </button>
                                            </div>
                                            <p className="text-xs text-gray-400 truncate">
                                                {selectedConversation.contactPhone}
                                                {selectedConversation.leadName && ` • Lead: ${selectedConversation.leadName}`}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Header Action Toolbar */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        {/* AI Insights Panel Toggle */}
                                        <button
                                            onClick={() => setShowAIInsights(!showAIInsights)}
                                            className={`flex items-center gap-1.5 h-8 px-3 rounded-lg border text-[12px] font-medium transition-colors ${
                                                showAIInsights
                                                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 shadow-xs'
                                                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                                            }`}
                                        >
                                            <Sparkles size={14} className={showAIInsights ? "text-indigo-600 fill-indigo-100" : "text-indigo-500"} />
                                            <span>✨ AI Summary</span>
                                        </button>

                                        {/* Label Manager Toggle */}
                                        <button
                                            onClick={() => setShowLabelManager(!showLabelManager)}
                                            className={`flex items-center gap-1.5 h-8 px-3 rounded-lg border text-[12px] font-medium transition-colors ${
                                                showLabelManager || (selectedConversation.labels && selectedConversation.labels.length > 0)
                                                    ? 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100'
                                                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                                            }`}
                                        >
                                            <Tag size={14} />
                                            <span>Labels</span>
                                            {selectedConversation.labels && selectedConversation.labels.length > 0 && (
                                                <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-purple-200 text-purple-800 font-bold">
                                                    {selectedConversation.labels.length}
                                                </span>
                                            )}
                                        </button>

                                        {/* Pin Toggle */}
                                        <button
                                            onClick={() => onTogglePin(selectedConversation.id, !selectedConversation.pinned)}
                                            title={selectedConversation.pinned ? "Unpin chat" : "Pin chat"}
                                            className={`h-8 w-8 flex items-center justify-center rounded-lg border transition-colors ${
                                                selectedConversation.pinned
                                                    ? 'bg-blue-50 border-blue-200 text-blue-600'
                                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                            }`}
                                        >
                                            {selectedConversation.pinned ? <PinOff size={15} /> : <Pin size={15} />}
                                        </button>

                                        {/* Archive Toggle */}
                                        <button
                                            onClick={() => onToggleArchive(selectedConversation.id, !selectedConversation.archived)}
                                            title={selectedConversation.archived ? "Unarchive chat" : "Archive chat"}
                                            className={`h-8 w-8 flex items-center justify-center rounded-lg border transition-colors ${
                                                selectedConversation.archived
                                                    ? 'bg-amber-50 border-amber-200 text-amber-600'
                                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                            }`}
                                        >
                                            {selectedConversation.archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
                                        </button>

                                        {/* Create Lead Button if not linked */}
                                        {!selectedConversation.leadId && (
                                            <button 
                                                onClick={() => router.push(`/leads/new?phone=${encodeURIComponent(selectedConversation.contactPhone)}&name=${encodeURIComponent(selectedConversation.contactName)}`)}
                                                className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-200 bg-white text-[12px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                            >
                                                <Plus size={14} />
                                                Create Lead
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Label Manager Popover / Drawer */}
                                {showLabelManager && (
                                    <div className="bg-purple-50/60 border-b border-purple-100 p-4 transition-all animate-fadeIn">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <Tag size={15} className="text-purple-700" />
                                                <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider">Conversation Labels</h4>
                                            </div>
                                            <button onClick={() => setShowLabelManager(false)} className="text-gray-400 hover:text-gray-600">
                                                <X size={16} />
                                            </button>
                                        </div>

                                        {/* Active Labels Chips */}
                                        <div className="flex flex-wrap gap-1.5 mb-3">
                                            {(!selectedConversation.labels || selectedConversation.labels.length === 0) ? (
                                                <span className="text-xs text-gray-400 italic">No labels attached. Select a preset below or add a custom label.</span>
                                            ) : (
                                                selectedConversation.labels.map((lbl, idx) => (
                                                    <span key={idx} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border shadow-xs ${getLabelBadgeStyle(lbl)}`}>
                                                        {lbl}
                                                        <button onClick={() => handleRemoveLabel(lbl)} className="hover:text-red-600">
                                                            <X size={12} />
                                                        </button>
                                                    </span>
                                                ))
                                            )}
                                        </div>

                                        {/* Preset Toggles */}
                                        <div className="mb-3">
                                            <p className="text-[11px] font-semibold text-gray-500 mb-1.5">Preset Tags:</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {PRESET_LABELS.map(preset => {
                                                    const isActive = selectedConversation.labels?.includes(preset);
                                                    return (
                                                        <button
                                                            key={preset}
                                                            onClick={() => handleTogglePresetLabel(preset)}
                                                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 border ${
                                                                isActive
                                                                    ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                                                                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100"
                                                            }`}
                                                        >
                                                            {isActive && <Check size={12} />}
                                                            {preset}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Custom Label Input */}
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Type custom label..."
                                                value={customLabelInput}
                                                onChange={e => setCustomLabelInput(e.target.value)}
                                                onKeyDown={e => e.key === "Enter" && handleAddCustomLabel()}
                                                className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                                            />
                                            <button
                                                onClick={handleAddCustomLabel}
                                                disabled={!customLabelInput.trim()}
                                                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                                            >
                                                Add Label
                                            </button>
                                        </div>
                                    </div>
                                )}

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
                            </div>

                            {/* Collapsible AI Insights Side Panel */}
                            {showAIInsights && (
                                <AIInsightsPanel
                                    conversationId={selectedConversation.id}
                                    contactName={selectedConversation.contactName}
                                    onSelectSuggestion={(text) => setMessageInput(text)}
                                    onClose={() => setShowAIInsights(false)}
                                />
                            )}
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                            <MessageCircle size={48} className="mb-4 opacity-20" />
                            <p className="text-sm font-medium">Select a conversation to start messaging</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Broadcast Composer Modal */}
            <BroadcastComposerModal
                isOpen={showBroadcastModal}
                onClose={() => setShowBroadcastModal(false)}
            />
        </div>
    );
}


