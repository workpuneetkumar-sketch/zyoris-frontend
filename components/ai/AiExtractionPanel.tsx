"use client";
// components/ai/AiExtractionPanel.tsx
// 6 AI extraction endpoints wired into a single panel.
// leadId is passed in so history survives modal close/re-open.

import {
  Sparkles, Loader2, AlertCircle, RefreshCw, RotateCcw,
  ShieldAlert, CalendarClock, UserCheck, Swords, ListChecks,
  Zap, History, ChevronDown, ChevronRight, Trash2,
} from "lucide-react";
import { useState } from "react";
import { useAiExtraction, ExtractionHistoryEntry } from "@/hooks/useAiExtraction";
import type { AiSourceType } from "@/lib/api/aiExtractionApi";
import type {
  RiskExtraction,
  TimelineExtraction,
  DecisionMakerExtraction,
  CompetitorExtraction,
  RequirementExtraction,
  NBAExtraction,
} from "@/types/leadIntelligence.types";

// ── Style helpers ──────────────────────────────────────────────────────────

function severityStyle(s: string) {
  switch (s?.toUpperCase()) {
    case "CRITICAL": return "bg-red-100 text-red-700 border-red-200";
    case "HIGH":     return "bg-orange-100 text-orange-700 border-orange-200";
    case "MEDIUM":   return "bg-amber-100 text-amber-700 border-amber-200";
    default:         return "bg-gray-100 text-gray-600 border-gray-200";
  }
}
function impactStyle(s: string) {
  switch (s?.toUpperCase()) {
    case "BLOCKING":  return "bg-red-100 text-red-700 border-red-200";
    case "NEGATIVE":  return "bg-orange-100 text-orange-700 border-orange-200";
    case "POSITIVE":  return "bg-emerald-100 text-emerald-700 border-emerald-200";
    default:          return "bg-gray-100 text-gray-600 border-gray-200";
  }
}
function statusStyle(s: string) {
  switch (s?.toUpperCase()) {
    case "BLOCKER":   return "bg-red-100 text-red-700 border-red-200";
    case "CONFIRMED": return "bg-emerald-100 text-emerald-700 border-emerald-200";
    default:          return "bg-blue-100 text-blue-700 border-blue-200";
  }
}
function authorityStyle(s: string) {
  switch (s?.toUpperCase()) {
    case "BUDGET_HOLDER":  return "bg-violet-100 text-violet-700 border-violet-200";
    case "DECISION_MAKER": return "bg-blue-100 text-blue-700 border-blue-200";
    case "INFLUENCER":     return "bg-sky-100 text-sky-700 border-sky-200";
    default:               return "bg-gray-100 text-gray-600 border-gray-200";
  }
}
function confidencePct(c: number) {
  return c > 1 ? Math.round(c) : Math.round(c * 100);
}

// ── Shared primitives ──────────────────────────────────────────────────────

