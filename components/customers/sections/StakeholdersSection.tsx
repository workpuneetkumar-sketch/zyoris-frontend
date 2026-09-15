"use client";

import { Users } from "lucide-react";
import type { CustomerStakeholder } from "@/types/customer360";
import { SectionCard } from "../SectionCard";
import { SectionEmpty } from "../SectionStates";
import { ProvenanceBadge } from "../ProvenanceBadge";
import { formatDate } from "../primitives";

const ROLE_LABELS: Record<string, string> = {
  champion: "Champion",
  economic_buyer: "Economic buyer",
  decision_maker: "Decision maker",
  influencer: "Influencer",
  user: "User",
  detractor: "Detractor",
};

const SENTIMENT_DOT: Record<string, string> = {
  positive: "bg-success",
  neutral: "bg-text-muted",
  negative: "bg-error",
};

export function StakeholdersSection({
  stakeholders,
}: {
  stakeholders?: CustomerStakeholder[];
}) {
  const list = stakeholders ?? [];

  return (
    <SectionCard
      id="stakeholders"
      title="Stakeholders"
      icon={Users}
      description="Key people in the account and their influence"
      action={
        list.length > 0 ? (
          <span className="text-xs font-semibold text-text-muted">{list.length}</span>
        ) : undefined
      }
    >
      {list.length === 0 ? (
        <SectionEmpty
          title="No stakeholders recorded"
          description="Contacts linked to this account with a defined role will show up here."
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border-light">
          {list.map((person) => (
            <li key={person.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  person.sentiment ? SENTIMENT_DOT[person.sentiment] : "bg-border"
                }`}
                title={person.sentiment ? `Sentiment: ${person.sentiment}` : undefined}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-text">{person.name}</span>
                  {person.role && (
                    <span className="rounded-full bg-background-secondary px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                      {ROLE_LABELS[person.role] ?? person.role}
                    </span>
                  )}
                  {person.influence && (
                    <span className="text-[11px] uppercase tracking-wide text-text-muted">
                      {person.influence} influence
                    </span>
                  )}
                  <ProvenanceBadge provenance={person.provenance} />
                </div>
                <div className="mt-0.5 truncate text-xs text-text-secondary">
                  {[person.title, person.email].filter(Boolean).join(" · ") || "—"}
                </div>
              </div>
              {person.lastInteractionAt && (
                <span className="text-[11px] text-text-muted">
                  Last contact {formatDate(person.lastInteractionAt)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
