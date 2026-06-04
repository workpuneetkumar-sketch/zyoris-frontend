// app/(dashboard)/deals/page.tsx
"use client";

import { DealsUI } from "@/components/deals/DealsUI";
import { useDeals } from "@/hooks/useDeals";

export default function DealsPage() {
  const {
    deals,
    dealsByStage,
    loading,
    error,
    filters,
    totalPipeline,
    avgDealSize,
    winRate,
    conversionRate,
    handleFiltersChange,
    updateDealStage,
    retry,
  } = useDeals();

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-red-500 text-sm">{error}</p>
        <button
          onClick={retry}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <DealsUI
      deals={deals}
      dealsByStage={dealsByStage}
      loading={loading}
      filters={filters}
      totalPipeline={totalPipeline}
      avgDealSize={avgDealSize}
      winRate={winRate}
      conversionRate={conversionRate}
      onFiltersChange={handleFiltersChange}
      onStageChange={updateDealStage}
    />
  );
}
