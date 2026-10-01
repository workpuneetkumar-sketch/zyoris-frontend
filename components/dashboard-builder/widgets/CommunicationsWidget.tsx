"use client";
// components/dashboard-builder/widgets/CommunicationsWidget.tsx
// Real data: GET /dashboard/stats (emailsSent, callsToday) via useDashboardStats.
// Mock CHANNELS (Email 284/70%, Calls 142/69%, WhatsApp 97/83%) removed entirely.
// WhatsApp count is NOT in /dashboard/stats — that card is shown only when data exists.
// Reply rates are NOT returned by any backend endpoint — those percentages are omitted.

import { RefreshCw, AlertCircle, Mail, Phone, MessageSquare } from "lucide-react";
import { useDashboardStats } from "@/hooks/useDashboard";

export function CommunicationsWidget({ isPreview }: { isPreview?: boolean }) {
  const { data: stats, loading, error, refetch } = useDashboardStats();

  if (loading) {
    return (
      <div className="h-full flex flex-col gap-3 animate-pulse">
        <div className="grid grid-cols-2 gap-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="text-center space-y-1">
              <div className="w-8 h-8 rounded-xl mx-auto bg-gray-100" />
              <div className="h-4 w-10 mx-auto bg-gray-200 rounded" />
              <div className="h-2.5 w-12 mx-auto bg-gray-100 rounded" />
            </div>
          ))}
        </div>
        <div className="flex-1 bg-gray-50 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 p-3 text-center">
        <AlertCircle size={20} className="text-red-400" />
        <p className="text-xs text-gray-500">{error}</p>
        <button onClick={refetch} className="flex items-center gap-1 text-xs text-indigo-600 hover:underline">
          <RefreshCw size={11} /> Retry
        </button>
      </div>
    );
  }

  const channels = [
    { name: "Email",    value: stats?.emailsSent ?? 0,  icon: Mail,           color: "#3b82f6" },
    { name: "Calls",    value: stats?.callsToday ?? 0,  icon: Phone,          color: "#10b981" },
  ].filter((c) => c.value > 0 || !stats);  // show all when data not yet loaded

  const hasData = channels.some((c) => c.value > 0);

  if (!hasData && stats) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-1 p-3 text-center">
        <MessageSquare size={20} className="text-gray-300" />
        <p className="text-xs text-gray-400">No communication activity today</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      <div className="grid grid-cols-2 gap-2">
        {channels.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.name} className="text-center">
              <div className="w-8 h-8 rounded-xl mx-auto flex items-center justify-center mb-1"
                style={{ backgroundColor: c.color + "18" }}>
                <Icon size={14} style={{ color: c.color }} />
              </div>
              <p className="text-sm font-extrabold text-gray-900">{c.value.toLocaleString()}</p>
              <p className="text-[9px] text-gray-400">{c.name}</p>
            </div>
          );
        })}
      </div>

      {/* Total communications summary */}
      <div className="flex-1 flex flex-col justify-center gap-2 pt-1">
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">Today's Activity</p>
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Emails sent</span>
            <span className="font-bold text-blue-600">{(stats?.emailsSent ?? 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className="text-gray-600">Calls made</span>
            <span className="font-bold text-emerald-600">{(stats?.callsToday ?? 0).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
