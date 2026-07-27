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
    FileText,
    Trash2,
    ExternalLink,
    CheckCircle2,
    ShieldAlert,
} from "lucide-react";
import { EmailLog, SendEmailPayload } from "@/lib/api/emailApi";
import { EmailThread, FolderTab } from "@/hooks/useEmail";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "—";
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
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "—";
        return d.toLocaleString("en-US", {
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
    if (!email) return "?";
    const local = email.split("@")[0] ?? "";
    return local
        .split(/[.\-_+]/)
        .filter(Boolean)
        .map((p) => p[0]?.toUpperCase() ?? "")
        .join("")
        .slice(0, 2) || "?";
}

// ── Avatar Component ──────────────────────────────────────────────────────────

function Avatar({ email }: { email: string }) {
    return (
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-[13px] font-bold flex items-center justify-center shrink-0 shadow-sm border border-blue-400/30">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between px-6 py-5 bg-gray-50/80 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-gray-900">New Message</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Compose and dispatch email</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 text-gray-500 transition-colors"
                    >
                        <X size={16} />
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
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">To *</label>
                        <input
                            name="to"
                            type="email"
                            value={form.to}
                            onChange={handleChange}
                            placeholder="recipient@example.com"
                            className={`w-full h-10 rounded-xl border px-3.5 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500/20 ${errors.to ? "border-red-400 bg-red-50/30" : "border-gray-200 focus:border-blue-500"}`}
                        />
                        {errors.to && <p className="text-xs text-red-500 mt-1">{errors.to}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">Subject *</label>
                        <input
                            name="subject"
                            value={form.subject}
                            onChange={handleChange}
                            placeholder="Email subject..."
                            className={`w-full h-10 rounded-xl border px-3.5 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500/20 ${errors.subject ? "border-red-400 bg-red-50/30" : "border-gray-200 focus:border-blue-500"}`}
                        />
                        {errors.subject && <p className="text-xs text-red-500 mt-1">{errors.subject}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">Body *</label>
                        <textarea
                            name="body"
                            value={form.body}
                            onChange={handleChange}
                            placeholder="Write your message here..."
                            rows={6}
                            className={`w-full rounded-xl border px-4 py-3 text-sm outline-none resize-none transition-all focus:ring-2 focus:ring-blue-500/20 ${errors.body ? "border-red-400 bg-red-50/30" : "border-gray-200 focus:border-blue-500"}`}
                        />
                        {errors.body && <p className="text-xs text-red-500 mt-1">{errors.body}</p>}
                    </div>
                </div>

                <div className="flex items-center justify-between gap-3 px-6 py-4 bg-gray-50/80 border-t border-gray-100">
                    <p className="text-xs text-gray-400">All fields marked * are required</p>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="h-10 px-5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-white hover:shadow-sm transition-all"
                        >
                            Discard
                        </button>
                        <button
                            onClick={handleSend}
                            disabled={sending}
                            className="flex items-center gap-2 h-10 px-6 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-98 transition-all disabled:opacity-60 shadow-sm shadow-blue-500/20"
                        >
                            <Send size={15} />
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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col h-[calc(100vh-160px)] sticky top-6 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white shrink-0">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Conversation
                </span>
                <button
                    onClick={onClose}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X size={15} />
                </button>
            </div>

            <div className="px-5 py-4 border-b border-gray-50 bg-gray-50/50">
                <h2 className="text-base font-bold text-gray-900 leading-snug">
                    {thread.subject}
                </h2>
                <div className="flex gap-2 mt-2">
                    {thread.labels.map((label) => (
                        <span key={label} className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-medium border border-blue-100">
                            {label}
                        </span>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {thread.emails.map((email, idx) => (
                    <div key={email.id || idx} className="bg-white border border-gray-100 rounded-xl shadow-xs p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <Avatar email={email.from || email.to} />
                                <div>
                                    <p className="text-[13px] font-bold text-gray-900">
                                        {email.from ? email.from : "You"}
                                    </p>
                                    <p className="text-[11px] text-gray-400">
                                        to {email.to}
                                    </p>
                                </div>
                            </div>
                            <span className="text-[11px] text-gray-400">
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

// ── EmailUI Props ─────────────────────────────────────────────────────────────

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
    selectedLabel: FolderTab;
    connectingGmail: boolean;
    gmailConnectError: string | null;
    onSearchChange: (s: string) => void;
    onLabelChange: (label: FolderTab) => void;
    onOpenCompose: () => void;
    onCloseCompose: () => void;
    onSendEmail: (data: SendEmailPayload) => Promise<boolean>;
    onSyncEmails: () => Promise<void>;
    onConnectGmail: () => Promise<void>;
    onSelectThread: (thread: EmailThread | null) => void;
    onRetry: () => void;
}

// ── Folder Config ─────────────────────────────────────────────────────────────

const FOLDER_TABS: { id: FolderTab; label: string; icon: React.ReactNode; emptyMsg: string }[] = [
    { id: "Inbox", label: "Inbox", icon: <Inbox size={16} />, emptyMsg: "Your Inbox is empty." },
    { id: "Sent", label: "Sent", icon: <SendIcon size={16} />, emptyMsg: "No sent emails found." },
    { id: "Drafts", label: "Drafts", icon: <FileText size={16} />, emptyMsg: "No draft emails saved." },
    { id: "Trash", label: "Trash", icon: <Trash2 size={16} />, emptyMsg: "Trash is empty." },
];

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
    connectingGmail,
    gmailConnectError,
    onSearchChange,
    onLabelChange,
    onOpenCompose,
    onCloseCompose,
    onSendEmail,
    onSyncEmails,
    onConnectGmail,
    onSelectThread,
    onRetry,
}: EmailUIProps) {
    const currentFolder = FOLDER_TABS.find((t) => t.id === selectedLabel) || FOLDER_TABS[0];

    return (
        <div className="min-h-full space-y-5">
            {/* Header & Page Title */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Email Workspace</h1>
                    <p className="text-xs text-gray-500 mt-1 font-medium">
                        Manage your Inbox, Sent, Drafts, and Trash communications.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={onSyncEmails}
                        disabled={loading || syncing}
                        className="flex items-center gap-2 h-10 px-4 rounded-xl border border-gray-200 bg-white shadow-xs text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50"
                    >
                        <RefreshCw size={15} className={loading || syncing ? "animate-spin text-blue-600" : ""} />
                        Sync
                    </button>
                    <button
                        onClick={onOpenCompose}
                        className="flex items-center gap-2 h-10 px-5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 active:scale-98 transition-all shadow-sm shadow-blue-500/20"
                    >
                        <Plus size={16} />
                        Compose
                    </button>
                </div>
            </div>

            {/* Gmail Connect Banner / Screen */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-sm border border-blue-800/40 relative overflow-hidden">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
                    <div className="space-y-1 max-w-xl">
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[10px] font-bold uppercase tracking-wider">
                                OAuth Integration
                            </span>
                            <span className="flex items-center gap-1 text-[11px] text-blue-200/80">
                                <CheckCircle2 size={12} className="text-emerald-400" /> Gmail Engine Ready
                            </span>
                        </div>
                        <h2 className="text-lg font-bold text-white tracking-tight">Connect Your Gmail Account</h2>
                        <p className="text-xs text-blue-100/70 leading-relaxed">
                            Authorize ZyOris to sync sent messages, drafts, and incoming replies directly into your organization workspace.
                        </p>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-2 w-full md:w-auto">
                        <button
                            onClick={onConnectGmail}
                            disabled={connectingGmail}
                            className="flex items-center justify-center gap-2.5 h-11 px-6 w-full md:w-auto rounded-xl bg-white text-blue-950 hover:bg-blue-50 text-xs font-bold transition-all shadow-md active:scale-98 disabled:opacity-60"
                        >
                            {connectingGmail ? (
                                <>
                                    <RefreshCw size={15} className="animate-spin text-blue-700" />
                                    Connecting to Google...
                                </>
                            ) : (
                                <>
                                    <ExternalLink size={15} className="text-blue-700" />
                                    Connect Gmail
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Inline Error for Gmail Connect 400 / Org missing */}
                {gmailConnectError && (
                    <div className="mt-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-200 text-xs relative z-10 animate-in fade-in duration-150">
                        <ShieldAlert size={16} className="text-red-400 shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold text-red-300">Connection Failed: </span>
                            {gmailConnectError}
                        </div>
                    </div>
                )}
            </div>

            {/* Global API Error State (e.g. 401 / 400 / Network Error) */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-red-900">Failed to Load Workspace Emails</h3>
                        <p className="text-xs text-red-600 max-w-md mx-auto mt-1">{error}</p>
                    </div>
                    <button
                        onClick={onRetry}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors shadow-xs"
                    >
                        <RefreshCw size={14} />
                        Retry Request
                    </button>
                </div>
            )}

            {/* Workspace Grid */}
            {!error && (
                <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-5 items-start">
                    {/* Left Sidebar Tabs */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-3 flex flex-col gap-1 sticky top-6">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 my-2">
                            Folders
                        </div>
                        {FOLDER_TABS.map((tab) => {
                            const isActive = selectedLabel === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => onLabelChange(tab.id)}
                                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                                        isActive
                                            ? "bg-blue-50 text-blue-700 border border-blue-100/80 shadow-xs"
                                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                    }`}
                                >
                                    <span className={isActive ? "text-blue-600" : "text-gray-400"}>
                                        {tab.icon}
                                    </span>
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Main Content Area */}
                    <div className={selectedThread ? "grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 items-start" : ""}>
                        {/* List View Card */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                            {/* Search & Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/40">
                                <div className="flex items-center gap-2.5">
                                    <span className="text-sm font-bold text-gray-800 tracking-tight flex items-center gap-2">
                                        {currentFolder.icon}
                                        {selectedLabel}
                                    </span>
                                    {!loading && total > 0 && (
                                        <span className="px-2.5 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600 text-[11px] font-bold shadow-xs">
                                            {total} {total === 1 ? "thread" : "threads"}
                                        </span>
                                    )}
                                </div>
                                <div className="relative">
                                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder={`Search ${selectedLabel.toLowerCase()}...`}
                                        value={search}
                                        onChange={(e) => onSearchChange(e.target.value)}
                                        className="h-9 pl-9 pr-4 rounded-xl border border-gray-200 bg-white text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full sm:w-64 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Table List */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-gray-100 bg-gray-50/20">
                                            <th className="px-5 py-3 font-semibold text-gray-400 uppercase tracking-wider">
                                                {selectedLabel === "Sent" ? "Recipient" : "Sender / To"}
                                            </th>
                                            <th className="px-5 py-3 font-semibold text-gray-400 uppercase tracking-wider">
                                                Subject & Snippet
                                            </th>
                                            <th className="px-5 py-3 font-semibold text-gray-400 uppercase tracking-wider">
                                                Date
                                            </th>
                                            <th className="pr-4 py-3 font-semibold text-gray-400 uppercase tracking-wider"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr>
                                                <td colSpan={4} className="py-16 text-center">
                                                    <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600">
                                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                                                        Loading {selectedLabel.toLowerCase()} emails...
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : filteredThreads.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="text-center py-16">
                                                    <Mail size={32} className="text-gray-300 mx-auto mb-3" />
                                                    <p className="text-gray-500 text-xs font-semibold">
                                                        {search ? "No emails match your search filter." : currentFolder.emptyMsg}
                                                    </p>
                                                    <p className="text-gray-400 text-[11px] mt-1">
                                                        {search ? "Try searching with a different term." : `Emails in ${selectedLabel} will appear here.`}
                                                    </p>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredThreads.map((thread) => {
                                                const isSelected = selectedThread?.id === thread.id;
                                                const displayEmail = thread.participants[0] || "Unknown";
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
                                                                <Avatar email={displayEmail} />
                                                                <div className="max-w-[140px] truncate">
                                                                    <p className="font-bold text-gray-800 text-xs truncate">
                                                                        {displayEmail}
                                                                    </p>
                                                                    {thread.emails.length > 1 && (
                                                                        <span className="inline-block px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-bold mt-0.5">
                                                                            {thread.emails.length} messages
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-3.5 max-w-[240px]">
                                                            <p className="font-semibold text-gray-900 truncate text-xs">
                                                                {thread.subject}
                                                            </p>
                                                            <p className="text-gray-400 truncate text-[11px] mt-0.5">
                                                                {thread.latestPreview}
                                                            </p>
                                                        </td>
                                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                                            <span className="text-[11px] text-gray-400 font-medium">
                                                                {formatDate(thread.latestDate)}
                                                            </span>
                                                        </td>
                                                        <td className="pr-4 py-3.5 whitespace-nowrap text-right">
                                                            <ChevronRight
                                                                size={16}
                                                                className={`inline-block transition-colors ${
                                                                    isSelected ? "text-blue-600" : "text-gray-300"
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

                        {/* Thread Detail Drawer */}
                        {selectedThread && (
                            <EmailDetailPanel
                                thread={selectedThread}
                                onClose={() => onSelectThread(null)}
                            />
                        )}
                    </div>
                </div>
            )}

            {/* Compose Email Modal */}
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
