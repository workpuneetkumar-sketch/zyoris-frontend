"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Plus, Megaphone, X } from "lucide-react";
import {
  Campaign,
  CampaignStatus,
  CampaignChannel,
  getCampaigns,
  deleteCampaign,
} from "@/lib/api/marketingApi";
import CampaignStatsCards from "@/components/marketing/campaigns/CampaignStatsCards";
import CampaignTable from "@/components/marketing/campaigns/CampaignTable";
import CampaignModals from "@/components/marketing/campaigns/CampaignModals";
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

// ── Main Page ────────────────────────────────────────────
const PAGE_SIZE = 10;

export default function CampaignsPage() {
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Filters (client‑side)
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | "ALL">("ALL");
  const [channelFilter, setChannelFilter] = useState<CampaignChannel | "ALL">("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [viewingCampaign, setViewingCampaign] = useState<Campaign | null>(null);
  const [performanceCampaignId, setPerformanceCampaignId] = useState<string | null>(null);

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

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

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
    if (!confirm("Are you sure you want to delete this campaign?")) return;
    try {
      await deleteCampaign(id);
      setAllCampaigns((prev) => prev.filter((c) => c.id !== id));
      setToast({ type: "success", message: "Campaign deleted" });
    } catch (err: any) {
      setToast({ type: "error", message: err.message || "Delete failed" });
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
    setToast({ type: "success", message: "Campaign saved successfully" });
  };

  const clearFilters = () => {
    setStatusFilter("ALL");
    setChannelFilter("ALL");
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 px-6 py-8 max-w-[1400px] mx-auto">
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
              <Megaphone size={20} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Track, manage, and optimise your marketing campaigns
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all"
        >
          <Plus size={18} /> New Campaign
        </button>
      </div>

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
        onPageChange={setCurrentPage}
      />

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