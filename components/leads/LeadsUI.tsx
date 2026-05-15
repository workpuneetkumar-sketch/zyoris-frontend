"use client";

import {
    Search,
    Filter,
    Download,
    Plus,
    MoreVertical,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

import {
    Lead,
    LeadsFilters,
    LeadStatus,
} from "@/types/leads";

export interface LeadsTableProps {
    leads: Lead[];
    total: number;
    page: number;
    perPage: number;
    filters: LeadsFilters;
    loading: boolean;
    openMenu: number | null;
    onPageChange: (page: number) => void;
    onFiltersChange: (filters: LeadsFilters) => void;
    onNewLead: () => void;
    onExport: () => void;
    onAction: (action: string, lead: Lead) => void;
    setOpenMenu: (id: number | null) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<LeadStatus, string> = {
    NEW: "bg-blue-50 text-blue-600 border border-blue-200",
    CONTACTED: "bg-amber-50 text-amber-600 border border-amber-200",
    QUALIFIED: "bg-green-50 text-green-600 border border-green-200",
    CLOSED: "bg-purple-50 text-purple-600 border border-purple-200",
};
function scoreColor(score: number) {
    if (score >= 75) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 60) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-red-500 bg-red-50 border-red-200";
}

function Avatar({ initials }: { initials: string }) {
    return (
        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 text-[11px] font-bold flex items-center justify-center shrink-0">
            {initials}
        </div>
    );
}

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
                className="appearance-none h-9 pl-3 pr-8 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
                {options.map((o) => (
                    <option key={o}>{o}</option>
                ))}
            </select>
            <ChevronRight
                size={13}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none"
            />
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────
export function LeadsTable({
    leads,
    total,
    page,
    perPage,
    filters,
    loading,
    openMenu,
    onPageChange,
    onFiltersChange,
    onNewLead,
    onExport,
    onAction,
    setOpenMenu,
}: LeadsTableProps) {
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const safeLeads = leads ?? []; // ✅ null safety

    return (
        <div className="min-h-full">

            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight">Leads</h1>
                    <p className="text-sm text-gray-400 mt-0.5">Manage and track all incoming leads.</p>
                </div>
                <div className="flex items-center gap-2.5">
                    <button
                        onClick={onExport}
                        className="flex items-center gap-1.5 h-9 px-4 rounded-lg border border-gray-200 bg-white text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        <Download size={14} />
                        Export
                    </button>
                    <button
                        onClick={onNewLead}
                        className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-blue-600 text-white text-[13px] font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
                    >
                        <Plus size={15} />
                        New Lead
                    </button>
                </div>
            </div>

            {/* Table card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

                {/* Filters bar */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-wrap">
                    <Select
                        value={filters.status}
                        options={["All Status", "NEW", "CONTACTED", "QUALIFIED", "CLOSED"]}
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
                    <div className="relative ml-auto">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search leads..."
                            value={filters.search}
                            onChange={(e) => { onFiltersChange({ ...filters, search: e.target.value }); onPageChange(1); }}
                            className="h-9 pl-8 pr-4 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
                        />
                    </div>
                    <button className="flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-gray-200 bg-white text-[13px] font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                        <Filter size={13} />
                        Filters
                    </button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100">
                                {["Lead Name", "Company", "Source", "Owner", "Status", "Score", "Created At", "Actions"].map((h) => (
                                    <th key={h} className="text-left px-5 py-3 text-[12px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: perPage }).map((_, i) => (
                                    <tr key={i} className="border-b border-gray-50">
                                        {Array.from({ length: 8 }).map((_, j) => (
                                            <td key={j} className="px-5 py-4">
                                                <div className="h-3.5 bg-gray-100 rounded-md animate-pulse w-3/4" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : safeLeads.length === 0 ? (  // ✅ fixed
                                <tr>
                                    <td colSpan={8} className="text-center py-16 text-gray-400 text-sm">
                                        No leads found.
                                    </td>
                                </tr>
                            ) : (
                                safeLeads.map((lead) => (  // ✅ fixed
                                    <tr key={lead.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                                        <td className="px-5 py-3.5 font-medium text-gray-800 whitespace-nowrap">{lead.name}</td>
                                        <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{lead.company}</td>
                                        <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{lead.source}</td>
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <Avatar initials={lead.ownerAvatar} />
                                                <span className="text-gray-700">{lead.owner}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium ${STATUS_STYLES[lead.status]}`}>
                                                {lead.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <span className={`inline-flex items-center justify-center w-9 h-6 rounded-md text-[12px] font-bold border ${scoreColor(lead.score)}`}>
                                                {lead.score}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-gray-400 whitespace-nowrap text-[13px]">{lead.createdAt}</td>
                                        <td className="px-5 py-3.5 whitespace-nowrap relative">
                                            <button
                                                onClick={() => setOpenMenu(openMenu === lead.id ? null : lead.id)}
                                                className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                                            >
                                                <MoreVertical size={16} />
                                            </button>
                                            {openMenu === lead.id && (
                                                <div className="absolute right-4 top-10 z-20 bg-white border border-gray-100 rounded-xl shadow-lg py-1 w-36">
                                                    {["View", "Edit", "Assign", "Delete"].map((action) => (
                                                        <button
                                                            key={action}
                                                            onClick={() => { onAction(action, lead); setOpenMenu(null); }}
                                                            className={`w-full text-left px-4 py-2 text-[13px] hover:bg-gray-50 transition-colors ${action === "Delete" ? "text-red-500" : "text-gray-700"
                                                                }`}
                                                        >
                                                            {action}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
                    <p className="text-[13px] text-gray-400">
                        {loading
                            ? "Loading..."
                            : `Showing ${total === 0 ? 0 : (page - 1) * perPage + 1} to ${Math.min(page * perPage, total)} of ${total} leads`}
                    </p>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => onPageChange(Math.max(1, page - 1))}
                            disabled={page === 1 || loading}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={14} />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter((p) => p <= 5 || p === totalPages)
                            .map((p, idx, arr) => (
                                <>
                                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                                        <span key={`e-${p}`} className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm">…</span>
                                    )}
                                    <button
                                        key={p}
                                        onClick={() => onPageChange(p)}
                                        disabled={loading}
                                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-[13px] font-medium transition-colors ${page === p
                                            ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                                            : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                                            }`}
                                    >
                                        {p}
                                    </button>
                                </>
                            ))}
                        <button
                            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                            disabled={page === totalPages || loading}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {openMenu !== null && (
                <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
            )}
        </div>
    );
}