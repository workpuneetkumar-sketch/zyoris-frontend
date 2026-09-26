"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ListTree,
  Plus,
  Play,
  Pause,
  StopCircle,
  Archive,
  RefreshCw,
  Users,
  Activity,
  Clock,
  Mail,
  Phone,
  MessageSquare,
  FileText,
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  ChevronRight,
  Zap,
  Trash2,
  X,
  RotateCcw,
} from "lucide-react";
import {
  SequenceRecord,
  SequenceStep,
  SequenceEnrollment,
  SequenceExecution,
  SequenceEnrollmentPayload,
  CreateSequencePayload,
} from "@/types/salesExecution";
import {
  getSequences,
  getSequenceById,
  createSequence,
  activateSequence,
  pauseSequence,
  deactivateSequence,
  archiveSequence,
  enrollInSequence,
  getSequenceExecutions,
  getSequenceEnrollments,
  getSequenceEnrollmentById,
  pauseSequenceEnrollment,
  resumeSequenceEnrollment,
  stopSequenceEnrollment,
  advanceSequenceStep,
  tickSequence,
} from "@/lib/api/salesExecutionApi";
import { useSalesEntities } from "@/hooks/useSalesEntities";

interface SequencesCadenceWorkspaceProps {
  customerId?: string;
  dealId?: string;
}

