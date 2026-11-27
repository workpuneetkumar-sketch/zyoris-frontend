"use client";

import React from "react";
import { ShieldCheck, Sparkles, AlertTriangle, RefreshCw } from "lucide-react";
import type { AiUsageLimit } from "@/lib/schemas/marketingAiSchemas";

interface AiUsageBannerProps {
  usage: AiUsageLimit | null;
  usageLoading: boolean;
  usageUnavailable: boolean;
  onRefreshUsage?: () => void;
}

export const AiUsageBanner: React.FC<AiUsageBannerProps> = ({
  usage,
  usageLoading,
  usageUnavailable,
  onRefreshUsage,
}) => {
  const isExhausted = usage !== null && usage.remaining <= 0;
  const isLow = usage !== null && usage.remaining > 0 && usage.remaining <= 5;

  return (
    <div className="mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-2xl border border-gray-200/80 bg-white px-4 py-3.5 shadow-sm">
      {/* Safety boundary pill */}
      <div className="flex items-start sm:items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
          <ShieldCheck size={17} />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-900 flex items-center gap-2 flex-wrap">
            Drafts & Suggestions Only
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/70">
              Human Approval Required
            </span>
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            AI outputs are editable suggestions, not performance guarantees. Nothing is published or billed without your explicit approval.
          </p>
        </div>
      </div>

      {/* Quota / Usage limit indicator */}
      <div className="flex items-center gap-3 self-start lg:self-center shrink-0">
        {usageLoading ? (
          <div className="h-7 w-40 rounded-xl bg-gray-100 animate-pulse" />
        ) : usage ? (
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium ${
              isExhausted
                ? "bg-red-50 border-red-200 text-red-700"
                : isLow
                ? "bg-amber-50 border-amber-200 text-amber-800"
                : "bg-gray-50 border-gray-200 text-gray-700"
            }`}
          >
            {isExhausted || isLow ? (
              <AlertTriangle size={14} className="shrink-0" />
            ) : (
              <Sparkles size={14} className="text-purple-600 shrink-0" />
            )}
            <span>
              AI Credits:{" "}
              <strong>
                {usage.remaining} / {usage.limit}
              </strong>{" "}
              left
            </span>
            {usage.resetAt && (
              <span className="text-[11px] opacity-80 hidden sm:inline">
                (resets {new Date(usage.resetAt).toLocaleDateString()})
              </span>
            )}
          </div>
        ) : usageUnavailable ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 text-xs text-gray-500">
            Quota status pending backend
          </span>
        ) : null}

        {onRefreshUsage && (
          <button
            type="button"
            onClick={onRefreshUsage}
            disabled={usageLoading}
            title="Refresh AI usage quota"
            className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={usageLoading ? "animate-spin" : ""} />
          </button>
        )}
      </div>
    </div>
  );
};
