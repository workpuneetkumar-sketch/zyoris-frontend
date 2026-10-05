"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";

export default function ExecutionDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ExecutionDetail] Failed to render execution details:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <AlertCircle size={48} className="mb-4 text-[color:var(--color-error)]" />
      <h2 className="mb-2 text-lg font-bold text-[color:var(--color-text)]">
        Unable to Show Execution
      </h2>
      <p className="mb-6 max-w-md text-sm text-[color:var(--color-text-secondary)]">
        We couldn't display this execution right now. Please try again or return to the Execution Ledger.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-xl bg-[color:var(--color-primary)] px-4 py-2 text-sm font-semibold text-[color:var(--color-primary-foreground)] transition-all hover:bg-[color:var(--color-primary-dark)]"
        >
          <RefreshCw size={14} /> Try again
        </button>
        <Link
          href="/executions"
          className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-2 text-sm font-semibold text-[color:var(--color-text-secondary)] transition-all hover:bg-[color:var(--color-surface-hover)]"
        >
          <ArrowLeft size={14} /> Execution Ledger
        </Link>
      </div>
    </div>
  );
}
