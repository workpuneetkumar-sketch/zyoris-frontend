"use client";

import React, { useEffect, useState } from "react";
import {
  Sparkles,
  Copy,
  Check,
  Send,
  RefreshCw,
  Loader2,
  Edit3,
  FileText,
  Hash,
} from "lucide-react";
import { Campaign } from "@/lib/api/marketingApi";
import {
  createSocialPostDraft,
  generateContentStudioVariations,
} from "@/lib/api/marketingAiApi";
import {
  AiUsageLimit,
  ContentStudioRequestSchema,
  ContentStudioResponse,
  ContentVariation,
  formatVariationForClipboard,
  GOAL_LABELS,
  MARKETING_GOALS,
  MARKETING_PLATFORMS,
  MARKETING_TONES,
  MarketingGoal,
  MarketingPlatform,
  MarketingTone,
  normalizeHashtags,
  PLATFORM_CHAR_GUIDANCE,
  SocialPostDraft,
  TONE_LABELS,
} from "@/lib/schemas/marketingAiSchemas";
import {
  normalizeMarketingAiError,
  NormalizedMarketingAiError,
} from "@/lib/utils/marketingAiErrors";
import { AiBadge } from "@/components/ai/AiBadge";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { useConfirm } from "@/components/common/ConfirmProvider";
import { AiErrorAlert } from "@/components/marketing/ai/AiErrorAlert";

export interface ContentStudioSeed {
  platform?: MarketingPlatform;
  objective?: MarketingGoal;
  topicOrBrief?: string;
  targetAudience?: string;
  tone?: MarketingTone;
  ctaPreference?: string;
  campaignId?: string;
  seedKey?: number;
}

interface ContentStudioPanelProps {
  campaigns: Campaign[];
  usage: AiUsageLimit | null;
  seed: ContentStudioSeed | null;
  onUsageUpdated: (usage: AiUsageLimit) => void;
  onDraftCreated: (draft: SocialPostDraft) => void;
  onNotify: (type: "success" | "error", message: string) => void;
}

