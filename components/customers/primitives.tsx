"use client";

// components/customers/primitives.tsx
// Tiny presentational helpers shared by the Customer 360 sections.

import type { Provenance } from "@/types/customer360";
import { ProvenanceBadge } from "./ProvenanceBadge";

/** A labelled value with an optional provenance chip. Renders "—" when empty. */
export function Field({
  label,
  value,
  provenance,
}: {
  label: string;
  value: React.ReactNode;
  provenance?: Provenance | null;
}) {
  const isEmpty =
    value == null || value === "" || (Array.isArray(value) && value.length === 0);

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
        {label}
      </span>
      <span className="flex flex-wrap items-center gap-1.5 text-sm text-text">
        <span className={isEmpty ? "text-text-muted" : undefined}>
          {isEmpty ? "—" : value}
        </span>
        {!isEmpty && provenance ? <ProvenanceBadge provenance={provenance} /> : null}
      </span>
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  provenance,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  provenance?: Provenance | null;
}) {
  const isEmpty = value == null || value === "";
  return (
    <div className="rounded-xl border border-border-light bg-background-secondary/60 p-3">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
          {label}
        </span>
        {!isEmpty && provenance ? <ProvenanceBadge provenance={provenance} /> : null}
      </div>
      <div className="mt-1 text-lg font-bold text-text">
        {isEmpty ? <span className="text-text-muted">—</span> : value}
      </div>
      {hint && <div className="mt-0.5 text-[11px] text-text-secondary">{hint}</div>}
    </div>
  );
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatMoney(amount?: number | null, currency?: string | null): string {
  if (amount == null || Number.isNaN(amount)) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()}`;
  }
}
