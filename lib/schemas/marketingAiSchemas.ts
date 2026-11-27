import { z } from "zod";

export const MARKETING_PLATFORMS = [
  "Instagram",
  "Facebook",
  "LinkedIn",
  "Twitter",
  "Google Ads",
  "Email",
] as const;

export type MarketingPlatform = (typeof MARKETING_PLATFORMS)[number];

export const MARKETING_GOALS = [
  "BRAND_AWARENESS",
  "LEAD_GENERATION",
  "ENGAGEMENT",
  "PRODUCT_LAUNCH",
  "RETENTION",
  "SALES_CONVERSION",
] as const;

export type MarketingGoal = (typeof MARKETING_GOALS)[number];

export const MARKETING_TONES = [
  "FRIENDLY",
  "PROFESSIONAL",
  "BOLD",
  "EDUCATIONAL",
  "URGENT",
] as const;

export type MarketingTone = (typeof MARKETING_TONES)[number];

export const PLATFORM_CHAR_GUIDANCE: Record<MarketingPlatform, number> = {
  Twitter: 280,
  "Google Ads": 90,
  Instagram: 2200,
  LinkedIn: 3000,
  Facebook: 5000,
  Email: 5000,
};

export const GOAL_LABELS: Record<MarketingGoal, string> = {
  BRAND_AWARENESS: "Brand Awareness",
  LEAD_GENERATION: "Lead Generation",
  ENGAGEMENT: "Audience Engagement",
  PRODUCT_LAUNCH: "Product Launch",
  RETENTION: "Customer Retention",
  SALES_CONVERSION: "Sales & Conversions",
};

export const TONE_LABELS: Record<MarketingTone, string> = {
  FRIENDLY: "Friendly & Approachable",
  PROFESSIONAL: "Professional & Clear",
  BOLD: "Bold & Attention-Grabbing",
  EDUCATIONAL: "Helpful & Educational",
  URGENT: "Time-Sensitive Offer",
};

// ── Usage Limit Schema ────────────────────────────────────

export const AiUsageLimitSchema = z.object({
  used: z.number().int().min(0),
  limit: z.number().int().min(0),
  remaining: z.number().int().min(0),
  resetAt: z.string().nullable().optional(),
  planTier: z.string().optional(),
});

export type AiUsageLimit = z.infer<typeof AiUsageLimitSchema>;

// ── Grounded Insight Schema ───────────────────────────────

export const GroundedInsightItemSchema = z.object({
  source: z.string().min(1),
  metricLabel: z.string().min(1),
  observation: z.string().min(1),
});

export type GroundedInsightItem = z.infer<typeof GroundedInsightItemSchema>;

// ── AI Marketing Assistant Schemas ────────────────────────

export const AiRecommendationSchema = z.object({
  id: z.string().min(1),
  platform: z.string().min(1, "Platform is required"),
  objective: z.string().min(1, "Objective is required"),
  campaignName: z.string().min(1).optional(),
  suggestedChannel: z.string().optional(),
  suggestedBudget: z.number().nonnegative().nullable().optional(),
  copy: z.string().min(1, "Copy is required"),
  cta: z.string().min(1, "CTA is required"),
  hashtags: z.array(z.string()).default([]),
  suggestedCreativeBrief: z
    .string()
    .min(1, "Suggested creative brief is required"),
  rationale: z.string().optional(),
});

export type AiRecommendation = z.infer<typeof AiRecommendationSchema>;

export const AiAssistantResponseSchema = z.object({
  suggestionId: z.string().min(1),
  isDraft: z.literal(true).default(true),
  disclaimer: z
    .string()
    .min(1)
    .default(
      "AI-generated suggestion for review only. It does not guarantee performance and will never publish or spend budget without your approval."
    ),
  summary: z.string().min(1, "Summary is required"),
  groundedInsights: z.array(GroundedInsightItemSchema).default([]),
  recommendations: z
    .array(AiRecommendationSchema)
    .min(1, "At least one structured recommendation is required"),
  usage: AiUsageLimitSchema.optional(),
});

export type AiAssistantResponse = z.infer<typeof AiAssistantResponseSchema>;

