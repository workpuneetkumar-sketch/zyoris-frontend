// components/deals/DealEnterpriseCard.tsx
"use client";

import React, { useState } from "react";
import {
  Briefcase,
  Globe2,
  Building,
  Layers,
  Repeat,
  Share2,
  Users,
  Coins,
  ArrowUpRight,
  ShieldCheck,
  Package,
  Pencil,
} from "lucide-react";
import { Deal } from "@/types/deals";
import { SharedOwnersModal } from "./SharedOwnersModal";
import { formatCurrencyWithSnapshot } from "@/utils/currencyFormat";

interface DealEnterpriseCardProps {
  deal: Deal;
  onUpdate?: () => Promise<void> | void;
  onEdit?: () => void;
}

export function DealEnterpriseCard({ deal, onUpdate, onEdit }: DealEnterpriseCardProps) {
  const [isSharedOwnersOpen, setIsSharedOwnersOpen] = useState(false);

  const oppType = (deal.opportunityType || "NEW_BUSINESS").toUpperCase();
  const currency = deal.currency || "USD";

  const getOppTypeBadge = (type: string) => {
    switch (type) {
      case "RENEWAL":
        return {
          label: "Renewal",
          classes: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
        };
      case "EXPANSION":
        return {
          label: "Expansion",
          classes: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border-blue-200 dark:border-blue-800",
        };
      case "CROSS_SELL":
        return {
          label: "Cross-Sell",
          classes: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 border-purple-200 dark:border-purple-800",
        };
      case "UPSELL":
        return {
          label: "Upsell",
          classes: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-800",
        };
      default:
        return {
          label: "New Business",
          classes: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
        };
    }
  };

  const badge = getOppTypeBadge(oppType);
  const sharedOwnersCount = Array.isArray(deal.sharedOwners) ? deal.sharedOwners.length : 0;

  return (
    <>
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Enterprise Opportunity Details
                </h3>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${badge.classes}`}
                >
                  {badge.label}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Type, Channel Attribution, Legal Entity & Multi-Currency Contract
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit Enterprise Info</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsSharedOwnersOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-xl border border-blue-200 dark:border-blue-800 transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Manage Shared Owners {sharedOwnersCount > 0 && `(${sharedOwnersCount})`}</span>
            </button>
          </div>
        </div>

        {/* 4-Grid Attributes */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          {/* Channel Attribution */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              Channel
            </span>
            <div className="font-semibold text-slate-800 dark:text-slate-200">
              {deal.channel || "DIRECT"}
            </div>
            {deal.partnerName && (
              <div className="text-[10px] text-blue-600 dark:text-blue-400 truncate">
                Partner: {deal.partnerName} {deal.partnerSplitPercentage ? `(${deal.partnerSplitPercentage}%)` : ""}
              </div>
            )}
          </div>

          {/* Region */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
              <Globe2 className="w-3.5 h-3.5 text-slate-400" />
              Region
            </span>
            <div className="font-semibold text-slate-800 dark:text-slate-200">
              {deal.region || "Global / Unassigned"}
            </div>
          </div>

          {/* Legal Entity */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              Legal Entity
            </span>
            <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
              {deal.legalEntity || "Zyoris Global Corp"}
            </div>
          </div>

          {/* Currency Contract */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-slate-400" />
              Contract Currency
            </span>
            <div className="font-semibold text-slate-800 dark:text-slate-200">
              {formatCurrencyWithSnapshot(deal.amount, currency)}
            </div>
          </div>
        </div>

        {/* Product & Parent Subscription Relationship */}
        {(deal.productId || deal.productName || deal.subscriptionId || deal.parentSubscriptionId) && (
          <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2.5">
              <Package className="w-4 h-4 text-indigo-500" />
              <div>
                <span className="font-semibold text-indigo-950 dark:text-indigo-200">
                  Product / Subscription: {deal.productName || deal.productId || "Enterprise Suite"}
                </span>
                {deal.parentSubscriptionId && (
                  <span className="ml-2 text-[11px] text-indigo-600 dark:text-indigo-400">
                    (Parent Subscription: <code className="font-mono">{deal.parentSubscriptionId}</code>)
                  </span>
                )}
              </div>
            </div>

            {deal.subscriptionRelationship && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300">
                {deal.subscriptionRelationship}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Shared Owners Portalled Dialog */}
      <SharedOwnersModal
        isOpen={isSharedOwnersOpen}
        dealId={deal.dealId}
        dealName={deal.name}
        onClose={() => setIsSharedOwnersOpen(false)}
        onUpdated={onUpdate}
      />
    </>
  );
}
