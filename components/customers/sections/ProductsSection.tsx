"use client";

import { Package } from "lucide-react";
import type { CustomerProduct } from "@/types/customer360";
import { SectionCard } from "../SectionCard";
import { SectionEmpty } from "../SectionStates";
import { ProvenanceBadge } from "../ProvenanceBadge";
import { formatDate } from "../primitives";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-success-light text-success-foreground",
  trial: "bg-info-light text-info-foreground",
  pending: "bg-warning-light text-warning-foreground",
  expired: "bg-background-secondary text-text-secondary",
  cancelled: "bg-error-light text-error-foreground",
};

export function ProductsSection({ products }: { products?: CustomerProduct[] }) {
  const list = products ?? [];

  return (
    <SectionCard
      id="products"
      title="Products"
      icon={Package}
      description="Subscriptions and entitlements held by this customer"
      action={
        list.length > 0 ? (
          <span className="text-xs font-semibold text-text-muted">{list.length}</span>
        ) : undefined
      }
    >
      {list.length === 0 ? (
        <SectionEmpty
          title="No products on this account"
          description="Active subscriptions and entitlements from billing will appear here."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-text-muted">
                <th className="pb-2 pr-4 font-semibold">Product</th>
                <th className="pb-2 pr-4 font-semibold">Status</th>
                <th className="pb-2 pr-4 font-semibold">Seats</th>
                <th className="pb-2 pr-4 font-semibold">Renews</th>
                <th className="pb-2 font-semibold">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {list.map((product) => (
                <tr key={product.id}>
                  <td className="py-2.5 pr-4">
                    <div className="font-medium text-text">{product.name}</div>
                    {product.sku && (
                      <div className="text-[11px] text-text-muted">{product.sku}</div>
                    )}
                  </td>
                  <td className="py-2.5 pr-4">
                    {product.status ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${
                          STATUS_STYLES[product.status] ?? STATUS_STYLES.expired
                        }`}
                      >
                        {product.status}
                      </span>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-text-secondary">{product.seats ?? "—"}</td>
                  <td className="py-2.5 pr-4 text-text-secondary">
                    {product.renewalDate ? formatDate(product.renewalDate) : "—"}
                  </td>
                  <td className="py-2.5">
                    {product.provenance ? (
                      <ProvenanceBadge provenance={product.provenance} />
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
