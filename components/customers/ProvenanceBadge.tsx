"use client";

// components/customers/ProvenanceBadge.tsx
// Platform Team alignment rule: every Customer 360 fact that the backend
// attributes to a source must expose that provenance in the UI.
//
// Render this next to any value that carries a `Provenance`. It is deliberately
// unobtrusive (a small "source" chip) and reveals the full attribution —
// system, channel, confidence, external id, sync time — on hover/focus.

import { useId, useState } from "react";
import { ShieldCheck } from "lucide-react";
import type { Provenance } from "@/types/customer360";

function formatConfidence(confidence?: number | null): string | null {
  if (confidence == null || Number.isNaN(confidence)) return null;
  const pct = confidence <= 1 ? confidence * 100 : confidence;
  return `${Math.round(pct)}% confidence`;
}

function formatObservedAt(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `Synced ${d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

export function ProvenanceBadge({
  provenance,
  className = "",
}: {
  provenance?: Provenance | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  if (!provenance || !provenance.source) return null;

  const rows = [
    ["Source", provenance.source],
    ["Channel", provenance.channel ?? null],
    ["Trust", formatConfidence(provenance.confidence)],
    ["External ID", provenance.externalId ?? null],
    ["Last sync", formatObservedAt(provenance.observedAt)],
  ].filter(([, v]) => Boolean(v)) as [string, string][];

  return (
    <span className={`relative inline-flex ${className}`}>
      <button
        type="button"
        aria-label={`Source: ${provenance.source}`}
        aria-describedby={open ? tooltipId : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex items-center gap-1 rounded-full border border-border bg-background-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted hover:text-text"
      >
        <ShieldCheck size={11} />
        {provenance.source}
      </button>

      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute left-0 top-full z-20 mt-1.5 w-56 rounded-lg border border-border bg-surface p-3 text-left shadow-lg"
        >
          <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-text-muted">
            Provenance
          </span>
          <span className="flex flex-col gap-1">
            {rows.map(([label, value]) => (
              <span key={label} className="flex justify-between gap-3 text-[11px]">
                <span className="text-text-secondary">{label}</span>
                <span className="max-w-[60%] truncate font-medium text-text" title={value}>
                  {value}
                </span>
              </span>
            ))}
          </span>
        </span>
      )}
    </span>
  );
}
