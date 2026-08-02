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
// AI Business Intelligence API
// =========================================

export async function uploadDataset(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post("/insights/dashboard/upload", formData);
  return response.data;
}

export async function getDatasetDetails(datasetId: string) {
  const response = await api.get(`/insights/dashboard/dataset/${datasetId}`);
  return response.data;
}

export async function getDatasetInsights(datasetId: string) {
  const response = await api.get(`/insights/dashboard/insights/${datasetId}`);
  return response.data;
}

export async function getDatasetCharts(datasetId: string) {
  const response = await api.get(`/insights/dashboard/charts/${datasetId}`);
  return response.data;
}

export async function chatWithDataset(datasetId: string, message: string, conversationId?: string) {
  const response = await api.post("/insights/dashboard/chat", {
    datasetId,
    message,
    conversationId
  });
  return response.data;
}