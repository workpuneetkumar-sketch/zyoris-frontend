// components/deals/DealsUI.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import {
    Search,
    Plus,
    X,
    AlertCircle,
    MoreHorizontal,
    LayoutGrid,
    Table2,
    TrendingUp,
    CheckCircle2,
    XCircle,
    Flame,
    Sun,
    Circle,
    Skull,
    ShieldCheck,
    ShieldAlert,
    Sliders,
    Pencil,
    Loader2,
    BarChart3,
} from "lucide-react";
import { ForecastDashboard } from "./ForecastDashboard";
import { Deal, DealsFilters, DEFAULT_DEAL_STAGES } from "@/types/deals";
import { getStageConfig } from "@/lib/dealConfig";
import { CreateDealPayload } from "@/lib/api/dealsApi";
import {
    Pipeline,
    PipelineStage,
    CreatePipelinePayload,
    UpdatePipelinePayload,
    CreateStagePayload,
    UpdateStagePayload,
} from "@/types/pipelines";
import { PipelineSelector } from "./PipelineSelector";
import { PipelineStageManager, StageHeaderActions } from "./PipelineStageManager";
import { StageTransitionModal } from "./StageTransitionModal";
import { OrgRisksModal } from "./OrgRisksModal";
import { RiskDetectorConfigModal } from "./RiskDetectorConfigModal";

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
    // FE-2 Pipeline & Stage integration props
    pipelines?: Pipeline[];
    selectedPipeline?: Pipeline | null;
    pipelinesLoading?: boolean;
    pipelinesError?: string | null;
    stages?: PipelineStage[];
    onSelectPipeline?: (pipeline: Pipeline) => void;
    onCreatePipeline?: (payload: CreatePipelinePayload) => Promise<boolean>;
    onUpdatePipeline?: (id: string, payload: UpdatePipelinePayload) => Promise<boolean>;
    onDeletePipeline?: (id: string) => Promise<boolean>;
    onCreateStage?: (payload: CreateStagePayload) => Promise<boolean>;
    onUpdateStage?: (stageId: string, payload: UpdateStagePayload) => Promise<boolean>;
    onDeleteStage?: (stageId: string) => Promise<boolean>;
    onReorderStages?: (stageOrders: Array<{ stageId: string; order: number }>) => Promise<boolean>;
    onRetryPipelines?: () => void;
    onRefreshWorkspace?: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
    if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(1)}Cr`;
    if (amount >= 1_000_000)  return `₹${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000)      return `₹${(amount / 1_000).toFixed(0)}K`;
    return `₹${amount.toLocaleString("en-IN")}`;
}

function formatAmountFull(amount: number): string {
    return `₹${amount.toLocaleString("en-IN")}`;
}

// Stage icon – matches the reference screenshot icons per stage
function StageIcon({ stage, size = 16 }: { stage: string; size?: number }) {
    const s = stage.toUpperCase();
    if (s === "NEW")  return <Circle size={size} className="text-blue-500 fill-blue-100" />;
    if (s === "HOT")  return <Flame size={size} className="text-red-500" />;
    if (s === "WARM") return <Sun size={size} className="text-orange-400" />;
    if (s === "WON")  return <CheckCircle2 size={size} className="text-emerald-500" />;
    if (s === "LOST") return <XCircle size={size} className="text-red-400" />;
    if (s === "DEAD") return <Skull size={size} className="text-slate-500" />;
    return <Circle size={size} className="text-gray-400" />;
}

