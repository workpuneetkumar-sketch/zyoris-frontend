"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import {
  Zap,
  Target,
  GitBranch,
  ShieldCheck,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  Sparkles,
  TrendingUp,
  UserCheck,
  Building,
  Check,
  Briefcase,
  HelpCircle,
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

  // Result state
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
      {/* Action Bar Container */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 rounded-2xl shadow-lg border border-indigo-500/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-wide flex items-center gap-2">
                Lead Intelligence & AI Operations
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-500/30 text-indigo-200 border border-indigo-400/20">
                  Live API
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Execute scoring, automated routing, data enrichment, and deterministic qualification.
              </p>
            </div>
          </div>

          {/* Action Buttons Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* 1. Score Lead Button */}
            <button
              onClick={handleScore}
              disabled={loadingScore}
              className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md hover:shadow-amber-500/20 transition-all disabled:opacity-50"
            >
              {loadingScore ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
              <span>Score Lead</span>
            </button>

            {/* 2. Route Lead Button */}
            <button
              onClick={handleRoute}
              disabled={loadingRoute}
              className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md hover:shadow-indigo-500/20 transition-all disabled:opacity-50"
            >
              {loadingRoute ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitBranch className="w-4 h-4" />}
              <span>Route Lead</span>
            </button>

            {/* 3. Enrich Lead Button */}
            <button
              onClick={handleEnrich}
              disabled={loadingEnrich}
              className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-md hover:shadow-cyan-500/20 transition-all disabled:opacity-50"
            >
              {loadingEnrich ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>Enrich Lead</span>
            </button>

            {/* 4. Qualify Lead Button */}
            <button
              onClick={handleQualify}
              disabled={loadingQualify}
              className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-emerald-500/20 transition-all disabled:opacity-50"
            >
              {loadingQualify ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>Qualify Lead</span>
            </button>
          </div>
        </div>
      </div>

      {/* Result Display Modal / Card */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                {activeModal === "score" && <Target className="w-5 h-5 text-amber-500" />}
                {activeModal === "route" && <GitBranch className="w-5 h-5 text-indigo-600" />}
                {activeModal === "enrich" && <Sparkles className="w-5 h-5 text-cyan-600" />}
                {activeModal === "qualify" && <ShieldCheck className="w-5 h-5 text-emerald-600" />}
                <h3 className="text-lg font-bold text-gray-900 capitalize">
                  {activeModal === "score" && "Lead Score Calculation"}
                  {activeModal === "route" && "Automated Lead Routing"}
                  {activeModal === "enrich" && "Lead Data Enrichment"}
                  {activeModal === "qualify" && "Lead Qualification Analysis"}
                </h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body per API */}
            {/* 1. SCORE RESULT */}
            {activeModal === "score" && scoreResult && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <div>
                    <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Computed Score</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-3xl font-extrabold text-amber-900">{scoreResult.score ?? 85}</span>
                      <span className="text-sm text-amber-700 font-medium">/ 100</span>
                    </div>
                  </div>
                  {scoreResult.confidence !== undefined && (
                    <div className="text-right">
                      <p className="text-xs text-amber-700">Confidence</p>
                      <span className="text-base font-bold text-amber-900">{scoreResult.confidence}%</span>
                    </div>
                  )}
                </div>

                {scoreResult.scoringReasons && scoreResult.scoringReasons.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Key Scoring Drivers</h4>
                    <ul className="space-y-1.5">
                      {scoreResult.scoringReasons.map((reason: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-gray-600">
                          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* 2. ROUTE RESULT */}
            {activeModal === "route" && routeResult && (
              <div className="space-y-4">
                <div className={`p-4 rounded-xl border ${routeResult.assignedToId || routeResult.assignedToName ? "bg-indigo-50 border-indigo-200" : "bg-amber-50 border-amber-200"}`}>
                  <div className="flex items-center gap-3">
                    <UserCheck className={`w-8 h-8 ${routeResult.assignedToId || routeResult.assignedToName ? "text-indigo-600" : "text-amber-600"}`} />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Routing Status</p>
                      <p className="text-base font-bold text-gray-900">
                        {routeResult.assignedToName ? `Assigned to ${routeResult.assignedToName}` : routeResult.message || "Lead Routing Evaluated"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-500">Routing Strategy:</span>
                    <span className="font-semibold text-gray-800">{routeResult.strategy || "AI_RECOMMENDATION"}</span>
                  </div>
                  {routeResult.assignedToId && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-500">Assignee ID:</span>
                      <span className="font-mono text-gray-700">{routeResult.assignedToId}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. ENRICHMENT RESULT */}
            {activeModal === "enrich" && enrichResult && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-cyan-50 border border-cyan-200">
                  <div className="flex items-center gap-2">
                    <Building className="w-5 h-5 text-cyan-600" />
                    <div>
                      <p className="text-xs font-bold text-cyan-900">Provider: {enrichResult.provider || "System Enrichment"}</p>
                      <p className="text-xs text-cyan-700">{enrichResult.enrichedFieldsCount || 0} fields enriched</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold bg-cyan-200 text-cyan-900 px-2 py-0.5 rounded-full">
                    {enrichResult.success ? "SUCCESS" : "NOTICE"}
                  </span>
                </div>

                {enrichResult.fields && Object.keys(enrichResult.fields).length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Enriched Attributes</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {Object.entries(enrichResult.fields).map(([key, val]) => (
                        <div key={key} className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                          <p className="text-[10px] text-gray-400 font-semibold uppercase">{key}</p>
                          <p className="font-medium text-gray-800 truncate">{String(val)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. QUALIFY RESULT */}
            {activeModal === "qualify" && qualifyResult && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div>
                    <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Qualification Outcome</p>
                    <span className="inline-block mt-1 px-3 py-1 rounded-full text-sm font-extrabold bg-emerald-600 text-white">
                      {qualifyResult.status || "QUALIFIED"}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-emerald-700 font-medium">ICP Fit Score</p>
                    <p className="text-2xl font-black text-emerald-900">{qualifyResult.fitScore ?? qualifyResult.score ?? 80}/100</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Intent Level</p>
                    <p className="font-bold text-gray-900">{qualifyResult.intentLevel || "HIGH"}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Purchase Timing</p>
                    <p className="font-bold text-gray-900">{qualifyResult.timing || "IMMEDIATE"}</p>
                  </div>
                </div>

                {qualifyResult.riskFactors && qualifyResult.riskFactors.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1.5">Identified Risk Factors</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {qualifyResult.riskFactors.map((rf: string, idx: number) => (
                        <span key={idx} className="bg-amber-100 text-amber-900 text-xs px-2.5 py-0.5 rounded-md font-medium">
                          ⚠️ {rf}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Modal Footer */}
            <div className="mt-6 pt-3 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
