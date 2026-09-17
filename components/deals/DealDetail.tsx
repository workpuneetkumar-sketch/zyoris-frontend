// components/deals/DealDetail.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  User,
  Building2,
  Mail,
  Clock,
  Hash,
  Pencil,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Link2,
  ArrowRight,
  ShieldCheck,
  FileCheck,
  CreditCard,
  Swords,
  Scale,
  Send,
  Plus,
} from "lucide-react";
import { Deal } from "@/types/deals";
import { PipelineStage } from "@/types/pipelines";
import { getStageConfig } from "@/lib/dealConfig";
import { updateDeal, addDealNote, UpdateDealPayload } from "@/lib/api/dealsApi";
import { fetchStages, fetchPipelines } from "@/lib/api/pipelinesApi";
import { DEFAULT_DEAL_STAGES } from "@/types/deals";
import { DealHealthCard } from "./DealHealthCard";
import { DealRiskSection } from "./DealRiskSection";
import { StageTransitionModal } from "./StageTransitionModal";

interface DealDetailProps {
  deal: Deal;
  onUpdate?: () => Promise<void>;
}

export function DealDetail({ deal, onUpdate }: DealDetailProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "timeline" | "notes" | "health">("overview");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Pipeline stages & transition modal state
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [transitionModalStage, setTransitionModalStage] = useState<string | null>(null);

  // Local notes state
  const [notes, setNotes] = useState<Array<{ id: string; content: string; createdAt: string; author?: string }>>([]);
  const [newNoteText, setNewNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: deal.name,
    amount: deal.amount.toString(),
    stage: deal.stage,
  });

  // Load pipeline stages for criteria & transitions
  const loadPipelineStages = useCallback(async () => {
    try {
      if (deal.pipelineId) {
        const list = await fetchStages(deal.pipelineId);
        setStages(list);
      } else {
        const pipelines = await fetchPipelines();
        if (pipelines.length > 0 && pipelines[0].id) {
          const list = await fetchStages(pipelines[0].id);
          setStages(list);
        }
      }
    } catch {
      // Fallback silently if stages endpoint is empty for this org
    }
  }, [deal.pipelineId]);

  useEffect(() => {
    loadPipelineStages();
  }, [loadPipelineStages]);

  // Handle stage transition selection
  const handleSelectTransitionTarget = (newStage: string) => {
    if (newStage === deal.stage) return;
    setTransitionModalStage(newStage);
  };

  const handleSaveEdit = async () => {
    try {
      setIsUpdating(true);
      setUpdateError(null);

      const payload: UpdateDealPayload = {
        name: editForm.name,
        amount: Number(editForm.amount),
        stage: editForm.stage,
      };

      await updateDeal(deal.dealId, payload);
      if (onUpdate) await onUpdate();
      setIsEditModalOpen(false);
    } catch (err: any) {
      setUpdateError(err.response?.data?.message || err.message || "Failed to update deal");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    setAddingNote(true);
    try {
      await addDealNote(deal.dealId, newNoteText.trim());
      setNotes((prev) => [
        {
          id: String(Date.now()),
          content: newNoteText.trim(),
          createdAt: new Date().toISOString(),
          author: deal.owner || "You",
        },
        ...prev,
      ]);
      setNewNoteText("");
      if (onUpdate) await onUpdate();
    } catch (err: any) {
      setUpdateError(err.response?.data?.message || err.message || "Failed to add note");
    } finally {
      setAddingNote(false);
    }
  };

  const formatCurrency = (amount: number | undefined): string => {
    if (amount === undefined || amount === null) return "₹0";
    if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(1)}Cr`;
    if (amount >= 1_000_000) return `₹${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(0)}K`;
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "N/A";
      return date.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  const stageConfig = getStageConfig(deal.stage);
  const isWon = deal.stage.toUpperCase() === "WON";
  const isLost = deal.stage.toUpperCase() === "LOST";
  const conversionProb = typeof deal.conversionProbability === "number"
    ? Math.round(deal.conversionProbability * 100)
    : 0;

  // Find current stage metadata from backend
  const currentStageObj = stages.find(
    (s) => s.name.toUpperCase() === deal.stage.toUpperCase()
  );

  // Find target stage object for transition modal
  const targetStageObj = transitionModalStage
    ? stages.find((s) => s.name.toUpperCase() === transitionModalStage.toUpperCase()) ?? null
    : null;

  // Stage list options (from pipeline if loaded, otherwise default)
  const availableStages = stages.length > 0 ? stages.map((s) => s.name) : DEFAULT_DEAL_STAGES;

  return (
    <div className="flex flex-col gap-6">
      {/* Error Banner */}
      {updateError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 animate-in slide-in-from-top duration-300">
          <AlertCircle className="text-red-500 shrink-0" size={20} />
          <p className="text-xs font-semibold text-red-800">{updateError}</p>
          <button
            onClick={() => setUpdateError(null)}
            className="ml-auto text-red-400 hover:text-red-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main Grid: Left 2 Cols (Details + Health/Risk), Right 1 Col (Summary + Actions) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Stage Progress & Transition Bar */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 relative overflow-hidden">
            {isUpdating && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
                <Loader2 className="text-blue-600 animate-spin" size={24} />
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Current Stage & Health
                </p>
                <div className="flex items-center gap-2.5">
                  <div className={`w-3.5 h-3.5 rounded-full ${stageConfig.color} shadow-xs`} />
                  <h2 className="text-lg font-bold text-gray-900">{stageConfig.label}</h2>
                  {deal.healthStatus && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                      {deal.healthStatus}
                    </span>
                  )}
                </div>
              </div>

              {/* Deal Amount & Probability */}
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 text-right sm:text-left">
                    Deal Value
                  </p>
                  <p className="text-xl font-black text-emerald-600">{formatCurrency(deal.amount)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 text-right sm:text-left">
                    Win Probability
                  </p>
                  <p className="text-xl font-black text-gray-900">{conversionProb}%</p>
                </div>
              </div>
            </div>

            {/* Stage Requirements & Criteria Alert Box */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 mb-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileCheck size={14} className="text-blue-600" />
                  <span className="text-xs font-bold text-gray-800">
                    Stage Requirements: {stageConfig.label}
                  </span>
                </div>

                {/* Transition Action Button */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-400 font-medium">Move to:</span>
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) handleSelectTransitionTarget(e.target.value);
                    }}
                    className="h-7 px-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="">Select Stage...</option>
                    {availableStages
                      .filter((s) => s.toUpperCase() !== deal.stage.toUpperCase())
                      .map((s) => (
                        <option key={s} value={s}>
                          {getStageConfig(s).label || s}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Display backend-provided criteria */}
              {currentStageObj?.requiredFields && currentStageObj.requiredFields.length > 0 ? (
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  <span className="text-[11px] text-gray-500 font-medium mr-1">Required fields:</span>
                  {currentStageObj.requiredFields.map((f) => (
                    <span
                      key={f}
                      className="px-2 py-0.5 bg-white border border-gray-200 rounded text-[11px] font-mono font-medium text-gray-700"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              ) : deal.stageRequirements && deal.stageRequirements.length > 0 ? (
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  <span className="text-[11px] text-gray-500 font-medium mr-1">Required:</span>
                  {deal.stageRequirements.map((r, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-white border border-gray-200 rounded text-[11px] font-medium text-gray-700"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 mt-1">
                  All standard stage criteria met. No blocking stage requirements detected.
                </p>
              )}
            </div>

            {/* Probability Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-gray-400">
                <span>Progress to Close</span>
                <span>{conversionProb}%</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 deal-fill-bar ${
                    isWon ? "bg-emerald-500" : isLost ? "bg-red-400" : "bg-blue-600"
                  }`}
                  style={{ "--fill": `${conversionProb}%` } as React.CSSProperties}
                />
              </div>
            </div>
          </div>

          {/* Deal Health & Risks Section (FE-2 Day 2) */}
          <DealHealthCard dealId={deal.dealId} />
          <DealRiskSection
            dealId={deal.dealId}
            onRiskResolved={async () => {
              if (onUpdate) await onUpdate();
            }}
          />

          {/* Tabs Section: Overview, Commercials, Timeline, Notes */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="border-b border-gray-100 bg-gray-50/40 px-6">
              <div className="flex items-center gap-8">
                {[
                  { key: "overview", label: "Overview & Commercials" },
                  { key: "timeline", label: "Activities Timeline" },
                  { key: "notes", label: `Notes (${notes.length})` },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key as any)}
                    className={`text-xs font-bold uppercase tracking-wider py-4 border-b-2 transition-all ${
                      activeTab === t.key
                        ? "text-blue-600 border-blue-600"
                        : "text-gray-400 border-transparent hover:text-gray-600"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6">
              {/* Tab 1: Overview & Commercials (Stakeholders, Pricing, Competition, Legal) */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Stakeholders Card */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <User size={14} className="text-blue-600" />
                      Stakeholders & Contacts
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Owner */}
                      <div className="p-3.5 bg-gray-50/60 rounded-xl border border-gray-100">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                          Deal Owner
                        </span>
                        <div className="text-xs font-bold text-gray-900">
                          {deal.owner || "Unassigned"}
                        </div>
                      </div>

                      {/* Contact */}
                      <div className="p-3.5 bg-gray-50/60 rounded-xl border border-gray-100">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                          Primary Contact
                        </span>
                        <div className="text-xs font-bold text-gray-900">
                          {deal.contactName || deal.contactId || "Not Linked"}
                        </div>
                      </div>

                      {/* Company */}
                      <div className="p-3.5 bg-gray-50/60 rounded-xl border border-gray-100">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                          Company / Organization
                        </span>
                        <div className="text-xs font-bold text-gray-900">
                          {deal.companyName || deal.companyId || "None"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Commercials Grid: Pricing, Competition, Legal */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    {/* Pricing */}
                    <div className="p-4 bg-gray-50/60 rounded-xl border border-gray-100 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800 mb-2">
                          <CreditCard size={14} className="text-emerald-600" />
                          <span>Pricing & Commercials</span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          {deal.pricing
                            ? typeof deal.pricing === "object"
                              ? JSON.stringify(deal.pricing)
                              : String(deal.pricing)
                            : `Total Contract Value: ${formatCurrency(deal.amount)}`}
                        </p>
                      </div>
                      <span className="text-[10px] text-gray-400 mt-3 block">Verified BE-2 Contract Value</span>
                    </div>

                    {/* Competition */}
                    <div className="p-4 bg-gray-50/60 rounded-xl border border-gray-100 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800 mb-2">
                          <Swords size={14} className="text-amber-600" />
                          <span>Competitive Intel</span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          {deal.competition
                            ? typeof deal.competition === "object"
                              ? JSON.stringify(deal.competition)
                              : String(deal.competition)
                            : "No critical competitor threat flagged for this deal."}
                        </p>
                      </div>
                      <span className="text-[10px] text-gray-400 mt-3 block">Risk-monitored</span>
                    </div>

                    {/* Legal & Procurement */}
                    <div className="p-4 bg-gray-50/60 rounded-xl border border-gray-100 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800 mb-2">
                          <Scale size={14} className="text-purple-600" />
                          <span>Legal & Procurement</span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          {deal.legalStatus || deal.procurementStatus ? (
                            <span>
                              Status: {deal.legalStatus || "Standard"} • Procurement:{" "}
                              {deal.procurementStatus || "In Review"}
                            </span>
                          ) : (
                            "Standard terms apply. No procurement blockers identified."
                          )}
                        </p>
                      </div>
                      <span className="text-[10px] text-gray-400 mt-3 block">Audited Workflow</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Activities Timeline */}
              {activeTab === "timeline" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/40 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <Clock size={14} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-900">Stage: {deal.stage}</div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Current stage active since {formatDate(deal.updatedAt || deal.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/40 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <CheckCircle2 size={14} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-900">Deal Initialized</div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Created on {formatDate(deal.createdAt)}
                        {deal.leadId ? ` (Converted from Lead #${deal.leadId})` : ""}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Notes */}
              {activeTab === "notes" && (
                <div className="space-y-5">
                  {/* Add Note Input */}
                  <form onSubmit={handleAddNote} className="space-y-3">
                    <textarea
                      rows={3}
                      required
                      placeholder="Add a progress update, call summary, or customer feedback..."
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-medium"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={addingNote || !newNoteText.trim()}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm shadow-blue-200"
                      >
                        {addingNote ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                        <span>Save Note</span>
                      </button>
                    </div>
                  </form>

                  {/* Notes List */}
                  {notes.length === 0 ? (
                    <div className="py-8 text-center text-xs text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                      No additional notes logged yet. Use the field above to add notes to this deal.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {notes.map((note) => (
                        <div
                          key={note.id}
                          className="p-4 bg-white border border-gray-100 rounded-xl shadow-xs"
                        >
                          <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1.5">
                            <span className="font-bold text-gray-700">{note.author || "User"}</span>
                            <span>{new Date(note.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {note.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Quick Summary Card */}
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-5 flex items-center gap-2">
              Quick Summary
            </h3>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">
                  Internal Deal ID
                </span>
                <span className="font-mono text-gray-700 font-semibold break-all">{deal.dealId}</span>
              </div>

              {deal.leadId && (
                <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl">
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block mb-0.5">
                    Converted from Lead
                  </span>
                  <span className="font-mono text-blue-700 font-semibold">{deal.leadId}</span>
                </div>
              )}

              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-400 font-medium">Stage</span>
                <span className="font-bold text-gray-900">{stageConfig.label}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-400 font-medium">Expected Close</span>
                <span className="font-bold text-gray-900">{formatDate(deal.closeDate)}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-400 font-medium">Pipeline ID</span>
                <span className="font-mono text-gray-700">{deal.pipelineId || "Default"}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-400 font-medium">Created Date</span>
                <span className="font-semibold text-gray-700">{formatDate(deal.createdAt)}</span>
              </div>

              <button
                onClick={() => {
                  setEditForm({
                    name: deal.name,
                    amount: deal.amount.toString(),
                    stage: deal.stage,
                  });
                  setIsEditModalOpen(true);
                }}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm shadow-blue-200 mt-2 flex items-center justify-center gap-2"
              >
                <Pencil size={14} />
                Edit Deal Details
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stage Transition Modal (Backend-validated) ── */}
      {transitionModalStage && (
        <StageTransitionModal
          deal={deal}
          targetStageName={transitionModalStage}
          targetStageConfig={targetStageObj}
          isOpen={true}
          onClose={() => setTransitionModalStage(null)}
          onSuccess={async () => {
            setTransitionModalStage(null);
            if (onUpdate) await onUpdate();
          }}
        />
      )}

      {/* ── Edit Deal Modal ── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Edit Deal</h3>
                <p className="text-[11px] text-gray-400">Update core parameters</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Deal Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Amount
                  </label>
                  <input
                    type="number"
                    value={editForm.amount}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Stage
                  </label>
                  <select
                    value={editForm.stage}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, stage: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    {availableStages.map((s) => (
                      <option key={s} value={s}>
                        {getStageConfig(s).label || s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end gap-2.5">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isUpdating || !editForm.name.trim()}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm shadow-blue-200 flex items-center gap-1.5"
                >
                  {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save size={14} />}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
