"use client";

import { useParams, useRouter, notFound } from "next/navigation";
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
    BarChart2,
    TrendingUp,
    TrendingDown,
    Minus,
    User,
    Calendar,
    Globe,
    Bot,
    Clock,
    Home,
    IndianRupee,
    Search,
    BadgeCheck,
} from "lucide-react";
import { AgentTriggerButton } from "@/components/agents/AgentResultModal";
import { Lead, computeLeadScore } from "@/types/leads";
import { getLeadStatusInfo } from "@/utils/leadStatus";
import { convertLeadToDeal, fetchLeadById, getLeadScore } from "@/lib/api/leadsApi";
import { updateDeal, fetchDeals } from "@/lib/api/dealsApi";
import { mapLeadStatusToDealStage } from "@/lib/dealStageMapper";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { toast } from "react-toastify";
import { AiExtractionCard } from "@/components/ai/AiExtractionCard";
import { AiBadge } from "@/components/ai/AiBadge";
import { CommunicationIntelligenceWidget } from "@/components/ai/CommunicationIntelligenceWidget";
import { LeadIntelligencePanel } from "@/components/leads/LeadIntelligencePanel";
import { LeadApiActionsToolbar } from "@/components/leads/LeadApiActionsToolbar";

// Helper to format date safely
function formatDate(dateString: string | undefined) {
    if (!dateString) return "—";
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "Invalid Date";
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return dateString;
    }
}

function safeString(value: any): string {
    if (value === null || value === undefined || value === "") return "—";
    return String(value);
}

function getInitials(name: string): string {
    if (!name) return "NA";
    return name
        .split(" ")
        .map((n) => n[0]?.toUpperCase() || "")
        .join("")
        .slice(0, 2);
}

