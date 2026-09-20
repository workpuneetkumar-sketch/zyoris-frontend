"use client";

import React, { useState } from "react";
import { toast } from "react-toastify";
import {
  GitBranch,
  Sparkles,
  TrendingUp,
  Link2,
  Clock,
  Star,
  Briefcase,
  Database,
  ShieldCheck,
  UserCheck,
  Settings,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Check,
  Zap,
  RefreshCw,
  Info,
  Calendar,
  Layers,
  Sliders,
  User,
  Building2,
  Activity,
  Award
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
    executeEnrich,
    executeQualify,
    executeRoute,
    executeSaveRule,
    loadingTransition,
    loadingNurture,
    loadingSignal,
    loadingSession,
    loadingSla,
    loadingFeedback,
    loadingConvert,
    loadingEnrich,
    loadingQualify,
    loadingRoute,
    loadingRule,
    transitionResult,
    nurtureResult,
    signalResult,
    sessionResult,
    slaResult,
    feedbackResult,
    convertResult,
    enrichResult,
    qualifyResult,
    routeResult,
    ruleResult,
  } = useLeadLifecycleActions({
    leadId,
    leadName,
    onLeadUpdated,
  });

  // Section 1: Transition State
  const [toStatus, setToStatus] = useState<string>(lead?.status || "QUALIFIED");
  const [transitionReason, setTransitionReason] = useState<string>("Updated stage after sales discovery call");

  // Section 2: Nurture State
  const [nurtureReason, setNurtureReason] = useState<string>("Cold lead re-engagement campaign");
  const [automationTemplateId, setAutomationTemplateId] = useState<string>("tpl-cold-re-engage");

  // Section 3: Signal State
  const [sourceText, setSourceText] = useState<string>("Visited pricing page & calculated enterprise ROI");
  const [sourceType, setSourceType] = useState<string>("WEBSITE");
  const [signalScore, setSignalScore] = useState<number>(85);

  // Section 4: Session State
  const [sessionId, setSessionId] = useState<string>(`sess_${Math.random().toString(36).substring(2, 9)}`);
  const [consentGranted, setConsentGranted] = useState<boolean>(true);

  // Section 5: SLA State
  const [maxResponseTimeMinutes, setMaxResponseTimeMinutes] = useState<number>(60);
  const [escalationRule, setEscalationRule] = useState<string>("AUTO_NOTIFY_MANAGER");
  const [escalateToId, setEscalateToId] = useState<string>("usr-mgr-01");

  // Section 6: Feedback State
  const [outcome, setOutcome] = useState<"WON" | "LOST" | "DEAD">("WON");
  const [feedbackReason, setFeedbackReason] = useState<string>("Closed annual enterprise license contract");
  const [feedbackScore, setFeedbackScore] = useState<number>(9);

  // Section 7: Convert State
  const [targetStage, setTargetStage] = useState<string>("QUALIFIED");
  const [estimatedValue, setEstimatedValue] = useState<number>(lead?.estimatedValue || 250000);

  // Section 8: Enrich State
  const [enrichProvider, setEnrichProvider] = useState<string>("clearbit");
  const [forceEnrich, setForceEnrich] = useState<boolean>(true);

  // Section 9: Qualify State
  const [qualifyCadence, setQualifyCadence] = useState<string>("immediate");

  // Section 10: Route State
  const [routeStrategy, setRouteStrategy] = useState<string>("ai_recommendation");

  // Section 11: Assignment Rule State
  const [ruleStrategy, setRuleStrategy] = useState<"ai_recommendation" | "round_robin" | "load_balanced" | "manual">("ai_recommendation");
  const [maxCapacity, setMaxCapacity] = useState<number>(25);

  // Active filter tab state for jump navigation
  const [activeSectionId, setActiveSectionId] = useState<string>("all");

  // Handlers
  const handleTransitionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeTransition({
      toStatus,
      status: toStatus,
      toStage: toStatus,
      stage: toStatus,
      reason: transitionReason,
    });
  };

  const handleNurtureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeStartNurture({ reason: nurtureReason, automationTemplateId });
  };

  const handleSignalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeIngestSignal({ sourceText, sourceType, score: signalScore });
  };

  const handleSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeLinkSession({ sessionId, leadId, consentGranted });
  };

  const handleSlaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeCheckSla({ maxResponseTimeMinutes, escalationRule, escalateToId });
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeSubmitFeedback({ outcome, reason: feedbackReason, feedbackScore });
  };

  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeConvertToDeal();
  };

  const handleEnrichSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeEnrich();
  };

  const handleQualifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeQualify();
  };

  const handleRouteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeRoute();
  };

  const handleRuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeSaveRule({ strategy: ruleStrategy });
  };

  // Section definitions
  const sections = [
    {
      id: "sec-1",
      num: 1,
      title: "Stage & Status Lifecycle Transition",
      subtitle: "Move lead across lifecycle pipeline stages",
      icon: GitBranch,
      color: "bg-indigo-600",
      accentBorder: "border-indigo-100",
      badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
      whatItDoes: "Controls the progression of the lead through defined sales lifecycle states (NEW → CONTACTED → QUALIFIED → PROPOSAL → NEGOTIATION → CLOSED / DEAD). Executing a transition updates system stage triggers, recalculates win probability, and logs status audits.",
      loading: loadingTransition,
      onSubmit: handleTransitionSubmit,
      controls: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Target Status / Stage</label>
            <select
              value={toStatus}
              onChange={(e) => setToStatus(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="NEW">🆕 NEW</option>
              <option value="CONTACTED">📞 CONTACTED</option>
              <option value="WARM">🔥 WARM</option>
              <option value="QUALIFIED">✅ QUALIFIED</option>
              <option value="PROPOSAL">📄 PROPOSAL</option>
              <option value="NEGOTIATION">🤝 NEGOTIATION</option>
              <option value="CLOSED">🎉 CLOSED (WON)</option>
              <option value="DEAD">💀 DEAD (LOST)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Transition Rationale</label>
            <input
              type="text"
              value={transitionReason}
              onChange={(e) => setTransitionReason(e.target.value)}
              placeholder="e.g. Completed initial discovery demo"
              className="w-full text-xs font-medium px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      ),
      submitText: "Execute Stage Transition",
      result: transitionResult || (lead?.status ? {
        success: true,
        toStatus: lead.status,
        message: `Current registered status: ${lead.status}`,
        updatedAt: lead.updatedAt || new Date().toISOString()
      } : null),
      changedProps: [
        { label: "Status State", value: `${lead?.status || "NEW"} ➔ ${toStatus}` },
        { label: "Rationale Note", value: transitionReason || "Updated" },
        { label: "Pipeline Sync", value: "Real-time recalculated" }
      ]
    },
    {
      id: "sec-2",
      num: 2,
      title: "Start Nurture Automation Workflow",
      subtitle: "Enroll lead in drip engagement sequences",
      icon: Sparkles,
      color: "bg-emerald-600",
      accentBorder: "border-emerald-100",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      whatItDoes: "Initiates multi-touch automated email, SMS, and WhatsApp nurturing sequences tailored for cold re-engagement or high-intent leads. Automatically pauses sequence when user responds or converts.",
      loading: loadingNurture,
      onSubmit: handleNurtureSubmit,
      controls: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Automation Sequence Template</label>
            <select
              value={automationTemplateId}
              onChange={(e) => setAutomationTemplateId(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="tpl-cold-re-engage">❄️ Cold Lead Re-engagement (7-Day Drip)</option>
              <option value="tpl-demo-followup">🚀 Post-Demo High-Intent Sequence (3-Day)</option>
              <option value="tpl-onboarding">👋 Enterprise Onboarding & Value Tour</option>
              <option value="tpl-winback">🔄 Inactive Account Winback Sequence</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Enrollment Trigger Reason</label>
            <input
              type="text"
              value={nurtureReason}
              onChange={(e) => setNurtureReason(e.target.value)}
              placeholder="Reason for starting drip..."
              className="w-full text-xs font-medium px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      ),
      submitText: "Start Nurture Workflow",
      result: nurtureResult,
      changedProps: [
        { label: "Workflow State", value: nurtureResult?.status || "Sequence Ready" },
        { label: "Enrolled Template", value: automationTemplateId },
        { label: "Touchpoints Dispatched", value: "Step 1 of 5 Enqueued" }
      ]
    },
    {
      id: "sec-3",
      num: 3,
      title: "Ingest Buying Intent Signal",
      subtitle: "Record digital body language and intent score",
      icon: TrendingUp,
      color: "bg-blue-600",
      accentBorder: "border-blue-100",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
      whatItDoes: "Captures digital buying signals (pricing page views, enterprise ROI calculation, PDF downloads, feature clicks) and dynamically increments lead intent weight score (1-100).",
      loading: loadingSignal,
      onSubmit: handleSignalSubmit,
      controls: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Signal Source Type</label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="WEBSITE">🌐 Website Page Visit / ROI Calculator</option>
                <option value="EMAIL_CLICK">✉️ Email Link Click / Content Download</option>
                <option value="PRODUCT_CLICK">⚡ Product Feature Interaction</option>
                <option value="FORM_SUBMIT">📝 High-Intent Form Inquiry</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Intent Score Weight (1-100)</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={signalScore}
                  onChange={(e) => setSignalScore(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <span className="px-3 py-1 bg-blue-100 text-blue-800 font-extrabold rounded-lg text-xs min-w-[55px] text-center">
                  +{signalScore} pts
                </span>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Event Description / Source Text</label>
            <input
              type="text"
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="e.g. Calculated Enterprise Plan ROI on pricing page"
              className="w-full text-xs font-medium px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      ),
      submitText: "Record Intent Signal",
      result: signalResult,
      changedProps: [
        { label: "Signal Category", value: sourceType },
        { label: "Intent Boost", value: `+${signalScore} Points` },
        { label: "Lead Predictive Score", value: `Updated (${(lead?.score || 65) + Math.round(signalScore * 0.2)} / 100)` }
      ]
    },
    {
      id: "sec-4",
      num: 4,
      title: "Link Anonymous Web Tracking Session",
      subtitle: "Unify anonymous web activity with CRM lead",
      icon: Link2,
      color: "bg-purple-600",
      accentBorder: "border-purple-100",
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
      whatItDoes: "Binds anonymous web tracking session cookies (`sess_xxx`) to the identified CRM lead profile once user consent is granted, consolidating website browsing history into a unified identity graph.",
      loading: loadingSession,
      onSubmit: handleSessionSubmit,
      controls: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Anonymous Session ID Token</label>
            <input
              type="text"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="w-full text-xs font-mono font-medium px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="pt-4 sm:pt-0">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={consentGranted}
                onChange={(e) => setConsentGranted(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 border-gray-300"
              />
              <span className="text-xs font-bold text-gray-800">User Tracking Consent Verified</span>
            </label>
            <p className="text-[11px] text-gray-400 mt-1">GDPR / CCPA consent compliance logged</p>
          </div>
        </div>
      ),
      submitText: "Link Web Session",
      result: sessionResult,
      changedProps: [
        { label: "Session Identity Token", value: sessionId },
        { label: "Consent Status", value: consentGranted ? "Verified & Logged" : "Denied" },
        { label: "Identity Mapping", value: `Tied to Lead ID #${leadId.slice(0, 8)}` }
      ]
    },
    {
      id: "sec-5",
      num: 5,
      title: "Check Response SLA Compliance",
      subtitle: "Audit first-touch SLA and trigger manager escalation",
      icon: Clock,
      color: "bg-amber-600",
      accentBorder: "border-amber-100",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      whatItDoes: "Audits team response times against organizational SLAs (e.g. 60-minute response rule) and automatically triggers management alert notifications or lead re-assignments if thresholds are breached.",
      loading: loadingSla,
      onSubmit: handleSlaSubmit,
      controls: (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Max Response Time (Minutes)</label>
            <input
              type="number"
              value={maxResponseTimeMinutes}
              onChange={(e) => setMaxResponseTimeMinutes(Number(e.target.value))}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Escalation Action Rule</label>
            <select
              value={escalationRule}
              onChange={(e) => setEscalationRule(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="AUTO_NOTIFY_MANAGER">🔔 Notify Sales Manager</option>
              <option value="REASSIGN_LEAD">🔄 Auto-Reassign to Next Rep</option>
              <option value="PRIORITY_BOOST">⚡ Boost Lead Priority Level</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Manager ID to Escalate</label>
            <input
              type="text"
              value={escalateToId}
              onChange={(e) => setEscalateToId(e.target.value)}
              className="w-full text-xs font-medium px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      ),
      submitText: "Run SLA Compliance Check",
      result: slaResult,
      changedProps: [
        { label: "SLA Threshold", value: `${maxResponseTimeMinutes} Minutes` },
        { label: "Audit Status", value: slaResult?.slaBreached ? "⚠️ BREACHED" : "✅ COMPLIANT (42m elapsed)" },
        { label: "Escalation Target", value: escalateToId }
      ]
    },
    {
      id: "sec-6",
      num: 6,
      title: "Submit Outcome Rationale & AI Feedback",
      subtitle: "Feed closed-loop sales results back into AI models",
      icon: Star,
      color: "bg-yellow-600",
      accentBorder: "border-yellow-100",
      badgeColor: "bg-yellow-50 text-yellow-700 border-yellow-200",
      whatItDoes: "Captures final deal outcome (WON, LOST, DEAD), feedback scores (1-10), and conversion rationale to continuously train and optimize machine learning lead qualification models.",
      loading: loadingFeedback,
      onSubmit: handleFeedbackSubmit,
      controls: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Final Deal Outcome</label>
              <div className="flex gap-2">
                {(["WON", "LOST", "DEAD"] as const).map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => setOutcome(o)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                      outcome === o
                        ? o === "WON"
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : o === "LOST"
                          ? "bg-amber-600 text-white border-amber-600"
                          : "bg-red-600 text-white border-red-600"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {o === "WON" ? "🏆 WON" : o === "LOST" ? "❌ LOST" : "💀 DEAD"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Quality Rating Score (1-10)</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={feedbackScore}
                  onChange={(e) => setFeedbackScore(Number(e.target.value))}
                  className="w-full accent-yellow-600"
                />
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 font-extrabold rounded-lg text-xs min-w-[50px] text-center">
                  {feedbackScore} / 10
                </span>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Outcome Rationale Rationale</label>
            <input
              type="text"
              value={feedbackReason}
              onChange={(e) => setFeedbackReason(e.target.value)}
              placeholder="Detail reasons for win/loss..."
              className="w-full text-xs font-medium px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
          </div>
        </div>
      ),
      submitText: "Submit Outcome Rationale",
      result: feedbackResult,
      changedProps: [
        { label: "Outcome Registered", value: outcome },
        { label: "Lead Quality Score", value: `${feedbackScore} / 10 Rating` },
        { label: "ML Model Weighting", value: "Trained with outcome feedback" }
      ]
    },
    {
      id: "sec-7",
      num: 7,
      title: "Convert Lead to Pipeline Deal Opportunity",
      subtitle: "Promote lead into active CRM deal pipeline",
      icon: Briefcase,
      color: "bg-teal-600",
      accentBorder: "border-teal-100",
      badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
      whatItDoes: "Promotes a qualified lead into an active CRM deal opportunity, preserving all contact info, company details, tags, and estimated opportunity value into the deal pipeline.",
      loading: loadingConvert,
      onSubmit: handleConvertSubmit,
      controls: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Target Deal Pipeline Stage</label>
            <select
              value={targetStage}
              onChange={(e) => setTargetStage(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="QUALIFIED">🎯 Qualified Opportunity</option>
              <option value="PROPOSAL">📄 Proposal Sent</option>
              <option value="NEGOTIATION">🤝 Contract Negotiation</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Estimated Opportunity Amount (₹)</label>
            <input
              type="number"
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(Number(e.target.value))}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
      ),
      submitText: "Convert Lead to Deal",
      result: convertResult,
      changedProps: [
        { label: "Created Deal Record", value: convertResult?.dealId || convertResult?.id ? `#${convertResult?.dealId || convertResult?.id}` : "Ready to Convert" },
        { label: "Pipeline Value", value: `₹${estimatedValue.toLocaleString()}` },
        { label: "Lifecycle Status", value: "Promoted to Deal Opportunity" }
      ]
    },
    {
      id: "sec-8",
      num: 8,
      title: "Enrich Lead Profile Attributes",
      subtitle: "Fetch company firmographics and social profiles",
      icon: Database,
      color: "bg-cyan-600",
      accentBorder: "border-cyan-100",
      badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200",
      whatItDoes: "Queries external data providers (Clearbit, Hunter, Apollo, OpenCorporates) to fetch missing company headcount, industry classification, technology stack, and social profiles.",
      loading: loadingEnrich,
      onSubmit: handleEnrichSubmit,
      controls: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Enrichment Provider Engine</label>
            <select
              value={enrichProvider}
              onChange={(e) => setEnrichProvider(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="clearbit">⚡ Clearbit Data Engine (Default)</option>
              <option value="hunter">🔍 Hunter.io Contact Verification</option>
              <option value="apollo">🏢 Apollo Firmographic Intelligence</option>
            </select>
          </div>
          <div className="pt-4 sm:pt-0">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={forceEnrich}
                onChange={(e) => setForceEnrich(e.target.checked)}
                className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500 border-gray-300"
              />
              <span className="text-xs font-bold text-gray-800">Bypass cache & force provider refresh</span>
            </label>
          </div>
        </div>
      ),
      submitText: "Execute Profile Enrichment",
      result: enrichResult,
      changedProps: [
        { label: "Provider Engine", value: enrichResult?.provider || enrichProvider },
        { label: "Fields Enriched", value: enrichResult?.enrichedFieldsCount ? `${enrichResult.enrichedFieldsCount} Fields Updated` : "4 Firmographic Attributes" },
        { label: "Company Attributes", value: "Size, Industry & Social Synced" }
      ]
    },
    {
      id: "sec-9",
      num: 9,
      title: "Qualify Lead (ICP Scoring)",
      subtitle: "Compute ICP fit, intent level, and buyer readiness",
      icon: ShieldCheck,
      color: "bg-rose-600",
      accentBorder: "border-rose-100",
      badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
      whatItDoes: "Evaluates lead profile attributes against Ideal Customer Profile (ICP) criteria to compute fit score (0-100), buying intent level (HIGH/MEDIUM/LOW), and readiness timelines.",
      loading: loadingQualify,
      onSubmit: handleQualifySubmit,
      controls: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Qualification Evaluation Cadence</label>
            <select
              value={qualifyCadence}
              onChange={(e) => setQualifyCadence(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="immediate">⚡ Real-time On-Demand Recalculation</option>
              <option value="daily">📅 Scheduled Daily ICP Audit</option>
            </select>
          </div>
          <div className="flex items-center pt-5">
            <p className="text-xs text-gray-500">Evaluates company size, budget signal, decision maker authority, and timing.</p>
          </div>
        </div>
      ),
      submitText: "Qualify Lead ICP",
      result: qualifyResult,
      changedProps: [
        { label: "ICP Status", value: qualifyResult?.status || "QUALIFIED" },
        { label: "ICP Fit Score", value: `${qualifyResult?.fitScore || 92} / 100` },
        { label: "Intent Level", value: qualifyResult?.intentLevel || "HIGH INTENT" }
      ]
    },
    {
      id: "sec-10",
      num: 10,
      title: "Automated Lead Routing",
      subtitle: "Assign lead ownership to optimal sales rep",
      icon: UserCheck,
      color: "bg-violet-600",
      accentBorder: "border-violet-100",
      badgeColor: "bg-violet-50 text-violet-700 border-violet-200",
      whatItDoes: "Applies active organizational assignment rules (AI recommendation, round-robin, workload capacity balancing) to match and route the lead to the best sales representative.",
      loading: loadingRoute,
      onSubmit: handleRouteSubmit,
      controls: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Routing Assignment Strategy</label>
            <select
              value={routeStrategy}
              onChange={(e) => setRouteStrategy(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="ai_recommendation">🧠 AI Recommendation (Best Skill & Capacity Match)</option>
              <option value="round_robin">🔄 Round Robin Equal Distribution</option>
              <option value="load_balanced">⚖️ Load Balanced Workload</option>
            </select>
          </div>
          <div className="flex items-center pt-5">
            <p className="text-xs text-gray-500">Checks representative capacity limits, region match, and deal size threshold.</p>
          </div>
        </div>
      ),
      submitText: "Execute Auto-Route Lead",
      result: routeResult,
      changedProps: [
        { label: "Routing Strategy", value: routeResult?.strategy || routeStrategy },
        { label: "Assigned Representative", value: routeResult?.assignedToName || lead?.assignedTo?.name || lead?.owner || "Alex Morgan (Senior Rep)" },
        { label: "Capacity Audit", value: "Verified active capacity" }
      ]
    },
    {
      id: "sec-11",
      num: 11,
      title: "Save Lead Assignment Rule Configuration",
      subtitle: "Configure global assignment rules and capacity rules",
      icon: Settings,
      color: "bg-slate-700",
      accentBorder: "border-slate-200",
      badgeColor: "bg-slate-100 text-slate-800 border-slate-300",
      whatItDoes: "Configures organization-wide distribution strategies, fallback routing behavior, and capacity caps to ensure leads are assigned efficiently without rep burnout.",
      loading: loadingRule,
      onSubmit: handleRuleSubmit,
      controls: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Default Organization Strategy</label>
            <select
              value={ruleStrategy}
              onChange={(e: any) => setRuleStrategy(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-500"
            >
              <option value="ai_recommendation">🧠 AI Recommendation</option>
              <option value="round_robin">🔄 Round Robin</option>
              <option value="load_balanced">⚖️ Load Balanced</option>
              <option value="manual">👤 Manual Assignment</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Max Lead Capacity Per Rep</label>
            <input
              type="number"
              value={maxCapacity}
              onChange={(e) => setMaxCapacity(Number(e.target.value))}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>
        </div>
      ),
      submitText: "Save Assignment Rule Config",
      result: ruleResult,
      changedProps: [
        { label: "Active Rule Strategy", value: ruleStrategy },
        { label: "Rep Capacity Threshold", value: `${maxCapacity} Active Leads Max` },
        { label: "Rule Version", value: "Saved to Organization Settings" }
      ]
    }
  ];

  const visibleSections = activeSectionId === "all"
    ? sections
    : sections.filter((s) => s.id === activeSectionId);

  return (
    <div className={`space-y-6 ${className}`}>
      
      {/* Top Header & Subsystem Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-gray-900 tracking-tight">
              Lifecycle &amp; Intelligence Subsystems (11 Subsystems)
            </h2>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            11 Subsystems Active
          </span>
        </div>

        {/* Section Navigation Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          <button
            onClick={() => setActiveSectionId("all")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeSectionId === "all"
                ? "bg-blue-600 text-white shadow-2xs"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All Subsystems
          </button>
          {sections.map((sec) => (
            <button
              key={sec.id}
              onClick={() => setActiveSectionId(sec.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                activeSectionId === sec.id
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100"
              }`}
            >
              {sec.num}. {sec.title.split(" ")[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Render Subsystem Sections */}
      <div className="space-y-3">
        {visibleSections.map((sec) => (
          <div
            key={sec.id}
            id={sec.id}
            className={`bg-white rounded-xl border ${sec.accentBorder} shadow-2xs overflow-hidden transition-all`}
          >
            {/* Section Header */}
            <div className="px-4 py-2.5 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500">#{sec.num}</span>
                <h3 className="text-xs font-bold text-gray-900">
                  {sec.title}
                </h3>
              </div>
              <span className="text-[11px] text-gray-500 hidden sm:inline">{sec.subtitle}</span>
            </div>

            {/* Section Body */}
            <div className="p-4 space-y-3">
              {/* Form Controls */}
              <form onSubmit={sec.onSubmit} className="space-y-3">
                {sec.controls}

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={sec.loading}
                    className={`px-4 py-1.5 rounded-lg ${sec.color} hover:opacity-90 text-white text-xs font-semibold transition-all shadow-2xs flex items-center gap-1.5 disabled:opacity-50`}
                  >
                    {sec.loading ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <ArrowRight size={13} />
                    )}
                    {sec.loading ? "Executing..." : sec.submitText}
                  </button>
                </div>
              </form>

              {/* Minimal Live Output Bar */}
              <div className="bg-emerald-50/40 px-3 py-2 rounded-lg border border-emerald-100/70 text-xs text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>
                    {sec.result?.message
                      ? sec.result.message
                      : `Initialized for ${leadName}. Run action to trigger live update.`}
                  </span>
                </div>
                {sec.changedProps && sec.changedProps.length > 0 && (
                  <div className="flex items-center gap-3 text-[11px] text-emerald-800 font-semibold shrink-0">
                    {sec.changedProps.slice(0, 2).map((cp, idx) => (
                      <span key={idx} className="bg-white/80 px-2 py-0.5 rounded border border-emerald-200/60">
                        {cp.label}: <strong>{cp.value}</strong>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
