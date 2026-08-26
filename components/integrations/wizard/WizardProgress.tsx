"use client";

export interface WizardStep {
  id: number;
  label: string;
}

interface WizardProgressProps {
  steps: readonly WizardStep[];
  currentStep: number;
  onStepChange?: (step: number) => void;
}

export function WizardProgress({
  steps,
  currentStep,
  onStepChange,
}: WizardProgressProps) {
  return (
    <div className="grid border-b border-border bg-surface-secondary/30 text-xs">
      {steps.map((step) => {
        const isCurrent = currentStep === step.id;
        const isCompleted = currentStep > step.id;

        const canNavigate =
          step.id === 1 || currentStep > step.id;

        return (
          <button
            key={step.id}
            type="button"
            disabled={!canNavigate}
            onClick={() => {
              if (canNavigate) {
                onStepChange?.(step.id);
              }
            }}
            className={`py-2.5 px-3 text-center border-b-2 font-medium transition-all ${
              isCurrent
                ? "border-primary text-primary bg-primary/5"
                : isCompleted
                ? "border-success text-success"
                : "border-transparent text-text-muted"
            } disabled:cursor-default`}
          >
            <span className="hidden sm:inline">
              {step.id}. {step.label}
            </span>

            <span className="sm:hidden">
              Step {step.id}
            </span>
          </button>
        );
      })}
    </div>
  );
}