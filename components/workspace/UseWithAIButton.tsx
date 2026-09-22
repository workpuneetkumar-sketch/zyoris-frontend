"use client";

/**
 * FE2-02 · Use with AI
 *
 * Fetches clean Markdown context from GET /workspace/pages/:id/ai-context,
 * then opens Zii by dispatching a custom DOM event `zii:open-with-context`.
 *
 * ZiiBot/index.tsx must listen for that event and pre-seed the chat.
 * See the companion change in components/ZiiBot/index.tsx.
 *
 * Security note: only the sanitised Markdown returned by the backend is passed
 * to Zii — raw/unauthorized page data never touches the chat payload.
 */

import React, { useState } from "react";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { getPageAIContext } from "@/lib/api/workspaceApi";

interface UseWithAIButtonProps {
  pageId: string;
  pageTitle: string;
  /** Compact style when rendered inside a dropdown menu */
  compact?: boolean;
}

export const UseWithAIButton: React.FC<UseWithAIButtonProps> = ({
  pageId,
  pageTitle,
  compact = false,
}) => {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleClick = async () => {
    if (status === "loading") return;
    setStatus("loading");
    setErrorMsg(null);

    try {
      const { markdown, title } = await getPageAIContext(pageId);

      // Dispatch the custom event — ZiiBot listens for this and pre-seeds context
      const event = new CustomEvent("zii:open-with-context", {
        detail: {
          pageId,
          pageTitle: title || pageTitle,
          contextMarkdown: markdown,
          // Pre-fill a prompt so the user lands with page context loaded
          seedMessage: `I'm viewing the page "${title || pageTitle}". Here's its content:\n\n${markdown}\n\nPlease help me work with this page.`,
        },
      });
      window.dispatchEvent(event);
      setStatus("idle");
    } catch (err: any) {
      setStatus("error");
      const msg =
        err?.response?.status === 403
          ? "You don't have permission to load AI context for this page."
          : err?.response?.status === 404
          ? "Page context not found. The page may have been deleted."
          : err?.response?.data?.message ??
            err?.message ??
            "Failed to load page context for AI.";
      setErrorMsg(msg);
      // Auto-clear error after 5 s
      setTimeout(() => {
        setStatus("idle");
        setErrorMsg(null);
      }, 5000);
    }
  };

  if (compact) {
    // Dropdown menu item style
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={status === "loading"}
        className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium disabled:opacity-60 transition"
      >
        {status === "loading" ? (
          <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
        ) : (
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
        )}
        <span>{status === "loading" ? "Loading context…" : "Use with AI"}</span>
      </button>
    );
  }

  // Toolbar button style
  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        disabled={status === "loading"}
        className="inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 disabled:opacity-60 rounded-lg transition"
        aria-label="Open this page in Zii AI"
      >
        {status === "loading" ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Sparkles className="w-3.5 h-3.5" />
        )}
        <span>{status === "loading" ? "Loading…" : "Use with AI"}</span>
      </button>

      {/* Inline error tooltip */}
      {status === "error" && errorMsg && (
        <div className="absolute top-full left-0 mt-1.5 z-50 w-64 p-2.5 bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-900/60 rounded-xl shadow-lg text-xs text-red-700 dark:text-red-300 flex items-start space-x-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};
