/**
 * components/agents/ChangelogEntry.tsx
 * ─────────────────────────────────────────────────────────────
 * Renders a single version snapshot entry from an agent's
 * versionHistory array.  Reusable in AgentDetail and any future
 * timeline / audit views.
 *
 * Usage:
 *   <ChangelogEntry entry={entry} isLatest={index === 0} />
 *
 * Usage — full list:
 *   <ChangelogList entries={agent.versionHistory} />
 */

import classNames from "classnames";
import { GitCommitHorizontal, User } from "lucide-react";
import type { AgentVersionEntry } from "@/types/agents";

// ─── Single entry ─────────────────────────────────────────────────────────────

interface ChangelogEntryProps {
  entry: AgentVersionEntry;
  /** Visually marks this row as the current version */
  isLatest?: boolean;
  /** Whether to draw the connecting vertical line below this entry */
  showConnector?: boolean;
}

export function ChangelogEntry({
  entry,
  isLatest = false,
  showConnector = true,
}: ChangelogEntryProps) {
  const formatted = (() => {
    try {
      return new Date(entry.createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return entry.createdAt;
    }
  })();

  return (
    <div className="flex gap-3">
      {/* Timeline spine */}
      <div className="flex flex-col items-center shrink-0">
        <div
          className={classNames(
            "flex items-center justify-center w-7 h-7 rounded-full border-2 shrink-0",
            isLatest
              ? "border-blue-500 bg-blue-50 text-blue-600"
              : "border-gray-200 bg-white text-gray-400"
          )}
        >
          <GitCommitHorizontal size={13} />
        </div>
        {showConnector && (
          <div className="w-px flex-1 min-h-[20px] bg-gray-100 mt-1" />
        )}
      </div>

      {/* Content */}
      <div
        className={classNames(
          "flex-1 pb-5",
          !showConnector && "pb-0"
        )}
      >
        <div className="flex items-center gap-2 flex-wrap mb-1">
          {/* Version tag */}
          <span
            className={classNames(
              "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border font-mono",
              isLatest
                ? "bg-blue-50 border-blue-200 text-blue-700"
                : "bg-gray-100 border-gray-200 text-gray-600"
            )}
          >
            v{entry.versionNumber}
          </span>

          {isLatest && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-full">
              Current
            </span>
          )}

          {/* Date */}
          <span className="text-[11px] text-gray-400 font-medium ml-auto">
            {formatted}
          </span>
        </div>

        {/* Changelog message */}
        <p className="text-xs text-gray-700 leading-relaxed">
          {entry.changelog || <span className="italic text-gray-400">No changelog message.</span>}
        </p>

        {/* Author */}
        {entry.createdBy && (
          <div className="flex items-center gap-1 mt-1.5 text-[11px] text-gray-400">
            <User size={10} />
            {entry.createdBy}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Full ordered list ────────────────────────────────────────────────────────

interface ChangelogListProps {
  /** Expected newest-first or oldest-first — displayed as-is */
  entries: AgentVersionEntry[];
  className?: string;
}

export function ChangelogList({ entries, className }: ChangelogListProps) {
  if (!entries || entries.length === 0) {
    return (
      <p className="text-xs text-gray-400 italic px-1">
        No version history available.
      </p>
    );
  }

  return (
    <div className={className}>
      {entries.map((entry, idx) => (
        <ChangelogEntry
          key={`${entry.versionNumber}-${entry.createdAt}`}
          entry={entry}
          isLatest={idx === 0}
          showConnector={idx < entries.length - 1}
        />
      ))}
    </div>
  );
}