export const AiAssistantRequestSchema = z.object({
  businessDescription: z
    .string()
    .trim()
    .min(10, "Please describe your business or offer in at least 10 characters.")
    .max(1500, "Business description must be 1500 characters or fewer."),
  goal: z.enum(MARKETING_GOALS),
  targetAudience: z
    .string()
    .trim()
    .min(3, "Please describe who you want to reach.")
    .max(500),
  platforms: z
    .array(z.enum(MARKETING_PLATFORMS))
    .min(1, "Select at least one platform."),
  tone: z.enum(MARKETING_TONES),
  budgetHint: z.number().nonnegative().nullable().optional(),
  campaignId: z.string().optional(),
  includePerformanceContext: z.boolean().default(true),
});

export type AiAssistantRequest = z.infer<typeof AiAssistantRequestSchema>;

// ── AI Content Studio Schemas ─────────────────────────────

export const ContentVariationSchema = z.object({
  id: z.string().min(1),
  variationLabel: z.string().min(1).default("Draft Variation"),
  platform: z.string().min(1, "Platform is required"),
  objective: z.string().min(1, "Objective is required"),
  headline: z.string().min(1, "Headline is required"),
  copy: z.string().min(1, "Copy is required"),
  cta: z.string().min(1, "CTA is required"),
  hashtags: z.array(z.string()).default([]),
  suggestedCreativeBrief: z
    .string()
    .min(1, "Suggested creative brief is required"),
  characterCount: z.number().int().nonnegative().optional(),
});

export type ContentVariation = z.infer<typeof ContentVariationSchema>;

export const ContentStudioResponseSchema = z.object({
  generationId: z.string().min(1),
  isDraft: z.literal(true).default(true),
  disclaimer: z
    .string()
    .min(1)
    .default(
      "AI draft suggestion — edit and review before saving to Social Drafts or publishing."
    ),
  variations: z
    .array(ContentVariationSchema)
    .min(1, "At least one content variation is required"),
  usage: AiUsageLimitSchema.optional(),
});

export type ContentStudioResponse = z.infer<typeof ContentStudioResponseSchema>;

export const ContentStudioRequestSchema = z.object({
  platform: z.enum(MARKETING_PLATFORMS),
  objective: z.enum(MARKETING_GOALS),
  topicOrBrief: z
    .string()
    .trim()
    .min(10, "Please describe what this post or ad is about (at least 10 characters).")
    .max(1500),
  targetAudience: z.string().trim().max(500).optional(),
  tone: z.enum(MARKETING_TONES),
  variationCount: z.number().int().min(1).max(3).default(2),
  includeHashtags: z.boolean().default(true),
  campaignId: z.string().optional(),
  callToActionPreference: z.string().trim().max(120).optional(),
});

export type ContentStudioRequest = z.infer<typeof ContentStudioRequestSchema>;

// ── Social Post Draft Contract (Shared with Ayush) ────────

export const SocialDraftStatusSchema = z.enum([
  "DRAFT",
  "SCHEDULED",
  "PUBLISHED",
  "ARCHIVED",
]);

export type SocialDraftStatus = z.infer<typeof SocialDraftStatusSchema>;

export const CreateSocialDraftPayloadSchema = z.object({
  platform: z.string().min(1, "Platform is required"),
  objective: z.string().min(1, "Objective is required"),
  title: z.string().trim().min(1, "Draft title is required").max(200),
  headline: z.string().trim().optional(),
  copy: z.string().trim().min(1, "Draft copy cannot be empty"),
  cta: z.string().trim().min(1, "Call to action is required"),
  hashtags: z.array(z.string()).default([]),
  suggestedCreativeBrief: z.string().trim().min(1, "Creative brief is required"),
  campaignId: z.string().nullable().optional(),
  source: z.enum(["AI_CONTENT_STUDIO", "AI_MARKETING_ASSISTANT", "MANUAL"]).default("AI_CONTENT_STUDIO"),
  // Safety invariant: AI Studio & Assistant may ONLY create drafts, never publish directly.
  status: z.literal("DRAFT"),
  aiGenerationId: z.string().optional(),
});

export type CreateSocialDraftPayload = z.infer<typeof CreateSocialDraftPayloadSchema>;

