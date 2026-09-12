/**
 * components/approvals/ApprovalStatusBadge.tsx
 * ─────────────────────────────────────────────────────────────
 * Shared status badge for ApprovalQueue list rows and
 * ApprovalDetail header. Reused across both screens.
 *
 * All colors sourced from CSS variable tokens in globals.css.
 * No hardcoded hex/rgb values.
 */

import classNames from "classnames";
import { Clock, CheckCircle2, XCircle, TimerOff } from "lucide-react";
import type { ApprovalStatus } from "@/types/approvals";

interface ApprovalStatusBadgeProps {
  status: ApprovalStatus;
  /** "compact" = icon + short label; "full" = icon + full label. Default "full" */
  variant?: "compact" | "full";
  className?: string;
}

interface StatusStyle {
  /** Tailwind classes using CSS variable tokens */
  pill: string;
  iconClass: string;
  Icon: React.ElementType;
  label: string;
  shortLabel: string;
  /** True = animated pulse dot (PENDING only) */
  pulse: boolean;
}

const STATUS_STYLES: Record<ApprovalStatus, StatusStyle> = {
  PENDING: {
    pill: "bg-[color:var(--color-warning-light)] text-[color:var(--color-warning-foreground)] border-[color:var(--color-warning-light)]",
    iconClass: "text-[color:var(--color-warning)]",
    Icon: Clock,
    label: "Pending",
    shortLabel: "Pending",
    pulse: true,
  },
  APPROVED: {
    pill: "bg-[color:var(--color-success-light)] text-[color:var(--color-success-foreground)] border-[color:var(--color-success-light)]",
    iconClass: "text-[color:var(--color-success)]",
    Icon: CheckCircle2,
    label: "Approved",
    shortLabel: "Approved",
    pulse: false,
  },
  REJECTED: {
    pill: "bg-[color:var(--color-error-light)] text-[color:var(--color-error-foreground)] border-[color:var(--color-error-light)]",
    iconClass: "text-[color:var(--color-error)]",
    Icon: XCircle,
    label: "Rejected",
    shortLabel: "Rejected",
    pulse: false,
  },
  EXPIRED: {
    /**
     * ⚠ FLAG: No dedicated `--color-expired-*` token exists in globals.css.
     * Using `--color-text-muted` / `--color-background-secondary` as a neutral
     * fallback. Recommend adding `--color-expired` / `--color-expired-light` /
     * `--color-expired-foreground` tokens to globals.css for a distinct look.
     */
    pill: "bg-[color:var(--color-background-secondary)] text-[color:var(--color-text-muted)] border-[color:var(--color-border)]",
    iconClass: "text-[color:var(--color-text-muted)]",
    Icon: TimerOff,
    label: "Expired",
    shortLabel: "Expired",
    pulse: false,
  },
};

const FALLBACK_STYLE: StatusStyle = {
  pill: "bg-[color:var(--color-background-secondary)] text-[color:var(--color-text-muted)] border-[color:var(--color-border)]",
  iconClass: "text-[color:var(--color-text-muted)]",
  Icon: Clock,
  label: "",
  shortLabel: "",
  pulse: false,
};

export function ApprovalStatusBadge({
  status,
  variant = "full",
  className,
}: ApprovalStatusBadgeProps) {
  const style =
    STATUS_STYLES[status as ApprovalStatus] ?? FALLBACK_STYLE;
  const { Icon } = style;
  const label =
    variant === "compact" ? style.shortLabel || status : style.label || status;

  return (
    <span
      className={classNames(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
        style.pill,
        className
      )}
    >
      {style.pulse ? (
        <span className="relative flex h-2 w-2 shrink-0">
          <span
            className={classNames(
              "absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping",
              "bg-[color:var(--color-warning)]"
            )}
          />
          <span
            className={classNames(
              "relative inline-flex rounded-full h-2 w-2",
              "bg-[color:var(--color-warning)]"
            )}
          />
        </span>
      ) : (
        <Icon size={12} className={classNames("shrink-0", style.iconClass)} />
      )}
      {label}
    </span>
  );
}
