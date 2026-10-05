"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { isIngestionAuthorized } from "@/lib/api/leadIngestionApi";
import { LeadIngestionWorkbench } from "@/components/leads/ingestion/LeadIngestionWorkbench";

export default function IngestionDashboardPage() {
  const { user, isInitializing, permissionsLoaded, hasPermission } = useAuth();
  const router = useRouter();

  const isAuthorized = isIngestionAuthorized(user, hasPermission);

  useEffect(() => {
    if (isInitializing || !permissionsLoaded) return;
    if (!isAuthorized) {
      router.replace("/leads");
    }
  }, [isInitializing, permissionsLoaded, isAuthorized, router]);

  if (isInitializing || !permissionsLoaded) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="p-6 max-w-xl mx-auto my-12 text-center bg-white rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
          <ShieldAlert size={24} />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Access Restricted</h2>
        <p className="text-sm text-gray-500">
          You don't have access to this tool. Normal CRM users should use the standard lead workflow.
        </p>
        <div className="pt-2">
          <Link
            href="/leads"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
          >
            <ArrowLeft size={16} />
            Return to Leads
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <LeadIngestionWorkbench />
    </div>
  );
}
