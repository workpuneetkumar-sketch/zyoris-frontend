// components/deals/StageTransitionModal.tsx
"use client";

import { useState } from "react";
import {
  ArrowRight,
  ShieldAlert,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import { Deal } from "@/types/deals";
import { PipelineStage } from "@/types/pipelines";
import { updateDeal } from "@/lib/api/dealsApi";

interface StageTransitionModalProps {
  deal: Deal;
  targetStageName: string;
  targetStageConfig?: PipelineStage | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedDeal: Deal) => void;
}

export function StageTransitionModal({
  deal,
  targetStageName,
  targetStageConfig,
  isOpen,
  onClose,
  onSuccess,
}: StageTransitionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirmTransition = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      // Send request directly to backend API — backend is the sole authority for transition rules
      const updated = await updateDeal(deal.dealId, {
        stage: targetStageName,
      });
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      // Backend validation error is displayed directly to the user
      const serverMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Backend rejected stage transition";
      setErrorMessage(serverMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-150 flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              <ArrowRight size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Stage Transition</h3>
              <p className="text-[11px] text-gray-400">Validate and advance deal stage</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 animate-in slide-in-from-top duration-200">
              <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <div className="text-xs text-red-800 font-medium">
                <span className="font-bold block mb-0.5">Transition Blocked by Backend:</span>
                {errorMessage}
              </div>
            </div>
          )}

          {/* Deal & Transition Path */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              Target Deal
            </p>
            <div className="text-sm font-bold text-gray-900 mb-3">{deal.name}</div>

            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-gray-700">
                {deal.stage}
              </span>
              <ArrowRight size={14} className="text-gray-400 shrink-0" />
              <span className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 font-bold">
                {targetStageName}
              </span>
            </div>
          </div>

          {/* Target Stage Backend-Provided Requirements */}
          {targetStageConfig && (
            <div className="space-y-3">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Target Stage Criteria & Requirements
              </div>

              {/* Required Fields */}
              {targetStageConfig.requiredFields && targetStageConfig.requiredFields.length > 0 && (
                <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 mb-2">
                    <FileCheck size={14} className="text-blue-600" />
                    <span>Required Fields for {targetStageName}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {targetStageConfig.requiredFields.map((f) => (
                      <span
                        key={f}
                        className="px-2 py-0.5 bg-white text-blue-800 text-[11px] font-semibold rounded-md border border-blue-200"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Entry Criteria */}
              {targetStageConfig.entryCriteria && targetStageConfig.entryCriteria.length > 0 && (
                <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-100">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 mb-2">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <span>Entry Criteria</span>
                  </div>
                  <pre className="text-[11px] font-mono text-emerald-800 bg-white/80 p-2 rounded-lg border border-emerald-100 overflow-x-auto">
                    {JSON.stringify(targetStageConfig.entryCriteria, null, 2)}
                  </pre>
                </div>
              )}

              {/* Validation Rules */}
              {targetStageConfig.validationRules && targetStageConfig.validationRules.length > 0 && (
                <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-100">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 mb-2">
                    <ShieldAlert size={14} className="text-amber-600" />
                    <span>Backend Validation Rules</span>
                  </div>
                  <pre className="text-[11px] font-mono text-amber-800 bg-white/80 p-2 rounded-lg border border-amber-100 overflow-x-auto">
                    {JSON.stringify(targetStageConfig.validationRules, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          <p className="text-[11px] text-gray-400 leading-normal">
            Upon confirmation, the backend API will evaluate all exit criteria of the current stage
            and entry requirements of the target stage.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmTransition}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm shadow-blue-200"
          >
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            Confirm Transition
          </button>
        </div>
      </div>
    </div>
  );
}
