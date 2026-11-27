"use client";

import React from "react";
import { AlertCircle, RefreshCw, ShieldAlert, Clock } from "lucide-react";
import type { NormalizedMarketingAiError } from "@/lib/utils/marketingAiErrors";

interface AiErrorAlertProps {
  error: NormalizedMarketingAiError;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export const AiErrorAlert: React.FC<AiErrorAlertProps> = ({
  error,
  onRetry,
  onDismiss,
}) => {
  const isRateLimit = error.code === "RATE_LIMITED";
  const isEndpointMissing = error.code === "ENDPOINT_UNAVAILABLE";
  const isPermission =
    error.code === "PERMISSION_DENIED" || error.code === "UNAUTHORIZED";

  const containerStyle = isRateLimit
    ? "bg-amber-50 border-amber-200 text-amber-900"
    : isEndpointMissing
    ? "bg-indigo-50/70 border-indigo-200 text-indigo-950"
    : "bg-red-50 border-red-200 text-red-900";

  const Icon = isRateLimit
    ? Clock
    : isPermission
    ? ShieldAlert
    : AlertCircle;

  return (
    <div
      role="alert"
      className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${containerStyle}`}
    >
      <div className="flex items-start gap-3">
        <Icon size={18} className="mt-0.5 shrink-0" />
        <div className="space-y-1">
          <p className="text-sm font-semibold">{error.title}</p>
          <p className="text-xs opacity-90 leading-relaxed">{error.message}</p>
          {error.resetAt && (
            <p className="text-xs font-medium">
              Quota resets at: {new Date(error.resetAt).toLocaleString()}
            </p>
          )}
          {error.validationIssues && error.validationIssues.length > 0 && (
            <ul className="mt-1.5 list-disc list-inside text-[11px] opacity-85 space-y-0.5">
              {error.validationIssues.slice(0, 4).map((issue, idx) => (
                <li key={idx}>{issue}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {error.retryable && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-800 hover:bg-gray-50 shadow-sm transition-colors"
          >
            <RefreshCw size={13} /> Retry
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="px-2.5 py-1.5 rounded-xl text-xs font-medium hover:bg-black/5 transition-colors"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
};
