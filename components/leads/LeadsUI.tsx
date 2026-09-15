"use client";

import { useState, useEffect, useRef } from "react";
import EditLeadModal from "./EditLeadModal";
import ViewLeadModal from "./ViewLeadModal";
import { updateLead, deleteLead, getLeadSharePayload, exportLeadAsPdf, buildWhatsAppShareUrl, LeadSharePayload } from "@/lib/api/leadsApi";
import { toast } from "react-toastify";
import { LeadCheckbox } from "./BulkActionsToolbar";
import { AiBadge } from "@/components/ai/AiBadge";

import {
    Search,
    Filter,
    MoreVertical,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Trash2,
    Eye,
    Edit,
    Briefcase,
    Share2,
    MessageCircle,
    FileDown,
    Loader2 as SpinnerIcon,
    X,
    Calendar,
    SlidersHorizontal,
    Users,
    UserPlus,
} from "lucide-react";

import { Lead, LeadsFilters } from "@/types/leads";
import { getLeadStatusInfo } from "@/utils/leadStatus";

export interface LeadsTableProps {
    leads: Lead[];
    total: number;
    page: number;
    perPage: number;
    filters: LeadsFilters;
    loading: boolean;
    openMenu: string | null;
    convertingId?: string | null;
    onPageChange: (page: number) => void;
    onRefreshLeads: () => Promise<void>;
    onFiltersChange: (filters: LeadsFilters) => void;
    onNewLead: () => void;
    onExport: () => void;
    onAction: (action: string, lead: Lead) => void;
    setOpenMenu: (id: string | null) => void;
    isSelected: (id: string) => boolean;
    onToggleSelect: (id: string) => void;
    onOpenAdvancedFilters: () => void;
    onPerPageChange: (size: number) => void;
    onDateRangeChange: (from: string, to: string) => void;
    dateFrom?: string;
    dateTo?: string;
    filterCount?: number;
    usingAdvanced?: boolean;
    onPromoteToCustomer?: (lead: Lead) => void;
}

// ── Avatar ────────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
    "bg-blue-100 text-blue-700",
    "bg-violet-100 text-violet-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
    "bg-cyan-100 text-cyan-700",
    "bg-indigo-100 text-indigo-700",
    "bg-pink-100 text-pink-700",
];

function nameToColor(name: string): string {
    let sum = 0;
    for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function LeadAvatar({ name }: { name: string }) {
    const initials = name
        .split(" ")
        .map((n) => n[0]?.toUpperCase() || "")
        .join("")
        .slice(0, 2);
    const colorClass = nameToColor(name);
    return (
        <div className={`w-8 h-8 rounded-full ${colorClass} text-[11px] font-bold flex items-center justify-center shrink-0 select-none`}>
            {initials || "?"}
        </div>
    );
}

function OwnerAvatar({ name }: { name: string }) {
    const initial = name.trim()[0]?.toUpperCase() || "?";
    const colorClass = nameToColor(name);
    return (
        <div className={`w-7 h-7 rounded-full ${colorClass} text-[11px] font-bold flex items-center justify-center shrink-0 select-none`}>
            {initial}
        </div>
    );
}

// ── Dropdown Select ───────────────────────────────────────────────────────────

function Select({
    value,
    options,
    onChange,
}: {
    value: string;
    options: string[];
    onChange: (v: string) => void;
}) {
    return (
        <div className="relative">
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="appearance-none h-9 pl-3 pr-8 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all"
            >
                {options.map((o) => (
                    <option key={o}>{o}</option>
                ))}
            </select>
            <ChevronDown
                size={14}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
        </div>
    );
}

// ── Score Badge ───────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number | undefined | null }) {
    if (score == null || isNaN(Number(score))) return <span className="text-xs text-gray-300">—</span>;
    const n = Number(score);
    const cls =
        n >= 70
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : n >= 40
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-red-50 text-red-600 border-red-200";
    return (
        <span className={`inline-flex items-center justify-center w-9 h-7 rounded-lg text-[12px] font-bold border ${cls}`}>
            {n}
        </span>
    );
}

// ── Status Badge ──────────────────────────────────────────────────────────────
// Renders a clean pill badge that matches the screenshot style (no emoji, clean text)

