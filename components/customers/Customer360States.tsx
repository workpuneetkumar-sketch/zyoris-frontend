"use client";

// components/customers/Customer360States.tsx
// Full-page error / not-found states for /customers/:id.

import { AlertCircle, ArrowLeft, SearchX } from "lucide-react";

export function Customer360ErrorState({
  message,
  onRetry,
  onBack,
}: {
  message: string;
  onRetry: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-error-light text-error">
        <AlertCircle size={30} />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-text">Couldn&apos;t load this customer</h2>
        <p className="mx-auto max-w-sm text-sm text-text-secondary">{message}</p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-text hover:bg-surface-hover"
        >
          <ArrowLeft size={15} />
          Back
        </button>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-dark"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export function Customer360NotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-background-secondary text-text-muted">
        <SearchX size={30} />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-text">Customer not found</h2>
        <p className="mx-auto max-w-sm text-sm text-text-secondary">
          This customer doesn&apos;t exist or you don&apos;t have access to it in this organization.
        </p>
      </div>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-text hover:bg-surface-hover"
      >
        <ArrowLeft size={15} />
        Go back
      </button>
    </div>
  );
}