function Pill({ label, style }: { label: string; style: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide ${style}`}>
      {String(label).replace(/_/g, " ")}
    </span>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = confidencePct(value);
  const color = pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-1.5 mt-1">
      <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-semibold text-gray-400 tabular-nums w-7 text-right">{pct}%</span>
    </div>
  );
}

function SectionHeader({ icon, label, count }: { icon: React.ReactNode; label: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <span className="w-5 h-5 rounded-md bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0">{icon}</span>
      <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">{label}</span>
      {count != null && (
        <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">{count}</span>
      )}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <p className="text-[11px] text-gray-400 italic py-1.5 text-center">{label}</p>;
}

// ── Result sections ────────────────────────────────────────────────────────

function NbaSection({ nba }: { nba: NBAExtraction | null }) {
  if (!nba) return null;
  return (
    <div className="bg-indigo-50 rounded-lg border border-indigo-100 p-3">
      <SectionHeader icon={<Zap size={11} />} label="Next Best Action" />
      <div className="space-y-1">
        <span className="inline-block text-[10px] font-bold text-indigo-700 uppercase bg-indigo-100 border border-indigo-200 rounded-full px-2 py-0.5">
          {nba.actionType}
        </span>
        <p className="text-[12px] font-semibold text-gray-900 leading-snug">{nba.specificMessage}</p>
        <p className="text-[10px] text-gray-500 leading-snug">{nba.reason}</p>
        <ConfidenceBar value={nba.confidence} />
      </div>
    </div>
  );
}

function RisksSection({ risks }: { risks: RiskExtraction[] }) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-3">
      <SectionHeader icon={<ShieldAlert size={11} />} label="Risks" count={risks.length} />
      {risks.length === 0 ? <EmptyState label="No risks detected" /> : (
        <div className="space-y-2">
          {risks.map((r, i) => (
            <div key={i} className="bg-gray-50 rounded-lg px-2.5 py-2 border border-gray-100 space-y-1">
              <div className="flex gap-1.5 flex-wrap">
                <Pill label={r.type} style={severityStyle(r.severity)} />
                <Pill label={r.severity} style={severityStyle(r.severity)} />
              </div>
              <p className="text-[10px] text-gray-600 leading-snug">{r.evidence}</p>
              <ConfidenceBar value={r.confidence} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TimelineSection({ timeline }: { timeline: TimelineExtraction | null }) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-3">
      <SectionHeader icon={<CalendarClock size={11} />} label="Timeline" />
      {!timeline ? <EmptyState label="No timeline signals found" /> : (
        <div className="space-y-1.5">
          {timeline.isoDate && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-500">Target date</span>
              <span className="text-[10px] font-bold text-gray-800">
                {new Date(timeline.isoDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
          )}
          {timeline.relativePeriod && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-500">Period</span>
              <span className="text-[10px] font-semibold text-indigo-600">{timeline.relativePeriod}</span>
            </div>
          )}
          <p className="text-[10px] text-gray-600 leading-snug bg-gray-50 rounded px-2 py-1.5 border border-gray-100">{timeline.evidence}</p>
          <ConfidenceBar value={timeline.confidence} />
        </div>
      )}
    </div>
  );
}

function AuthoritySection({ dm }: { dm: DecisionMakerExtraction | null }) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-3">
      <SectionHeader icon={<UserCheck size={11} />} label="Authority" />
      {!dm ? <EmptyState label="Authority not classified" /> : (
        <div className="space-y-1.5">
          <Pill label={dm.authority} style={authorityStyle(dm.authority)} />
          <p className="text-[10px] text-gray-600 leading-snug bg-gray-50 rounded px-2 py-1.5 border border-gray-100">{dm.evidence}</p>
          <ConfidenceBar value={dm.confidence} />
        </div>
      )}
    </div>
  );
}

function CompetitorsSection({ competitors }: { competitors: CompetitorExtraction[] }) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-3">
      <SectionHeader icon={<Swords size={11} />} label="Competitors" count={competitors.length} />
      {competitors.length === 0 ? <EmptyState label="No competitors mentioned" /> : (
        <div className="space-y-2">
          {competitors.map((c, i) => (
            <div key={i} className="bg-gray-50 rounded-lg px-2.5 py-2 border border-gray-100 space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-gray-800">{c.name}</span>
                <Pill label={c.impact} style={impactStyle(c.impact)} />
              </div>
              <p className="text-[10px] text-gray-600 leading-snug">{c.context}</p>
              <ConfidenceBar value={c.confidence} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RequirementsSection({ requirements }: { requirements: RequirementExtraction[] }) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-3">
      <SectionHeader icon={<ListChecks size={11} />} label="Requirements" count={requirements.length} />
      {requirements.length === 0 ? <EmptyState label="No requirements extracted" /> : (
        <div className="space-y-2">
          {requirements.map((r, i) => (
            <div key={i} className="bg-gray-50 rounded-lg px-2.5 py-2 border border-gray-100 space-y-1">
              <Pill label={r.status} style={statusStyle(r.status)} />
              <p className="text-[11px] font-semibold text-gray-800">{r.requirement}</p>
              <p className="text-[10px] text-gray-500 leading-snug">{r.evidence}</p>
              <ConfidenceBar value={r.confidence} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── History sidebar item ───────────────────────────────────────────────────

function HistoryItem({
  entry,
  isActive,
  onLoad,
}: {
  entry: ExtractionHistoryEntry;
  isActive: boolean;
  onLoad: () => void;
}) {
  const d = new Date(entry.extractedAt);
  const label = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) +
    " " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

  const hasResults =
    entry.bundle.risks.length > 0 ||
    entry.bundle.competitors.length > 0 ||
    entry.bundle.requirements.length > 0 ||
    entry.bundle.timeline !== null ||
    entry.bundle.decisionMaker !== null ||
    entry.bundle.nextBestAction !== null;

  return (
    <button
      onClick={onLoad}
      className={`w-full text-left px-3 py-2 rounded-lg border transition-all ${
        isActive
          ? "bg-indigo-50 border-indigo-200 text-indigo-700"
          : "bg-white border-gray-100 text-gray-700 hover:bg-gray-50"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
          {entry.sourceType}
        </span>
        <span className="text-[10px] text-gray-500 ml-auto">{label}</span>
      </div>
      <p className="text-[10px] text-gray-500 mt-1 truncate">
        {entry.sourceText.slice(0, 60)}…
      </p>
      <p className={`text-[9px] mt-0.5 font-semibold ${hasResults ? "text-emerald-600" : "text-gray-400"}`}>
        {hasResults ? "Has results" : "No results extracted"}
      </p>
    </button>
  );
}

// ── Source types ───────────────────────────────────────────────────────────

const SOURCE_TYPES: { value: AiSourceType; label: string }[] = [
  { value: "EMAIL",    label: "Email" },
  { value: "CALL",     label: "Call" },
  { value: "MEETING",  label: "Meeting" },
  { value: "NOTE",     label: "Note" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "CHAT",     label: "Chat" },
];

// ── Main panel ─────────────────────────────────────────────────────────────

interface AiExtractionPanelProps {
  leadId?: string;
}

export function AiExtractionPanel({ leadId }: AiExtractionPanelProps) {
  const {
    sourceText, setSourceText,
    sourceType, setSourceType,
    status, error,
    bundle,
    history,
    loadHistoryEntry,
    clearHistory,
    run, reset,
  } = useAiExtraction(leadId);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  const isLoading  = status === "loading";
  const hasResults = status === "success" && bundle !== null;
  const hasError   = status === "error";

  return (
    <div className="bg-white rounded-lg border border-indigo-100 shadow-sm">

      {/* ── Header ── */}
      <div className="px-4 py-3 border-b border-indigo-50 bg-gradient-to-r from-indigo-50 to-purple-50 flex items-center gap-2">
        <Sparkles size={15} className="text-indigo-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-gray-800">Extract Intelligence</h3>
          <p className="text-[10px] text-gray-500">Paste conversation text to extract risks, timeline, requirements &amp; more</p>
        </div>
        {/* History toggle */}
        {history.length > 0 && (
          <button
            onClick={() => setHistoryOpen(v => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
              historyOpen
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50"
            }`}
          >
            <History size={12} />
            History ({history.length})
          </button>
        )}
      </div>

      <div className="p-4 space-y-4 bg-gray-50/30">

        {/* ── History panel ── */}
        {historyOpen && history.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">Past Extractions</span>
              <button
                onClick={() => { clearHistory(); setHistoryOpen(false); setActiveHistoryId(null); }}
                className="flex items-center gap-1 text-[10px] text-red-500 hover:text-red-700 font-semibold"
              >
                <Trash2 size={10} /> Clear all
              </button>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {[...history].reverse().map(entry => (
                <HistoryItem
                  key={entry.id}
                  entry={entry}
                  isActive={activeHistoryId === entry.id}
                  onLoad={() => {
                    loadHistoryEntry(entry);
                    setActiveHistoryId(entry.id);
                    setHistoryOpen(false);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Input ── */}
        <div className="space-y-3">
          {/* Source type pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Source:</span>
            {SOURCE_TYPES.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSourceType(opt.value)}
                className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-all ${
                  sourceType === opt.value
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Textarea */}
          <textarea
            value={sourceText}
            onChange={e => setSourceText(e.target.value)}
            disabled={isLoading}
            rows={4}
            placeholder={`Paste a ${sourceType.toLowerCase()} conversation, meeting notes, or any relevant text here…`}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 focus:border-transparent resize-none disabled:opacity-60 disabled:cursor-not-allowed"
          />

          {/* Error box */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle size={13} className="text-red-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-red-700">Extraction failed</p>
                <p className="text-[10px] text-red-600 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Action buttons — always visible */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={run}
              disabled={isLoading || !sourceText.trim()}
              className="flex items-center justify-center gap-2 flex-1 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading
                ? <><Loader2 size={14} className="animate-spin" /> Processing…</>
                : <><Sparkles size={14} /> Extract Intelligence</>}
            </button>

            {(hasResults || hasError) && (
              <button
                type="button"
                onClick={() => { reset(); setActiveHistoryId(null); }}
                className="p-2.5 rounded-lg bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 transition-all"
                title="Clear results"
              >
                <RotateCcw size={14} />
              </button>
            )}

            {hasResults && (
              <button
                type="button"
                onClick={run}
                disabled={isLoading}
                className="p-2.5 rounded-lg bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50"
                title="Re-run extraction"
              >
                <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
              </button>
            )}
          </div>
        </div>

        {/* ── Loading skeleton ── */}
        {isLoading && (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-100 p-3 space-y-2 animate-pulse">
                <div className="h-3 w-20 bg-gray-100 rounded" />
                <div className="h-6 bg-gray-100 rounded" />
                <div className="h-1.5 w-full bg-gray-100 rounded-full" />
              </div>
            ))}
          </div>
        )}

        {/* ── Results ── */}
        {hasResults && bundle && (
          <div className="space-y-3">
            <NbaSection nba={bundle.nextBestAction} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <RisksSection risks={bundle.risks} />
              <TimelineSection timeline={bundle.timeline} />
              <AuthoritySection dm={bundle.decisionMaker} />
              <CompetitorsSection competitors={bundle.competitors} />
              <div className="md:col-span-2">
                <RequirementsSection requirements={bundle.requirements} />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
