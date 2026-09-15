import api from "./api";

export interface BuildContextPayload {
  customerId: string;
  includeTimeline?: boolean;
  includeGraph?: boolean;
}

export interface Customer360Context {
  contextId: string;
  version: string;
  latencyMs: number;
  boundedContext: {
    profile: any;
    recentTimeline: any[];
    graphRelationships: any[];
  };
}

export interface Customer360InsightDTO {
  insightId: string;
  type: string;
  text: string;
  confidence: number;
  evidenceIds: string[];
  generatedAt: string;
}

export interface Customer360InsightsResponse {
  insights: Customer360InsightDTO[];
  metadata: {
    promptVersion: string;
    latencyMs: number;
  };
}

export interface MeetingMetadata {
  date?: string;
  participants?: string[];
  purpose?: string;
  duration?: number;
}

export interface MeetingPrepPayload {
  customerId: string;
  meetingMetadata: MeetingMetadata;
}

export interface MeetingPrepResponse {
  summary: string;
  risks: Array<{ description: string; severity: string; evidenceIds?: string[] }>;
  stakeholders: Array<{ name: string; role: string; sentiment: string; evidenceIds?: string[] }>;
  commitments: Array<{ commitment: string; status: string; evidenceIds?: string[] }>;
  agenda: Array<{ topic: string; durationInMinutes: number }>;
  evidenceIds?: string[];
  metadata?: any;
}

export const aiCustomer360Api = {
  buildContext: async (payload: BuildContextPayload): Promise<Customer360Context> => {
    const res = await api.post("/internal/ai/customer360/context", payload);
    return res.data;
  },
  
  generateInsights: async (context: Customer360Context): Promise<Customer360InsightsResponse> => {
    const res = await api.post("/internal/ai/customer360/insights", context);
    return res.data;
  },
  
  generateMeetingPrep: async (payload: MeetingPrepPayload): Promise<MeetingPrepResponse> => {
    const res = await api.post("/internal/ai/customer360/meeting-prep", payload);
    return res.data;
  }
};
