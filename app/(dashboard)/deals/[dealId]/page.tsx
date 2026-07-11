"use client";

import { useParams, useRouter, notFound } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { fetchDealById } from "@/lib/api/dealsApi";
import { Deal } from "@/types/deals";
import { DealDetail } from "@/components/deals/DealDetail";
import { ArrowLeft } from "lucide-react";

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dealId = params?.dealId as string;

  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDeal = useCallback(async () => {
    if (!dealId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await fetchDealById(dealId);
      setDeal(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch deal details"
      );
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    loadDeal();
  }, [loadDeal]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm font-medium">Loading deal details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 p-6 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500">
          <ArrowLeft size={32} />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-gray-900">Error Loading Deal</h2>
          <p className="text-gray-500 max-w-xs mx-auto">{error}</p>
        </div>
        <button
          onClick={() => router.back()}
          className="px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!deal) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      {/* Header with back button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm active:scale-95"
            title="Go back"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div className="space-y-0.5">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">{deal.name}</h1>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{deal.dealId}</p>
          </div>
        </div>
      </div>

      {/* Deal detail component */}
      <DealDetail deal={deal} onUpdate={loadDeal} />
    </div>
  );
}
