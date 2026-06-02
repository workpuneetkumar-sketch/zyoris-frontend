import { useState, useEffect } from "react";
import api from "@/lib/api/api";
import { UploadPanel } from "@/components/UploadPanel";
import { UploadAnalysisSection } from "@/components/UploadAnalysisSection";
import { DataSenseReport } from "@/components/DataSenseReport";

export function DataIngestionSection({ token }: { token: string }) {
    const [analysis, setAnalysis] = useState<any>(null);

    useEffect(() => {
        // Safe check for previous analysis
        api.get("/ingestion/last-analysis")
            .then((res) => setAnalysis(res.data))
            .catch(() => console.log("New user state: No analysis found."));
    }, [token]);

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-1">Data Ingestion</h3>
                <p className="text-xs text-gray-400 mb-4">Sync CRM or upload CSV</p>
                <UploadPanel onAnalysis={setAnalysis} />
            </div>

            {analysis && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <UploadAnalysisSection analysis={analysis} />
                    {analysis.dataSenseReport && (
                        <div className="mt-4">
                            <DataSenseReport report={analysis.dataSenseReport} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}