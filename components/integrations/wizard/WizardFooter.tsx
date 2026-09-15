"use client";

import { ArrowLeft, ArrowRight, Loader2, Sparkles } from "lucide-react";

interface WizardFooterProps {
  currentStep: number;
  totalSteps?: number;
  isSubmitting?: boolean;
  submitLabel?: string;
  onPrevious: () => void;
  onNext: () => void;
  onCancel: () => void;
  onSubmit?: () => void;
}

export function WizardFooter({
  currentStep,
  totalSteps = 7,
  isSubmitting = false,
  submitLabel = "Finish",
  onPrevious,
  onNext,
  onCancel,
  onSubmit,
}: WizardFooterProps) {
  const isLastStep = currentStep === totalSteps;

  return (
    <div className="pt-4 border-t border-border flex items-center justify-between gap-3">
      <div>
        {currentStep > 1 && (
          <button
            type="button"
            onClick={onPrevious}
            className="flex items-center gap-1 px-4 py-2 rounded-lg border border-border bg-surface text-text hover:bg-surface-hover text-xs font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-border bg-surface text-text-secondary hover:text-text hover:bg-surface-hover text-xs font-medium transition-colors"
        >
          Cancel
        </button>

        {!isLastStep ? (
          <button
            type="button"
            onClick={onNext}
            className="flex items-center gap-1 px-5 py-2 rounded-lg bg-primary hover:bg-primary-dark text-primary-foreground text-xs font-semibold shadow-sm transition-all"
          >
            <span>Next Step</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="submit"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-6 py-2 rounded-lg bg-primary hover:bg-primary-dark text-primary-foreground text-xs font-semibold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{submitLabel}</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}