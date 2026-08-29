"use client";

import { Sparkles, AlertTriangle, Lightbulb, Target, FileText, Loader2 } from "lucide-react";
import { SectionCard } from "../SectionCard";
import { SectionEmpty } from "../SectionStates";
import { ProvenanceBadge } from "../ProvenanceBadge";
import { formatDateTime } from "../primitives";
import { useCustomer360Insights } from "@/hooks/useCustomer360Insights";

const KIND_META: Record<
  string,
  { label: string; icon: typeof Sparkles; accent: string }
> = {
  RISK: { label: "Risk", icon: AlertTriangle, accent: "text-error" },
  OPPORTUNITY: { label: "Opportunity", icon: Lightbulb, accent: "text-success" },
  NEXT_BEST_ACTION: { label: "Next best action", icon: Target, accent: "text-primary" },
  CHURN_WARNING: { label: "Churn Warning", icon: AlertTriangle, accent: "text-error" },
  SUMMARY: { label: "Summary", icon: FileText, accent: "text-text-secondary" },
};

export function AiInsightsSection({ customerId }: { customerId: string }) {
  const { insights, loading, error } = useCustomer360Insights(customerId);

  return (
    <SectionCard
      id="ai-insights"
      title="AI Insights"
      icon={Sparkles}
      description="Model-generated risks, opportunities and recommended actions"
    >
      {loading ? (
        <div className="flex h-32 items-center justify-center text-text-muted">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          <span>Generating insights...</span>
        </div>
      ) : error ? (
        <div className="flex h-32 items-center justify-center text-error">
          <span>Failed to load insights.</span>
        </div>
      ) : insights.length === 0 ? (
        <SectionEmpty
          title="No AI insights yet"
          description="Insights are generated once there is enough account activity to analyse."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {insights.map((insight) => {
            const meta = KIND_META[insight.type] ?? KIND_META.SUMMARY;
            const Icon = meta.icon;
            return (
              <li key={insight.insightId} className="rounded-xl border border-border-light p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Icon size={15} className={meta.accent} />
                  <span className="text-[11px] font-bold uppercase tracking-wide text-text-muted">
                    {meta.label}
                  </span>
                  {insight.confidence != null && (
                    <span className="text-[11px] text-text-muted">
                      {Math.round((insight.confidence <= 1 ? insight.confidence * 100 : insight.confidence))}% confidence
                    </span>
                  )}
                  {insight.evidenceIds && insight.evidenceIds.length > 0 && (
                    <ProvenanceBadge provenance={{ source: "INTERNAL", details: { evidenceId: insight.evidenceIds[0] } }} className="ml-auto" />
                  )}
                </div>
                <p className="mt-1.5 text-sm font-semibold text-text">{insight.text}</p>
                <p className="mt-2 text-[11px] text-text-muted">
                  {insight.generatedAt ? formatDateTime(insight.generatedAt) : ""}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
