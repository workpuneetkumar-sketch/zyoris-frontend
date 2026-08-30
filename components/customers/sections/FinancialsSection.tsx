"use client";

import { CircleDollarSign } from "lucide-react";
import { SectionCard } from "../SectionCard";
import { SectionUnavailable } from "../SectionStates";

/**
 * Recurring revenue, invoices and renewals for a customer.
 *
 * No frozen Platform contract exists for this yet — the live API docs expose no
 * customer-scoped financials endpoint, and /finance/invoices/get-invoices carries
 * no customer/company filter. Tracked in the PR description.
 */
export function FinancialsSection() {
  return (
    <SectionCard
      id="financials"
      title="Financials"
      icon={CircleDollarSign}
      description="Recurring revenue, invoices and renewals"
    >
      <SectionUnavailable
        title="Not available from the Platform API yet"
        description="There is no frozen customer-scoped financials contract. This section is wired to render the moment one ships."
      />
    </SectionCard>
  );
}
