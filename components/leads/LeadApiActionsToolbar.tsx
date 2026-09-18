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
  AlertTriangle,
  X,
  ShieldCheck,
  ChevronRight,
  Info,
  Check,
  Layers,
  ArrowRight,
  Zap,
  Activity,
  Globe,
  Sliders,
  Award,
  Send,
  UserCheck,
  Building2,
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
  // Use custom hook for the 7 API calls
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
    transitionResult,
    nurtureResult,
    signalResult,
    sessionResult,
    slaResult,
    feedbackResult,
    convertResult,
  } = useLeadLifecycleActions({
    leadId,
    leadName,
    onLeadUpdated,
  });

  // Modal control state
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

  // Form State for 1. Transition
  const [toStatus, setToStatus] = useState<string>("QUALIFIED");
  const [transitionReason, setTransitionReason] = useState<string>("");

  // Form State for 2. Nurture
  const [nurtureReason, setNurtureReason] = useState<string>("Lead non-responsive, starting automated drip re-engagement.");
  const [automationTemplateId, setAutomationTemplateId] = useState<string>("tpl-cold-re-engage");

  // Form State for 3. Signals
  const [sourceText, setSourceText] = useState<string>("Visited pricing & calculated ROI for 50 enterprise seats");
  const [sourceType, setSourceType] = useState<string>("WEB_INTENT");
  const [signalScore, setSignalScore] = useState<number>(85);

  // Form State for 4. Session Link
  const [sessionId, setSessionId] = useState<string>(`sess_${Math.random().toString(36).substring(2, 9)}`);
  const [consentGranted, setConsentGranted] = useState<boolean>(true);

  // Form State for 5. SLA Check
  const [maxResponseTimeMinutes, setMaxResponseTimeMinutes] = useState<number>(60);
  const [escalationRule, setEscalationRule] = useState<string>("AUTO_NOTIFY");
  const [escalateToId, setEscalateToId] = useState<string>("usr-mgr-01");

  // Form State for 6. Feedback
  const [outcome, setOutcome] = useState<"WON" | "LOST" | "DEAD">("WON");
  const [feedbackReason, setFeedbackReason] = useState<string>("Closed annual contract after technical demo approval");
  const [feedbackScore, setFeedbackScore] = useState<number>(9);

  // Handlers
  const handleTransitionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await executeTransition({ toStatus, reason: transitionReason });
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
      {/* Action Workbench Banner & Grid */}
      <div className="bg-slate-900/90 dark:bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-slate-800/80 gap-2">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-sm flex items-center gap-2">
                Lead Lifecycle & Action Workbench
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  7 Backend APIs Live
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Execute stage transitions, automation drips, SLA validation, intent signals & conversions
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono bg-slate-800/60 px-2.5 py-1 rounded border border-slate-700/50 self-start sm:self-auto">
            Target: zyoris.onrender.com
          </span>
        </div>

        {/* 7 Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {/* 1. Transition */}
          <button
            onClick={() => setActiveModal("transition")}
            className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-purple-500/30 hover:border-purple-400/60 text-purple-300 hover:text-purple-200 transition-all duration-200 group text-center"
          >
            <GitBranch className="w-4 h-4 mb-1 group-hover:scale-110 transition-transform text-purple-400" />
            <span className="text-xs font-medium">Transition</span>
            <span className="text-[10px] text-purple-300/60 mt-0.5">Lifecycle Stage</span>
          </button>

          {/* 2. Nurture */}
          <button
            onClick={() => setActiveModal("nurture")}
            className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-emerald-500/30 hover:border-emerald-400/60 text-emerald-300 hover:text-emerald-200 transition-all duration-200 group text-center"
          >
            <Sparkles className="w-4 h-4 mb-1 group-hover:scale-110 transition-transform text-emerald-400" />
            <span className="text-xs font-medium">Start Nurture</span>
            <span className="text-[10px] text-emerald-300/60 mt-0.5">Automation Drip</span>
          </button>

          {/* 3. Signals */}
          <button
            onClick={() => setActiveModal("signals")}
            className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-blue-500/30 hover:border-blue-400/60 text-blue-300 hover:text-blue-200 transition-all duration-200 group text-center"
          >
            <TrendingUp className="w-4 h-4 mb-1 group-hover:scale-110 transition-transform text-blue-400" />
            <span className="text-xs font-medium">Ingest Signal</span>
            <span className="text-[10px] text-blue-300/60 mt-0.5">Buying Intent</span>
          </button>

          {/* 4. Link Session */}
          <button
            onClick={() => setActiveModal("session")}
            className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-cyan-500/30 hover:border-cyan-400/60 text-cyan-300 hover:text-cyan-200 transition-all duration-200 group text-center"
          >
            <Link2 className="w-4 h-4 mb-1 group-hover:scale-110 transition-transform text-cyan-400" />
            <span className="text-xs font-medium">Link Session</span>
            <span className="text-[10px] text-cyan-300/60 mt-0.5">Web Visitor</span>
          </button>

          {/* 5. Check SLA */}
          <button
            onClick={() => setActiveModal("sla")}
            className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-amber-500/30 hover:border-amber-400/60 text-amber-300 hover:text-amber-200 transition-all duration-200 group text-center"
          >
            <Clock className="w-4 h-4 mb-1 group-hover:scale-110 transition-transform text-amber-400" />
            <span className="text-xs font-medium">Check SLA</span>
            <span className="text-[10px] text-amber-300/60 mt-0.5">Benchmark & Escalation</span>
          </button>

          {/* 6. Feedback */}
          <button
            onClick={() => setActiveModal("feedback")}
            className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-rose-500/30 hover:border-rose-400/60 text-rose-300 hover:text-rose-200 transition-all duration-200 group text-center"
          >
            <Star className="w-4 h-4 mb-1 group-hover:scale-110 transition-transform text-rose-400" />
            <span className="text-xs font-medium">Feedback</span>
            <span className="text-[10px] text-rose-300/60 mt-0.5">Outcome Loop</span>
          </button>

          {/* 7. Convert Deal */}
          <button
            onClick={() => setActiveModal("convert")}
            className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-400/50 text-emerald-200 transition-all duration-200 group text-center col-span-2 sm:col-span-1"
          >
            <Briefcase className="w-4 h-4 mb-1 group-hover:scale-110 transition-transform text-emerald-300" />
            <span className="text-xs font-semibold">Convert to Deal</span>
            <span className="text-[10px] text-emerald-300/70 mt-0.5">Pipeline Creation</span>
          </button>
        </div>
      </div>

      {/* MODAL 1: Transition Lifecycle Stage */}
      {activeModal === "transition" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2 text-purple-400">
                <GitBranch className="w-5 h-5" />
                <h4 className="font-semibold text-lg text-white">Transition Lifecycle Stage</h4>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTransitionSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Select Target Stage <span className="text-purple-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
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
                      className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all text-left flex items-center justify-between ${
                        toStatus === st
                          ? "bg-purple-600/30 border-purple-500 text-purple-200"
                          : "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      <span>{st}</span>
                      {toStatus === st && <Check className="w-3.5 h-3.5 text-purple-400" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Transition Rationale / Notes
                </label>
                <textarea
                  value={transitionReason}
                  onChange={(e) => setTransitionReason(e.target.value)}
                  placeholder="Provide reason for changing lifecycle stage..."
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="text-[11px] text-slate-400 bg-slate-800/40 p-2.5 rounded border border-slate-800 font-mono">
                POST /leads/{leadId}/lifecycle/transition
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingTransition}
                  className="px-4 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white rounded-lg flex items-center space-x-1.5 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2 text-emerald-400">
                <Sparkles className="w-5 h-5" />
                <h4 className="font-semibold text-lg text-white">Start Nurture Drip Workflow</h4>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleNurtureSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Automation Template <span className="text-emerald-400">*</span>
                </label>
                <select
                  value={automationTemplateId}
                  onChange={(e) => setAutomationTemplateId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="tpl-cold-re-engage">Cold Lead Re-engagement Drip (7-Day)</option>
                  <option value="tpl-product-onboarding">Interactive Product Demo Sequence</option>
                  <option value="tpl-exec-touchpoint">Executive VIP Outreach Workflow</option>
                  <option value="tpl-pricing-followup">Pricing Inquiry Auto-Nurture</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Trigger Reason <span className="text-emerald-400">*</span>
                </label>
                <textarea
                  value={nurtureReason}
                  onChange={(e) => setNurtureReason(e.target.value)}
                  rows={2}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="text-[11px] text-slate-400 bg-slate-800/40 p-2.5 rounded border border-slate-800 font-mono">
                POST /leads/{leadId}/nurture/start
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingNurture}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center space-x-1.5 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2 text-blue-400">
                <TrendingUp className="w-5 h-5" />
                <h4 className="font-semibold text-lg text-white">Ingest Buying Intent Signal</h4>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSignalSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Source Text / Event Description <span className="text-blue-400">*</span>
                </label>
                <input
                  type="text"
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Signal Source Type <span className="text-blue-400">*</span>
                </label>
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="WEB_INTENT">Web Browsing & Intent</option>
                  <option value="PRICING_VISIT">Pricing Page Calculation</option>
                  <option value="CONTENT_DOWNLOAD">Whitepaper / Case Study Download</option>
                  <option value="EMAIL_CLICK">Email CTA Link Click</option>
                  <option value="DEMO_REQUEST">Demo Booking Inquiry</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-slate-300">
                    Intent Score Weight (1 - 100) <span className="text-blue-400">*</span>
                  </label>
                  <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                    {signalScore} / 100
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={signalScore}
                  onChange={(e) => setSignalScore(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              <div className="text-[11px] text-slate-400 bg-slate-800/40 p-2.5 rounded border border-slate-800 font-mono">
                POST /leads/{leadId}/signals
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingSignal}
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center space-x-1.5 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2 text-cyan-400">
                <Link2 className="w-5 h-5" />
                <h4 className="font-semibold text-lg text-white">Link Visitor Session to Lead</h4>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSessionSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Anonymous Session Token / Cookie ID <span className="text-cyan-400">*</span>
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    required
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => setSessionId(`sess_${Math.random().toString(36).substring(2, 9)}`)}
                    className="px-2.5 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg"
                  >
                    Generate
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Associated Lead ID
                </label>
                <input
                  type="text"
                  value={leadId}
                  disabled
                  className="w-full bg-slate-800/50 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-400 font-mono"
                />
              </div>

              <div className="flex items-center space-x-2 bg-slate-800/40 p-3 rounded-lg border border-slate-700/50">
                <input
                  type="checkbox"
                  id="consentGranted"
                  checked={consentGranted}
                  onChange={(e) => setConsentGranted(e.target.checked)}
                  className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                />
                <label htmlFor="consentGranted" className="text-xs text-slate-200 cursor-pointer">
                  User explicit GDPR / Cookie Consent granted for identity linking
                </label>
              </div>

              <div className="text-[11px] text-slate-400 bg-slate-800/40 p-2.5 rounded border border-slate-800 font-mono">
                POST /leads/sessions/link
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingSession || !consentGranted}
                  className="px-4 py-2 text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg flex items-center space-x-1.5 disabled:opacity-50"
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

      {/* MODAL 5: Check SLA */}
      {activeModal === "sla" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2 text-amber-400">
                <Clock className="w-5 h-5" />
                <h4 className="font-semibold text-lg text-white">Check Lead SLA Benchmark</h4>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSlaSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Max Allowed Response Time (Minutes) <span className="text-amber-400">*</span>
                </label>
                <input
                  type="number"
                  min="5"
                  max="1440"
                  value={maxResponseTimeMinutes}
                  onChange={(e) => setMaxResponseTimeMinutes(Number(e.target.value))}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Escalation Rule <span className="text-amber-400">*</span>
                </label>
                <select
                  value={escalationRule}
                  onChange={(e) => setEscalationRule(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="AUTO_NOTIFY">Auto Notify Assigned Agent</option>
                  <option value="REASSIGN_ROUND_ROBIN">Reassign via Round Robin</option>
                  <option value="ESCALATE_TO_MANAGER">Escalate Directly to Manager</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Escalation Assignee / Manager ID
                </label>
                <input
                  type="text"
                  value={escalateToId}
                  onChange={(e) => setEscalateToId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="text-[11px] text-slate-400 bg-slate-800/40 p-2.5 rounded border border-slate-800 font-mono">
                POST /leads/{leadId}/sla/check
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingSla}
                  className="px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-lg flex items-center space-x-1.5 disabled:opacity-50"
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

      {/* MODAL 6: Submit Feedback Loop */}
      {activeModal === "feedback" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2 text-rose-400">
                <Star className="w-5 h-5" />
                <h4 className="font-semibold text-lg text-white">Submit Lead Outcome Feedback</h4>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFeedbackSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Final Outcome <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["WON", "LOST", "DEAD"] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setOutcome(opt)}
                      className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all text-center ${
                        outcome === opt
                          ? opt === "WON"
                            ? "bg-emerald-600/30 border-emerald-500 text-emerald-200"
                            : opt === "LOST"
                            ? "bg-rose-600/30 border-rose-500 text-rose-200"
                            : "bg-slate-700 border-slate-500 text-slate-200"
                          : "bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Feedback Score Rating (1 - 10)
                </label>
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setFeedbackScore(num)}
                      className={`flex-1 py-1 rounded text-xs font-semibold border ${
                        feedbackScore === num
                          ? "bg-rose-600 border-rose-500 text-white"
                          : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Rationale / Detailed Feedback
                </label>
                <textarea
                  value={feedbackReason}
                  onChange={(e) => setFeedbackReason(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="text-[11px] text-slate-400 bg-slate-800/40 p-2.5 rounded border border-slate-800 font-mono">
                POST /leads/{leadId}/feedback
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingFeedback}
                  className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg flex items-center space-x-1.5 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2 text-emerald-400">
                <Briefcase className="w-5 h-5" />
                <h4 className="font-semibold text-lg text-white">Convert Lead to Active Deal</h4>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-lg text-emerald-200 text-xs space-y-1">
                <p className="font-semibold flex items-center gap-1.5 text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Ready to Convert
                </p>
                <p>
                  Converting <strong>{leadName}</strong> will create a new deal entry in your sales pipeline, preserve activity history, and transition lifecycle stage to <em>CLOSED_WON / QUALIFIED</em>.
                </p>
              </div>

              <div className="text-[11px] text-slate-400 bg-slate-800/40 p-2.5 rounded border border-slate-800 font-mono">
                POST /leads/{leadId}/convert-to-deal
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConvertSubmit}
                  disabled={loadingConvert}
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center space-x-1.5 disabled:opacity-50"
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
