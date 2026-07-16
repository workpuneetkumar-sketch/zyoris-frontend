import { useState, useEffect } from "react";
import api from "@/lib/api/api";
import {
  Sparkles,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  getMorningBriefing,
  getDashboardAnomalies,
  MorningBriefingData,
  AnomalyAlertItem,
} from "@/lib/api/aiBriefingApi";

export function RecommendationsSection({ token }: { token: string }) {
  const [recs, setRecs] = useState<any[]>([]);
  const [briefing, setBriefing] = useState<MorningBriefingData | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyAlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);

    Promise.all([
      api
        .get("/recommendations")
        .then((res) => res.data)
        .catch(() => []),
      getMorningBriefing().catch(() => null),
      getDashboardAnomalies()
        .then((res) => res.anomalies || [])
        .catch(() => []),
    ])
      .then(([recsData, briefingData, anomaliesData]) => {
        setRecs(Array.isArray(recsData) ? recsData : []);
        setBriefing(briefingData);
        setAnomalies(Array.isArray(anomaliesData) ? anomaliesData : []);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const bullets = briefing?.summaryBullets || [];
  const hasAnyData =
    recs.length > 0 || bullets.length > 0 || anomalies.length > 0;

  const getSeverityStyles = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case "HIGH":
        return "bg-rose-50/70 border-rose-200 text-rose-950";
      case "MEDIUM":
        return "bg-amber-50/70 border-amber-200 text-amber-950";
      case "LOW":
      default:
        return "bg-emerald-50/70 border-emerald-200 text-emerald-950";
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-full">
      <div className="px-5 py-4 border-b border-gray-50 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-800">
            AI Strategy Insights
          </h3>
        </div>
        <span className="text-xs text-blue-600 font-medium">Groq AI Engine</span>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse bg-gray-50/80 rounded-xl"
              />
            ))}
          </div>
        ) : hasAnyData ? (
          <div className="space-y-4">
            {/* Summary bullets (without Good morning greeting) */}
            {bullets.length > 0 && (
              <div className="space-y-2.5">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 mb-1">
                  Executive Briefing Insights
                </p>
                {bullets.map((bullet, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3.5 rounded-xl bg-gray-50/80 border border-gray-100/80 hover:bg-gray-100/50 transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm font-medium text-gray-700 leading-relaxed">
                      {bullet}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Proactive Anomaly Alerts */}
            {anomalies.length > 0 && (
              <div className="space-y-2.5 pt-2">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 mb-1">
                  Proactive Anomaly Alerts
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {anomalies.map((alert) => {
                    const styles = getSeverityStyles(alert.severity);
                    const isNegative = alert.change?.startsWith("-");
                    return (
                      <div
                        key={alert.id}
                        className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all ${styles}`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/80 border border-current/20">
                              {alert.severity} Severity
                            </span>
                            <div className="flex items-center gap-1 font-extrabold text-xs">
                              {isNegative ? (
                                <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                              ) : (
                                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                              )}
                              <span>{alert.change}</span>
                            </div>
                          </div>
                          <h4 className="text-sm font-bold tracking-tight mb-1">
                            {alert.title}
                          </h4>
                          <p className="text-xs font-medium leading-relaxed opacity-90">
                            {alert.description}
                          </p>
                        </div>
                        <div className="pt-2 border-t border-current/10 flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold truncate">
                            {alert.recommendation}
                          </span>
                          <span className="text-[10px] font-extrabold uppercase px-2 py-1 bg-white/90 rounded-md shadow-2xs">
                            Action
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Legacy recommendations if present */}
            {recs.length > 0 && (
              <div className="space-y-2.5 pt-2">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 mb-1">
                  Strategy Recommendations
                </p>
                {recs.map((rec) => (
                  <div
                    key={rec.title}
                    className="p-3.5 rounded-xl bg-gray-50/80 border border-gray-100/80 hover:bg-gray-100/50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          {rec.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {rec.description}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full shrink-0">
                        {Math.round((rec.confidence || 0.9) * 100)}% Match
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center space-y-2">
            <p className="text-sm font-semibold text-gray-700">
              Proactive Anomaly Alerts &amp; AI Strategy Insights
            </p>
            <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
              Real-time proactive anomaly alerts, deal velocity deviations, and
              key executive briefing items will automatically appear here once
              sufficient organizational data is collected across leads, tasks,
              and communications.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}