import { useState, useEffect } from "react";
import api from "@/lib/api/api";
import { ChevronRight, Sparkles } from "lucide-react";

export function RecommendationsSection({ token }: { token: string }) {
    const [recs, setRecs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("/recommendations")
            .then((res) => setRecs(res.data))
            .finally(() => setLoading(false));
    }, [token]);

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-full">
            <div className="px-5 py-4 border-b border-gray-50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-blue-600" />
                    <h3 className="text-sm font-semibold text-gray-800">AI Strategy Insights</h3>
                </div>
                <button className="text-xs text-blue-600 font-medium hover:underline">View All</button>
            </div>
            <div className="divide-y divide-gray-50">
                {loading ? (
                    [1, 2, 3].map((i) => <div key={i} className="p-5 h-20 animate-pulse bg-gray-50/50" />)
                ) : recs.length > 0 ? (
                    recs.map((rec) => (
                        <div key={rec.title} className="px-5 py-4 hover:bg-gray-50/50 transition-colors cursor-pointer group">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">{rec.title}</p>
                                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{rec.description}</p>
                                </div>
                                <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                                    {Math.round(rec.confidence * 100)}% Match
                                </span>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="p-10 text-center text-sm text-gray-400">No active recommendations.</p>
                )}
            </div>
        </div>
    );
}