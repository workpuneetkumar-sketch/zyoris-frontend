"use client";

import { useAuth } from "@/context/AuthContext";
import { DataIngestionSection } from "@/components/dashboard/compoents/DataIngestionSection";
import { Brain, Cpu, Database, Network } from "lucide-react";

export default function AiInsightsPage() {
  const { token } = useAuth();

  if (!token) return null;

  return (
    <div className="space-y-8 max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-primary/10 backdrop-blur-xl border border-primary/20 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
              <Brain size={20} className="text-primary animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text tracking-tight">AI Insights & Data Ingestion</h1>
              <p className="text-xs text-text-muted mt-0.5">
                Upload business data, run analytical modeling, and evaluate system-wide data sanity checks.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid containing status stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-primary/5 backdrop-blur-xl border border-primary/15 text-text rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-text-muted">AI Engine</p>
            <div className="p-1.5 bg-primary/10 border border-primary/20 rounded-lg">
              <Cpu size={14} className="text-primary" />
            </div>
          </div>
          <p className="text-xl font-bold text-text">Active & Calibrated</p>
          <p className="text-xs text-text-secondary mt-1 leading-relaxed">
            Time-series revenue forecasting models are fully trained on current transaction matrices.
          </p>
        </div>

        <div className="bg-primary/5 backdrop-blur-xl border border-primary/15 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-text-muted">Warehouse Status</p>
            <div className="p-1.5 bg-primary/10 border border-primary/20 rounded-lg">
              <Database size={14} className="text-primary" />
            </div>
          </div>
          <p className="text-xl font-bold text-text">Synchronized</p>
          <p className="text-xs text-text-secondary mt-1 leading-relaxed">
            Data lake tables containing leads, pipeline stages, and expenses are fully indexed.
          </p>
        </div>

        <div className="bg-primary/5 backdrop-blur-xl border border-primary/15 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-text-muted">Integrations</p>
            <div className="p-1.5 bg-primary/10 border border-primary/20 rounded-lg">
              <Network size={14} className="text-primary" />
            </div>
          </div>
          <p className="text-xl font-bold text-text">2 Sync Protocols</p>
          <p className="text-xs text-text-secondary mt-1 leading-relaxed">
            Ingestion streams accept live REST webhooks and formatted XLSX/CSV uploads.
          </p>
        </div>
      </div>

      {/* Main Data Ingestion Section */}
      <DataIngestionSection token={token} />
    </div>
  );
}
