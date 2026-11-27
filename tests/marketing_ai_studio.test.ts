import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CreateSocialDraftPayloadSchema,
  formatVariationForClipboard,
  mapPlatformToCampaignChannel,
  normalizeHashtags,
  StructuredAiValidationError,
  validateAiAssistantResponse,
  validateAiUsageLimit,
  validateContentStudioResponse,
  validateSocialPostDraft,
} from "../lib/schemas/marketingAiSchemas.ts";
import { normalizeMarketingAiError } from "../lib/utils/marketingAiErrors.ts";

describe("Marketing AI Assistant & Content Studio Contracts", () => {
  it("validates structured AI Marketing Assistant response inside { data } envelope", () => {
    const rawResponse = {
      success: true,
      data: {
        suggestionId: "sug-123",
        isDraft: true,
        disclaimer: "Draft suggestion only.",
        summary: "Focus on founder stories on LinkedIn.",
        groundedInsights: [
          {
            source: "CAMPAIGNS",
            metricLabel: "Active Campaigns",
            observation: "2 LinkedIn campaigns currently active.",
          },
        ],
        recommendations: [
          {
            id: "rec-1",
            platform: "LinkedIn",
            objective: "Lead Generation",
            campaignName: "Q4 Founder Outreach",
            suggestedChannel: "LinkedIn",
            suggestedBudget: 400,
            copy: "Stop losing leads in spreadsheets.",
            cta: "Book a 15-min demo",
            hashtags: ["#B2BSales", "#CRM"],
            suggestedCreativeBrief: "3-slide carousel comparing old vs new workflow.",
          },
        ],
        usage: { used: 3, limit: 50, remaining: 47, resetAt: "2026-12-01T00:00:00.000Z" },
      },
    };

    const validated = validateAiAssistantResponse(rawResponse);
    assert.equal(validated.isDraft, true);
    assert.equal(validated.recommendations.length, 1);
    assert.equal(validated.recommendations[0].platform, "LinkedIn");
    assert.equal(validated.recommendations[0].cta, "Book a 15-min demo");
    assert.equal(validated.usage?.remaining, 47);
  });

  it("rejects AI Assistant output missing required structured fields (cta / suggestedCreativeBrief)", () => {
    const malformed = {
      data: {
        suggestionId: "sug-bad",
        isDraft: true,
        summary: "Some summary",
        recommendations: [
          {
            id: "rec-1",
            platform: "Instagram",
            objective: "Brand Awareness",
            copy: "Hello world",
            // missing cta & suggestedCreativeBrief
          },
        ],
      },
    };

    assert.throws(
      () => validateAiAssistantResponse(malformed),
      (err: unknown) => err instanceof StructuredAiValidationError
    );
  });

  it("validates Content Studio variations and rejects missing headline", () => {
    const valid = validateContentStudioResponse({
      generationId: "gen-1",
      isDraft: true,
      variations: [
        {
          id: "v1",
          variationLabel: "Variation A",
          platform: "Instagram",
          objective: "Product Launch",
          headline: "Launch faster with Zyoris",
          copy: "Automate follow-ups without losing the human touch.",
          cta: "Start free trial",
          hashtags: ["#SaaS", "#CRM"],
          suggestedCreativeBrief: "15s product reel with bold captions.",
        },
      ],
    });
    assert.equal(valid.variations[0].headline, "Launch faster with Zyoris");

    assert.throws(
      () =>
        validateContentStudioResponse({
          generationId: "gen-bad",
          isDraft: true,
          variations: [
            {
              id: "v1",
              platform: "Instagram",
              objective: "Product Launch",
              copy: "Missing headline",
              cta: "Click here",
              suggestedCreativeBrief: "Photo",
            },
          ],
        }),
      (err: unknown) => err instanceof StructuredAiValidationError
    );
  });

  it("enforces DRAFT-only status on CreateSocialDraftPayloadSchema (never auto-publishes)", () => {
    const okDraft = CreateSocialDraftPayloadSchema.safeParse({
      platform: "LinkedIn",
      objective: "Lead Generation",
      title: "Draft 1",
      copy: "Draft copy text",
      cta: "Learn more",
      hashtags: ["#CRM"],
      suggestedCreativeBrief: "Clean product card",
      status: "DRAFT",
    });
    assert.equal(okDraft.success, true);

    const unsafePublishAttempt = CreateSocialDraftPayloadSchema.safeParse({
      platform: "LinkedIn",
      objective: "Lead Generation",
      title: "Draft 1",
      copy: "Draft copy text",
      cta: "Learn more",
      hashtags: ["#CRM"],
      suggestedCreativeBrief: "Clean product card",
      status: "PUBLISHED",
    });
    assert.equal(unsafePublishAttempt.success, false);
  });

  it("validates SocialPostDraft and AiUsageLimit responses", () => {
    const draft = validateSocialPostDraft({
      data: {
        id: "draft-1",
        platform: "Instagram",
        objective: "Engagement",
        title: "Tip Tuesday",
        copy: "3 ways to clean your pipeline.",
        cta: "Save this post",
        hashtags: ["#SalesTips"],
        status: "DRAFT",
      },
    });
    assert.equal(draft.id, "draft-1");
    assert.equal(draft.status, "DRAFT");

    const usage = validateAiUsageLimit({
      data: { used: 10, limit: 50, remaining: 40, resetAt: null },
    });
    assert.equal(usage.remaining, 40);
  });

  it("normalizes HTTP 429, 404, 403, 503 and Zod validation errors properly", () => {
    const rateLimited = normalizeMarketingAiError({
      response: {
        status: 429,
        data: { code: "AI_USAGE_LIMIT_EXCEEDED", resetAt: "2026-12-01T00:00:00Z" },
      },
    });
    assert.equal(rateLimited.code, "RATE_LIMITED");
    assert.equal(rateLimited.retryable, false);

    const notDeployed = normalizeMarketingAiError({ response: { status: 404 } });
    assert.equal(notDeployed.code, "ENDPOINT_UNAVAILABLE");
    assert.equal(notDeployed.retryable, true);

    const forbidden = normalizeMarketingAiError({ response: { status: 403 } });
    assert.equal(forbidden.code, "PERMISSION_DENIED");

    const serverErr = normalizeMarketingAiError({ response: { status: 503 } });
    assert.equal(serverErr.code, "SERVICE_UNAVAILABLE");
    assert.equal(serverErr.retryable, true);

    const validationErr = normalizeMarketingAiError(
      new StructuredAiValidationError("Invalid AI output", ["cta: Required"])
    );
    assert.equal(validationErr.code, "VALIDATION_ERROR");
    assert.deepEqual(validationErr.validationIssues, ["cta: Required"]);
  });

  it("formats hashtags, clipboard output, and campaign channels accurately", () => {
    assert.deepEqual(normalizeHashtags("sales, #crm  Growth"), [
      "#sales",
      "#crm",
      "#Growth",
    ]);

    const clip = formatVariationForClipboard({
      headline: "Big Launch",
      copy: "Try it today.",
      cta: "Sign up",
      hashtags: ["#Launch", "#Zyoris"],
    });
    assert.ok(clip.includes("Big Launch"));
    assert.ok(clip.includes("CTA: Sign up"));
    assert.ok(clip.includes("#Launch #Zyoris"));

    assert.equal(mapPlatformToCampaignChannel("LinkedIn"), "LinkedIn");
    assert.equal(mapPlatformToCampaignChannel("Google Ads"), "Google Ads");
    assert.equal(mapPlatformToCampaignChannel("Instagram"), "Other");
  });
});
