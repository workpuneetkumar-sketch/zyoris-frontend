"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import {
  transitionLeadLifecycle,
  startLeadNurture,
  ingestLeadSignal,
  linkLeadSession,
  checkLeadSla,
  submitLeadFeedback,
  convertLeadToDeal,
  enrichLead,
  qualifyLead,
  routeLead,
  saveAssignmentRule,
  AssignmentRuleConfig,
  TransitionLifecyclePayload,
  TransitionLifecycleResponse,
  StartNurturePayload,
  StartNurtureResponse,
  IngestSignalPayload,
  IngestSignalResponse,
  LinkSessionPayload,
  LinkSessionResponse,
  CheckSlaPayload,
  CheckSlaResponse,
  SubmitFeedbackPayload,
  SubmitFeedbackResponse,
  ConvertToDealResponse,
} from "@/lib/api/leadsApi";

export interface UseLeadLifecycleActionsProps {
  leadId: string;
  leadName?: string;
  onLeadUpdated?: () => void;
}

export function useLeadLifecycleActions({
  leadId,
  leadName = "Lead",
  onLeadUpdated,
}: UseLeadLifecycleActionsProps) {
  // Loading states
  const [loadingTransition, setLoadingTransition] = useState(false);
  const [loadingNurture, setLoadingNurture] = useState(false);
  const [loadingSignal, setLoadingSignal] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [loadingSla, setLoadingSla] = useState(false);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [loadingConvert, setLoadingConvert] = useState(false);
  const [loadingEnrich, setLoadingEnrich] = useState(false);
  const [loadingQualify, setLoadingQualify] = useState(false);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [loadingRule, setLoadingRule] = useState(false);

  // Response / result states
  const [transitionResult, setTransitionResult] = useState<TransitionLifecycleResponse | null>(null);
  const [nurtureResult, setNurtureResult] = useState<StartNurtureResponse | null>(null);
  const [signalResult, setSignalResult] = useState<IngestSignalResponse | null>(null);
  const [sessionResult, setSessionResult] = useState<LinkSessionResponse | null>(null);
  const [slaResult, setSlaResult] = useState<CheckSlaResponse | null>(null);
  const [feedbackResult, setFeedbackResult] = useState<SubmitFeedbackResponse | null>(null);
  const [convertResult, setConvertResult] = useState<ConvertToDealResponse | null>(null);
  const [enrichResult, setEnrichResult] = useState<any>(null);
  const [qualifyResult, setQualifyResult] = useState<any>(null);
  const [routeResult, setRouteResult] = useState<any>(null);
  const [ruleResult, setRuleResult] = useState<any>(null);

  // 1. Transition Lifecycle
  const executeTransition = async (payload: TransitionLifecyclePayload) => {
    if (!leadId) {
      toast.error("Lead ID is missing");
      return null;
    }
    setLoadingTransition(true);
    try {
      const res = await transitionLeadLifecycle(leadId, payload);
      setTransitionResult(res);
      toast.success(res?.message || `Lifecycle stage transitioned to ${payload.toStatus}!`);
      onLeadUpdated?.();
      return res;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to transition stage";
      toast.error(`Transition Error: ${msg}`);
      throw err;
    } finally {
      setLoadingTransition(false);
    }
  };

  // 2. Start Nurture
  const executeStartNurture = async (payload: StartNurturePayload) => {
    if (!leadId) {
      toast.error("Lead ID is missing");
      return null;
    }
    setLoadingNurture(true);
    try {
      const res = await startLeadNurture(leadId, payload);
      setNurtureResult(res);
      toast.success(res?.message || `Nurture workflow started for ${leadName}!`);
      onLeadUpdated?.();
      return res;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to start nurture workflow";
      toast.error(`Nurture Error: ${msg}`);
      throw err;
    } finally {
      setLoadingNurture(false);
    }
  };

  // 3. Ingest Intent Signal
  const executeIngestSignal = async (payload: IngestSignalPayload) => {
    if (!leadId) {
      toast.error("Lead ID is missing");
      return null;
    }
    setLoadingSignal(true);
    try {
      const res = await ingestLeadSignal(leadId, payload);
      setSignalResult(res);
      toast.success(res?.message || `Buying signal successfully recorded (+${payload.score} pts)!`);
      onLeadUpdated?.();
      return res;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to record intent signal";
      toast.error(`Signal Error: ${msg}`);
      throw err;
    } finally {
      setLoadingSignal(false);
    }
  };

  // 4. Link Session
  const executeLinkSession = async (payload: LinkSessionPayload) => {
    setLoadingSession(true);
    try {
      const res = await linkLeadSession(payload);
      setSessionResult(res);
      toast.success(res?.message || `Anonymous session linked to lead!`);
      onLeadUpdated?.();
      return res;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to link session";
      toast.error(`Session Link Error: ${msg}`);
      throw err;
    } finally {
      setLoadingSession(false);
    }
  };

  // 5. Check SLA
  const executeCheckSla = async (payload: CheckSlaPayload) => {
    if (!leadId) {
      toast.error("Lead ID is missing");
      return null;
    }
    setLoadingSla(true);
    try {
      const res = await checkLeadSla(leadId, payload);
      setSlaResult(res);
      if (res?.slaBreached) {
        toast.warning(res?.message || `SLA breach detected! Escalation rule triggered.`);
      } else {
        toast.success(res?.message || `SLA check executed successfully!`);
      }
      onLeadUpdated?.();
      return res;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to execute SLA check";
      toast.error(`SLA Error: ${msg}`);
      throw err;
    } finally {
      setLoadingSla(false);
    }
  };

  // 6. Submit Feedback
  const executeSubmitFeedback = async (payload: SubmitFeedbackPayload) => {
    if (!leadId) {
      toast.error("Lead ID is missing");
      return null;
    }
    setLoadingFeedback(true);
    try {
      const res = await submitLeadFeedback(leadId, payload);
      setFeedbackResult(res);
      toast.success(res?.message || `Lead feedback outcome recorded as ${payload.outcome}!`);
      onLeadUpdated?.();
      return res;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to submit lead feedback";
      toast.error(`Feedback Error: ${msg}`);
      throw err;
    } finally {
      setLoadingFeedback(false);
    }
  };

  // 7. Convert to Deal
  const executeConvertToDeal = async () => {
    if (!leadId) {
      toast.error("Lead ID is missing");
      return null;
    }
    setLoadingConvert(true);
    try {
      const res = await convertLeadToDeal(leadId);
      setConvertResult(res);
      toast.success(res?.message || `Lead successfully converted to Deal!`);
      onLeadUpdated?.();
      return res;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to convert lead to deal";
      toast.error(`Conversion Error: ${msg}`);
      throw err;
    } finally {
      setLoadingConvert(false);
    }
  };

  // 8. Enrich Lead Data
  const executeEnrich = async () => {
    if (!leadId) {
      toast.error("Lead ID is missing");
      return null;
    }
    setLoadingEnrich(true);
    try {
      const res = await enrichLead(leadId, { provider: "clearbit", force: true });
      setEnrichResult(res);
      toast.success(res?.message || "Lead data enrichment executed!");
      onLeadUpdated?.();
      return res;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Enrichment failed";
      toast.error(`Enrichment Error: ${msg}`);
      throw err;
    } finally {
      setLoadingEnrich(false);
    }
  };

  // 9. Qualify Lead ICP
  const executeQualify = async () => {
    if (!leadId) {
      toast.error("Lead ID is missing");
      return null;
    }
    setLoadingQualify(true);
    try {
      const res = await qualifyLead(leadId, { forceRecalculate: true });
      setQualifyResult(res);
      toast.success(res?.message || `Qualification completed! Status: ${res?.status || "QUALIFIED"}`);
      onLeadUpdated?.();
      return res;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Qualification failed";
      toast.error(`Qualification Error: ${msg}`);
      throw err;
    } finally {
      setLoadingQualify(false);
    }
  };

  // 10. Route Lead
  const executeRoute = async () => {
    if (!leadId) {
      toast.error("Lead ID is missing");
      return null;
    }
    setLoadingRoute(true);
    try {
      const res = await routeLead(leadId, { reassign: true });
      setRouteResult(res);
      toast.success(res?.message || `Lead successfully routed to rep: ${res?.assignedToName || "Assigned"}`);
      onLeadUpdated?.();
      return res;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Routing failed";
      toast.error(`Routing Error: ${msg}`);
      throw err;
    } finally {
      setLoadingRoute(false);
    }
  };

  // 11. Save Assignment Rule Config
  const executeSaveRule = async (config: AssignmentRuleConfig) => {
    setLoadingRule(true);
    try {
      const res = await saveAssignmentRule(config);
      setRuleResult(res);
      toast.success("Assignment rule configuration saved!");
      return res;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to save rule";
      toast.error(`Rule Error: ${msg}`);
      throw err;
    } finally {
      setLoadingRule(false);
    }
  };

  return {
    // Action runners
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

    // Loaders
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

    // Results
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
  };
}

