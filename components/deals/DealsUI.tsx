// components/deals/DealsUI.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
    Search,
    ChevronDown,
    Plus,
    CheckCircle2,
    XCircle,
    X,
    AlertCircle,
} from "lucide-react";
import { Deal, DealsFilters, DEFAULT_DEAL_STAGES } from "@/types/deals";
import { getStageConfig } from "@/lib/dealConfig";
import { CreateDealPayload } from "@/lib/api/dealsApi";

// ── Types ──────────────────────────────────────────────────────────────────

interface DealsUIProps {
    deals: Deal[];
    dealsByStage: Map<string, Deal[]>;
    loading: boolean;
    filters: DealsFilters;
    totalPipeline: number;
    avgDealSize: number;
    winRate: number;
    conversionRate: number;
    isCreateOpen: boolean;
    creating: boolean;
    createError: string | null;
    defaultStage: string;
    onFiltersChange: (filters: DealsFilters) => void;
    onStageChange?: (dealId: string, newStage: string) => void;
    onOpenCreate: (stage?: string) => void;
    onCloseCreate: () => void;
    onCreateDeal: (data: CreateDealPayload) => Promise<boolean>;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
    if (amount >= 1_000_000) return `₹${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000)     return `₹${(amount / 1_000).toFixed(0)}K`;
    return `₹${amount.toLocaleString("en-IN")}`;
}

function formatAmount(amount: number): string {
    return `₹${amount.toLocaleString("en-IN")}`;
}

// ── Create Deal Modal ──────────────────────────────────────────────────────

interface CreateDealModalProps {
    defaultStage: string;
    creating: boolean;
    createError: string | null;
    onClose: () => void;
    onSave: (data: CreateDealPayload) => Promise<boolean>;
}

function CreateDealModal({ defaultStage, creating, createError, onClose, onSave }: CreateDealModalProps) {
    const [form, setForm] = useState({
        name: "",
        amount: "",
        stage: defaultStage,
    });
    const [errors, setErrors] = useState<{ name?: string; amount?: string }>({});

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        // clear field error on change
        if (e.target.name === "name" || e.target.name === "amount") {
            setErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
        }
    };

    const handleSubmit = async () => {
        const newErrors: { name?: string; amount?: string } = {};
        if (!form.name.trim())                         newErrors.name   = "Deal name is required";
        if (!form.amount || isNaN(Number(form.amount))) newErrors.amount = "Valid amount is required";
        if (Number(form.amount) < 0)                   newErrors.amount = "Amount must be positive";

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        await onSave({
            name: form.name.trim(),
            amount: Number(form.amount),
            stage: form.stage,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-gray-50 w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">New Deal</h2>
                        <p className="text-sm text-gray-400 mt-0.5">Add a deal to your pipeline</p>
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
                    {createError && (
                        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-[13px] text-red-600">
                            <AlertCircle size={14} className="shrink-0" />
                            {createError}
                        </div>
                    )}

                    {/* Deal Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Deal Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            placeholder="e.g. Acme Corp Enterprise"
                            className={`w-full h-10 rounded-lg border px-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 ${
                                errors.name ? "border-red-400" : "border-gray-300 focus:border-blue-500"
                            }`}
                        />
                        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Amount (INR) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                            <input
                                name="amount"
                                type="number"
                                min="0"
                                step="1"
                                value={form.amount}
                                onChange={handleChange}
                                placeholder="0"
                                className={`w-full h-10 rounded-lg border pl-7 pr-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 ${
                                    errors.amount ? "border-red-400" : "border-gray-300 focus:border-blue-500"
                                }`}
                            />
                        </div>
                        {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
                    </div>

                    {/* Stage */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Stage <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="stage"
                            value={form.stage}
                            onChange={handleChange}
                            className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        >
                            {[...DEFAULT_DEAL_STAGES].map((s) => (
                                <option key={s} value={s}>
                                    {getStageConfig(s).label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 bg-white border-t border-gray-200">
                    <button
                        onClick={onClose}
                        disabled={creating}
                        className="h-10 px-5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={creating}
                        className="h-10 px-5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-70 transition-colors shadow-sm shadow-blue-200"
                    >
                        {creating ? "Creating..." : "Create Deal"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Select ────────────────────────────────────────────────────────────────

function Select({
    value,
    options,
    onChange,
    placeholder,
}: {
    value: string;
    options: string[];
    onChange: (v: string) => void;
    placeholder?: string;
}) {
    return (
        <div className="relative">
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="appearance-none h-9 pl-3 pr-8 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
                {placeholder && <option value="">{placeholder}</option>}
                {options.map((o) => (
                    <option key={o} value={o}>{o}</option>
                ))}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
    );
}

// ── Skeleton card ──────────────────────────────────────────────────────────

function SkeletonCard() {
    return (
        <div className="bg-white rounded-xl border border-gray-100 p-3.5 animate-pulse">
            <div className="h-3.5 bg-gray-100 rounded w-3/4 mb-2.5" />
            <div className="h-4 bg-gray-100 rounded w-1/3 mb-2" />
            <div className="h-3 bg-gray-100 rounded w-1/2 mb-1.5" />
            <div className="h-3 bg-gray-100 rounded w-1/3" />
        </div>
    );
}

// ── Deal card ──────────────────────────────────────────────────────────────

function DealCard({
    deal,
    onStageChange,
}: {
    deal: Deal;
    onStageChange: (dealId: string, newStage: string) => void;
}) {
    const cfg = getStageConfig(deal.stage);
    const isWon  = deal.stage.toUpperCase() === "WON";
    const isLost = deal.stage.toUpperCase() === "LOST";

    const handleStageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        e.stopPropagation();
        const newStage = e.target.value;
        if (newStage !== deal.stage) onStageChange(deal.dealId, newStage);
    };

    return (
        <Link href={`/deals/${deal.dealId}`} className="block">
            <div className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex-1">
                        <p className="text-[13px] font-semibold text-gray-800 leading-snug group-hover:text-blue-600 transition-colors">
                            {deal.name}
                        </p>
                    </div>
                    {isWon  && <CheckCircle2 size={15} className="text-green-500 shrink-0 mt-0.5" />}
                    {isLost && <XCircle      size={15} className="text-red-400   shrink-0 mt-0.5" />}
                </div>

                <p className={`text-[15px] font-bold mb-1.5 ${cfg.color}`}>
                    {formatAmount(deal.amount)}
                </p>

                {/* Stage selector */}
                <div className="mb-2.5" onClick={(e) => e.stopPropagation()}>
                    <select
                        value={deal.stage}
                        onChange={handleStageChange}
                        className="appearance-none w-full h-8 pl-2.5 pr-7 rounded-md border border-gray-200 bg-white text-[12px] text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                        {[...DEFAULT_DEAL_STAGES].map((stage) => (
                            <option key={stage} value={stage}>
                                {getStageConfig(stage).label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Conversion probability */}
                <div className="flex items-center justify-between">
                    <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${isWon ? "bg-green-400" : isLost ? "bg-red-300" : "bg-blue-400"}`}
                            style={{ width: `${Math.round(deal.conversionProbability * 100)}%` }}
                        />
                    </div>
                    <span className="text-[11px] text-gray-400 ml-2 shrink-0">
                        {Math.round(deal.conversionProbability * 100)}%
                    </span>
                </div>
            </div>
        </Link>
    );
}

