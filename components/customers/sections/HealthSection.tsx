"use client";

import { HeartPulse } from "lucide-react";
import type { AsyncResource } from "@/hooks/useCustomer360";
import type { CommunicationIntelligence } from "@/types/customer360";
import { toCustomerHealth } from "@/lib/api/customersApi";
import { SectionCard } from "../SectionCard";
import { SectionEmpty, SectionError, SectionLoading } from "../SectionStates";
import { ProvenanceBadge } from "../ProvenanceBadge";

const BAND_STYLES: Record<string, string> = {
  healthy: "bg-success-light text-success-foreground",
  neutral: "bg-background-secondary text-text-secondary",
  at_risk: "bg-warning-light text-warning-foreground",
  critical: "bg-error-light text-error-foreground",
};

const IMPACT_DOT: Record<string, string> = {
  positive: "bg-success",
  negative: "bg-error",
  neutral: "bg-text-muted",
};

export function HealthSection({
  intelligence,
  hasLead,
}: {
  intelligence: AsyncResource<CommunicationIntelligence | null>;
  hasLead: boolean;
}) {
  const health = toCustomerHealth(intelligence.data);

  return (
    <SectionCard
      id="health"
      title="Health"
      icon={HeartPulse}
      description="Account health signals derived from AI communication intelligence"
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
          title="No health signal"
          description="A health signal appears once this customer is linked to a lead with communication history."
        />
      ) : intelligence.loading ? (
        <SectionLoading label="Analysing communication history…" />
      ) : intelligence.error ? (
        <SectionError message={intelligence.error.message} onRetry={intelligence.reload} />
      ) : !health ? (
        <SectionEmpty
          title="Not enough signal yet"
          description="There isn't enough recent communication activity to assess account health."
        />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {health.score != null && (
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-text">{health.score}</span>
                <span className="text-sm text-text-muted">/ 100</span>
              </div>
            )}
            {health.band && (
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                  BAND_STYLES[health.band] ?? BAND_STYLES.neutral
                }`}
              >
                {health.band.replace(/_/g, " ")}
              </span>
            )}
            <ProvenanceBadge provenance={health.provenance} />
          </div>

          {health.summary && (
            <p className="rounded-xl bg-background-secondary/60 p-3 text-sm leading-relaxed text-text-secondary">
              {health.summary}
            </p>
          )}

          {health.factors && health.factors.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {health.factors.map((factor, i) => (
                <li
                  key={`${factor.label}-${i}`}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-border-light px-3 py-2 text-sm"
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      IMPACT_DOT[factor.impact] ?? IMPACT_DOT.neutral
                    }`}
                  />
                  <span className="font-medium capitalize text-text">{factor.label}</span>
                  {factor.detail && (
                    <span className="text-xs text-text-secondary">{factor.detail}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </SectionCard>
  );
}
