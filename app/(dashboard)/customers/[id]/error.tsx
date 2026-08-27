"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

export default function CustomerDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Customer 360 page error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md rounded-2xl border border-error-light bg-surface p-8 text-center shadow-sm">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-error" />
        <h2 className="mb-2 text-lg font-bold text-text">Something went wrong</h2>
        <p className="mb-4 text-sm text-text-secondary">
          {error.message || "The Customer 360 page failed to render."}
        </p>
        <button
          onClick={reset}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-dark"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
