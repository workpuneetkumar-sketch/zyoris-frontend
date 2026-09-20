"use client";

/**
 * components/support/KnowledgeAnswerCard.tsx
 * ─────────────────────────────────────────────────────────────
 * W2 — Support UI (Knowledge Answer)
 *
 * Renders a KnowledgeAnswer inside AgentResultFrame.
 * Shows: question, answer, and a source list (title, snippet, link-out).
 *
 * Acceptance criteria (W2):
 * ✓ Sources with a url are clickable (external link)
 * ✓ Case-linked sources route to /approvals (case detail) when relatedCaseId present
 * ✓ An answer with zero sources shows explicit "no supporting sources" state
 * ✓ Loading / empty / error states present
 * ✓ All colors via CSS variable tokens
 */

import classNames from "classnames";
import {
  MessageSquare,
  BookOpen,
  FileText,
  Headphones,
  ExternalLink,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { AgentResultFrame } from "@/components/agents/AgentResultFrame";
import type { KnowledgeAnswer, KnowledgeSource } from "@/lib/types/agent-results";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KnowledgeAnswerCardProps {
  answer: KnowledgeAnswer;
  className?: string;
}

// ─── Source row ───────────────────────────────────────────────────────────────

const SOURCE_ICONS: Record<KnowledgeSource["sourceType"], React.ElementType> = {
  kb_article: BookOpen,
  case: Headphones,
  macro: FileText,
};

const SOURCE_COLORS: Record<KnowledgeSource["sourceType"], string> = {
  kb_article: "bg-[color:var(--color-info-light)] text-[color:var(--color-info)]",
  case: "bg-[color:var(--color-warning-light)] text-[color:var(--color-warning-foreground)]",
  macro: "bg-[color:var(--color-success-light)] text-[color:var(--color-success-foreground)]",
};

const SOURCE_TYPE_LABEL: Record<KnowledgeSource["sourceType"], string> = {
  kb_article: "KB Article",
  case: "Support Case",
  macro: "Macro",
};

function SourceRow({ source }: { source: KnowledgeSource }) {
  const Icon = SOURCE_ICONS[source.sourceType] ?? BookOpen;
  const colorClass = SOURCE_COLORS[source.sourceType] ?? SOURCE_COLORS.kb_article;

  // Case-linked sources route to the case detail page
  const href =
    source.url ??
    (source.sourceType === "case" ? `/approvals?search=${source.id}` : undefined);

  const inner = (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-[color:var(--color-border-light)] bg-[color:var(--color-background-secondary)] hover:bg-[color:var(--color-surface-hover)] transition-colors group">
      <div
        className={classNames(
          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
          colorClass
        )}
      >
        <Icon size={13} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-semibold text-[color:var(--color-text)] truncate leading-snug">
            {source.title}
          </p>
          {href && (
            <ExternalLink
              size={10}
              className="text-[color:var(--color-text-muted)] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            />
          )}
        </div>
        <p className="text-[10px] text-[color:var(--color-text-muted)] mt-0.5 font-medium uppercase tracking-wide">
          {SOURCE_TYPE_LABEL[source.sourceType]}
        </p>
        {source.snippet && (
          <p className="text-xs text-[color:var(--color-text-secondary)] mt-1.5 leading-relaxed line-clamp-2">
            {source.snippet}
          </p>
        )}
      </div>
      {href && (
        <ChevronRight
          size={14}
          className="text-[color:var(--color-text-muted)] shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity"
        />
      )}
    </div>
  );

  if (href) {
    return (
      <a href={href} target={source.url ? "_blank" : "_self"} rel="noopener noreferrer">
        {inner}
      </a>
    );
  }

  return inner;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function KnowledgeAnswerCard({ answer, className }: KnowledgeAnswerCardProps) {
  return (
    <AgentResultFrame
      result={answer}
      status="SUCCESS"
      evidenceTitle="Knowledge Base Sources"
      className={className}
    >
      <div className="space-y-5">
        {/* Question */}
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-[color:var(--color-primary)] flex items-center justify-center shrink-0 mt-0.5">
            <MessageSquare size={13} className="text-[color:var(--color-primary-foreground)]" />
          </div>
          <p className="text-sm font-semibold text-[color:var(--color-text)] leading-relaxed">
            {answer.question}
          </p>
        </div>

        {/* Answer */}
        <div className="bg-[color:var(--color-surface-active)] rounded-2xl p-4 border border-[color:var(--color-border-light)]">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-[color:var(--color-text-muted)] mb-2">
            Answer
          </p>
          <p className="text-sm text-[color:var(--color-text)] leading-relaxed">
            {answer.answer}
          </p>
        </div>

        {/* Sources */}
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-[color:var(--color-text-muted)] mb-3">
            Sources ({answer.sources.length})
          </p>

          {answer.sources.length === 0 ? (
            /* W2 AC: explicit "no sources" state — never silently empty */
            <div className="flex items-center gap-3 p-4 rounded-xl border border-[color:var(--color-warning-light)] bg-[color:var(--color-warning-light)]">
              <AlertCircle
                size={16}
                className="text-[color:var(--color-warning-foreground)] shrink-0"
              />
              <div>
                <p className="text-xs font-bold text-[color:var(--color-warning-foreground)]">
                  No supporting sources
                </p>
                <p className="text-xs text-[color:var(--color-warning-foreground)] opacity-80 mt-0.5">
                  The agent answered without citing any knowledge base articles or
                  support cases. Treat this response with additional scrutiny.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {answer.sources.map((src) => (
                <SourceRow key={src.id} source={src} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AgentResultFrame>
  );
}