export const ContentStudioPanel: React.FC<ContentStudioPanelProps> = ({
  campaigns,
  usage,
  seed,
  onUsageUpdated,
  onDraftCreated,
  onNotify,
}) => {
  const requestConfirmation = useConfirm();

  const [platform, setPlatform] = useState<MarketingPlatform>("Instagram");
  const [objective, setObjective] = useState<MarketingGoal>("PRODUCT_LAUNCH");
  const [topicOrBrief, setTopicOrBrief] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [tone, setTone] = useState<MarketingTone>("FRIENDLY");
  const [variationCount, setVariationCount] = useState<number>(2);
  const [includeHashtags, setIncludeHashtags] = useState<boolean>(true);
  const [ctaPreference, setCtaPreference] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [apiError, setApiError] = useState<NormalizedMarketingAiError | null>(
    null
  );
  const [studioResult, setStudioResult] =
    useState<ContentStudioResponse | null>(null);
  const [variations, setVariations] = useState<ContentVariation[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const isQuotaExhausted = usage !== null && usage.remaining <= 0;

  // Apply external seed when user clicks "Open in Content Studio" or "AI Copy" on a campaign
  useEffect(() => {
    if (!seed) return;
    if (seed.platform) setPlatform(seed.platform);
    if (seed.objective) setObjective(seed.objective);
    if (seed.topicOrBrief) setTopicOrBrief(seed.topicOrBrief);
    if (seed.targetAudience !== undefined)
      setTargetAudience(seed.targetAudience);
    if (seed.tone) setTone(seed.tone);
    if (seed.ctaPreference !== undefined) setCtaPreference(seed.ctaPreference);
    if (seed.campaignId !== undefined) setCampaignId(seed.campaignId);
    setFormError(null);
  }, [seed]);

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFormError(null);
    setApiError(null);

    if (isQuotaExhausted) {
      setApiError({
        code: "RATE_LIMITED",
        title: "AI generation limit reached",
        message:
          "You have used all available AI Content Studio credits for this period.",
        retryable: false,
        resetAt: usage?.resetAt,
      });
      return;
    }

    const candidate = {
      platform,
      objective,
      topicOrBrief,
      targetAudience: targetAudience.trim() || undefined,
      tone,
      variationCount,
      includeHashtags,
      campaignId: campaignId || undefined,
      callToActionPreference: ctaPreference.trim() || undefined,
    };

    const parsed = ContentStudioRequestSchema.safeParse(candidate);
    if (!parsed.success) {
      setFormError(
        parsed.error.issues[0]?.message ||
          "Please complete the required Content Studio fields."
      );
      return;
    }

    setGenerating(true);
    try {
      const response = await generateContentStudioVariations(parsed.data);
      setStudioResult(response);
      setVariations(response.variations);
      if (response.usage) {
        onUsageUpdated(response.usage);
      }
    } catch (err) {
      setApiError(normalizeMarketingAiError(err));
    } finally {
      setGenerating(false);
    }
  };

  const updateVariation = (
    id: string,
    field: keyof ContentVariation,
    value: any
  ) => {
    setVariations((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );
  };

  const handleCopyVariation = async (v: ContentVariation) => {
    const text = formatVariationForClipboard({
      headline: v.headline,
      copy: v.copy,
      cta: v.cta,
      hashtags: v.hashtags,
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(v.id);
      onNotify("success", "Post copy copied to clipboard");
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      onNotify("error", "Clipboard access failed");
    }
  };

  const handleSendToSocialDraft = async (v: ContentVariation) => {
    const ok = await requestConfirmation({
      title: "Send to Social Media Draft Composer",
      message: `Save "${v.headline}" for ${v.platform} as a DRAFT post? Nothing will be published automatically.`,
      confirmText: "Save as Social Draft",
      variant: "primary",
    });
    if (!ok) return;

    setSendingId(v.id);
    setApiError(null);
    try {
      const created = await createSocialPostDraft({
        platform: v.platform,
        objective: v.objective,
        title: v.headline,
        headline: v.headline,
        copy: v.copy,
        cta: v.cta,
        hashtags: v.hashtags,
        suggestedCreativeBrief: v.suggestedCreativeBrief,
        campaignId: campaignId || null,
        source: "AI_CONTENT_STUDIO",
        aiGenerationId: studioResult?.generationId,
      });

      // Notify any mounted Social Draft Composer widget (Ayush's integration hook)
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("zyoris:social-draft-created", { detail: created })
        );
      }

      onDraftCreated(created);
      onNotify(
        "success",
        `Sent "${created.title}" to Social Drafts (saved as DRAFT)`
      );
    } catch (err) {
      const normalized = normalizeMarketingAiError(err);
      setApiError(normalized);
      onNotify("error", normalized.message);
    } finally {
      setSendingId(null);
    }
  };

  const charLimit = PLATFORM_CHAR_GUIDANCE[platform] || 2200;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      {/* Left Column: Studio Brief Controls */}
      <div className="xl:col-span-4">
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5 sm:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FileText size={18} className="text-indigo-600" />
              AI Content Studio
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Generate editable post and ad-copy variations, refine hashtags and CTAs, and send drafts straight to your Social Draft Composer.
            </p>
          </div>

          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Platform
                </label>
                <select
                  value={platform}
                  onChange={(e) =>
                    setPlatform(e.target.value as MarketingPlatform)
                  }
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                >
                  {MARKETING_PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {p} (recommended max ~{PLATFORM_CHAR_GUIDANCE[p]} chars)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Objective
                </label>
                <select
                  value={objective}
                  onChange={(e) =>
                    setObjective(e.target.value as MarketingGoal)
                  }
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                >
                  {MARKETING_GOALS.map((g) => (
                    <option key={g} value={g}>
                      {GOAL_LABELS[g]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Post / Ad Topic or Brief <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                value={topicOrBrief}
                onChange={(e) => setTopicOrBrief(e.target.value)}
                placeholder="Example: Announce our autumn onboarding package — 20% off first 3 months for growing sales teams."
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tone
                </label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value as MarketingTone)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-800 bg-white focus:outline-none focus:border-purple-500"
                >
                  {MARKETING_TONES.map((t) => (
                    <option key={t} value={t}>
                      {TONE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Variations
                </label>
                <select
                  value={variationCount}
                  onChange={(e) => setVariationCount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-800 bg-white focus:outline-none focus:border-purple-500"
                >
                  <option value={1}>1 variation</option>
                  <option value={2}>2 variations</option>
                  <option value={3}>3 variations</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Audience (Optional)
              </label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g., B2B founders, local cafe owners"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preferred CTA (Optional)
              </label>
              <input
                type="text"
                value={ctaPreference}
                onChange={(e) => setCtaPreference(e.target.value)}
                placeholder="e.g., Book a free demo, Learn more"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Link to Campaign (Optional)
              </label>
              <select
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-800 bg-white focus:outline-none focus:border-purple-500"
              >
                <option value="">No linked campaign</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.channel})
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={includeHashtags}
                onChange={(e) => setIncludeHashtags(e.target.checked)}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <Hash size={13} className="text-gray-400" />
              Include suggested hashtags
            </label>

            {formError && (
              <p className="text-xs text-red-600 font-medium">{formError}</p>
            )}

            <button
              type="submit"
              disabled={generating || isQuotaExhausted}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-purple-500/20 hover:shadow-purple-500/35 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Writing Variations…
                </>
              ) : isQuotaExhausted ? (
                "AI Usage Limit Reached"
              ) : (
                <>
                  <Sparkles size={17} />
                  Generate Copy Variations
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Right Column: Editable Variations Workspace */}
      <div className="xl:col-span-8 space-y-4">
        {apiError && (
          <AiErrorAlert
            error={apiError}
            onRetry={() => handleGenerate()}
            onDismiss={() => setApiError(null)}
          />
        )}

        {generating ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-gray-200/80 p-6 space-y-3 animate-pulse"
              >
                <div className="h-5 w-44 bg-purple-100 rounded-full" />
                <div className="h-4 w-2/3 bg-gray-100 rounded" />
                <div className="h-24 bg-gray-100 rounded-xl" />
              </div>
            ))}
          </div>
        ) : variations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 text-center flex flex-col items-center justify-center min-h-[420px]">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
              <Edit3 size={22} />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1.5">
              No variations generated yet
            </h3>
            <p className="text-sm text-gray-500 max-w-md">
              Choose a platform, describe your topic, and generate structured variations you can edit inline, copy, or send straight to Social Drafts.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-2xl border border-gray-200/80 px-5 py-3.5 shadow-sm">
              <div className="flex items-center gap-2 flex-wrap">
                <AiBadge label="AI Draft Variations" />
                <span className="text-xs text-gray-500">
                  {studioResult?.disclaimer}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleGenerate()}
                disabled={generating || isQuotaExhausted}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw size={13} />
                Generate Fresh Variations
              </button>
            </div>

            {variations.map((v) => {
              const copyLen = v.copy.length;
              const overLimit = copyLen > charLimit;
              return (
                <div
                  key={v.id}
                  className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-gray-900">
                        {v.variationLabel}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-medium">
                        {v.platform}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                        {v.objective}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        overLimit ? "text-amber-700" : "text-gray-400"
                      }`}
                    >
                      {copyLen} / {charLimit} chars
                      {overLimit ? " (exceeds typical limit)" : ""}
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                      Headline / Hook
                    </label>
                    <input
                      type="text"
                      value={v.headline}
                      onChange={(e) =>
                        updateVariation(v.id, "headline", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                      Post / Ad Copy
                    </label>
                    <textarea
                      rows={4}
                      value={v.copy}
                      onChange={(e) =>
                        updateVariation(v.id, "copy", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                        Call to Action (CTA)
                      </label>
                      <input
                        type="text"
                        value={v.cta}
                        onChange={(e) =>
                          updateVariation(v.id, "cta", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                        Hashtags
                      </label>
                      <input
                        type="text"
                        value={v.hashtags.join(" ")}
                        onChange={(e) =>
                          updateVariation(
                            v.id,
                            "hashtags",
                            normalizeHashtags(e.target.value)
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                      Suggested Creative Brief (Visual / Video Idea)
                    </label>
                    <input
                      type="text"
                      value={v.suggestedCreativeBrief}
                      onChange={(e) =>
                        updateVariation(
                          v.id,
                          "suggestedCreativeBrief",
                          e.target.value
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleCopyVariation(v)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      {copiedId === v.id ? (
                        <>
                          <Check size={14} className="text-emerald-600" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          Copy Full Post
                        </>
                      )}
                    </button>

                    <PermissionGuard
                      permission="campaigns.create"
                      action="disable"
                      disabledTooltip="You need campaigns.create permission to send output to Social Drafts."
                    >
                      <button
                        type="button"
                        onClick={() => handleSendToSocialDraft(v)}
                        disabled={sendingId === v.id}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-semibold hover:opacity-95 transition-all disabled:opacity-60 sm:ml-auto"
                      >
                        {sendingId === v.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Send size={14} />
                        )}
                        Send to Social Draft Composer
                      </button>
                    </PermissionGuard>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
