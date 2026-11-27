"use client";
import { PermissionGuard } from "@/components/auth/PermissionGuard";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Plus,
  Megaphone,
  X,
  Sparkles,
  Wand2,
  FileEdit,
  Layers,
} from "lucide-react";
import {
  Campaign,
  CampaignStatus,
  CampaignChannel,
  getCampaigns,
  deleteCampaign,
} from "@/lib/api/marketingApi";
import {
  getMarketingAiUsage,
  getSocialPostDrafts,
} from "@/lib/api/marketingAiApi";
import {
  AiUsageLimit,
  MARKETING_PLATFORMS,
  MarketingPlatform,
  SocialPostDraft,
} from "@/lib/schemas/marketingAiSchemas";
import {
  normalizeMarketingAiError,
  NormalizedMarketingAiError,
} from "@/lib/utils/marketingAiErrors";
import CampaignStatsCards from "@/components/marketing/campaigns/CampaignStatsCards";
import CampaignTable from "@/components/marketing/campaigns/CampaignTable";
import CampaignModals from "@/components/marketing/campaigns/CampaignModals";
import { AiUsageBanner } from "@/components/marketing/ai/AiUsageBanner";
import { AiMarketingAssistantPanel } from "@/components/marketing/ai/AiMarketingAssistantPanel";
import {
  ContentStudioPanel,
  ContentStudioSeed,
} from "@/components/marketing/ai/ContentStudioPanel";
import { SocialDraftsQueuePanel } from "@/components/marketing/ai/SocialDraftsQueuePanel";
import { useConfirm } from "@/components/common/ConfirmProvider";

// ── Toast ─────────────────────────────────────────────────
interface ToastMessage {
  type: "success" | "error";
  message: string;
}

const Toast: React.FC<{ toast: ToastMessage; onClose: () => void }> = ({
  toast,
  onClose,
}) => (
  <div
    className={`fixed top-6 right-6 z-[9999] px-5 py-3.5 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-3 animate-slide-in ${
      toast.type === "success"
        ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
        : "bg-red-50 border border-red-200 text-red-800"
    }`}
  >
    <span>{toast.type === "success" ? "✓" : "✕"}</span>
    {toast.message}
    <button onClick={onClose} className="ml-2 hover:opacity-70">
      <X size={16} />
    </button>
  </div>
);

type MarketingTab = "campaigns" | "assistant" | "studio" | "drafts";

const VALID_TABS: MarketingTab[] = [
  "campaigns",
  "assistant",
  "studio",
  "drafts",
];

// ── Main Page ────────────────────────────────────────────
const PAGE_SIZE = 10;