// Two-letter avatar from a name string
function NameAvatar({ name, stage }: { name: string; stage: string }) {
    const cfg = getStageConfig(stage);
    const initials = name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("");
    return (
        <span
            className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold shrink-0 ${cfg.badgeBg} ${cfg.badgeText}`}
        >
            {initials}
        </span>
    );
}

// ── Create Deal Modal ──────────────────────────────────────────────────────

interface CreateDealModalProps {
    defaultStage: string;
    stages?: PipelineStage[];
    pipelineId?: string;
    pipelineName?: string;
    creating: boolean;
    createError: string | null;
    onClose: () => void;
    onSave: (data: CreateDealPayload) => Promise<boolean>;
}

function CreateDealModal({
    defaultStage,
    stages,
    pipelineId,
    pipelineName,
    creating,
    createError,
    onClose,
    onSave,
}: CreateDealModalProps) {
    const stageOptions = useMemo(() => {
        if (stages && stages.length > 0) {
            return stages.map((s) => ({
                id: s.id || s.name,
                value: s.name,
                label: s.name,
                probability: s.probability,
            }));
        }
        return [...DEFAULT_DEAL_STAGES].map((s) => ({
            id: s,
            value: s,
            label: getStageConfig(s).label,
            probability: undefined,
        }));
    }, [stages]);

    const initialStage = useMemo(() => {
        if (defaultStage) {
            const found = stageOptions.find(
                (opt) => opt.value.toUpperCase() === defaultStage.toUpperCase() || opt.id === defaultStage
            );
            if (found) return found.value;
        }
        return stageOptions[0]?.value || defaultStage || "NEW";
    }, [defaultStage, stageOptions]);

    const [form, setForm] = useState({ name: "", amount: "", stage: initialStage });
    const [errors, setErrors] = useState<{ name?: string; amount?: string }>({});

    useEffect(() => {
        setForm((prev) => {
            if (!prev.stage || !stageOptions.some((opt) => opt.value === prev.stage)) {
                return { ...prev, stage: initialStage };
            }
            return prev;
        });
    }, [initialStage, stageOptions]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        if (e.target.name === "name" || e.target.name === "amount") {
            setErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
        }
    };

    const handleSubmit = async () => {
        const newErrors: { name?: string; amount?: string } = {};
        if (!form.name.trim())                          newErrors.name   = "Deal name is required";
        if (!form.amount || isNaN(Number(form.amount))) newErrors.amount = "Valid amount is required";
        if (Number(form.amount) < 0)                    newErrors.amount = "Amount must be positive";
        if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
        await onSave({
            name: form.name.trim(),
            amount: Number(form.amount),
            stage: form.stage,
            pipelineId: pipelineId || undefined,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                    <div>
                        <h2 className="text-[15px] font-bold text-gray-900">New Deal</h2>
                        <p className="text-[12px] text-gray-400 mt-0.5">
                            {pipelineName ? `Add a deal to ${pipelineName}` : "Add a deal to your pipeline"}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                        aria-label="Close"
                    >
                        <X size={14} className="text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    {createError && (
                        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-[12px] text-red-600">
                            <AlertCircle size={13} className="shrink-0" />
                            {createError}
                        </div>
                    )}

                    {/* Deal Name */}
                    <div>
                        <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">
                            Deal Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            placeholder="e.g. Acme Corp Enterprise"
                            className={`w-full h-10 rounded-lg border px-3 text-[13px] text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                                errors.name ? "border-red-400" : "border-gray-200 focus:border-blue-500"
                            }`}
                        />
                        {errors.name && <p className="text-[11px] text-red-500 mt-1">{errors.name}</p>}
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">
                            Amount (INR) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]">₹</span>
                            <input
                                name="amount"
                                type="number"
                                min="0"
                                step="1"
                                value={form.amount}
                                onChange={handleChange}
                                placeholder="0"
                                className={`w-full h-10 rounded-lg border pl-7 pr-3 text-[13px] text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                                    errors.amount ? "border-red-400" : "border-gray-200 focus:border-blue-500"
                                }`}
                            />
                        </div>
                        {errors.amount && <p className="text-[11px] text-red-500 mt-1">{errors.amount}</p>}
                    </div>

                    {/* Stage */}
                    <div>
                        <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">
                            Stage <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="stage"
                            value={form.stage}
                            onChange={handleChange}
                            className="w-full h-10 rounded-lg border border-gray-200 px-3 text-[13px] text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all"
                        >
                            {stageOptions.map((s) => (
                                <option key={s.id} value={s.value}>
                                    {s.label} {s.probability !== undefined ? `(${s.probability}%)` : ""}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2.5 px-6 py-4 bg-gray-50 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        disabled={creating}
                        className="h-9 px-4 rounded-lg border border-gray-200 text-[13px] font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={creating}
                        className="h-9 px-5 rounded-lg bg-blue-600 text-white text-[13px] font-semibold hover:bg-blue-700 disabled:opacity-70 transition-colors shadow-sm shadow-blue-200"
                    >
                        {creating ? "Creating..." : "Create Deal"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Skeleton card ──────────────────────────────────────────────────────────

function SkeletonCard() {
    return (
        <div className="bg-white rounded-xl border border-gray-100 p-3.5 animate-pulse">
            <div className="flex items-center gap-2 mb-2.5">
                <div className="w-7 h-7 rounded-full bg-gray-100" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
            <div className="h-4 bg-gray-100 rounded w-1/3 mb-3" />
            <div className="h-1.5 bg-gray-100 rounded-full w-full mb-1" />
            <div className="flex justify-between">
                <div className="h-3 bg-gray-100 rounded w-12" />
                <div className="h-3 bg-gray-100 rounded w-8" />
            </div>
        </div>
    );
}

// ── Deal card ──────────────────────────────────────────────────────────────

function DealCard({
    deal,
    allStages,
    onStageChange,
    onRequestTransition,
}: {
    deal: Deal;
    allStages?: string[];
    onStageChange: (dealId: string, newStage: string) => void;
    onRequestTransition?: (deal: Deal, targetStage: string) => void;
}) {
    const cfg = getStageConfig(deal.stage);
    const isWon  = deal.stage.toUpperCase() === "WON";
    const isLost = deal.stage.toUpperCase() === "LOST";
    const prob = Math.round(deal.conversionProbability * 100);

    // Progress bar colour per stage
    let barColor = "bg-blue-500";
    if (isWon)  barColor = "bg-emerald-500";
    if (isLost) barColor = "bg-red-400";
    if (deal.stage.toUpperCase() === "HOT")  barColor = "bg-red-500";
    if (deal.stage.toUpperCase() === "WARM") barColor = "bg-orange-400";
    if (deal.stage.toUpperCase() === "DEAD") barColor = "bg-slate-400";

    const handleStageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        e.stopPropagation();
        const newStage = e.target.value;
        if (newStage !== deal.stage) {
            if (onRequestTransition) {
                onRequestTransition(deal, newStage);
            } else {
                onStageChange(deal.dealId, newStage);
            }
        }
    };

    const stagesList = allStages && allStages.length > 0 ? allStages : DEFAULT_DEAL_STAGES;

    const formattedDate = deal.closeDate
        ? new Date(deal.closeDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
        : null;

    return (
        <Link href={`/deals/${deal.dealId}`} className="block group">
            <div className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all">
                {/* Top row: name + actions */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-[13px] font-semibold text-gray-800 leading-snug group-hover:text-blue-600 transition-colors line-clamp-2">
                        {deal.name}
                    </p>
                    {/* stop propagation so click on ⋮ doesn't navigate */}
                    <div
                        onClick={(e) => e.preventDefault()}
                        className="shrink-0"
                    >
                        <button className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100">
                            <MoreHorizontal size={14} />
                        </button>
                    </div>
                </div>

                {/* Company & Close Date Metadata */}
                {(deal.companyName || deal.contactName || formattedDate) && (
                    <div className="flex items-center justify-between text-[11px] text-gray-500 mb-2 truncate">
                        <span className="truncate font-medium text-gray-600">
                            {deal.companyName || deal.contactName || "—"}
                        </span>
                        {formattedDate && (
                            <span className="text-[10px] text-gray-400 shrink-0 ml-1 font-medium">
                                Closes {formattedDate}
                            </span>
                        )}
                    </div>
                )}

                {/* Amount */}
                <p className={`text-[15px] font-bold mb-2 ${cfg.color}`}>
                    {formatAmountFull(deal.amount)}
                </p>

                {/* Enriched BE-2 Health & Risk Badges */}
                {(deal.healthScore !== undefined || deal.healthStatus || deal.riskLevel || deal.forecastCategory) && (
                    <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
                        {deal.healthScore !== undefined && (
                            <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                    deal.healthScore >= 70
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        : deal.healthScore >= 40
                                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                                        : "bg-red-50 text-red-700 border border-red-200"
                                }`}
                            >
                                Health: {deal.healthScore}
                            </span>
                        )}
                        {deal.riskLevel && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                                {deal.riskLevel}
                            </span>
                        )}
                        {deal.forecastCategory && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                {deal.forecastCategory}
                            </span>
                        )}
                    </div>
                )}

                {/* Owner avatar + stage badge */}
                <div className="flex items-center gap-2 mb-2.5" onClick={(e) => e.preventDefault()}>
                    {deal.owner ? (
                        <NameAvatar name={deal.owner} stage={deal.stage} />
                    ) : null}
                    {/* Stage selector */}
                    <select
                        value={deal.stage}
                        onChange={handleStageChange}
                        onClick={(e) => e.preventDefault()}
                        className={`appearance-none h-6 pl-2 pr-6 rounded-md text-[11px] font-semibold cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-400 border-0 ${cfg.badgeBg} ${cfg.badgeText}`}
                    >
                        {stagesList.map((stageName) => (
                            <option key={stageName} value={stageName}>
                                {getStageConfig(stageName).label || stageName}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Probability bar */}
                <div className="space-y-1">
                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${barColor}`}
                            style={{ width: `${prob}%` }}
                        />
                    </div>
                    <div className="flex items-center justify-end">
                        <span className="text-[10px] text-gray-400 font-medium">{prob}%</span>
                    </div>
                </div>
            </div>
        </Link>
    );
}

// ── Kanban column ──────────────────────────────────────────────────────────

function KanbanColumn({
    stage,
    stageObj,
    stageIndex,
    totalStages,
    deals,
    loading,
    allStages,
    onStageChange,
    onAddDeal,
    onInspectStage,
    onEditStage,
    onDeleteStage,
    onMoveStage,
    onRequestTransition,
}: {
    stage: string;
    stageObj?: PipelineStage;
    stageIndex: number;
    totalStages: number;
    deals: Deal[];
    loading: boolean;
    allStages: string[];
    onStageChange: (dealId: string, newStage: string) => void;
    onAddDeal: (stage: string) => void;
    onInspectStage?: (stage: PipelineStage) => void;
    onEditStage?: (stage: PipelineStage) => void;
    onDeleteStage?: (stageId: string) => void;
    onMoveStage?: (index: number, direction: "left" | "right") => void;
    onRequestTransition?: (deal: Deal, targetStage: string) => void;
}) {
    const cfg = getStageConfig(stage);

    const columnTotal = useMemo(
        () => deals.reduce((sum, d) => sum + d.amount, 0),
        [deals]
    );

    return (
        <div
            className={`flex-shrink-0 w-[240px] flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden border-t-[3px] ${cfg.borderColor}`}
        >
            {/* Column header */}
            <div className={`px-4 py-3 ${cfg.headerBg} border-b border-gray-100`}>
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <StageIcon stage={stage} size={14} />
                        <h3 className={`text-[13px] font-bold truncate ${cfg.color}`}>{stageObj?.name || cfg.label || stage}</h3>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${cfg.badgeBg} ${cfg.badgeText}`}>
                        {deals.length}
                    </span>
                </div>

                <div className="flex items-center justify-between mt-1">
                    <p className={`text-[13px] font-bold ${cfg.color}`}>
                        {formatAmountFull(columnTotal)}
                    </p>

                    {/* Stage Header Actions (Inspect, Edit, Delete, Reorder) */}
                    {stageObj && onInspectStage && onEditStage && onDeleteStage && onMoveStage && (
                        <StageHeaderActions
                            stage={stageObj}
                            index={stageIndex}
                            totalStages={totalStages}
                            onInspect={onInspectStage}
                            onEdit={onEditStage}
                            onDelete={onDeleteStage}
                            onMove={onMoveStage}
                        />
                    )}
                </div>

                {/* Required Fields Badge if specified by BE-2 */}
                {stageObj?.requiredFields && stageObj.requiredFields.length > 0 && (
                    <div className="text-[10px] text-gray-500 mt-1 truncate">
                        <span className="font-semibold text-gray-700">{stageObj.requiredFields.length}</span> required field(s)
                    </div>
                )}
            </div>

            {/* Cards */}
            <div className="flex-1 flex flex-col gap-2 p-2.5 overflow-y-auto max-h-[560px] scrollbar-thin">
                {loading ? (
                    <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
                ) : deals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-300">
                        <p className="text-[12px]">No deals</p>
                    </div>
                ) : (
                    deals.map((deal) => (
                        <DealCard
                            key={deal.dealId}
                            deal={deal}
                            allStages={allStages}
                            onStageChange={onStageChange}
                            onRequestTransition={onRequestTransition}
                        />
                    ))
                )}
            </div>

            {/* Add deal footer */}
            <div className="px-2.5 pb-2.5 pt-1">
                <button
                    onClick={() => onAddDeal(stage)}
                    className="w-full flex items-center justify-center gap-1.5 h-8 rounded-lg border border-dashed border-gray-200 text-[12px] font-medium text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/60 transition-colors"
                >
                    <Plus size={12} />
                    Add Deal
                </button>
            </div>
        </div>
    );
}

