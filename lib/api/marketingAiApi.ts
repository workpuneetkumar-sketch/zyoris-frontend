import api from "@/lib/api/api";
import { getCampaigns, Campaign } from "@/lib/api/marketingApi";
import { fetchDrivers, fetchSegments } from "@/lib/api/analyticsApi";
import { getIntegrationsApi } from "@/lib/api/integrationsApi";
import {
  AiAssistantRequest,
  AiAssistantRequestSchema,
  AiAssistantResponse,
  AiUsageLimit,
  ContentStudioRequest,
  ContentStudioRequestSchema,
  ContentStudioResponse,
  CreateSocialDraftPayload,
  CreateSocialDraftPayloadSchema,
  SocialPostDraft,
  unwrapApiPayload,
  validateAiAssistantResponse,
  validateAiUsageLimit,
  validateContentStudioResponse,
  validateSocialPostDraft,
} from "@/lib/schemas/marketingAiSchemas";

// ── Grounding Context from Existing Live APIs ─────────────

export interface MarketingGroundingContext {
  campaignsCount: number;
  activeCampaignsCount: number;
  topChannels: Array<{ name: string; revenue: number; marketing: number }>;
  marketingRoi: number | null;
  segments: Array<{ name: string; share: number }>;
  connectedIntegrationsCount: number;
  connectedProviders: string[];
  campaigns: Campaign[];
  loadedSources: string[];
  unavailableSources: string[];
}

/**
 * Gathers real organization marketing, analytics, and integration context
 * from existing Zyoris endpoints. Degrades cleanly if any source is empty or
 * restricted for the current user's role — never invents placeholder metrics.
 */
export async function fetchMarketingGroundingContext(): Promise<MarketingGroundingContext> {
  const [campaignsRes, driversRes, segmentsRes, integrationsRes] =
    await Promise.allSettled([
      getCampaigns(),
      fetchDrivers(),
      fetchSegments(),
      getIntegrationsApi(),
    ]);

  const loadedSources: string[] = [];
  const unavailableSources: string[] = [];

  const campaigns =
    campaignsRes.status === "fulfilled" ? campaignsRes.value : [];
  if (campaignsRes.status === "fulfilled") {
    loadedSources.push("Campaigns");
  } else {
    unavailableSources.push("Campaigns");
  }

  let topChannels: Array<{ name: string; revenue: number; marketing: number }> =
    [];
  let marketingRoi: number | null = null;
  if (driversRes.status === "fulfilled" && driversRes.value) {
    loadedSources.push("Revenue Drivers");
    marketingRoi = driversRes.value.totals?.marketingRoi ?? null;
    topChannels = (driversRes.value.channels ?? []).slice(0, 4).map((ch) => ({
      name: ch.name,
      revenue: ch.revenue,
      marketing: ch.marketing,
    }));
  } else {
    unavailableSources.push("Revenue Drivers");
  }

  let segments: Array<{ name: string; share: number }> = [];
  if (segmentsRes.status === "fulfilled" && Array.isArray(segmentsRes.value)) {
    loadedSources.push("Customer Segments");
    segments = segmentsRes.value.slice(0, 4).map((s) => ({
      name: s.name,
      share: s.share,
    }));
  } else {
    unavailableSources.push("Customer Segments");
  }

  let connectedProviders: string[] = [];
  if (
    integrationsRes.status === "fulfilled" &&
    Array.isArray(integrationsRes.value)
  ) {
    loadedSources.push("Integrations");
    connectedProviders = integrationsRes.value
      .filter(
        (i) =>
          i.status === "ACTIVE" ||
          i.status === "CONNECTED" ||
          i.isEnabled === true
      )
      .map((i) => i.name || i.provider)
      .filter(Boolean);
  } else {
    unavailableSources.push("Integrations");
  }

  return {
    campaignsCount: campaigns.length,
    activeCampaignsCount: campaigns.filter((c) => c.status === "ACTIVE").length,
    topChannels,
    marketingRoi,
    segments,
    connectedIntegrationsCount: connectedProviders.length,
    connectedProviders,
    campaigns,
    loadedSources,
    unavailableSources,
  };
}

// ── AI Marketing Assistant Endpoints ──────────────────────

export async function getMarketingAiUsage(): Promise<AiUsageLimit> {
  const res = await api.get("/marketing/ai/usage");
  return validateAiUsageLimit(res.data);
}

export async function generateMarketingAssistantPlan(
  payload: AiAssistantRequest
): Promise<AiAssistantResponse> {
  const validatedPayload = AiAssistantRequestSchema.parse(payload);
  const res = await api.post("/marketing/ai/assistant", validatedPayload, {
    timeout: 45000,
  });
  return validateAiAssistantResponse(res.data);
}

// ── AI Content Studio Endpoints ───────────────────────────

export async function generateContentStudioVariations(
  payload: ContentStudioRequest
): Promise<ContentStudioResponse> {
  const validatedPayload = ContentStudioRequestSchema.parse(payload);
  const res = await api.post(
    "/marketing/ai/content-studio/generate",
    validatedPayload,
    { timeout: 45000 }
  );
  return validateContentStudioResponse(res.data);
}

// ── Social Post Drafts (Shared Contract with Ayush) ───────

export async function getSocialPostDrafts(filters?: {
  platform?: string;
  status?: string;
  campaignId?: string;
}): Promise<SocialPostDraft[]> {
  const res = await api.get("/marketing/social/drafts", { params: filters });
  const raw = unwrapApiPayload(res.data);
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as any).drafts)
    ? (raw as any).drafts
    : [];
  return list.map((item: unknown) => validateSocialPostDraft(item));
}

export async function createSocialPostDraft(
  payload: Omit<CreateSocialDraftPayload, "status">
): Promise<SocialPostDraft> {
  const safePayload = CreateSocialDraftPayloadSchema.parse({
    ...payload,
    status: "DRAFT",
  });
  const res = await api.post("/marketing/social/drafts", safePayload);
  return validateSocialPostDraft(res.data);
}

export async function updateSocialPostDraft(
  id: string,
  payload: Partial<
    Pick<
      CreateSocialDraftPayload,
      | "platform"
      | "objective"
      | "title"
      | "headline"
      | "copy"
      | "cta"
      | "hashtags"
      | "suggestedCreativeBrief"
      | "campaignId"
    >
  >
): Promise<SocialPostDraft> {
  const res = await api.patch(
    `/marketing/social/drafts/${encodeURIComponent(id)}`,
    payload
  );
  return validateSocialPostDraft(res.data);
}

export async function deleteSocialPostDraft(id: string): Promise<void> {
  await api.delete(`/marketing/social/drafts/${encodeURIComponent(id)}`);
}
