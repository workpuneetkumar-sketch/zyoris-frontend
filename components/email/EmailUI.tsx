"use client";

import { useState } from "react";
import {
    Mail,
    Send,
    FileText,
    Trash2,
    Search,
    RefreshCw,
    Plus,
    X,
    ChevronLeft,
    AlertCircle,
    Inbox,
    Clock,
    Reply,
    User,
    Paperclip,
    Calendar,
    CheckCircle2,
} from "lucide-react";
import { GmailConnectScreen } from "@/components/email/GmailConnectScreen";
import { EmailThread, FolderTab } from "@/hooks/useEmail";
import { EmailTemplate, SendEmailPayload } from "@/lib/api/emailApi";

// ── Folder config ─────────────────────────────────────────────────────────────

const FOLDERS: { label: FolderTab; icon: React.ReactNode }[] = [
    { label: "Inbox", icon: <Inbox size={16} /> },
    { label: "Sent", icon: <Send size={16} /> },
    { label: "Drafts", icon: <FileText size={16} /> },
    { label: "Trash", icon: <Trash2 size={16} /> },
    { label: "Gmail Connect", icon: <Mail size={16} /> },
];

// ── Compose Modal ─────────────────────────────────────────────────────────────

interface ComposeModalProps {
    templates: EmailTemplate[];
    loadingTemplates: boolean;
    sending: boolean;
    sendError: string | null;
    onClose: () => void;
    onSend: (data: SendEmailPayload) => Promise<boolean>;
    onSchedule: (data: SendEmailPayload) => Promise<boolean>;
    onCreateTemplate: (data: { name: string; subject: string; body: string }) => Promise<boolean>;
}

const EMPTY_COMPOSE = { to: "", subject: "", body: "", templateId: "", scheduledAt: "" };

