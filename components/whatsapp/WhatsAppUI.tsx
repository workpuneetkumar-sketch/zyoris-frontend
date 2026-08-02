"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Send, User, AlertTriangle, MessageCircle, Plus, AlertCircle,
    ChevronLeft, Pin, PinOff, Archive, ArchiveRestore, Tag, X,
    RefreshCw, Check, Sparkles, Radio, Wifi, WifiOff, Building2,
    Pencil, Paperclip, Image, UserPlus, UserX, Settings,
} from "lucide-react";
import {
    WhatsAppConversation, fetchAISentiment, fetchAISuggestions,
    uploadWhatsAppMedia, fetchWhatsAppMedia, WhatsAppStatusResponse,
    WhatsAppBusinessProfile,
} from "@/lib/api/whatsappApi";
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
    waStatus?: WhatsAppStatusResponse | null;
    waProfile?: WhatsAppBusinessProfile | null;
    waStatusLoading?: boolean;
    onSendMessage: (text: string) => Promise<boolean>;
    onSetLabels: (id: string, labels: string[]) => Promise<boolean>;
    onTogglePin: (id: string, pinned: boolean) => Promise<boolean>;
    onToggleArchive: (id: string, archived: boolean) => Promise<boolean>;
    onAssignConversation?: (id: string, userId: string | null) => Promise<boolean>;
    onUpdateProfile?: (updates: Partial<WhatsAppBusinessProfile>) => Promise<boolean>;
    onUploadMedia?: (file: File) => Promise<any>;
    onRetry?: () => void;
    refreshStatus?: () => void;
    refreshProfile?: () => void;
}

const PRESET_LABELS = ["VIP", "Follow-up", "Urgent", "Lead", "Support", "Customer"];

