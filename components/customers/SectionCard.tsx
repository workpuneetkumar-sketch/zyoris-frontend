"use client";

// components/customers/SectionCard.tsx
// Stable outer boundary for every Customer 360 section.
//
// Each section on the page is wrapped in exactly one <SectionCard>. It owns the
// heading, an optional action slot, and an anchor id for in-page navigation.
// It intentionally does NOT know anything about a section's data — sections pass
// already-resolved content (or one of the SectionStates) as children.

import type { LucideIcon } from "lucide-react";

export interface SectionCardProps {
  /** Stable id — used as the scroll anchor and for the section nav. */
  id: string;
  title: string;
  icon?: LucideIcon;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function SectionCard({
  id,
  title,
  icon: Icon,
  description,
  action,
  children,
  className = "",
}: SectionCardProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className={`scroll-mt-24 rounded-2xl border border-border bg-surface shadow-sm ${className}`}
    >
      <header className="flex items-start justify-between gap-4 border-b border-border-light px-5 py-4">
        <div className="flex items-start gap-3">
          {Icon && (
            <span className="mt-0.5 rounded-lg bg-background-secondary p-1.5 text-text-secondary">
              <Icon size={16} />
            </span>
          )}
          <div>
            <h2 id={`${id}-heading`} className="text-sm font-bold tracking-tight text-text">
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-xs text-text-secondary">{description}</p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}
