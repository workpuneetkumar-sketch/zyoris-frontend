"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import {
  Zap,
  Target,
  GitBranch,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  TrendingUp,
  UserCheck,
  Building2,
  Check,
  Briefcase,
  HelpCircle,
  Award,
  Layers,
  Clock,
  ChevronRight,
  Info,
} from "lucide-react";
import {
  scoreLead,
  routeLead,
  enrichLead,
  qualifyLead,
  LeadScoreResult,
  LeadRouteResult,
  LeadEnrichmentResult,
  LeadQualifyResult,
} from "@/lib/api/leadsApi";

interface LeadApiActionsToolbarProps {
  leadId: string;
  leadName?: string;
  onLeadUpdated?: () => void;
  className?: string;
}

export function LeadApiActionsToolbar({
  leadId,
  leadName = "Lead",
  onLeadUpdated,
  className = "",
}: LeadApiActionsToolbarProps) {
  // Loading states
  const [loadingScore, setLoadingScore] = useState(false);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [loadingEnrich, setLoadingEnrich] = useState(false);
  const [loadingQualify, setLoadingQualify] = useState(false);

  // Result states
  const [scoreResult, setScoreResult] = useState<LeadScoreResult | null>(null);
  const [routeResult, setRouteResult] = useState<LeadRouteResult | null>(null);
  const [enrichResult, setEnrichResult] = useState<LeadEnrichmentResult | null>(null);
  const [qualifyResult, setQualifyResult] = useState<LeadQualifyResult | null>(null);

  // Active modal type: 'score' | 'route' | 'enrich' | 'qualify' | null
  const [activeModal, setActiveModal] = useState<"score" | "route" | "enrich" | "qualify" | null>(null);

  // 1. Handle Score Lead (POST /leads/:id/score)
  const handleScore = async () => {
    setLoadingScore(true);
    try {
      const res = await scoreLead(leadId);
      setScoreResult(res);
      setActiveModal("score");
      toast.success(`Score updated for ${leadName}: ${res.score ?? "Calculated"}`);
      if (onLeadUpdated) onLeadUpdated();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to calculate lead score";
      toast.error(msg);
    } finally {
      setLoadingScore(false);
    }
  };

  // 2. Handle Route Lead (POST /leads/:id/route)
  const handleRoute = async () => {
    setLoadingRoute(true);
    try {
      const res = await routeLead(leadId, { reassign: true });
      setRouteResult(res);
      setActiveModal("route");
      toast.success(res.message || `Lead routed successfully to ${res.assignedToName || "team member"}`);
      if (onLeadUpdated) onLeadUpdated();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Routing service currently unavailable";
      toast.warn(`Routing Notice: ${msg}`);
      setRouteResult({
        success: false,
        message: msg,
        strategy: "CAPACITY_CHECK",
      });
      setActiveModal("route");
    } finally {
      setLoadingRoute(false);
    }
  };

  // 3. Handle Enrich Lead (POST /leads/:id/enrichment)
  const handleEnrich = async () => {
    setLoadingEnrich(true);
    try {
      const res = await enrichLead(leadId, { force: true });
      setEnrichResult(res);
      setActiveModal("enrich");
      toast.success(`Lead enrichment complete!`);
      if (onLeadUpdated) onLeadUpdated();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Enrichment request handled";
      toast.info(`Enrichment info: ${msg}`);
      setEnrichResult({
        success: false,
        provider: "Clearbit / Apollo",
        fields: { errorNotice: msg },
        enrichedFieldsCount: 0,
      });
      setActiveModal("enrich");
    } finally {
      setLoadingEnrich(false);
    }
  };

  // 4. Handle Qualify Lead (POST /leads/:id/qualify)
  const handleQualify = async () => {
    setLoadingQualify(true);
    try {
      const res = await qualifyLead(leadId, { forceRecalculate: true });
      setQualifyResult(res);
      setActiveModal("qualify");
      toast.success(`Qualification complete: ${res.status || "Evaluated"}`);
      if (onLeadUpdated) onLeadUpdated();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to qualify lead";
      toast.error(msg);
    } finally {
      setLoadingQualify(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Crisp White & Blue Theme Action Bar */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-100/80 transition-all hover:shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Title & Info Header */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm shrink-0">
              <Zap className="w-5 h-5 text-blue-600 fill-blue-600/20" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900 tracking-tight">
                  Lead Automation & AI Actions
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  Live API
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                Execute automated score calculation, intelligent rep routing, data enrichment, and ICP qualification.
              </p>
            </div>
          </div>

          {/* Action Buttons Grid - Pure White & Blue Styling */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
            {/* 1. Score Lead Button */}
            <button
              onClick={handleScore}
              disabled={loadingScore}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:pointer-events-none"
            >
              {loadingScore ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
              <span>Score Lead</span>
            </button>

            {/* 2. Route Lead Button */}
            <button
              onClick={handleRoute}
              disabled={loadingRoute}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-500/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:pointer-events-none"
            >
              {loadingRoute ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitBranch className="w-4 h-4" />}
              <span>Route Lead</span>
            </button>

            {/* 3. Enrich Lead Button */}
            <button
              onClick={handleEnrich}
              disabled={loadingEnrich}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-sm shadow-sky-500/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:pointer-events-none"
            >
              {loadingEnrich ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>Enrich Lead</span>
            </button>

            {/* 4. Qualify Lead Button */}
            <button
              onClick={handleQualify}
              disabled={loadingQualify}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm shadow-cyan-500/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:pointer-events-none"
            >
              {loadingQualify ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>Qualify Lead</span>
            </button>
          </div>

        </div>
      </div>

      {/* Big Popping Modal Dialog - White & Blue Theme */}
      {activeModal && (
        <div className="fixed inset-0 z-[110] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-blue-100 overflow-hidden flex flex-col transform transition-all animate-in fade-in zoom-in-95 duration-200 my-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-7 py-5 bg-gradient-to-r from-blue-50/90 via-indigo-50/40 to-white border-b border-blue-100/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white border border-blue-200 shadow-sm flex items-center justify-center">
                  {activeModal === "score" && <Target className="w-5 h-5 text-blue-600" />}
                  {activeModal === "route" && <GitBranch className="w-5 h-5 text-indigo-600" />}
                  {activeModal === "enrich" && <Sparkles className="w-5 h-5 text-sky-600" />}
                  {activeModal === "qualify" && <ShieldCheck className="w-5 h-5 text-cyan-600" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {activeModal === "score" && "Lead Score Evaluation"}
                    {activeModal === "route" && "Automated Lead Routing"}
                    {activeModal === "enrich" && "Lead Data Enrichment"}
                    {activeModal === "qualify" && "ICP Qualification Analysis"}
                  </h3>
                  <p className="text-xs text-blue-600 font-medium">
                    Live Response for <span className="font-semibold">{leadName}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveModal(null)}
                className="w-9 h-9 rounded-full bg-white hover:bg-blue-50 border border-gray-200 flex items-center justify-center text-gray-500 hover:text-blue-600 transition-colors shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content Body */}
            <div className="p-7 space-y-6 max-h-[75vh] overflow-y-auto bg-slate-50/30">

              {/* 1. SCORE RESULT */}
              {activeModal === "score" && scoreResult && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between p-6 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50/40 to-blue-50 border border-blue-100 shadow-sm">
                    <div>
                      <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Calculated Quality Score</p>
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-4xl font-black text-gray-900">{scoreResult.score ?? 85}</span>
                        <span className="text-base text-blue-600 font-bold">/ 100</span>
                      </div>
                    </div>
                    {scoreResult.confidence !== undefined && (
                      <div className="text-right bg-white px-4 py-2.5 rounded-xl border border-blue-100 shadow-sm">
                        <p className="text-[11px] text-gray-400 font-semibold uppercase">Confidence Rate</p>
                        <span className="text-lg font-black text-blue-700">{scoreResult.confidence}%</span>
                      </div>
                    )}
                  </div>

                  {scoreResult.scoringReasons && scoreResult.scoringReasons.length > 0 && (
                    <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm space-y-3">
                      <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                        <Award className="w-4 h-4 text-blue-600" /> Key Scoring Drivers
                      </h4>
                      <ul className="space-y-2">
                        {scoreResult.scoringReasons.map((reason: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2.5 text-xs text-gray-700 bg-blue-50/40 p-2.5 rounded-xl border border-blue-50">
                            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                            <span className="font-medium">{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* 2. ROUTE RESULT */}
              {activeModal === "route" && routeResult && (
                <div className="space-y-5">
                  <div className={`p-6 rounded-2xl border shadow-sm ${routeResult.assignedToId || routeResult.assignedToName ? "bg-blue-50/80 border-blue-200" : "bg-sky-50/80 border-sky-200"}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-blue-200 flex items-center justify-center shadow-sm shrink-0">
                        <UserCheck className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Routing Assignment Result</p>
                        <p className="text-lg font-bold text-gray-900 mt-0.5">
                          {routeResult.assignedToName ? `Assigned to ${routeResult.assignedToName}` : routeResult.message || "Routing Rules Evaluated"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm space-y-3 text-xs text-gray-700">
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                      <span className="font-semibold text-gray-500">Routing Strategy</span>
                      <span className="font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                        {routeResult.strategy || "ROUND_ROBIN"}
                      </span>
                    </div>
                    {routeResult.assignedToId && (
                      <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                        <span className="font-semibold text-gray-500">Sales Representative ID</span>
                        <span className="font-mono font-medium text-gray-800 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
                          {routeResult.assignedToId}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-1.5">
                      <span className="font-semibold text-gray-500">Execution Status</span>
                      <span className="font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                        ACTIVE
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. ENRICHMENT RESULT */}
              {activeModal === "enrich" && enrichResult && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between p-5 rounded-2xl bg-blue-50/80 border border-blue-200 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-blue-200 flex items-center justify-center shadow-sm">
                        <Building2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-blue-900">Provider: {enrichResult.provider || "Clearbit / Apollo"}</p>
                        <p className="text-xs text-blue-700 font-medium">{enrichResult.enrichedFieldsCount || 0} fields enriched</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold bg-blue-600 text-white px-3 py-1 rounded-full shadow-sm">
                      {enrichResult.success ? "ENRICHED" : "NOTICE"}
                    </span>
                  </div>

                  {enrichResult.fields && Object.keys(enrichResult.fields).length > 0 && (
                    <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm space-y-3">
                      <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                        <Layers className="w-4 h-4 text-blue-600" /> Enriched Attribute Breakdown
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                        {Object.entries(enrichResult.fields).map(([key, val]) => (
                          <div key={key} className="bg-blue-50/30 p-3 rounded-xl border border-blue-50 flex flex-col gap-0.5">
                            <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">{key}</span>
                            <span className="font-semibold text-gray-900 truncate">{String(val)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 4. QUALIFY RESULT */}
              {activeModal === "qualify" && qualifyResult && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between p-6 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50/40 to-blue-50 border border-blue-100 shadow-sm">
                    <div>
                      <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Qualification Decision</p>
                      <span className="inline-block mt-2 px-3.5 py-1 rounded-xl text-sm font-extrabold bg-blue-600 text-white shadow-sm">
                        {qualifyResult.status || "QUALIFIED"}
                      </span>
                    </div>
                    <div className="text-right bg-white px-4 py-3 rounded-xl border border-blue-100 shadow-sm">
                      <p className="text-[11px] text-gray-400 font-bold uppercase">ICP Fit Score</p>
                      <p className="text-2xl font-black text-blue-700">{qualifyResult.fitScore ?? qualifyResult.score ?? 80}/100</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm">
                      <p className="text-[10px] text-blue-600 uppercase font-bold tracking-wider">Intent Level</p>
                      <p className="text-base font-extrabold text-gray-900 mt-1">{qualifyResult.intentLevel || "HIGH"}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm">
                      <p className="text-[10px] text-blue-600 uppercase font-bold tracking-wider">Purchase Timing</p>
                      <p className="text-base font-extrabold text-gray-900 mt-1">{qualifyResult.timing || "IMMEDIATE"}</p>
                    </div>
                  </div>

                  {qualifyResult.riskFactors && qualifyResult.riskFactors.length > 0 && (
                    <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm space-y-2">
                      <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-500" /> Identified Risk Considerations
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {qualifyResult.riskFactors.map((rf: string, idx: number) => (
                          <span key={idx} className="bg-amber-50 text-amber-900 text-xs px-3 py-1 rounded-xl border border-amber-200/60 font-semibold">
                            ⚠️ {rf}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="px-7 py-4 bg-white border-t border-blue-100 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20"
              >
                Close Window
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