function StatusBadge({ status }: { status: string | undefined }) {
    const info = getLeadStatusInfo(status);
    // Use only the label text (no emoji) for cleaner look matching screenshot
    const label = info.label.replace(/^\S+\s/, ""); // strip leading emoji word

    const colorMap: Record<string, string> = {
        "New Lead":  "bg-blue-50 text-blue-700 border border-blue-200",
        "Warm Lead": "bg-amber-50 text-amber-700 border border-amber-200",
        "Hot Lead":  "bg-red-50 text-red-700 border border-red-200",
        "Dead Lead": "bg-gray-100 text-gray-600 border border-gray-200",
    };

    const cls = colorMap[info.label] ?? info.style;

    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-medium whitespace-nowrap ${cls}`}>
            {info.label}
        </span>
    );
}

// ── Share Lead Modal ──────────────────────────────────────────────────────────

function ShareLeadModal({ lead, onClose }: { lead: Lead; onClose: () => void }) {
    const [payload, setPayload] = useState<LeadSharePayload | null>(null);
    const [loadingShare, setLoadingShare] = useState(true);
    const [exportingPdf, setExportingPdf] = useState(false);

    useEffect(() => {
        let active = true;
        setLoadingShare(true);
        getLeadSharePayload(lead.id)
            .then((data) => { if (active) setPayload(data); })
            .catch(() => {
                if (!active) return;
                setPayload({
                    leadId: lead.id, name: lead.name, email: lead.email, phone: lead.phone,
                    company: lead.company, city: lead.city, source: lead.source, status: lead.status,
                    estimatedValue: lead.estimatedValue, score: lead.score,
                    assignedTo: lead.assignedTo ?? undefined, tags: lead.tags, note: lead.note,
                });
            })
            .finally(() => { if (active) setLoadingShare(false); });
        return () => { active = false; };
    }, [lead]);

    const handleWhatsApp = () => {
        if (!payload) return;
        const phone = payload.phone?.replace(/\D/g, "") || lead.phone?.replace(/\D/g, "") || "";
        window.open(buildWhatsAppShareUrl(payload, phone), "_blank", "noopener,noreferrer");
    };

    const handlePdf = async () => {
        if (exportingPdf) return;
        setExportingPdf(true);
        try {
            const blob = await exportLeadAsPdf(lead.id);
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `lead-${lead.name?.replace(/\s+/g, "-") || lead.id}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success("PDF downloaded");
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "PDF export failed");
        } finally {
            setExportingPdf(false);
        }
    };

    const handleCopyLink = () => {
        const url = payload?.shareUrl || `${window.location.origin}/leads/${lead.id}`;
        navigator.clipboard.writeText(url).then(() => toast.success("Link copied!")).catch(() => toast.error("Failed to copy"));
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center">
                            <Share2 size={16} className="text-green-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900">Share Lead</h3>
                            <p className="text-xs text-gray-400">{lead.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
                        <X size={16} />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    {loadingShare ? (
                        <div className="flex items-center justify-center py-8 gap-2 text-gray-400 text-sm">
                            <SpinnerIcon size={18} className="animate-spin" />Loading share data…
                        </div>
                    ) : (
                        <>
                            <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 space-y-2">
                                <p className="text-sm font-semibold text-gray-800">{payload?.name || lead.name}</p>
                                {payload?.company && <p className="text-xs text-gray-500">{payload.company}</p>}
                                <div className="flex flex-wrap gap-3 pt-1">
                                    {payload?.status && (
                                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">{payload.status}</span>
                                    )}
                                    {payload?.estimatedValue && payload.estimatedValue > 0 && (
                                        <span className="text-xs font-medium text-emerald-700">₹{payload.estimatedValue.toLocaleString()}</span>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                <button onClick={handleWhatsApp} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/20 transition-all group">
                                    <div className="w-9 h-9 rounded-full bg-[#25D366] flex items-center justify-center shrink-0">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="text-sm font-semibold text-gray-800">Share via WhatsApp</p>
                                        <p className="text-xs text-gray-500">Open WhatsApp with pre-filled message</p>
                                    </div>
                                    <ChevronRight size={14} className="text-gray-400 group-hover:text-gray-600" />
                                </button>
                                <button onClick={handlePdf} disabled={exportingPdf} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 hover:bg-red-100 border border-red-100 transition-all group disabled:opacity-60">
                                    <div className="w-9 h-9 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                                        {exportingPdf ? <SpinnerIcon size={16} className="text-white animate-spin" /> : <FileDown size={16} className="text-white" />}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="text-sm font-semibold text-gray-800">{exportingPdf ? "Generating PDF…" : "Export as PDF"}</p>
                                        <p className="text-xs text-gray-500">Download a formatted PDF of this lead</p>
                                    </div>
                                    <ChevronRight size={14} className="text-gray-400 group-hover:text-gray-600" />
                                </button>
                                <button onClick={handleCopyLink} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-100 transition-all group">
                                    <div className="w-9 h-9 rounded-full bg-gray-500 flex items-center justify-center shrink-0">
                                        <MessageCircle size={16} className="text-white" />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="text-sm font-semibold text-gray-800">Copy Link</p>
                                        <p className="text-xs text-gray-500">Copy the lead URL to clipboard</p>
                                    </div>
                                    <ChevronRight size={14} className="text-gray-400 group-hover:text-gray-600" />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Date Range Picker ─────────────────────────────────────────────────────────

function formatDisplayDate(iso: string): string {
    if (!iso) return "";
    try {
        const d = new Date(iso);
        return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
        return iso;
    }
}

interface DateRangePickerProps {
    dateFrom: string;
    dateTo: string;
    onChange: (from: string, to: string) => void;
}

function DateRangePicker({ dateFrom, dateTo, onChange }: DateRangePickerProps) {
    const [open, setOpen] = useState(false);
    const [localFrom, setLocalFrom] = useState(dateFrom);
    const [localTo, setLocalTo] = useState(dateTo);
    const containerRef = useRef<HTMLDivElement>(null);

    // Keep local state in sync when parent resets
    useEffect(() => { setLocalFrom(dateFrom); }, [dateFrom]);
    useEffect(() => { setLocalTo(dateTo); }, [dateTo]);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        function handleClick(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [open]);

    const hasRange = dateFrom || dateTo;

    function handleApply() {
        onChange(localFrom, localTo);
        setOpen(false);
    }

    function handleClear() {
        setLocalFrom("");
        setLocalTo("");
        onChange("", "");
        setOpen(false);
    }

    // Button label
    let label = "Date range";
    if (dateFrom && dateTo) {
        label = `${formatDisplayDate(dateFrom)} – ${formatDisplayDate(dateTo)}`;
    } else if (dateFrom) {
        label = `From ${formatDisplayDate(dateFrom)}`;
    } else if (dateTo) {
        label = `Until ${formatDisplayDate(dateTo)}`;
    }

    return (
        <div ref={containerRef} className="relative">
            {/* Trigger button */}
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className={`flex items-center gap-2 h-9 px-3 rounded-lg border text-sm transition-colors whitespace-nowrap ${
                    hasRange
                        ? "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
            >
                <Calendar size={14} className={hasRange ? "text-blue-500 shrink-0" : "text-gray-400 shrink-0"} />
                <span className="max-w-[200px] truncate">{label}</span>
                {hasRange && (
                    <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); handleClear(); }}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); handleClear(); } }}
                        className="ml-0.5 w-4 h-4 flex items-center justify-center rounded-full hover:bg-blue-200 text-blue-500 transition-colors"
                        title="Clear date range"
                    >
                        <X size={10} />
                    </span>
                )}
            </button>

            {/* Popover */}
            {open && (
                <div className="absolute left-0 top-[calc(100%+6px)] z-[200] bg-white border border-gray-200 rounded-xl shadow-xl p-4 w-72">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Date Range</p>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Start date</label>
                            <input
                                type="date"
                                value={localFrom}
                                max={localTo || undefined}
                                onChange={(e) => setLocalFrom(e.target.value)}
                                className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">End date</label>
                            <input
                                type="date"
                                value={localTo}
                                min={localFrom || undefined}
                                onChange={(e) => setLocalTo(e.target.value)}
                                className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button
                            type="button"
                            onClick={handleClear}
                            className="flex-1 h-8 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            Clear
                        </button>
                        <button
                            type="button"
                            onClick={handleApply}
                            disabled={!localFrom && !localTo}
                            className="flex-1 h-8 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors"
                        >
                            Apply
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Format date for table (matches screenshot: "07 May 2026\n10:30 AM") ────────

function formatTableDate(dateStr: string | undefined): { date: string; time: string } {
    if (!dateStr) return { date: "—", time: "" };
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return { date: "—", time: "" };
        const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
        const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
        return { date, time };
    } catch {
        return { date: "—", time: "" };
    }
}

// ── Main LeadsTable component ─────────────────────────────────────────────────

export function LeadsTable({
    leads,
    total,
    page,
    perPage,
    filters,
    loading,
    openMenu,
    convertingId,
    onPageChange,
    onRefreshLeads,
    onFiltersChange,
    onNewLead,
    onExport,
    onAction,
    setOpenMenu,
    isSelected,
    onToggleSelect,
    onOpenAdvancedFilters,
    onPerPageChange,
    onDateRangeChange,
    dateFrom = "",
    dateTo = "",
    filterCount = 0,
    usingAdvanced = false,
    onPromoteToCustomer,
}: LeadsTableProps) {
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const safeLeads = leads ?? [];

    const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
    const [editingLead, setEditingLead] = useState<Lead | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [viewingLead, setViewingLead] = useState<Lead | null>(null);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [sharingLead, setSharingLead] = useState<Lead | null>(null);
    const [isShareOpen, setIsShareOpen] = useState(false);

    // Per-page selector state
    const [localPerPage, setLocalPerPage] = useState(perPage);
    const PER_PAGE_OPTIONS = [8, 10, 20, 50, 100];

    const handleDelete = async (leadId: string) => {
        setDeletingId(leadId);
        setOpenMenu(null);
        setMenuPos(null);
        try {
            const result = await deleteLead(leadId);
            if (result.success) {
                toast.success(result.message || "Lead deleted successfully");
                await onRefreshLeads();
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to delete lead");
        } finally {
            setDeletingId(null);
            setConfirmDeleteId(null);
        }
    };

    return (
        <div className="min-h-full">
            {/* Table card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">

                {/* Filters bar */}
                <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-100">
                    {/* Left: dropdowns + date range */}
                    <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                        <Select
                            value={filters.status}
                            options={["All Status", "NEW", "WARM", "HOT", "DEAD"]}
                            onChange={(v) => { onFiltersChange({ ...filters, status: v }); onPageChange(1); }}
                        />
                        <Select
                            value={filters.source}
                            options={["All Sources", "Website", "Referral", "LinkedIn", "Cold Call"]}
                            onChange={(v) => { onFiltersChange({ ...filters, source: v }); onPageChange(1); }}
                        />
                        <Select
                            value={filters.owner}
                            options={["All Owners"]}
                            onChange={(v) => { onFiltersChange({ ...filters, owner: v }); onPageChange(1); }}
                        />
                        {/* Date range — standalone picker, NOT the advanced filters drawer */}
                        <DateRangePicker
                            dateFrom={dateFrom}
                            dateTo={dateTo}
                            onChange={onDateRangeChange}
                        />
                    </div>

                    {/* Right: search + filters button */}
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search leads..."
                                value={filters.search}
                                onChange={(e) => { onFiltersChange({ ...filters, search: e.target.value }); onPageChange(1); }}
                                className="h-9 pl-9 pr-4 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-56 transition-all"
                            />
                        </div>
                        <button
                            onClick={onOpenAdvancedFilters}
                            className={`flex items-center gap-2 h-9 px-3.5 rounded-lg border text-sm font-medium transition-colors ${
                                filterCount > 0
                                    ? "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                            }`}
                        >
                            <SlidersHorizontal size={14} />
                            Filters
                            {filterCount > 0 && (
                                <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                                    {filterCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Server-filtered indicator */}
                {usingAdvanced && (
                    <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
                        <span className="text-xs font-medium text-blue-700">Server-filtered view active</span>
                    </div>
                )}

                {/* Table */}
                <div className="overflow-x-auto overflow-y-visible">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/60">
                                <th className="text-left px-4 py-3 w-10">
                                    {/* checkbox placeholder — bulk select is handled by BulkActionsToolbar */}
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                                    Lead ↕
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                                    Company
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                                    Owner ↕
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                                    Status ↕
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                                    Score ↕
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                                    Created At ↕
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: perPage }).map((_, i) => (
                                    <tr key={i} className="border-b border-gray-50">
                                        <td className="px-4 py-3.5"></td>
                                        {Array.from({ length: 7 }).map((_, j) => (
                                            <td key={j} className="px-4 py-3.5">
                                                <div className="h-4 bg-gray-100 rounded-md animate-pulse w-3/4" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : safeLeads.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-16 text-gray-400 text-sm">
                                        No leads found.
                                    </td>
                                </tr>
                            ) : (
                                safeLeads.map((lead) => {
                                    const isDeleting = deletingId === lead.id;
                                    const { date, time } = formatTableDate(lead.createdAt);
                                    return (
                                        <tr
                                            key={lead.id}
                                            onClick={() => { setViewingLead(lead); setIsViewOpen(true); }}
                                            className="border-b border-gray-50 hover:bg-blue-50/40 transition-colors cursor-pointer"
                                        >
                                            {/* Checkbox — stop propagation so selecting doesn't open modal */}
                                            <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                                                <LeadCheckbox
                                                    leadId={lead.id}
                                                    isSelected={isSelected(lead.id)}
                                                    onToggle={onToggleSelect}
                                                />
                                            </td>

                                            {/* Lead name + avatar + source */}
                                            <td className="px-4 py-3.5 whitespace-nowrap">
                                                <div className="flex items-center gap-2.5">
                                                    <LeadAvatar name={lead.name} />
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-blue-600 leading-tight truncate max-w-[180px] underline-offset-2 hover:underline">
                                                            {lead.name}
                                                        </p>
                                                        {lead.source && String(lead.source).toLowerCase() !== "whatsapp_ai_detection" && (
                                                            <p className="text-xs text-gray-400 leading-tight mt-0.5">{lead.source}</p>
                                                        )}
                                                        {String(lead.source || "").toLowerCase() === "whatsapp_ai_detection" && (
                                                            <AiBadge label="🤖 Auto-Detected via WhatsApp AI" />
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Company */}
                                            <td className="px-4 py-3.5 text-sm text-gray-500 whitespace-nowrap">
                                                {lead.company || <span className="text-gray-300">—</span>}
                                            </td>

                                            {/* Owner */}
                                            <td className="px-4 py-3.5 whitespace-nowrap">
                                                {lead.assignedTo ? (
                                                    <div className="flex items-center gap-2">
                                                        <OwnerAvatar name={lead.assignedTo.name} />
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-gray-700 leading-tight truncate max-w-[120px]">
                                                                {lead.assignedTo.name}
                                                            </p>
                                                            {(lead.assignedTo as any)?.role && (
                                                                <p className="text-xs text-gray-400 leading-tight">{(lead.assignedTo as any).role}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 text-gray-400 border border-gray-200">
                                                        Unassigned
                                                    </span>
                                                )}
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-3.5 whitespace-nowrap">
                                                <StatusBadge status={lead.status} />
                                            </td>

                                            {/* Score */}
                                            <td className="px-4 py-3.5 whitespace-nowrap">
                                                <ScoreBadge score={lead.score} />
                                            </td>

                                            {/* Created At */}
                                            <td className="px-4 py-3.5 whitespace-nowrap">
                                                <div>
                                                    <p className="text-sm text-gray-700 leading-tight">{date}</p>
                                                    {time && <p className="text-xs text-gray-400 leading-tight mt-0.5">{time}</p>}
                                                </div>
                                            </td>

                                            {/* Actions — stop propagation so menu click doesn't open modal */}
                                            <td className="px-4 py-3.5 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                                                {convertingId === lead.id ? (
                                                    <div className="w-8 h-8 flex items-center justify-center">
                                                        <span className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                                                    </div>
                                                ) : isDeleting ? (
                                                    <div className="w-8 h-8 flex items-center justify-center">
                                                        <span className="w-4 h-4 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" />
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={(e) => {
                                                            if (openMenu === lead.id) {
                                                                setOpenMenu(null);
                                                                setMenuPos(null);
                                                            } else {
                                                                const rect = e.currentTarget.getBoundingClientRect();
                                                                setMenuPos({ top: rect.bottom + 4, left: rect.right - 160 });
                                                                setOpenMenu(lead.id);
                                                            }
                                                        }}
                                                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                                                    >
                                                        <MoreVertical size={16} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>


                {/* Pagination */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 border-t border-gray-100">
                    {/* Showing text */}
                    <p className="text-sm text-gray-500 shrink-0">
                        {loading
                            ? "Loading..."
                            : total === 0
                                ? "No leads found"
                                : `Showing ${(page - 1) * perPage + 1} to ${Math.min(page * perPage, total)} of ${total} leads`}
                    </p>

                    {/* Page buttons + per-page */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Prev */}
                        <button
                            onClick={() => onPageChange(Math.max(1, page - 1))}
                            disabled={page === 1 || loading}
                            className="flex items-center gap-1 h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-600 font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronLeft size={15} />
                            Previous
                        </button>

                        {/* Page buttons */}
                        {(() => {
                            const delta = 1;
                            const range: number[] = [];
                            const rangeWithDots: (number | "...")[] = [];
                            let prev: number | undefined;

                            for (let i = Math.max(2, page - delta); i <= Math.min(totalPages - 1, page + delta); i++) {
                                range.push(i);
                            }

                            if (totalPages > 1) {
                                [1, ...range, totalPages].forEach((i) => {
                                    if (prev !== undefined) {
                                        if (i - prev === 2) rangeWithDots.push(prev + 1);
                                        else if (i - prev > 2) rangeWithDots.push("...");
                                    }
                                    rangeWithDots.push(i);
                                    prev = i;
                                });
                            } else {
                                rangeWithDots.push(1);
                            }

                            return rangeWithDots.map((p, idx) =>
                                p === "..." ? (
                                    <span key={`dots-${idx}`} className="w-9 h-9 flex items-center justify-center text-gray-400 text-sm select-none">
                                        ...
                                    </span>
                                ) : (
                                    <button
                                        key={p}
                                        onClick={() => onPageChange(p as number)}
                                        disabled={loading}
                                        className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
                                            page === p
                                                ? "bg-blue-600 text-white shadow-sm"
                                                : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                                        }`}
                                    >
                                        {p}
                                    </button>
                                )
                            );
                        })()}

                        {/* Next */}
                        <button
                            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                            disabled={page === totalPages || loading}
                            className="flex items-center gap-1 h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-600 font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                            Next
                            <ChevronRight size={15} />
                        </button>

                        {/* Per-page selector */}
                        <div className="relative ml-1">
                            <select
                                value={perPage}
                                onChange={(e) => {
                                    const newSize = Number(e.target.value);
                                    onPerPageChange(newSize);
                                    onPageChange(1);
                                }}
                                className="appearance-none h-9 pl-3 pr-7 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            >
                                {PER_PAGE_OPTIONS.map((n) => (
                                    <option key={n} value={n}>{n} / page</option>
                                ))}
                            </select>
                            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>


            {/* Context menu (portal-positioned) */}
            {openMenu !== null && (
                <>
                    <div className="fixed inset-0 z-[9998]" onClick={() => { setOpenMenu(null); setMenuPos(null); }} />
                    {menuPos && (
                        <div
                            className="fixed z-[9999] bg-white border border-gray-100 rounded-xl shadow-xl py-1 w-44"
                            style={{ top: menuPos.top, left: menuPos.left }}
                        >
                            <button
                                onClick={() => {
                                    const lead = safeLeads.find((l) => l.id === openMenu);
                                    if (lead) { setViewingLead(lead); setIsViewOpen(true); setOpenMenu(null); setMenuPos(null); }
                                }}
                                className="w-full text-left px-4 py-2 text-[13px] hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700"
                            >
                                <Eye size={14} /> View
                            </button>
                            <button
                                onClick={() => {
                                    const lead = safeLeads.find((l) => l.id === openMenu);
                                    if (lead) { setEditingLead(lead); setIsEditOpen(true); setOpenMenu(null); setMenuPos(null); }
                                }}
                                className="w-full text-left px-4 py-2 text-[13px] hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700"
                            >
                                <Edit size={14} /> Edit
                            </button>
                            <button
                                onClick={() => {
                                    const lead = safeLeads.find((l) => l.id === openMenu);
                                    if (lead) { onAction("Convert", lead); setOpenMenu(null); setMenuPos(null); }
                                }}
                                className="w-full text-left px-4 py-2 text-[13px] hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700"
                            >
                                <Briefcase size={14} /> Convert to Deal
                            </button>
                            {onPromoteToCustomer && (
                                <button
                                    onClick={() => {
                                        const lead = safeLeads.find((l) => l.id === openMenu);
                                        if (lead) { onPromoteToCustomer(lead); setOpenMenu(null); setMenuPos(null); }
                                    }}
                                    className="w-full text-left px-4 py-2 text-[13px] hover:bg-gray-50 transition-colors flex items-center gap-2 text-blue-600"
                                >
                                    <UserPlus size={14} /> Promote to Customer
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    const lead = safeLeads.find((l) => l.id === openMenu);
                                    if (lead) { setSharingLead(lead); setIsShareOpen(true); setOpenMenu(null); setMenuPos(null); }
                                }}
                                className="w-full text-left px-4 py-2 text-[13px] hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700"
                            >
                                <Share2 size={14} /> Share
                            </button>
                            <button
                                onClick={() => {
                                    const lead = safeLeads.find((l) => l.id === openMenu);
                                    if (lead) { setConfirmDeleteId(lead.id); setOpenMenu(null); setMenuPos(null); }
                                }}
                                className="w-full text-left px-4 py-2 text-[13px] hover:bg-gray-50 transition-colors flex items-center gap-2 text-red-500 border-t border-gray-100 mt-1 pt-1"
                            >
                                <Trash2 size={14} /> Delete
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Edit modal */}
            {isEditOpen && editingLead && (
                <EditLeadModal
                    lead={{
                        leadId: editingLead.id,
                        name: editingLead.name,
                        email: editingLead.email || "",
                        phone: editingLead.phone || "",
                        company: editingLead.company || "",
                        city: editingLead.city || "",
                        source: editingLead.source || "",
                        status: editingLead.status || "",
                        estimatedValue: editingLead.estimatedValue?.toString() || "",
                        assignedToId: editingLead.assignedToId || "",
                        tags: editingLead.tags || [],
                        note: editingLead.note || "",
                    }}
                    onClose={() => { setIsEditOpen(false); setEditingLead(null); }}
                    onSave={async (updatedData) => {
                        try {
                            const payload = {
                                ...updatedData,
                                estimatedValue: (updatedData.estimatedValue !== "" && updatedData.estimatedValue !== undefined && updatedData.estimatedValue !== null)
                                    ? Number(updatedData.estimatedValue)
                                    : undefined,
                            };
                            await updateLead(editingLead.id, payload as unknown as Partial<Lead>);
                            setIsEditOpen(false);
                            setEditingLead(null);
                            await onRefreshLeads();
                            toast.success("Lead updated successfully");
                        } catch (error) {
                            toast.error("Failed to update lead");
                        }
                    }}
                />
            )}

            {/* View modal */}
            {isViewOpen && viewingLead && (
                <ViewLeadModal
                    lead={viewingLead}
                    onClose={() => { setIsViewOpen(false); setViewingLead(null); }}
                />
            )}

            {/* Share modal */}
            {isShareOpen && sharingLead && (
                <ShareLeadModal
                    lead={sharingLead}
                    onClose={() => { setIsShareOpen(false); setSharingLead(null); }}
                />
            )}

            {/* Delete confirm */}
            {confirmDeleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
                        <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center">
                            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
                                <Trash2 size={22} className="text-red-500" />
                            </div>
                            <h2 className="text-[16px] font-bold text-gray-900 mb-1">Delete Lead</h2>
                            <p className="text-[13px] text-gray-500">Are you sure you want to delete this lead? This action cannot be undone.</p>
                        </div>
                        <div className="flex gap-3 px-6 pb-6">
                            <button
                                onClick={() => setConfirmDeleteId(null)}
                                disabled={deletingId === confirmDeleteId}
                                className="flex-1 h-10 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(confirmDeleteId)}
                                disabled={deletingId === confirmDeleteId}
                                className="flex-1 h-10 rounded-xl bg-red-600 text-white text-[13px] font-semibold hover:bg-red-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                            >
                                {deletingId === confirmDeleteId ? (
                                    <><SpinnerIcon size={14} className="animate-spin" /> Deleting…</>
                                ) : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