// ── Kanban column ──────────────────────────────────────────────────────────

function KanbanColumn({
    stage,
    deals,
    loading,
    onStageChange,
    onAddDeal,
}: {
    stage: string;
    deals: Deal[];
    loading: boolean;
    onStageChange: (dealId: string, newStage: string) => void;
    onAddDeal: (stage: string) => void;
}) {
    const cfg = getStageConfig(stage);

    const columnTotal = useMemo(
        () => deals.reduce((sum, d) => sum + d.amount, 0),
        [deals]
    );

    return (
        <div className={`flex-1 min-w-[200px] max-w-[260px] flex flex-col bg-white rounded-xl border border-gray-100 shadow-sm border-t-[3px] ${cfg.borderColor}`}>
            {/* Column header */}
            <div className="px-4 pt-4 pb-3 border-b border-gray-50">
                <div className="flex items-center gap-1.5 mb-1">
                    <h3 className={`text-[13px] font-semibold ${cfg.color}`}>{cfg.label}</h3>
                </div>
                <p className="text-[12px] text-gray-400">
                    <span className={`text-[15px] font-bold ${cfg.color}`}>{formatAmount(columnTotal)}</span>
                    {" "}({deals.length} Deal{deals.length !== 1 ? "s" : ""})
                </p>
            </div>

            {/* Cards */}
            <div className="flex-1 flex flex-col gap-2.5 p-3 overflow-y-auto max-h-[520px]">
                {loading ? (
                    <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
                ) : deals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-300">
                        <p className="text-[12px]">No deals</p>
                    </div>
                ) : (
                    deals.map((deal) => (
                        <DealCard key={deal.dealId} deal={deal} onStageChange={onStageChange} />
                    ))
                )}
            </div>

            {/* Add deal footer */}
            <div className="px-3 pb-3 pt-1">
                <button
                    onClick={() => onAddDeal(stage)}
                    className="w-full flex items-center justify-center gap-1.5 h-9 rounded-lg border border-dashed border-gray-200 text-[12px] font-medium text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                >
                    <Plus size={13} />
                    Add Deal
                </button>
            </div>
        </div>
    );
}

