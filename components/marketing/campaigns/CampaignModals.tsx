"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Loader2,
  TrendingUp,
} from "lucide-react";
import {
  Campaign,
  CampaignStatus,
  CampaignChannel,
  CreateCampaignPayload,
  getCampaignPerformance,
  createCampaign,
  updateCampaign,
} from "@/lib/api/marketingApi";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// ── Status Badge (inline) ─────────────────────────────
const statusStyles: Record<CampaignStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700 border-gray-200",
  ACTIVE: "bg-green-50 text-green-700 border-green-200",
  PAUSED: "bg-yellow-50 text-yellow-700 border-yellow-200",
  COMPLETED: "bg-blue-50 text-blue-700 border-blue-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
};

const StatusBadge: React.FC<{ status: CampaignStatus }> = ({ status }) => (
  <span
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusStyles[status]}`}
  >
    {status.charAt(0) + status.slice(1).toLowerCase()}
  </span>
);

// ── Create/Edit Form Modal ─────────────────────────────
interface CampaignFormProps {
  mode: "create" | "edit";
  initialData?: Partial<Campaign>;
  onClose: () => void;
  onSuccess: (campaign: Campaign) => void;
}

const CampaignFormModal: React.FC<CampaignFormProps> = ({
  mode,
  initialData,
  onClose,
  onSuccess,
}) => {
  const [form, setForm] = useState<CreateCampaignPayload>({
    name: initialData?.name || "",
    budget: initialData?.budget || 0,
    channel: initialData?.channel || "Facebook",
    startDate: initialData?.startDate
      ? initialData.startDate.slice(0, 10)
      : "",
    endDate: initialData?.endDate ? initialData.endDate.slice(0, 10) : "",
    status: initialData?.status || "DRAFT",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      let campaign: Campaign;
      if (mode === "create") {
        campaign = await createCampaign(form);
      } else {
        if (!initialData?.id) throw new Error("No campaign ID");
        campaign = await updateCampaign(initialData.id, form);
      }
      onSuccess(campaign);
      onClose();
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || "An error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  const CHANNEL_OPTIONS: { value: CampaignChannel; label: string }[] = [
    { value: "Facebook", label: "Facebook" },
    { value: "Google Ads", label: "Google Ads" },
    { value: "LinkedIn", label: "LinkedIn" },
    { value: "Twitter", label: "Twitter" },
    { value: "Email", label: "Email" },
    { value: "Other", label: "Other" },
  ];

  const STATUS_OPTIONS: { value: CampaignStatus; label: string }[] = [
    { value: "DRAFT", label: "Draft" },
    { value: "ACTIVE", label: "Active" },
    { value: "PAUSED", label: "Paused" },
    { value: "COMPLETED", label: "Completed" },
    { value: "CANCELLED", label: "Cancelled" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-scale-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === "create" ? "New Campaign" : "Edit Campaign"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl text-gray-400"
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campaign Name
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 text-gray-800 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              placeholder="e.g., Summer Sale 2026"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Budget ($)
              </label>
              <input
                type="number"
                required
                min={0}
                step="0.01"
                value={form.budget}
                onChange={(e) =>
                  setForm({ ...form, budget: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 border border-gray-200 text-gray-800 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Channel
              </label>
              <select
                value={form.channel}
                onChange={(e) =>
                  setForm({
                    ...form,
                    channel: e.target.value as CampaignChannel,
                  })
                }
                className="w-full px-3 py-2 border border-gray-200 text-gray-800 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              >
                {CHANNEL_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                required
                value={form.startDate}
                onChange={(e) =>
                  setForm({ ...form, startDate: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 text-gray-800 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                required
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 text-gray-800 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as CampaignStatus })
              }
              className="w-full px-3 py-2 border border-gray-200 text-gray-800 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 rounded-xl border border-gray-200 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium rounded-xl bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-70 flex items-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {mode === "create" ? "Create" : "Update"} Campaign
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Detail Modal ───────────────────────────────────────
const DetailModal: React.FC<{ campaign: Campaign; onClose: () => void }> = ({
  campaign,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-scale-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            Campaign Details
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl text-gray-400"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">
                Campaign ID
              </p>
              <p className="text-sm font-mono text-gray-700">
                {campaign.id}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">
                Org ID
              </p>
              <p className="text-sm font-mono text-gray-700">
                {campaign.organizationId}
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase">
              Name
            </p>
            <p className="text-sm font-semibold text-gray-900">
              {campaign.name}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">
                Channel
              </p>
              <p className="text-sm text-gray-700">{campaign.channel}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">
                Status
              </p>
              <StatusBadge status={campaign.status} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">
                Budget
              </p>
              <p className="text-sm font-semibold text-gray-800">
                ${campaign.budget.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">
                Spent
              </p>
              <p className="text-sm font-semibold text-gray-800">
                {campaign.spent !== undefined
                  ? `$${campaign.spent.toLocaleString()}`
                  : "—"}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">
                Start Date
              </p>
              <p className="text-sm text-gray-700">
                {new Date(campaign.startDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">
                End Date
              </p>
              <p className="text-sm text-gray-700">
                {new Date(campaign.endDate).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">
                Created At
              </p>
              <p className="text-sm text-gray-700">
                {new Date(campaign.createdAt).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">
                Updated At
              </p>
              <p className="text-sm text-gray-700">
                {new Date(campaign.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Performance Modal ──────────────────────────────────
const PerformanceModal: React.FC<{
  campaignId: string;
  campaignName: string;
  onClose: () => void;
}> = ({ campaignId, campaignName, onClose }) => {
  const [perfData, setPerfData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getCampaignPerformance(campaignId);
        setPerfData(data);
      } catch (err: any) {
        setError(err.message || "Failed to load performance data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [campaignId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-scale-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            Performance: {campaignName}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl text-gray-400"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-purple-500" size={32} />
            </div>
          ) : error ? (
            <div className="text-center py-10 text-red-600">{error}</div>
          ) : perfData.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <TrendingUp size={32} className="mx-auto mb-2 text-gray-300" />
              No performance data available yet.
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={perfData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="budget"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    name="Budget"
                  />
                  <Line
                    type="monotone"
                    dataKey="spend"
                    stroke="#EF4444"
                    strokeWidth={2}
                    name="Actual Spend"
                  />
                  {perfData[0]?.remaining !== undefined && (
                    <Line
                      type="monotone"
                      dataKey="remaining"
                      stroke="#10B981"
                      strokeWidth={2}
                      name="Remaining"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Exported Modals Container ──────────────────────────
interface ModalsContainerProps {
  showCreate: boolean;
  editingCampaign: Campaign | null;
  viewingCampaign: Campaign | null;
  performanceCampaignId: string | null;
  campaigns: Campaign[];
  onCloseCreate: () => void;
  onCloseEdit: () => void;
  onCloseView: () => void;
  onClosePerformance: () => void;
  onFormSuccess: (campaign: Campaign) => void;
}

const CampaignModals: React.FC<ModalsContainerProps> = ({
  showCreate,
  editingCampaign,
  viewingCampaign,
  performanceCampaignId,
  campaigns,
  onCloseCreate,
  onCloseEdit,
  onCloseView,
  onClosePerformance,
  onFormSuccess,
}) => {
  const campaignName = performanceCampaignId
    ? campaigns.find((c) => c.id === performanceCampaignId)?.name || ""
    : "";

  return (
    <>
      {showCreate && (
        <CampaignFormModal
          mode="create"
          onClose={onCloseCreate}
          onSuccess={onFormSuccess}
        />
      )}
      {editingCampaign && (
        <CampaignFormModal
          mode="edit"
          initialData={editingCampaign}
          onClose={onCloseEdit}
          onSuccess={onFormSuccess}
        />
      )}
      {viewingCampaign && (
        <DetailModal campaign={viewingCampaign} onClose={onCloseView} />
      )}
      {performanceCampaignId && (
        <PerformanceModal
          campaignId={performanceCampaignId}
          campaignName={campaignName}
          onClose={onClosePerformance}
        />
      )}
    </>
  );
};

export default CampaignModals;