export default function CampaignsPage() {
  const requestConfirmation = useConfirm();
  const [activeTab, setActiveTab] = useState<MarketingTab>("campaigns");

  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Filters (client‑side)
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | "ALL">(
    "ALL"
  );
  const [channelFilter, setChannelFilter] = useState<CampaignChannel | "ALL">(
    "ALL"
  );
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [viewingCampaign, setViewingCampaign] = useState<Campaign | null>(null);
  const [performanceCampaignId, setPerformanceCampaignId] = useState<
    string | null
  >(null);

  // AI Marketing Assistant & Content Studio State
  const [usage, setUsage] = useState<AiUsageLimit | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageUnavailable, setUsageUnavailable] = useState(false);
  const [studioSeed, setStudioSeed] = useState<ContentStudioSeed | null>(null);

  // Social Drafts Queue State
  const [socialDrafts, setSocialDrafts] = useState<SocialPostDraft[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftsError, setDraftsError] =
    useState<NormalizedMarketingAiError | null>(null);

  const showToast = useCallback(
    (type: "success" | "error", message: string) => {
      setToast({ type, message });
    },
    []
  );

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Read ?tab=... safely on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const t = params.get("tab") as MarketingTab | null;
    if (t && VALID_TABS.includes(t)) {
      setActiveTab(t);
    }
  }, []);

  const switchTab = useCallback((tab: MarketingTab) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (tab === "campaigns") {
        url.searchParams.delete("tab");
      } else {
        url.searchParams.set("tab", tab);
      }
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  // Fetch all campaigns
  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCampaigns(); // no filters passed
      setAllCampaigns(data);
    } catch (err: any) {
      setError(err.message || "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAiUsage = useCallback(async () => {
    setUsageLoading(true);
    setUsageUnavailable(false);
    try {
      const data = await getMarketingAiUsage();
      setUsage(data);
    } catch {
      setUsageUnavailable(true);
    } finally {
      setUsageLoading(false);
    }
  }, []);

  const loadSocialDrafts = useCallback(async () => {
    setDraftsLoading(true);
    setDraftsError(null);
    try {
      const list = await getSocialPostDrafts();
      setSocialDrafts(list);
    } catch (err) {
      setDraftsError(normalizeMarketingAiError(err));
    } finally {
      setDraftsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  useEffect(() => {
    if (activeTab === "assistant" || activeTab === "studio") {
      loadAiUsage();
    }
    if (activeTab === "drafts") {
      loadSocialDrafts();
    }
  }, [activeTab, loadAiUsage, loadSocialDrafts]);

  // Client‑side filtering
  const filteredCampaigns = useMemo(() => {
    let result = allCampaigns;

    if (statusFilter !== "ALL") {
      result = result.filter((c) => c.status === statusFilter);
    }
    if (channelFilter !== "ALL") {
      result = result.filter((c) => c.channel === channelFilter);
    }
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.channel.toLowerCase().includes(q)
      );
    }
    return result;
  }, [allCampaigns, statusFilter, channelFilter, searchQuery]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredCampaigns.length / PAGE_SIZE));
  const paginatedCampaigns = filteredCampaigns.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredCampaigns.length]);

  // Handlers
  const handleDelete = async (id: string) => {
    const ok = await requestConfirmation({
      title: "Delete Campaign",
      message: "Are you sure you want to delete this campaign?",
      confirmText: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await deleteCampaign(id);
      setAllCampaigns((prev) => prev.filter((c) => c.id !== id));
      showToast("success", "Campaign deleted");
    } catch (err: any) {
      showToast("error", err.message || "Delete failed");
    }
  };

  const handleFormSuccess = (campaign: Campaign) => {
    if (editingCampaign) {
      setAllCampaigns((prev) =>
        prev.map((c) => (c.id === campaign.id ? campaign : c))
      );
    } else {
      setAllCampaigns((prev) => [campaign, ...prev]);
    }
    showToast("success", "Campaign saved successfully");
  };

  const handleCampaignCreatedFromAi = (campaign: Campaign) => {
    setAllCampaigns((prev) => [campaign, ...prev]);
  };

  const handleOpenInStudioFromCampaign = (campaign: Campaign) => {
    const matchedPlatform = MARKETING_PLATFORMS.includes(
      campaign.channel as MarketingPlatform
    )
      ? (campaign.channel as MarketingPlatform)
      : "Instagram";
    setStudioSeed({
      platform: matchedPlatform,
      objective: "LEAD_GENERATION",
      topicOrBrief: `Create promotional copy for campaign "${campaign.name}" on ${campaign.channel}.`,
      campaignId: campaign.id,
      tone: "FRIENDLY",
      seedKey: Date.now(),
    });
    switchTab("studio");
  };

  const clearFilters = () => {
    setStatusFilter("ALL");
    setChannelFilter("ALL");
    setSearchQuery("");
  };

  const tabs: Array<{
    id: MarketingTab;
    label: string;
    icon: React.ElementType;
    badge?: number;
  }> = [
    { id: "campaigns", label: "Campaigns", icon: Layers },
    { id: "assistant", label: "AI Marketing Assistant", icon: Wand2 },
    { id: "studio", label: "AI Content Studio", icon: Sparkles },
    {
      id: "drafts",
      label: "Social Drafts",
      icon: FileEdit,
      badge: socialDrafts.length > 0 ? socialDrafts.length : undefined,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 px-4 sm:px-6 py-8 max-w-[1400px] mx-auto">
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      {/* Modals */}
      <CampaignModals
        showCreate={showCreate}
        editingCampaign={editingCampaign}
        viewingCampaign={viewingCampaign}
        performanceCampaignId={performanceCampaignId}
        campaigns={allCampaigns}
        onCloseCreate={() => setShowCreate(false)}
        onCloseEdit={() => setEditingCampaign(null)}
        onCloseView={() => setViewingCampaign(null)}
        onClosePerformance={() => setPerformanceCampaignId(null)}
        onFormSuccess={handleFormSuccess}
      />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
              <Megaphone size={20} className="text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Marketing
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Track campaigns, plan goals with AI Marketing Assistant, and craft editable drafts in Content Studio
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {activeTab === "campaigns" && (
            <button
              type="button"
              onClick={() => switchTab("assistant")}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-purple-200 text-purple-700 text-sm font-semibold rounded-xl hover:bg-purple-50 transition-all shadow-sm"
            >
              <Sparkles size={16} /> AI Assistant
            </button>
          )}
          <PermissionGuard permission="campaigns.create">
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all"
            >
              <Plus size={18} /> New Campaign
            </button>
          </PermissionGuard>
        </div>
      </div>

      {/* Connected Marketing Workspace Tabs */}
      <div className="mb-6 border-b border-gray-200/80 overflow-x-auto">
        <nav
          className="flex items-center gap-1 min-w-max"
          aria-label="Marketing sections"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => switchTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? "border-purple-600 text-purple-700 bg-purple-50/40 rounded-t-xl"
                    : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-t-xl"
                }`}
              >
                <Icon size={16} />
                {tab.label}
                {tab.badge !== undefined && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {activeTab === "campaigns" && (
        <>
          {/* Stats Cards */}
          {!loading && !error && <CampaignStatsCards campaigns={allCampaigns} />}

          {/* Table with Filters */}
          <CampaignTable
            campaigns={filteredCampaigns}
            loading={loading}
            error={error}
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            channelFilter={channelFilter}
            currentPage={currentPage}
            totalPages={totalPages}
            paginatedCampaigns={paginatedCampaigns}
            onSearchChange={setSearchQuery}
            onStatusChange={setStatusFilter}
            onChannelChange={setChannelFilter}
            onClearFilters={clearFilters}
            onRefresh={loadCampaigns}
            onView={setViewingCampaign}
            onEdit={setEditingCampaign}
            onDelete={handleDelete}
            onPerformance={setPerformanceCampaignId}
            onAiCopy={handleOpenInStudioFromCampaign}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      {activeTab === "assistant" && (
        <>
          <AiUsageBanner
            usage={usage}
            usageLoading={usageLoading}
            usageUnavailable={usageUnavailable}
            onRefreshUsage={loadAiUsage}
          />
          <AiMarketingAssistantPanel
            campaigns={allCampaigns}
            usage={usage}
            onUsageUpdated={setUsage}
            onCampaignCreated={handleCampaignCreatedFromAi}
            onOpenInContentStudio={(seed) => {
              setStudioSeed({ ...seed, seedKey: Date.now() });
              switchTab("studio");
            }}
            onNotify={showToast}
          />
        </>
      )}

      {activeTab === "studio" && (
        <>
          <AiUsageBanner
            usage={usage}
            usageLoading={usageLoading}
            usageUnavailable={usageUnavailable}
            onRefreshUsage={loadAiUsage}
          />
          <ContentStudioPanel
            campaigns={allCampaigns}
            usage={usage}
            seed={studioSeed}
            onUsageUpdated={setUsage}
            onDraftCreated={(draft) => {
              setSocialDrafts((prev) => [draft, ...prev]);
            }}
            onNotify={showToast}
          />
        </>
      )}

      {activeTab === "drafts" && (
        <>
          <AiUsageBanner
            usage={usage}
            usageLoading={usageLoading}
            usageUnavailable={usageUnavailable}
          />
          <SocialDraftsQueuePanel
            drafts={socialDrafts}
            loading={draftsLoading}
            error={draftsError}
            onRefresh={loadSocialDrafts}
            onDraftUpdated={(updated) =>
              setSocialDrafts((prev) =>
                prev.map((d) => (d.id === updated.id ? updated : d))
              )
            }
            onDraftDeleted={(id) =>
              setSocialDrafts((prev) => prev.filter((d) => d.id !== id))
            }
            onGoToStudio={() => switchTab("studio")}
            onNotify={showToast}
          />
        </>
      )}

      {/* Animation styles */}
      <style jsx>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-slide-in { animation: slideIn 0.3s ease-out; }
        .animate-scale-in { animation: scaleIn 0.2s ease-out; }
      `}</style>
    </div>
  );
}