// ── Main component ─────────────────────────────────────────────────────────

export function DealsUI({
    deals,
    dealsByStage,
    loading,
    filters,
    totalPipeline,
    avgDealSize,
    winRate,
    conversionRate,
    isCreateOpen,
    creating,
    createError,
    defaultStage,
    onFiltersChange,
    onStageChange,
    onOpenCreate,
    onCloseCreate,
    onCreateDeal,
}: DealsUIProps) {
    const handleStageChange = onStageChange ?? (() => {});

    const allStages = useMemo(() => {
        // Use all stages from dealsByStage, preserve order of default stages first
        const defaultSet = new Set<string>(DEFAULT_DEAL_STAGES);
        const extraStages = Array.from(dealsByStage.keys()).filter(stage => !defaultSet.has(stage));
        return [...DEFAULT_DEAL_STAGES, ...extraStages];
    }, [dealsByStage]);

    const stageFilterOptions = useMemo(() => {
        return ["All Stages", ...allStages];
    }, [allStages]);

    return (
        <div className="flex flex-col min-h-full gap-5">

            {/* ── Page header ── */}
            <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight">Deals / Pipeline</h1>
                    <p className="text-sm text-gray-400 mt-0.5">Track and manage your sales pipeline.</p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Total pipeline */}
                    <div className="flex items-center gap-2 h-10 px-4 rounded-xl border border-gray-200 bg-white shadow-sm">
                        <div>
                            <p className="text-[10px] font-medium text-gray-400 leading-none">Total Pipeline</p>
                            <p className="text-[15px] font-bold text-blue-600 leading-tight">{formatCurrency(totalPipeline)}</p>
                        </div>
                        <ChevronDown size={13} className="text-gray-400" />
                    </div>

                    {/* New Deal — primary action */}
                    <button
                        onClick={() => onOpenCreate()}
                        className="flex items-center gap-1.5 h-10 px-4 rounded-xl bg-blue-600 text-white text-[13px] font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
                    >
                        <Plus size={15} />
                        New Deal
                    </button>
                </div>
            </div>

            {/* ── Filter bar ── */}
            <div className="flex items-center gap-3 flex-wrap">
                {/* Search */}
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search deals..."
                        value={filters.search}
                        onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
                        className="h-9 pl-8 pr-4 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
                    />
                </div>

                {/* Stage filter */}
                <Select
                    value={filters.stage}
                    options={stageFilterOptions}
                    onChange={(v) => onFiltersChange({ ...filters, stage: v })}
                />
            </div>

            {/* ── Kanban board ── */}
            <div className="flex gap-4 overflow-x-auto pb-2 flex-1">
                {allStages.map((stage) => (
                    <KanbanColumn
                        key={stage}
                        stage={stage}
                        deals={dealsByStage.get(stage) ?? []}
                        loading={loading}
                        onStageChange={handleStageChange}
                        onAddDeal={onOpenCreate}
                    />
                ))}
            </div>

            {/* ── Create Deal Modal ── */}
            {isCreateOpen && (
                <CreateDealModal
                    defaultStage={defaultStage}
                    creating={creating}
                    createError={createError}
                    onClose={onCloseCreate}
                    onSave={onCreateDeal}
                />
            )}
        </div>
    );
}
