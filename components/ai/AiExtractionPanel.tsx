"use client";
// components/ai/AiExtractionPanel.tsx
// Full UI for the 6 ad-hoc AI extraction endpoints.
// Paste any conversation text → hit Extract Intelligence → see risks, timeline,
// decision-maker, competitors, requirements, and next best action.

import { Sparkles, Loader2, AlertCircle, RefreshCw, RotateCcw,
         ShieldAlert, CalendarClock, UserCheck, Swords, ListChecks,
         Zap } from "lucide-react";
import { useCallback } from "react";
import { useAiExtraction } from "@/hooks/useAiExtraction";
import type { AiSourceType } from "@/lib/api/aiExtractionApi";
import type {
  RiskExtraction,
  TimelineExtraction,
  DecisionMakerExtraction,
  CompetitorExtraction,
  RequirementExtraction,
  NBAExtraction,
} from "@/types/leadIntelligence.types";

// ── colour helpers ─────────────────────────────────────────────────────────

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
    case "NEUTRAL":   return "bg-gray-100 text-gray-600 border-gray-200";
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
  // API returns 0-1 float
  return c > 1 ? Math.round(c) : Math.round(c * 100);
}

// ── small shared sub-components ────────────────────────────────────────────

function Pill({ label, style }: { label: string; style: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide ${style}`}>
      {label.replace(/_/g, " ")}
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
    <div className="flex items-center gap-2 mb-3">
      <span className="w-5 h-5 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0">
        {icon}
      </span>
      <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">{label}</span>
      {count != null && (
        <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
          {count}
        </span>
      )}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <p className="text-[11px] text-gray-400 italic py-2 text-center">{label}</p>
  );
}

// ── Section: Risks ─────────────────────────────────────────────────────────

function RisksSection({ risks }: { risks: RiskExtraction[] }) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-3 shadow-xs">
      <SectionHeader icon={<ShieldAlert size={12} />} label="Risks" count={risks.length} />
      {risks.length === 0 ? (
        <EmptyState label="No risks detected" />
      ) : (
        <div className="space-y-2">
          {risks.map((r, i) => (
            <div key={i} className="rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-2 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
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

// ── Section: Timeline ──────────────────────────────────────────────────────

function TimelineSection({ timeline }: { timeline: TimelineExtraction | null }) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-3 shadow-xs">
      <SectionHeader icon={<CalendarClock size={12} />} label="Timeline" />
      {!timeline ? (
        <EmptyState label="No timeline signals found" />
      ) : (
        <div className="space-y-1.5">
          {timeline.isoDate && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-500">Target date</span>
              <span className="text-[10px] font-bold text-gray-800">
                {new Date(timeline.isoDate).toLocaleDateString("en-IN", {
                  day: "numeric", month: "short", year: "numeric",
                })}
              </span>
            </div>
          )}
          {timeline.relativePeriod && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-500">Relative period</span>
              <span className="text-[10px] font-semibold text-indigo-600">{timeline.relativePeriod}</span>
            </div>
          )}
          <p className="text-[10px] text-gray-600 leading-snug bg-gray-50 rounded-lg px-2 py-1.5 border border-gray-100">
            {timeline.evidence}
          </p>
          <ConfidenceBar value={timeline.confidence} />
        </div>
      )}
    </div>
  );
}

// ── Section: Decision Maker ────────────────────────────────────────────────

function DecisionMakerSection({ dm }: { dm: DecisionMakerExtraction | null }) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-3 shadow-xs">
      <SectionHeader icon={<UserCheck size={12} />} label="Authority" />
      {!dm ? (
        <EmptyState label="Authority not classified" />
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Pill label={dm.authority} style={authorityStyle(dm.authority)} />
          </div>
          <p className="text-[10px] text-gray-600 leading-snug bg-gray-50 rounded-lg px-2 py-1.5 border border-gray-100">
            {dm.evidence}
          </p>
          <ConfidenceBar value={dm.confidence} />
        </div>
      )}
    </div>
  );
}

// ── Section: Competitors ───────────────────────────────────────────────────

function CompetitorsSection({ competitors }: { competitors: CompetitorExtraction[] }) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-3 shadow-xs">
      <SectionHeader icon={<Swords size={12} />} label="Competitors" count={competitors.length} />
      {competitors.length === 0 ? (
        <EmptyState label="No competitor mentions found" />
      ) : (
        <div className="space-y-2">
          {competitors.map((c, i) => (
            <div key={i} className="rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-2 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
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

// ── Section: Requirements ──────────────────────────────────────────────────

function RequirementsSection({ requirements }: { requirements: RequirementExtraction[] }) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-3 shadow-xs">
      <SectionHeader icon={<ListChecks size={12} />} label="Requirements" count={requirements.length} />
      {requirements.length === 0 ? (
        <EmptyState label="No requirements extracted" />
      ) : (
        <div className="space-y-2">
          {requirements.map((r, i) => (
            <div key={i} className="rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-2 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <Pill label={r.status} style={statusStyle(r.status)} />
              </div>
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

// ── Section: Next Best Action ──────────────────────────────────────────────

function NbaSection({ nba }: { nba: NBAExtraction | null }) {
  return (
    <div className="bg-indigo-50 rounded-lg border border-indigo-100 p-3 shadow-xs">
      <SectionHeader icon={<Zap size={12} />} label="Next Best Action" />
      {!nba ? (
        <EmptyState label="No recommendation generated" />
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wide bg-indigo-100 border border-indigo-200 rounded-full px-2 py-0.5">
              {nba.actionType}
            </span>
          </div>
          <p className="text-[12px] font-semibold text-gray-900 leading-snug">
            {nba.specificMessage}
          </p>
          <p className="text-[10px] text-gray-500 leading-snug">{nba.reason}</p>
          <ConfidenceBar value={nba.confidence} />
        </div>
      )}
    </div>
  );
}

// ── Source type options ────────────────────────────────────────────────────

const SOURCE_TYPES: { value: AiSourceType; label: string }[] = [
  { value: "EMAIL",    label: "Email" },
  { value: "CALL",     label: "Call" },
  { value: "MEETING",  label: "Meeting" },
  { value: "NOTE",     label: "Note" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "CHAT",     label: "Chat" },
];

// ── Main panel ─────────────────────────────────────────────────────────────

export function AiExtractionPanel() {
  const {
    sourceText, setSourceText,
    sourceType, setSourceType,
    status, error,
    bundle,
    run, reset,
  } = useAiExtraction();

  const isLoading = status === "loading";
  const hasResults = status === "success" && bundle !== null;
  const hasError = status === "error";

  return (
    <div className="bg-white rounded-lg border border-indigo-100 shadow-sm">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-indigo-50 bg-gradient-to-r from-indigo-50 to-purple-50 flex items-center gap-2">
        <Sparkles size={16} className="text-indigo-500 shrink-0" />
        <div>
          <h3 className="text-sm font-bold text-gray-800">Extract Intelligence</h3>
          <p className="text-[10px] text-gray-500">Paste conversation text to extract risks, timeline, requirements & more</p>
        </div>
      </div>

      <div className="p-4 space-y-4 bg-gray-50/50">

        {/* ── Input area ──────────────────────────────────────────────── */}
        <div className="space-y-3">
          {/* Source type picker - compact inline */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Source:</span>
            <div className="flex gap-1 flex-wrap">
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
          </div>

          {/* Text area */}
          <textarea
            value={sourceText}
            onChange={e => setSourceText(e.target.value)}
            disabled={isLoading}
            rows={4}
            placeholder={`Paste a ${sourceType.toLowerCase()} conversation, meeting notes, or any relevant text here…`}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 focus:border-transparent resize-none disabled:opacity-60 disabled:cursor-not-allowed"
          />

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
              <AlertCircle size={13} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-[10px] font-semibold text-red-700">{error}</p>
            </div>
          )}

          {/* Action buttons - ALWAYS VISIBLE and PROMINENT */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={run}
              disabled={isLoading || !sourceText.trim()}
              className="flex items-center justify-center gap-2 flex-1 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading
                ? <><Loader2 size={15} className="animate-spin" /> Processing…</>
                : <><Sparkles size={15} /> Extract Intelligence</>}
            </button>
            
            {(hasResults || hasError) && (
              <button
                type="button"
                onClick={reset}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-white border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-all"
                title="Clear and start over"
              >
                <RotateCcw size={14} />
              </button>
            )}
            
            {hasResults && (
              <button
                type="button"
                onClick={run}
                disabled={isLoading}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-white border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-all disabled:opacity-50"
                title="Re-run extraction"
              >
                <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
              </button>
            )}
          </div>
        </div>

        {/* ── Loading skeleton ─────────────────────────────────────────── */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-100 p-3 space-y-2 animate-pulse">
                <div className="h-3 w-20 bg-gray-100 rounded" />
                <div className="h-6 bg-gray-100 rounded" />
                <div className="h-1.5 w-full bg-gray-100 rounded-full" />
              </div>
            ))}
          </div>
        )}

        {/* ── Results grid ─────────────────────────────────────────────── */}
        {hasResults && bundle && (
          <>
            {/* NBA spans full width — most actionable result */}
            <NbaSection nba={bundle.nextBestAction} />

            {/* 2-column grid for the remaining 5 sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <RisksSection risks={bundle.risks} />
              <TimelineSection timeline={bundle.timeline} />
              <DecisionMakerSection dm={bundle.decisionMaker} />
              <CompetitorsSection competitors={bundle.competitors} />
              <div className="md:col-span-2">
                <RequirementsSection requirements={bundle.requirements} />
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
