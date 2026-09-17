// components/deals/PipelineStageManager.tsx
"use client";

import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  FileCheck,
  Layers,
  Loader2,
  Sliders,
  CheckCircle2,
} from "lucide-react";
import {
  PipelineStage,
  CreateStagePayload,
  UpdateStagePayload,
  StageCriteriaItem,
  StageValidationRuleItem,
} from "@/types/pipelines";
import { fetchStageById } from "@/lib/api/pipelinesApi";

interface PipelineStageManagerProps {
  pipelineId?: string;
  stages: PipelineStage[];
  loading: boolean;
  onCreateStage: (payload: CreateStagePayload) => Promise<boolean>;
  onUpdateStage: (stageId: string, payload: UpdateStagePayload) => Promise<boolean>;
  onDeleteStage: (stageId: string) => Promise<boolean>;
  onReorderStages: (stageOrders: Array<{ stageId: string; order: number }>) => Promise<boolean>;
  onRefresh: () => void;
}

export function PipelineStageManager({
  pipelineId,
  stages,
  loading,
  onCreateStage,
  onUpdateStage,
  onDeleteStage,
  onReorderStages,
}: PipelineStageManagerProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<PipelineStage | null>(null);
  const [inspectingStage, setInspectingStage] = useState<PipelineStage | null>(null);
  const [inspectingLoading, setInspectingLoading] = useState(false);
  const [deletingStageId, setDeletingStageId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [requiredFieldsStr, setRequiredFieldsStr] = useState("");
  const [entryCriteriaStr, setEntryCriteriaStr] = useState("");
  const [exitCriteriaStr, setExitCriteriaStr] = useState("");
  const [validationRulesStr, setValidationRulesStr] = useState("");

  const openCreate = () => {
    setName("");
    setDescription("");
    setRequiredFieldsStr("amount, contactId, closeDate");
    setEntryCriteriaStr("");
    setExitCriteriaStr("");
    setValidationRulesStr("");
    setFormError(null);
    setIsCreateOpen(true);
  };

  const openEdit = (stage: PipelineStage) => {
    setEditingStage(stage);
    setName(stage.name || "");
    setDescription(stage.description || "");
    setRequiredFieldsStr((stage.requiredFields || []).join(", "));
    setEntryCriteriaStr(
      stage.entryCriteria && stage.entryCriteria.length
        ? JSON.stringify(stage.entryCriteria, null, 2)
        : ""
    );
    setExitCriteriaStr(
      stage.exitCriteria && stage.exitCriteria.length
        ? JSON.stringify(stage.exitCriteria, null, 2)
        : ""
    );
    setValidationRulesStr(
      stage.validationRules && stage.validationRules.length
        ? JSON.stringify(stage.validationRules, null, 2)
        : ""
    );
    setFormError(null);
  };

  const handleInspectStage = async (stage: PipelineStage) => {
    if (pipelineId && stage.id) {
      setInspectingLoading(true);
      try {
        const fullDetail = await fetchStageById(pipelineId, stage.id);
        if (fullDetail) {
          setInspectingStage(fullDetail);
          return;
        }
      } catch {
        // fallback to existing stage object
      } finally {
        setInspectingLoading(false);
      }
    }
    setInspectingStage(stage);
  };

  const parseJsonSafe = <T,>(str: string, fallback: T): T => {
    if (!str.trim()) return fallback;
    try {
      return JSON.parse(str);
    } catch {
      return fallback;
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Stage name is required");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const requiredFields = requiredFieldsStr
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const entryCriteria = parseJsonSafe<StageCriteriaItem[]>(entryCriteriaStr, []);
      const exitCriteria = parseJsonSafe<StageCriteriaItem[]>(exitCriteriaStr, []);
      const validationRules = parseJsonSafe<StageValidationRuleItem[]>(validationRulesStr, []);

      const nextOrder = stages.length > 0 ? Math.max(...stages.map((s) => s.order ?? 0)) + 1 : 1;

      const ok = await onCreateStage({
        name: name.trim(),
        description: description.trim() || undefined,
        order: nextOrder,
        requiredFields: requiredFields.length ? requiredFields : undefined,
        entryCriteria: entryCriteria.length ? entryCriteria : undefined,
        exitCriteria: exitCriteria.length ? exitCriteria : undefined,
        validationRules: validationRules.length ? validationRules : undefined,
        isActive: true,
      });
      if (ok) {
        setIsCreateOpen(false);
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || "Failed to create stage");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStage || !name.trim()) {
      setFormError("Stage name is required");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const requiredFields = requiredFieldsStr
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const entryCriteria = parseJsonSafe<StageCriteriaItem[]>(entryCriteriaStr, []);
      const exitCriteria = parseJsonSafe<StageCriteriaItem[]>(exitCriteriaStr, []);
      const validationRules = parseJsonSafe<StageValidationRuleItem[]>(validationRulesStr, []);

      const ok = await onUpdateStage(editingStage.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        requiredFields: requiredFields.length ? requiredFields : undefined,
        entryCriteria: entryCriteria.length ? entryCriteria : undefined,
        exitCriteria: exitCriteria.length ? exitCriteria : undefined,
        validationRules: validationRules.length ? validationRules : undefined,
      });
      if (ok) {
        setEditingStage(null);
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || "Failed to update stage");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (stageId: string) => {
    setSubmitting(true);
    try {
      const ok = await onDeleteStage(stageId);
      if (ok) {
        setDeletingStageId(null);
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || "Failed to delete stage");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMoveOrder = async (index: number, direction: "left" | "right") => {
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stages.length) return;

    const newStages = [...stages];
    const [moved] = newStages.splice(index, 1);
    newStages.splice(targetIndex, 0, moved);

    const stageOrders = newStages.map((s, idx) => ({
      stageId: s.id,
      order: idx + 1,
    }));

    await onReorderStages(stageOrders);
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={openCreate}
          disabled={!pipelineId || loading}
          className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-xs font-semibold shadow-sm transition-all hover:bg-gray-50 disabled:opacity-50"
        >
          <Plus size={13} className="text-blue-600" />
          <span>Add Stage</span>
        </button>

        <button
          onClick={() => setIsManagerOpen(true)}
          disabled={!pipelineId || loading}
          className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-xs font-semibold shadow-sm transition-all hover:bg-gray-50 disabled:opacity-50"
          title="Manage stage order, criteria, validation rules and configurations"
        >
          <Sliders size={13} className="text-gray-500" />
          <span>Manage Stages</span>
          {stages.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px] font-bold">
              {stages.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Manage Stages Central Drawer / Modal ── */}
      {isManagerOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Sliders size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Pipeline Stages & Rules</h3>
                  <p className="text-[11px] text-gray-400">
                    Retrieve in persisted order, inspect details/rules, update configs, and reorder
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsManagerOpen(false);
                    openCreate();
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-semibold transition-colors"
                >
                  <Plus size={13} />
                  Add Stage
                </button>
                <button
                  onClick={() => setIsManagerOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-sm font-bold ml-2"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              {stages.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Layers size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-xs">No stages configured for this pipeline.</p>
                </div>
              ) : (
                stages.map((stage, idx) => (
                  <div
                    key={stage.id || stage.name}
                    className="p-4 rounded-2xl border border-gray-100 bg-white hover:border-gray-200 shadow-xs flex items-center justify-between gap-4 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 font-bold text-xs flex items-center justify-center shrink-0">
                        #{stage.order ?? idx + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-bold text-gray-900 truncate">{stage.name}</h4>
                          {stage.probability !== undefined && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-600">
                              {stage.probability}% win prob
                            </span>
                          )}
                          {stage.requiredFields && stage.requiredFields.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700">
                              {stage.requiredFields.length} req. fields
                            </span>
                          )}
                        </div>
                        {stage.description && (
                          <p className="text-[11px] text-gray-400 truncate mt-0.5">{stage.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Move Up */}
                      <button
                        onClick={() => handleMoveOrder(idx, "left")}
                        disabled={idx === 0 || submitting}
                        title="Move Up in Persisted Order"
                        className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 disabled:opacity-30 transition-colors"
                      >
                        <ArrowLeft size={13} className="rotate-90" />
                      </button>

                      {/* Move Down */}
                      <button
                        onClick={() => handleMoveOrder(idx, "right")}
                        disabled={idx === stages.length - 1 || submitting}
                        title="Move Down in Persisted Order"
                        className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 disabled:opacity-30 transition-colors"
                      >
                        <ArrowRight size={13} className="rotate-90" />
                      </button>

                      {/* Inspect Rules & Details */}
                      <button
                        onClick={() => handleInspectStage(stage)}
                        title="Retrieve stage details and rules"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-medium transition-colors"
                      >
                        <ShieldCheck size={13} className="text-emerald-600" />
                        <span className="hidden sm:inline">Rules</span>
                      </button>

                      {/* Update Configuration */}
                      <button
                        onClick={() => openEdit(stage)}
                        title="Update stage configuration"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-medium transition-colors"
                      >
                        <Pencil size={13} className="text-blue-600" />
                        <span className="hidden sm:inline">Edit</span>
                      </button>

                      {/* Delete Stage & Re-index */}
                      <button
                        onClick={() => setDeletingStageId(stage.id)}
                        title="Delete stage and re-index ordering"
                        className="p-1.5 rounded-lg border border-gray-200 hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[11px] text-gray-400">
                Total {stages.length} stage{stages.length === 1 ? "" : "s"} in persisted order
              </span>
              <button
                onClick={() => setIsManagerOpen(false)}
                className="px-4 py-2 rounded-xl bg-gray-900 text-xs font-semibold text-white hover:bg-gray-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Stage Modal ── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Layers size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Add Pipeline Stage</h3>
                  <p className="text-[11px] text-gray-400">Define stage rules & requirements</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Stage Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Proposal Review"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Review proposal pricing and terms with customer"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Required Fields (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="amount, contactId, closeDate"
                  value={requiredFieldsStr}
                  onChange={(e) => setRequiredFieldsStr(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-[11px]"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Fields that must be populated before deals can enter or exit this stage.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Entry Criteria (JSON array, optional)
                </label>
                <textarea
                  rows={2}
                  placeholder='[{"field": "amount", "operator": ">=", "value": 10000}]'
                  value={entryCriteriaStr}
                  onChange={(e) => setEntryCriteriaStr(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Validation Rules (JSON array, optional)
                </label>
                <textarea
                  rows={2}
                  placeholder='[{"ruleName": "MinimumAmount", "errorMessage": "Amount must be specified"}]'
                  value={validationRulesStr}
                  onChange={(e) => setValidationRulesStr(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !name.trim()}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm shadow-blue-200"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  Create Stage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Stage Modal ── */}
      {editingStage && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Pencil size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Edit Stage: {editingStage.name}</h3>
                  <p className="text-[11px] text-gray-400">Update configuration & validation criteria</p>
                </div>
              </div>
              <button
                onClick={() => setEditingStage(null)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Stage Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Required Fields (comma-separated)
                </label>
                <input
                  type="text"
                  value={requiredFieldsStr}
                  onChange={(e) => setRequiredFieldsStr(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Entry Criteria (JSON array)
                </label>
                <textarea
                  rows={2}
                  value={entryCriteriaStr}
                  onChange={(e) => setEntryCriteriaStr(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Validation Rules (JSON array)
                </label>
                <textarea
                  rows={2}
                  value={validationRulesStr}
                  onChange={(e) => setValidationRulesStr(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingStage(null)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !name.trim()}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm shadow-blue-200"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Inspect Stage Rules Modal ── */}
      {inspectingStage && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Stage Rules: {inspectingStage.name}</h3>
                  <p className="text-[11px] text-gray-400">Backend-provided criteria & validations</p>
                </div>
              </div>
              <button
                onClick={() => setInspectingStage(null)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileCheck size={13} className="text-blue-500" />
                  Required Fields
                </h4>
                {inspectingStage.requiredFields && inspectingStage.requiredFields.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {inspectingStage.requiredFields.map((f) => (
                      <span
                        key={f}
                        className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No specific required fields configured.</p>
                )}
              </div>

              <div>
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  Entry Criteria
                </h4>
                {inspectingStage.entryCriteria && inspectingStage.entryCriteria.length > 0 ? (
                  <pre className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-mono text-gray-700 overflow-x-auto">
                    {JSON.stringify(inspectingStage.entryCriteria, null, 2)}
                  </pre>
                ) : (
                  <p className="text-xs text-gray-400">No entry criteria configured.</p>
                )}
              </div>

              <div>
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sliders size={13} className="text-amber-500" />
                  Validation Rules
                </h4>
                {inspectingStage.validationRules && inspectingStage.validationRules.length > 0 ? (
                  <pre className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-mono text-gray-700 overflow-x-auto">
                    {JSON.stringify(inspectingStage.validationRules, null, 2)}
                  </pre>
                ) : (
                  <p className="text-xs text-gray-400">No validation rules configured.</p>
                )}
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setInspectingStage(null)}
                className="px-4 py-2 rounded-xl bg-gray-900 text-xs font-semibold text-white hover:bg-gray-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deletingStageId && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 p-6 animate-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
              <Trash2 size={20} />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">Delete this stage?</h3>
            <p className="text-xs text-gray-500 mb-5 leading-relaxed">
              Deleting this stage will remove it from the pipeline and re-index remaining stages.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingStageId(null)}
                disabled={submitting}
                className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deletingStageId)}
                disabled={submitting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm shadow-red-200"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                Delete Stage
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function StageHeaderActions({
  stage,
  index,
  totalStages,
  onInspect,
  onEdit,
  onDelete,
  onMove,
}: {
  stage: PipelineStage;
  index: number;
  totalStages: number;
  onInspect: (stage: PipelineStage) => void;
  onEdit: (stage: PipelineStage) => void;
  onDelete: (stageId: string) => void;
  onMove: (index: number, direction: "left" | "right") => void;
}) {
  return (
    <div className="flex items-center gap-1 opacity-80 hover:opacity-100 transition-opacity">
      {/* Reorder Left */}
      {index > 0 && (
        <button
          onClick={() => onMove(index, "left")}
          title="Move stage left"
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 text-gray-500 transition-colors"
        >
          <ArrowLeft size={11} />
        </button>
      )}

      {/* Reorder Right */}
      {index < totalStages - 1 && (
        <button
          onClick={() => onMove(index, "right")}
          title="Move stage right"
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 text-gray-500 transition-colors"
        >
          <ArrowRight size={11} />
        </button>
      )}

      {/* View Criteria */}
      <button
        onClick={() => onInspect(stage)}
        title="View Stage Criteria & Rules"
        className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 text-gray-500 transition-colors"
      >
        <ShieldCheck size={11} />
      </button>

      {/* Edit Stage */}
      <button
        onClick={() => onEdit(stage)}
        title="Edit Stage"
        className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 text-gray-500 transition-colors"
      >
        <Pencil size={11} />
      </button>

      {/* Delete Stage */}
      <button
        onClick={() => onDelete(stage.id)}
        title="Delete Stage"
        className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"
      >
        <Trash2 size={11} />
      </button>
    </div>
  );
}
