"use client";

import { Sparkles, AlertTriangle, Lightbulb, Target, FileText } from "lucide-react";
import type { AsyncResource } from "@/hooks/useCustomer360";
import type { CommunicationIntelligence, CustomerAiInsight } from "@/types/customer360";
import { toCustomerAiInsights } from "@/lib/api/customersApi";
import { SectionCard } from "../SectionCard";
import { SectionEmpty, SectionError, SectionLoading } from "../SectionStates";
import { ProvenanceBadge } from "../ProvenanceBadge";
import { formatDateTime } from "../primitives";

const KIND_META: Record<
  CustomerAiInsight["kind"],
  { label: string; icon: typeof Sparkles; accent: string }
> = {
  risk: { label: "Risk", icon: AlertTriangle, accent: "text-error" },
  opportunity: { label: "Opportunity", icon: Lightbulb, accent: "text-success" },
  next_best_action: { label: "Next best action", icon: Target, accent: "text-primary" },
  summary: { label: "Summary", icon: FileText, accent: "text-text-secondary" },
};

export function AiInsightsSection({
  intelligence,
  hasLead,
}: {
  intelligence: AsyncResource<CommunicationIntelligence | null>;
  hasLead: boolean;
}) {
  const list = toCustomerAiInsights(intelligence.data);

  return (
    <SectionCard
      id="ai-insights"
      title="AI Insights"
      icon={Sparkles}
      description="Model-generated risks, opportunities and recommended actions"
      action={
        hasLead ? (
          <button
            type="button"
            onClick={intelligence.reload}
            className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-text hover:bg-surface-hover"
          >
            Refresh
          </button>
        ) : undefined
      }
    >
      {!hasLead ? (
        <SectionEmpty
          title="No AI insights"
          description="Insights are generated from a linked lead's communication history — this customer isn't linked to a lead."
        />
      ) : intelligence.loading ? (
        <SectionLoading label="Generating insights…" />
      ) : intelligence.error ? (
        <SectionError message={intelligence.error.message} onRetry={intelligence.reload} />
      ) : list.length === 0 ? (
        <SectionEmpty
          title="No AI insights yet"
          description="Insights appear once there is enough account activity to analyse."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((insight) => {
            const meta = KIND_META[insight.kind] ?? KIND_META.summary;
            const Icon = meta.icon;
            return (
              <li key={insight.id} className="rounded-xl border border-border-light p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Icon size={15} className={meta.accent} />
                  <span className="text-[11px] font-bold uppercase tracking-wide text-text-muted">
                    {meta.label}
                  </span>
                  {insight.confidence != null && (
                    <span className="text-[11px] text-text-muted">
                      {Math.round(
                        insight.confidence <= 1 ? insight.confidence * 100 : insight.confidence
                      )}
                      % confidence
                    </span>
                  )}
                  <ProvenanceBadge provenance={insight.provenance} className="ml-auto" />
                </div>
                <p className="mt-1.5 text-sm font-semibold text-text">{insight.title}</p>
                {insight.body && (
                  <p className="mt-1 text-sm leading-relaxed text-text-secondary">{insight.body}</p>
                )}
                {(insight.model || insight.generatedAt) && (
                  <p className="mt-2 text-[11px] text-text-muted">
                    {insight.model ? `${insight.model} · ` : ""}
                    {insight.generatedAt ? formatDateTime(insight.generatedAt) : ""}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
