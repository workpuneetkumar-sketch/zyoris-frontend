"use client";

import { useState } from "react";
import {
    Plus,
    Search,
    Mail,
    Send,
    X,
    AlertCircle,
    RefreshCw,
    ChevronRight,
    Inbox,
    Send as SendIcon,
    Layers
} from "lucide-react";
import { EmailLog, SendEmailPayload } from "@/lib/api/emailApi";
import { EmailThread } from "@/hooks/useEmail";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
    try {
        const d = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        const oneDayMs = 86_400_000;
        if (diff < oneDayMs && d.getDate() === now.getDate()) {
            return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
        }
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
        return "—";
    }
}

function formatFullDate(dateStr: string): string {
    try {
        return new Date(dateStr).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return "—";
    }
}

function getInitials(email: string): string {
    const local = email.split("@")[0] ?? "";
    return local
        .split(/[.\-_+]/)
        .filter(Boolean)
        .map((p) => p[0]?.toUpperCase() ?? "")
        .join("")
        .slice(0, 2) || "?";
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ email }: { email: string }) {
    return (
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 text-[13px] font-bold flex items-center justify-center shrink-0 shadow-sm border border-blue-200/50">
            {getInitials(email)}
        </div>
    );
}

// ── Compose Modal ─────────────────────────────────────────────────────────────

interface ComposeModalProps {
    sending: boolean;
    sendError: string | null;
    onClose: () => void;
    onSend: (data: SendEmailPayload) => Promise<boolean>;
}

