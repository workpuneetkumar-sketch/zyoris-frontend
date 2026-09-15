"use client";

import { useState } from "react";
import { 
    Send, 
    X, 
    Users, 
    FileCode, 
    Globe, 
    Plus, 
    Trash2, 
    AlertCircle, 
    CheckCircle2, 
    XCircle, 
    ChevronDown, 
    ChevronUp, 
    AlertTriangle,
    RefreshCw
} from "lucide-react";
import { sendBroadcast, BroadcastResponse } from "@/lib/api/whatsappApi";

interface BroadcastComposerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PRESET_TEMPLATES = [
    "hello_world",
    "lead_followup",
    "payment_reminder",
    "promotional_offer",
    "appointment_confirmation"
];

const PRESET_LANGUAGES = [
    { code: "en_US", name: "English (US)" },
    { code: "en_GB", name: "English (UK)" },
    { code: "es_ES", name: "Spanish" },
    { code: "hi_IN", name: "Hindi" },
    { code: "fr_FR", name: "French" }
];

export function BroadcastComposerModal({ isOpen, onClose }: BroadcastComposerModalProps) {
    const [rawRecipients, setRawRecipients] = useState("");
    const [templateName, setTemplateName] = useState(PRESET_TEMPLATES[0]);
    const [customTemplate, setCustomTemplate] = useState("");
    const [useCustomTemplate, setUseCustomTemplate] = useState(false);
    const [language, setLanguage] = useState("en_US");
    const [parameters, setParameters] = useState<string[]>([""]);

    const [isConfirming, setIsConfirming] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [broadcastResult, setBroadcastResult] = useState<BroadcastResponse | null>(null);
    const [showFailuresOnly, setShowFailuresOnly] = useState(false);
    const [expandedFailures, setExpandedFailures] = useState(true);

    if (!isOpen) return null;

    // Helper to parse, validate, and dedupe recipient phone numbers
    const parseRecipients = () => {
        if (!rawRecipients.trim()) return { valid: [], invalid: [], totalCount: 0 };
        
        // Split by comma, space, newline, semicolon
        const tokens = rawRecipients
            .split(/[\n,\s;]+/)
            .map(t => t.trim())
            .filter(Boolean);

        const uniqueTokens = Array.from(new Set(tokens));
        
        // E.164-ish regex validation
        const e164Regex = /^\+?[1-9]\d{1,14}$/;

        const valid: string[] = [];
        const invalid: string[] = [];

        uniqueTokens.forEach(num => {
            // Clean non-digit characters except leading +
            const cleanNum = num.replace(/[^\d+]/g, "");
            if (e164Regex.test(cleanNum)) {
                valid.push(cleanNum);
            } else {
                invalid.push(num);
            }
        });

        return { valid, invalid, totalCount: valid.length };
    };

    const { valid: validRecipients, invalid: invalidRecipients } = parseRecipients();
    const isExceedingCap = validRecipients.length > 1000;

    const handleAddParam = () => {
        setParameters(prev => [...prev, ""]);
    };

    const handleRemoveParam = (index: number) => {
        setParameters(prev => prev.filter((_, i) => i !== index));
    };

    const handleParamChange = (index: number, val: string) => {
        setParameters(prev => {
            const updated = [...prev];
            updated[index] = val;
            return updated;
        });
    };

    const activeTemplateName = useCustomTemplate ? customTemplate.trim() : templateName;

    const handleInitialSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (validRecipients.length === 0) {
            setError("Please enter at least one valid recipient phone number.");
            return;
        }

        if (isExceedingCap) {
            setError("Recipient count exceeds the maximum limit of 1,000 per broadcast.");
            return;
        }

        if (!activeTemplateName) {
            setError("Please select or specify a template name.");
            return;
        }

        // Open confirmation step
        setIsConfirming(true);
    };

    const handleConfirmedSend = async () => {
        setSending(true);
        setError(null);

        try {
            const filteredParams = parameters.map(p => p.trim()).filter(p => p.length > 0);
            const res = await sendBroadcast({
                to: validRecipients,
                templateName: activeTemplateName,
                language: language.trim() || "en_US",
                parameters: filteredParams
            });

            setBroadcastResult(res);
            setIsConfirming(false);
        } catch (err: any) {
            console.error("Broadcast send failed:", err);
            setError(err?.message || "Failed to submit broadcast.");
            setIsConfirming(false);
        } finally {
            setSending(false);
        }
    };

    const resetForm = () => {
        setRawRecipients("");
        setParameters([""]);
        setError(null);
        setBroadcastResult(null);
        setIsConfirming(false);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-100 overflow-hidden my-8">
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white backdrop-blur-xs">
                            <Send size={18} />
                        </div>
                        <div>
                            <h2 className="font-bold text-lg leading-tight">WhatsApp Broadcast Composer</h2>
                            <p className="text-xs text-blue-100/90 font-medium">Send bulk template messages to up to 1,000 recipients</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                    {/* Display Error Banner */}
                    {error && (
                        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5">
                            <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                            <div className="flex-1 font-medium">{error}</div>
                        </div>
                    )}

                    {/* SCREEN 1: Results Summary Screen if completed */}
                    {broadcastResult ? (
                        <div className="space-y-6">
                            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                                        <CheckCircle2 size={20} className="text-emerald-600" />
                                        Broadcast Delivery Report
                                    </h3>
                                    <span className="text-xs text-gray-500 font-medium">Template: {activeTemplateName}</span>
                                </div>

                                {/* Metrics Cards */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-white p-3.5 rounded-xl border border-gray-200/80 text-center shadow-xs">
                                        <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Total</p>
                                        <p className="text-2xl font-extrabold text-gray-900 mt-0.5">{broadcastResult.total}</p>
                                    </div>
                                    <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 text-center shadow-xs">
                                        <p className="text-[11px] text-emerald-700 font-bold uppercase tracking-wider">Sent</p>
                                        <p className="text-2xl font-extrabold text-emerald-700 mt-0.5">{broadcastResult.sent}</p>
                                    </div>
                                    <div className="bg-rose-50/70 p-3.5 rounded-xl border border-rose-200 text-center shadow-xs">
                                        <p className="text-[11px] text-rose-700 font-bold uppercase tracking-wider">Failed</p>
                                        <p className="text-2xl font-extrabold text-rose-700 mt-0.5">{broadcastResult.failed}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Detailed Results Table */}
                            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                                <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between text-xs font-bold text-gray-700">
                                    <div className="flex items-center gap-2">
                                        <span>Recipient Delivery Logs</span>
                                        <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full text-[10px]">
                                            {broadcastResult.results.length} items
                                        </span>
                                    </div>
                                    {broadcastResult.failed > 0 && (
                                        <button
                                            onClick={() => setExpandedFailures(!expandedFailures)}
                                            className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold flex items-center gap-1"
                                        >
                                            {expandedFailures ? "Collapse Failures" : "Expand Failures"}
                                            {expandedFailures ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        </button>
                                    )}
                                </div>

                                <div className="max-h-60 overflow-y-auto divide-y divide-gray-100">
                                    {broadcastResult.results.map((resItem, idx) => (
                                        <div key={idx} className="p-3 flex items-center justify-between text-xs bg-white hover:bg-gray-50/50">
                                            <div className="flex items-center gap-2.5">
                                                {resItem.success ? (
                                                    <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                                                ) : (
                                                    <XCircle size={15} className="text-rose-500 shrink-0" />
                                                )}
                                                <span className="font-mono font-medium text-gray-900">{resItem.to}</span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {resItem.metaMessageId && (
                                                    <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                                        ID: {resItem.metaMessageId}
                                                    </span>
                                                )}
                                                {resItem.success ? (
                                                    <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                                        Sent
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 max-w-[250px] truncate" title={resItem.error}>
                                                        {resItem.error || "Delivery Failed"}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Action Toolbar */}
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    onClick={resetForm}
                                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                                >
                                    <RefreshCw size={14} />
                                    Send Another Broadcast
                                </button>
                                <button
                                    onClick={onClose}
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    ) : isConfirming ? (
                        /* SCREEN 2: Explicit Confirmation Step */
                        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-6 space-y-4 text-center">
                            <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto shadow-xs">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Confirm Broadcast Dispatch</h3>
                                <p className="text-xs text-gray-600 mt-1 max-w-md mx-auto">
                                    You are about to dispatch template message <span className="font-bold text-gray-900">"{activeTemplateName}"</span> to <span className="font-bold text-indigo-600">{validRecipients.length} recipients</span>.
                                </p>
                            </div>

                            <div className="bg-white border border-amber-200 rounded-xl p-3.5 text-xs text-left space-y-1.5 max-w-md mx-auto">
                                <div className="flex justify-between text-gray-600">
                                    <span>Recipients:</span>
                                    <span className="font-bold text-gray-900">{validRecipients.length} phone numbers</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>Template:</span>
                                    <span className="font-bold text-gray-900">{activeTemplateName} ({language})</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>Parameters:</span>
                                    <span className="font-bold text-gray-900">{parameters.filter(p=>p.trim()).length} variables</span>
                                </div>
                            </div>

                            <div className="p-3 bg-amber-100/60 rounded-lg text-[11px] text-amber-800 font-medium max-w-md mx-auto">
                                Broadcast operations trigger live WhatsApp message delivery and cannot be cancelled once fired.
                            </div>

                            <div className="flex items-center justify-center gap-3 pt-2">
                                <button
                                    onClick={() => setIsConfirming(false)}
                                    disabled={sending}
                                    className="px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold transition-colors"
                                >
                                    Back to Edit
                                </button>
                                <button
                                    onClick={handleConfirmedSend}
                                    disabled={sending}
                                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                                >
                                    {sending ? (
                                        <>
                                            <RefreshCw size={14} className="animate-spin" />
                                            Dispatching Broadcast...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={14} />
                                            Confirm Send to {validRecipients.length} Recipients
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* SCREEN 3: Main Composer Form */
                        <form onSubmit={handleInitialSubmit} className="space-y-5">
                            {/* 1. Recipient List */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                                        <Users size={14} className="text-indigo-600" />
                                        <span>Recipient Phone Numbers (E.164 Format)</span>
                                    </label>
                                    <div className="flex items-center gap-2 text-[11px]">
                                        <span className={`font-bold ${isExceedingCap ? 'text-rose-600' : 'text-emerald-600'}`}>
                                            {validRecipients.length} / 1000 Max
                                        </span>
                                    </div>
                                </div>

                                <textarea
                                    rows={4}
                                    placeholder="+14155552671, +919876543210, +447700900077 (separated by commas, spaces, or newlines)"
                                    value={rawRecipients}
                                    onChange={(e) => setRawRecipients(e.target.value)}
                                    className={`w-full text-xs font-mono bg-gray-50/50 border rounded-xl p-3 outline-none focus:bg-white focus:ring-2 transition-all ${
                                        isExceedingCap ? 'border-rose-300 focus:ring-rose-200' : 'border-gray-200 focus:border-indigo-500 focus:ring-indigo-200'
                                    }`}
                                />

                                {/* Validation indicators */}
                                {rawRecipients.trim() && (
                                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] pt-0.5">
                                        {validRecipients.length > 0 && (
                                            <span className="text-emerald-700 font-medium flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                                <CheckCircle2 size={12} />
                                                {validRecipients.length} valid unique phone number(s) parsed
                                            </span>
                                        )}
                                        {invalidRecipients.length > 0 && (
                                            <span className="text-amber-700 font-medium flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                                                <AlertTriangle size={12} />
                                                {invalidRecipients.length} invalid format number(s) skipped
                                            </span>
                                        )}
                                        {isExceedingCap && (
                                            <span className="text-rose-700 font-bold flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 w-full">
                                                <AlertCircle size={12} />
                                                Exceeds maximum limit of 1000 recipients. Please reduce numbers before proceeding.
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* 2. Template Selection & Language */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Template Name */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                                            <FileCode size={14} className="text-indigo-600" />
                                            <span>Template Name</span>
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setUseCustomTemplate(!useCustomTemplate)}
                                            className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold"
                                        >
                                            {useCustomTemplate ? "Select Preset" : "Custom Name"}
                                        </button>
                                    </div>

                                    {useCustomTemplate ? (
                                        <input
                                            type="text"
                                            placeholder="Enter custom template name (e.g. promo_nov_2026)"
                                            value={customTemplate}
                                            onChange={(e) => setCustomTemplate(e.target.value)}
                                            className="w-full text-xs bg-gray-50/50 border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 transition-all"
                                        />
                                    ) : (
                                        <select
                                            value={templateName}
                                            onChange={(e) => setTemplateName(e.target.value)}
                                            className="w-full text-xs bg-gray-50/50 border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 transition-all"
                                        >
                                            {PRESET_TEMPLATES.map(tmpl => (
                                                <option key={tmpl} value={tmpl}>{tmpl}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                {/* Language Code */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                                        <Globe size={14} className="text-indigo-600" />
                                        <span>Language Code</span>
                                    </label>
                                    <select
                                        value={language}
                                        onChange={(e) => setLanguage(e.target.value)}
                                        className="w-full text-xs bg-gray-50/50 border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 transition-all"
                                    >
                                        {PRESET_LANGUAGES.map(lang => (
                                            <option key={lang.code} value={lang.code}>
                                                {lang.name} ({lang.code})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* 3. Dynamic Template Parameters */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-gray-800 flex items-center gap-1">
                                        <span>Template Parameters</span>
                                        <span className="text-gray-400 font-normal">(`parameters` array)</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleAddParam}
                                        className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-bold bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100 transition-colors"
                                    >
                                        <Plus size={12} />
                                        Add Variable
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {parameters.map((paramVal, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <span className="text-[11px] font-mono font-bold text-gray-400 w-12 text-right">
                                                &#123;&#123;{idx + 1}&#125;&#125;
                                            </span>
                                            <input
                                                type="text"
                                                placeholder={`Parameter value for {{${idx + 1}}} (e.g. John, 20% OFF)`}
                                                value={paramVal}
                                                onChange={(e) => handleParamChange(idx, e.target.value)}
                                                className="flex-1 text-xs bg-gray-50/50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 transition-all"
                                            />
                                            {parameters.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveParam(idx)}
                                                    className="p-2 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Submit Toolbar */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={validRecipients.length === 0 || isExceedingCap}
                                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-indigo-200 disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
                                >
                                    <Send size={14} />
                                    Review & Dispatch Broadcast ({validRecipients.length})
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
