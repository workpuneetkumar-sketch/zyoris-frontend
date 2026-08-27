"use client";

import { HeartPulse, TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { CustomerHealth } from "@/types/customer360";
import { provenanceOf, unwrap } from "@/types/customer360";
import { SectionCard } from "../SectionCard";
import { SectionEmpty } from "../SectionStates";
import { ProvenanceBadge } from "../ProvenanceBadge";

const BAND_STYLES: Record<string, string> = {
  healthy: "bg-success-light text-success-foreground",
  neutral: "bg-background-secondary text-text-secondary",
  at_risk: "bg-warning-light text-warning-foreground",
  critical: "bg-error-light text-error-foreground",
};

const TREND_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus } as const;

export function HealthSection({ health }: { health?: CustomerHealth | null }) {
  const score = unwrap(health?.score ?? null);
  const hasContent =
    health != null &&
    (score != null || health.band != null || (health.factors?.length ?? 0) > 0);

  const TrendIcon = health?.trend ? TREND_ICON[health.trend] : null;

  return (
    <SectionCard
      id="health"
      title="Health"
      icon={HeartPulse}
      description="Account health score and the signals behind it"
    >
      {!hasContent ? (
        <SectionEmpty
          title="No health score available"
          description="A health score will appear once the scoring model has enough signal for this account."
        />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-text">{score ?? "—"}</span>
              {score != null && <span className="text-sm text-text-muted">/ 100</span>}
            </div>
            {health?.band && (
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                  BAND_STYLES[health.band] ?? BAND_STYLES.neutral
                }`}
              >
                {health.band.replace(/_/g, " ")}
              </span>
            )}
            {TrendIcon && <TrendIcon size={18} className="text-text-secondary" />}
            <ProvenanceBadge provenance={provenanceOf(health?.score ?? null)} />
          </div>

          {health?.factors && health.factors.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {health.factors.map((factor, i) => {
                const f = factor.value;
                return (
                  <li
                    key={`${f.label}-${i}`}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-border-light px-3 py-2 text-sm"
                  >
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        f.impact === "positive"
                          ? "bg-success"
                          : f.impact === "negative"
                          ? "bg-error"
                          : "bg-text-muted"
                      }`}
                    />
                    <span className="font-medium text-text">{f.label}</span>
                    {f.detail && <span className="text-xs text-text-secondary">{f.detail}</span>}
                    <ProvenanceBadge provenance={factor.provenance} className="ml-auto" />
                  </li>
                );
              })}
            </ul>
          )}

          {health?.lastEvaluatedAt && (
            <p className="text-[11px] text-text-muted">
              Last evaluated {new Date(health.lastEvaluatedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </SectionCard>
  );
}