function ComposeModal({
    templates,
    loadingTemplates,
    sending,
    sendError,
    onClose,
    onSend,
    onSchedule,
    onCreateTemplate,
}: ComposeModalProps) {
    const [form, setForm] = useState(EMPTY_COMPOSE);
    const [errors, setErrors] = useState<Partial<typeof EMPTY_COMPOSE>>({});
    const [savingTemplate, setSavingTemplate] = useState(false);
    const [templateName, setTemplateName] = useState("");
    const [showSaveTemplate, setShowSaveTemplate] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        if (name === "templateId" && value) {
            const tpl = templates.find((t) => t.id === value);
            if (tpl) {
                setForm((prev) => ({ ...prev, subject: tpl.subject, body: tpl.body, templateId: value }));
            }
        }
    };

    const validate = () => {
        const newErrors: Partial<typeof EMPTY_COMPOSE> = {};
        if (!form.to.trim()) newErrors.to = "Recipient is required";
        if (!form.subject.trim()) newErrors.subject = "Subject is required";
        if (!form.body.trim()) newErrors.body = "Body is required";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const buildPayload = (): SendEmailPayload => ({
        to: form.to.trim(),
        subject: form.subject.trim(),
        body: form.body.trim(),
        templateId: form.templateId || undefined,
        scheduledAt: form.scheduledAt || undefined,
    });

    const handleSend = async () => {
        if (!validate()) return;
        await onSend(buildPayload());
    };

    const handleSchedule = async () => {
        if (!validate()) return;
        if (!form.scheduledAt) {
            setErrors((prev) => ({ ...prev, scheduledAt: "Pick a date/time to schedule" }));
            return;
        }
        await onSchedule(buildPayload());
    };

    const handleSaveTemplate = async () => {
        if (!templateName.trim() || !form.subject.trim() || !form.body.trim()) return;
        setSavingTemplate(true);
        await onCreateTemplate({ name: templateName, subject: form.subject, body: form.body });
        setSavingTemplate(false);
        setTemplateName("");
        setShowSaveTemplate(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-semibold tracking-tight text-gray-900">New Email</h2>
                        <p className="text-sm text-gray-500 mt-0.5">Compose and send an email</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                    >
                        <X size={16} className="text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {sendError && (
                        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                            <AlertCircle size={16} className="shrink-0 mt-0.5" />
                            {sendError}
                        </div>
                    )}

                    {/* Template picker */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Use Template (optional)</label>
                        <select
                            name="templateId"
                            value={form.templateId}
                            onChange={handleChange}
                            disabled={loadingTemplates}
                            className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                            <option value="">{loadingTemplates ? "Loading templates…" : "— Select a template —"}</option>
                            {templates.map((t) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* To */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">To *</label>
                        <input
                            name="to"
                            value={form.to}
                            onChange={handleChange}
                            placeholder="recipient@example.com"
                            className={`w-full h-10 rounded-lg border px-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 ${errors.to ? "border-red-400" : "border-gray-200 focus:border-blue-500"}`}
                        />
                        {errors.to && <p className="text-xs text-red-500 mt-1">{errors.to}</p>}
                    </div>

                    {/* Subject */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Subject *</label>
                        <input
                            name="subject"
                            value={form.subject}
                            onChange={handleChange}
                            placeholder="Email subject"
                            className={`w-full h-10 rounded-lg border px-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 ${errors.subject ? "border-red-400" : "border-gray-200 focus:border-blue-500"}`}
                        />
                        {errors.subject && <p className="text-xs text-red-500 mt-1">{errors.subject}</p>}
                    </div>

                    {/* Body */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Message *</label>
                        <textarea
                            name="body"
                            value={form.body}
                            onChange={handleChange}
                            placeholder="Write your email…"
                            rows={7}
                            className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 outline-none resize-none focus:ring-2 focus:ring-blue-500 ${errors.body ? "border-red-400" : "border-gray-200 focus:border-blue-500"}`}
                        />
                        {errors.body && <p className="text-xs text-red-500 mt-1">{errors.body}</p>}
                    </div>

                    {/* Schedule */}
                    <div>
                        <label className="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1">
                            <Calendar size={12} /> Schedule Send (optional)
                        </label>
                        <input
                            name="scheduledAt"
                            type="datetime-local"
                            value={form.scheduledAt}
                            onChange={handleChange}
                            className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {errors.scheduledAt && <p className="text-xs text-red-500 mt-1">{errors.scheduledAt}</p>}
                    </div>

                    {/* Save as template */}
                    {!showSaveTemplate ? (
                        <button
                            type="button"
                            onClick={() => setShowSaveTemplate(true)}
                            className="text-xs text-blue-600 hover:underline"
                        >
                            + Save as template
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
                            <input
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                placeholder="Template name"
                                className="flex-1 h-8 rounded-lg border border-gray-200 px-3 text-xs text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                onClick={handleSaveTemplate}
                                disabled={savingTemplate}
                                className="h-8 px-3 rounded-lg bg-blue-600 text-white text-xs font-semibold disabled:opacity-60"
                            >
                                {savingTemplate ? "Saving…" : "Save"}
                            </button>
                            <button
                                onClick={() => setShowSaveTemplate(false)}
                                className="h-8 px-2 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-white"
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                    <button
                        onClick={onClose}
                        className="h-10 px-5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-white hover:shadow-sm transition-all"
                    >
                        Discard
                    </button>
                    {form.scheduledAt ? (
                        <button
                            onClick={handleSchedule}
                            disabled={sending}
                            className="flex items-center gap-2 h-10 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-bold shadow-sm disabled:opacity-60 transition-all hover:shadow-md hover:-translate-y-0.5"
                        >
                            {sending ? <RefreshCw size={14} className="animate-spin" /> : <Clock size={14} />}
                            {sending ? "Scheduling…" : "Schedule"}
                        </button>
                    ) : (
                        <button
                            onClick={handleSend}
                            disabled={sending}
                            className="flex items-center gap-2 h-10 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold shadow-sm shadow-blue-200 disabled:opacity-60 transition-all hover:shadow-md hover:-translate-y-0.5"
                        >
                            {sending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                            {sending ? "Sending…" : "Send"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Thread Detail Panel ───────────────────────────────────────────────────────

interface ThreadPanelProps {
    thread: EmailThread;
    onClose: () => void;
    onReply: () => void;
}

function ThreadPanel({ thread, onClose, onReply }: ThreadPanelProps) {
    return (
        <div className="flex flex-col h-full">
            {/* Panel header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-white">
                <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                >
                    <ChevronLeft size={15} className="text-gray-500" />
                </button>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-[15px] truncate">{thread.subject}</h3>
                    <p className="text-xs text-gray-500 truncate">
                        {thread.participants.join(", ")}
                    </p>
                </div>
                <button
                    onClick={onReply}
                    className="flex items-center gap-1.5 h-8 px-4 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
                >
                    <Reply size={13} /> Reply
                </button>
            </div>

            {/* Emails */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {thread.emails.map((email) => (
                    <div key={email.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="flex items-start justify-between gap-3 px-5 py-3.5 bg-gray-50/60 border-b border-gray-100">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600 flex items-center justify-center shrink-0">
                                    <User size={14} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-gray-800 truncate">{email.from || "Unknown Sender"}</p>
                                    <p className="text-[11px] text-gray-500 truncate">To: {email.to}</p>
                                </div>
                            </div>
                            <span className="text-[11px] text-gray-400 whitespace-nowrap shrink-0 mt-0.5">
                                {email.sentAt
                                    ? new Date(email.sentAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
                                    : new Date(email.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                            </span>
                        </div>
                        <div className="px-5 py-4">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{email.body}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Thread List Item ──────────────────────────────────────────────────────────

function ThreadItem({
    thread,
    onClick,
    isSelected,
}: {
    thread: EmailThread;
    onClick: () => void;
    isSelected: boolean;
}) {
    const date = thread.latestDate
        ? new Date(thread.latestDate).toLocaleDateString([], { month: "short", day: "numeric" })
        : "";

    return (
        <button
            onClick={onClick}
            className={`w-full text-left px-4 py-3.5 border-b border-gray-100 hover:bg-blue-50/40 transition-colors ${isSelected ? "bg-blue-50 border-l-2 border-l-blue-500" : ""}`}
        >
            <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-[13px] font-semibold text-gray-900 truncate leading-tight">{thread.subject}</span>
                <span className="text-[11px] text-gray-400 shrink-0">{date}</span>
            </div>
            <p className="text-xs text-gray-500 truncate leading-snug">
                {thread.participants[0] ?? ""}
                {thread.participants.length > 1 && ` +${thread.participants.length - 1}`}
            </p>
            <p className="text-[11px] text-gray-400 truncate mt-0.5">{thread.latestPreview}</p>
        </button>
    );
}

// ── Main EmailUI Component ────────────────────────────────────────────────────

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
    templates: EmailTemplate[];
    loadingTemplates: boolean;
    connectingGmail: boolean;
    gmailConnectError: string | null;
    onSearchChange: (value: string) => void;
    onLabelChange: (label: FolderTab) => void;
    onOpenCompose: () => void;
    onCloseCompose: () => void;
    onSendEmail: (data: SendEmailPayload) => Promise<boolean>;
    onScheduleEmail: (data: SendEmailPayload) => Promise<boolean>;
    onCreateTemplate: (data: { name: string; subject: string; body: string }) => Promise<boolean>;
    onSyncEmails: () => void;
    onConnectGmail: () => void;
    onSelectThread: (thread: EmailThread | null) => void;
    onRetry: () => void;
}

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
    templates,
    loadingTemplates,
    connectingGmail,
    gmailConnectError,
    onSearchChange,
    onLabelChange,
    onOpenCompose,
    onCloseCompose,
    onSendEmail,
    onScheduleEmail,
    onCreateTemplate,
    onSyncEmails,
    onConnectGmail,
    onSelectThread,
    onRetry,
}: EmailUIProps) {
    return (
        <div className="min-h-full">
            {/* Page header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">Email</h1>
                    <p className="text-[15px] text-gray-500 mt-1 font-medium">
                        {total} thread{total !== 1 ? "s" : ""} in {selectedLabel}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onSyncEmails}
                        disabled={syncing}
                        title="Sync emails"
                        className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-50 shadow-sm"
                    >
                        <RefreshCw size={16} className={`text-gray-500 ${syncing ? "animate-spin" : ""}`} />
                    </button>
                    <button
                        onClick={onOpenCompose}
                        className="flex items-center gap-2 h-10 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[14px] font-bold hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all duration-200"
                    >
                        <Plus size={18} /> Compose
                    </button>
                </div>
            </div>

            {/* Gmail Connect screen */}
            {selectedLabel === "Gmail Connect" ? (
                <GmailConnectScreen
                    connecting={connectingGmail}
                    error={gmailConnectError}
                    onConnect={onConnectGmail}
                />
            ) : (
                <div className="flex gap-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" style={{ minHeight: 560 }}>
                    {/* Sidebar */}
                    <div className="w-48 shrink-0 border-r border-gray-100 flex flex-col">
                        <nav className="flex-1 py-3 space-y-0.5">
                            {FOLDERS.map((f) => (
                                <button
                                    key={f.label}
                                    onClick={() => onLabelChange(f.label)}
                                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                                        selectedLabel === f.label
                                            ? "bg-blue-50 text-blue-700 border-r-2 border-r-blue-600"
                                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                    }`}
                                >
                                    <span className={selectedLabel === f.label ? "text-blue-600" : "text-gray-400"}>
                                        {f.icon}
                                    </span>
                                    {f.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Thread list */}
                    <div className="w-72 shrink-0 border-r border-gray-100 flex flex-col">
                        {/* Search */}
                        <div className="p-3 border-b border-gray-100">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search…"
                                    value={search}
                                    onChange={(e) => onSearchChange(e.target.value)}
                                    className="w-full h-9 pl-8 pr-3 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto">
                            {loading ? (
                                <div className="flex justify-center items-center py-16">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                                </div>
                            ) : error ? (
                                <div className="p-4 text-center">
                                    <AlertCircle size={28} className="text-red-300 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500 mb-3">{error}</p>
                                    <button
                                        onClick={onRetry}
                                        className="text-xs text-blue-600 hover:underline font-medium"
                                    >
                                        Try again
                                    </button>
                                </div>
                            ) : filteredThreads.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                                    <Mail size={32} className="text-gray-200 mb-3" />
                                    <p className="text-sm text-gray-400 font-medium">
                                        {search ? "No threads match your search." : `No emails in ${selectedLabel}.`}
                                    </p>
                                </div>
                            ) : (
                                filteredThreads.map((thread) => (
                                    <ThreadItem
                                        key={thread.id}
                                        thread={thread}
                                        isSelected={selectedThread?.id === thread.id}
                                        onClick={() => onSelectThread(thread)}
                                    />
                                ))
                            )}
                        </div>
                    </div>

                    {/* Detail panel */}
                    <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
                        {selectedThread ? (
                            <ThreadPanel
                                thread={selectedThread}
                                onClose={() => onSelectThread(null)}
                                onReply={onOpenCompose}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center px-8 py-16 gap-3">
                                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-300 flex items-center justify-center">
                                    <Mail size={28} />
                                </div>
                                <p className="text-base font-semibold text-gray-700">Select a thread</p>
                                <p className="text-sm text-gray-400 max-w-xs">
                                    Click any conversation on the left to read the full thread.
                                </p>
                                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                                    <span className="flex items-center gap-1"><Paperclip size={12} /> Attachments</span>
                                    <span className="flex items-center gap-1"><CheckCircle2 size={12} /> Read receipts</span>
                                    <span className="flex items-center gap-1"><Reply size={12} /> Quick reply</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Compose modal */}
            {isComposeOpen && (
                <ComposeModal
                    templates={templates}
                    loadingTemplates={loadingTemplates}
                    sending={sending}
                    sendError={sendError}
                    onClose={onCloseCompose}
                    onSend={onSendEmail}
                    onSchedule={onScheduleEmail}
                    onCreateTemplate={onCreateTemplate}
                />
            )}
        </div>
    );
}
