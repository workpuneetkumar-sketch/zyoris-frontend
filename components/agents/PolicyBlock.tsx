/**
 * components/agents/PolicyBlock.tsx
 * ─────────────────────────────────────────────────────────────
 * Generic key-value policy display block.  Reusable across
 * AgentDetail and any future agent-result screens (Day 4+).
 *
 * Usage:
 *   <PolicyBlock
 *     title="Model Policy"
 *     icon={<Cpu size={14} />}
 *     rows={[
 *       { label: "Default model", value: "gpt-4o" },
 *       { label: "Max tokens",    value: "4 096" },
 *     ]}
 *   />
 *
 * Rows where `value` is null/undefined/empty are skipped so
 * callers don't need to pre-filter their data.
 */

import classNames from "classnames";
import { ReactNode } from "react";

export interface PolicyRow {
  label: string;
  /** Anything renderable — string, number, badge, etc. */
  value: ReactNode;
  /** If true the value renders in a monospace code style */
  mono?: boolean;
}

interface PolicyBlockProps {
  title: string;
  /** Optional Lucide icon element, e.g. <Brain size={14} /> */
  icon?: ReactNode;
  rows: PolicyRow[];
  /** Extra className on the outer wrapper */
  className?: string;
  /**
   * Accent colour for the left border and icon background.
   * Tailwind colour class fragment, e.g. "blue" → border-blue-200 bg-blue-50.
   * Defaults to "slate".
   */
  accent?: "slate" | "blue" | "violet" | "amber" | "emerald" | "rose";
}

const ACCENT_MAP: Record<
  NonNullable<PolicyBlockProps["accent"]>,
  { border: string; iconBg: string; iconText: string; titleText: string }
> = {
  slate:   { border: "border-slate-200",   iconBg: "bg-slate-100",   iconText: "text-slate-500",   titleText: "text-slate-700"   },
  blue:    { border: "border-blue-200",    iconBg: "bg-blue-50",    iconText: "text-blue-600",    titleText: "text-blue-700"    },
  violet:  { border: "border-violet-200",  iconBg: "bg-violet-50",  iconText: "text-violet-600",  titleText: "text-violet-700"  },
  amber:   { border: "border-amber-200",   iconBg: "bg-amber-50",   iconText: "text-amber-600",   titleText: "text-amber-700"   },
  emerald: { border: "border-emerald-200", iconBg: "bg-emerald-50", iconText: "text-emerald-600", titleText: "text-emerald-700" },
  rose:    { border: "border-rose-200",    iconBg: "bg-rose-50",    iconText: "text-rose-600",    titleText: "text-rose-700"    },
};

export function PolicyBlock({
  title,
  icon,
  rows,
  className,
  accent = "slate",
}: PolicyBlockProps) {
  const a = ACCENT_MAP[accent];

  // Filter out rows with no meaningful value
  const visibleRows = rows.filter(
    (r) => r.value !== null && r.value !== undefined && r.value !== ""
  );

  return (
    <div
      className={classNames(
        "bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div
        className={classNames(
          "flex items-center gap-2 px-5 py-3.5 border-b",
          a.border
        )}
      >
        {icon && (
          <span
            className={classNames(
              "flex items-center justify-center w-6 h-6 rounded-lg",
              a.iconBg,
              a.iconText
            )}
          >
            {icon}
          </span>
        )}
        <h3
          className={classNames(
            "text-xs font-extrabold uppercase tracking-widest",
            a.titleText
          )}
        >
          {title}
        </h3>
      </div>

      {/* Rows */}
      {visibleRows.length === 0 ? (
        <p className="px-5 py-4 text-xs text-gray-400 italic">
          No data available.
        </p>
      ) : (
        <dl className="divide-y divide-gray-50">
          {visibleRows.map((row) => (
            <div
              key={row.label}
              className="flex items-start justify-between gap-4 px-5 py-3"
            >
              <dt className="text-xs font-medium text-gray-500 shrink-0 pt-px">
                {row.label}
              </dt>
              <dd
                className={classNames(
                  "text-xs text-gray-900 text-right break-words max-w-[60%]",
                  row.mono && "font-mono bg-gray-50 px-1.5 py-0.5 rounded text-[11px]"
                )}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
