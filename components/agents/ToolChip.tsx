/**
 * components/agents/ToolChip.tsx
 * ─────────────────────────────────────────────────────────────
 * A small chip that displays a single allowed-tool identifier.
 * Reusable in AgentDetail, future agent-result cards, and anywhere
 * a list of tool names needs to be rendered compactly.
 *
 * Usage — single chip:
 *   <ToolChip name="web_search" />
 *
 * Usage — list of chips:
 *   <ToolChipList tools={agent.allowedTools} />
 */

import classNames from "classnames";
import { Wrench } from "lucide-react";

// ─── Single chip ──────────────────────────────────────────────────────────────

interface ToolChipProps {
  name: string;
  className?: string;
}

export function ToolChip({ name, className }: ToolChipProps) {
  return (
    <span
      className={classNames(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg",
        "bg-slate-100 border border-slate-200 text-slate-700",
        "text-[11px] font-semibold font-mono",
        "hover:bg-slate-200 transition-colors",
        className
      )}
    >
      <Wrench size={10} className="text-slate-500 shrink-0" />
      {name}
    </span>
  );
}

// ─── Chip list with overflow collapse ─────────────────────────────────────────

interface ToolChipListProps {
  tools: string[];
  /**
   * Max chips to show before collapsing into "+N more".
   * Pass Infinity to always show all.  Defaults to 8.
   */
  maxVisible?: number;
  className?: string;
}

export function ToolChipList({
  tools,
  maxVisible = 8,
  className,
}: ToolChipListProps) {
  if (!tools || tools.length === 0) {
    return (
      <span className="text-xs text-gray-400 italic">No tools assigned</span>
    );
  }

  const visible = tools.slice(0, maxVisible);
  const overflow = tools.length - visible.length;

  return (
    <div className={classNames("flex flex-wrap gap-1.5", className)}>
      {visible.map((tool) => (
        <ToolChip key={tool} name={tool} />
      ))}
      {overflow > 0 && (
        <span
          className={classNames(
            "inline-flex items-center px-2.5 py-1 rounded-lg",
            "bg-gray-100 border border-gray-200 text-gray-500",
            "text-[11px] font-semibold"
          )}
          title={tools.slice(maxVisible).join(", ")}
        >
          +{overflow} more
        </span>
      )}
    </div>
  );
}
