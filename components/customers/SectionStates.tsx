"use client";

// components/customers/SectionStates.tsx
// Shared loading / error / empty primitives for Customer 360 sections.
// Every section renders exactly one of: loading, error, empty, or content.

import { AlertCircle, Inbox, Loader2, RefreshCw } from "lucide-react";

export function SectionLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2.5 py-8 text-sm text-text-secondary" role="status" aria-live="polite">
      <Loader2 size={16} className="animate-spin text-primary" />
      <span>{label}</span>
    </div>
  );
}

export function SectionError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className="flex flex-col items-start gap-3 rounded-xl border border-error-light bg-error-light/30 p-4"
      role="alert"
    >
      <div className="flex items-start gap-2.5 text-sm text-text">
        <AlertCircle size={16} className="mt-0.5 shrink-0 text-error" />
        <span>{message}</span>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text hover:bg-surface-hover"
        >
          <RefreshCw size={13} />
          Try again
        </button>
      )}
    </div>
  );
}

export function SectionEmpty({
  title = "Nothing to show yet",
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <div className="rounded-full bg-background-secondary p-3">
        <Inbox size={20} className="text-text-muted" />
      </div>
      <p className="text-sm font-medium text-text">{title}</p>
      {description && <p className="max-w-xs text-xs text-text-secondary">{description}</p>}
    </div>
  );
}
