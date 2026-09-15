/**
 * components/memory/MemoryScopeBadge.tsx
 * ─────────────────────────────────────────────────────────────
 * Visually distinguishable scope badge for memory entries.
 * Each scope has a distinct color so users never confuse
 * ORGANIZATION, USER, CUSTOMER, and AGENT scopes.
 *
 * All colors via CSS variable tokens only — no hardcoded hex/rgb.
 * Also exports ScopeSelectorButton for use in filter bars / forms.
 */

import classNames from "classnames";
import { Building2, User, Users, Bot } from "lucide-react";
import type { MemoryScope } from "@/types/agentMemory";

// ─── Scope style map ──────────────────────────────────────────────────────────

interface ScopeStyle {
  pill: string;
  iconClass: string;
  Icon: React.ElementType;
  label: string;
}

export const SCOPE_STYLES: Record<MemoryScope, ScopeStyle> = {
  ORGANIZATION: {
    pill: "bg-[color:var(--color-cat-projects-bg)] text-[color:var(--color-cat-projects)] border-[color:var(--color-cat-projects-bg)]",
    iconClass: "text-[color:var(--color-cat-projects)]",
    Icon: Building2,
    label: "Organization",
  },
  USER: {
    pill: "bg-[color:var(--color-cat-comm-bg)] text-[color:var(--color-cat-comm)] border-[color:var(--color-cat-comm-bg)]",
    iconClass: "text-[color:var(--color-cat-comm)]",
    Icon: User,
    label: "User",
  },
  CUSTOMER: {
    pill: "bg-[color:var(--color-cat-crm-bg)] text-[color:var(--color-cat-crm)] border-[color:var(--color-cat-crm-bg)]",
    iconClass: "text-[color:var(--color-cat-crm)]",
    Icon: Users,
    label: "Customer",
  },
  AGENT: {
    pill: "bg-[color:var(--color-cat-marketing-bg)] text-[color:var(--color-cat-marketing)] border-[color:var(--color-cat-marketing-bg)]",
    iconClass: "text-[color:var(--color-cat-marketing)]",
    Icon: Bot,
    label: "Agent",
  },
};

const FALLBACK_STYLE: ScopeStyle = {
  pill: "bg-[color:var(--color-background-secondary)] text-[color:var(--color-text-muted)] border-[color:var(--color-border)]",
  iconClass: "text-[color:var(--color-text-muted)]",
  Icon: Building2,
  label: "",
};

// ─── Badge ────────────────────────────────────────────────────────────────────

interface MemoryScopeBadgeProps {
  scope: MemoryScope | string;
  /** "compact" = icon + short label; "full" = icon + full label */
  variant?: "compact" | "full";
  className?: string;
}

export function MemoryScopeBadge({
  scope,
  variant = "full",
  className,
}: MemoryScopeBadgeProps) {
  const style = SCOPE_STYLES[scope as MemoryScope] ?? FALLBACK_STYLE;
  const { Icon } = style;
  const label = style.label || scope;

  return (
    <span
      className={classNames(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
        style.pill,
        className
      )}
    >
      <Icon size={11} className={classNames("shrink-0", style.iconClass)} />
      {variant === "full" && label}
    </span>
  );
}

// ─── Shared scope selector (used in filter bars and forms) ────────────────────

export const ALL_SCOPES: MemoryScope[] = [
  "ORGANIZATION",
  "USER",
  "CUSTOMER",
  "AGENT",
];

interface ScopeSelectorProps {
  /** Currently selected scope, or "" for "All" */
  value: MemoryScope | "";
  onChange: (scope: MemoryScope | "") => void;
  /** If true, includes an "All scopes" option */
  includeAll?: boolean;
  className?: string;
}

export function ScopeSelector({
  value,
  onChange,
  includeAll = true,
  className,
}: ScopeSelectorProps) {
  return (
    <div className={classNames("flex flex-wrap gap-1.5", className)}>
      {includeAll && (
        <button
          type="button"
          onClick={() => onChange("")}
          className={classNames(
            "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border",
            value === ""
              ? "bg-[color:var(--color-primary)] text-[color:var(--color-primary-foreground)] border-[color:var(--color-primary)]"
              : "bg-[color:var(--color-surface)] text-[color:var(--color-text-secondary)] border-[color:var(--color-border)] hover:bg-[color:var(--color-surface-hover)]"
          )}
        >
          All
        </button>
      )}
      {ALL_SCOPES.map((scope) => {
        const style = SCOPE_STYLES[scope];
        const { Icon } = style;
        const isActive = value === scope;
        return (
          <button
            key={scope}
            type="button"
            onClick={() => onChange(isActive && includeAll ? "" : scope)}
            className={classNames(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border",
              isActive
                ? style.pill
                : "bg-[color:var(--color-surface)] text-[color:var(--color-text-secondary)] border-[color:var(--color-border)] hover:bg-[color:var(--color-surface-hover)]"
            )}
          >
            <Icon size={11} className={isActive ? style.iconClass : "text-[color:var(--color-text-muted)]"} />
            {style.label}
          </button>
        );
      })}
    </div>
  );
}