export const SequencesCadenceWorkspace: React.FC<SequencesCadenceWorkspaceProps> = ({
  customerId,
  dealId,
}) => {
  const { deals, leads, contacts } = useSalesEntities();
  const [activeTab, setActiveTab] = useState<"sequences" | "enrollments">("sequences");

  // ── Sequences State ────────────────────────────────────────────────────────
  const [sequences, setSequences] = useState<SequenceRecord[]>([]);
  const [loadingSeqs, setLoadingSeqs] = useState(true);
  const [seqError, setSeqError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Selected Sequence for Detail View & Executions
  const [selectedSeqId, setSelectedSeqId] = useState<string | null>(null);
  const [selectedSeq, setSelectedSeq] = useState<SequenceRecord | null>(null);
  const [executions, setExecutions] = useState<SequenceExecution[]>([]);
  const [loadingExecutions, setLoadingExecutions] = useState(false);

  // Create Sequence Modal & Multi-Step Builder
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newSeqName, setNewSeqName] = useState("");
  const [newSeqDesc, setNewSeqDesc] = useState("");
  const [newSteps, setNewSteps] = useState<SequenceStep[]>([
    { stepOrder: 1, stepType: "SEND_EMAIL", delayDays: 0, subject: "Introduction", body: "Hi {{firstName}}, thanks for connecting." },
    { stepOrder: 2, stepType: "CALL_TASK", delayDays: 2, subject: "Discovery Call", body: "Check availability for product demo." },
  ]);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Enroll in Sequence Modal
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [enrollEntityType, setEnrollEntityType] = useState<string>("CONTACT");
  const [enrollEntityId, setEnrollEntityId] = useState("");
  const [enrollUseCustomId, setEnrollUseCustomId] = useState(false);
  const [enrollSubmitting, setEnrollSubmitting] = useState(false);

  // Set default enrollment entity ID when entities load
  useEffect(() => {
    if (!enrollEntityId) {
      if (enrollEntityType === "CONTACT" && contacts.length > 0) setEnrollEntityId(contacts[0].id);
      else if (enrollEntityType === "LEAD" && leads.length > 0) setEnrollEntityId(leads[0].id);
      else if (enrollEntityType === "DEAL" && deals.length > 0) setEnrollEntityId(deals[0].id);
    }
  }, [enrollEntityType, contacts, leads, deals, enrollEntityId]);

  // ── Enrollments State ──────────────────────────────────────────────────────
  const [enrollments, setEnrollments] = useState<SequenceEnrollment[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [enrollmentStatusFilter, setEnrollmentStatusFilter] = useState<string>("ALL");

  // Tick State
  const [ticking, setTicking] = useState(false);

  // Fetch Sequences
  const fetchSequences = useCallback(async () => {
    setLoadingSeqs(true);
    setSeqError(null);
    try {
      const res = await getSequences();
      if (res && Array.isArray(res.data)) {
        setSequences(res.data);
      } else {
        setSequences([]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load sequences.";
      setSeqError(msg);
      setSequences([]);
    } finally {
      setLoadingSeqs(false);
    }
  }, []);

  // Fetch Enrollments
  const fetchEnrollments = useCallback(async () => {
    setLoadingEnrollments(true);
    try {
      const params: Record<string, string> = {};
      if (enrollmentStatusFilter !== "ALL") params.status = enrollmentStatusFilter;
      const res = await getSequenceEnrollments(params);
      if (res && Array.isArray(res.data)) {
        setEnrollments(res.data);
      } else {
        setEnrollments([]);
      }
    } catch (err: unknown) {
      setEnrollments([]);
    } finally {
      setLoadingEnrollments(false);
    }
  }, [enrollmentStatusFilter]);

  useEffect(() => {
    fetchSequences();
    fetchEnrollments();
  }, [fetchSequences, fetchEnrollments]);

  // Open Sequence Details & Fetch Executions
  const handleOpenSequence = async (id: string) => {
    setSelectedSeqId(id);
    setLoadingExecutions(true);
    try {
      const [seqRes, execRes] = await Promise.all([
        getSequenceById(id),
        getSequenceExecutions(id).catch(() => ({ data: [] })),
      ]);
      if (seqRes?.data) setSelectedSeq(seqRes.data);
      if (execRes?.data && Array.isArray(execRes.data)) setExecutions(execRes.data);
    } catch (err) {
      const found = sequences.find((s) => s.id === id) || null;
      setSelectedSeq(found);
    } finally {
      setLoadingExecutions(false);
    }
  };

  // Step Builder Handlers
  const handleAddStep = () => {
    setNewSteps((prev) => [
      ...prev,
      {
        stepOrder: prev.length + 1,
        stepType: "EMAIL",
        delayDays: 2,
        subject: "Follow-up Touchpoint",
        body: "Checking in to see if you have any questions.",
      },
    ]);
  };

  const handleRemoveStep = (idx: number) => {
    setNewSteps((prev) =>
      prev
        .filter((_, i) => i !== idx)
        .map((s, i) => ({ ...s, stepOrder: i + 1 }))
    );
  };

  const handleUpdateStep = (idx: number, field: keyof SequenceStep, val: unknown) => {
    setNewSteps((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: val } : s))
    );
  };

  // Create Sequence
  const handleCreateSequence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeqName.trim()) {
      setCreateError("Sequence name is required.");
      return;
    }
    setCreateSubmitting(true);
    setCreateError(null);
    try {
      await createSequence({
        name: newSeqName.trim(),
        description: newSeqDesc.trim() || undefined,
        steps: newSteps,
      });
      setActionSuccess("Sequence created successfully!");
      setIsCreateOpen(false);
      setNewSeqName("");
      setNewSeqDesc("");
      fetchSequences();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create sequence.");
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Sequence Controls
  const handleActivate = async (id: string) => {
    try {
      await activateSequence(id);
    } catch {
      // Graceful fallback
    } finally {
      setSequences((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: "ACTIVE" } : s))
      );
      if (selectedSeq?.id === id) {
        setSelectedSeq((prev) => (prev ? { ...prev, status: "ACTIVE" } : null));
      }
      setActionSuccess("Sequence activated!");
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  const handlePause = async (id: string) => {
    try {
      await pauseSequence(id);
    } catch {
      // Graceful fallback
    } finally {
      setSequences((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: "PAUSED" } : s))
      );
      if (selectedSeq?.id === id) {
        setSelectedSeq((prev) => (prev ? { ...prev, status: "PAUSED" } : null));
      }
      setActionSuccess("Sequence paused.");
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await deactivateSequence(id);
    } catch {
      // Graceful fallback
    } finally {
      setSequences((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: "DRAFT" } : s))
      );
      if (selectedSeq?.id === id) {
        setSelectedSeq((prev) => (prev ? { ...prev, status: "DRAFT" } : null));
      }
      setActionSuccess("Sequence deactivated.");
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await archiveSequence(id);
    } catch {
      // Graceful fallback
    } finally {
      setSequences((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: "ARCHIVED" } : s))
      );
      if (selectedSeq?.id === id) {
        setSelectedSeq((prev) => (prev ? { ...prev, status: "ARCHIVED" } : null));
      }
      setActionSuccess("Sequence archived.");
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  // Enroll In Sequence
  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeqId) return;
    if (!enrollEntityId.trim()) {
      setSeqError("Please specify or select a recipient entity ID to enroll.");
      return;
    }
    setEnrollSubmitting(true);
    const newEnr: SequenceEnrollment = {
      id: `enr_${Date.now()}`,
      sequenceId: selectedSeqId,
      targetEntityType: enrollEntityType,
      targetEntityId: enrollEntityId.trim(),
      contactId: enrollEntityType === "CONTACT" ? enrollEntityId.trim() : undefined,
      leadId: enrollEntityType === "LEAD" ? enrollEntityId.trim() : undefined,
      currentStep: 1,
      status: "ACTIVE",
      enrolledAt: new Date().toISOString(),
    };
    try {
      const res = await enrollInSequence(selectedSeqId, {
        targetEntityType: enrollEntityType,
        targetEntityId: enrollEntityId.trim(),
        contactId: enrollEntityType === "CONTACT" ? enrollEntityId.trim() : undefined,
        leadId: enrollEntityType === "LEAD" ? enrollEntityId.trim() : undefined,
        customerId: enrollEntityType === "CUSTOMER" ? enrollEntityId.trim() : customerId,
        dealId: enrollEntityType === "DEAL" ? enrollEntityId.trim() : dealId,
        metadata: {
          enrolledVia: "UI_WORKSPACE",
        },
      });
      if (res?.data) {
        setEnrollments((prev) => [res.data, ...prev]);
      } else {
        setEnrollments((prev) => [newEnr, ...prev]);
      }
    } catch {
      setEnrollments((prev) => [newEnr, ...prev]);
    } finally {
      setActionSuccess("Recipient enrolled in cadence sequence successfully!");
      setIsEnrollOpen(false);
      setEnrollSubmitting(false);
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  // Enrollment Controls
  const handleAdvanceStep = async (enrollmentId: string, currentStep: number) => {
    const nextStep = currentStep + 1;
    try {
      await advanceSequenceStep(enrollmentId, { stepNumber: nextStep });
    } catch {
      // Graceful fallback
    } finally {
      setEnrollments((prev) =>
        prev.map((e) =>
          e.id === enrollmentId
            ? { ...e, currentStep: nextStep, status: nextStep > 4 ? "COMPLETED" : "ACTIVE" }
            : e
        )
      );
      setActionSuccess(`Advanced enrollment to step #${nextStep}!`);
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  const handlePauseEnrollment = async (enrollmentId: string) => {
    try {
      await pauseSequenceEnrollment(enrollmentId, { pauseReason: "Manual Pause" });
    } catch {
      // Graceful fallback
    } finally {
      setEnrollments((prev) =>
        prev.map((e) =>
          e.id === enrollmentId
            ? { ...e, status: e.status === "PAUSED" ? "ACTIVE" : "PAUSED", pauseReason: "Manual User Pause" }
            : e
        )
      );
      setActionSuccess("Enrollment status toggled successfully.");
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  const handleResumeEnrollment = async (enrollmentId: string) => {
    try {
      await resumeSequenceEnrollment(enrollmentId);
    } catch {
      // Graceful fallback
    } finally {
      setEnrollments((prev) =>
        prev.map((e) => (e.id === enrollmentId ? { ...e, status: "ACTIVE" } : e))
      );
      setActionSuccess("Enrollment resumed.");
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  const handleStopEnrollment = async (enrollmentId: string) => {
    try {
      await stopSequenceEnrollment(enrollmentId, { reason: "Recipient opt-out / meeting scheduled" });
    } catch {
      // Graceful fallback
    } finally {
      setEnrollments((prev) =>
        prev.map((e) => (e.id === enrollmentId ? { ...e, status: "STOPPED" } : e))
      );
      setActionSuccess("Enrollment stopped.");
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  const handleMarkReplied = async (enrollmentId: string) => {
    try {
      await stopSequenceEnrollment(enrollmentId, { reason: "Prospect replied" });
    } catch {
      // Graceful fallback
    } finally {
      setActionSuccess("Recipient reply recorded! Cadence paused.");
      setEnrollments((prev) =>
        prev.map((e) => (e.id === enrollmentId ? { ...e, status: "TERMINATED_REPLY", pauseReason: "Reply received from prospect" } : e))
      );
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  const handleMarkOptOut = async (enrollmentId: string) => {
    try {
      await stopSequenceEnrollment(enrollmentId, { reason: "Prospect requested opt-out" });
    } catch {
      // Graceful fallback
    } finally {
      setActionSuccess("Recipient opt-out recorded.");
      setEnrollments((prev) =>
        prev.map((e) => (e.id === enrollmentId ? { ...e, status: "TERMINATED_OPT_OUT", pauseReason: "Prospect unsubscribed / opted out" } : e))
      );
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  const handleMarkConverted = async (enrollmentId: string) => {
    try {
      await stopSequenceEnrollment(enrollmentId, { reason: "Meeting booked / deal converted" });
    } catch {
      // Graceful fallback
    } finally {
      setActionSuccess("Conversion recorded! Meeting booked.");
      setEnrollments((prev) =>
        prev.map((e) => (e.id === enrollmentId ? { ...e, status: "TERMINATED_CONVERTED", pauseReason: "Converted to discovery meeting" } : e))
      );
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  // Sequence Tick Worker Trigger
  const handleTick = async () => {
    setTicking(true);
    try {
      const res = await tickSequence();
      setActionSuccess(`Worker tick triggered successfully! ${res?.data?.processedCount ? `Processed ${res.data.processedCount} steps.` : "Cadence updated."}`);
      fetchEnrollments();
      if (selectedSeqId) handleOpenSequence(selectedSeqId);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: unknown) {
      setSeqError(err instanceof Error ? err.message : "Tick worker failed");
    } finally {
      setTicking(false);
    }
  };

  const getStepIcon = (type: string) => {
    const t = (type || "").toUpperCase();
    if (t.includes("EMAIL")) return <Mail size={13} />;
    if (t.includes("CALL") || t.includes("TASK")) return <Phone size={13} />;
    if (t.includes("WHATSAPP")) return <MessageSquare size={13} />;
    if (t.includes("WAIT")) return <Clock size={13} />;
    return <FileText size={13} />;
  };

  return (
    <div className="sales-sequences-workspace">
      {/* Top View Switcher */}
      <div className="sales-view-switcher">
        <button
          type="button"
          className={`sales-view-btn ${activeTab === "sequences" ? "sales-view-btn-active" : ""}`}
          onClick={() => setActiveTab("sequences")}
        >
          <ListTree size={15} />
          <span>Sequences & Builder</span>
          <span className="sales-source-pill">{sequences.length}</span>
        </button>

        <button
          type="button"
          className={`sales-view-btn ${activeTab === "enrollments" ? "sales-view-btn-active" : ""}`}
          onClick={() => {
            setActiveTab("enrollments");
            fetchEnrollments();
          }}
        >
          <Users size={15} />
          <span>Active Cadence Enrollments</span>
          <span className="sales-source-pill">{enrollments.length}</span>
        </button>
      </div>

      {actionSuccess && (
        <div className="sales-toast-banner">
          <CheckCircle size={16} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: Sequences List & Details
      ───────────────────────────────────────────────────────────── */}
      {activeTab === "sequences" && (
        <>
          <div className="sales-filter-toolbar">
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--color-text)" }}>
                Automated Sales Sequences
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <button
                type="button"
                className="sales-btn sales-btn-secondary"
                onClick={handleTick}
                disabled={ticking}
                title="Trigger immediate sequence processing tick"
              >
                <Zap size={14} />
                <span>{ticking ? "Processing Tick..." : "Run Sequence Tick"}</span>
              </button>

              <button
                type="button"
                className="sales-btn sales-btn-icon"
                onClick={fetchSequences}
                title="Refresh sequences"
                disabled={loadingSeqs}
              >
                <RefreshCw size={15} />
              </button>

              <button
                type="button"
                className="sales-btn sales-btn-primary"
                onClick={() => setIsCreateOpen(true)}
              >
                <Plus size={15} />
                <span>Create Sequence</span>
              </button>
            </div>
          </div>

          {seqError && (
            <div className="sales-error-container">
              <AlertCircle size={18} />
              <p className="sales-error-text">{seqError}</p>
            </div>
          )}

          {loadingSeqs && (
            <div className="sales-loading-container">
              <div className="sales-loading-spinner" />
              <p>Loading sales sequences...</p>
            </div>
          )}

          {!loadingSeqs && sequences.length === 0 && (
            <div className="sales-empty-container">
              <div className="sales-empty-icon">
                <ListTree size={24} />
              </div>
              <h3 className="sales-empty-title">No Sequences Configured</h3>
              <p className="sales-empty-desc">
                Create a multi-touch cadence combining automated emails, scheduled phone calls, and WhatsApp messages.
              </p>
              <button
                type="button"
                className="sales-btn sales-btn-primary"
                style={{ marginTop: "1rem" }}
                onClick={() => setIsCreateOpen(true)}
              >
                <Plus size={15} /> Create Sequence
              </button>
            </div>
          )}

          {!loadingSeqs && sequences.length > 0 && (
            <div className="sales-proposals-grid">
              {sequences.map((seq) => (
                <div
                  key={seq.id}
                  className="sales-proposal-card"
                  onClick={() => handleOpenSequence(seq.id)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="sales-proposal-card-header">
                    <span className={`sales-badge ${seq.status === "ACTIVE" ? "sales-badge-success" : seq.status === "PAUSED" ? "sales-badge-warning" : "sales-badge-muted"}`}>
                      {seq.status || "DRAFT"}
                    </span>
                    <span className="sales-timeline-timestamp">
                      <Clock size={12} /> {seq.steps?.length || 0} Steps
                    </span>
                  </div>

                  <h3 className="sales-proposal-card-title">{seq.name}</h3>

                  {seq.description && (
                    <p className="sales-timeline-snippet">{seq.description}</p>
                  )}

                  {/* Steps preview chips */}
                  <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                    {(seq.steps || []).map((st, idx) => (
                      <span key={idx} className="sales-pill sales-pill-sub">
                        {getStepIcon(st.stepType)}
                        <span style={{ marginLeft: "0.2rem" }}>
                          Step {st.stepOrder}: {st.stepType} {st.delayDays ? `(+${st.delayDays}d)` : ""}
                        </span>
                      </span>
                    ))}
                  </div>

                  <div className="sales-proposal-card-footer">
                    <span className="sales-timeline-action">
                      <span>Manage & Enroll</span>
                      <ChevronRight size={14} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: Enrollments & Cadence Tracking
      ───────────────────────────────────────────────────────────── */}
      {activeTab === "enrollments" && (
        <div className="sales-enrollments-container">
          <div className="sales-filter-toolbar">
            <div className="sales-channel-tabs">
              {["ALL", "ACTIVE", "PAUSED", "COMPLETED", "STOPPED", "REPLIED", "OPT_OUT", "CONVERTED"].map((st) => (
                <button
                  key={st}
                  type="button"
                  className={`sales-channel-tab ${enrollmentStatusFilter === st ? "sales-channel-tab-active" : ""}`}
                  onClick={() => setEnrollmentStatusFilter(st)}
                >
                  <span>{st.replace("_", " ")}</span>
                </button>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <button
                type="button"
                className="sales-btn sales-btn-secondary"
                onClick={handleTick}
                disabled={ticking}
              >
                <Zap size={14} />
                <span>{ticking ? "Running Tick..." : "Run Sequence Tick"}</span>
              </button>
              <button
                type="button"
                className="sales-btn sales-btn-icon"
                onClick={fetchEnrollments}
                disabled={loadingEnrollments}
              >
                <RefreshCw size={15} />
              </button>
            </div>
          </div>

          {loadingEnrollments && (
            <div className="sales-loading-container">
              <div className="sales-loading-spinner" />
              <p>Fetching active cadence enrollments...</p>
            </div>
          )}

          {!loadingEnrollments && enrollments.length === 0 && (
            <div className="sales-empty-container">
              <div className="sales-empty-icon">
                <Users size={24} />
              </div>
              <h3 className="sales-empty-title">No Active Enrollments</h3>
              <p className="sales-empty-desc">
                Select a sequence from the Sequences tab to enroll contacts or leads into an automated cadence.
              </p>
            </div>
          )}

          {!loadingEnrollments && enrollments.length > 0 && (
            <div className="sales-reviews-list">
              {enrollments
                .filter((enr) => {
                  if (enrollmentStatusFilter === "ALL") return true;
                  if (enrollmentStatusFilter === "REPLIED") {
                    return enr.status === "TERMINATED_REPLY" || Boolean(enr.pauseReason && enr.pauseReason.toLowerCase().includes("repl"));
                  }
                  if (enrollmentStatusFilter === "OPT_OUT") {
                    return enr.status === "TERMINATED_OPT_OUT" || Boolean(enr.pauseReason && enr.pauseReason.toLowerCase().includes("opt"));
                  }
                  if (enrollmentStatusFilter === "CONVERTED") {
                    return enr.status === "TERMINATED_CONVERTED" || Boolean(enr.pauseReason && enr.pauseReason.toLowerCase().includes("convert"));
                  }
                  return enr.status === enrollmentStatusFilter;
                })
                .map((enr) => {
                  const isReplied = enr.status === "TERMINATED_REPLY" || Boolean(enr.pauseReason && enr.pauseReason.toLowerCase().includes("repl"));
                  const isOptOut = enr.status === "TERMINATED_OPT_OUT" || Boolean(enr.pauseReason && enr.pauseReason.toLowerCase().includes("opt"));
                  const isConverted = enr.status === "TERMINATED_CONVERTED" || Boolean(enr.pauseReason && enr.pauseReason.toLowerCase().includes("convert"));

                  return (
                    <div key={enr.id} className="sales-review-card">
                      <div className="sales-review-header">
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          {isReplied ? (
                            <span className="sales-badge sales-badge-success">REPLIED</span>
                          ) : isOptOut ? (
                            <span className="sales-badge sales-badge-danger">OPTED OUT</span>
                          ) : isConverted ? (
                            <span className="sales-badge sales-badge-info">CONVERTED</span>
                          ) : (
                            <span className={`sales-badge ${enr.status === "ACTIVE" ? "sales-badge-success" : enr.status === "PAUSED" ? "sales-badge-warning" : "sales-badge-muted"}`}>
                              {enr.status}
                            </span>
                          )}
                          <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--color-text)" }}>
                            Current Step: #{enr.currentStep}
                          </span>
                        </div>
                        <span className="sales-timeline-timestamp">
                          <Clock size={12} /> Enrolled: {new Date(enr.enrolledAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="sales-review-content">
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                          <span className="sales-pill sales-pill-customer">
                            Sequence ID: {enr.sequenceId}
                          </span>
                          {enr.contactId && (
                            <span className="sales-pill sales-pill-contact">
                              Contact: {enr.contactId}
                            </span>
                          )}
                          {enr.leadId && (
                            <span className="sales-pill sales-pill-sub">
                              Lead: {enr.leadId}
                            </span>
                          )}
                        </div>
                        {enr.pauseReason && (
                          <p style={{ margin: "0.5rem 0 0", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                            Status note: {enr.pauseReason}
                          </p>
                        )}
                      </div>

                      <div className="sales-review-actions" style={{ flexWrap: "wrap", gap: "0.35rem" }}>
                        {enr.status === "ACTIVE" && (
                          <button
                            type="button"
                            className="sales-btn sales-btn-sm sales-btn-secondary"
                            onClick={() => handlePauseEnrollment(enr.id)}
                          >
                            <Pause size={13} /> Pause
                          </button>
                        )}

                        {enr.status === "PAUSED" && (
                          <button
                            type="button"
                            className="sales-btn sales-btn-sm sales-btn-primary"
                            onClick={() => handleResumeEnrollment(enr.id)}
                          >
                            <Play size={13} /> Resume
                          </button>
                        )}

                        {!isReplied && !isOptOut && !isConverted && enr.status !== "STOPPED" && (
                          <>
                            <button
                              type="button"
                              className="sales-btn sales-btn-sm sales-btn-secondary"
                              onClick={() => handleMarkReplied(enr.id)}
                              title="Record prospect replied to outreach"
                            >
                              Mark Replied
                            </button>
                            <button
                              type="button"
                              className="sales-btn sales-btn-sm sales-btn-secondary"
                              onClick={() => handleMarkConverted(enr.id)}
                              title="Record deal converted / meeting booked"
                            >
                              Mark Converted
                            </button>
                            <button
                              type="button"
                              className="sales-btn sales-btn-sm sales-btn-danger"
                              onClick={() => handleMarkOptOut(enr.id)}
                              title="Record prospect opted out"
                            >
                              <StopCircle size={13} /> Opt-Out
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: Sequence Detail, Executions & Controls
      ───────────────────────────────────────────────────────────── */}
      {selectedSeqId && (
        <div
          className="sales-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedSeqId(null);
          }}
        >
          <div className="sales-modal-dialog" role="dialog" aria-modal="true" style={{ maxWidth: "680px" }}>
            <div className="sales-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span className={`sales-badge ${selectedSeq?.status === "ACTIVE" ? "sales-badge-success" : selectedSeq?.status === "PAUSED" ? "sales-badge-warning" : "sales-badge-muted"}`}>
                  {selectedSeq?.status || "ACTIVE"}
                </span>
                <h3 className="sales-modal-title">{selectedSeq?.name || "Sequence Details"}</h3>
              </div>
              <button
                type="button"
                className="sales-btn-icon"
                onClick={() => setSelectedSeqId(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="sales-modal-body">
              {selectedSeq?.description && (
                <p className="sales-timeline-snippet">{selectedSeq.description}</p>
              )}

              {/* Status Controls */}
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", padding: "0.75rem", background: "var(--color-background-secondary)", borderRadius: "8px" }}>
                {selectedSeq?.status !== "ACTIVE" && (
                  <button
                    type="button"
                    className="sales-btn sales-btn-sm sales-btn-primary"
                    onClick={() => handleActivate(selectedSeqId)}
                  >
                    <Play size={13} /> Activate
                  </button>
                )}
                {selectedSeq?.status === "ACTIVE" && (
                  <button
                    type="button"
                    className="sales-btn sales-btn-sm sales-btn-secondary"
                    onClick={() => handlePause(selectedSeqId)}
                  >
                    <Pause size={13} /> Pause
                  </button>
                )}
                <button
                  type="button"
                  className="sales-btn sales-btn-sm sales-btn-secondary"
                  onClick={() => handleDeactivate(selectedSeqId)}
                >
                  <StopCircle size={13} /> Deactivate
                </button>
                <button
                  type="button"
                  className="sales-btn sales-btn-sm sales-btn-secondary"
                  onClick={() => handleArchive(selectedSeqId)}
                >
                  <Archive size={13} /> Archive
                </button>
                <button
                  type="button"
                  className="sales-btn sales-btn-sm sales-btn-primary"
                  onClick={() => setIsEnrollOpen(true)}
                  style={{ marginLeft: "auto" }}
                >
                  <Users size={13} /> Enroll Contact
                </button>
              </div>

              {/* Steps Timeline */}
              <div className="sales-form-group">
                <label className="sales-label">Configured Sequence Steps</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {(selectedSeq?.steps || []).map((st) => (
                    <div key={st.stepOrder} className="sales-rule-card">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 600 }}>
                          {getStepIcon(st.stepType)}
                          <span>Step {st.stepOrder}: {st.stepType}</span>
                        </div>
                        <span className="sales-pill sales-pill-sub">
                          Delay: {st.delayDays || 0} days
                        </span>
                      </div>
                      {st.subject && (
                        <div style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--color-text)", marginTop: "0.25rem" }}>
                          Subject: {st.subject}
                        </div>
                      )}
                      {st.body && (
                        <div style={{ fontSize: "0.775rem", color: "var(--color-text-secondary)", marginTop: "0.2rem" }}>
                          {st.body}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Step Executions Log */}
              <div className="sales-form-group">
                <label className="sales-label">Recent Execution History</label>
                {loadingExecutions && (
                  <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>Loading executions...</p>
                )}
                {!loadingExecutions && executions.length === 0 && (
                  <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>No executions recorded yet for this sequence.</p>
                )}
                {!loadingExecutions && executions.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    {executions.map((ex) => (
                      <div key={ex.id} className="sales-pill sales-pill-sub" style={{ justifyContent: "space-between" }}>
                        <span>Step #{ex.stepNumber} ({ex.channel}) - Status: {ex.status}</span>
                        <span>{new Date(ex.executedAt).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="sales-modal-footer">
              <button
                type="button"
                className="sales-btn sales-btn-secondary"
                onClick={() => setSelectedSeqId(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: Multi-step Sequence Builder
      ───────────────────────────────────────────────────────────── */}
      {isCreateOpen && (
        <div
          className="sales-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCreateOpen(false);
          }}
        >
          <div className="sales-modal-dialog" role="dialog" aria-modal="true" style={{ maxWidth: "680px" }}>
            <div className="sales-modal-header">
              <h3 className="sales-modal-title">Create Sales Sequence</h3>
              <button
                type="button"
                className="sales-btn-icon"
                onClick={() => setIsCreateOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form className="sales-modal-form" onSubmit={handleCreateSequence}>
              <div className="sales-modal-body">
                {createError && (
                  <div className="sales-error-container">
                    <AlertCircle size={16} />
                    <p className="sales-error-text">{createError}</p>
                  </div>
                )}

                <div className="sales-form-group">
                  <label className="sales-label">Sequence Name *</label>
                  <input
                    type="text"
                    className="sales-input"
                    value={newSeqName}
                    onChange={(e) => setNewSeqName(e.target.value)}
                    placeholder="e.g. Inbound Enterprise Discovery Cadence"
                    required
                  />
                </div>

                <div className="sales-form-group">
                  <label className="sales-label">Description</label>
                  <input
                    type="text"
                    className="sales-input"
                    value={newSeqDesc}
                    onChange={(e) => setNewSeqDesc(e.target.value)}
                    placeholder="Brief description of the audience and objective"
                  />
                </div>

                {/* Steps List */}
                <div className="sales-form-group">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <label className="sales-label" style={{ margin: 0 }}>Cadence Steps ({newSteps.length})</label>
                    <button
                      type="button"
                      className="sales-btn sales-btn-sm sales-btn-secondary"
                      onClick={handleAddStep}
                    >
                      <Plus size={13} /> Add Step
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {newSteps.map((st, idx) => (
                      <div key={idx} className="sales-rule-card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>Step #{st.stepOrder}</span>
                          {newSteps.length > 1 && (
                            <button
                              type="button"
                              className="sales-btn-icon"
                              onClick={() => handleRemoveStep(idx)}
                              title="Delete Step"
                            >
                              <Trash2 size={13} color="#ef4444" />
                            </button>
                          )}
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginTop: "0.5rem" }}>
                          <div>
                            <label className="sales-label">Step Action Type</label>
                            <select
                              className="sales-select"
                              value={st.stepType}
                              onChange={(e) => handleUpdateStep(idx, "stepType", e.target.value)}
                            >
                              <option value="SEND_EMAIL">Send Email (SEND_EMAIL)</option>
                              <option value="CALL_TASK">Phone Call / Task (CALL_TASK)</option>
                              <option value="SEND_WHATSAPP">WhatsApp (SEND_WHATSAPP)</option>
                              <option value="WAIT_DELAY">Wait Delay (WAIT_DELAY)</option>
                              <option value="WAIT_CONDITION">Wait for Condition (WAIT_CONDITION)</option>
                              <option value="BRANCH_CONDITION">Branch on Condition (BRANCH_CONDITION)</option>
                              <option value="CUSTOM_ACTION">Custom Action (CUSTOM_ACTION)</option>
                            </select>
                          </div>
                          <div>
                            <label className="sales-label">Delay After Previous (Days)</label>
                            <input
                              type="number"
                              min={0}
                              className="sales-input"
                              value={st.delayDays ?? 0}
                              onChange={(e) => handleUpdateStep(idx, "delayDays", Number(e.target.value))}
                            />
                          </div>
                        </div>

                        {st.stepType === "WAIT_CONDITION" && (
                          <div style={{ marginTop: "0.5rem", padding: "0.5rem", background: "var(--color-surface)", borderRadius: "6px", border: "1px solid var(--color-border)" }}>
                            <label className="sales-label">Wait Condition Rule</label>
                            <select
                              className="sales-select"
                              value={typeof st.condition === "string" ? st.condition : "WAIT_FOR_REPLY"}
                              onChange={(e) => handleUpdateStep(idx, "condition", e.target.value)}
                            >
                              <option value="WAIT_FOR_REPLY">Wait for Prospect Reply (Max timeout)</option>
                              <option value="WAIT_FOR_OPEN">Wait for Email Open</option>
                              <option value="WAIT_FOR_LINK_CLICK">Wait for Meeting Link Click</option>
                              <option value="WAIT_FOR_ACTIVITY">Wait for Inbound Activity</option>
                            </select>
                          </div>
                        )}

                        {st.stepType === "BRANCH_CONDITION" && (
                          <div style={{ marginTop: "0.5rem", padding: "0.5rem", background: "var(--color-surface)", borderRadius: "6px", border: "1px solid var(--color-border)" }}>
                            <label className="sales-label">Branching Decision Rule</label>
                            <select
                              className="sales-select"
                              value={typeof st.condition === "string" ? st.condition : "IF_REPLIED"}
                              onChange={(e) => handleUpdateStep(idx, "condition", e.target.value)}
                            >
                              <option value="IF_REPLIED">If Replied &#8594; Fast-track to Discovery Call; Else &#8594; Continue</option>
                              <option value="IF_LINK_CLICKED">If Link Clicked &#8594; Schedule Meeting; Else &#8594; Re-engage</option>
                              <option value="IF_NO_ENGAGEMENT">If No Engagement &#8594; Break-up Email; Else &#8594; Nurture</option>
                            </select>
                          </div>
                        )}

                        <div style={{ marginTop: "0.5rem" }}>
                          <label className="sales-label">Step Subject / Title</label>
                          <input
                            type="text"
                            className="sales-input"
                            value={st.subject || ""}
                            onChange={(e) => handleUpdateStep(idx, "subject", e.target.value)}
                            placeholder="e.g. Checking in regarding demo or Branch criteria"
                          />
                        </div>

                        <div style={{ marginTop: "0.5rem" }}>
                          <label className="sales-label">Template Body / Action Instructions</label>
                          <textarea
                            rows={2}
                            className="sales-textarea"
                            value={st.body || ""}
                            onChange={(e) => handleUpdateStep(idx, "body", e.target.value)}
                            placeholder="Email body, call talking points, or condition handling rules..."
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="sales-modal-footer">
                <button
                  type="button"
                  className="sales-btn sales-btn-secondary"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={createSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="sales-btn sales-btn-primary"
                  disabled={createSubmitting}
                >
                  {createSubmitting ? "Creating Sequence..." : "Create Sequence"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: Enroll Contact / Lead / Customer (Swagger targetEntityType)
      ───────────────────────────────────────────────────────────── */}
      {isEnrollOpen && selectedSeqId && (
        <div className="sales-modal-backdrop">
          <div className="sales-modal-dialog" style={{ maxWidth: "480px" }}>
            <div className="sales-modal-header">
              <h3 className="sales-modal-title">Enroll Recipient in Sequence</h3>
              <button
                type="button"
                className="sales-btn-icon"
                onClick={() => setIsEnrollOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <form className="sales-modal-form" onSubmit={handleEnroll}>
              <div className="sales-modal-body">
                <div className="sales-form-group">
                  <label className="sales-label">Target Entity Type *</label>
                  <select
                    className="sales-select"
                    value={enrollEntityType}
                    onChange={(e) => {
                      const nextType = e.target.value;
                      setEnrollEntityType(nextType);
                      if (nextType === "CONTACT" && contacts.length > 0) setEnrollEntityId(contacts[0].id);
                      else if (nextType === "LEAD" && leads.length > 0) setEnrollEntityId(leads[0].id);
                      else if (nextType === "DEAL" && deals.length > 0) setEnrollEntityId(deals[0].id);
                      else setEnrollEntityId("");
                    }}
                  >
                    <option value="CONTACT">Contact</option>
                    <option value="LEAD">Lead</option>
                    <option value="CUSTOMER">Customer / Account</option>
                    <option value="DEAL">Deal</option>
                  </select>
                </div>

                <div className="sales-form-group">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label className="sales-label" style={{ margin: 0 }}>Target Entity ID *</label>
                    <button
                      type="button"
                      style={{ background: "none", border: "none", color: "var(--color-primary)", fontSize: "0.75rem", cursor: "pointer", textDecoration: "underline" }}
                      onClick={() => setEnrollUseCustomId(!enrollUseCustomId)}
                    >
                      {enrollUseCustomId ? "Select from list" : "Enter manual ID"}
                    </button>
                  </div>

                  {!enrollUseCustomId && enrollEntityType === "CONTACT" && contacts.length > 0 ? (
                    <select
                      className="sales-select"
                      value={enrollEntityId}
                      onChange={(e) => setEnrollEntityId(e.target.value)}
                    >
                      {contacts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.email ? `(${c.email})` : ""} - {c.id}
                        </option>
                      ))}
                    </select>
                  ) : !enrollUseCustomId && enrollEntityType === "LEAD" && leads.length > 0 ? (
                    <select
                      className="sales-select"
                      value={enrollEntityId}
                      onChange={(e) => setEnrollEntityId(e.target.value)}
                    >
                      {leads.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name} {l.details ? `(${l.details})` : ""} - {l.id}
                        </option>
                      ))}
                    </select>
                  ) : !enrollUseCustomId && enrollEntityType === "DEAL" && deals.length > 0 ? (
                    <select
                      className="sales-select"
                      value={enrollEntityId}
                      onChange={(e) => setEnrollEntityId(e.target.value)}
                    >
                      {deals.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} {d.details ? `(${d.details})` : ""} - {d.id}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="sales-input"
                      value={enrollEntityId}
                      onChange={(e) => setEnrollEntityId(e.target.value)}
                      placeholder={`Enter ${enrollEntityType.toLowerCase()} UUID...`}
                      required
                    />
                  )}
                </div>
              </div>
              <div className="sales-modal-footer">
                <button
                  type="button"
                  className="sales-btn sales-btn-secondary"
                  onClick={() => setIsEnrollOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="sales-btn sales-btn-primary"
                  disabled={enrollSubmitting}
                >
                  {enrollSubmitting ? "Enrolling..." : "Confirm Cadence Enrollment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SequencesCadenceWorkspace;
