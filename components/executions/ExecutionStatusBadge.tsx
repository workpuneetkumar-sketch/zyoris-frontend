/**
 * components/executions/ExecutionStatusBadge.tsx
 * ─────────────────────────────────────────────────────────────
 * Status badge for execution ledger entries.
 * All colors from CSS variable tokens — no hardcoded hex/rgb.
 */

import classNames from "classnames";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Ban,
  ShieldCheck,
} from "lucide-react";
import type { ExecutionStatus } from "@/types/executions";

interface ExecutionStatusBadgeProps {
  status: ExecutionStatus;
  /** "compact" = icon only + short text; "full" = icon + full label */
  variant?: "compact" | "full";
  className?: string;
}

interface StatusStyle {
  pill: string;
  iconClass: string;
  Icon: React.ElementType;
  label: string;
  pulse: boolean;
}

const STATUS_STYLES: Record<string, StatusStyle> = {
  COMPLETED: {
    pill: "bg-[color:var(--color-success-light)] text-[color:var(--color-success-foreground)] border-[color:var(--color-success-light)]",
    iconClass: "text-[color:var(--color-success)]",
    Icon: CheckCircle2,
    label: "Completed",
    pulse: false,
  },
  FAILED: {
    pill: "bg-[color:var(--color-error-light)] text-[color:var(--color-error-foreground)] border-[color:var(--color-error-light)]",
    iconClass: "text-[color:var(--color-error)]",
    Icon: XCircle,
    label: "Failed",
    pulse: false,
  },
  RUNNING: {
    pill: "bg-[color:var(--color-info-light)] text-[color:var(--color-info-foreground)] border-[color:var(--color-info-light)]",
    iconClass: "text-[color:var(--color-info)]",
    Icon: Loader2,
    label: "Running",
    pulse: true,
  },
  PENDING: {
    pill: "bg-[color:var(--color-warning-light)] text-[color:var(--color-warning-foreground)] border-[color:var(--color-warning-light)]",
    iconClass: "text-[color:var(--color-warning)]",
    Icon: Clock,
    label: "Pending",
    pulse: false,
  },
  APPROVAL_REQUIRED: {
    pill: "bg-[color:var(--color-warning-light)] text-[color:var(--color-warning-foreground)] border-[color:var(--color-warning-light)]",
    iconClass: "text-[color:var(--color-warning)]",
    Icon: ShieldCheck,
    label: "Approval Required",
    pulse: true,
  },
  CANCELLED: {
    pill: "bg-[color:var(--color-background-secondary)] text-[color:var(--color-text-muted)] border-[color:var(--color-border)]",
    iconClass: "text-[color:var(--color-text-muted)]",
    Icon: Ban,
    label: "Cancelled",
    pulse: false,
  },
};

const FALLBACK: StatusStyle = {
  pill: "bg-[color:var(--color-background-secondary)] text-[color:var(--color-text-muted)] border-[color:var(--color-border)]",
  iconClass: "text-[color:var(--color-text-muted)]",
  Icon: Clock,
  label: "",
  pulse: false,
};

export function ExecutionStatusBadge({
  status,
  variant = "full",
  className,
}: ExecutionStatusBadgeProps) {
  const style = STATUS_STYLES[(status ?? "").toUpperCase()] ?? FALLBACK;
  const { Icon } = style;
  const label = style.label || status;

  return (
    <span
      className={classNames(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
        style.pill,
        className
      )}
    >
      <Icon
        size={12}
        className={classNames(
          "shrink-0",
          style.iconClass,
          style.pulse && "animate-spin"
        )}
      />
      {variant === "full" && label}
    </span>
  );
}
