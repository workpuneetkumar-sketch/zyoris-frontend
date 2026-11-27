"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Sparkles,
  Wand2,
  Copy,
  Check,
  ArrowRight,
  FolderPlus,
  Loader2,
  BarChart3,
  Lightbulb,
  Edit3,
  Database,
  RefreshCw,
} from "lucide-react";
import { Campaign, createCampaign } from "@/lib/api/marketingApi";
import {
  fetchMarketingGroundingContext,
  generateMarketingAssistantPlan,
  MarketingGroundingContext,
} from "@/lib/api/marketingAiApi";
import {
  AiAssistantRequestSchema,
  AiAssistantResponse,
  AiRecommendation,
  AiUsageLimit,
  formatVariationForClipboard,
  GOAL_LABELS,
  mapPlatformToCampaignChannel,
  MARKETING_GOALS,
  MARKETING_PLATFORMS,
  MARKETING_TONES,
  MarketingGoal,
  MarketingPlatform,
  MarketingTone,
  normalizeHashtags,
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

interface AiMarketingAssistantPanelProps {
  campaigns: Campaign[];
  usage: AiUsageLimit | null;
  onUsageUpdated: (usage: AiUsageLimit) => void;
  onCampaignCreated: (campaign: Campaign) => void;
  onOpenInContentStudio: (seed: {
    platform: MarketingPlatform;
    objective: MarketingGoal;
    topicOrBrief: string;
    targetAudience?: string;
    tone: MarketingTone;
    ctaPreference?: string;
    campaignId?: string;
  }) => void;
  onNotify: (type: "success" | "error", message: string) => void;
}

const GUIDED_STARTERS: Array<{
  label: string;
  goal: MarketingGoal;
  platforms: MarketingPlatform[];
  tone: MarketingTone;
  promptHint: string;
  audienceHint: string;
}> = [
  {
    label: "Get more leads",
    goal: "LEAD_GENERATION",
    platforms: ["LinkedIn", "Email"],
    tone: "PROFESSIONAL",
    promptHint:
      "We help small and mid-sized businesses save time with our core service/product. Looking for a simple lead-generation campaign inviting prospects to book a quick demo.",
    audienceHint: "Founders, team leads, and decision-makers",
  },
  {
    label: "Launch a new product",
    goal: "PRODUCT_LAUNCH",
    platforms: ["Instagram", "LinkedIn"],
    tone: "BOLD",
    promptHint:
      "We are launching a new product feature that solves an everyday customer pain point quickly and affordably.",
    audienceHint: "Existing customers and early adopters",
  },
  {
    label: "Promote a limited offer",
    goal: "SALES_CONVERSION",
    platforms: ["Facebook", "Instagram"],
    tone: "URGENT",
    promptHint:
      "Running a 7-day introductory offer for first-time buyers with clear savings and simple sign-up.",
    audienceHint: "Price-conscious shoppers and warm prospects",
  },
  {
    label: "Educate & build trust",
    goal: "ENGAGEMENT",
    platforms: ["LinkedIn", "Twitter"],
    tone: "EDUCATIONAL",
    promptHint:
      "Share 3 practical tips that help our audience avoid common mistakes in our industry without a hard sales pitch.",
    audienceHint: "Industry peers and curious buyers",
  },
];

export const AiMarketingAssistantPanel: React.FC<
  AiMarketingAssistantPanelProps
> = ({
  campaigns,
  usage,
  onUsageUpdated,
  onCampaignCreated,
  onOpenInContentStudio,
  onNotify,
}) => {
  const requestConfirmation = useConfirm();

  // Brief Form State
  const [businessDescription, setBusinessDescription] = useState("");
  const [goal, setGoal] = useState<MarketingGoal>("LEAD_GENERATION");
  const [targetAudience, setTargetAudience] = useState("");
  const [platforms, setPlatforms] = useState<MarketingPlatform[]>([
    "LinkedIn",
    "Instagram",
  ]);
  const [tone, setTone] = useState<MarketingTone>("FRIENDLY");
  const [budgetHint, setBudgetHint] = useState<string>("");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [includePerformanceContext, setIncludePerformanceContext] =
    useState<boolean>(true);
  const [formValidationError, setFormValidationError] = useState<string | null>(
    null
  );

  // Live Grounding Context State
  const [grounding, setGrounding] = useState<MarketingGroundingContext | null>(
    null
  );
  const [groundingLoading, setGroundingLoading] = useState(true);

  // Generation State
  const [generating, setGenerating] = useState(false);
  const [apiError, setApiError] = useState<NormalizedMarketingAiError | null>(
    null
  );
  const [result, setResult] = useState<AiAssistantResponse | null>(null);
  const [editableRecs, setEditableRecs] = useState<AiRecommendation[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savingDraftId, setSavingDraftId] = useState<string | null>(null);

  const isQuotaExhausted = usage !== null && usage.remaining <= 0;

  const loadGrounding = useCallback(async () => {
    setGroundingLoading(true);
    try {
      const ctx = await fetchMarketingGroundingContext();
      setGrounding(ctx);
    } catch {
      setGrounding(null);
    } finally {
      setGroundingLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGrounding();
  }, [loadGrounding]);

  const togglePlatform = (p: MarketingPlatform) => {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((item) => item !== p) : [...prev, p]
    );
  };

  const applyStarter = (starter: (typeof GUIDED_STARTERS)[number]) => {
    setGoal(starter.goal);
    setPlatforms(starter.platforms);
    setTone(starter.tone);
    if (!businessDescription.trim()) {
      setBusinessDescription(starter.promptHint);
    }
    if (!targetAudience.trim()) {
      setTargetAudience(starter.audienceHint);
    }
    setFormValidationError(null);
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFormValidationError(null);
    setApiError(null);

    if (isQuotaExhausted) {
      setApiError({
        code: "RATE_LIMITED",
        title: "AI generation limit reached",
        message:
          "You have 0 AI credits remaining for this period. Please wait for reset before generating new suggestions.",
        retryable: false,
        resetAt: usage?.resetAt,
      });
      return;
    }

    const parsedBudget =
      budgetHint.trim() !== "" ? Number(budgetHint) : undefined;

    const candidatePayload = {
      businessDescription,
      goal,
      targetAudience,
      platforms,
      tone,
      budgetHint:
        parsedBudget !== undefined && !Number.isNaN(parsedBudget)
          ? parsedBudget
          : undefined,
      campaignId: selectedCampaignId || undefined,
      includePerformanceContext,
    };

    const clientCheck = AiAssistantRequestSchema.safeParse(candidatePayload);
    if (!clientCheck.success) {
      setFormValidationError(
        clientCheck.error.issues[0]?.message ||
          "Please complete the required brief fields."
      );
      return;
    }

    setGenerating(true);
    try {
      const response = await generateMarketingAssistantPlan(clientCheck.data);
      setResult(response);
      setEditableRecs(response.recommendations);
      if (response.usage) {
        onUsageUpdated(response.usage);
      }
    } catch (err) {
      setApiError(normalizeMarketingAiError(err));
    } finally {
      setGenerating(false);
    }
  };

  const updateRecommendationField = (
    id: string,
    field: keyof AiRecommendation,
    value: any
  ) => {
    setEditableRecs((prev) =>
      prev.map((rec) => (rec.id === id ? { ...rec, [field]: value } : rec))
    );
  };

  const handleCopy = async (rec: AiRecommendation) => {
    const formatted = formatVariationForClipboard({
      headline: rec.campaignName || `${rec.platform} — ${rec.objective}`,
      copy: rec.copy,
      cta: rec.cta,
      hashtags: rec.hashtags,
    });
    try {
      await navigator.clipboard.writeText(formatted);
      setCopiedId(rec.id);
      onNotify("success", "Suggestion copied to clipboard");
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      onNotify("error", "Could not access clipboard");
    }
  };

  const handleSaveAsDraftCampaign = async (rec: AiRecommendation) => {
    const safeBudget =
      typeof rec.suggestedBudget === "number" && rec.suggestedBudget >= 0
        ? rec.suggestedBudget
        : 0;
    const channel = mapPlatformToCampaignChannel(
      rec.suggestedChannel || rec.platform
    );
    const campaignTitle =
      rec.campaignName?.trim() || `${rec.platform} ${rec.objective} Draft`;

    const approved = await requestConfirmation({
      title: "Save as Draft Campaign",
      message: `Create "${campaignTitle}" on ${channel} with status DRAFT? No ads will be published and no budget will be spent automatically.`,
      confirmText: "Create Draft Campaign",
      variant: "primary",
    });
    if (!approved) return;

    const today = new Date();
    const twoWeeksLater = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

    setSavingDraftId(rec.id);
    try {
      const created = await createCampaign({
        name: campaignTitle,
        budget: safeBudget,
        channel,
        startDate: today.toISOString().slice(0, 10),
        endDate: twoWeeksLater.toISOString().slice(0, 10),
        status: "DRAFT",
      });
      onCampaignCreated(created);
      onNotify(
        "success",
        `Saved "${created.name}" as a DRAFT campaign (not published)`
      );
    } catch (err: any) {
      onNotify(
        "error",
        err?.response?.data?.message ||
          err?.message ||
          "Could not save draft campaign"
      );
    } finally {
      setSavingDraftId(null);
    }
  };

  const handleSendToStudio = (rec: AiRecommendation) => {
    const matchedPlatform = MARKETING_PLATFORMS.includes(
      rec.platform as MarketingPlatform
    )
      ? (rec.platform as MarketingPlatform)
      : "Instagram";

    onOpenInContentStudio({
      platform: matchedPlatform,
      objective: goal,
      topicOrBrief: `${rec.copy}\n\nCreative direction: ${rec.suggestedCreativeBrief}`,
      targetAudience,
      tone,
      ctaPreference: rec.cta,
      campaignId: selectedCampaignId || undefined,
    });
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      {/* Left Column: Guided Brief Builder */}
      <div className="xl:col-span-5 space-y-5">
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Wand2 size={18} className="text-purple-600" />
                Describe Your Marketing Goal
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Tell us in plain English what you want to promote. We&apos;ll suggest campaign ideas, copy, and creative direction as editable drafts.
              </p>
            </div>
          </div>

          {/* Beginner-friendly Starter Chips */}
          <div className="mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Quick starter ideas
            </p>
            <div className="flex flex-wrap gap-2">
              {GUIDED_STARTERS.map((starter) => (
                <button
                  key={starter.label}
                  type="button"
                  onClick={() => applyStarter(starter)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-200/80 bg-purple-50/60 text-purple-800 text-xs font-medium hover:bg-purple-100/80 transition-colors"
                >
                  <Lightbulb size={12} />
                  {starter.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                What are you promoting? <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={businessDescription}
                onChange={(e) => setBusinessDescription(e.target.value)}
                placeholder="Example: We run a B2B accounting tool for startups and want more free-trial signups this month."
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Main Goal
                </label>
                <select
                  value={goal}
                  onChange={(e) => setGoal(e.target.value as MarketingGoal)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                >
                  {MARKETING_GOALS.map((g) => (
                    <option key={g} value={g}>
                      {GOAL_LABELS[g]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Voice & Tone
                </label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value as MarketingTone)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                >
                  {MARKETING_TONES.map((t) => (
                    <option key={t} value={t}>
                      {TONE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Who is this for? (Target Audience){" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="Example: Small business owners, HR managers, or local shoppers"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Where do you want to reach them?
              </label>
              <div className="flex flex-wrap gap-2">
                {MARKETING_PLATFORMS.map((p) => {
                  const active = platforms.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePlatform(p)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                        active
                          ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Optional Budget Idea ($)
                </label>
                <input
                  type="number"
                  min={0}
                  step="1"
                  value={budgetHint}
                  onChange={(e) => setBudgetHint(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link Existing Campaign
                </label>
                <select
                  value={selectedCampaignId}
                  onChange={(e) => setSelectedCampaignId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                >
                  <option value="">None (Fresh brief)</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.channel})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-200/70 cursor-pointer">
              <input
                type="checkbox"
                checked={includePerformanceContext}
                onChange={(e) => setIncludePerformanceContext(e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-xs text-gray-700 leading-relaxed">
                Ground suggestions in live Zyoris campaign & analytics context when available.
              </span>
            </label>

            {formValidationError && (
              <p className="text-xs text-red-600 font-medium">
                {formValidationError}
              </p>
            )}

            <button
              type="submit"
              disabled={generating || isQuotaExhausted}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-purple-500/20 hover:shadow-purple-500/35 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Generating Draft Suggestions…
                </>
              ) : isQuotaExhausted ? (
                "AI Usage Limit Reached"
              ) : (
                <>
                  <Sparkles size={17} />
                  Generate Marketing Suggestions
                </>
              )}
            </button>
          </form>
        </div>

        {/* Live Zyoris Grounding Context Card */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Database size={15} className="text-indigo-600" />
              Live Workspace Context
            </h3>
            <button
              type="button"
              onClick={loadGrounding}
              disabled={groundingLoading}
              className="text-xs text-gray-500 hover:text-gray-800 inline-flex items-center gap-1"
            >
              <RefreshCw
                size={12}
                className={groundingLoading ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>

          {groundingLoading ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-3.5 bg-gray-100 rounded w-3/4" />
              <div className="h-3.5 bg-gray-100 rounded w-1/2" />
            </div>
          ) : grounding ? (
            <div className="space-y-2 text-xs text-gray-600">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-[11px] text-gray-400">Campaigns</p>
                  <p className="text-sm font-bold text-gray-900">
                    {grounding.campaignsCount}{" "}
                    <span className="text-xs font-normal text-gray-500">
                      ({grounding.activeCampaignsCount} active)
                    </span>
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-[11px] text-gray-400">Marketing ROI</p>
                  <p className="text-sm font-bold text-gray-900">
                    {grounding.marketingRoi !== null
                      ? `${grounding.marketingRoi.toFixed(2)}x`
                      : "No data yet"}
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-gray-500">
                Connected apps:{" "}
                {grounding.connectedProviders.length > 0
                  ? grounding.connectedProviders.join(", ")
                  : "None connected in Integrations yet"}
              </p>
              {grounding.segments.length > 0 && (
                <p className="text-[11px] text-gray-500">
                  Segments:{" "}
                  {grounding.segments.map((s) => s.name).join(", ")}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-500">
              Could not load CRM context. You can still generate suggestions from your brief.
            </p>
          )}
        </div>
      </div>

      {/* Right Column: Validated Structured Outputs */}
      <div className="xl:col-span-7 space-y-4">
        {apiError && (
          <AiErrorAlert
            error={apiError}
            onRetry={() => handleGenerate()}
            onDismiss={() => setApiError(null)}
          />
        )}

        {generating ? (
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 space-y-4 animate-pulse">
            <div className="flex items-center gap-2">
              <div className="h-5 w-36 bg-purple-100 rounded-full" />
              <div className="h-4 w-24 bg-gray-100 rounded" />
            </div>
            <div className="h-4 bg-gray-100 rounded w-5/6" />
            <div className="h-32 bg-gray-100 rounded-xl" />
            <div className="h-32 bg-gray-100 rounded-xl" />
          </div>
        ) : !result ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 text-center flex flex-col items-center justify-center min-h-[380px]">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
              <Sparkles size={22} />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1.5">
              Ready to build your marketing plan
            </h3>
            <p className="text-sm text-gray-500 max-w-md mb-4">
              Fill out the brief on the left (or pick a quick starter idea) to get structured, editable campaign and copy suggestions.
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-500">
              <span className="px-3 py-1 rounded-full bg-gray-100">
                1. Describe goal
              </span>
              <span className="px-3 py-1 rounded-full bg-gray-100">
                2. Edit suggestions
              </span>
              <span className="px-3 py-1 rounded-full bg-gray-100">
                3. Save as Draft or send to Content Studio
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Strategy Summary Card */}
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <AiBadge label="AI Strategy Draft — Review Before Use" />
                <span className="text-[11px] text-gray-400">
                  ID: {result.suggestionId.slice(0, 8)}
                </span>
              </div>
              <p className="text-sm text-gray-800 leading-relaxed font-medium">
                {result.summary}
              </p>
              <p className="mt-2.5 text-xs text-amber-800 bg-amber-50 border border-amber-200/80 rounded-xl px-3 py-2">
                {result.disclaimer}
              </p>

              {result.groundedInsights.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5 mb-2">
                    <BarChart3 size={14} className="text-indigo-600" />
                    Grounded in your Zyoris data
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {result.groundedInsights.map((ins, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-xs"
                      >
                        <span className="font-semibold text-gray-800">
                          {ins.metricLabel}
                        </span>
                        <span className="text-gray-400 ml-1">
                          ({ins.source})
                        </span>
                        <p className="text-gray-600 mt-0.5">
                          {ins.observation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Editable Structured Recommendation Cards */}
            {editableRecs.map((rec, index) => (
              <div
                key={rec.id}
                className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-semibold">
                      {rec.platform}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium">
                      {rec.objective}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                      <Edit3 size={11} /> Editable Draft #{index + 1}
                    </span>
                  </div>
                  {rec.suggestedBudget !== undefined &&
                    rec.suggestedBudget !== null && (
                      <span className="text-xs font-medium text-gray-600">
                        Suggested Budget Idea: $
                        {rec.suggestedBudget.toLocaleString()}
                      </span>
                    )}
                </div>

                {rec.rationale && (
                  <p className="text-xs text-gray-500 italic">{rec.rationale}</p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                      Campaign Idea Name
                    </label>
                    <input
                      type="text"
                      value={rec.campaignName || ""}
                      onChange={(e) =>
                        updateRecommendationField(
                          rec.id,
                          "campaignName",
                          e.target.value
                        )
                      }
                      placeholder={`${rec.platform} ${rec.objective}`}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                      Call to Action (CTA)
                    </label>
                    <input
                      type="text"
                      value={rec.cta}
                      onChange={(e) =>
                        updateRecommendationField(rec.id, "cta", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                    Editable Post / Ad Copy
                  </label>
                  <textarea
                    rows={3}
                    value={rec.copy}
                    onChange={(e) =>
                      updateRecommendationField(rec.id, "copy", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                      Hashtags
                    </label>
                    <input
                      type="text"
                      value={rec.hashtags.join(" ")}
                      onChange={(e) =>
                        updateRecommendationField(
                          rec.id,
                          "hashtags",
                          normalizeHashtags(e.target.value)
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                      Suggested Creative Brief
                    </label>
                    <input
                      type="text"
                      value={rec.suggestedCreativeBrief}
                      onChange={(e) =>
                        updateRecommendationField(
                          rec.id,
                          "suggestedCreativeBrief",
                          e.target.value
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                {/* Action Row */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(rec)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {copiedId === rec.id ? (
                      <>
                        <Check size={14} className="text-emerald-600" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        Copy Copy
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendToStudio(rec)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold hover:bg-indigo-100 transition-colors"
                  >
                    Open in Content Studio
                    <ArrowRight size={14} />
                  </button>

                  <PermissionGuard
                    permission="campaigns.create"
                    action="disable"
                    disabledTooltip="You need campaigns.create permission to save a draft campaign."
                  >
                    <button
                      type="button"
                      onClick={() => handleSaveAsDraftCampaign(rec)}
                      disabled={savingDraftId === rec.id}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition-colors disabled:opacity-60 sm:ml-auto"
                    >
                      {savingDraftId === rec.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <FolderPlus size={14} />
                      )}
                      Save as Draft Campaign
                    </button>
                  </PermissionGuard>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
