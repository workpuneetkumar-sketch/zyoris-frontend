"use client";

import { Lead, LeadStatus } from "@/types/leads";
import { Mail, Phone, MapPin, Building2, Tag, User, FileText } from "lucide-react";

const STATUS_INFO: Record<LeadStatus, { label: string; emoji: string; style: string }> = {
    NEW: {
        label: "New Lead",
        emoji: "🆕",
        style: "bg-blue-50 text-blue-700 border border-blue-200"
    },
    WARM: {
        label: "Warm Lead",
        emoji: "🌤️",
        style: "bg-amber-50 text-amber-700 border border-amber-200"
    },
    HOT: {
        label: "Hot Lead",
        emoji: "🔥",
        style: "bg-red-50 text-red-700 border border-red-200"
    },
    DEAD: {
        label: "Dead Lead",
        emoji: "🧊",
        style: "bg-gray-50 text-gray-600 border border-gray-200"
    }
};

interface ViewLeadModalProps {
    lead: Lead;
    onClose: () => void;
}

export default function ViewLeadModal({ lead, onClose }: ViewLeadModalProps) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-semibold text-gray-900">{lead.name}</h2>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_INFO[lead.status].style}`}>
                                {STATUS_INFO[lead.status].emoji} {STATUS_INFO[lead.status].label}
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
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_INFO[lead.status].style}`}>
                                {STATUS_INFO[lead.status].emoji} {STATUS_INFO[lead.status].label}
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

                    {/* Contact Details */}
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
                    {(lead.tags && lead.tags.length > 0) || lead.note ? (
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
                                            {lead.tags.map((tag: any, idx) => (
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
                    ) : null}

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
