import { UploadCloud } from "lucide-react";
import { UploadPanel } from "../../components/UploadPanel"
import type { UploadAnalysisData } from "@/components/UploadAnalysisSection";
import { ZiiBot } from "../ZiiBot";

type Props = { onAnalysis: (data: UploadAnalysisData) => void };

export function IngestionUploadSection({ onAnalysis }: Props) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <UploadCloud size={15} className="text-blue-500" />
                Upload CSV / Excel
            </h2>
            <UploadPanel onAnalysis={onAnalysis} />
        </div>
    );
}