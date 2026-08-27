"use client";

import { CircleDollarSign } from "lucide-react";
import type { CustomerFinancials } from "@/types/customer360";
import { provenanceOf, unwrap } from "@/types/customer360";
import { SectionCard } from "../SectionCard";
import { SectionEmpty } from "../SectionStates";
import { StatTile, formatDate, formatMoney } from "../primitives";

export function FinancialsSection({
  financials,
}: {
  financials?: CustomerFinancials | null;
}) {
  const currency = financials?.currency ?? null;
  const arr = unwrap(financials?.arr ?? null);
  const mrr = unwrap(financials?.mrr ?? null);
  const ltv = unwrap(financials?.lifetimeValue ?? null);
  const open = unwrap(financials?.openInvoicesTotal ?? null);
  const overdue = unwrap(financials?.overdueInvoicesTotal ?? null);

  const hasContent =
    financials != null &&
    [arr, mrr, ltv, open, overdue, financials.lastPaymentAt, financials.nextRenewalDate].some(
      (v) => v != null
    );

  return (
    <SectionCard
      id="financials"
      title="Financials"
      icon={CircleDollarSign}
      description="Recurring revenue, invoices and renewals"
    >
      {!hasContent ? (
        <SectionEmpty
          title="No financial data linked"
          description="Revenue and invoice figures from billing will appear here once connected."
        />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatTile
              label="ARR"
              value={arr != null ? formatMoney(arr, currency) : null}
              provenance={provenanceOf(financials?.arr ?? null)}
            />
            <StatTile
              label="MRR"
              value={mrr != null ? formatMoney(mrr, currency) : null}
              provenance={provenanceOf(financials?.mrr ?? null)}
            />
            <StatTile
              label="Lifetime value"
              value={ltv != null ? formatMoney(ltv, currency) : null}
              provenance={provenanceOf(financials?.lifetimeValue ?? null)}
            />
            <StatTile
              label="Open invoices"
              value={open != null ? formatMoney(open, currency) : null}
              provenance={provenanceOf(financials?.openInvoicesTotal ?? null)}
            />
            <StatTile
              label="Overdue"
              value={overdue != null ? formatMoney(overdue, currency) : null}
              provenance={provenanceOf(financials?.overdueInvoicesTotal ?? null)}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-border-light p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                Last payment
              </div>
              <div className="mt-1 text-text">
                {financials?.lastPaymentAmount != null
                  ? formatMoney(financials.lastPaymentAmount, currency)
                  : "—"}
                <span className="text-text-secondary">
                  {financials?.lastPaymentAt ? ` on ${formatDate(financials.lastPaymentAt)}` : ""}
                </span>
              </div>
            </div>
            <div className="rounded-xl border border-border-light p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                Next renewal
              </div>
              <div className="mt-1 text-text">
                {financials?.nextRenewalDate ? formatDate(financials.nextRenewalDate) : "—"}
                <span className="text-text-secondary">
                  {financials?.nextRenewalAmount != null
                    ? ` · ${formatMoney(financials.nextRenewalAmount, currency)}`
                    : ""}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
