"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  FileText,
  Send,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  Building2,
  Briefcase,
  AlertTriangle,
  HelpCircle,
  Users,
  Search,
  Check,
} from "lucide-react";
import {
  MeetingIntelligence,
  IntelligenceStatus,
} from "@/types/salesExecution";
import {
  submitMeetingTranscript,
  getMeetingIntelligence,
} from "@/lib/api/salesExecutionApi";
import EvidenceChip from "./EvidenceChip";
import { useSalesEntities } from "@/hooks/useSalesEntities";

interface MeetingIntelligenceInterfaceProps {
  initialMeetingId?: string;
  initialDealId?: string;
  initialCustomerId?: string;
}

export const MeetingIntelligenceInterface: React.FC<MeetingIntelligenceInterfaceProps> = ({
  initialMeetingId = "",
  initialDealId = "",
  initialCustomerId = "",
}) => {
  const { leads, contacts } = useSalesEntities();
  const [meetingId, setMeetingId] = useState(initialMeetingId);
  const [searchMeetingId, setSearchMeetingId] = useState(initialMeetingId);
  const [dealId, setDealId] = useState(initialDealId);
  const [customerId, setCustomerId] = useState(initialCustomerId);

  // Ingestion form state
  const [transcriptText, setTranscriptText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Intelligence view state
  const [intelligence, setIntelligence] = useState<MeetingIntelligence | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
      }
    };
  }, []);

  // Fetch intelligence by meeting ID
  const fetchIntelligence = useCallback(
    async (id: string, isPoll = false) => {
      if (!id.trim()) return;

      if (!isPoll) {
        setLoading(true);
        setFetchError(null);
      }

      try {
        const res = await getMeetingIntelligence(id.trim());
        if (res.success && res.data) {
          setIntelligence(res.data);
          setFetchError(null);

          // If still processing, poll again in 3 seconds
          if (
            res.data.status === "PROCESSING" ||
            res.data.status === "PENDING"
          ) {
            pollTimerRef.current = setTimeout(() => {
              fetchIntelligence(id, true);
            }, 3000);
          }
        } else {
          setIntelligence(null);
          if (!isPoll) setFetchError("No intelligence record found.");
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : "Failed to fetch meeting intelligence.";
        if (!isPoll) {
          setFetchError(msg);
          setIntelligence(null);
        }
      } finally {
        if (!isPoll) setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (initialMeetingId) {
      setMeetingId(initialMeetingId);
      setSearchMeetingId(initialMeetingId);
      fetchIntelligence(initialMeetingId);
    }
  }, [initialMeetingId, fetchIntelligence]);

  // Handle Load Existing Intelligence
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchMeetingId.trim()) {
      setMeetingId(searchMeetingId.trim());
      fetchIntelligence(searchMeetingId.trim());
    }
  };

  // Handle Submit Transcript
  const handleSubmitTranscript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transcriptText.trim()) {
      setSubmitError("Please enter a meeting transcript to analyze.");
      return;
    }
    if (!meetingId.trim()) {
      setSubmitError("Please provide a Meeting ID to link this transcript.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await submitMeetingTranscript({
        transcript: transcriptText.trim(),
        meetingId: meetingId.trim(),
        dealId: dealId.trim() || undefined,
        customerId: customerId.trim() || undefined,
      });

      if (res.success && res.data) {
        setIntelligence(res.data);
        setTranscriptText("");

        if (
          res.data.status === "PROCESSING" ||
          res.data.status === "PENDING"
        ) {
          pollTimerRef.current = setTimeout(() => {
            fetchIntelligence(meetingId.trim(), true);
          }, 3000);
        }
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to submit and process meeting transcript.";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="meeting-intel-container">
      {/* Top Search / Meeting Bar */}
      <div className="meeting-prep-topbar">
        <form onSubmit={handleSearchSubmit} className="meeting-prep-selector" style={{ gap: "0.75rem", flexWrap: "wrap" }}>
          <select
            className="sales-select"
            style={{ width: "240px" }}
            value={searchMeetingId}
            onChange={(e) => {
              const val = e.target.value;
              setSearchMeetingId(val);
              if (val.trim()) {
                setMeetingId(val.trim());
                fetchIntelligence(val.trim());
              }
            }}
          >
            <option value="">-- Select Lead/Meeting --</option>
            <optgroup label="Live Leads">
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.id})
                </option>
              ))}
            </optgroup>
          </select>

          <div className="sales-search-wrap" style={{ minWidth: "240px" }}>
            <Search size={15} className="sales-search-icon" />
            <input
              type="text"
              className="sales-input sales-search-input"
              placeholder="Or enter Meeting ID..."
              value={searchMeetingId}
              onChange={(e) => setSearchMeetingId(e.target.value)}
            />
          </div>
          <button type="submit" className="sales-btn sales-btn-primary">
            Find Intelligence
          </button>
        </form>

        {meetingId && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>
              Context ID: <strong>{meetingId}</strong>
            </span>
            <button
              type="button"
              className="sales-btn sales-btn-icon"
              onClick={() => fetchIntelligence(meetingId)}
              disabled={loading}
              title="Refresh intelligence"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        )}
      </div>

      {/* Transcript Submission Card */}
      <div className="meeting-intel-ingest-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <FileText size={18} color="var(--color-primary)" />
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
              Ingest & Process Meeting Transcript
            </h3>
          </div>
        </div>

        {submitError && (
          <div className="sales-error-container">
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <AlertCircle size={16} />
              <p className="sales-error-text">{submitError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmitTranscript}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1rem",
              marginBottom: "1rem",
            }}
          >
            <div className="sales-form-group" style={{ margin: 0 }}>
              <label className="sales-label">Meeting ID *</label>
              <input
                type="text"
                className="sales-input"
                placeholder="e.g. meet_test_01"
                value={meetingId}
                onChange={(e) => setMeetingId(e.target.value)}
                required
              />
            </div>

            <div className="sales-form-group" style={{ margin: 0 }}>
              <label className="sales-label">Deal Context ID (Optional)</label>
              <input
                type="text"
                className="sales-input"
                placeholder="e.g. deal_123"
                value={dealId}
                onChange={(e) => setDealId(e.target.value)}
              />
            </div>

            <div className="sales-form-group" style={{ margin: 0 }}>
              <label className="sales-label">Customer Context ID (Optional)</label>
              <input
                type="text"
                className="sales-input"
                placeholder="e.g. cust_123"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              />
            </div>
          </div>

          <div className="sales-form-group">
            <label className="sales-label">
              Meeting Conversation Transcript *
            </label>
            <textarea
              rows={4}
              className="sales-textarea"
              placeholder="Paste meeting transcript here with speaker turns (e.g. Rep: ..., Customer: ...)..."
              value={transcriptText}
              onChange={(e) => setTranscriptText(e.target.value)}
              required
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="submit"
              className="sales-btn sales-btn-primary"
              disabled={isSubmitting || !transcriptText.trim() || !meetingId.trim()}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={14} className="sales-loading-spinner" />
                  <span>Processing AI Intelligence...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Extract Sales Intelligence</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Fetch Error Banner */}
      {fetchError && (
        <div className="sales-error-container">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <AlertCircle size={18} />
            <p className="sales-error-text">{fetchError}</p>
          </div>
          <button
            type="button"
            className="sales-btn sales-btn-sm sales-btn-secondary"
            onClick={() => fetchIntelligence(meetingId)}
          >
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="sales-loading-container">
          <div className="sales-loading-spinner" />
          <p>Retrieving structured meeting intelligence...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !fetchError && !intelligence && (
        <div className="sales-empty-container">
          <div className="sales-empty-icon">
            <Sparkles size={24} />
          </div>
          <h3 className="sales-empty-title">No Intelligence Record Selected</h3>
          <p className="sales-empty-desc">
            Submit a transcript above or load an existing Meeting ID to view extracted action items, commitments, objections, and requirements.
          </p>
        </div>
      )}

      {/* Populated Structured Intelligence UI */}
      {!loading && intelligence && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Status & Explicit Association Banner */}
          <div className="meeting-intel-status-banner">
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <span
                className={`meeting-intel-status-pill meeting-intel-status-${intelligence.status}`}
              >
                {intelligence.status}
              </span>

              {/* Attribution Context */}
              {intelligence.meetingId && (
                <span className="meeting-intel-context-badge">
                  <Clock size={12} /> Meeting: {intelligence.meetingId}
                </span>
              )}
              {intelligence.customerId && (
                <span className="meeting-intel-context-badge">
                  <Building2 size={12} /> Customer: {intelligence.customerId}
                </span>
              )}
              {intelligence.dealId && (
                <span className="meeting-intel-context-badge">
                  <Briefcase size={12} /> Deal: {intelligence.dealId}
                </span>
              )}
            </div>

            {intelligence.processedAt && (
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                Processed: {new Date(intelligence.processedAt).toLocaleString()}
              </span>
            )}
          </div>

          {/* Processing Banner if still PENDING or PROCESSING */}
          {(intelligence.status === "PENDING" ||
            intelligence.status === "PROCESSING") && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "1rem 1.25rem",
                borderRadius: "10px",
                background: "var(--color-warning-light)",
                border: "1px solid var(--color-warning)",
                color: "var(--color-warning)",
              }}
            >
              <div className="sales-loading-spinner" />
              <div>
                <strong>AI Pipeline Processing In Progress</strong>
                <p style={{ margin: 0, fontSize: "0.8125rem" }}>
                  Extracting actions, commitments, objections, and requirements. Results update automatically.
                </p>
              </div>
            </div>
          )}

          {/* Executive Summary */}
          {intelligence.summary && (
            <div className="meeting-intel-summary-box">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.5rem",
                  color: "var(--color-primary)",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                }}
              >
                <Sparkles size={16} /> Executive Sales Summary
              </div>
              <p style={{ margin: 0 }}>{intelligence.summary}</p>
            </div>
          )}

          {/* Intelligence Sections Grid */}
          <div className="meeting-intel-sections-grid">
            {/* Section 1: Extracted Action Items */}
            <div className="meeting-intel-section-card">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: "1px solid var(--color-border)",
                  paddingBottom: "0.5rem",
                }}
              >
                <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>
                  Extracted Action Items ({intelligence.actionItems?.length || 0})
                </h4>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {intelligence.actionItems && intelligence.actionItems.length > 0 ? (
                  intelligence.actionItems.map((act, idx) => (
                    <div key={idx} className="meeting-intel-item-row">
                      <div className="meeting-intel-item-top">
                        <span className="meeting-intel-item-title">{act.task}</span>
                        {act.assignee && (
                          <span className="sales-source-pill">
                            Assignee: {act.assignee}
                          </span>
                        )}
                      </div>
                      {act.dueDate && (
                        <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                          Due: {act.dueDate}
                        </span>
                      )}
                      {act.evidence && (
                        <EvidenceChip
                          evidence={act.evidence}
                          confidence={act.confidence}
                        />
                      )}
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", margin: 0 }}>
                    No action items detected in transcript.
                  </p>
                )}
              </div>
            </div>

            {/* Section 2: Commitments */}
            <div className="meeting-intel-section-card">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: "1px solid var(--color-border)",
                  paddingBottom: "0.5rem",
                }}
              >
                <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>
                  Commitments & Promises ({intelligence.commitments?.length || 0})
                </h4>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {intelligence.commitments && intelligence.commitments.length > 0 ? (
                  intelligence.commitments.map((com, idx) => (
                    <div key={idx} className="meeting-intel-item-row">
                      <div className="meeting-intel-item-top">
                        <span className="meeting-intel-item-title">
                          {com.description}
                        </span>
                        <span className="sales-source-pill">
                          {com.owner ? `Owner: ${com.owner}` : com.status}
                        </span>
                      </div>
                      {com.evidence && (
                        <EvidenceChip
                          evidence={com.evidence}
                          confidence={com.confidence}
                        />
                      )}
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", margin: 0 }}>
                    No explicit commitments detected.
                  </p>
                )}
              </div>
            </div>

            {/* Section 3: Objections & Concerns */}
            <div className="meeting-intel-section-card">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: "1px solid var(--color-border)",
                  paddingBottom: "0.5rem",
                }}
              >
                <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>
                  Objections & Pushback ({intelligence.objections?.length || 0})
                </h4>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {intelligence.objections && intelligence.objections.length > 0 ? (
                  intelligence.objections.map((obj, idx) => (
                    <div key={idx} className="meeting-intel-item-row">
                      <div className="meeting-intel-item-top">
                        <span className="meeting-intel-item-title">
                          {obj.objection}
                        </span>
                        {obj.objectionType && (
                          <span className="sales-source-pill">
                            {obj.objectionType}
                          </span>
                        )}
                      </div>
                      {obj.response && (
                        <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                          <strong>Handled by:</strong> {obj.response}
                        </div>
                      )}
                      {obj.evidence && (
                        <EvidenceChip
                          evidence={obj.evidence}
                          confidence={obj.confidence}
                        />
                      )}
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", margin: 0 }}>
                    No customer objections recorded.
                  </p>
                )}
              </div>
            </div>

            {/* Section 4: Customer Requirements */}
            <div className="meeting-intel-section-card">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: "1px solid var(--color-border)",
                  paddingBottom: "0.5rem",
                }}
              >
                <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>
                  Customer Requirements ({intelligence.requirements?.length || 0})
                </h4>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {intelligence.requirements && intelligence.requirements.length > 0 ? (
                  intelligence.requirements.map((req, idx) => (
                    <div key={idx} className="meeting-intel-item-row">
                      <div className="meeting-intel-item-top">
                        <span className="meeting-intel-item-title">
                          {req.requirement}
                        </span>
                        {req.status && (
                          <span className="sales-source-pill">{req.status}</span>
                        )}
                      </div>
                      {req.evidence && (
                        <EvidenceChip
                          evidence={req.evidence}
                          confidence={req.confidence}
                        />
                      )}
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", margin: 0 }}>
                    No specific requirements detected.
                  </p>
                )}
              </div>
            </div>

            {/* Section 5: Risks & Important Topics */}
            <div className="meeting-intel-section-card">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: "1px solid var(--color-border)",
                  paddingBottom: "0.5rem",
                }}
              >
                <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>
                  Risks & Identified Topics
                </h4>
              </div>
              <div>
                {/* Important Topics */}
                {intelligence.importantTopics && intelligence.importantTopics.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginBottom: "0.75rem" }}>
                    {intelligence.importantTopics.map((topic, idx) => (
                      <span key={idx} className="sales-context-chip sales-context-chip-customer">
                        {topic}
                      </span>
                    ))}
                  </div>
                )}

                {/* Risks */}
                {intelligence.risks && intelligence.risks.length > 0 ? (
                  intelligence.risks.map((risk, idx) => (
                    <div
                      key={idx}
                      className="meeting-prep-risk-item risk-severity-medium"
                      style={{ marginBottom: "0.5rem" }}
                    >
                      <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                        {risk.description}
                      </div>
                      {risk.evidence && <EvidenceChip evidence={risk.evidence} />}
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", margin: 0 }}>
                    No deal risks extracted from conversation.
                  </p>
                )}
              </div>
            </div>

            {/* Section 6: Participants & Sentiment */}
            <div className="meeting-intel-section-card">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: "1px solid var(--color-border)",
                  paddingBottom: "0.5rem",
                }}
              >
                <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>
                  Participants & Sentiment ({intelligence.participants?.length || 0})
                </h4>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {intelligence.participants && intelligence.participants.length > 0 ? (
                  intelligence.participants.map((p, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.5rem 0.75rem",
                        borderRadius: "6px",
                        background: "var(--color-surface-hover)",
                        border: "1px solid var(--color-border)",
                        fontSize: "0.8125rem",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <Users size={14} color="var(--color-text-muted)" />
                        <span style={{ fontWeight: 600 }}>{p.name}</span>
                        {p.role && (
                          <span style={{ color: "var(--color-text-secondary)", fontSize: "0.75rem" }}>
                            ({p.role})
                          </span>
                        )}
                      </div>
                      {p.sentiment && (
                        <span className="sales-source-pill" style={{ textTransform: "uppercase" }}>
                          {p.sentiment}
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", margin: 0 }}>
                    No participants listed.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingIntelligenceInterface;