export const SocialPostDraftSchema = z.object({
  id: z.string().min(1),
  organizationId: z.string().optional(),
  platform: z.string().min(1),
  objective: z.string().min(1),
  title: z.string().min(1),
  headline: z.string().nullable().optional(),
  copy: z.string().min(1),
  cta: z.string().min(1),
  hashtags: z.array(z.string()).default([]),
  suggestedCreativeBrief: z.string().optional(),
  campaignId: z.string().nullable().optional(),
  source: z.string().optional(),
  status: SocialDraftStatusSchema.default("DRAFT"),
  createdBy: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type SocialPostDraft = z.infer<typeof SocialPostDraftSchema>;

// ── Runtime Envelope Extractors & Validators ──────────────

export function unwrapApiPayload(raw: unknown): unknown {
  if (raw && typeof raw === "object" && "data" in raw && (raw as { data?: unknown }).data !== undefined) {
    return (raw as { data: unknown }).data;
  }
  return raw;
}

export class StructuredAiValidationError extends Error {
  public readonly issues: string[];
  constructor(message: string, issues: string[] = []) {
    super(message);
    this.name = "StructuredAiValidationError";
    this.issues = issues;
  }
}

export function validateAiAssistantResponse(raw: unknown): AiAssistantResponse {
  const payload = unwrapApiPayload(raw);
  const parsed = AiAssistantResponseSchema.safeParse(payload);
  if (!parsed.success) {
    const issues = parsed.error.issues.map(
      (i) => `${i.path.join(".") || "root"}: ${i.message}`
    );
    throw new StructuredAiValidationError(
      "AI response failed structured output validation. Please retry.",
      issues
    );
  }
  return parsed.data;
}

export function validateContentStudioResponse(raw: unknown): ContentStudioResponse {
  const payload = unwrapApiPayload(raw);
  const parsed = ContentStudioResponseSchema.safeParse(payload);
  if (!parsed.success) {
    const issues = parsed.error.issues.map(
      (i) => `${i.path.join(".") || "root"}: ${i.message}`
    );
    throw new StructuredAiValidationError(
      "AI content output failed structured validation. Please retry.",
      issues
    );
  }
  return parsed.data;
}

export function validateSocialPostDraft(raw: unknown): SocialPostDraft {
  const payload = unwrapApiPayload(raw);
  const parsed = SocialPostDraftSchema.safeParse(payload);
  if (!parsed.success) {
    const issues = parsed.error.issues.map(
      (i) => `${i.path.join(".") || "root"}: ${i.message}`
    );
    throw new StructuredAiValidationError(
      "Social draft response is missing required fields.",
      issues
    );
  }
  return parsed.data;
}

export function validateAiUsageLimit(raw: unknown): AiUsageLimit {
  const payload = unwrapApiPayload(raw);
  const parsed = AiUsageLimitSchema.safeParse(payload);
  if (!parsed.success) {
    const issues = parsed.error.issues.map(
      (i) => `${i.path.join(".") || "root"}: ${i.message}`
    );
    throw new StructuredAiValidationError(
      "Usage limit response format is invalid.",
      issues
    );
  }
  return parsed.data;
}

// ── Formatting & Mapping Helpers ──────────────────────────

export function normalizeHashtags(input: string): string[] {
  return input
    .split(/[\s,]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => (tag.startsWith("#") ? tag : `#${tag.replace(/^#+/, "")}`));
}

export function formatVariationForClipboard(variation: {
  headline?: string | null;
  copy: string;
  cta?: string;
  hashtags?: string[];
}): string {
  const parts: string[] = [];
  if (variation.headline?.trim()) parts.push(variation.headline.trim());
  if (variation.copy.trim()) parts.push(variation.copy.trim());
  if (variation.cta?.trim()) parts.push(`CTA: ${variation.cta.trim()}`);
  if (variation.hashtags && variation.hashtags.length > 0) {
    parts.push(variation.hashtags.join(" "));
  }
  return parts.join("\n\n");
}

export function mapPlatformToCampaignChannel(
  platform: string
): "Facebook" | "Google Ads" | "LinkedIn" | "Twitter" | "Email" | "Other" {
  const p = platform.trim().toLowerCase();
  if (p === "facebook") return "Facebook";
  if (p === "google ads" || p === "google") return "Google Ads";
  if (p === "linkedin") return "LinkedIn";
  if (p === "twitter" || p === "x") return "Twitter";
  if (p === "email") return "Email";
  return "Other";
}
