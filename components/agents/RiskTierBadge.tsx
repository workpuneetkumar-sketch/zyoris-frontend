/**
 * components/agents/RiskTierBadge.tsx
 * ─────────────────────────────────────────────────────────────
 * Renders the backend-authoritative risk tier of an agent.
 *
 * Visual escalation: LOW → green, MEDIUM → amber,
 * HIGH → orange, CRITICAL → red with a warning icon.
 * Unknown values fall back to neutral grey.
 */

import classNames from "classnames";
import { AlertTriangle } from "lucide-react";
import type { RiskTier } from "@/types/agents";

interface RiskTierBadgeProps {
  tier: RiskTier | string;
  /** Show a short text label alongside the tier. Defaults to true. */
  showLabel?: boolean;
  className?: string;
}

interface TierStyle {
  pill: string;
  icon: string;
  label: string;
  showWarning: boolean;
}

const TIER_STYLES: Record<string, TierStyle> = {
  LOW: {
    pill: "bg-emerald-50 border-emerald-200 text-emerald-700",
    icon: "text-emerald-500",
    label: "Low",
    showWarning: false,
  },
  MEDIUM: {
    pill: "bg-amber-50 border-amber-200 text-amber-700",
    icon: "text-amber-500",
    label: "Medium",
    showWarning: false,
  },
  HIGH: {
    pill: "bg-orange-50 border-orange-200 text-orange-700",
    icon: "text-orange-500",
    label: "High",
    showWarning: true,
  },
  CRITICAL: {
    pill: "bg-red-50 border-red-200 text-red-700",
    icon: "text-red-500",
    label: "Critical",
    showWarning: true,
  },
};

const FALLBACK_STYLE: TierStyle = {
  pill: "bg-gray-100 border-gray-200 text-gray-500",
  icon: "text-gray-400",
  label: "",
  showWarning: false,
};

export function RiskTierBadge({
  tier,
  showLabel = true,
  className,
}: RiskTierBadgeProps) {
  const normalised = (tier ?? "").toUpperCase();
  const style = TIER_STYLES[normalised] ?? FALLBACK_STYLE;
  const label = style.label || (tier ?? "Unknown");

  return (
    <span
      className={classNames(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
        style.pill,
        className
      )}
    >
      {style.showWarning && (
        <AlertTriangle size={11} className={classNames("shrink-0", style.icon)} />
      )}
      {showLabel && (
        <>
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
            Risk
          </span>
          {label}
        </>
      )}
      {!showLabel && label}
    </span>
  );
}
