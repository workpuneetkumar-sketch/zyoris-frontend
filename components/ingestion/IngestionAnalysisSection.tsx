import { BarChart2 } from "lucide-react";

type Props = { analysis: any };

export function IngestionAnalysisSection({ analysis }: Props) {
    if (!analysis) return null;

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <BarChart2 size={15} className="text-blue-500" />
                Last Upload Analysis
            </h2>
            <pre className="text-xs text-gray-500 bg-gray-50 rounded-xl p-4 overflow-auto max-h-64">
                {JSON.stringify(analysis, null, 2)}
            </pre>
        </div>
    );
}