// Extract JSON payload from lead notes/metadata
function parseExtractionData(lead: any) {
    if (lead.metadata?.extractedData) return { data: lead.metadata.extractedData, cleanNote: lead.note };
    
    if (lead.note) {
        try {
            // Find JSON block in the note
            const jsonMatch = lead.note.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const data = JSON.parse(jsonMatch[0]);
                if (data.project || data.budget || data.timeline || data.city || data.interest) {
                    const cleanNote = lead.note.replace(jsonMatch[0], '').replace(/```json/g, '').replace(/```/g, '').trim();
                    return { data, cleanNote: cleanNote || "No additional notes." };
                }
            }
        } catch (e) {
            // Ignore parse errors
        }
    }
    return { data: null, cleanNote: lead.note };
}

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
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

    // ── Load lead ─────────────────────────────────────────────────────────────
    const loadLeadData = async () => {
        if (!leadId) return;
        setLoading(true);
        setError(null);
        try {
            const data = await fetchLeadById(leadId);
            let leadScore = data.score;
            
            // Try to fetch the real score from the API
            try {
                const scoreResponse = await getLeadScore(leadId);
                leadScore = scoreResponse.score;
            } catch (scoreErr) {
                console.warn("Failed to fetch lead score, falling back to computed:", scoreErr);
            }
            
            // Ensure all fields exist with fallbacks
            const enrichedLead: Lead = {
                ...data,
                id: data.id || leadId,
                name: data.name || "Unnamed Lead",
                company: data.company || "",
                source: data.source || "Unknown",
                status: data.status || "NEW",
                email: data.email || "",
                phone: data.phone || "",
                city: data.city || "",
                score: leadScore ?? computeLeadScore(data),
                tags: data.tags || [],
                note: data.note || "",
                owner: data.owner || "Unassigned",
                ownerAvatar: data.ownerAvatar || "",
                assignedTo: data.assignedTo || null,
                assignedToId: data.assignedToId || null,
                estimatedValue: data.estimatedValue || 0,
                createdAt: data.createdAt || new Date().toISOString(),
                deleted: data.deleted || false,
            };
            setLead(enrichedLead);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load lead.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLeadData();
    }, [leadId]);

    // ── Convert to deal ───────────────────────────────────────────────────────
    const handleConvert = () => {
        if (!leadId || converting || lead?.status === "DEAD") return;
        setIsConfirmModalOpen(true);
    };

    const executeConvert = async () => {
        setIsConfirmModalOpen(false);
        setConverting(true);
        setConvertError(null);

        try {
            if (!lead) {
                throw new Error("Lead data missing");
            }

            // STEP 1 → Create deal from lead
            const createdDeal = await convertLeadToDeal(leadId);

            console.log("[Lead Convert] Response:", createdDeal);

            // Extract deal ID across all possible backend response structures
            let dealId: string | undefined =
                createdDeal?.id ||
                createdDeal?.dealId ||
                createdDeal?.deal?.id ||
                createdDeal?.deal?.dealId ||
                createdDeal?.data?.id ||
                createdDeal?.data?.dealId ||
                createdDeal?.data?.deal?.id ||
                createdDeal?.result?.id ||
                createdDeal?.payload?.id;

            // Fallback: If backend response didn't include dealId directly, lookup created deal from list
            if (!dealId) {
                try {
                    console.log("[Lead Convert] dealId not directly in response, querying deals list...");
                    const allDeals = await fetchDeals();
                    const matched = allDeals.find(
                        (d) => d.leadId === leadId || (d.name && lead.name && d.name.toLowerCase() === lead.name.toLowerCase())
                    ) || allDeals[0];

                    if (matched && (matched.id || matched.dealId)) {
                        dealId = String(matched.id || matched.dealId || "");
                    }
                } catch (fallbackErr) {
                    console.warn("[Lead Convert] Fallback deal lookup notice:", fallbackErr);
                }
            }

            // STEP 2 → Optional sync lead data into created deal if dealId found
            if (dealId) {
                try {
                    const payload = {
                        name: lead.name,
                        amount: Number(lead.estimatedValue || 0),
                        stage: "NEW",
                        assignedToId: lead.assignedToId?.trim() || null,
                        companyId: (lead as any).companyId || null,
                        contactId: (lead as any).contactId || null,
                    };

                    await updateDeal(dealId, payload);
                } catch (syncErr: any) {
                    console.warn("[Lead Convert] Optional updateDeal sync notice:", syncErr?.response?.data || syncErr);
                }
            }

            toast.success("Lead converted to deal successfully");

            // STEP 3 → Navigate immediately to created deal or deals dashboard
            if (dealId) {
                router.replace(`/deals/${dealId}`);
            } else {
                router.replace("/deals");
            }

        } catch (err: any) {
            console.error("[Lead Convert Error]", err);

            const msg =
                err?.response?.data?.error ||
                err?.response?.data?.message ||
                err?.message ||
                "Conversion failed";

            setConvertError(msg);
            toast.error(msg);

        } finally {
            setConverting(false);
        }
    };

    // ── Loading ────────────────────────────────────────────────────────────────
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

    if (!lead && !loading && !error) {
        notFound();
        return null;
    }

    if (!lead) return null;

    const statusInfo = getLeadStatusInfo(lead.status);

    // Check if lead has any contact info
    const hasContactInfo = lead.email || lead.phone || lead.city || lead.company;
    const hasTags = lead.tags && lead.tags.length > 0;
    const { data: extractionData, cleanNote } = parseExtractionData(lead);
    const hasNote = cleanNote && cleanNote.trim().length > 0;
    const isWhatsAppAI = lead.source === "whatsapp_ai_detection";

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
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-gray-900 leading-tight">{lead.name || "Unnamed Lead"}</h1>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusInfo.style}`}>
                                {statusInfo.emoji} {statusInfo.label}
                            </span>
                        </div>
                        <p className="text-sm text-gray-400">{safeString(lead.company)}</p>
                    </div>
                </div>

                {/* Agent action buttons + Convert to Deal */}
                <div className="flex flex-col items-end gap-2">
                    {/* Research Agent button */}
                    <AgentTriggerButton
                        agentType="research"
                        payload={{
                            agentId: "research-agent",
                            action: "research",
                            parameters: {
                                entityType: "lead",
                                entityId: leadId,
                                includeExternalEnrichment: true,
                            },
                        }}
                        label="Research Lead"
                        icon={<Search size={14} className="shrink-0" />}
                        className="h-9"
                    />

                    {/* Lead Qualification Agent button */}
                    <AgentTriggerButton
                        agentType="qualify_lead"
                        payload={{
                            agentId: "lead-qualification-agent",
                            action: "qualify_lead",
                            parameters: {
                                leadId: leadId,
                                forceRecalculate: true,
                            },
                        }}
                        label="Qualify Lead"
                        icon={<BadgeCheck size={14} className="shrink-0" />}
                        className="h-9"
                    />

                    {/* Convert to Deal — primary CTA */}
                    <button
                        onClick={handleConvert}
                        disabled={converting || lead.status === "DEAD"}
                        className={`flex items-center gap-2 h-9 px-5 rounded-lg text-white text-[13px] font-semibold transition-colors shadow-sm ${lead.status === "DEAD"
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-blue-600 hover:bg-blue-700 shadow-blue-200 disabled:opacity-70"
                            }`}
                    >
                        {converting ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <Briefcase size={14} />
                        )}
                        {converting
                            ? "Converting..."
                            : lead.status === "DEAD"
                                ? "Cannot Convert Dead Lead"
                                : "Convert to Deal"}
                    </button>
                    {convertError && (
                        <p className="text-xs text-red-500 text-right max-w-[260px]">
                            {convertError}
                        </p>
                    )}
                </div>
            </div>

            {/* 11 Live Lifecycle & Intelligence Subsystems */}
            <LeadApiActionsToolbar leadId={leadId} leadName={lead.name} lead={lead} onLeadUpdated={loadLeadData} />

            {/* Status / Source / Created row - Fixed Source display */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Globe size={14} className="text-blue-400" /> Status
                    </p>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusInfo.style}`}>
                        {statusInfo.emoji} {statusInfo.label}
                    </span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <User size={14} className="text-green-400" /> Source
                    </p>
                    {isWhatsAppAI ? (
                        <AiBadge label="🤖 Auto-Detected via WhatsApp AI" />
                    ) : (
                        <span className="text-sm font-medium text-gray-700">{safeString(lead.source)}</span>
                    )}
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Calendar size={14} className="text-purple-400" /> Created At
                    </p>
                    <span className="text-sm font-medium text-gray-700">{formatDate(lead.createdAt)}</span>
                </div>
            </div>

            {/* Contact Information - Only show if there's data */}
            {hasContactInfo && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-50 bg-gray-50/50">
                        <h3 className="text-sm font-semibold text-gray-700">Contact Information</h3>
                    </div>
                    <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                        <div className="flex items-start gap-3">
                            <Mail className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs text-gray-400 mb-0.5">Email</p>
                                <p className="text-sm text-gray-800">{safeString(lead.email)}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Phone className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs text-gray-400 mb-0.5">Phone</p>
                                <p className="text-sm text-gray-800">{safeString(lead.phone)}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs text-gray-400 mb-0.5">Location</p>
                                <p className="text-sm text-gray-800">{safeString(lead.city)}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Building2 className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs text-gray-400 mb-0.5">Company</p>
                                <p className="text-sm text-gray-800">{safeString(lead.company)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Extraction Card */}
            {extractionData && (
                <AiExtractionCard data={extractionData} />
            )}

            {/* AI Communication Intelligence Widget */}
            <CommunicationIntelligenceWidget leadId={leadId} />

            {/* Lead Intelligence Panel */}
            <LeadIntelligencePanel lead={lead} />

            {/* Ownership & Assignment */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-50 bg-gray-50/50">
                    <h3 className="text-sm font-semibold text-gray-700">Assignment</h3>
                </div>
                <div className="p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                        {lead.assignedTo?.name
                            ? getInitials(lead.assignedTo.name)
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
            {/* Tags & Notes - Only show if they exist */}
            {(hasTags || hasNote) && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-50 bg-gray-50/50">
                        <h3 className="text-sm font-semibold text-gray-700">Additional Details</h3>
                    </div>
                    <div className="p-5 space-y-4">
                        {hasTags && (
                            <div>
                                <p className="text-xs text-gray-400 mb-2 flex items-center gap-1.5">
                                    <Tag className="w-3.5 h-3.5" /> Tags
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {Array.isArray(lead.tags) && lead.tags.map((tag: any, idx: number) => (
                                        <span
                                            key={tag.id || idx}
                                            className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium border border-blue-100"
                                        >
                                            {typeof tag === "string" ? tag : tag.label || tag.name || tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {hasNote && (
                            <div>
                                <p className="text-xs text-gray-400 mb-2 flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5" /> Note
                                </p>
                                <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 border border-gray-100 whitespace-pre-wrap">
                                    {cleanNote}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Empty State - If no data at all */}
            {!hasContactInfo && !hasTags && !hasNote && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                    <p className="text-gray-400 text-sm">No additional information available for this lead.</p>
                    <p className="text-gray-300 text-xs mt-1">Contact details, tags, and notes will appear here once added.</p>
                </div>
            )}

            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                title="Convert Lead"
                message={`Convert lead "${lead.name}" to a deal?`}
                confirmText="Convert"
                onConfirm={executeConvert}
                onCancel={() => setIsConfirmModalOpen(false)}
            />
        </div>
    );
}