// ── Stage stat cards (row above the board) ─────────────────────────────────

function StageStatCards({
    dealsByStage,
    allStages,
}: {
    dealsByStage: Map<string, Deal[]>;
    allStages: readonly string[] | string[];
}) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {allStages.map((stage) => {
                const cfg = getStageConfig(stage);
                const stageDeals = dealsByStage.get(stage) ?? [];
                const total = stageDeals.reduce((s, d) => s + d.amount, 0);
                return (
                    <div
                        key={stage}
                        className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5 flex items-start gap-3 hover:shadow-md transition-shadow"
                    >
                        {/* Icon box */}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.bgColor}`}>
                            <StageIcon stage={stage} size={17} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`text-[12px] font-bold ${cfg.color}`}>{cfg.label}</p>
                            <p className="text-[16px] font-bold text-gray-900 leading-tight truncate">
                                {formatAmountFull(total)}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                                {stageDeals.length} Deal{stageDeals.length !== 1 ? "s" : ""}
                            </p>
                        </div>
                    </div>
                );
            })}
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
    // FE-2 Pipeline & Stage integration props
    pipelines = [],
    selectedPipeline = null,
    pipelinesLoading = false,
    pipelinesError = null,
    stages = [],
    onSelectPipeline,
    onCreatePipeline,
    onUpdatePipeline,
    onDeletePipeline,
    onCreateStage,
    onUpdateStage,
    onDeleteStage,
    onReorderStages,
    onRetryPipelines,
    onRefreshWorkspace,
}: DealsUIProps) {
    const handleStageChange = onStageChange ?? (() => {});
    const [activeView, setActiveView] = useState<"pipeline" | "table" | "forecast">("pipeline");

    useEffect(() => {
        if (typeof window !== "undefined") {
            const urlParams = new URLSearchParams(window.location.search);
            const viewParam = urlParams.get("view") || urlParams.get("tab");
            if (viewParam === "forecast") setActiveView("forecast");
            else if (viewParam === "table") setActiveView("table");
        }
    }, []);

    const [transitioningDeal, setTransitioningDeal] = useState<{
        deal: Deal;
        targetStage: string;
        targetStageConfig?: PipelineStage | null;
    } | null>(null);

    const [isOrgRisksOpen, setIsOrgRisksOpen] = useState(false);
    const [isDetectorConfigOpen, setIsDetectorConfigOpen] = useState(false);

    const [inspectStageModal, setInspectStageModal] = useState<PipelineStage | null>(null);
    const [editStageModal, setEditStageModal] = useState<PipelineStage | null>(null);
    const [editStageName, setEditStageName] = useState("");
    const [editStageDesc, setEditStageDesc] = useState("");
    const [editStageReqFields, setEditStageReqFields] = useState("");
    const [editStageSaving, setEditStageSaving] = useState(false);
    const [editStageError, setEditStageError] = useState<string | null>(null);

    const handleOpenEditStage = (stg: PipelineStage) => {
        setEditStageModal(stg);
        setEditStageName(stg.name || "");
        setEditStageDesc(stg.description || "");
        setEditStageReqFields((stg.requiredFields || []).join(", "));
        setEditStageError(null);
    };

    const handleSaveEditStage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editStageModal || !onUpdateStage || !editStageName.trim()) return;
        setEditStageSaving(true);
        setEditStageError(null);
        try {
            const reqFields = editStageReqFields
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
            const ok = await onUpdateStage(editStageModal.id, {
                name: editStageName.trim(),
                description: editStageDesc.trim() || undefined,
                requiredFields: reqFields.length ? reqFields : undefined,
            });
            if (ok) {
                setEditStageModal(null);
                if (onRefreshWorkspace) onRefreshWorkspace();
            }
        } catch (err: any) {
            setEditStageError(err.response?.data?.message || err.message || "Failed to update stage");
        } finally {
            setEditStageSaving(false);
        }
    };

    const allStages = useMemo(() => {
        if (stages && stages.length > 0) {
            return stages.map((s) => s.name);
        }
        const defaultSet = new Set<string>(DEFAULT_DEAL_STAGES);
        const extra = Array.from(dealsByStage.keys()).filter((s) => !defaultSet.has(s));
        return [...DEFAULT_DEAL_STAGES, ...extra] as string[];
    }, [stages, dealsByStage]);

    const stageFilterOptions = useMemo(() => ["All Stages", ...allStages], [allStages]);

    return (
        <div className="flex flex-col min-h-full gap-5">

            {/* ── Page header ── */}
            <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight">Deals / Pipeline</h1>
                    <p className="text-[13px] text-gray-400">Track, manage and grow your sales pipeline.</p>
                    
                    {/* Pipeline Selector & Stage Manager Controls */}
                    {onSelectPipeline && onCreatePipeline && onUpdatePipeline && onDeletePipeline && (
                        <div className="pt-2 flex items-center gap-2.5 flex-wrap">
                            <PipelineSelector
                                pipelines={pipelines}
                                selectedPipeline={selectedPipeline}
                                loading={pipelinesLoading}
                                error={pipelinesError}
                                onSelectPipeline={onSelectPipeline}
                                onCreatePipeline={onCreatePipeline}
                                onUpdatePipeline={onUpdatePipeline}
                                onDeletePipeline={onDeletePipeline}
                                onRetry={onRetryPipelines ?? (() => {})}
                            />

                            {onCreateStage && onUpdateStage && onDeleteStage && onReorderStages && (
                                <PipelineStageManager
                                    pipelineId={selectedPipeline?.id}
                                    stages={stages}
                                    loading={loading}
                                    onCreateStage={onCreateStage}
                                    onUpdateStage={onUpdateStage}
                                    onDeleteStage={onDeleteStage}
                                    onReorderStages={onReorderStages}
                                    onRefresh={onRefreshWorkspace ?? (() => {})}
                                />
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Total pipeline value pill */}
                    <div className="flex flex-col items-end mr-1">
                        <p className="text-[10px] font-medium text-gray-400 leading-none">Total Pipeline Value</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <p className="text-[20px] font-bold text-blue-600 leading-tight">{formatCurrency(totalPipeline)}</p>
                            <span className="flex items-center gap-0.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                                <TrendingUp size={10} />
                                Live
                            </span>
                        </div>
                    </div>

                    {/* Stage filter */}
                    <div className="relative">
                        <select
                            value={filters.stage}
                            onChange={(e) => onFiltersChange({ ...filters, stage: e.target.value })}
                            className="appearance-none h-9 pl-3 pr-8 rounded-xl border border-gray-200 bg-white text-[13px] text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm"
                        >
                            {stageFilterOptions.map((o) => (
                                <option key={o} value={o}>{o}</option>
                            ))}
                        </select>
                        <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>

                    {/* Risk Radar — Org-wide risks (GET /deals/risks/all) */}
                    <button
                        onClick={() => setIsOrgRisksOpen(true)}
                        className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-[13px] font-semibold shadow-sm transition-all hover:bg-gray-50"
                        title="Organization-wide Risk Radar (GET /deals/risks/all)"
                    >
                        <ShieldAlert size={14} className="text-red-500" />
                        <span>Risk Radar</span>
                    </button>

                    {/* Detector Configurations (GET /deals/risk-detectors/config) */}
                    <button
                        onClick={() => setIsDetectorConfigOpen(true)}
                        className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-[13px] font-semibold shadow-sm transition-all hover:bg-gray-50"
                        title="Risk Detector Configurations (GET /deals/risk-detectors/config)"
                    >
                        <Sliders size={14} className="text-gray-500" />
                        <span>Detectors</span>
                    </button>

                    {/* New Deal — primary action */}
                    <button
                        onClick={() => onOpenCreate(stages?.[0]?.name || allStages[0] || "NEW")}
                        className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-blue-600 text-white text-[13px] font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
                    >
                        <Plus size={14} />
                        New Deal
                    </button>
                </div>
            </div>

            {/* ── Stage stat cards (hidden in forecast dashboard view) ── */}
            {activeView !== "forecast" && (
                <StageStatCards dealsByStage={dealsByStage} allStages={allStages} />
            )}

            {/* ── View tabs + search bar ── */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                {/* Tab switcher */}
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveView("pipeline")}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${
                            activeView === "pipeline"
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        <LayoutGrid size={14} />
                        Pipeline View
                    </button>
                    <button
                        onClick={() => setActiveView("table")}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${
                            activeView === "table"
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        <Table2 size={14} />
                        Table View
                    </button>
                    <button
                        onClick={() => setActiveView("forecast")}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${
                            activeView === "forecast"
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        <BarChart3 size={14} />
                        Forecast Dashboard
                    </button>
                </div>

                {/* Search */}
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search deals..."
                            value={filters.search}
                            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
                            className="h-9 pl-9 pr-4 rounded-xl border border-gray-200 bg-white text-[13px] text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-52 shadow-sm transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* ── Pipeline / Kanban board ── */}
            {activeView === "pipeline" && (
                <div className="flex gap-3 overflow-x-auto pb-4 flex-1">
                    {allStages.map((stageName, idx) => {
                        const stageObj = stages.find(
                            (s) =>
                                s.name.toUpperCase() === stageName.toUpperCase() ||
                                s.id === stageName
                        );
                        return (
                            <KanbanColumn
                                key={stageName}
                                stage={stageName}
                                stageObj={stageObj}
                                stageIndex={idx}
                                totalStages={allStages.length}
                                deals={
                                    dealsByStage.get(stageName.toUpperCase()) ??
                                    dealsByStage.get(stageName) ??
                                    []
                                }
                                loading={loading}
                                allStages={allStages}
                                onStageChange={handleStageChange}
                                onAddDeal={onOpenCreate}
                                onInspectStage={(stg) => setInspectStageModal(stg)}
                                onEditStage={onUpdateStage ? (stg) => handleOpenEditStage(stg) : undefined}
                                onDeleteStage={onDeleteStage}
                                onMoveStage={async (index, direction) => {
                                    if (!onReorderStages) return;
                                    const targetIdx = direction === "left" ? index - 1 : index + 1;
                                    if (targetIdx < 0 || targetIdx >= allStages.length) return;
                                    const reordered = [...allStages];
                                    const [moved] = reordered.splice(index, 1);
                                    reordered.splice(targetIdx, 0, moved);
                                    const stageOrders = reordered.map((name, i) => {
                                        const s = stages.find((st) => st.name === name);
                                        return { stageId: s?.id || name, order: i + 1 };
                                    });
                                    await onReorderStages(stageOrders);
                                }}
                                onRequestTransition={(deal, target) => {
                                    const targetObj =
                                        stages.find(
                                            (s) => s.name.toUpperCase() === target.toUpperCase()
                                        ) ?? null;
                                    setTransitioningDeal({
                                        deal,
                                        targetStage: target,
                                        targetStageConfig: targetObj,
                                    });
                                }}
                            />
                        );
                    })}
                </div>
            )}

            {/* ── Table view (inline, same real data) ── */}
            {activeView === "table" && (
                <DealsTable
                    deals={deals}
                    loading={loading}
                    allStages={allStages}
                    onStageChange={handleStageChange}
                    onOpenCreate={onOpenCreate}
                    onRequestTransition={(deal, target) => {
                        const targetObj =
                            stages.find(
                                (s) => s.name.toUpperCase() === target.toUpperCase()
                            ) ?? null;
                        setTransitioningDeal({
                            deal,
                            targetStage: target,
                            targetStageConfig: targetObj,
                        });
                    }}
                />
            )}

            {/* ── Forecast Dashboard view (FE-2 Day 4) ── */}
            {activeView === "forecast" && (
                <ForecastDashboard initialDeals={deals} />
            )}

            {/* ── Create Deal Modal ── */}
            {isCreateOpen && (
                <CreateDealModal
                    defaultStage={defaultStage}
                    stages={stages}
                    pipelineId={selectedPipeline?.id}
                    pipelineName={selectedPipeline?.name}
                    creating={creating}
                    createError={createError}
                    onClose={onCloseCreate}
                    onSave={onCreateDeal}
                />
            )}

            {/* ── Stage Transition Modal (Backend validated) ── */}
            {transitioningDeal && (
                <StageTransitionModal
                    deal={transitioningDeal.deal}
                    targetStageName={transitioningDeal.targetStage}
                    targetStageConfig={transitioningDeal.targetStageConfig}
                    isOpen={true}
                    onClose={() => setTransitioningDeal(null)}
                    onSuccess={(updated) => {
                        handleStageChange(updated.dealId, updated.stage);
                        if (onRefreshWorkspace) onRefreshWorkspace();
                        setTransitioningDeal(null);
                    }}
                />
            )}

            {/* ── Column Header: Inspect Stage Criteria Modal ── */}
            {inspectStageModal && (
                <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
                        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                    <ShieldCheck size={16} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900">Stage Rules: {inspectStageModal.name}</h3>
                                    <p className="text-[11px] text-gray-400">Order #{inspectStageModal.order ?? 1} • {inspectStageModal.probability ?? 0}% Win Probability</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setInspectStageModal(null)}
                                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto flex-1">
                            <div>
                                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Required Fields</h4>
                                {inspectStageModal.requiredFields && inspectStageModal.requiredFields.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                        {inspectStageModal.requiredFields.map((f) => (
                                            <span key={f} className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-800 text-xs font-mono font-medium">
                                                {f}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-400">No required fields configured.</p>
                                )}
                            </div>
                            <div>
                                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Entry Criteria</h4>
                                {inspectStageModal.entryCriteria && inspectStageModal.entryCriteria.length > 0 ? (
                                    <pre className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-mono text-gray-700 overflow-x-auto">
                                        {JSON.stringify(inspectStageModal.entryCriteria, null, 2)}
                                    </pre>
                                ) : (
                                    <p className="text-xs text-gray-400">No entry criteria configured.</p>
                                )}
                            </div>
                            <div>
                                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Validation Rules</h4>
                                {inspectStageModal.validationRules && inspectStageModal.validationRules.length > 0 ? (
                                    <pre className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-mono text-gray-700 overflow-x-auto">
                                        {JSON.stringify(inspectStageModal.validationRules, null, 2)}
                                    </pre>
                                ) : (
                                    <p className="text-xs text-gray-400">No validation rules configured.</p>
                                )}
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                            <button
                                onClick={() => setInspectStageModal(null)}
                                className="px-4 py-2 rounded-xl bg-gray-900 text-xs font-semibold text-white hover:bg-gray-800 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Column Header: Edit Stage Modal ── */}
            {editStageModal && (
                <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-150">
                        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <Pencil size={16} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900">Edit Stage: {editStageModal.name}</h3>
                                    <p className="text-[11px] text-gray-400">Update configuration & required fields</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setEditStageModal(null)}
                                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>
                        <form onSubmit={handleSaveEditStage} className="p-6 space-y-4">
                            {editStageError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
                                    {editStageError}
                                </div>
                            )}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                                    Stage Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editStageName}
                                    onChange={(e) => setEditStageName(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                                    Description
                                </label>
                                <input
                                    type="text"
                                    value={editStageDesc}
                                    onChange={(e) => setEditStageDesc(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                                    Required Fields (comma-separated)
                                </label>
                                <input
                                    type="text"
                                    value={editStageReqFields}
                                    onChange={(e) => setEditStageReqFields(e.target.value)}
                                    placeholder="amount, contactId, closeDate"
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-[11px]"
                                />
                            </div>
                            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setEditStageModal(null)}
                                    disabled={editStageSaving}
                                    className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={editStageSaving || !editStageName.trim()}
                                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm shadow-blue-200"
                                >
                                    {editStageSaving && <Loader2 size={14} className="animate-spin" />}
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Organization Risks Modal (GET /deals/risks/all, GET /deals/risks/:riskId, PATCH /deals/risks/:riskId/resolve) ── */}
            <OrgRisksModal
                isOpen={isOrgRisksOpen}
                onClose={() => setIsOrgRisksOpen(false)}
                onRiskResolved={() => {
                    if (onRefreshWorkspace) onRefreshWorkspace();
                }}
            />

            {/* ── Risk Detector Configuration Modal (GET /deals/risk-detectors/config, PUT /deals/risk-detectors/config/:detector) ── */}
            <RiskDetectorConfigModal
                isOpen={isDetectorConfigOpen}
                onClose={() => setIsDetectorConfigOpen(false)}
            />
        </div>
    );
}

// ── Table view sub-component ───────────────────────────────────────────────

function DealsTable({
    deals,
    loading,
    allStages,
    onStageChange,
    onOpenCreate,
    onRequestTransition,
}: {
    deals: Deal[];
    loading: boolean;
    allStages?: string[];
    onStageChange: (dealId: string, newStage: string) => void;
    onOpenCreate: (stage?: string) => void;
    onRequestTransition?: (deal: Deal, targetStage: string) => void;
}) {
    // Local sort state
    const [sortCol, setSortCol]     = useState<string | null>(null);
    const [sortDir, setSortDir]     = useState<"asc" | "desc">("asc");
    // Local pagination state
    const [page, setPage]           = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const handleSort = (col: string) => {
        if (sortCol === col) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortCol(col);
            setSortDir("asc");
        }
        setPage(1);
    };

    const sortedDeals = useMemo(() => {
        if (!sortCol) return deals;
        return [...deals].sort((a, b) => {
            let av: string | number = "";
            let bv: string | number = "";
            if (sortCol === "name")        { av = a.name.toLowerCase();         bv = b.name.toLowerCase(); }
            if (sortCol === "amount")      { av = a.amount;                     bv = b.amount; }
            if (sortCol === "probability") { av = a.conversionProbability;      bv = b.conversionProbability; }
            if (sortCol === "closeDate")   { av = a.closeDate ?? "";             bv = b.closeDate ?? ""; }
            if (sortCol === "owner")       { av = (a.owner ?? "").toLowerCase(); bv = (b.owner ?? "").toLowerCase(); }
            if (av < bv) return sortDir === "asc" ? -1 : 1;
            if (av > bv) return sortDir === "asc" ? 1 : -1;
            return 0;
        });
    }, [deals, sortCol, sortDir]);

    const totalPages = Math.max(1, Math.ceil(sortedDeals.length / rowsPerPage));
    const safePage   = Math.min(page, totalPages);
    const pageStart  = (safePage - 1) * rowsPerPage;
    const pageEnd    = Math.min(pageStart + rowsPerPage, sortedDeals.length);
    const pageDeals  = sortedDeals.slice(pageStart, pageEnd);

    // Build visible page numbers (show up to 5 pages + ellipsis)
    const pageNumbers = useMemo(() => {
        if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
        const pages: (number | "...")[] = [];
        pages.push(1);
        if (safePage > 3) pages.push("...");
        for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) {
            pages.push(i);
        }
        if (safePage < totalPages - 2) pages.push("...");
        pages.push(totalPages);
        return pages;
    }, [totalPages, safePage]);

    const SortIcon = ({ col }: { col: string }) => {
        if (sortCol !== col) return <span className="text-gray-300 ml-1">↕</span>;
        return <span className="text-blue-500 ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
    };

    const formatDate = (ds?: string | null) => {
        if (!ds) return "—";
        try {
            const d = new Date(ds);
            if (isNaN(d.getTime())) return "—";
            return d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "/");
        } catch { return "—"; }
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/60">
                            {/* Deal Name */}
                            <th
                                onClick={() => handleSort("name")}
                                className="text-left px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap cursor-pointer hover:text-gray-700 select-none"
                            >
                                Deal Name <SortIcon col="name" />
                            </th>
                            {/* Stage */}
                            <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                                Stage
                            </th>
                            {/* Amount */}
                            <th
                                onClick={() => handleSort("amount")}
                                className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap cursor-pointer hover:text-gray-700 select-none"
                            >
                                Amount <SortIcon col="amount" />
                            </th>
                            {/* Probability */}
                            <th
                                onClick={() => handleSort("probability")}
                                className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap cursor-pointer hover:text-gray-700 select-none"
                            >
                                Probability <SortIcon col="probability" />
                            </th>
                            {/* Expected Close */}
                            <th
                                onClick={() => handleSort("closeDate")}
                                className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap cursor-pointer hover:text-gray-700 select-none"
                            >
                                Expected Close <SortIcon col="closeDate" />
                            </th>
                            {/* Created By */}
                            <th
                                onClick={() => handleSort("owner")}
                                className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap cursor-pointer hover:text-gray-700 select-none"
                            >
                                Created By <SortIcon col="owner" />
                            </th>
                            {/* Actions */}
                            <th className="text-right px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            Array.from({ length: rowsPerPage }).map((_, i) => (
                                <tr key={i} className="border-b border-gray-50">
                                    {Array.from({ length: 7 }).map((_, j) => (
                                        <td key={j} className="px-4 py-4">
                                            <div className="h-3.5 bg-gray-100 rounded-md animate-pulse w-3/4" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : pageDeals.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="text-center py-16 text-gray-400 text-sm">
                                    No deals found.
                                </td>
                            </tr>
                        ) : (
                            pageDeals.map((deal) => {
                                const cfg = getStageConfig(deal.stage);
                                const prob = Math.round(deal.conversionProbability * 100);
                                const isWon  = deal.stage.toUpperCase() === "WON";
                                const isLost = deal.stage.toUpperCase() === "LOST";
                                let barColor = "bg-blue-500";
                                if (isWon)  barColor = "bg-emerald-500";
                                if (isLost) barColor = "bg-red-400";
                                if (deal.stage.toUpperCase() === "HOT")  barColor = "bg-red-500";
                                if (deal.stage.toUpperCase() === "WARM") barColor = "bg-orange-400";
                                if (deal.stage.toUpperCase() === "DEAD") barColor = "bg-slate-400";

                                return (
                                    <tr
                                        key={deal.dealId}
                                        className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors"
                                    >
                                        {/* Deal Name */}
                                        <td className="px-5 py-3.5">
                                            <Link
                                                href={`/deals/${deal.dealId}`}
                                                className="flex items-center gap-2.5 group"
                                            >
                                                <NameAvatar name={deal.name} stage={deal.stage} />
                                                <span className="text-[13px] font-semibold text-gray-800 group-hover:text-blue-600 transition-colors whitespace-nowrap">
                                                    {deal.name}
                                                </span>
                                            </Link>
                                        </td>

                                        {/* Stage badge */}
                                        <td className="px-4 py-3.5">
                                            <span
                                                className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide ${cfg.badgeBg} ${cfg.badgeText}`}
                                            >
                                                {cfg.label.toUpperCase()}
                                            </span>
                                        </td>

                                        {/* Amount */}
                                        <td className="px-4 py-3.5 text-[13px] font-semibold text-gray-800 whitespace-nowrap">
                                            {formatAmountFull(deal.amount)}
                                        </td>

                                        {/* Probability */}
                                        <td className="px-4 py-3.5 min-w-[140px]">
                                            <div className="flex flex-col gap-1">
                                                <span className={`text-[12px] font-bold ${cfg.color}`}>{prob}%</span>
                                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden w-24">
                                                    <div
                                                        className={`h-full rounded-full ${barColor}`}
                                                        style={{ width: `${prob}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>

                                        {/* Expected Close */}
                                        <td className="px-4 py-3.5 text-[12px] text-gray-600 whitespace-nowrap font-medium">
                                            {formatDate(deal.closeDate)}
                                        </td>

                                        {/* Created By / Owner */}
                                        <td className="px-4 py-3.5">
                                            {deal.owner ? (
                                                <div className="flex items-center gap-2">
                                                    <NameAvatar name={deal.owner} stage={deal.stage} />
                                                    <span className="text-[12px] text-gray-700 font-medium whitespace-nowrap">
                                                        {deal.owner}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-[12px] text-gray-400">—</span>
                                            )}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-5 py-3.5 text-right">
                                            <Link href={`/deals/${deal.dealId}`}>
                                                <button className="inline-flex items-center justify-center gap-1 h-7 px-2.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                                                    <MoreHorizontal size={15} />
                                                </button>
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* ── Pagination bar ── */}
            {!loading && sortedDeals.length > 0 && (
                <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-white flex-wrap gap-3">
                    {/* Count info */}
                    <p className="text-[12px] text-gray-500 font-medium whitespace-nowrap">
                        Showing {pageStart + 1} to {pageEnd} of {sortedDeals.length} deal{sortedDeals.length !== 1 ? "s" : ""}
                    </p>

                    {/* Page buttons */}
                    <div className="flex items-center gap-1">
                        {/* Prev */}
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={safePage === 1}
                            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-[13px]"
                        >
                            ‹
                        </button>

                        {pageNumbers.map((pn, idx) =>
                            pn === "..." ? (
                                <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-gray-400 text-[12px]">
                                    …
                                </span>
                            ) : (
                                <button
                                    key={pn}
                                    onClick={() => setPage(pn as number)}
                                    className={`w-8 h-8 rounded-lg text-[13px] font-semibold transition-colors ${
                                        safePage === pn
                                            ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                                            : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                                    }`}
                                >
                                    {pn}
                                </button>
                            )
                        )}

                        {/* Next */}
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={safePage === totalPages}
                            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-[13px]"
                        >
                            ›
                        </button>
                    </div>

                    {/* Rows per page */}
                    <div className="flex items-center gap-2">
                        <span className="text-[12px] text-gray-500 font-medium whitespace-nowrap">Rows per page</span>
                        <select
                            value={rowsPerPage}
                            onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
                            className="h-8 pl-3 pr-7 rounded-lg border border-gray-200 bg-white text-[12px] text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        >
                            {[10, 25, 50, 100].map((n) => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                    </div>
                </div>
            )}
        </div>
    );
}
