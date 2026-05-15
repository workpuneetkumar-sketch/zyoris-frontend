"use client";

import { useEffect, useState } from "react";
import { getIngestionSummaryApi, getLastAnalysisApi, triggerIngestionApi } from "@/lib/api/ingestionApi";
import { UploadPanel } from "../../../components/UploadPanel";
import { UploadCloud, RefreshCw, Database, TrendingUp, Package, DollarSign } from "lucide-react";

export default function IngestionPage() {
    const [summary, setSummary] = useState<any>(null);
    const [analysis, setAnalysis] = useState<any>(null);
    const [triggering, setTriggering] = useState(false);
    const [triggerMsg, setTriggerMsg] = useState<string | null>(null);

    useEffect(() => {
        getIngestionSummaryApi().then(setSummary).catch(console.error);
        getLastAnalysisApi().then(setAnalysis).catch(console.error);
    }, []);

    async function handleTrigger() {
        setTriggering(true);
        setTriggerMsg(null);
        try {
            await triggerIngestionApi();
            setTriggerMsg("Ingestion run triggered successfully.");
            // refresh summary
            const updated = await getIngestionSummaryApi();
            setSummary(updated);
        } catch {
            setTriggerMsg("Failed to trigger ingestion.");
        } finally {
            setTriggering(false);
        }
    }

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-gray-800">Data Ingestion</h1>
                    <p className="text-sm text-gray-400 mt-0.5">Upload or trigger data ingestion for your organization</p>
                </div>
                <button
                    onClick={handleTrigger}
                    disabled={triggering}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
                    style={{ background: "linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%)" }}
                >
                    <RefreshCw size={14} className={triggering ? "animate-spin" : ""} />
                    {triggering ? "Running..." : "Trigger Ingestion"}
                </button>
            </div>

            {/* Trigger message */}
            {triggerMsg && (
                <p className="text-sm text-blue-600 font-medium">{triggerMsg}</p>
            )}

            {/* Summary cards */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: "Leads", value: summary.leads ?? 0, icon: TrendingUp, color: "#3B82F6" },
                        { label: "Deals", value: summary.deals ?? 0, icon: DollarSign, color: "#10B981" },
                        { label: "Expenses", value: summary.expenses ?? 0, icon: Database, color: "#F59E0B" },
                        { label: "Inventory", value: summary.inventory ?? 0, icon: Package, color: "#8B5CF6" },
                    ].map((card) => (
                        <div key={card.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${card.color}15` }}>
                                    <card.icon size={16} style={{ color: card.color }} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">{card.label}</p>
                                    <p className="text-lg font-bold text-gray-800">{card.value.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Upload panel */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <UploadCloud size={15} className="text-blue-500" />
                    Upload CSV / Excel
                </h2>
                <UploadPanel onAnalysis={setAnalysis} />
            </div>

            {/* Last analysis */}
            {analysis && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h2 className="text-sm font-semibold text-gray-700 mb-3">Last Upload Analysis</h2>
                    <pre className="text-xs text-gray-500 bg-gray-50 rounded-xl p-4 overflow-auto">
                        {JSON.stringify(analysis, null, 2)}
                    </pre>
                </div>
            )}

        </div>
    );
}