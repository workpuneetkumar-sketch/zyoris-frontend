"use client";

/**
 * components/agents/EvidenceModal.tsx
 * ─────────────────────────────────────────────────────────────
 * Standalone evidence / source viewer modal.
 *
 * Extracted from the inline EvidenceDrawer inside AgentResultModal.tsx
 * and promoted to a named export so all five Day 6 surfaces can import
 * it without re-implementing evidence display.
 *
 * Rules:
 * - This component NEVER invents evidence — it renders exactly what
 *   was passed in.
 * - All colors via CSS variable tokens only.
 * - If called with an empty items array it renders an explicit empty
 *   state (the callers guard against this, but we are defensive).
 */

import { Modal } from "@/components/ui/Modal";
import classNames from "classnames";
import { BookOpen, ExternalLink, FileText } from "lucide-react";
import type { AgentEvidenceItem } from "@/lib/api/agentApi";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** All evidence items to display */
  items: AgentEvidenceItem[];
  /** Optional plain-string source labels (from AgentExecuteOutput.sources) */
  sources?: string[];
  /** Modal title — defaults to "Evidence & Sources" */
  title?: string;
}

// ─── Evidence row ─────────────────────────────────────────────────────────────

function EvidenceRow({
  item,
  index,
}: {
  item: string | AgentEvidenceItem;
  index: number;
}) {
  const isString = typeof item === "string";
  const label = isString
    ? item
    : (item.label ?? item.source ?? `Source ${index + 1}`);
  const snippet = isString ? undefined : item.snippet;
  const url = isString ? undefined : item.url;
  const source = isString ? undefined : item.source;

  return (
    <div
      className={classNames(
        "flex items-start gap-3 p-3 rounded-xl border",
        "bg-[color:var(--color-background-secondary)] border-[color:var(--color-border-light)]"
      )}
    >
      {/* Icon */}
      <div className="w-7 h-7 rounded-lg bg-[color:var(--color-info-light)] flex items-center justify-center shrink-0 mt-0.5">
        <BookOpen size={13} className="text-[color:var(--color-info)]" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-[color:var(--color-primary)] hover:underline flex items-center gap-1 leading-snug"
            >
              {label}
              <ExternalLink size={11} className="shrink-0" />
            </a>
          ) : (
            <p className="text-sm font-semibold text-[color:var(--color-text)] leading-snug">
              {label}
            </p>
          )}
        </div>

        {source && !isString && (
          <p className="text-[10px] text-[color:var(--color-text-muted)] mt-0.5 font-medium uppercase tracking-wide">
            {source}
          </p>
        )}

        {snippet && (
          <p className="text-xs text-[color:var(--color-text-secondary)] mt-1.5 leading-relaxed">
            {snippet}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EvidenceModal({
  isOpen,
  onClose,
  items,
  sources = [],
  title = "Evidence & Sources",
}: EvidenceModalProps) {
  const combined: (string | AgentEvidenceItem)[] = [
    ...sources,
    ...items,
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={
        combined.length > 0
          ? `${combined.length} source${combined.length !== 1 ? "s" : ""} referenced by this result`
          : undefined
      }
      className="max-w-xl"
    >
      {combined.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
          <div className="w-12 h-12 bg-[color:var(--color-background-secondary)] rounded-2xl flex items-center justify-center">
            <FileText size={22} className="text-[color:var(--color-text-muted)]" />
          </div>
          <p className="text-sm font-semibold text-[color:var(--color-text)]">
            No evidence recorded
          </p>
          <p className="text-xs text-[color:var(--color-text-muted)] max-w-xs">
            This result did not include any source references.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {combined.map((item, i) => (
            <EvidenceRow key={i} item={item} index={i} />
          ))}
        </div>
      )}
    </Modal>
  );
}
