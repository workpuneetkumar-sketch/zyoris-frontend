"use client";

// components/customers/Customer360Page.tsx
// Client shell for /customers/:id.
//
// Data flow:
//   • useCustomer360(id) fetches every frozen contract independently — canonical
//     summary (Sakshi), graph (Manish), stakeholders (Manish, keyed by
//     companyId) and AI communication intelligence (Ayush, keyed by leadId).
//   • The summary gates the whole page — a 404 renders notFound(), any other
//     failure renders a full-page error with retry, and while it loads we show
//     a page skeleton.
//   • Every section below is a self-contained component with a stable id/anchor
//     and owns its own loading / error / empty state.
//   • Products / Financials / Service have no frozen customer-scoped contract
//     yet (see PR description) — they render an explicit "not available" state.

import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, Edit3, Mail, Phone } from "lucide-react";
import { useCustomer360 } from "@/hooks/useCustomer360";
import { CustomerApiError } from "@/lib/api/customersApi";
import type { CanonicalCustomer } from "@/types/customers";
import { LIFECYCLE_STATE_LABELS, CANONICAL_TYPE_LABELS } from "@/types/customers";
import { ProvenanceBadge } from "./ProvenanceBadge";
import { Customer360Skeleton } from "./Customer360Skeleton";
import { Customer360ErrorState, Customer360NotFound } from "./Customer360States";
import { ContextSummarySection } from "./sections/ContextSummarySection";
import { TimelineSection } from "./sections/TimelineSection";
import { GraphSection } from "./sections/GraphSection";
import { HealthSection } from "./sections/HealthSection";
import { StakeholdersSection } from "./sections/StakeholdersSection";
import { ProductsSection } from "./sections/ProductsSection";
import { FinancialsSection } from "./sections/FinancialsSection";
import { ServiceSection } from "./sections/ServiceSection";
import { AiInsightsSection } from "./sections/AiInsightsSection";

const SECTION_NAV = [
  { id: "context", label: "Context" },
  { id: "timeline", label: "Timeline" },
  { id: "graph", label: "Graph" },
  { id: "health", label: "Health" },
  { id: "stakeholders", label: "Stakeholders" },
  { id: "products", label: "Products" },
  { id: "financials", label: "Financials" },
  { id: "service", label: "Service" },
  { id: "ai-insights", label: "AI Insights" },
];

export function Customer360Page({
  customerId,
  onRequestEdit,
  canonicalCustomer,
}: {
  customerId: string;
  onRequestEdit?: () => void;
  canonicalCustomer?: CanonicalCustomer | null;
}) {
  const router = useRouter();
  const { summary, graph, stakeholders, intelligence } = useCustomer360(customerId);

  if (summary.loading) {
    return <Customer360Skeleton />;
  }

  if (summary.error) {
    const err = summary.error;
    if (err instanceof CustomerApiError && err.isNotFound) {
      return <Customer360NotFound onBack={() => router.back()} />;
    }
    return (
      <Customer360ErrorState
        message={err.message}
        onRetry={summary.reload}
        onBack={() => router.back()}
      />
    );
  }

  const customer = summary.data;
  if (!customer) {
    return <Customer360NotFound onBack={() => router.back()} />;
  }

  const lifecycleState = customer.lifecycleState ?? canonicalCustomer?.lifecycleState ?? null;
  const canonicalType = customer.canonicalType ?? canonicalCustomer?.canonicalType ?? null;
  const lifecycleLabel = lifecycleState
    ? LIFECYCLE_STATE_LABELS[lifecycleState] ?? lifecycleState
    : null;
  const typeLabel = canonicalType
    ? CANONICAL_TYPE_LABELS[canonicalType] ?? canonicalType
    : null;

  const hasCompany = Boolean(customer.companyId);
  const hasLead = Boolean(customer.leadId);

  return (
    <div className="flex flex-col gap-6 pb-16">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            title="Go back"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-text-secondary hover:bg-surface-hover"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background-secondary text-text-muted">
              <Building2 size={18} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-text">{customer.name}</h1>
                {customer.provenance ? (
                  <ProvenanceBadge provenance={customer.provenance} />
                ) : null}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
                {typeLabel && (
                  <span className="rounded-full bg-background-secondary px-2 py-0.5 font-semibold">
                    {typeLabel}
                  </span>
                )}
                {lifecycleLabel && (
                  <span className="rounded-full bg-background-secondary px-2 py-0.5 font-semibold capitalize">
                    {lifecycleLabel}
                  </span>
                )}
                {customer.email && (
                  <a
                    href={`mailto:${customer.email}`}
                    className="inline-flex items-center gap-1 hover:text-text"
                  >
                    <Mail size={12} />
                    <span className="truncate">{customer.email}</span>
                  </a>
                )}
                {customer.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone size={12} />
                    {customer.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        {onRequestEdit && (
          <button
            type="button"
            onClick={onRequestEdit}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-dark"
          >
            <Edit3 size={14} /> Edit
          </button>
        )}
      </header>

      {/* Section nav */}
      <nav className="sticky top-0 z-10 -mx-1 flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface/90 p-1 backdrop-blur">
        {SECTION_NAV.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-surface-hover hover:text-text"
          >
            {s.label}
          </a>
        ))}
      </nav>

      {/* Sections — stable boundaries, ordered per the spec */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="flex flex-col gap-6">
          <ContextSummarySection customer={customer} />
          <HealthSection intelligence={intelligence} hasLead={hasLead} />
          <StakeholdersSection resource={stakeholders} hasCompany={hasCompany} />
          <ProductsSection />
          <FinancialsSection />
          <ServiceSection />
        </div>
        <div className="flex flex-col gap-6">
          <TimelineSection customerId={customer.id} />
          <GraphSection graph={graph} />
          <AiInsightsSection intelligence={intelligence} hasLead={hasLead} />
        </div>
      </div>
    </div>
  );
}
