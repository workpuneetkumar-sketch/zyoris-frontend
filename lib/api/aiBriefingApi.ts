import api from "@/lib/api/api";

export interface MorningBriefingData {
  greeting: string;
  summaryBullets: string[];
  overdueHighlight?: string;
  topPriorityAction?: string;
  confidenceScore?: number;
  fallback?: boolean;
}

export interface AnomalyAlertItem {
  id: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  metric: string;
  change: string;
  description: string;
  recommendation: string;
}

export interface AnomalyAlertsData {
  anomalies: AnomalyAlertItem[];
  fallback?: boolean;
}

export async function getMorningBriefing(): Promise<MorningBriefingData> {
  try {
    const response = await api.get("/dashboard/briefing");
    const data = response.data?.data || response.data;
    return {
      greeting: data.greeting || "Good morning. Here is your overnight brief.",
      summaryBullets: Array.isArray(data.summaryBullets) ? data.summaryBullets : [],
      overdueHighlight: data.overdueHighlight,
      topPriorityAction: data.topPriorityAction,
      confidenceScore: typeof data.confidenceScore === "number" ? data.confidenceScore : 0.95,
      fallback: data.fallback || false,
    };
  } catch (error: any) {
    console.error("Failed to fetch morning briefing:", error);
    throw new Error(
      error.response?.data?.message || error.message || "Unable to load morning briefing."
    );
  }
}

export async function getDashboardAnomalies(): Promise<AnomalyAlertsData> {
  try {
    const response = await api.get("/dashboard/anomalies");
    const data = response.data?.data || response.data;
    return {
      anomalies: Array.isArray(data.anomalies) ? data.anomalies : [],
      fallback: data.fallback || false,
    };
  } catch (error: any) {
    console.error("Failed to fetch proactive anomalies:", error);
    throw new Error(
      error.response?.data?.message || error.message || "Unable to load anomaly alerts."
    );
  }
}
