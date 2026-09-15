import React from "react";

export function IntegrationSkeleton() {
  return (
    <div className="w-full space-y-6 animate-pulse" aria-busy="true">
      {/* Stats Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 rounded-xl border border-border bg-surface flex items-center justify-between"
          >
            <div className="space-y-2">
              <div className="h-3 w-20 bg-surface-active rounded" />
              <div className="h-6 w-12 bg-surface-active rounded font-bold" />
            </div>
            <div className="w-10 h-10 rounded-lg bg-surface-active" />
          </div>
        ))}
      </div>

      {/* Filter Tabs Skeleton */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex gap-2 flex-wrap">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="h-8 w-20 bg-surface-active rounded-full"
            />
          ))}
        </div>
        <div className="h-10 w-full sm:w-64 bg-surface-active rounded-lg" />
      </div>

      {/* Card Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-surface p-5 space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-xl bg-surface-active" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-28 bg-surface-active rounded" />
                    <div className="h-3 w-16 bg-surface-active rounded" />
                  </div>
                </div>
                <div className="h-6 w-20 bg-surface-active rounded-full" />
              </div>
              <div className="h-3 w-full bg-surface-active rounded" />
              <div className="h-3 w-4/5 bg-surface-active rounded" />
              <div className="flex gap-1.5 pt-2">
                <div className="h-5 w-16 bg-surface-active rounded" />
                <div className="h-5 w-20 bg-surface-active rounded" />
              </div>
            </div>
            <div className="pt-4 border-t border-border flex items-center justify-between">
              <div className="h-4 w-24 bg-surface-active rounded" />
              <div className="h-8 w-24 bg-surface-active rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
