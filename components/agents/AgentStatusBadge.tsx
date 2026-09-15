/**
 * components/agents/AgentStatusBadge.tsx
 * ─────────────────────────────────────────────────────────────
 * Renders the lifecycle status of an agent registration.
 *
 * Accepts any string from the backend — known values get a
 * distinct colour treatment, unknown strings fall back to a
 * neutral grey pill.  Never make authorization decisions here;
 * just render what the server returned.
 */

import classNames from "classnames";
import type { AgentStatus } from "@/types/agents";

interface AgentStatusBadgeProps {
  status: AgentStatus;
  className?: string;
}

interface StatusStyle {
  dot: string;
  pill: string;
  label: string;
  pulse: boolean;
}

const STATUS_STYLES: Record<string, StatusStyle> = {
  ACTIVE: {
    dot: "bg-emerald-500",
    pill: "bg-emerald-50 border-emerald-200 text-emerald-700",
    label: "Active",
    pulse: true,
  },
  INACTIVE: {
    dot: "bg-gray-400",
    pill: "bg-gray-100 border-gray-200 text-gray-500",
    label: "Inactive",
    pulse: false,
  },
  SUSPENDED: {
    dot: "bg-red-500",
    pill: "bg-red-50 border-red-200 text-red-700",
    label: "Suspended",
    pulse: false,
  },
  DRAFT: {
    dot: "bg-amber-400",
    pill: "bg-amber-50 border-amber-200 text-amber-700",
    label: "Draft",
    pulse: false,
  },
};

const FALLBACK_STYLE: StatusStyle = {
  dot: "bg-gray-400",
  pill: "bg-gray-100 border-gray-200 text-gray-500",
  label: "",
  pulse: false,
};

export function AgentStatusBadge({ status, className }: AgentStatusBadgeProps) {
  const normalised = (status ?? "").toUpperCase();
  const style = STATUS_STYLES[normalised] ?? FALLBACK_STYLE;
  const label = style.label || (status ?? "Unknown");

  return (
    <span
      className={classNames(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
        style.pill,
        className
      )}
    >
      {/* Animated pulse dot for ACTIVE; static dot for everything else */}
      <span className="relative flex h-2 w-2 shrink-0">
        {style.pulse && (
          <span
            className={classNames(
              "absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping",
              style.dot
            )}
          />
        )}
        <span
          className={classNames(
            "relative inline-flex rounded-full h-2 w-2",
            style.dot
          )}
        />
      </span>
      {label}
    </span>
  );
}
