"use client";

/**
 * app/(dashboard)/support/page.tsx
 * ─────────────────────────────────────────────────────────────
 * W2 — Support UI
 *
 * Question box → Support Agent query → KnowledgeAnswerCard result.
 * Loading / empty / error states all present.
 * All colors via CSS variable tokens.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { querySupportAgent } from "@/lib/api/supportApi";
import { KnowledgeAnswerCard } from "@/components/support/KnowledgeAnswerCard";
import { toast } from "react-toastify";
import {
  Headphones,
  Send,
  RefreshCw,
  AlertCircle,
  MessageSquare,
} from "lucide-react";
import type { KnowledgeAnswer } from "@/lib/types/agent-results";

// ─── Suggested questions ──────────────────────────────────────────────────────

const SUGGESTED_QUESTIONS = [
  "How do I reset a customer's API credentials?",
  "What is the SLA for a P1 support ticket?",
  "How do I merge duplicate contacts in the CRM?",
  "What is the refund policy for enterprise customers?",
];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SupportPage() {
  const { user, token } = useAuth();
  const router = useRouter();

  const [question, setQuestion]   = useState("");
  const [loading, setLoading]     = useState(false);
  const [answer, setAnswer]       = useState<KnowledgeAnswer | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const inputRef                  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  const handleSubmit = useCallback(async () => {
    const q = question.trim();
    if (!q || loading) return;

    setLoading(true);
    setError(null);
    setAnswer(null);

    try {
      const result = await querySupportAgent({ question: q });
      setAnswer(result);
    } catch (err: any) {
      const msg = err.message ?? "Support Agent query failed.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [question, loading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const selectSuggestion = (q: string) => {
    setQuestion(q);
    inputRef.current?.focus();
  };

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-[900px] mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[color:var(--color-info-light)] border border-[color:var(--color-info-light)] rounded-xl flex items-center justify-center shrink-0">
          <Headphones size={20} className="text-[color:var(--color-info)]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[color:var(--color-text)] tracking-tight">
            Support Agent
          </h1>
          <p className="text-sm text-[color:var(--color-text-secondary)] mt-0.5">
            Ask a question — the agent answers using knowledge base articles and
            case history, always showing the sources it drew from.
          </p>
        </div>
      </div>

      {/* Question box */}
      <div className="bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-border)] shadow-sm p-4 space-y-3">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the Support Agent anything… (Enter to submit, Shift+Enter for new line)"
            rows={3}
            disabled={loading}
            className="w-full px-4 py-3 text-sm text-[color:var(--color-text)] placeholder:text-[color:var(--color-text-muted)] bg-[color:var(--color-background-secondary)] border border-[color:var(--color-border)] rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[color:var(--color-info-light)] focus:border-[color:var(--color-primary)] transition-all disabled:opacity-60"
          />
        </div>

        {/* Suggested questions */}
        {!answer && !loading && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => selectSuggestion(q)}
                className="text-[11px] font-medium px-2.5 py-1 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-background-secondary)] text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-surface-hover)] hover:text-[color:var(--color-text)] transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Submit row */}
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-[color:var(--color-text-muted)]">
            Press <kbd className="px-1 py-0.5 bg-[color:var(--color-background-tertiary)] rounded text-[10px] font-mono border border-[color:var(--color-border)]">Enter</kbd> to submit
          </p>
          <button
            onClick={handleSubmit}
            disabled={!question.trim() || loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed text-[color:var(--color-primary-foreground)] text-sm font-semibold rounded-xl transition-all"
          >
            {loading ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                Asking…
              </>
            ) : (
              <>
                <Send size={14} />
                Ask Agent
              </>
            )}
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-border)] shadow-sm p-5 space-y-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-lg bg-[color:var(--color-background-secondary)]" />
            <div className="h-4 bg-[color:var(--color-background-secondary)] rounded-lg w-48" />
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-[color:var(--color-background-secondary)] rounded-lg w-full" />
            <div className="h-3 bg-[color:var(--color-background-secondary)] rounded-lg w-4/5" />
            <div className="h-3 bg-[color:var(--color-background-secondary)] rounded-lg w-3/5" />
          </div>
          <div className="space-y-2">
            <div className="h-14 bg-[color:var(--color-background-secondary)] rounded-xl w-full" />
            <div className="h-14 bg-[color:var(--color-background-secondary)] rounded-xl w-full" />
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-[color:var(--color-error-light)] border border-[color:var(--color-error-light)]">
          <AlertCircle size={18} className="text-[color:var(--color-error)] shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[color:var(--color-error-foreground)]">
              Agent query failed
            </p>
            <p className="text-xs text-[color:var(--color-error-foreground)] opacity-80 mt-1">
              {error}
            </p>
          </div>
          <button
            onClick={handleSubmit}
            className="text-xs font-semibold text-[color:var(--color-error-foreground)] hover:underline shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state — no question asked yet */}
      {!answer && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 bg-[color:var(--color-background-secondary)] rounded-2xl flex items-center justify-center mb-4">
            <MessageSquare size={28} className="text-[color:var(--color-text-muted)]" />
          </div>
          <p className="text-sm font-semibold text-[color:var(--color-text)] mb-1">
            Ask your first question
          </p>
          <p className="text-xs text-[color:var(--color-text-muted)] max-w-xs">
            Type a support question above or pick one of the suggestions.
            The agent will answer using knowledge base articles and case history.
          </p>
        </div>
      )}

      {/* Result */}
      {answer && !loading && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[color:var(--color-text-muted)] uppercase tracking-wider">
              Agent Response
            </p>
            <button
              onClick={() => { setAnswer(null); setQuestion(""); }}
              className="text-xs text-[color:var(--color-primary)] hover:underline font-medium"
            >
              Ask another question
            </button>
          </div>
          <KnowledgeAnswerCard answer={answer} />
        </div>
      )}
    </div>
  );
}
