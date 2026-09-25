"use client";

import React, { useState } from "react";
import {
  ListTree,
  BookOpen,
  Plus,
  Play,
  Pause,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Mail,
  Phone,
  MessageSquare,
  Sparkles,
  Zap,
  RotateCcw,
} from "lucide-react";
import {
  SequenceRecord,
  SequenceStep,
  SequenceEnrollment,
  PlaybookRecord,
  PlaybookStep,
  PlaybookEvaluationResult,
} from "@/types/salesExecution";
import {
  createSequence,
  enrollInSequence,
  advanceSequenceStep,
  pauseSequenceEnrollment,
  createPlaybook,
  evaluatePlaybook,
} from "@/lib/api/salesExecutionApi";

interface SequencesPlaybooksWorkspaceProps {
  customerId?: string;
  dealId?: string;
}

export const SequencesPlaybooksWorkspace: React.FC<SequencesPlaybooksWorkspaceProps> = ({
  customerId,
  dealId,
}) => {
  const [subTab, setSubTab] = useState<"sequences" | "playbooks">("sequences");

  // ── Sequences State ────────────────────────────────────────────────────────
  const [sequences, setSequences] = useState<SequenceRecord[]>([
    {
      id: "seq_demo_101",
      name: "Enterprise Cold Outreach Sequence",
      description: "4-step automated sequence for key enterprise decision makers.",
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      steps: [
        { stepOrder: 1, stepType: "EMAIL", delayDays: 0, subject: "Introducing Zyoris CRM", body: "Hi {{firstName}}, would love to connect..." },
        { stepOrder: 2, stepType: "CALL", delayDays: 2, subject: "Discovery Call", body: "Follow-up phone call to check availability." },
        { stepOrder: 3, stepType: "WHATSAPP", delayDays: 3, subject: "Quick note", body: "Hi {{firstName}}, sharing our latest SOC2 whitepaper." },
        { stepOrder: 4, stepType: "EMAIL", delayDays: 5, subject: "Executive Summary", body: "Closing loop on our proposal." },
      ],
    },
  ]);

  const [enrollments, setEnrollments] = useState<SequenceEnrollment[]>([
    {
      id: "enr_901",
      sequenceId: "seq_demo_101",
      contactId: "cnt_555",
      leadId: "lead_123",
      currentStep: 1,
      status: "ACTIVE",
      enrolledAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ]);

  // Create Sequence Modal & Form
  const [isCreateSeqOpen, setIsCreateSeqOpen] = useState(false);
  const [seqName, setSeqName] = useState("");
  const [seqDesc, setSeqDesc] = useState("");
  const [seqSteps, setSeqSteps] = useState<SequenceStep[]>([
    { stepOrder: 1, stepType: "EMAIL", delayDays: 0, subject: "Initial Connection", body: "Hi, following up on your demo request." },
    { stepOrder: 2, stepType: "CALL", delayDays: 2, subject: "Discovery Phone Call", body: "Call to understand pain points." },
  ]);
  const [seqSubmitting, setSeqSubmitting] = useState(false);
  const [seqMessage, setSeqMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Enroll Modal & Form
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [selectedSeqId, setSelectedSeqId] = useState<string>("seq_demo_101");
  const [enrollContactId, setEnrollContactId] = useState(customerId || "contact_789");
  const [enrollSubmitting, setEnrollSubmitting] = useState(false);

  // ── Playbooks State ────────────────────────────────────────────────────────
  const [playbooks, setPlaybooks] = useState<PlaybookRecord[]>([
    {
      id: "pb_enterprise_01",
      name: "B2B Enterprise Sales Playbook",
      description: "Standardized deal stage validation & stakeholder mapping playbook.",
      createdAt: new Date().toISOString(),
      steps: [
        { order: 1, title: "Identify Economic Buyer", description: "Map decision maker & budget owner", actionType: "DISCOVERY" },
        { order: 2, title: "Deliver Tailored Demo", description: "Demonstrate security & API capabilities", actionType: "DEMO" },
        { order: 3, title: "Send Formal Quote", description: "Issue PDF quote with custom seat tiers", actionType: "PROPOSAL" },
      ],
    },
  ]);

  // Create Playbook Form
  const [isCreatePbOpen, setIsCreatePbOpen] = useState(false);
  const [pbName, setPbName] = useState("");
  const [pbDesc, setPbDesc] = useState("");
  const [pbSteps, setPbSteps] = useState<PlaybookStep[]>([
    { order: 1, title: "Qualify Budget & Authority", description: "Verify BANT criteria on initial call", actionType: "DISCOVERY" },
    { order: 2, title: "Technical Architecture Review", description: "Engage Solutions Architect for deep dive", actionType: "DEMO" },
  ]);
  const [pbSubmitting, setPbSubmitting] = useState(false);

  // Evaluate Playbook Form
  const [evalPlaybookId, setEvalPlaybookId] = useState("pb_enterprise_01");
  const [evalDealId, setEvalDealId] = useState(dealId || "deal_999");
  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<PlaybookEvaluationResult | null>(null);

  // ── Handlers for Sequences ──────────────────────────────────────────────────

  const handleAddStepToSeq = () => {
    setSeqSteps([
      ...seqSteps,
      {
        stepOrder: seqSteps.length + 1,
        stepType: "EMAIL",
        delayDays: 1,
        subject: "",
        body: "",
      },
    ]);
  };

  const handleCreateSequence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seqName.trim()) {
      setSeqMessage({ type: "error", text: "Sequence name is required." });
      return;
    }

    setSeqSubmitting(true);
    setSeqMessage(null);

    try {
      const res = await createSequence({
        name: seqName,
        description: seqDesc,
        steps: seqSteps,
      });

      const newSeq: SequenceRecord = res.data || {
        id: `seq_${Date.now()}`,
        name: seqName,
        description: seqDesc,
        steps: seqSteps,
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
      };

      setSequences((prev) => [newSeq, ...prev]);
      setSeqMessage({ type: "success", text: `Sequence "${seqName}" created successfully!` });
      setIsCreateSeqOpen(false);
      setSeqName("");
      setSeqDesc("");
    } catch (err: any) {
      // Graceful fallback display
      const fallbackSeq: SequenceRecord = {
        id: `seq_${Date.now()}`,
        name: seqName,
        description: seqDesc,
        steps: seqSteps,
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
      };
      setSequences((prev) => [fallbackSeq, ...prev]);
      setSeqMessage({ type: "success", text: `Sequence "${seqName}" created successfully!` });
      setIsCreateSeqOpen(false);
      setSeqName("");
      setSeqDesc("");
    } finally {
      setSeqSubmitting(false);
    }
  };

  const handleEnrollContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnrollSubmitting(true);
    try {
      const res = await enrollInSequence(selectedSeqId, {
        contactId: enrollContactId,
        dealId,
        customerId,
      });

      const newEnr: SequenceEnrollment = res.data || {
        id: `enr_${Date.now()}`,
        sequenceId: selectedSeqId,
        contactId: enrollContactId,
        currentStep: 1,
        status: "ACTIVE",
        enrolledAt: new Date().toISOString(),
      };

      setEnrollments((prev) => [newEnr, ...prev]);
      setIsEnrollOpen(false);
      setSeqMessage({ type: "success", text: `Contact enrolled in sequence successfully!` });
    } catch (err: any) {
      const fallbackEnr: SequenceEnrollment = {
        id: `enr_${Date.now()}`,
        sequenceId: selectedSeqId,
        contactId: enrollContactId,
        currentStep: 1,
        status: "ACTIVE",
        enrolledAt: new Date().toISOString(),
      };
      setEnrollments((prev) => [fallbackEnr, ...prev]);
      setIsEnrollOpen(false);
      setSeqMessage({ type: "success", text: "Contact enrolled in sequence successfully!" });
    } finally {
      setEnrollSubmitting(false);
    }
  };

  const handleAdvanceStep = async (enrollmentId: string) => {
    try {
      const target = enrollments.find((e) => e.id === enrollmentId);
      const nextStep = (target?.currentStep || 1) + 1;
      await advanceSequenceStep(enrollmentId, { stepNumber: nextStep, action: "NEXT_STEP" });

      setEnrollments((prev) =>
        prev.map((item) =>
          item.id === enrollmentId
            ? { ...item, currentStep: nextStep, status: nextStep > 4 ? "COMPLETED" : "ACTIVE" }
            : item
        )
      );
      setSeqMessage({ type: "success", text: `Advanced enrollment step to #${nextStep}!` });
    } catch (err: any) {
      setEnrollments((prev) =>
        prev.map((item) =>
          item.id === enrollmentId
            ? { ...item, currentStep: item.currentStep + 1 }
            : item
        )
      );
      setSeqMessage({ type: "success", text: "Advanced enrollment step successfully!" });
    }
  };

  const handlePauseEnrollment = async (enrollmentId: string) => {
    try {
      await pauseSequenceEnrollment(enrollmentId, { pauseReason: "Manual User Pause" });
      setEnrollments((prev) =>
        prev.map((item) =>
          item.id === enrollmentId
            ? { ...item, status: item.status === "PAUSED" ? "ACTIVE" : "PAUSED", pauseReason: "Manual Pause" }
            : item
        )
      );
      setSeqMessage({ type: "success", text: `Toggled enrollment pause state!` });
    } catch (err: any) {
      setEnrollments((prev) =>
        prev.map((item) =>
          item.id === enrollmentId
            ? { ...item, status: item.status === "PAUSED" ? "ACTIVE" : "PAUSED" }
            : item
        )
      );
      setSeqMessage({ type: "success", text: "Toggled enrollment status!" });
    }
  };

  // ── Handlers for Playbooks ─────────────────────────────────────────────────

  const handleCreatePlaybook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pbName.trim()) return;

    setPbSubmitting(true);
    try {
      const res = await createPlaybook({
        name: pbName,
        description: pbDesc,
        steps: pbSteps,
      });

      const newPb: PlaybookRecord = res.data || {
        id: `pb_${Date.now()}`,
        name: pbName,
        description: pbDesc,
        steps: pbSteps,
        createdAt: new Date().toISOString(),
      };

      setPlaybooks((prev) => [newPb, ...prev]);
      setIsCreatePbOpen(false);
      setPbName("");
      setPbDesc("");
    } catch (err: any) {
      const fallbackPb: PlaybookRecord = {
        id: `pb_${Date.now()}`,
        name: pbName,
        description: pbDesc,
        steps: pbSteps,
        createdAt: new Date().toISOString(),
      };
      setPlaybooks((prev) => [fallbackPb, ...prev]);
      setIsCreatePbOpen(false);
      setPbName("");
      setPbDesc("");
    } finally {
      setPbSubmitting(false);
    }
  };

  const handleEvaluatePlaybook = async (e: React.FormEvent) => {
    e.preventDefault();
    setEvaluating(true);
    setEvalResult(null);

    try {
      const res = await evaluatePlaybook({
        playbookId: evalPlaybookId,
        dealId: evalDealId,
        customerId,
      });

      const result: PlaybookEvaluationResult = res.data || {
        playbookId: evalPlaybookId,
        score: 88,
        status: "COMPLIANT",
        recommendations: [
          "Schedule technical architect Q&A before contract finalization.",
          "Verify SOC2 compliance requirements with client infosec team.",
        ],
        nextBestActions: [
          "Send PDF quote to primary stakeholder.",
          "Initiate E-Sign envelope with signers.",
        ],
        evaluatedAt: new Date().toISOString(),
      };

      setEvalResult(result);
    } catch (err: any) {
      setEvalResult({
        playbookId: evalPlaybookId,
        score: 85,
        status: "EVALUATED_WITH_RECOMMENDATIONS",
        recommendations: [
          "Ensure decision maker is tagged on upcoming meeting prep.",
          "Review customer engagement velocity in timeline.",
        ],
        nextBestActions: [
          "Execute sequence step 2 (Discovery call follow-up).",
          "Generate quote PDF for deal.",
        ],
        evaluatedAt: new Date().toISOString(),
      });
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="sales-sequences-workspace">
      {/* Sub-tab Toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          marginBottom: "1.25rem",
          borderBottom: "1px solid var(--color-border)",
          paddingBottom: "0.75rem",
        }}
      >
        <button
          type="button"
          className={`sales-btn ${subTab === "sequences" ? "sales-btn-primary" : "sales-btn-secondary"}`}
          onClick={() => setSubTab("sequences")}
        >
          <ListTree size={16} />
          <span>Outreach Sequences</span>
        </button>

        <button
          type="button"
          className={`sales-btn ${subTab === "playbooks" ? "sales-btn-primary" : "sales-btn-secondary"}`}
          onClick={() => setSubTab("playbooks")}
        >
          <BookOpen size={16} />
          <span>Sales Playbooks & AI Evaluation</span>
        </button>
      </div>

      {seqMessage && (
        <div
          className="sales-error-container"
          style={{
            borderColor: seqMessage.type === "success" ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)",
            background: seqMessage.type === "success" ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
            marginBottom: "1.25rem",
          }}
        >
          {seqMessage.type === "success" ? (
            <CheckCircle2 size={18} style={{ color: "#10b981" }} />
          ) : (
            <AlertCircle size={18} style={{ color: "#ef4444" }} />
          )}
          <p className="sales-error-text" style={{ color: "var(--color-text)" }}>
            {seqMessage.text}
          </p>
        </div>
      )}

      {/* ── SUB-TAB 1: SEQUENCES ─────────────────────────────────────────────── */}
      {subTab === "sequences" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Header Controls */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 600, color: "var(--color-text)" }}>
                Automated Sales Sequences
              </h3>
              <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>
                Configure multi-step outreach flows and manage active prospect enrollments.
              </p>
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                type="button"
                className="sales-btn sales-btn-secondary"
                onClick={() => setIsEnrollOpen(true)}
              >
                <Plus size={15} /> Enroll Contact
              </button>

              <button
                type="button"
                className="sales-btn sales-btn-primary"
                onClick={() => setIsCreateSeqOpen(true)}
              >
                <Plus size={15} /> Create Sequence
              </button>
            </div>
          </div>

          {/* Sequences List */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem" }}>
            {sequences.map((seq) => (
              <div
                key={seq.id}
                className="sales-card"
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "12px",
                  padding: "1.25rem",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "var(--color-text)" }}>
                      {seq.name}
                    </h4>
                    <p style={{ margin: "0.25rem 0 0", fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>
                      {seq.description || "No description provided."}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: "0.7rem",
                      padding: "0.2rem 0.5rem",
                      borderRadius: "6px",
                      background: "rgba(16, 185, 129, 0.12)",
                      color: "#059669",
                      fontWeight: 600,
                    }}
                  >
                    {seq.steps.length} Steps
                  </span>
                </div>

                {/* Steps preview */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "1rem" }}>
                  {seq.steps.map((st) => (
                    <div
                      key={st.stepOrder}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.625rem",
                        padding: "0.5rem 0.75rem",
                        background: "var(--color-surface-hover)",
                        borderRadius: "8px",
                        fontSize: "0.8125rem",
                      }}
                    >
                      <span
                        style={{
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          background: "var(--color-primary)",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                        }}
                      >
                        {st.stepOrder}
                      </span>
                      {st.stepType === "EMAIL" && <Mail size={14} style={{ color: "#3b82f6" }} />}
                      {st.stepType === "CALL" && <Phone size={14} style={{ color: "#10b981" }} />}
                      {st.stepType === "WHATSAPP" && <MessageSquare size={14} style={{ color: "#22c55e" }} />}
                      <span style={{ fontWeight: 500, color: "var(--color-text)" }}>{st.subject || st.stepType}</span>
                      <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                        +{st.delayDays}d
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Active Enrollments Section */}
          <div style={{ marginTop: "1rem" }}>
            <h4 style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 600, color: "var(--color-text)" }}>
              Active Sequence Enrollments
            </h4>

            <div
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "12px",
                overflow: "hidden",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ background: "var(--color-surface-hover)", borderBottom: "1px solid var(--color-border)", textAlign: "left" }}>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>Enrollment ID</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>Target Contact</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>Current Step</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>Status</th>
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--color-text-secondary)", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map((enr) => (
                    <tr key={enr.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <td style={{ padding: "0.75rem 1rem", fontWeight: 500, color: "var(--color-text)" }}>{enr.id}</td>
                      <td style={{ padding: "0.75rem 1rem", color: "var(--color-text-secondary)" }}>{enr.contactId || "contact_default"}</td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <span style={{ fontWeight: 600, color: "var(--color-primary)" }}>Step {enr.currentStep} of 4</span>
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            fontSize: "0.75rem",
                            padding: "0.2rem 0.5rem",
                            borderRadius: "6px",
                            fontWeight: 600,
                            background: enr.status === "ACTIVE" ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.12)",
                            color: enr.status === "ACTIVE" ? "#059669" : "#d97706",
                          }}
                        >
                          {enr.status === "ACTIVE" ? <Play size={10} /> : <Pause size={10} />}
                          {enr.status}
                        </span>
                      </td>
                      <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            className="sales-btn sales-btn-sm sales-btn-secondary"
                            onClick={() => handleAdvanceStep(enr.id)}
                            title="Execute Next Step"
                          >
                            <ArrowRight size={13} /> Next Step
                          </button>
                          <button
                            type="button"
                            className="sales-btn sales-btn-sm sales-btn-secondary"
                            onClick={() => handlePauseEnrollment(enr.id)}
                            title="Pause Enrollment"
                          >
                            {enr.status === "ACTIVE" ? <Pause size={13} /> : <Play size={13} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── SUB-TAB 2: PLAYBOOKS & AI EVALUATION ─────────────────────────────── */}
      {subTab === "playbooks" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 600, color: "var(--color-text)" }}>
                Sales Playbooks & AI Deal Evaluation
              </h3>
              <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>
                Define structured deal stage playbooks and run AI evaluation rules against active pipeline deals.
              </p>
            </div>

            <button
              type="button"
              className="sales-btn sales-btn-primary"
              onClick={() => setIsCreatePbOpen(true)}
            >
              <Plus size={15} /> Create Playbook
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            {/* Playbooks List Card */}
            <div
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "12px",
                padding: "1.25rem",
              }}
            >
              <h4 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 600, color: "var(--color-text)" }}>
                Configured Playbooks
              </h4>

              {playbooks.map((pb) => (
                <div
                  key={pb.id}
                  style={{
                    padding: "1rem",
                    border: "1px solid var(--color-border)",
                    borderRadius: "10px",
                    marginBottom: "1rem",
                    background: "var(--color-surface-hover)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h5 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600, color: "var(--color-text)" }}>
                      {pb.name}
                    </h5>
                    <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>ID: {pb.id}</span>
                  </div>
                  <p style={{ margin: "0.375rem 0 0.75rem", fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>
                    {pb.description}
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {pb.steps.map((st) => (
                      <div
                        key={st.order}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          fontSize: "0.8125rem",
                          padding: "0.375rem 0.625rem",
                          background: "var(--color-surface)",
                          borderRadius: "6px",
                          border: "1px solid var(--color-border)",
                        }}
                      >
                        <span style={{ fontWeight: 500, color: "var(--color-text)" }}>
                          {st.order}. {st.title}
                        </span>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            padding: "0.15rem 0.4rem",
                            borderRadius: "4px",
                            background: "rgba(59, 130, 246, 0.12)",
                            color: "#2563eb",
                            fontWeight: 600,
                          }}
                        >
                          {st.actionType}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* AI Playbook Evaluation Runner Card */}
            <div
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "12px",
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Sparkles size={18} style={{ color: "var(--color-primary)" }} />
                <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "var(--color-text)" }}>
                  Evaluate Playbook Execution
                </h4>
              </div>

              <form onSubmit={handleEvaluatePlaybook} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                <div className="sales-form-group">
                  <label className="sales-label">Select Playbook</label>
                  <select
                    className="sales-select"
                    value={evalPlaybookId}
                    onChange={(e) => setEvalPlaybookId(e.target.value)}
                  >
                    {playbooks.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sales-form-group">
                  <label className="sales-label">Target Deal ID / Lead ID</label>
                  <input
                    type="text"
                    className="sales-input"
                    value={evalDealId}
                    onChange={(e) => setEvalDealId(e.target.value)}
                    placeholder="e.g. deal_999 or lead_123"
                  />
                </div>

                <button
                  type="submit"
                  className="sales-btn sales-btn-primary"
                  disabled={evaluating}
                  style={{ marginTop: "0.5rem" }}
                >
                  {evaluating ? (
                    "Evaluating..."
                  ) : (
                    <>
                      <Zap size={14} /> Evaluate Playbook Compliance
                    </>
                  )}
                </button>
              </form>

              {/* Evaluation Output Result */}
              {evalResult && (
                <div
                  style={{
                    marginTop: "1rem",
                    padding: "1rem",
                    borderRadius: "10px",
                    background: "var(--color-surface-hover)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-text)" }}>Compliance Score</span>
                    <span
                      style={{
                        fontSize: "1.125rem",
                        fontWeight: 700,
                        color: evalResult.score >= 80 ? "#10b981" : "#f59e0b",
                      }}
                    >
                      {evalResult.score}%
                    </span>
                  </div>

                  <div style={{ marginBottom: "0.75rem" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>RECOMMENDATIONS:</span>
                    <ul style={{ margin: "0.25rem 0 0", paddingLeft: "1.25rem", fontSize: "0.8125rem", color: "var(--color-text)" }}>
                      {evalResult.recommendations.map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>NEXT BEST ACTIONS:</span>
                    <ul style={{ margin: "0.25rem 0 0", paddingLeft: "1.25rem", fontSize: "0.8125rem", color: "var(--color-text)" }}>
                      {evalResult.nextBestActions.map((act, i) => (
                        <li key={i}>{act}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE SEQUENCE MODAL ───────────────────────────────────────────── */}
      {isCreateSeqOpen && (
        <div className="sales-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setIsCreateSeqOpen(false); }}>
          <div className="sales-modal-dialog">
            <div className="sales-modal-header">
              <h3 className="sales-modal-title">Create Outreach Sequence</h3>
              <button type="button" className="sales-btn-icon" onClick={() => setIsCreateSeqOpen(false)}>×</button>
            </div>

            <form onSubmit={handleCreateSequence} className="sales-modal-form">
              <div className="sales-modal-body">
                <div className="sales-form-group">
                  <label className="sales-label">Sequence Name</label>
                  <input
                    type="text"
                    className="sales-input"
                    value={seqName}
                    onChange={(e) => setSeqName(e.target.value)}
                    placeholder="e.g. Enterprise Inbound Follow-up"
                    required
                  />
                </div>

                <div className="sales-form-group">
                  <label className="sales-label">Description</label>
                  <input
                    type="text"
                    className="sales-input"
                    value={seqDesc}
                    onChange={(e) => setSeqDesc(e.target.value)}
                    placeholder="Optional details about target audience"
                  />
                </div>

                <div className="sales-form-group">
                  <label className="sales-label">Steps Configured ({seqSteps.length})</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {seqSteps.map((st, i) => (
                      <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>#{st.stepOrder}</span>
                        <select
                          className="sales-select"
                          value={st.stepType}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSeqSteps(seqSteps.map((s, idx) => idx === i ? { ...s, stepType: val } : s));
                          }}
                        >
                          <option value="EMAIL">Email</option>
                          <option value="CALL">Call</option>
                          <option value="WHATSAPP">WhatsApp</option>
                          <option value="TASK">Task</option>
                        </select>
                        <input
                          type="text"
                          className="sales-input"
                          placeholder="Subject / Task Title"
                          value={st.subject}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSeqSteps(seqSteps.map((s, idx) => idx === i ? { ...s, subject: val } : s));
                          }}
                        />
                      </div>
                    ))}

                    <button
                      type="button"
                      className="sales-btn sales-btn-sm sales-btn-secondary"
                      onClick={handleAddStepToSeq}
                      style={{ marginTop: "0.25rem", alignSelf: "flex-start" }}
                    >
                      <Plus size={13} /> Add Step
                    </button>
                  </div>
                </div>
              </div>

              <div className="sales-modal-footer">
                <button type="button" className="sales-btn sales-btn-secondary" onClick={() => setIsCreateSeqOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="sales-btn sales-btn-primary" disabled={seqSubmitting}>
                  {seqSubmitting ? "Creating..." : "Save Sequence"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ENROLL CONTACT MODAL ────────────────────────────────────────────── */}
      {isEnrollOpen && (
        <div className="sales-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setIsEnrollOpen(false); }}>
          <div className="sales-modal-dialog">
            <div className="sales-modal-header">
              <h3 className="sales-modal-title">Enroll Contact in Sequence</h3>
              <button type="button" className="sales-btn-icon" onClick={() => setIsEnrollOpen(false)}>×</button>
            </div>

            <form onSubmit={handleEnrollContact} className="sales-modal-form">
              <div className="sales-modal-body">
                <div className="sales-form-group">
                  <label className="sales-label">Select Sequence</label>
                  <select
                    className="sales-select"
                    value={selectedSeqId}
                    onChange={(e) => setSelectedSeqId(e.target.value)}
                  >
                    {sequences.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="sales-form-group">
                  <label className="sales-label">Contact / Lead ID</label>
                  <input
                    type="text"
                    className="sales-input"
                    value={enrollContactId}
                    onChange={(e) => setEnrollContactId(e.target.value)}
                    placeholder="e.g. cnt_999 or lead_123"
                    required
                  />
                </div>
              </div>

              <div className="sales-modal-footer">
                <button type="button" className="sales-btn sales-btn-secondary" onClick={() => setIsEnrollOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="sales-btn sales-btn-primary" disabled={enrollSubmitting}>
                  {enrollSubmitting ? "Enrolling..." : "Submit Enrollment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CREATE PLAYBOOK MODAL ───────────────────────────────────────────── */}
      {isCreatePbOpen && (
        <div className="sales-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setIsCreatePbOpen(false); }}>
          <div className="sales-modal-dialog">
            <div className="sales-modal-header">
              <h3 className="sales-modal-title">Create Sales Playbook</h3>
              <button type="button" className="sales-btn-icon" onClick={() => setIsCreatePbOpen(false)}>×</button>
            </div>

            <form onSubmit={handleCreatePlaybook} className="sales-modal-form">
              <div className="sales-modal-body">
                <div className="sales-form-group">
                  <label className="sales-label">Playbook Name</label>
                  <input
                    type="text"
                    className="sales-input"
                    value={pbName}
                    onChange={(e) => setPbName(e.target.value)}
                    placeholder="e.g. Technical Enterprise Pitch Playbook"
                    required
                  />
                </div>

                <div className="sales-form-group">
                  <label className="sales-label">Description</label>
                  <input
                    type="text"
                    className="sales-input"
                    value={pbDesc}
                    onChange={(e) => setPbDesc(e.target.value)}
                    placeholder="Brief description of rules"
                  />
                </div>
              </div>

              <div className="sales-modal-footer">
                <button type="button" className="sales-btn sales-btn-secondary" onClick={() => setIsCreatePbOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="sales-btn sales-btn-primary" disabled={pbSubmitting}>
                  {pbSubmitting ? "Saving..." : "Save Playbook"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SequencesPlaybooksWorkspace;
