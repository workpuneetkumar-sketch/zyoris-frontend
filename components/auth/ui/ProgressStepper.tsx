import React from "react";
import classNames from "classnames";

interface ProgressStepperProps {
  currentStep: number;
  totalSteps?: number;
  className?: string;
}

export default function ProgressStepper({ currentStep, totalSteps = 4, className }: ProgressStepperProps) {
  return (
    <div className={classNames("flex items-center w-full max-w-sm mb-6", className)}>
      {Array.from({ length: totalSteps }).map((_, index) => {
        const stepNum = index + 1;
        const isCompleted = stepNum < currentStep;
        const isActive = stepNum === currentStep;
        
        return (
          <React.Fragment key={stepNum}>
            {/* Step Circle */}
            <div
              className={classNames(
                "flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold shrink-0 transition-colors",
                isActive || isCompleted
                  ? "bg-[#002B7F] text-white"
                  : "bg-white border border-gray-300 text-gray-500"
              )}
            >
              {stepNum}
            </div>
            
            {/* Connecting Line (not after the last step) */}
            {stepNum < totalSteps && (
              <div
                className={classNames(
                  "flex-1 h-[1px] mx-2 transition-colors",
                  isCompleted ? "bg-[#002B7F]" : "bg-gray-300"
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
