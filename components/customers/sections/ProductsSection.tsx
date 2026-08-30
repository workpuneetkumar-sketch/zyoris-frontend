"use client";

import { Package } from "lucide-react";
import { SectionCard } from "../SectionCard";
import { SectionUnavailable } from "../SectionStates";

/**
 * Products / subscriptions for a customer.
 *
 * No frozen Platform contract exists for this yet — the live API docs expose no
 * customer-scoped products/subscriptions endpoint and no product filter on the
 * deals endpoint. Tracked in the PR description; wire the moment a contract ships.
 */
export function ProductsSection() {
  return (
    <SectionCard
      id="products"
      title="Products"
      icon={Package}
      description="Subscriptions and entitlements held by this customer"
    >
      <SectionUnavailable
        title="Not available from the Platform API yet"
        description="There is no frozen customer-scoped products/subscriptions contract. This section is wired to render the moment one ships."
      />
    </SectionCard>
  );
}
