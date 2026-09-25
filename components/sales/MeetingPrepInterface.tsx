"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  Clock,
  Building2,
  Users,
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  ListOrdered,
  HelpCircle,
  RefreshCw,
  AlertCircle,
  FileQuestion,
  Search,
  Sparkles,
} from "lucide-react";
import {
  MeetingPrepBrief,
  PrepRisk,
  PrepCommitment,
  PrepActionItem,
  PrepAgendaItem,
} from "@/types/salesExecution";
import { getMeetingPrep } from "@/lib/api/salesExecutionApi";
import EvidenceChip from "./EvidenceChip";

interface MeetingPrepInterfaceProps {
  initialMeetingId?: string;
}

export const MeetingPrepInterface: React.FC<MeetingPrepInterfaceProps> = ({
  initialMeetingId = "",
}) => {
  const [meetingId, setMeetingId] = useState(initialMeetingId);
  const [prep, setPrep] = useState<MeetingPrepBrief | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputMeetingId, setInputMeetingId] = useState(initialMeetingId);

  const fetchPrep = useCallback(async (id: string) => {
    if (!id.trim()) {
      setPrep(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getMeetingPrep(id.trim());
      if (res.success && res.data) {
        setPrep(res.data);
      } else {
        setError("Meeting preparation context not found.");
        setPrep(null);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to generate meeting preparation.";
      setError(msg);
      setPrep(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialMeetingId) {
      setMeetingId(initialMeetingId);
      setInputMeetingId(initialMeetingId);
      fetchPrep(initialMeetingId);
    }
  }, [initialMeetingId, fetchPrep]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMeetingId.trim()) {
      setMeetingId(inputMeetingId.trim());
      fetchPrep(inputMeetingId.trim());
    }
  };

  const getSeverityClass = (severity?: string) => {
    const s = (severity || "").toUpperCase();
    if (s === "CRITICAL") return "risk-severity-critical";
    if (s === "HIGH") return "risk-severity-high";
    if (s === "MEDIUM") return "risk-severity-medium";
    return "risk-severity-low";
  };

  return (
    <div className="meeting-prep-container">
      {/* Top Search & Meeting Selector Bar */}
      <div className="meeting-prep-topbar">
        <form onSubmit={handleSearchSubmit} className="meeting-prep-selector">
          <div className="sales-search-wrap" style={{ minWidth: "300px" }}>
            <Search size={15} className="sales-search-icon" />
            <input
              type="text"
              className="sales-input sales-search-input"
              placeholder="Enter Meeting ID (e.g. meet_test_01)..."
              value={inputMeetingId}
              onChange={(e) => setInputMeetingId(e.target.value)}
            />
          </div>
          <button type="submit" className="sales-btn sales-btn-primary">
            Load Prep Brief
          </button>
        </form>

        {meetingId && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>
              Active ID: <strong>{meetingId}</strong>
            </span>
            <button
              type="button"
              className="sales-btn sales-btn-icon"
              onClick={() => fetchPrep(meetingId)}
              disabled={loading}
              title="Refresh preparation"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="sales-error-container">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <AlertCircle size={18} />
            <p className="sales-error-text">{error}</p>
          </div>
          <button
            type="button"
            className="sales-btn sales-btn-sm sales-btn-secondary"
            onClick={() => fetchPrep(meetingId)}
          >
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="sales-loading-container">
          <div className="sales-loading-spinner" />
          <p>Compiling grounded meeting preparation brief...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && !prep && (
        <div className="sales-empty-container">
          <div className="sales-empty-icon">
            <FileQuestion size={24} />
          </div>
          <h3 className="sales-empty-title">No Meeting Preparation Loaded</h3>
          <p className="sales-empty-desc">
            Enter a valid Meeting ID above to generate a grounded sales intelligence brief before your call.
          </p>
        </div>
      )}

      {/* Populated AI Meeting Prep Interface */}
      {!loading && !error && prep && (
        <div className="meeting-prep-grid">
          {/* Header Banner: Meeting Context & Derived Scores */}
          <div className="meeting-prep-card meeting-prep-card-col-12">
            <div className="meeting-prep-card-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                <Sparkles size={20} color="var(--color-primary)" />
                <h2 className="sales-modal-title">
                  {prep.meetingContext.title || "Sales Strategy Discussion"}
                </h2>
                {prep.meetingContext.scheduledStartTime && (
                  <span className="sales-source-pill">
                    <Clock size={12} style={{ display: "inline", marginRight: "4px" }} />
                    {new Date(prep.meetingContext.scheduledStartTime).toLocaleString()}
                  </span>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                {prep.derivedContext?.dealHealth && (
                  <span className="sales-context-chip sales-context-chip-deal">
                    Health: {prep.derivedContext.dealHealth}
                  </span>
                )}
                {prep.derivedContext?.engagementVelocity && (
                  <span className="sales-context-chip sales-context-chip-customer">
                    Velocity: {prep.derivedContext.engagementVelocity}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section 1: Account & Customer Summary */}
          <div className="meeting-prep-card meeting-prep-card-col-4">
            <div className="meeting-prep-card-header">
              <h3 className="meeting-prep-card-title">
                <Building2 size={16} /> Account Summary
              </h3>
            </div>
            <div className="meeting-prep-account-box">
              {prep.meetingContext.account ? (
                <>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                    {prep.meetingContext.account.name || "Enterprise Account"}
                  </div>
                  {prep.meetingContext.account.domain && (
                    <div style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
                      Domain: {prep.meetingContext.account.domain}
                    </div>
                  )}
                  {prep.meetingContext.account.industry && (
                    <div style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
                      Industry: {prep.meetingContext.account.industry}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
                  Account details will populate as CRM facts sync.
                </div>
              )}

              {prep.meetingContext.customer && (
                <div
                  style={{
                    marginTop: "0.75rem",
                    paddingTop: "0.75rem",
                    borderTop: "1px solid var(--color-border)",
                  }}
                >
                  <label className="sales-label">Primary Customer Contact</label>
                  <div style={{ fontWeight: 600 }}>
                    {prep.meetingContext.customer.name || prep.meetingContext.customer.email}
                  </div>
                  {prep.meetingContext.customer.company && (
                    <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                      {prep.meetingContext.customer.company}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Open Deals & Commercial Stage */}
          <div className="meeting-prep-card meeting-prep-card-col-4">
            <div className="meeting-prep-card-header">
              <h3 className="meeting-prep-card-title">
                <Briefcase size={16} /> Open Deals
              </h3>
            </div>
            <div>
              {prep.meetingContext.deal ? (
                <div className="meeting-prep-deal-item">
                  <div className="meeting-prep-deal-header">
                    <span style={{ fontWeight: 700 }}>
                      {prep.meetingContext.deal.title || prep.meetingContext.deal.name || "Active Opportunity"}
                    </span>
                    {prep.meetingContext.deal.stage && (
                      <span className="sales-context-chip sales-context-chip-deal">
                        {prep.meetingContext.deal.stage}
                      </span>
                    )}
                  </div>
                  {typeof prep.meetingContext.deal.amount === "number" && (
                    <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--color-primary)" }}>
                      ${prep.meetingContext.deal.amount.toLocaleString()}
                    </div>
                  )}
                  {typeof prep.meetingContext.deal.probability === "number" && (
                    <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                      Win Probability: {prep.meetingContext.deal.probability}%
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
                  No active deal linked to this meeting context yet.
                </p>
              )}
            </div>
          </div>

          {/* Section 3: Stakeholders */}
          <div className="meeting-prep-card meeting-prep-card-col-4">
            <div className="meeting-prep-card-header">
              <h3 className="meeting-prep-card-title">
                <Users size={16} /> Stakeholders
              </h3>
            </div>
            <div className="meeting-prep-stakeholder-grid">
              {prep.meetingContext.stakeholders && prep.meetingContext.stakeholders.length > 0 ? (
                prep.meetingContext.stakeholders.map((s, idx) => (
                  <div key={idx} className="meeting-prep-stakeholder-card">
                    <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                      {s.name}
                    </div>
                    {s.title && (
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                        {s.title}
                      </div>
                    )}
                    {s.role && (
                      <span className="sales-source-pill" style={{ width: "fit-content" }}>
                        {s.role}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
                  No stakeholders identified yet.
                </p>
              )}
            </div>
          </div>

          {/* Section 4: Deal Risks with Evidence */}
          <div className="meeting-prep-card meeting-prep-card-col-6">
            <div className="meeting-prep-card-header">
              <h3 className="meeting-prep-card-title">
                <AlertTriangle size={16} /> Deal Risks & Warnings
              </h3>
            </div>
            <div>
              {prep.observedFacts.knownRisks && prep.observedFacts.knownRisks.length > 0 ? (
                prep.observedFacts.knownRisks.map((risk, idx) => (
                  <div
                    key={idx}
                    className={`meeting-prep-risk-item ${getSeverityClass(risk.severity)}`}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>
                        {risk.risk || risk.category || "Identified Risk"}
                      </span>
                      {risk.severity && (
                        <span className="sales-source-pill" style={{ textTransform: "uppercase" }}>
                          {risk.severity}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: "0.25rem 0", fontSize: "0.84rem" }}>
                      {risk.description || risk.risk}
                    </p>
                    {risk.evidence && (
                      <EvidenceChip evidence={risk.evidence} label="Evidence" />
                    )}
                  </div>
                ))
              ) : (
                <div style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
                  No critical risks flagged for this meeting context.
                </div>
              )}
            </div>
          </div>

          {/* Section 5: Previous Commitments & Pending Actions */}
          <div className="meeting-prep-card meeting-prep-card-col-6">
            <div className="meeting-prep-card-header">
              <h3 className="meeting-prep-card-title">
                <CheckCircle2 size={16} /> Previous Commitments & Actions
              </h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {prep.observedFacts.previousCommitments && prep.observedFacts.previousCommitments.length > 0 ? (
                prep.observedFacts.previousCommitments.map((c, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "0.75rem",
                      borderRadius: "8px",
                      background: "var(--color-background-secondary)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                        {c.description}
                      </span>
                      <span className="sales-source-pill">
                        {c.owner ? `Owner: ${c.owner}` : c.status || "Pending"}
                      </span>
                    </div>
                    {(c.evidence || c.sourceDate) && (
                      <div style={{ marginTop: "0.5rem" }}>
                        <EvidenceChip
                          evidence={c.evidence}
                          sourceDate={c.sourceDate}
                          confidence={c.confidence}
                        />
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
                  No outstanding commitments recorded prior to this call.
                </div>
              )}

              {/* Open Action Items */}
              {prep.observedFacts.openActionItems && prep.observedFacts.openActionItems.length > 0 && (
                <div style={{ marginTop: "0.5rem" }}>
                  <label className="sales-label">Open Action Items</label>
                  {prep.observedFacts.openActionItems.map((act, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "0.5rem 0.75rem",
                        borderRadius: "6px",
                        background: "var(--color-surface-hover)",
                        border: "1px solid var(--color-border)",
                        fontSize: "0.8125rem",
                        marginBottom: "0.375rem",
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{act.task}</div>
                      {act.assignee && (
                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                          Assignee: {act.assignee} {act.dueDate ? `• Due: ${act.dueDate}` : ""}
                        </div>
                      )}
                      {act.evidence && <EvidenceChip evidence={act.evidence} />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 6: Suggested Agenda & Talking Points */}
          <div className="meeting-prep-card meeting-prep-card-col-12">
            <div className="meeting-prep-card-header">
              <h3 className="meeting-prep-card-title">
                <ListOrdered size={16} /> Suggested Agenda & Key Talking Points
              </h3>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem" }}>
              {/* Agenda List */}
              <div>
                <label className="sales-label">Recommended Agenda Schedule</label>
                {prep.recommendations.suggestedAgenda && prep.recommendations.suggestedAgenda.length > 0 ? (
                  prep.recommendations.suggestedAgenda.map((agenda, idx) => (
                    <div key={idx} className="meeting-prep-agenda-item">
                      <div className="meeting-prep-agenda-duration">
                        {agenda.durationMins || 10}m
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.875rem" }}>
                          {agenda.topic}
                        </div>
                        {agenda.rationale && (
                          <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>
                            {agenda.rationale}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
                    No agenda generated.
                  </p>
                )}
              </div>

              {/* Talking Points & Open Questions */}
              <div>
                {prep.derivedContext?.talkingPoints && prep.derivedContext.talkingPoints.length > 0 && (
                  <div style={{ marginBottom: "1rem" }}>
                    <label className="sales-label">Key Talking Points</label>
                    {prep.derivedContext.talkingPoints.map((pt, idx) => (
                      <div key={idx} className="meeting-prep-talking-point">
                        <span>•</span>
                        <span>{pt}</span>
                      </div>
                    ))}
                  </div>
                )}

                {prep.recommendations.openQuestions && prep.recommendations.openQuestions.length > 0 && (
                  <div>
                    <label className="sales-label">Questions to Uncover Intent & Criteria</label>
                    {prep.recommendations.openQuestions.map((q, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "0.5rem",
                          padding: "0.5rem 0.75rem",
                          borderRadius: "6px",
                          background: "var(--color-background-secondary)",
                          border: "1px solid var(--color-border)",
                          fontSize: "0.8125rem",
                          marginBottom: "0.375rem",
                        }}
                      >
                        <HelpCircle size={14} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: "2px" }} />
                        <span>{q}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingPrepInterface;
