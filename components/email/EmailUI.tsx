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
    Filter,
    Inbox,
} from "lucide-react";
import { EmailLog, SendEmailPayload } from "@/lib/api/emailApi";

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
        // Clear error on change
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
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 bg-white border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-semibold tracking-tight text-gray-900">New Email</h2>
                        <p className="text-sm text-gray-500 mt-1">Compose and send an email to your contact</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                        aria-label="Close"
                    >
                        <X size={16} className="text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    {sendError && (
                        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-[13px] text-red-600">
                            <AlertCircle size={15} className="shrink-0" />
                            {sendError}
                        </div>
                    )}

                    {/* To */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            To <span className="text-red-500">*</span>
                        </label>
                        <input
                            name="to"
                            type="email"
                            value={form.to}
                            onChange={handleChange}
                            placeholder="recipient@example.com"
                            className={`w-full h-10 rounded-lg border px-3 text-sm text-gray-900 outline-none transition-colors focus:ring-2 focus:ring-blue-500 ${
                                errors.to ? "border-red-400 bg-red-50/30" : "border-gray-300 focus:border-blue-500"
                            }`}
                        />
                        {errors.to && <p className="text-xs text-red-500 mt-1">{errors.to}</p>}
                    </div>

                    {/* Subject */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Subject <span className="text-red-500">*</span>
                        </label>
                        <input
                            name="subject"
                            value={form.subject}
                            onChange={handleChange}
                            placeholder="Email subject..."
                            className={`w-full h-10 rounded-lg border px-3 text-sm text-gray-900 outline-none transition-colors focus:ring-2 focus:ring-blue-500 ${
                                errors.subject ? "border-red-400 bg-red-50/30" : "border-gray-300 focus:border-blue-500"
                            }`}
                        />
                        {errors.subject && <p className="text-xs text-red-500 mt-1">{errors.subject}</p>}
                    </div>

                    {/* Body */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Body <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            name="body"
                            value={form.body}
                            onChange={handleChange}
                            placeholder="Write your message here..."
                            rows={7}
                            className={`w-full rounded-xl border px-4 py-3 text-[15px] text-gray-900 outline-none resize-none transition-all duration-200 focus:ring-4 focus:ring-blue-500/20 leading-relaxed shadow-sm ${
                                errors.body ? "border-red-400 bg-red-50/30" : "border-gray-200 focus:border-blue-500 hover:border-gray-300"
                            }`}
                        />
                        {errors.body && <p className="text-xs text-red-500 mt-1">{errors.body}</p>}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 px-6 py-5 bg-gray-50/50 border-t border-gray-100">
                    <p className="text-[13px] text-gray-500">
                        All fields marked <span className="text-red-500">*</span> are required
                    </p>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="h-10 px-5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-white hover:shadow-sm transition-all duration-200"
                        >
                            Discard
                        </button>
                        <button
                            onClick={handleSend}
                            disabled={sending}
                            className="flex items-center gap-2 h-10 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold hover:shadow-md hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 disabled:shadow-none transition-all duration-200 shadow-sm shadow-blue-200"
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

// ── Email Detail Panel ────────────────────────────────────────────────────────

function EmailDetailPanel({ email, onClose }: { email: EmailLog; onClose: () => void }) {
    const dateStr = formatFullDate(email.sentAt ?? email.createdAt);

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white shrink-0">
                <p className="text-[13px] font-semibold text-gray-700 uppercase tracking-wide">
                    Email Details
                </p>
                <button
                    onClick={onClose}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Close detail"
                >
                    <X size={14} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {/* Subject + meta */}
                <div className="px-5 pt-5 pb-4 border-b border-gray-50">
                    <h2 className="text-[16px] font-semibold text-gray-900 leading-snug mb-3">
                        {email.subject || "(No Subject)"}
                    </h2>
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <Avatar email={email.to} />
                            <div className="min-w-0">
                                <p className="text-[13px] font-medium text-gray-800">{email.to}</p>
                                <p className="text-[11px] text-gray-400">Recipient</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Meta table */}
                <div className="px-5 py-4 border-b border-gray-50 space-y-2.5">
                    {email.from && (
                        <div className="flex items-center gap-3 text-[12px]">
                            <span className="text-gray-400 w-12 shrink-0">From</span>
                            <span className="text-gray-700 font-medium truncate">{email.from}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-3 text-[12px]">
                        <span className="text-gray-400 w-12 shrink-0">To</span>
                        <span className="text-gray-700 truncate">{email.to}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[12px]">
                        <span className="text-gray-400 w-12 shrink-0">Date</span>
                        <span className="text-gray-500">{dateStr}</span>
                    </div>
                    {email.status && (
                        <div className="flex items-center gap-3 text-[12px]">
                            <span className="text-gray-400 w-12 shrink-0">Status</span>
                            <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-200 text-[11px] font-medium capitalize">
                                {email.status}
                            </span>
                        </div>
                    )}
                </div>

                {/* Body */}
                <div className="px-5 py-4">
                    <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide mb-3">
                        Message
                    </p>
                    <div className="text-[13px] text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {email.body || <span className="text-gray-300 italic">No content</span>}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface EmailUIProps {
    emails: EmailLog[];
    filteredEmails: EmailLog[];
    total: number;
    loading: boolean;
    error: string | null;
    isComposeOpen: boolean;
    sending: boolean;
    sendError: string | null;
    selectedEmail: EmailLog | null;
    search: string;
    onSearchChange: (s: string) => void;
    onOpenCompose: () => void;
    onCloseCompose: () => void;
    onSendEmail: (data: SendEmailPayload) => Promise<boolean>;
    onSelectEmail: (email: EmailLog | null) => void;
    onRetry: () => void;
}

// ── Main Component ────────────────────────────────────────────────────────────

export function EmailUI({
    emails,
    filteredEmails,
    total,
    loading,
    error,
    isComposeOpen,
    sending,
    sendError,
    selectedEmail,
    search,
    onSearchChange,
    onOpenCompose,
    onCloseCompose,
    onSendEmail,
    onSelectEmail,
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

    return (
        <div className="min-h-full space-y-5">

            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">Email Hub</h1>
                    <p className="text-[15px] text-gray-500 mt-1.5 font-medium">
                        Send, track, and manage all your external communications.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={onRetry}
                        disabled={loading}
                        title="Refresh"
                        className="flex items-center gap-2 h-10 px-4 rounded-xl border border-gray-200 bg-white shadow-sm text-[14px] font-semibold text-gray-700 hover:bg-gray-50 hover:shadow-md disabled:opacity-50 transition-all duration-200"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin text-blue-600" : ""} />
                        Refresh
                    </button>
                    <button
                        onClick={onOpenCompose}
                        className="flex items-center gap-2 h-10 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[14px] font-bold hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all duration-200"
                    >
                        <Plus size={18} />
                        Compose
                    </button>
                </div>
            </div>

            {/* ── Content area ── */}
            <div className={selectedEmail ? "grid grid-cols-[1fr_380px] gap-5 items-start" : ""}>

                {/* ── Email list card ── */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

                    {/* Toolbar */}
                    <div className="flex items-center gap-4 px-6 py-5 border-b border-gray-100 flex-wrap bg-gray-50/30">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shadow-sm">
                                <Inbox size={16} />
                            </div>
                            <span className="text-[15px] font-bold text-gray-800 tracking-tight">
                                All Emails
                            </span>
                            {!loading && total > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600 text-[12px] font-bold shadow-sm">
                                    {total}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-3 ml-auto">
                            <button className="flex items-center gap-2 h-9 px-4 rounded-xl border border-gray-200 bg-white shadow-sm text-[13px] font-semibold text-gray-700 hover:bg-gray-50 hover:shadow-md transition-all duration-200">
                                <Filter size={14} />
                                Filter
                            </button>
                            <div className="relative group">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search emails..."
                                    value={search}
                                    onChange={(e) => onSearchChange(e.target.value)}
                                    className="h-9 pl-9 pr-4 rounded-xl border border-gray-200 bg-gray-50/50 text-[14px] text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white w-64 transition-all duration-200"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    {["Recipient", "Subject", "Preview", "Date", ""].map((h) => (
                                        <th
                                            key={h}
                                            className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap"
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="py-16">
                                            <div className="flex justify-center items-center h-full p-4">
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredEmails.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-16">
                                            <Mail size={32} className="text-gray-200 mx-auto mb-3" />
                                            <p className="text-gray-400 text-sm font-medium">
                                                {search ? "No emails match your search." : "No emails yet."}
                                            </p>
                                            {!search && (
                                                <button
                                                    onClick={onOpenCompose}
                                                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                                                >
                                                    <Plus size={14} />
                                                    Send your first email
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredEmails.map((email) => {
                                        const isSelected = selectedEmail?.id === email.id;
                                        return (
                                            <tr
                                                key={email.id}
                                                onClick={() => onSelectEmail(isSelected ? null : email)}
                                                className={`border-b border-gray-50 cursor-pointer transition-colors ${
                                                    isSelected
                                                        ? "bg-blue-50/60"
                                                        : "hover:bg-gray-50/60"
                                                }`}
                                            >
                                                {/* Recipient */}
                                                <td className="px-5 py-3.5 whitespace-nowrap">
                                                    <div className="flex items-center gap-2.5">
                                                        <Avatar email={email.to} />
                                                        <span className="text-[13px] font-medium text-gray-800 max-w-[130px] truncate">
                                                            {email.to}
                                                        </span>
                                                    </div>
                                                </td>
                                                {/* Subject */}
                                                <td className="px-5 py-3.5 whitespace-nowrap max-w-[180px]">
                                                    <p className="text-[13px] font-medium text-gray-800 truncate">
                                                        {email.subject || "(No Subject)"}
                                                    </p>
                                                </td>
                                                {/* Preview */}
                                                <td className="px-5 py-3.5 max-w-[200px]">
                                                    <p className="text-[12px] text-gray-400 truncate">
                                                        {email.body}
                                                    </p>
                                                </td>
                                                {/* Date */}
                                                <td className="px-5 py-3.5 whitespace-nowrap">
                                                    <span className="text-[12px] text-gray-400">
                                                        {formatDate(email.sentAt ?? email.createdAt)}
                                                    </span>
                                                </td>
                                                {/* Arrow */}
                                                <td className="pr-4 py-3.5 whitespace-nowrap">
                                                    <ChevronRight
                                                        size={15}
                                                        className={`transition-colors ${
                                                            isSelected ? "text-blue-400" : "text-gray-300"
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

                    {/* Footer */}
                    {!loading && filteredEmails.length > 0 && (
                        <div className="px-5 py-3.5 border-t border-gray-100">
                            <p className="text-[13px] text-gray-400">
                                Showing {filteredEmails.length} of {total} emails
                            </p>
                        </div>
                    )}
                </div>

                {/* ── Detail panel ── */}
                {selectedEmail && (
                    <EmailDetailPanel
                        email={selectedEmail}
                        onClose={() => onSelectEmail(null)}
                    />
                )}
            </div>

            {/* ── Compose modal ── */}
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
