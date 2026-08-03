// lib/api/aiInsightsApi.ts
import api from "@/lib/api/api";

export interface LeadFollowUp {
  id: string;
  name: string;
  reason: string;
}

export interface DealInsight {
  id: string;
  name: string;
  winProbability: number;
  reason: string;
}

export interface DashboardInsights {
  leadsNeedingFollowUp: LeadFollowUp[];
  dealInsights: DealInsight[];
  generatedAt: string;
  fallback?: boolean;
  message?: string;
}

/**
 * Helper to delay execution.
 */
function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch dashboard insights with automatic retry on server errors.
 * Retries up to maxRetries times with exponential backoff.
 */
export async function getDashboardInsights(
  maxRetries = 3,
  retryDelayMs = 1000,
): Promise<DashboardInsights> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const response = await api.get("/insights/dashboard");
      const data = response.data?.data || response.data;

      return {
        leadsNeedingFollowUp: data.leadsNeedingFollowUp || [],
        dealInsights: data.dealInsights || [],
        generatedAt: data.generatedAt || new Date().toISOString(),
        fallback: data.fallback || false,
        message: data.message || undefined,
      };
    } catch (error: any) {
      lastError = error;

      // Don't retry on 401 (auth) or other 4xx client errors
      if (error.response && error.response.status >= 400 && error.response.status < 500) {
        break; // client error, no point retrying
      }

      // If we've exhausted retries, stop
      if (attempt > maxRetries) break;

      // Wait with exponential backoff before the next attempt
      const delay = retryDelayMs * Math.pow(2, attempt - 1);
      console.warn(
        `AI insights: attempt ${attempt} failed, retrying in ${delay}ms…`,
      );
      await wait(delay);
    }
  }

  // All attempts exhausted – throw a user-friendly error
  let message = "Unable to load AI insights. Please try again later.";
  if (lastError?.response) {
    const status = lastError.response.status;
    if (status === 401) {
      message = "Authentication required. Please log in again.";
    } else if (status === 502 || status === 503 || status === 504) {
      message = "AI service is temporarily unavailable after several attempts. Please try again later.";
    } else if (lastError.response.data?.message) {
      message = lastError.response.data.message;
    }
  } else if (lastError?.message) {
    message = lastError.message;
  }

  throw new Error(message);
}

// =========================================
// Weekly AI Briefing
// =========================================

export interface WeeklyBriefingData {
  period: string;
  highlights: string[];
  leadsCreated?: number;
  dealsClosed?: number;
  revenueGenerated?: number;
  topPerformer?: string;
  keyInsights?: string[];
  generatedAt: string;
  fallback?: boolean;
}

/**
 * GET /dashboard/briefing?weekly=true
 */
export async function getWeeklyBriefing(): Promise<WeeklyBriefingData> {
  try {
    const response = await api.get("/dashboard/briefing", { params: { weekly: true } });
    const raw = response.data?.data || response.data;
    return {
      period: raw.period || "Last 7 days",
      highlights: Array.isArray(raw.highlights)
        ? raw.highlights
        : Array.isArray(raw.summaryBullets)
        ? raw.summaryBullets
        : [],
      leadsCreated: raw.leadsCreated,
      dealsClosed: raw.dealsClosed,
      revenueGenerated: raw.revenueGenerated,
      topPerformer: raw.topPerformer,
      keyInsights: Array.isArray(raw.keyInsights) ? raw.keyInsights : [],
      generatedAt: raw.generatedAt || new Date().toISOString(),
      fallback: raw.fallback || false,
    };
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || error.message || "Unable to load weekly briefing."
    );
  }
}

// =========================================
// Communication Intelligence
// =========================================

export interface CommunicationIntelligenceData {
  buyingProbability: number; // 0-100
  intent: string;
  mood: string;
  nextBestAction: string;
  suggestedReplies?: string[];
  engagementScore?: number;
  riskLevel?: string;
  generatedAt?: string;
  fallback?: boolean;
}

/**
 * GET /crm/communication-intelligence/{leadId}
 */
export async function getCommunicationIntelligence(
  leadId: string
): Promise<CommunicationIntelligenceData> {
  try {
    const response = await api.get(`/crm/communication-intelligence/${leadId}`);
    const raw = response.data?.data || response.data;
    const rawSuggestions = Array.isArray(raw.suggestedReplies)
      ? raw.suggestedReplies
      : Array.isArray(raw.suggestions)
      ? raw.suggestions
      : Array.isArray(raw.recommendedReplies)
      ? raw.recommendedReplies
      : [];

    const suggestedReplies = rawSuggestions.length > 0
      ? rawSuggestions
      : [
          raw.nextBestAction || "Follow up on product demo request",
          "Send customized pricing & proposal details",
          "Schedule a 15-minute quick call to address questions",
        ];

    return {
      buyingProbability: typeof raw.buyingProbability === "number"
        ? Math.round(raw.buyingProbability * (raw.buyingProbability > 1 ? 1 : 100))
        : typeof raw.score === "number"
        ? raw.score
        : 0,
      intent: raw.intent || raw.intentLabel || "Unknown",
      mood: raw.mood || raw.sentiment || "Neutral",
      nextBestAction: raw.nextBestAction || raw.recommendation || "No recommendation available.",
      suggestedReplies,
      engagementScore: raw.engagementScore,
      riskLevel: raw.riskLevel,
      generatedAt: raw.generatedAt,
      fallback: raw.fallback || false,
    };
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || error.message || "Unable to load communication intelligence."
    );
  }
}

// =========================================
// AI Business Intelligence API
// =========================================

export async function uploadDataset(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post("/insights/dashboard/upload", formData);
  return response.data;
}