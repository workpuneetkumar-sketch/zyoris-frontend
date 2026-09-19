"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import {
  GitBranch,
  Sparkles,
  TrendingUp,
  Link2,
  Clock,
  Star,
  Briefcase,
  Loader2,
  CheckCircle2,
  X,
  ChevronRight,
  Check,
  ArrowRight,
  Zap,
} from "lucide-react";
import { useLeadLifecycleActions } from "@/hooks/useLeadLifecycleActions";

interface LeadApiActionsToolbarProps {
  leadId: string;
  leadName?: string;
  lead?: any;
  onLeadUpdated?: () => void;
  className?: string;
}

export function LeadApiActionsToolbar({
  leadId,
  leadName = "Lead",
  lead,
  onLeadUpdated,
  className = "",
}: LeadApiActionsToolbarProps) {
  const {
    executeTransition,
    executeStartNurture,
    executeIngestSignal,
    executeLinkSession,
    executeCheckSla,
    executeSubmitFeedback,
    executeConvertToDeal,
    loadingTransition,
    loadingNurture,
    loadingSignal,
    loadingSession,
    loadingSla,
    loadingFeedback,
    loadingConvert,
  } = useLeadLifecycleActions({
    leadId,
    leadName,
    onLeadUpdated,
  });

  type ModalType =
    | "transition"
    | "nurture"
    | "signals"
    | "session"
    | "sla"
    | "feedback"
    | "convert"
    | null;

  const [activeModal, setActiveModal] = useState<ModalType>(null);

  // 1. Transition Form
  const [toStatus, setToStatus] = useState<string>("QUALIFIED");
  const [transitionReason, setTransitionReason] = useState<string>("");

  // 2. Nurture Form
  const [nurtureReason, setNurtureReason] = useState<string>("Cold lead re-engagement campaign");
  const [automationTemplateId, setAutomationTemplateId] = useState<string>("tpl-cold-re-engage");

  // 3. Signals Form
  const [sourceText, setSourceText] = useState<string>("Visited pricing page & calculated enterprise ROI");
  const [sourceType, setSourceType] = useState<string>("WEBSITE");
  const [signalScore, setSignalScore] = useState<number>(85);

  // 4. Session Form
  const [sessionId, setSessionId] = useState<string>(`sess_${Math.random().toString(36).substring(2, 9)}`);
  const [consentGranted, setConsentGranted] = useState<boolean>(true);

  // 5. SLA Form
  const [maxResponseTimeMinutes, setMaxResponseTimeMinutes] = useState<number>(60);
  const [escalationRule, setEscalationRule] = useState<string>("AUTO_NOTIFY");
  const [escalateToId, setEscalateToId] = useState<string>("usr-mgr-01");

  // 6. Feedback Form
  const [outcome, setOutcome] = useState<"WON" | "LOST" | "DEAD">("WON");
  const [feedbackReason, setFeedbackReason] = useState<string>("Closed annual enterprise license contract");
  const [feedbackScore, setFeedbackScore] = useState<number>(9);

  // Submit Handlers
  const handleTransitionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cleanReason = transitionReason.trim() || `Transitioned lead stage to ${toStatus}`;
      await executeTransition({
        toStatus,
        status: toStatus,
        toStage: toStatus,
        stage: toStatus,
        reason: cleanReason,
      });
      setActiveModal(null);
    } catch {}
  };

  const handleNurtureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await executeStartNurture({ reason: nurtureReason, automationTemplateId });
      setActiveModal(null);
    } catch {}
  };

  const handleSignalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await executeIngestSignal({ sourceText, sourceType, score: signalScore });
      setActiveModal(null);
    } catch {}
  };

  const handleSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await executeLinkSession({ sessionId, leadId, consentGranted });
      setActiveModal(null);
    } catch {}
  };

  const handleSlaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await executeCheckSla({ maxResponseTimeMinutes, escalationRule, escalateToId });
      setActiveModal(null);
    } catch {}
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await executeSubmitFeedback({ outcome, reason: feedbackReason, feedbackScore });
      setActiveModal(null);
    } catch {}
  };

  const handleConvertSubmit = async () => {
    try {
      await executeConvertToDeal();
      setActiveModal(null);
    } catch {}
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Light Theme Action Workbench Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100 gap-2">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                Lead Lifecycle & Action Workbench
                <span className="text-[10px] uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-100/80 text-indigo-700 border border-indigo-200">
                  7 APIs Integrated
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Execute stage transitions, automation drips, SLA benchmarks, intent signals & deal conversions
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-medium text-slate-500 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200 self-start sm:self-auto">
            Backend: zyoris.onrender.com
          </span>
        </div>

        {/* 7 Action Buttons - Clean Light Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {/* 1. Transition */}
          <button
            onClick={() => setActiveModal("transition")}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-purple-50/60 hover:bg-purple-100/80 border border-purple-200/80 text-purple-700 font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] group text-center shadow-xs"
          >
            <GitBranch className="w-4 h-4 mb-1 text-purple-600 group-hover:scale-110 transition-transform" />
            <span className="text-xs">Transition</span>
            <span className="text-[10px] text-purple-500 font-normal mt-0.5">Lifecycle Stage</span>
          </button>

          {/* 2. Nurture */}
          <button
            onClick={() => setActiveModal("nurture")}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-50/60 hover:bg-emerald-100/80 border border-emerald-200/80 text-emerald-700 font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] group text-center shadow-xs"
          >
            <Sparkles className="w-4 h-4 mb-1 text-emerald-600 group-hover:scale-110 transition-transform" />
            <span className="text-xs">Start Nurture</span>
            <span className="text-[10px] text-emerald-500 font-normal mt-0.5">Automation Drip</span>
          </button>

          {/* 3. Signals */}
          <button
            onClick={() => setActiveModal("signals")}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-blue-50/60 hover:bg-blue-100/80 border border-blue-200/80 text-blue-700 font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] group text-center shadow-xs"
          >
            <TrendingUp className="w-4 h-4 mb-1 text-blue-600 group-hover:scale-110 transition-transform" />
            <span className="text-xs">Ingest Signal</span>
            <span className="text-[10px] text-blue-500 font-normal mt-0.5">Buying Intent</span>
          </button>

          {/* 4. Link Session */}
          <button
            onClick={() => setActiveModal("session")}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-cyan-50/60 hover:bg-cyan-100/80 border border-cyan-200/80 text-cyan-700 font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] group text-center shadow-xs"
          >
            <Link2 className="w-4 h-4 mb-1 text-cyan-600 group-hover:scale-110 transition-transform" />
            <span className="text-xs">Link Session</span>
            <span className="text-[10px] text-cyan-500 font-normal mt-0.5">Web Visitor</span>
          </button>

          {/* 5. Check SLA */}
          <button
            onClick={() => setActiveModal("sla")}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-amber-50/60 hover:bg-amber-100/80 border border-amber-200/80 text-amber-700 font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] group text-center shadow-xs"
          >
            <Clock className="w-4 h-4 mb-1 text-amber-600 group-hover:scale-110 transition-transform" />
            <span className="text-xs">Check SLA</span>
            <span className="text-[10px] text-amber-500 font-normal mt-0.5">Benchmark</span>
          </button>

          {/* 6. Feedback */}
          <button
            onClick={() => setActiveModal("feedback")}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-rose-50/60 hover:bg-rose-100/80 border border-rose-200/80 text-rose-700 font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] group text-center shadow-xs"
          >
            <Star className="w-4 h-4 mb-1 text-rose-600 group-hover:scale-110 transition-transform" />
            <span className="text-xs">Feedback</span>
            <span className="text-[10px] text-rose-500 font-normal mt-0.5">Outcome Loop</span>
          </button>

          {/* 7. Convert Deal */}
          <button
            onClick={() => setActiveModal("convert")}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] group text-center shadow-md shadow-indigo-100 col-span-2 sm:col-span-1"
          >
            <Briefcase className="w-4 h-4 mb-1 text-white group-hover:scale-110 transition-transform" />
            <span className="text-xs">Convert Deal</span>
            <span className="text-[10px] text-indigo-100 font-normal mt-0.5">Pipeline Create</span>
          </button>
        </div>
      </div>

      {/* MODAL 1: Transition Lifecycle Stage (Light Theme & Spacious) */}
      {activeModal === "transition" && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-800 transform transition-all">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700">
                  <GitBranch className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-xl text-slate-900">Transition Lifecycle Stage</h4>
                  <p className="text-xs text-slate-500">Update stage for lead: <span className="font-semibold text-slate-700">{leadName}</span></p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTransitionSubmit} className="mt-6 space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Target Stage <span className="text-purple-600">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    "NEW",
                    "CONTACTED",
                    "QUALIFIED",
                    "UNQUALIFIED",
                    "PROPOSAL",
                    "NEGOTIATION",
                    "CLOSED_WON",
                    "CLOSED_LOST",
                  ].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setToStatus(st)}
                      className={`p-3 text-xs font-semibold rounded-xl border transition-all text-left flex items-center justify-between ${
                        toStatus === st
                          ? "bg-purple-50 border-purple-400 text-purple-800 shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <span>{st}</span>
                      {toStatus === st && <Check className="w-4 h-4 text-purple-600" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Transition Rationale / Reason
                </label>
                <textarea
                  value={transitionReason}
                  onChange={(e) => setTransitionReason(e.target.value)}
                  placeholder="Provide reason for changing lifecycle stage..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono">
                POST /leads/{leadId}/lifecycle/transition
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingTransition}
                  className="px-6 py-2.5 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md shadow-purple-200 flex items-center space-x-2 disabled:opacity-50 transition-all"
                >
                  {loadingTransition ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Submit Transition</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Start Nurture Workflow */}
      {activeModal === "nurture" && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-800 transform transition-all">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-xl text-slate-900">Start Nurture Drip Workflow</h4>
                  <p className="text-xs text-slate-500">Initiate automated engagement for <span className="font-semibold text-slate-700">{leadName}</span></p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleNurtureSubmit} className="mt-6 space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Automation Template <span className="text-emerald-600">*</span>
                </label>
                <select
                  value={automationTemplateId}
                  onChange={(e) => setAutomationTemplateId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                >
                  <option value="tpl-cold-re-engage">Cold Lead Re-engagement Drip (7-Day Sequence)</option>
                  <option value="tpl-product-onboarding">Interactive Product Demo Sequence</option>
                  <option value="tpl-exec-touchpoint">Executive VIP Outreach Workflow</option>
                  <option value="tpl-pricing-followup">Pricing Inquiry Auto-Nurture</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Trigger Reason <span className="text-emerald-600">*</span>
                </label>
                <textarea
                  value={nurtureReason}
                  onChange={(e) => setNurtureReason(e.target.value)}
                  rows={3}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono">
                POST /leads/{leadId}/nurture/start
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingNurture}
                  className="px-6 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-200 flex items-center space-x-2 disabled:opacity-50 transition-all"
                >
                  {loadingNurture ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Start Nurture</span>
                      <Sparkles className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Ingest Intent Signal */}
      {activeModal === "signals" && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-800 transform transition-all">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-xl text-slate-900">Ingest Buying Intent Signal</h4>
                  <p className="text-xs text-slate-500">Record customer activity & intent score for <span className="font-semibold text-slate-700">{leadName}</span></p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSignalSubmit} className="mt-6 space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Source Text / Event Description <span className="text-blue-600">*</span>
                </label>
                <input
                  type="text"
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Signal Source Type <span className="text-blue-600">*</span>
                </label>
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                >
                  <option value="WEBSITE">Website Visit & Intent (WEBSITE)</option>
                  <option value="EMAIL_OPEN">Email Open & Engagement (EMAIL_OPEN)</option>
                  <option value="PRODUCT_CLICK">Product Feature Click (PRODUCT_CLICK)</option>
                  <option value="OTHER">Other Custom Signal (OTHER)</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Intent Score Weight (1 - 100) <span className="text-blue-600">*</span>
                  </label>
                  <span className="text-xs font-extrabold text-blue-700 bg-blue-100 px-3 py-1 rounded-full border border-blue-200">
                    {signalScore} / 100
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={signalScore}
                  onChange={(e) => setSignalScore(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono">
                POST /leads/{leadId}/signals
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingSignal}
                  className="px-6 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-200 flex items-center space-x-2 disabled:opacity-50 transition-all"
                >
                  {loadingSignal ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Record Signal</span>
                      <TrendingUp className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Link Anonymous Session */}
      {activeModal === "session" && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-800 transform transition-all">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-cyan-100 text-cyan-700">
                  <Link2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-xl text-slate-900">Link Visitor Session to Lead</h4>
                  <p className="text-xs text-slate-500">Associate website visitor session with <span className="font-semibold text-slate-700">{leadName}</span></p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSessionSubmit} className="mt-6 space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Anonymous Session Token / ID <span className="text-cyan-600">*</span>
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    required
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => setSessionId(`sess_${Math.random().toString(36).substring(2, 9)}`)}
                    className="px-4 py-2.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl transition-colors"
                  >
                    Generate
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Associated Lead ID
                </label>
                <input
                  type="text"
                  value={leadId}
                  disabled
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm text-slate-500 font-mono"
                />
              </div>

              <div className="flex items-center space-x-3 bg-cyan-50/50 p-4 rounded-xl border border-cyan-200/80">
                <input
                  type="checkbox"
                  id="consentGranted"
                  checked={consentGranted}
                  onChange={(e) => setConsentGranted(e.target.checked)}
                  className="w-5 h-5 accent-cyan-600 rounded cursor-pointer"
                />
                <label htmlFor="consentGranted" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Explicit GDPR / Visitor Consent granted for identity linking
                </label>
              </div>

              <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono">
                POST /leads/sessions/link
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingSession || !consentGranted}
                  className="px-6 py-2.5 text-xs font-bold bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl shadow-md shadow-cyan-200 flex items-center space-x-2 disabled:opacity-50 transition-all"
                >
                  {loadingSession ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Link Session</span>
                      <Link2 className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Check SLA Benchmark */}
      {activeModal === "sla" && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-800 transform transition-all">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-xl text-slate-900">Check Lead SLA Benchmark</h4>
                  <p className="text-xs text-slate-500">Evaluate response speed & escalation rules for <span className="font-semibold text-slate-700">{leadName}</span></p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSlaSubmit} className="mt-6 space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Max Allowed Response Time (Minutes) <span className="text-amber-600">*</span>
                </label>
                <input
                  type="number"
                  min="5"
                  max="1440"
                  value={maxResponseTimeMinutes}
                  onChange={(e) => setMaxResponseTimeMinutes(Number(e.target.value))}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Escalation Rule <span className="text-amber-600">*</span>
                </label>
                <select
                  value={escalationRule}
                  onChange={(e) => setEscalationRule(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-medium"
                >
                  <option value="AUTO_NOTIFY">Auto Notify Assigned Agent</option>
                  <option value="REASSIGN_ROUND_ROBIN">Reassign via Round Robin</option>
                  <option value="ESCALATE_TO_MANAGER">Escalate Directly to Manager</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Escalation Manager ID
                </label>
                <input
                  type="text"
                  value={escalateToId}
                  onChange={(e) => setEscalateToId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono">
                POST /leads/{leadId}/sla/check
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingSla}
                  className="px-6 py-2.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-md shadow-amber-200 flex items-center space-x-2 disabled:opacity-50 transition-all"
                >
                  {loadingSla ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Execute SLA Check</span>
                      <Clock className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: Submit Outcome Feedback */}
      {activeModal === "feedback" && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-800 transform transition-all">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700">
                  <Star className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-xl text-slate-900">Submit Outcome Feedback</h4>
                  <p className="text-xs text-slate-500">Record closed loop feedback for <span className="font-semibold text-slate-700">{leadName}</span></p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFeedbackSubmit} className="mt-6 space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Final Outcome <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(["WON", "LOST", "DEAD"] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setOutcome(opt)}
                      className={`p-3 text-xs font-extrabold rounded-xl border transition-all text-center ${
                        outcome === opt
                          ? opt === "WON"
                            ? "bg-emerald-50 border-emerald-400 text-emerald-800 shadow-sm"
                            : opt === "LOST"
                            ? "bg-rose-50 border-rose-400 text-rose-800 shadow-sm"
                            : "bg-slate-200 border-slate-400 text-slate-800 shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Feedback Rating Score (1 - 10)
                </label>
                <div className="flex items-center space-x-1.5">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setFeedbackScore(num)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                        feedbackScore === num
                          ? "bg-rose-600 border-rose-600 text-white shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Rationale / Feedback Notes
                </label>
                <textarea
                  value={feedbackReason}
                  onChange={(e) => setFeedbackReason(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                />
              </div>

              <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono">
                POST /leads/{leadId}/feedback
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingFeedback}
                  className="px-6 py-2.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md shadow-rose-200 flex items-center space-x-2 disabled:opacity-50 transition-all"
                >
                  {loadingFeedback ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Save Feedback</span>
                      <Star className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: Convert Lead to Deal */}
      {activeModal === "convert" && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-800 transform transition-all">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-700">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-xl text-slate-900">Convert Lead to Active Deal</h4>
                  <p className="text-xs text-slate-500">Promote <span className="font-semibold text-slate-700">{leadName}</span> into active sales pipeline</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-6 space-y-5">
              <div className="bg-indigo-50/70 border border-indigo-200 p-4 rounded-2xl text-slate-700 text-sm space-y-1.5">
                <p className="font-bold text-indigo-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600" /> Pipeline Conversion Ready
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Converting <strong>{leadName}</strong> will create a new deal entry in your CRM sales pipeline, preserve activity history, and set stage status to <em>CLOSED_WON / QUALIFIED</em>.
                </p>
              </div>

              <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono">
                POST /leads/{leadId}/convert-to-deal
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConvertSubmit}
                  disabled={loadingConvert}
                  className="px-6 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-200 flex items-center space-x-2 disabled:opacity-50 transition-all"
                >
                  {loadingConvert ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Confirm & Convert</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