function formatTime(isoStr: string) {
    if (!isoStr) return "";
    try {
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return "";
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch { return ""; }
}

function getLabelBadgeStyle(label: string) {
    const l = label.toLowerCase();
    if (l.includes("vip"))     return "bg-purple-100 text-purple-800 border-purple-200";
    if (l.includes("follow"))  return "bg-amber-100 text-amber-800 border-amber-200";
    if (l.includes("urgent"))  return "bg-red-100 text-red-800 border-red-200";
    if (l.includes("lead"))    return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (l.includes("support")) return "bg-blue-100 text-blue-800 border-blue-200";
    return "bg-gray-100 text-gray-700 border-gray-200";
}

/* ── Business Profile Modal ─────────────────────────────────────────────────── */
function BusinessProfileModal({
    profile,
    onClose,
    onSave,
}: {
    profile: WhatsAppBusinessProfile | null;
    onClose: () => void;
    onSave: (updates: Partial<WhatsAppBusinessProfile>) => Promise<boolean>;
}) {
    const [form, setForm] = useState<Partial<WhatsAppBusinessProfile>>(profile || {});
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const handleSave = async () => {
        setSaving(true); setErr(null);
        const ok = await onSave(form);
        if (!ok) setErr("Failed to save profile.");
        else onClose();
        setSaving(false);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-blue-600" />
                        <h3 className="text-sm font-bold text-gray-900">WhatsApp Business Profile</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500"><X size={15} /></button>
                </div>
                <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
                    {err && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">{err}</p>}
                    {[
                        { key: "about",       label: "About",       placeholder: "Tell customers about your business" },
                        { key: "address",     label: "Address",     placeholder: "Business address" },
                        { key: "description", label: "Description", placeholder: "Business description" },
                        { key: "email",       label: "Email",       placeholder: "Business email" },
                        { key: "vertical",    label: "Category",    placeholder: "e.g. RETAIL, FINANCE, HEALTH" },
                    ].map(({ key, label, placeholder }) => (
                        <div key={key}>
                            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
                            <input
                                value={(form as any)[key] || ""}
                                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                placeholder={placeholder}
                                className="w-full h-9 px-3 text-sm rounded-lg border border-gray-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                            />
                        </div>
                    ))}
                </div>
                <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50">
                    <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-white transition">Cancel</button>
                    <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition disabled:opacity-60">
                        {saving ? "Saving…" : "Save Profile"}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Main WhatsAppUI Component ──────────────────────────────────────────────── */
export function WhatsAppUI({
    conversations, selectedConversation, selectedConversationId, setSelectedConversationId,
    activeTab, setActiveTab, loading, error, isDemoMode, sending,
    waStatus, waProfile, waStatusLoading,
    onSendMessage, onSetLabels, onTogglePin, onToggleArchive,
    onAssignConversation, onUpdateProfile, onUploadMedia, onRetry,
    refreshStatus, refreshProfile,
}: WhatsAppUIProps) {
    const [messageInput, setMessageInput]           = useState("");
    const [showMobileChat, setShowMobileChat]       = useState(false);
    const [showLabelManager, setShowLabelManager]   = useState(false);
    const [customLabelInput, setCustomLabelInput]   = useState("");
    const [searchQuery, setSearchQuery]             = useState("");
    const [showAIInsights, setShowAIInsights]       = useState(false);
    const [showBroadcastModal, setShowBroadcastModal] = useState(false);
    const [showProfileModal, setShowProfileModal]   = useState(false);

    // Sentiment pill per conversation
    const [sentimentMap, setSentimentMap] = useState<Record<string, { loading: boolean; sentiment?: string }>>({});

    // Suggestion pills above composer
    const [suggestionPills, setSuggestionPills] = useState<string[]>([]);
    const [pillsLoading, setPillsLoading]       = useState(false);

    // Media upload state (in composer)
    const [mediaUploading, setMediaUploading]   = useState(false);
    const [uploadedMediaId, setUploadedMediaId] = useState<string | null>(null);
    const [uploadedMediaUrl, setUploadedMediaUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [selectedConversation?.messages]);

    // Clear suggestions & media when switching conversations
    useEffect(() => {
        setSuggestionPills([]);
        setPillsLoading(false);
        setUploadedMediaId(null);
        setUploadedMediaUrl(null);
    }, [selectedConversation?.id]);

    const handleSend = async () => {
        if (!messageInput.trim() || sending) return;
        const ok = await onSendMessage(messageInput);
        if (ok) {
            setMessageInput("");
            setUploadedMediaId(null);
            setUploadedMediaUrl(null);
        }
    };

    const handleFetchSentiment = async (id: string) => {
        if (sentimentMap[id]?.loading) return;
        setSentimentMap(p => ({ ...p, [id]: { loading: true } }));
        try {
            const res = await fetchAISentiment(id);
            setSentimentMap(p => ({ ...p, [id]: { loading: false, sentiment: res.sentiment } }));
        } catch {
            setSentimentMap(p => ({ ...p, [id]: { loading: false, sentiment: "Unavailable" } }));
        }
    };

    const handleFetchSuggestionPills = async (conversationId: string) => {
        if (pillsLoading) return;
        setPillsLoading(true);
        setSuggestionPills([]);
        try {
            const res = await fetchAISuggestions(conversationId);
            setSuggestionPills(res.suggestions || []);
        } catch {
            setSuggestionPills([]);
        } finally {
            setPillsLoading(false);
        }
    };

    const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !onUploadMedia) return;
        setMediaUploading(true);
        try {
            const result = await onUploadMedia(file);
            if (result?.mediaId) {
                setUploadedMediaId(result.mediaId);
                setUploadedMediaUrl(result.url || null);
            }
        } catch {
            // toast already shown in hook
        } finally {
            setMediaUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleAddCustomLabel = async () => {
        if (!selectedConversation || !customLabelInput.trim()) return;
        const current = selectedConversation.labels || [];
        const trimmed = customLabelInput.trim();
        if (!current.includes(trimmed)) await onSetLabels(selectedConversation.id, [...current, trimmed]);
        setCustomLabelInput("");
    };

    const handleTogglePresetLabel = async (label: string) => {
        if (!selectedConversation) return;
        const current = selectedConversation.labels || [];
        const exists = current.includes(label);
        await onSetLabels(selectedConversation.id, exists ? current.filter(l => l !== label) : [...current, label]);
    };

    const handleRemoveLabel = async (label: string) => {
        if (!selectedConversation) return;
        await onSetLabels(selectedConversation.id, (selectedConversation.labels || []).filter(l => l !== label));
    };

    const filteredConversations = conversations.filter(conv => {
        const matchesTab = activeTab === "archived" ? Boolean(conv.archived) : !conv.archived;
        if (!matchesTab) return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return conv.contactName.toLowerCase().includes(q) || conv.contactPhone.toLowerCase().includes(q) || (conv.labels && conv.labels.some(l => l.toLowerCase().includes(q)));
    });

    const pinnedConversations   = filteredConversations.filter(c => c.pinned);
    const unpinnedConversations = filteredConversations.filter(c => !c.pinned);
    const inboxCount    = conversations.filter(c => !c.archived).length;
    const archivedCount = conversations.filter(c => c.archived).length;
    // null waStatus = endpoint unavailable/failed → show "N/A"
    // non-null waStatus = real response from backend → use connected field
    const isConnected: boolean | null = waStatus == null ? null : (waStatus.connected ?? true);

    const renderConversationCard = (conv: WhatsAppConversation) => {
        const lastMsg = conv.messages[conv.messages.length - 1];
        const isSelected = conv.id === selectedConversationId;
        return (
            <div key={conv.id}
                onClick={() => { setSelectedConversationId(conv.id); setShowMobileChat(true); }}
                className={`w-full text-left p-3.5 border-b border-gray-50 cursor-pointer transition-all duration-200 group hover:bg-gray-50/80 ${isSelected ? "bg-gradient-to-r from-blue-50/90 to-indigo-50/40 border-l-4 border-l-blue-600" : "border-l-4 border-l-transparent"}`}
            >
                <div className="flex justify-between items-start mb-1">
                    <span className={`font-semibold text-[14px] truncate max-w-[180px] ${isSelected ? "text-blue-900" : "text-gray-900"}`}>{conv.contactName}</span>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {lastMsg && <span className={`text-[11px] font-medium ${isSelected ? "text-blue-600" : "text-gray-400"}`}>{formatTime(lastMsg.timestamp)}</span>}
                        <div className="hidden group-hover:flex items-center gap-1 bg-white/90 rounded px-1 shadow-sm border border-gray-100" onClick={e => e.stopPropagation()}>
                            <button title={conv.pinned ? "Unpin" : "Pin"} onClick={() => onTogglePin(conv.id, !conv.pinned)} className={`p-1 rounded hover:bg-gray-100 transition-colors ${conv.pinned ? "text-blue-600" : "text-gray-400"}`}>{conv.pinned ? <PinOff size={13}/> : <Pin size={13}/>}</button>
                            <button title={conv.archived ? "Unarchive" : "Archive"} onClick={() => onToggleArchive(conv.id, !conv.archived)} className={`p-1 rounded hover:bg-gray-100 transition-colors ${conv.archived ? "text-blue-600" : "text-gray-400"}`}>{conv.archived ? <ArchiveRestore size={13}/> : <Archive size={13}/>}</button>
                        </div>
                    </div>
                </div>
                <div className="flex justify-between items-center gap-2 mb-1.5">
                    <p className="text-xs text-gray-500 truncate flex-1">{lastMsg ? lastMsg.text : "No messages"}</p>
                    {conv.unreadCount > 0 && <span className="shrink-0 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{conv.unreadCount}</span>}
                </div>
                {conv.labels && conv.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                        {conv.labels.map((lbl, i) => <span key={i} className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium border ${getLabelBadgeStyle(lbl)}`}>{lbl}</span>)}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="h-[calc(100vh-120px)] flex flex-col gap-4">
            {/* ── Page Header ── */}
            <div className="flex items-center justify-between pt-4 gap-3 flex-wrap">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">WhatsApp Workspace</h1>
                    <p className="text-[15px] text-gray-500 mt-1 font-medium">Manage labels, pinned chats, AI insights, and broadcast campaigns</p>
                </div>
                {/* Right header actions */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Connection status dot */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-white text-xs font-semibold cursor-pointer"
                        style={{ borderColor: isConnected === null ? "#e5e7eb" : isConnected ? "#bbf7d0" : "#fecaca" }}
                        onClick={() => refreshStatus?.()}
                        title={isConnected === null ? "Status endpoint unavailable" : isConnected ? "WhatsApp is connected" : "WhatsApp is disconnected — check backend config"}
                    >
                        {waStatusLoading
                            ? <RefreshCw size={12} className="animate-spin text-gray-400"/>
                            : isConnected === null
                                ? <Wifi size={12} className="text-gray-400"/>
                                : isConnected
                                    ? <Wifi size={12} className="text-green-500"/>
                                    : <WifiOff size={12} className="text-red-400"/>
                        }
                        <span style={{ color: isConnected === null ? "#6b7280" : isConnected ? "#16a34a" : "#dc2626" }}>
                            {waStatusLoading ? "Checking…" : isConnected === null ? "Status N/A" : isConnected ? "Connected" : "Not configured"}
                        </span>
                        {waStatus?.phoneNumber && <span className="text-gray-400 font-normal">· {waStatus.phoneNumber}</span>}
                    </div>
                    {/* Business Profile button */}
                    {onUpdateProfile && (
                        <button onClick={() => setShowProfileModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition">
                            <Building2 size={14} className="text-blue-600"/> Profile
                        </button>
                    )}
                    {/* Broadcast */}
                    <button onClick={() => setShowBroadcastModal(true)} className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2">
                        <Radio size={16}/><span>Broadcast</span>
                    </button>
                </div>
            </div>

            {/* Demo Banner */}
            {isDemoMode && (
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-orange-50 border border-orange-200 text-[13px] text-orange-800 font-medium shrink-0">
                    <AlertTriangle size={16} className="shrink-0 text-orange-600"/>
                    <span>Demo Mode: using mock data fallback. All label, pin, and archive actions work optimistically.</span>
                </div>
            )}

            {/* ── Main Panel ── */}
            <div className="flex-1 bg-white md:rounded-2xl md:border border-gray-100 shadow-sm overflow-hidden flex min-h-0">

                {/* ── Left: Conversation List ── */}
                <div className={`w-full md:w-[320px] border-r border-gray-100 flex flex-col bg-white shrink-0 ${showMobileChat ? "hidden md:flex" : "flex"}`}>
                    {/* Tabs */}
                    <div className="p-3 border-b border-gray-100 bg-gray-50/50 flex gap-2 shrink-0">
                        {(["inbox","archived"] as WhatsAppTab[]).map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab===tab ? "bg-white text-blue-600 shadow-sm border border-gray-200/80" : "text-gray-500 hover:text-gray-800 hover:bg-gray-100/50"}`}>
                                {tab==="inbox" ? <MessageCircle size={14}/> : <Archive size={14}/>}
                                {tab==="inbox" ? "Inbox" : "Archived"}
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab===tab ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-600"}`}>{tab==="inbox" ? inboxCount : archivedCount}</span>
                            </button>
                        ))}
                    </div>
                    {/* Search */}
                    <div className="p-3 border-b border-gray-100">
                        <input type="text" placeholder="Search chats or labels…" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:bg-white transition-all"/>
                    </div>
                    {/* List */}
                    <div className="flex-1 overflow-y-auto">
                        {error ? (
                            <div className="flex flex-col items-center justify-center h-full p-6 text-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500"><AlertCircle size={22}/></div>
                                <p className="text-xs font-semibold text-red-600">{error}</p>
                                {onRetry && <button onClick={onRetry} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium transition-colors"><RefreshCw size={13}/>Retry</button>}
                            </div>
                        ) : loading ? (
                            <div className="flex justify-center items-center h-full p-6"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"/></div>
                        ) : activeTab==="archived" ? (
                            filteredConversations.length===0 ? (
                                <div className="flex flex-col items-center justify-center h-full p-6 text-center gap-2"><Archive size={36} className="text-gray-300"/><p className="text-sm font-medium text-gray-700">No archived chats</p></div>
                            ) : (
                                <div>
                                    <div className="px-3 py-2 bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><Archive size={12} className="text-blue-600"/>Archived ({filteredConversations.length})</div>
                                    {filteredConversations.map(renderConversationCard)}
                                </div>
                            )
                        ) : (
                            <div>
                                <div className="border-b border-gray-100">
                                    <div className="px-3 py-2 bg-blue-50/40 border-b border-blue-100/50 text-[11px] font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5"><Pin size={12} className="text-blue-600 fill-blue-600"/>Pinned ({pinnedConversations.length})</div>
                                    {pinnedConversations.length===0 ? <div className="p-3 text-center text-xs text-gray-400 italic bg-gray-50/30">No pinned chats yet. Hover a chat to pin it.</div> : pinnedConversations.map(renderConversationCard)}
                                </div>
                                <div>
                                    <div className="px-3 py-2 bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">All Messages ({unpinnedConversations.length})</div>
                                    {unpinnedConversations.length===0 ? <div className="flex flex-col items-center justify-center p-8 text-center gap-2"><MessageCircle size={32} className="text-gray-300"/><p className="text-xs font-medium text-gray-600">No conversations found.</p></div> : unpinnedConversations.map(renderConversationCard)}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Right: Chat Window + AI Panel ── */}
                <div className={`flex-1 flex bg-gray-50/30 min-w-0 ${!showMobileChat ? "hidden md:flex" : "flex"}`}>
                    {selectedConversation ? (
                        <>
                        <div className="flex-1 flex flex-col min-w-0">
                            {/* Chat Header — single row, no wrap */}
                            <div className="px-4 py-3 border-b border-gray-100 bg-white flex items-center gap-2 shrink-0 overflow-x-auto">
                                <button onClick={() => setShowMobileChat(false)} className="md:hidden p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-500 shrink-0"><ChevronLeft size={20}/></button>
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 shrink-0 border border-blue-200/50"><User size={18}/></div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <h3 className="font-bold text-gray-900 text-[14px] tracking-tight truncate">{selectedConversation.contactName}</h3>
                                        {selectedConversation.leadStatus && <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-200 shrink-0">{selectedConversation.leadStatus}</span>}
                                        {/* Sentiment pill */}
                                        <button onClick={() => handleFetchSentiment(selectedConversation.id)} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors shrink-0" title="Check sentiment">
                                            <span>📊</span>
                                            {sentimentMap[selectedConversation.id]?.loading ? <RefreshCw size={10} className="animate-spin"/> : sentimentMap[selectedConversation.id]?.sentiment ? <span>({sentimentMap[selectedConversation.id].sentiment})</span> : <span>Sentiment</span>}
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-400 truncate">{selectedConversation.contactPhone}</p>
                                </div>
                                {/* Header toolbar — icon-only buttons to save space */}
                                <div className="flex items-center gap-1 shrink-0">
                                    <button onClick={() => setShowAIInsights(!showAIInsights)} title="✨ AI Summary" className={`h-8 px-2.5 rounded-lg border text-[11px] font-medium flex items-center gap-1 transition-colors ${showAIInsights ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}>
                                        <Sparkles size={13} className="text-indigo-500"/><span className="hidden lg:inline">AI Summary</span>
                                    </button>
                                    <button onClick={() => handleFetchSuggestionPills(selectedConversation.id)} disabled={pillsLoading} title="💡 Suggestions" className={`h-8 px-2.5 rounded-lg border text-[11px] font-medium flex items-center gap-1 transition-colors disabled:opacity-60 ${suggestionPills.length>0 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}>
                                        <Sparkles size={13} className="text-emerald-500"/><span className="hidden lg:inline">Suggest</span>{pillsLoading && <RefreshCw size={10} className="animate-spin"/>}
                                    </button>
                                    <button onClick={() => setShowLabelManager(!showLabelManager)} title="Labels" className={`h-8 w-8 flex items-center justify-center rounded-lg border transition-colors ${showLabelManager ? "border-purple-200 bg-purple-50 text-purple-700" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}><Tag size={14}/></button>
                                    <button onClick={() => onTogglePin(selectedConversation.id, !selectedConversation.pinned)} title={selectedConversation.pinned ? "Unpin" : "Pin"} className={`h-8 w-8 flex items-center justify-center rounded-lg border transition-colors ${selectedConversation.pinned ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}>{selectedConversation.pinned ? <PinOff size={14}/> : <Pin size={14}/>}</button>
                                    <button onClick={() => onToggleArchive(selectedConversation.id, !selectedConversation.archived)} title={selectedConversation.archived ? "Unarchive" : "Archive"} className={`h-8 w-8 flex items-center justify-center rounded-lg border transition-colors ${selectedConversation.archived ? "bg-amber-50 border-amber-200 text-amber-600" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}>{selectedConversation.archived ? <ArchiveRestore size={14}/> : <Archive size={14}/>}</button>
                                    {!selectedConversation.leadId && <button onClick={() => router.push(`/leads/new?phone=${encodeURIComponent(selectedConversation.contactPhone)}&name=${encodeURIComponent(selectedConversation.contactName)}`)} className="hidden sm:flex items-center gap-1 h-8 px-2.5 rounded-lg border border-gray-200 bg-white text-[11px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"><Plus size={13}/>Lead</button>}
                                </div>
                            </div>

                            {/* Label Manager */}
                            {showLabelManager && (
                                <div className="bg-purple-50/60 border-b border-purple-100 p-3 shrink-0">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-1.5"><Tag size={13} className="text-purple-700"/><h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider">Labels</h4></div>
                                        <button onClick={() => setShowLabelManager(false)} className="text-gray-400 hover:text-gray-600"><X size={15}/></button>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                        {(!selectedConversation.labels || selectedConversation.labels.length===0) ? <span className="text-xs text-gray-400 italic">No labels. Pick a preset or add custom.</span> : selectedConversation.labels.map((lbl,i) => (
                                            <span key={i} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${getLabelBadgeStyle(lbl)}`}>{lbl}<button onClick={() => handleRemoveLabel(lbl)} className="hover:text-red-600"><X size={11}/></button></span>
                                        ))}
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                        {PRESET_LABELS.map(p => { const active = selectedConversation.labels?.includes(p); return (
                                            <button key={p} onClick={() => handleTogglePresetLabel(p)} className={`px-2 py-0.5 rounded-md text-xs font-medium flex items-center gap-1 border transition-all ${active ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100"}`}>{active && <Check size={11}/>}{p}</button>
                                        );})}
                                    </div>
                                    <div className="flex gap-2">
                                        <input type="text" placeholder="Custom label…" value={customLabelInput} onChange={e=>setCustomLabelInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleAddCustomLabel()} className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-purple-500"/>
                                        <button onClick={handleAddCustomLabel} disabled={!customLabelInput.trim()} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg">Add</button>
                                    </div>
                                </div>
                            )}

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {selectedConversation.messages.map(msg => {
                                    const isUser = msg.sender==="user";
                                    return (
                                        <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                                            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm ${isUser ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-br-sm" : "bg-white border border-gray-100 text-gray-800 rounded-bl-sm"}`}>
                                                <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                                                <p className={`text-[11px] mt-1 text-right font-medium ${isUser ? "text-blue-100/80" : "text-gray-400"}`}>{formatTime(msg.timestamp)}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef}/>
                            </div>

                            {/* Input Area */}
                            <div className="p-3 bg-white border-t border-gray-100 shrink-0">
                                {/* Suggestion pills */}
                                {(suggestionPills.length>0 || pillsLoading) && (
                                    <div className="mb-2">
                                        {pillsLoading ? (
                                            <div className="flex items-center gap-2 text-[11px] text-indigo-600 font-medium"><RefreshCw size={11} className="animate-spin"/>Generating suggestions…</div>
                                        ) : (
                                            <div className="flex flex-wrap gap-1.5">
                                                {suggestionPills.map((pill,i) => (
                                                    <button key={i} type="button" onClick={() => setMessageInput(pill)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-medium hover:bg-indigo-100 transition-colors max-w-[220px]" title={pill}>
                                                        <Sparkles size={10} className="text-indigo-400 shrink-0"/><span className="truncate">{pill}</span>
                                                    </button>
                                                ))}
                                                <button type="button" onClick={() => setSuggestionPills([])} className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-500 border border-gray-200 text-xs hover:bg-gray-200 transition-colors"><X size={10}/></button>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {/* Uploaded media preview */}
                                {uploadedMediaId && (
                                    <div className="mb-2 flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-100 text-xs text-blue-700 font-medium">
                                        <Image size={13}/>{uploadedMediaUrl ? <a href={uploadedMediaUrl} target="_blank" rel="noopener noreferrer" className="underline truncate max-w-[200px]">Media attached</a> : <span>Media ID: {uploadedMediaId}</span>}
                                        <button onClick={() => { setUploadedMediaId(null); setUploadedMediaUrl(null); }} className="ml-auto text-blue-400 hover:text-red-500"><X size={12}/></button>
                                    </div>
                                )}
                                <div className="flex gap-2 items-center">
                                    {/* Media upload */}
                                    {onUploadMedia && (
                                        <>
                                            <input ref={fileInputRef} type="file" accept="image/*,video/*,audio/*,application/pdf" className="hidden" onChange={handleMediaUpload}/>
                                            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={mediaUploading} title="Attach media" className="h-10 w-10 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50 shrink-0">
                                                {mediaUploading ? <RefreshCw size={16} className="animate-spin"/> : <Paperclip size={16}/>}
                                            </button>
                                        </>
                                    )}
                                    <input type="text" placeholder="Type a message…" value={messageInput} onChange={e=>setMessageInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSend()} className="flex-1 rounded-2xl border border-gray-200 px-4 py-2.5 text-[14px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all bg-gray-50/50 focus:bg-white shadow-sm"/>
                                    <button onClick={handleSend} disabled={!messageInput.trim()||sending} className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white w-10 h-10 rounded-2xl flex items-center justify-center hover:shadow-lg disabled:opacity-50 transition-all shrink-0 shadow-md shadow-blue-200"><Send size={16} className="ml-0.5"/></button>
                                </div>
                            </div>
                        </div>
                        {/* AI Insights side panel */}
                        {showAIInsights && (
                            <AIInsightsPanel conversationId={selectedConversation.id} contactName={selectedConversation.contactName} onSelectSuggestion={text=>setMessageInput(text)} onClose={() => setShowAIInsights(false)}/>
                        )}
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                            <MessageCircle size={48} className="mb-4 opacity-20"/>
                            <p className="text-sm font-medium">Select a conversation to start messaging</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <BroadcastComposerModal isOpen={showBroadcastModal} onClose={() => setShowBroadcastModal(false)}/>
            {showProfileModal && onUpdateProfile && (
                <BusinessProfileModal profile={waProfile||null} onClose={() => setShowProfileModal(false)} onSave={onUpdateProfile}/>
            )}
        </div>
    );
}
