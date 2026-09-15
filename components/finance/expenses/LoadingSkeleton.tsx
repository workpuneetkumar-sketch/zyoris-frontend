// components/finance/LoadingSkeleton.tsx
export default function LoadingSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header Skeleton */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="animate-pulse flex items-center justify-between">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
          <div className="flex gap-2">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24" />
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24" />
          </div>
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {/* Table Header */}
          <div className="flex gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/5" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/5" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/5" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/5" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/5" />
          </div>

          {/* Table Rows */}
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/5" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/5" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/5" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/5" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}