"use client";

// components/customers/Customer360Skeleton.tsx
// Full-page loading state for /customers/:id (used by the route loading.tsx and
// while the client hook re-fetches the canonical summary).

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="mb-4 h-4 w-40 animate-pulse rounded bg-background-tertiary" />
      <div className="space-y-2.5">
        <div className="h-3 w-full animate-pulse rounded bg-background-tertiary" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-background-tertiary" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-background-tertiary" />
      </div>
    </div>
  );
}

export function Customer360Skeleton() {
  return (
    <div className="flex flex-col gap-6 pb-16" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 animate-pulse rounded-xl bg-background-tertiary" />
        <div className="h-10 w-10 animate-pulse rounded-xl bg-background-tertiary" />
        <div className="space-y-2">
          <div className="h-5 w-52 animate-pulse rounded bg-background-tertiary" />
          <div className="h-3 w-32 animate-pulse rounded bg-background-tertiary" />
        </div>
      </div>
      <div className="h-9 w-full animate-pulse rounded-xl bg-background-tertiary" />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="flex flex-col gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <div className="flex flex-col gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    </div>
  );
}
