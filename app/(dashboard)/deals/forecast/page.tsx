// app/(dashboard)/deals/forecast/page.tsx
"use client";

import { ForecastDashboard } from "@/components/deals/ForecastDashboard";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ForecastPage() {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <Link
          href="/deals"
          className="w-9 h-9 flex items-center justify-center bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-xs"
          title="Back to Deals"
        >
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Deals Forecast</h1>
          <p className="text-xs text-gray-400">Multi-currency rollups and historical snapshots</p>
        </div>
      </div>

      <ForecastDashboard />
    </div>
  );
}
