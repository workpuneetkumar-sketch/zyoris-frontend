"use client";

import { LayoutDashboard } from "lucide-react";
import type { CustomerSummary } from "@/types/customer360";
import { provenanceOf, unwrap } from "@/types/customer360";
import { SectionCard } from "../SectionCard";
import { Field, formatDate } from "../primitives";
import { ProvenanceBadge } from "../ProvenanceBadge";

const STAGE_LABELS: Record<string, string> = {
  prospect: "Prospect",
  onboarding: "Onboarding",
  active: "Active",
  at_risk: "At risk",
  churned: "Churned",
  renewed: "Renewed",
};

export function ContextSummarySection({ customer }: { customer: CustomerSummary }) {
  const ctx = customer.context ?? {};
  const owner = unwrap(ctx.accountOwner ?? null);

  return (
    <SectionCard
      id="context"
      title="Context Summary"
      icon={LayoutDashboard}
      description="Canonical account facts from the customer record"
      action={customer.provenance ? <ProvenanceBadge provenance={customer.provenance} /> : undefined}
    >
      {ctx.headline && (
        <p className="mb-4 rounded-xl bg-background-secondary/60 p-3 text-sm leading-relaxed text-text-secondary">
          {ctx.headline}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field
          label="Lifecycle stage"
          value={ctx.lifecycleStage ? STAGE_LABELS[ctx.lifecycleStage] ?? ctx.lifecycleStage : null}
        />
        <Field
          label="Account owner"
          value={owner?.name}
          provenance={provenanceOf(ctx.accountOwner ?? null)}
        />
        <Field
          label="Segment"
          value={unwrap(ctx.segment ?? null)}
          provenance={provenanceOf(ctx.segment ?? null)}
        />
        <Field
          label="Industry"
          value={unwrap(ctx.industry ?? null)}
          provenance={provenanceOf(ctx.industry ?? null)}
        />
        <Field
          label="Region"
          value={unwrap(ctx.region ?? null)}
          provenance={provenanceOf(ctx.region ?? null)}
        />
        <Field label="Customer since" value={ctx.since ? formatDate(ctx.since) : null} />
      </div>

      {ctx.tags && ctx.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {ctx.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border-light bg-background-secondary px-2 py-0.5 text-[11px] font-medium text-text-secondary"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
