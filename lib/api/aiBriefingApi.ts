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
  const h = new Date().getHours();
  const timeGreeting =
    h >= 4 && h < 12 ? "Good morning" :
    h >= 12 && h < 17 ? "Good afternoon" :
    "Good evening";

  try {
    const response = await api.get("/dashboard/briefing");
    const data = response.data?.data || response.data;
    // Replace whatever greeting the AI returns with the correct time-based one
    const aiGreeting: string = data.greeting || "";
    const greetingBody = aiGreeting
      .replace(/^good (morning|afternoon|evening)[,.]?\s*/i, "")
      .trim();
    const greeting = greetingBody
      ? `${timeGreeting}. ${greetingBody}`
      : `${timeGreeting}. Here is your daily brief.`;
    return {
      greeting,
      summaryBullets: Array.isArray(data.summaryBullets) ? data.summaryBullets : [],
      overdueHighlight: data.overdueHighlight,
      topPriorityAction: data.topPriorityAction,
      confidenceScore: typeof data.confidenceScore === "number" ? data.confidenceScore : 0.95,
      fallback: data.fallback || false,
    };
  } catch (error: any) {
    console.error("Failed to fetch morning briefing:", error);
    throw new Error(
      error.response?.data?.message || error.message || "Unable to load briefing."
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
