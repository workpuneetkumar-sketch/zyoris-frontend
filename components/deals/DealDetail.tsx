"use client";

import { Deal } from "@/types/deals";
import { STAGE_CONFIG } from "@/lib/dealConfig";
import {
  DollarSign,
  Calendar,
  User,
  Building2,
  Mail,
  Phone,
  Clock,
} from "lucide-react";
import { useState } from "react";

interface DealDetailProps {
  deal: Deal;
}

export function DealDetail({ deal }: DealDetailProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "timeline" | "notes">(
    "overview"
  );

  const stageConfig = STAGE_CONFIG[deal.stage];
  const isWon = deal.stage === "WON";
  const isLost = deal.stage === "LOST";

  const formatCurrency = (amount: number): string => {
    if (amount >= 1_000_000) {
      return `$${(amount / 1_000_000).toFixed(1)}M`;
    }
    if (amount >= 1_000) {
      return `$${(amount / 1_000).toFixed(0)}K`;
    }
    return `$${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column - Primary info */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Stage & Amount Section */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Stage */}
              <div>
                <p className="text-[12px] font-medium text-gray-400 mb-2">
                  Stage
                </p>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      stageConfig?.color ?? "bg-gray-500"
                    }`}
                  />
                  <p className="text-[16px] font-semibold text-gray-900">
                    {stageConfig?.label || deal.stage}
                  </p>
                </div>
              </div>

              {/* Amount */}
              <div>
                <p className="text-[12px] font-medium text-gray-400 mb-2">
                  Deal Amount
                </p>
                <p className="text-[20px] font-bold text-green-600">
                  {formatCurrency(deal.amount)}
                </p>
              </div>
            </div>

            {/* Conversion Probability */}
            <div>
              <p className="text-[12px] font-medium text-gray-400 mb-2">
                Conversion Probability
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      isWon
                        ? "bg-green-400"
                        : isLost
                        ? "bg-red-300"
                        : "bg-blue-400"
                    }`}
                    style={{
                      width: `${Math.round(
                        deal.conversionProbability * 100
                      )}%`,
                    }}
                  />
                </div>
                <span className="text-[14px] font-semibold text-gray-700 min-w-fit">
                  {Math.round(deal.conversionProbability * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-[14px] font-semibold text-gray-900 mb-4">
              Basic Information
            </h3>

            <div className="space-y-4">
              {/* Owner */}
              {deal.owner && (
                <div className="flex items-start gap-3">
                  <User size={16} className="text-gray-400 mt-1 shrink-0" />
                  <div className="flex-1">
                    <p className="text-[12px] font-medium text-gray-400 mb-1">
                      Owner
                    </p>
                    <p className="text-[14px] text-gray-900">{deal.owner}</p>
                  </div>
                </div>
              )}

              {/* Close Date */}
              {deal.closeDate && (
                <div className="flex items-start gap-3">
                  <Calendar size={16} className="text-gray-400 mt-1 shrink-0" />
                  <div className="flex-1">
                    <p className="text-[12px] font-medium text-gray-400 mb-1">
                      Expected Close Date
                    </p>
                    <p className="text-[14px] text-gray-900">
                      {formatDate(deal.closeDate)}
                    </p>
                  </div>
                </div>
              )}

              {/* Created Date */}
              {deal.createdAt && (
                <div className="flex items-start gap-3">
                  <Clock size={16} className="text-gray-400 mt-1 shrink-0" />
                  <div className="flex-1">
                    <p className="text-[12px] font-medium text-gray-400 mb-1">
                      Created
                    </p>
                    <p className="text-[14px] text-gray-900">
                      {formatDate(deal.createdAt)}
                    </p>
                  </div>
                </div>
              )}

              {/* External ID */}
              {deal.externalId && (
                <div>
                  <p className="text-[12px] font-medium text-gray-400 mb-1">
                    External ID
                  </p>
                  <p className="text-[14px] text-gray-700 font-mono">
                    {deal.externalId}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Company Information */}
          {deal.companyName && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-[14px] font-semibold text-gray-900 mb-4">
                Company
              </h3>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Building2 size={16} className="text-gray-400 mt-1 shrink-0" />
                  <div className="flex-1">
                    <p className="text-[12px] font-medium text-gray-400 mb-1">
                      Name
                    </p>
                    <p className="text-[14px] text-gray-900">
                      {deal.companyName}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right column - Summary card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 h-fit sticky top-5">
          <h3 className="text-[14px] font-semibold text-gray-900 mb-4">
            Summary
          </h3>

          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-medium text-gray-400 mb-1">
                Deal ID
              </p>
              <p className="text-[12px] text-gray-700 font-mono break-all">
                {deal.dealId}
              </p>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-[11px] font-medium text-gray-400 mb-2">
                Status
              </p>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    stageConfig?.color ?? "bg-gray-500"
                  }`}
                />
                <p className="text-[13px] font-medium text-gray-800">
                  {stageConfig?.label || deal.stage}
                </p>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-[11px] font-medium text-gray-400 mb-2">
                Value
              </p>
              <p className="text-[16px] font-bold text-green-600">
                {formatCurrency(deal.amount)}
              </p>
            </div>

            {deal.closeDate && (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-[11px] font-medium text-gray-400 mb-2">
                  Close Date
                </p>
                <p className="text-[13px] text-gray-700">
                  {formatDate(deal.closeDate)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timeline and Notes Section */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="border-b border-gray-100">
          <div className="flex items-center gap-4 p-5">
            <button
              onClick={() => setActiveTab("overview")}
              className={`text-[13px] font-medium pb-2 border-b-2 transition-colors ${
                activeTab === "overview"
                  ? "text-blue-600 border-b-blue-600"
                  : "text-gray-500 border-b-transparent hover:text-gray-700"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("timeline")}
              className={`text-[13px] font-medium pb-2 border-b-2 transition-colors ${
                activeTab === "timeline"
                  ? "text-blue-600 border-b-blue-600"
                  : "text-gray-500 border-b-transparent hover:text-gray-700"
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setActiveTab("notes")}
              className={`text-[13px] font-medium pb-2 border-b-2 transition-colors ${
                activeTab === "notes"
                  ? "text-blue-600 border-b-blue-600"
                  : "text-gray-500 border-b-transparent hover:text-gray-700"
              }`}
            >
              Notes
            </button>
          </div>
        </div>

        <div className="p-5">
          {activeTab === "overview" && (
            <div className="text-gray-500 text-[13px]">
              <p>
                This is the overview tab. Additional deal overview information
                can be displayed here.
              </p>
            </div>
          )}

          {activeTab === "timeline" && (
            <div className="text-gray-500 text-[13px]">
              <p>Timeline activities will be displayed here.</p>
              <p className="mt-2 text-[12px]">
                No activities yet. Activities such as deal creation, stage
                changes, and assignments will appear here.
              </p>
            </div>
          )}

          {activeTab === "notes" && (
            <div className="text-gray-500 text-[13px]">
              <p>Notes section will be displayed here.</p>
              <p className="mt-2 text-[12px]">
                No notes yet. You can add notes to track important information
                about this deal.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
