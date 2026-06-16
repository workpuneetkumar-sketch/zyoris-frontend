"use client";

import React from "react";
import {
  Search,
  Eye,
  Pencil,
  Trash2,
  TrendingUp,
  X,
  RefreshCw,
  Megaphone,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Campaign,
  CampaignStatus,
  CampaignChannel,
} from "@/lib/api/marketingApi";

const PAGE_SIZE = 10;

const STATUS_OPTIONS: { value: CampaignStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All Statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const CHANNEL_OPTIONS: { value: CampaignChannel | "ALL"; label: string }[] = [
  { value: "ALL", label: "All Channels" },
  { value: "Facebook", label: "Facebook" },
  { value: "Google Ads", label: "Google Ads" },
  { value: "LinkedIn", label: "LinkedIn" },
  { value: "Twitter", label: "Twitter" },
  { value: "Email", label: "Email" },
  { value: "Other", label: "Other" },
];

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

const TableSkeleton: React.FC = () => (
  <div className="animate-pulse p-6 space-y-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex space-x-4">
        <div className="h-4 bg-gray-200 rounded w-1/5" />
        <div className="h-4 bg-gray-200 rounded w-1/5" />
        <div className="h-4 bg-gray-200 rounded w-1/5" />
        <div className="h-4 bg-gray-200 rounded w-1/5" />
        <div className="h-4 bg-gray-200 rounded w-1/5" />
      </div>
    ))}
  </div>
);

const EmptyState: React.FC<{ hasFilters: boolean; onReset: () => void }> = ({
  hasFilters,
  onReset,
}) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <Megaphone size={40} className="text-gray-300 mb-4" />
    <h3 className="text-lg font-semibold text-gray-700 mb-2">
      No campaigns found
    </h3>
    <p className="text-sm text-gray-500 mb-4">
      {hasFilters
        ? "Try adjusting your search or filters."
        : "Create your first marketing campaign to get started."}
    </p>
    {hasFilters && (
      <button
        onClick={onReset}
        className="px-4 py-2 text-sm font-medium text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-50"
      >
        Clear all filters
      </button>
    )}
  </div>
);

const ErrorState: React.FC<{ message: string; onRetry: () => void }> = ({
  message,
  onRetry,
}) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="text-red-400 mb-4">
      <X size={40} />
    </div>
    <h3 className="text-lg font-semibold text-gray-700 mb-2">
      Something went wrong
    </h3>
    <p className="text-sm text-gray-500 mb-4 max-w-md">{message}</p>
    <button
      onClick={onRetry}
      className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
    >
      Try again
    </button>
  </div>
);

interface Props {
  campaigns: Campaign[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  statusFilter: CampaignStatus | "ALL";
  channelFilter: CampaignChannel | "ALL";
  currentPage: number;
  totalPages: number;
  paginatedCampaigns: Campaign[];
  onSearchChange: (value: string) => void;
  onStatusChange: (value: CampaignStatus | "ALL") => void;
  onChannelChange: (value: CampaignChannel | "ALL") => void;
  onClearFilters: () => void;
  onRefresh: () => void;
  onView: (campaign: Campaign) => void;
  onEdit: (campaign: Campaign) => void;
  onDelete: (id: string) => void;
  onPerformance: (id: string) => void;
  onPageChange: (page: number) => void;
}

const CampaignTable: React.FC<Props> = ({
  campaigns,
  loading,
  error,
  searchQuery,
  statusFilter,
  channelFilter,
  currentPage,
  totalPages,
  paginatedCampaigns,
  onSearchChange,
  onStatusChange,
  onChannelChange,
  onClearFilters,
  onRefresh,
  onView,
  onEdit,
  onDelete,
  onPerformance,
  onPageChange,
}) => {
  const hasActiveFilters =
    statusFilter !== "ALL" ||
    channelFilter !== "ALL" ||
    searchQuery.trim() !== "";

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
      {/* Filters Bar */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-10 py-2 border-2 border-gray-200 text-gray-800 rounded-xl text-sm focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-lg"
              >
                <X size={14} className="text-gray-400" />
              </button>
            )}
          </div>

