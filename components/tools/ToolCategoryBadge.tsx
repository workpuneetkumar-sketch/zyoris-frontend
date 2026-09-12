/**
 * components/tools/ToolCategoryBadge.tsx
 * ─────────────────────────────────────────────────────────────
 * Renders the functional category of a tool.
 * Colors sourced exclusively from CSS variable tokens defined
 * in globals.css — no hardcoded hex/rgb values.
 */

import classNames from "classnames";
import type { ToolCategory } from "@/types/tools";

interface ToolCategoryBadgeProps {
  category: ToolCategory;
  className?: string;
}

interface CategoryStyle {
  /** Tailwind classes that map to CSS variable tokens */
  pill: string;
  label: string;
}

const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  CRM:          { pill: "bg-[color:var(--color-cat-crm-bg)] text-[color:var(--color-cat-crm)] border-[color:var(--color-cat-crm-bg)]",           label: "CRM"           },
  COMMUNICATION:{ pill: "bg-[color:var(--color-cat-comm-bg)] text-[color:var(--color-cat-comm)] border-[color:var(--color-cat-comm-bg)]",         label: "Comms"         },
  FINANCE:      { pill: "bg-[color:var(--color-cat-finance-bg)] text-[color:var(--color-cat-finance)] border-[color:var(--color-cat-finance-bg)]",label: "Finance"       },
  HR:           { pill: "bg-[color:var(--color-cat-hr-bg)] text-[color:var(--color-cat-hr)] border-[color:var(--color-cat-hr-bg)]",               label: "HR"            },
  ANALYTICS:    { pill: "bg-[color:var(--color-cat-crm-bg)] text-[color:var(--color-cat-crm)] border-[color:var(--color-cat-crm-bg)]",            label: "Analytics"     },
  AUTOMATION:   { pill: "bg-[color:var(--color-cat-projects-bg)] text-[color:var(--color-cat-projects)] border-[color:var(--color-cat-projects-bg)]", label: "Automation"},
  INTEGRATION:  { pill: "bg-[color:var(--color-cat-comm-bg)] text-[color:var(--color-cat-comm)] border-[color:var(--color-cat-comm-bg)]",         label: "Integration"   },
  SEARCH:       { pill: "bg-[color:var(--color-cat-marketing-bg)] text-[color:var(--color-cat-marketing)] border-[color:var(--color-cat-marketing-bg)]", label: "Search"},
  STORAGE:      { pill: "bg-[color:var(--color-cat-custom-bg)] text-[color:var(--color-cat-custom)] border-[color:var(--color-cat-custom-bg)]",   label: "Storage"       },
  NOTIFICATION: { pill: "bg-[color:var(--color-cat-marketing-bg)] text-[color:var(--color-cat-marketing)] border-[color:var(--color-cat-marketing-bg)]", label: "Notify"},
};

const FALLBACK: CategoryStyle = {
  pill: "bg-[color:var(--color-cat-custom-bg)] text-[color:var(--color-cat-custom)] border-[color:var(--color-cat-custom-bg)]",
  label: "",
};

export function ToolCategoryBadge({ category, className }: ToolCategoryBadgeProps) {
  const key = (category ?? "").toUpperCase();
  const style = CATEGORY_STYLES[key] ?? FALLBACK;
  const label = style.label || (category ?? "Unknown");

  return (
    <span
      className={classNames(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border",
        style.pill,
        className
      )}
    >
      {label}
    </span>
  );
}
