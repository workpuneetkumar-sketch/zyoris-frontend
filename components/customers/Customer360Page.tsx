"use client";

// components/customers/Customer360Page.tsx
// Client shell for /customers/:id.
//
// Data flow:
//   • useCustomer360(id) fetches the canonical summary (Sakshi) and the graph
//     (Manish) independently.
//   • The summary gates the whole page — a 404 renders notFound(), any other
//     failure renders a full-page error with retry, and while it loads we show
//     a page skeleton.
//   • Every section below is a self-contained component with a stable id/anchor;
//     graph and timeline own their loading / error / empty state internally.

import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, ExternalLink } from "lucide-react";
import { useCustomer360 } from "@/hooks/useCustomer360";
import { CustomerApiError } from "@/lib/api/customersApi";
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

export function Customer360Page({ customerId }: { customerId: string }) {
  const router = useRouter();
  const { summary, graph } = useCustomer360(customerId);

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
            {customer.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={customer.logoUrl}
                alt=""
                className="mt-0.5 h-10 w-10 rounded-xl border border-border-light object-cover"
              />
            ) : (
              <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-background-secondary text-text-muted">
                <Building2 size={18} />
              </span>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-text">{customer.name}</h1>
                {customer.provenance ? (
                  <ProvenanceBadge provenance={customer.provenance} />
                ) : null}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                {customer.accountNumber && <span>#{customer.accountNumber}</span>}
                {customer.status && (
                  <span className="rounded-full bg-background-secondary px-2 py-0.5 font-semibold capitalize">
                    {customer.status}
                  </span>
                )}
                {customer.website && (
                  <a
                    href={customer.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:text-text"
                  >
                    {customer.website.replace(/^https?:\/\//, "")}
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
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
          <HealthSection health={customer.health} />
          <StakeholdersSection stakeholders={customer.stakeholders} />
          <ProductsSection products={customer.products} />
          <FinancialsSection financials={customer.financials} />
          <ServiceSection service={customer.service} />
        </div>
        <div className="flex flex-col gap-6">
          <TimelineSection customerId={customer.id} />
          <GraphSection graph={graph} />
          <AiInsightsSection insights={customer.aiInsights} />
        </div>
      </div>
    </div>
  );
}
