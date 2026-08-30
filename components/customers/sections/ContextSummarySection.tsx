"use client";

import { LayoutDashboard } from "lucide-react";
import type { CustomerSummary } from "@/types/customer360";
import { CANONICAL_TYPE_LABELS, LIFECYCLE_STATE_LABELS } from "@/types/customers";
import { SectionCard } from "../SectionCard";
import { Field, formatDate } from "../primitives";
import { ProvenanceBadge } from "../ProvenanceBadge";

/**
 * Canonical account facts from GET /api/customers/:id. The frozen contract
 * returns the canonical record only, so every value here comes straight off that
 * record — no derived or placeholder fields.
 */
export function ContextSummarySection({ customer }: { customer: CustomerSummary }) {
  return (
    <SectionCard
      id="context"
      title="Context Summary"
      icon={LayoutDashboard}
      description="Canonical account facts from the customer record"
      action={customer.provenance ? <ProvenanceBadge provenance={customer.provenance} /> : undefined}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field
          label="Lifecycle state"
          value={
            customer.lifecycleState
              ? LIFECYCLE_STATE_LABELS[customer.lifecycleState] ?? customer.lifecycleState
              : null
          }
        />
        <Field
          label="Type"
          value={
            customer.canonicalType
              ? CANONICAL_TYPE_LABELS[customer.canonicalType] ?? customer.canonicalType
              : null
          }
        />
        <Field
          label="Account owner"
          value={customer.owner?.name ?? null}
        />
        <Field label="Email" value={customer.email ?? null} />
        <Field label="Phone" value={customer.phone ?? null} />
        <Field
          label="Source system"
          value={customer.externalSystem ?? null}
          provenance={customer.provenance}
        />
        <Field
          label="Customer since"
          value={customer.createdAt ? formatDate(customer.createdAt) : null}
        />
        <Field
          label="Last updated"
          value={customer.updatedAt ? formatDate(customer.updatedAt) : null}
        />
      </div>
    </SectionCard>
  );
}
