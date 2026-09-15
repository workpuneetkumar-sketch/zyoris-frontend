/**
 * components/agents/PermissionLevelBadge.tsx
 * ─────────────────────────────────────────────────────────────
 * Renders the backend-authoritative capability/permission level
 * of an agent.  The five levels have distinct colour + icon
 * treatments that convey increasing autonomy at a glance.
 *
 * READ_ONLY          → slate  (eye icon)
 * SUGGEST            → blue   (lightbulb)
 * EXECUTE_WITH_APPROVAL → amber (shield-check)
 * EXECUTE_WITHIN_LIMITS → violet (zap)
 * AUTONOMOUS         → rose   (cpu + warning)
 *
 * Unknown strings fall back to neutral grey.
 */

import classNames from "classnames";
import { Eye, Lightbulb, ShieldCheck, Zap, Cpu } from "lucide-react";
import type { PermissionLevel } from "@/types/agents";

interface PermissionLevelBadgeProps {
  level: PermissionLevel | string;
  /**
   * "compact" — icon + short label only (for table cells).
   * "full"    — icon + full human-readable label (for detail views).
   * Defaults to "full".
   */
  variant?: "compact" | "full";
  className?: string;
}

interface LevelStyle {
  pill: string;
  iconClass: string;
  Icon: React.ElementType;
  shortLabel: string;
  fullLabel: string;
}

const LEVEL_STYLES: Record<string, LevelStyle> = {
  READ_ONLY: {
    pill: "bg-slate-100 border-slate-200 text-slate-600",
    iconClass: "text-slate-500",
    Icon: Eye,
    shortLabel: "Read-only",
    fullLabel: "Read-only",
  },
  SUGGEST: {
    pill: "bg-blue-50 border-blue-200 text-blue-700",
    iconClass: "text-blue-500",
    Icon: Lightbulb,
    shortLabel: "Suggest",
    fullLabel: "Suggest",
  },
  EXECUTE_WITH_APPROVAL: {
    pill: "bg-amber-50 border-amber-200 text-amber-700",
    iconClass: "text-amber-500",
    Icon: ShieldCheck,
    shortLabel: "Exec + Approval",
    fullLabel: "Execute with Approval",
  },
  EXECUTE_WITHIN_LIMITS: {
    pill: "bg-violet-50 border-violet-200 text-violet-700",
    iconClass: "text-violet-500",
    Icon: Zap,
    shortLabel: "Exec (limited)",
    fullLabel: "Execute within Limits",
  },
  AUTONOMOUS: {
    pill: "bg-rose-50 border-rose-200 text-rose-700",
    iconClass: "text-rose-500",
    Icon: Cpu,
    shortLabel: "Autonomous",
    fullLabel: "Autonomous",
  },
};

const FALLBACK_STYLE: LevelStyle = {
  pill: "bg-gray-100 border-gray-200 text-gray-500",
  iconClass: "text-gray-400",
  Icon: Eye,
  shortLabel: "",
  fullLabel: "",
};

export function PermissionLevelBadge({
  level,
  variant = "full",
  className,
}: PermissionLevelBadgeProps) {
  const normalised = (level ?? "").toUpperCase().replace(/-/g, "_");
  const style = LEVEL_STYLES[normalised] ?? FALLBACK_STYLE;
  const { Icon } = style;
  const label =
    variant === "compact"
      ? style.shortLabel || (level ?? "Unknown")
      : style.fullLabel || (level ?? "Unknown");

  return (
    <span
      className={classNames(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
        style.pill,
        className
      )}
    >
      <Icon size={11} className={classNames("shrink-0", style.iconClass)} />
      {label}
    </span>
  );
}
