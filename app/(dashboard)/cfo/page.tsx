"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell } from "lucide-react";
import { CFOOverviewSection } from "@/components/dashboard/compoents/CFOOverviewSection";

export default function CfoDashboardPage() {
  const { user, token, isInitializing } = useAuth();
  const router = useRouter();
  const [dataChecked, setDataChecked] = useState(false);

  useEffect(() => {
    if (!isInitializing && user && user.role !== "CFO" && user.role !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [user, isInitializing, router]);

  useEffect(() => {
    if (token) setDataChecked(true);
  }, [token]);

  if (isInitializing || !user) return <div className="min-h-screen bg-[#f5f7fb]" />;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Financial Overview</h1>
          <p className="text-sm text-gray-400 mt-0.5">Portfolio margin health and spend efficiency.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 w-64 shadow-sm">
            <Search size={14} className="text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Search reports..."
              className="bg-transparent text-sm text-gray-600 outline-none w-full"
            />
          </div>
          <button className="relative p-2.5 rounded-xl bg-white border border-gray-200 shadow-sm text-gray-500 hover:text-gray-700">
            <Bell size={17} />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full ring-1 ring-white" />
          </button>
          <div className="px-3 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-blue-100">
            CFO Console
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {dataChecked ? (
          <CFOOverviewSection token={token!} />
        ) : (
          <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-32 bg-gray-200 rounded-2xl" />
              <div className="h-32 bg-gray-200 rounded-2xl" />
              <div className="h-32 bg-gray-200 rounded-2xl" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
