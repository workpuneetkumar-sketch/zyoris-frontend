"use client";

import { Lead, computeLeadScore } from "@/types/leads";
import { getLeadStatusInfo } from "@/utils/leadStatus";
import { Mail, Phone, MapPin, Building2, Tag, FileText, DollarSign, BarChart2, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ViewLeadModalProps {
    lead: Lead;
    onClose: () => void;
}

export default function ViewLeadModal({ lead, onClose }: ViewLeadModalProps) {
    const statusInfo = getLeadStatusInfo(lead.status);
    const score = lead.score ?? computeLeadScore(lead);

    // Compute real breakdown components
    const STATUS_SCORE: Record<string, number> = {
        CLOSED: 40, NEGOTIATION: 36, PROPOSAL: 30, QUALIFIED: 24,
        HOT: 20, CONTACTED: 14, WARM: 10, NEW: 6, DEAD: 0,
    };
    const SOURCE_SCORE: Record<string, number> = {
        Referral: 20, LinkedIn: 16, Website: 12, "Cold Call": 8,
    };
    const statusPts   = STATUS_SCORE[lead.status ?? ""] ?? 6;
    const val         = typeof lead.estimatedValue === "number" && lead.estimatedValue > 0 ? lead.estimatedValue : 0;
    const valuePts    = val > 0 ? Math.min(30, Math.round((Math.log10(val + 1) / Math.log10(100_001)) * 30)) : 0;
    const sourcePts   = SOURCE_SCORE[lead.source ?? ""] ?? 8;
    const completePts = (lead.name ? 2 : 0) + (lead.email ? 2 : 0) + (lead.phone ? 2 : 0) + (lead.company ? 2 : 0) + (lead.status ? 2 : 0);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-semibold text-gray-900">{lead.name}</h2>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusInfo.style}`}>
                                {statusInfo.emoji} {statusInfo.label}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500">{lead.company || "No Company"}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-500 transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto bg-gray-50/50 space-y-6 flex-1">

                    {/* Status, Source & Created */}
                    <div className="flex gap-4 flex-wrap">
                        <div className="flex-1 min-w-[140px] bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Status</p>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.style}`}>
                                {statusInfo.emoji} {statusInfo.label}
                            </span>
                        </div>
                        <div className="flex-1 min-w-[140px] bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Source</p>
                            <span className="text-sm font-medium text-gray-700">{lead.source || "Unknown"}</span>
                        </div>
                        <div className="flex-1 min-w-[140px] bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Created At</p>
                            <span className="text-sm font-medium text-gray-700">{lead.createdAt || "Unknown"}</span>
                        </div>
                    </div>

                    {/* Score + Estimated Value row */}
                    <div className="flex gap-4 flex-wrap">
                        {/* Estimated Value */}
                        <div className="flex-1 min-w-[160px] bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                <DollarSign size={12} className="text-emerald-500" /> Estimated Value
                            </p>
                            <span className="text-xl font-extrabold text-emerald-700">
                                {val > 0 ? `$${val.toLocaleString()}` : "—"}
                            </span>
                        </div>

                        {/* Score */}
                        <div className="flex-1 min-w-[280px] bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <BarChart2 size={12} className="text-blue-500" /> Lead Score
                            </p>
                            <div className="flex items-center gap-3">
                                {/* Circle */}
                                <div
                                    className="w-12 h-12 rounded-full flex items-center justify-center border-4 font-extrabold text-sm shrink-0"
                                    style={{
                                        borderColor: score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444",
                                        color:       score >= 70 ? "#059669" : score >= 40 ? "#d97706" : "#dc2626",
                                    }}
                                >
                                    {score}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                        {score >= 70
                                            ? <TrendingUp  size={12} className="text-emerald-500" />
                                            : score >= 40
                                                ? <Minus   size={12} className="text-amber-500" />
                                                : <TrendingDown size={12} className="text-red-500" />}
                                        <span className={`text-xs font-bold ${score >= 70 ? "text-emerald-600" : score >= 40 ? "text-amber-600" : "text-red-600"}`}>
                                            {score >= 70 ? "High Quality" : score >= 40 ? "Moderate" : "Low Priority"}
                                        </span>
                                        <span className="ml-auto text-[10px] text-gray-400 font-semibold">{score}/100</span>
                                    </div>
                                    {/* Overall bar */}
                                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                width: `${score}%`,
                                                background: score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444",
                                            }}
                                        />
                                    </div>
                                    {/* Component mini-bars */}
                                    <div className="grid grid-cols-4 gap-1.5">
                                        {[
                                            { label: "Status", pts: statusPts,   max: 40, color: "#3b82f6" },
                                            { label: "Value",  pts: valuePts,    max: 30, color: "#8b5cf6" },
                                            { label: "Source", pts: sourcePts,   max: 20, color: "#10b981" },
                                            { label: "Profile",pts: completePts, max: 10, color: "#f59e0b" },
                                        ].map((d) => (
                                            <div key={d.label}>
                                                <div className="flex justify-between text-[9px] text-gray-400 mb-0.5">
                                                    <span>{d.label}</span>
                                                    <span className="font-bold tabular-nums">{d.pts}</span>
                                                </div>
                                                <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full" style={{ width: `${Math.round((d.pts / d.max) * 100)}%`, background: d.color }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-50 bg-gray-50/50">
                            <h3 className="text-sm font-semibold text-gray-700">Contact Information</h3>
                        </div>
                        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                            <div className="flex items-start gap-3">
                                <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-xs text-gray-400 mb-0.5">Email</p>
                                    <p className="text-sm text-gray-800">{lead.email || "—"}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-xs text-gray-400 mb-0.5">Phone</p>
                                    <p className="text-sm text-gray-800">{lead.phone || "—"}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-xs text-gray-400 mb-0.5">Location</p>
                                    <p className="text-sm text-gray-800">{lead.city || "—"}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Building2 className="w-4 h-4 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-xs text-gray-400 mb-0.5">Company</p>
                                    <p className="text-sm text-gray-800">{lead.company || "—"}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Ownership & Assignment */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-50 bg-gray-50/50">
                            <h3 className="text-sm font-semibold text-gray-700">Assignment</h3>
                        </div>
                        <div className="p-5 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                                {lead.assignedTo?.name
                                    ? lead.assignedTo.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
                                    : "NA"}
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-900">
                                    {lead.assignedTo?.name || lead.owner || "Unassigned"}
                                </p>
                                {lead.assignedTo?.email && (
                                    <p className="text-xs text-gray-500">{lead.assignedTo.email}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Additional Details (Tags, Notes) */}
                    {((lead.tags && lead.tags.length > 0) || lead.note) && (
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-3 border-b border-gray-50 bg-gray-50/50">
                                <h3 className="text-sm font-semibold text-gray-700">Additional Details</h3>
                            </div>
                            <div className="p-5 space-y-4">
                                {lead.tags && lead.tags.length > 0 && (
                                    <div>
                                        <p className="text-xs text-gray-400 mb-2 flex items-center gap-1.5">
                                            <Tag className="w-3.5 h-3.5" /> Tags
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {lead.tags.map((tag: any, idx: number) => (
                                                <span
                                                    key={tag.id || idx}
                                                    className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-medium border border-gray-200"
                                                >
                                                    {typeof tag === "string" ? tag : tag.label}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {lead.note && (
                                    <div>
                                        <p className="text-xs text-gray-400 mb-2 flex items-center gap-1.5">
                                            <FileText className="w-3.5 h-3.5" /> Note
                                        </p>
                                        <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 border border-gray-100 whitespace-pre-wrap">
                                            {lead.note}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-white border-t border-gray-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition-colors"
                    >
                        Close
                    </button>
                </div>

            </div>
        </div>
    );
}
