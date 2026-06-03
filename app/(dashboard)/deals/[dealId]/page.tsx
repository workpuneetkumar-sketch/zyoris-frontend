"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchDealById } from "@/lib/api/dealsApi";
import { Deal } from "@/types/deals";
import { DealDetail } from "@/components/deals/DealDetail";
import { ArrowLeft } from "lucide-react";

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dealId = params.dealId as string;

  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDeal = async () => {
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
    };

    if (dealId) {
      loadDeal();
    }
  }, [dealId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading deal details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-red-500">{error}</div>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-gray-500">Deal not found</div>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header with back button */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Go back"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{deal.name}</h1>
      </div>

      {/* Deal detail component */}
      <DealDetail deal={deal} />
    </div>
  );
}