function ComposeModal({ sending, sendError, onClose, onSend }: ComposeModalProps) {
    const [form, setForm] = useState<SendEmailPayload>({ to: "", subject: "", body: "" });
    const [errors, setErrors] = useState<Partial<Record<keyof SendEmailPayload, string>>>({});

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        if (errors[e.target.name as keyof SendEmailPayload]) {
            setErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
        }
    };

    const handleSend = async () => {
        const newErrors: Partial<Record<keyof SendEmailPayload, string>> = {};
        if (!form.to.trim())      newErrors.to      = "Recipient email is required";
        if (!form.subject.trim()) newErrors.subject  = "Subject is required";
        if (!form.body.trim())    newErrors.body     = "Body cannot be empty";
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }
        await onSend(form);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-gray-50 w-full max-w-xl rounded-2xl shadow-xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 bg-white border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-semibold tracking-tight text-gray-900">New Email</h2>
                        <p className="text-sm text-gray-500 mt-1">Compose and send an email</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                    >
                        <X size={16} className="text-gray-500" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {sendError && (
                        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-[13px] text-red-600">
                            <AlertCircle size={15} className="shrink-0" />
                            {sendError}
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">To *</label>
                        <input
                            name="to"
                            type="email"
                            value={form.to}
                            onChange={handleChange}
                            placeholder="recipient@example.com"
                            className={`w-full h-10 rounded-lg border px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-blue-500 ${errors.to ? "border-red-400 bg-red-50/30" : "border-gray-300 focus:border-blue-500"}`}
                        />
                        {errors.to && <p className="text-xs text-red-500 mt-1">{errors.to}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject *</label>
                        <input
                            name="subject"
                            value={form.subject}
                            onChange={handleChange}
                            placeholder="Email subject..."
                            className={`w-full h-10 rounded-lg border px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-blue-500 ${errors.subject ? "border-red-400 bg-red-50/30" : "border-gray-300 focus:border-blue-500"}`}
                        />
                        {errors.subject && <p className="text-xs text-red-500 mt-1">{errors.subject}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Body *</label>
                        <textarea
                            name="body"
                            value={form.body}
                            onChange={handleChange}
                            placeholder="Write your message here..."
                            rows={7}
                            className={`w-full rounded-xl border px-4 py-3 text-[15px] outline-none resize-none transition-all duration-200 focus:ring-4 focus:ring-blue-500/20 ${errors.body ? "border-red-400 bg-red-50/30" : "border-gray-200 focus:border-blue-500"}`}
                        />
                        {errors.body && <p className="text-xs text-red-500 mt-1">{errors.body}</p>}
                    </div>
                </div>

                <div className="flex items-center justify-between gap-3 px-6 py-5 bg-gray-50/50 border-t border-gray-100">
                    <p className="text-[13px] text-gray-500">All fields marked * are required</p>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="h-10 px-5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-white hover:shadow-sm"
                        >
                            Discard
                        </button>
                        <button
                            onClick={handleSend}
                            disabled={sending}
                            className="flex items-center gap-2 h-10 px-6 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-70"
                        >
                            <Send size={16} />
                            {sending ? "Sending..." : "Send Email"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Email Detail Panel (Thread View) ──────────────────────────────────────────

function EmailDetailPanel({ thread, onClose }: { thread: EmailThread; onClose: () => void }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col h-[calc(100vh-140px)] sticky top-6 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white shrink-0">
                <p className="text-[13px] font-semibold text-gray-700 uppercase tracking-wide">
                    Conversation
                </p>
                <button
                    onClick={onClose}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X size={14} />
                </button>
            </div>
            
            <div className="px-5 py-4 border-b border-gray-50 bg-gray-50/50">
                <h2 className="text-[18px] font-bold text-gray-900 leading-snug">
                    {thread.subject}
                </h2>
                <div className="flex gap-2 mt-2">
                    {thread.labels.map(label => (
                        <span key={label} className="px-2 py-0.5 rounded-md bg-gray-200 text-gray-700 text-[11px] font-medium">
                            {label}
                        </span>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {thread.emails.map((email, idx) => (
                    <div key={email.id || idx} className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <Avatar email={email.from || email.to} />
                                <div>
                                    <p className="text-[13px] font-bold text-gray-900">
                                        {email.from ? email.from : "You"}
                                    </p>
                                    <p className="text-[11px] text-gray-500">
                                        to {email.to}
                                    </p>
                                </div>
                            </div>
                            <span className="text-[12px] text-gray-400">
                                {formatFullDate(email.sentAt ?? email.createdAt)}
                            </span>
                        </div>
                        <div className="text-[13px] text-gray-700 whitespace-pre-wrap leading-relaxed mt-2 pl-[52px]">
                            {email.body || <span className="text-gray-300 italic">No content</span>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface EmailUIProps {
    threads: EmailThread[];
    filteredThreads: EmailThread[];
    total: number;
    loading: boolean;
    error: string | null;
    isComposeOpen: boolean;
    sending: boolean;
    sendError: string | null;
    syncing: boolean;
    selectedThread: EmailThread | null;
    search: string;
    selectedLabel: string;
    onSearchChange: (s: string) => void;
    onLabelChange: (label: string) => void;
    onOpenCompose: () => void;
    onCloseCompose: () => void;
    onSendEmail: (data: SendEmailPayload) => Promise<boolean>;
    onSyncEmails: () => Promise<void>;
    onSelectThread: (thread: EmailThread | null) => void;
    onRetry: () => void;
}

// ── Main Component ────────────────────────────────────────────────────────────

export function EmailUI({
    filteredThreads,
    total,
    loading,
    error,
    isComposeOpen,
    sending,
    sendError,
    syncing,
    selectedThread,
    search,
    selectedLabel,
    onSearchChange,
    onLabelChange,
    onOpenCompose,
    onCloseCompose,
    onSendEmail,
    onSyncEmails,
    onSelectThread,
    onRetry,
}: EmailUIProps) {

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
                <AlertCircle size={32} className="text-red-400" />
                <p className="text-red-500 text-sm">{error}</p>
                <button
                    onClick={onRetry}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    const navLabels = [
        { name: "All", icon: <Layers size={16} /> },
        { name: "Inbox", icon: <Inbox size={16} /> },
        { name: "Sent", icon: <SendIcon size={16} /> }
    ];

    return (
        <div className="min-h-full space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">Email Hub</h1>
                    <p className="text-[15px] text-gray-500 mt-1.5 font-medium">
                        Send, track, and manage all your external communications.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={onSyncEmails}
                        disabled={loading || syncing}
                        className="flex items-center gap-2 h-10 px-4 rounded-xl border border-gray-200 bg-white shadow-sm text-[14px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={(loading || syncing) ? "animate-spin text-blue-600" : ""} />
                        Sync
                    </button>
                    <button
                        onClick={onOpenCompose}
                        className="flex items-center gap-2 h-10 px-5 rounded-xl bg-blue-600 text-white text-[14px] font-bold hover:bg-blue-700"
                    >
                        <Plus size={18} />
                        Compose
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-[200px_1fr] gap-5 items-start">
                
                {/* ── Left Sidebar: Labels ── */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-1 sticky top-6">
                    <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-3 mb-2">Folders</div>
                    {navLabels.map(label => (
                        <button
                            key={label.name}
                            onClick={() => {
                                onLabelChange(label.name);
                                onSelectThread(null);
                            }}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-colors ${
                                selectedLabel === label.name
                                    ? "bg-blue-50 text-blue-700"
                                    : "text-gray-600 hover:bg-gray-50"
                            }`}
                        >
                            <span className={selectedLabel === label.name ? "text-blue-600" : "text-gray-400"}>
                                {label.icon}
                            </span>
                            {label.name}
                        </button>
                    ))}
                </div>

                {/* ── Main Content Area ── */}
                <div className={selectedThread ? "grid grid-cols-[1fr_400px] gap-5 items-start" : ""}>
                    
                    {/* Thread List */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gray-50/30">
                            <div className="flex items-center gap-2.5">
                                <span className="text-[15px] font-bold text-gray-800 tracking-tight">
                                    {selectedLabel}
                                </span>
                                {!loading && total > 0 && (
                                    <span className="px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600 text-[12px] font-bold shadow-sm">
                                        {total} threads
                                    </span>
                                )}
                            </div>
                            <div className="relative group">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500" />
                                <input
                                    type="text"
                                    placeholder="Search threads..."
                                    value={search}
                                    onChange={(e) => onSearchChange(e.target.value)}
                                    className="h-9 pl-9 pr-4 rounded-xl border border-gray-200 bg-gray-50/50 text-[14px] text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Participants</th>
                                        <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Subject</th>
                                        <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Date</th>
                                        <th className="px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={4} className="py-16 text-center">
                                                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                            </td>
                                        </tr>
                                    ) : filteredThreads.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="text-center py-16">
                                                <Mail size={32} className="text-gray-200 mx-auto mb-3" />
                                                <p className="text-gray-400 text-sm font-medium">
                                                    {search ? "No threads match your search." : "No threads found."}
                                                </p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredThreads.map((thread) => {
                                            const isSelected = selectedThread?.id === thread.id;
                                            return (
                                                <tr
                                                    key={thread.id}
                                                    onClick={() => onSelectThread(isSelected ? null : thread)}
                                                    className={`border-b border-gray-50 cursor-pointer transition-colors ${
                                                        isSelected ? "bg-blue-50/60" : "hover:bg-gray-50/60"
                                                    }`}
                                                >
                                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                                        <div className="flex items-center gap-2.5">
                                                            <Avatar email={thread.participants[0] || "?"} />
                                                            <span className="text-[13px] font-bold text-gray-800 max-w-[130px] truncate">
                                                                {thread.participants.join(", ")}
                                                            </span>
                                                            {thread.emails.length > 1 && (
                                                                <span className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 text-[11px] font-bold">
                                                                    {thread.emails.length}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3.5 max-w-[200px]">
                                                        <p className="text-[13px] font-medium text-gray-900 truncate">
                                                            {thread.subject}
                                                        </p>
                                                        <p className="text-[12px] text-gray-400 truncate mt-0.5">
                                                            {thread.latestPreview}
                                                        </p>
                                                    </td>
                                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                                        <span className="text-[12px] text-gray-400">
                                                            {formatDate(thread.latestDate)}
                                                        </span>
                                                    </td>
                                                    <td className="pr-4 py-3.5 whitespace-nowrap text-right">
                                                        <ChevronRight
                                                            size={15}
                                                            className={`inline-block transition-colors ${
                                                                isSelected ? "text-blue-500" : "text-gray-300"
                                                            }`}
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Thread Detail */}
                    {selectedThread && (
                        <EmailDetailPanel
                            thread={selectedThread}
                            onClose={() => onSelectThread(null)}
                        />
                    )}
                </div>
            </div>

            {isComposeOpen && (
                <ComposeModal
                    sending={sending}
                    sendError={sendError}
                    onClose={onCloseCompose}
                    onSend={onSendEmail}
                />
            )}
        </div>
    );
}
