"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
    ArrowLeft,
    Mail,
    Phone,
    MapPin,
    Building2,
    Tag,
    FileText,
    Briefcase,
    Loader2,
    AlertCircle,
} from "lucide-react";
import { Lead } from "@/types/leads";
import {convertLeadToDeal } from "@/lib/api/leadsApi";
import api from "@/lib/api/api";

// ── Fetch a single lead by ID ─────────────────────────────────────────────────
// The backend has GET /leads/get-lead/:leadId per Swagger.

async function fetchLeadById(leadId: string): Promise<Lead> {
    const res = await api.get<Lead>(`/leads/get-lead/${leadId}`);
    return res.data;
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
    NEW:       "bg-blue-50 text-blue-600 border border-blue-200",
    CONTACTED: "bg-amber-50 text-amber-600 border border-amber-200",
    QUALIFIED: "bg-green-50 text-green-600 border border-green-200",
    CLOSED:    "bg-purple-50 text-purple-600 border border-purple-200",
};

function StatusBadge({ status }: { status: string }) {
    const cls = STATUS_STYLES[status] ?? "bg-gray-100 text-gray-500 border border-gray-200";
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
            {status || "NEW"}
        </span>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LeadDetailPage() {
    const params = useParams();
    const router = useRouter();
    const leadId = params?.leadId as string;

    const [lead, setLead] = useState<Lead | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Convert-to-deal state
    const [converting, setConverting] = useState(false);
    const [convertError, setConvertError] = useState<string | null>(null);

    // ── Load lead ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!leadId) return;
        setLoading(true);
        setError(null);
        fetchLeadById(leadId)
            .then((data) => setLead(data))
            .catch((err) =>
                setError(err instanceof Error ? err.message : "Failed to load lead.")
            )
            .finally(() => setLoading(false));
    }, [leadId]);

    // ── Convert to deal ───────────────────────────────────────────────────────
    const handleConvert = async () => {
        if (!leadId || converting) return;
        setConverting(true);
        setConvertError(null);
        try {
            const res = await convertLeadToDeal(leadId);
            // Normalise response — backend may return { deal: { id } } or { id } at root
            const dealId =
                (res.deal?.dealId ?? res.deal?.id) ??
                (res.dealId ?? res.id);
            if (dealId) {
                router.push(`/deals/${dealId}`);
            } else {
                // Fallback: go to deals list if no ID returned
                router.push("/deals");
            }
        } catch (err: any) {
            const msg =
                err?.response?.data?.error ??
                err?.response?.data?.message ??
                (err instanceof Error ? err.message : "Failed to convert lead.");
            setConvertError(msg);
        } finally {
            setConverting(false);
        }
    };

    // ── Loading ───────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] gap-3">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-500 font-medium">Loading lead...</p>
            </div>
        );
    }

    // ── Error ─────────────────────────────────────────────────────────────────
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <AlertCircle size={36} className="text-red-400" />
                <p className="text-red-500 text-sm">{error}</p>
                <button
                    onClick={() => router.back()}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                    Go Back
                </button>
            </div>
        );
    }

    if (!lead) return null;

    // ── Detail view ───────────────────────────────────────────────────────────
    return (
        <div className="space-y-5">

            {/* Page header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors shrink-0"
                        title="Go back"
                    >
                        <ArrowLeft size={16} className="text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 leading-tight">{lead.name}</h1>
                        <p className="text-sm text-gray-400 mt-0.5">{lead.company || "No Company"}</p>
                    </div>
                </div>

                {/* Convert to Deal — primary CTA */}
                <div className="flex flex-col items-end gap-1.5">
                    <button
                        onClick={handleConvert}
                        disabled={converting}
                        className="flex items-center gap-2 h-9 px-5 rounded-lg bg-blue-600 text-white text-[13px] font-semibold hover:bg-blue-700 disabled:opacity-70 transition-colors shadow-sm shadow-blue-200"
                    >
                        {converting ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <Briefcase size={14} />
                        )}
                        {converting ? "Converting..." : "Convert to Deal"}
                    </button>
                    {convertError && (
                        <p className="text-xs text-red-500 text-right max-w-[260px]">
                            {convertError}
                        </p>
                    )}
                </div>
            </div>

            {/* Status / Source / Created row */}
            <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[140px] bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">Status</p>
                    <StatusBadge status={lead.status} />
                </div>
                <div className="flex-1 min-w-[140px] bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">Source</p>
                    <span className="text-sm font-medium text-gray-700">{lead.source || "—"}</span>
                </div>
                <div className="flex-1 min-w-[140px] bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">Created At</p>
                    <span className="text-sm font-medium text-gray-700">{lead.createdAt || "—"}</span>
                </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-50 bg-gray-50/50">
                    <h3 className="text-sm font-semibold text-gray-700">Contact Information</h3>
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                    <div className="flex items-start gap-3">
                        <Mail className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-xs text-gray-400 mb-0.5">Email</p>
                            <p className="text-sm text-gray-800">{lead.email || "—"}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <Phone className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-xs text-gray-400 mb-0.5">Phone</p>
                            <p className="text-sm text-gray-800">{lead.phone || "—"}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-xs text-gray-400 mb-0.5">City</p>
                            <p className="text-sm text-gray-800">{lead.city || "—"}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <Building2 className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-xs text-gray-400 mb-0.5">Company</p>
                            <p className="text-sm text-gray-800">{lead.company || "—"}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Assignment */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-50 bg-gray-50/50">
                    <h3 className="text-sm font-semibold text-gray-700">Assignment</h3>
                </div>
                <div className="p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                        {lead.assignedTo?.name
                            ? lead.assignedTo.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
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

            {/* Tags & Notes */}
            {((lead.tags && lead.tags.length > 0) || lead.note) && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
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
    );
}
