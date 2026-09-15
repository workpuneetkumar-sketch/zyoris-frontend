"use client";

// components/customers/sections/timeline/TimelineFilters.tsx
// Filter bar for the Customer 360 Timeline.
//
// Type chips are built from the `eventType` values the backend has actually
// returned for this customer (`knownEventTypes`), so every value toggled here
// serialises straight back into `?types=` as a real backend enum value.

import { useMemo } from "react";
import { CalendarDays, Filter, X } from "lucide-react";
import type {
  CustomerTimelineEvent,
  CustomerTimelineFilters,
} from "@/types/customer360";
import {
  CATEGORY_STYLES,
  categoryOf,
  humanizeEventType,
  type TimelineCategory,
} from "./eventPresentation";

interface TimelineFiltersProps {
  filters: CustomerTimelineFilters;
  knownEventTypes: string[];
  /** Loaded events — used only to bucket each event type under a category. */
  events: CustomerTimelineEvent[];
  isFiltered: boolean;
  onChange: (patch: Partial<CustomerTimelineFilters>) => void;
  onClear: () => void;
  disabled?: boolean;
}

// Cheap category guess from an eventType string alone (no full event object).
function categoryForType(
  type: string,
  events: CustomerTimelineEvent[]
): TimelineCategory {
  const sample = events.find((e) => e.eventType === type);
  if (sample) return categoryOf(sample);
  // Fall back to a synthetic event so keyword matching still runs.
  return categoryOf({ eventType: type } as CustomerTimelineEvent);
}

function isoToDateInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

export function TimelineFilters({
  filters,
  knownEventTypes,
  events,
  isFiltered,
  onChange,
  onClear,
  disabled,
}: TimelineFiltersProps) {
  const grouped = useMemo(() => {
    const map = new Map<TimelineCategory, string[]>();
    for (const type of knownEventTypes) {
      const cat = categoryForType(type, events);
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(type);
    }
    return [...map.entries()].sort((a, b) =>
      CATEGORY_STYLES[a[0]].label.localeCompare(CATEGORY_STYLES[b[0]].label)
    );
  }, [knownEventTypes, events]);

  const selected = new Set(filters.types);

  const toggleType = (type: string) => {
    const next = new Set(selected);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    onChange({ types: [...next] });
  };

  const setFrom = (value: string) => {
    onChange({
      from: value ? new Date(`${value}T00:00:00.000Z`).toISOString() : null,
    });
  };

  const setTo = (value: string) => {
    onChange({
      to: value ? new Date(`${value}T23:59:59.999Z`).toISOString() : null,
    });
  };

  const hasTypeChips = grouped.length > 0;

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-border-light bg-background-secondary/50 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-text-muted">
          <Filter size={12} />
          Filters
        </span>
        {isFiltered && (
          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-text-secondary hover:bg-surface-hover hover:text-text disabled:opacity-60"
          >
            <X size={12} />
            Clear
          </button>
        )}
      </div>

      {/* Event-type chips, grouped by category */}
      {hasTypeChips ? (
        <div className="flex flex-col gap-2">
          {grouped.map(([category, types]) => {
            const style = CATEGORY_STYLES[category];
            return (
              <div key={category} className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-text-muted">
                  <style.icon size={11} />
                  {style.label}
                </span>
                {types.map((type) => {
                  const active = selected.has(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleType(type)}
                      disabled={disabled}
                      aria-pressed={active}
                      title={type}
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-colors disabled:opacity-60 ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-surface text-text-secondary hover:bg-surface-hover hover:text-text"
                      }`}
                    >
                      {humanizeEventType(type)}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-[11px] text-text-muted">
          Event-type filters appear once events have loaded.
        </p>
      )}

      {/* Date range */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
          <span className="inline-flex items-center gap-1">
            <CalendarDays size={11} />
            From
          </span>
          <input
            type="date"
            value={isoToDateInput(filters.from)}
            max={isoToDateInput(filters.to) || undefined}
            onChange={(e) => setFrom(e.target.value)}
            disabled={disabled}
            className="rounded-lg border border-border bg-surface px-2 py-1 text-xs font-medium text-text disabled:opacity-60"
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
          <span className="inline-flex items-center gap-1">
            <CalendarDays size={11} />
            To
          </span>
          <input
            type="date"
            value={isoToDateInput(filters.to)}
            min={isoToDateInput(filters.from) || undefined}
            onChange={(e) => setTo(e.target.value)}
            disabled={disabled}
            className="rounded-lg border border-border bg-surface px-2 py-1 text-xs font-medium text-text disabled:opacity-60"
          />
        </label>
      </div>
    </div>
  );
}