          <select
            value={statusFilter}
            onChange={(e) =>
              onStatusChange(e.target.value as CampaignStatus | "ALL")
            }
            className="px-4 py-2.5 border-2 border-gray-200 text-gray-800 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 bg-white transition-all cursor-pointer"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={channelFilter}
            onChange={(e) =>
              onChannelChange(e.target.value as CampaignChannel | "ALL")
            }
            className="px-4 py-2.5 border-2 border-gray-200 text-gray-800 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 bg-white transition-all cursor-pointer"
          >
            {CHANNEL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="flex items-center gap-1.5 px-4 py-2.5 border-2 border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-all"
            >
              <RefreshCw size={14} /> Clear
            </button>
          )}

          <button
            onClick={onRefresh}
            disabled={loading}
            className="ml-auto flex items-center gap-2 px-4 py-2.5 border-2 border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />{" "}
            Refresh
          </button>
        </div>
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="px-6 py-3 flex items-center gap-2 flex-wrap bg-gradient-to-r from-purple-50/50 to-indigo-50/50 border-b border-purple-100/50">
          <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider">
            Filters
          </span>
          <span className="text-gray-300">•</span>
          {statusFilter !== "ALL" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-purple-200 rounded-full text-xs font-semibold text-purple-700 shadow-sm">
              Status: {statusFilter}
              <button
                onClick={() => onStatusChange("ALL")}
                className="hover:bg-purple-100 rounded-full p-0.5"
              >
                <X size={12} />
              </button>
            </span>
          )}
          {channelFilter !== "ALL" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-indigo-200 rounded-full text-xs font-semibold text-indigo-700 shadow-sm">
              Channel: {channelFilter}
              <button
                onClick={() => onChannelChange("ALL")}
                className="hover:bg-indigo-100 rounded-full p-0.5"
              >
                <X size={12} />
              </button>
            </span>
          )}
          {searchQuery.trim() !== "" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-gray-200 rounded-full text-xs font-semibold text-gray-700 shadow-sm">
              Search: &quot;{searchQuery}&quot;
              <button
                onClick={() => onSearchChange("")}
                className="hover:bg-gray-100 rounded-full p-0.5"
              >
                <X size={12} />
              </button>
            </span>
          )}
          <span className="text-xs font-medium text-gray-500 ml-auto">
            {campaigns.length} result{campaigns.length !== 1 ? "s" : ""} found
          </span>
        </div>
      )}

      {/* Table Content */}
      {loading ? (
        <TableSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={onRefresh} />
      ) : campaigns.length === 0 ? (
        <EmptyState
          hasFilters={hasActiveFilters}
          onReset={onClearFilters}
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Campaign
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Channel
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Budget
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Spent
                  </th>
                  <th className="text-center px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-center px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Dates
                  </th>
                  <th className="text-center px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedCampaigns.map((campaign) => (
                  <tr
                    key={campaign.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">
                        {campaign.name}
                      </p>
                      <p className="text-xs text-gray-400 font-mono">
                        {campaign.id.slice(0, 8)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {campaign.channel}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-medium text-gray-700">
                      ${campaign.budget.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-medium text-gray-700">
                      {campaign.spent !== undefined
                        ? `$${campaign.spent.toLocaleString()}`
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <StatusBadge status={campaign.status} />
                    </td>
                    <td className="px-6 py-4 text-center text-xs text-gray-500">
                      <div>
                        {new Date(campaign.startDate).toLocaleDateString()}
                      </div>
                      <div className="text-gray-300">to</div>
                      <div>
                        {new Date(campaign.endDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onView(campaign)}
                          title="View details"
                          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => onEdit(campaign)}
                          title="Edit campaign"
                          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => onDelete(campaign.id)}
                          title="Delete campaign"
                          className="p-1.5 hover:bg-red-50 rounded-lg text-gray-500 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button
                          onClick={() => onPerformance(campaign.id)}
                          title="View performance"
                          className="p-1.5 hover:bg-purple-50 rounded-lg text-purple-500"
                        >
                          <TrendingUp size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing{" "}
                {Math.min(
                  (currentPage - 1) * PAGE_SIZE + 1,
                  campaigns.length
                )}
                –
                {Math.min(currentPage * PAGE_SIZE, campaigns.length)} of{" "}
                {campaigns.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 disabled:opacity-30"
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => onPageChange(page)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium ${
                        page === currentPage
                          ? "bg-purple-600 text-white"
                          : "hover:bg-white border border-transparent hover:border-gray-200 text-gray-700"
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
                <button
                  onClick={() =>
                    onPageChange(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 disabled:opacity-30"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CampaignTable;