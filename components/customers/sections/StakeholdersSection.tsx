"use client";

import { Users } from "lucide-react";
import type { AsyncResource } from "@/hooks/useCustomer360";
import type { CustomerStakeholder } from "@/types/customer360";
import { SectionCard } from "../SectionCard";
import { SectionEmpty, SectionError, SectionLoading } from "../SectionStates";
import { ProvenanceBadge } from "../ProvenanceBadge";

const INFLUENCE_LABELS: Record<string, string> = {
  high: "High influence",
  medium: "Medium influence",
  low: "Low influence",
};

export function StakeholdersSection({
  resource,
  hasCompany,
}: {
  resource: AsyncResource<CustomerStakeholder[]>;
  hasCompany: boolean;
}) {
  const list = resource.data ?? [];

  return (
    <SectionCard
      id="stakeholders"
      title="Stakeholders"
      icon={Users}
      description="Decision makers and influencers from the account relationship graph"
      action={
        list.length > 0 ? (
          <span className="text-xs font-semibold text-text-muted">{list.length}</span>
        ) : hasCompany ? (
          <button
            type="button"
            onClick={resource.reload}
            className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-text hover:bg-surface-hover"
          >
            Refresh
          </button>
        ) : undefined
      }
    >
      {!hasCompany ? (
        <SectionEmpty
          title="No account to map stakeholders from"
          description="Stakeholders come from the linked company's relationship graph — this customer isn't linked to a company."
        />
      ) : resource.loading ? (
        <SectionLoading label="Loading stakeholders…" />
      ) : resource.error ? (
        <SectionError message={resource.error.message} onRetry={resource.reload} />
      ) : list.length === 0 ? (
        <SectionEmpty
          title="No stakeholders recorded"
          description="People linked to this account as a decision maker, influencer or buying-committee member will show up here."
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border-light">
          {list.map((person) => (
            <li
              key={person.id}
              className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-text">{person.name}</span>
                  {person.role && (
                    <span className="rounded-full bg-background-secondary px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                      {person.role}
                    </span>
                  )}
                  {person.influence && (
                    <span className="text-[11px] uppercase tracking-wide text-text-muted">
                      {INFLUENCE_LABELS[person.influence] ?? person.influence}
                    </span>
                  )}
                  <ProvenanceBadge provenance={person.provenance} />
                </div>
                {(person.title || person.email) && (
                  <div className="mt-0.5 truncate text-xs text-text-secondary">
                    {[person.title, person.email].filter(Boolean).join(" · ")}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
