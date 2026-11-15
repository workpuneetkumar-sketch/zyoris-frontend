"use client";

import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";

interface ContextualSuggestionsProps {
  pathname?: string | null;
  onSelect: (text: string) => void;
  isDark?: boolean;
}

export function ContextualSuggestions({
  pathname,
  onSelect,
  isDark = false,
}: ContextualSuggestionsProps) {
  const { user } = useAuth();

  const suggestions = useMemo(() => {
    const path = (pathname || "").toLowerCase();

    if (path.includes("/domains")) {
      return [
        "Why won't my domain verify?",
        "My domain is on another account",
        "Use Zii with any AI agent, like Codex",
      ];
    }

    if (path.includes("/leads")) {
      return [
        "What are our newest high-priority leads?",
        "Summarize conversion rates and lead stages",
        "Use Zii with any autonomous agent or workflow",
      ];
    }

    if (path.includes("/deals")) {
      return [
        "Which deals are at health risk and need attention?",
        "What is our total projected pipeline value?",
        "Use Zii with any autonomous agent or workflow",
      ];
    }

    if (path.includes("/customers") || path.includes("/contacts")) {
      return [
        "Who are our top accounts by lifetime revenue?",
        "Identify accounts with declining engagement",
        "Use Zii with any autonomous agent or workflow",
      ];
    }

    if (path.includes("/workspace") || path.includes("/documents") || path.includes("/notes")) {
      return [
        "Summarize document contents and action items",
        "Draft a project specification in workspace",
        "Use Zii with any autonomous agent or workflow",
      ];
    }

    if (path.includes("/analytics") || path.includes("/reports")) {
      return [
        "Analyze revenue trends and conversion velocity",
        "Highlight anomalies in this quarter's metrics",
        "Use Zii with any autonomous agent or workflow",
      ];
    }

    if (path.includes("/finance") || path.includes("/cfo") || path.includes("/payment")) {
      return [
        "What is our projected revenue this quarter?",
        "Show invoice aging and pending disbursements",
        "Use Zii with any autonomous agent or workflow",
      ];
    }

    if (path.includes("/automation") || path.includes("/workflows") || path.includes("/agents")) {
      return [
        "What automated workflows are currently active?",
        "Show execution status and diagnostics",
        "Use Zii with any autonomous agent or workflow",
      ];
    }

    if (path.includes("/tasks") || path.includes("/calendar")) {
      return [
        "Which tasks require immediate attention today?",
        "What upcoming meetings and deadlines are scheduled?",
        "Use Zii with any autonomous agent or workflow",
      ];
    }

    // Role-based defaults for general OS / dashboard
    const role = user?.role?.toUpperCase();
    if (role === "CEO" || role === "ADMIN") {
      return [
        "How is our overall business pipeline performing?",
        "Summarize today's urgent operational priorities",
        "Use Zii with any AI agent, like Codex",
      ];
    }

    return [
      "What can you do for me across the OS?",
      "Summarize today's urgent tasks and priorities",
      "Use Zii with any AI agent, like Codex",
    ];
  }, [pathname, user?.role]);

  return (
    <div className="w-full space-y-1.5 my-2">
      {suggestions.map((text, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => onSelect(text)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-150 group ${
            isDark
              ? "hover:bg-zinc-900/80 text-zinc-300 hover:text-white"
              : "hover:bg-zinc-100 text-zinc-700 hover:text-zinc-950"
          }`}
        >
          <span
            className={`w-4 h-4 flex-shrink-0 flex items-center justify-center rounded text-[11px] font-mono font-medium select-none transition-colors ${
              isDark
                ? "bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700 group-hover:text-zinc-200"
                : "bg-zinc-200 text-zinc-600 group-hover:bg-zinc-300 group-hover:text-zinc-900"
            }`}
          >
            {idx + 1}
          </span>
          <span className="text-xs sm:text-[13px] leading-relaxed truncate">
            {text}
          </span>
        </button>
      ))}
    </div>
  );
}
