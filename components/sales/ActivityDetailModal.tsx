"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  AlertCircle,
  Building2,
  Briefcase,
  Users,
  Clock,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Hash,
} from "lucide-react";
import { CapturedActivity } from "@/types/salesExecution";
import { getSalesActivityById } from "@/lib/api/salesExecutionApi";
import SourceBadge from "./SourceBadge";

interface ActivityDetailModalProps {
  activityId: string | null;
  initialActivity?: CapturedActivity | null;
  onClose: () => void;
}

export const ActivityDetailModal: React.FC<ActivityDetailModalProps> = ({
  activityId,
  initialActivity = null,
  onClose,
}) => {
  const [activity, setActivity] = useState<CapturedActivity | null>(initialActivity);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activityId) {
      setActivity(null);
      setError(null);
      return;
    }

    if (initialActivity && initialActivity.id === activityId) {
      setActivity(initialActivity);
    }

    let isMounted = true;
    const fetchDetail = async () => {
      // Only set loading spinner if we don't have initialActivity data to render
      if (!initialActivity) {
        setLoading(true);
      }
      setError(null);
      try {
        const res = await getSalesActivityById(activityId);
        if (isMounted) {
          if (res.data) {
            setActivity(res.data);
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          // If we already have initialActivity data, ignore the 500 backend error
          if (!initialActivity && !activity) {
            const msg =
              err instanceof Error ? err.message : "Failed to load activity details.";
            setError(msg);
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDetail();

    return () => {
      isMounted = false;
    };
  }, [activityId, initialActivity]);

  if (!activityId) return null;

  return (
    <div
      className="sales-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sales-modal-dialog" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="sales-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {activity && (
              <SourceBadge channel={activity.channel} source={activity.source} />
            )}
            <h3 className="sales-modal-title">Activity Details</h3>
          </div>
          <button
            type="button"
            className="sales-btn-icon"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="sales-modal-body">
          {loading && (
            <div className="sales-loading-container">
              <div className="sales-loading-spinner" />
              <p>Loading activity details...</p>
            </div>
          )}

          {error && (
            <div className="sales-error-container">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <AlertCircle size={18} />
                <p className="sales-error-text">{error}</p>
              </div>
              <button
                type="button"
                className="sales-btn sales-btn-sm sales-btn-secondary"
                onClick={() => {
                  if (activityId) {
                    setLoading(true);
                    getSalesActivityById(activityId)
                      .then((res) => {
                        setActivity(res.data);
                        setError(null);
                      })
                      .catch((e) => setError(e.message))
                      .finally(() => setLoading(false));
                  }
                }}
              >
                <RefreshCw size={13} /> Retry
              </button>
            </div>
          )}

          {!loading && !error && activity && (
            <>
              {/* Subject & Activity Type */}
              <div>
                <span className="sales-source-pill">
                  {activity.activityType}
                </span>
                <h2
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    margin: "0.5rem 0",
                    color: "var(--color-text)",
                  }}
                >
                  {activity.subject || "(No subject)"}
                </h2>
                {activity.occurredAt && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.8125rem",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    Occurred: {new Date(activity.occurredAt).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Content */}
              {activity.content && (
                <div className="sales-form-group">
                  <label className="sales-label">Activity Content / Notes</label>
                  <div
                    style={{
                      padding: "0.875rem",
                      borderRadius: "8px",
                      background: "var(--color-background-secondary)",
                      border: "1px solid var(--color-border)",
                      fontSize: "0.875rem",
                      lineHeight: "1.6",
                      color: "var(--color-text)",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {activity.content}
                  </div>
                </div>
              )}

              {/* Metadata Grid */}
              <div className="sales-meta-grid">
                <div className="sales-meta-card">
                  <div className="sales-meta-card-label">Activity ID</div>
                  <div className="sales-meta-card-value">{activity.id}</div>
                </div>

                <div className="sales-meta-card">
                  <div className="sales-meta-card-label">Channel & Source</div>
                  <div className="sales-meta-card-value">
                    {activity.channel} • {activity.source || "Direct"}
                  </div>
                </div>

                <div className="sales-meta-card">
                  <div className="sales-meta-card-label">Duplicate Status</div>
                  <div className="sales-meta-card-value">
                    {activity.duplicateStatus || "UNIQUE"}
                  </div>
                </div>

                <div className="sales-meta-card">
                  <div className="sales-meta-card-label">Identity Resolution</div>
                  <div className="sales-meta-card-value">
                    {activity.identityStatus || "UNRESOLVED"}
                    {typeof activity.identityConfidence === "number" && (
                      <span style={{ fontSize: "0.75rem", marginLeft: "0.5rem" }}>
                        ({Math.round(activity.identityConfidence * 100)}%)
                      </span>
                    )}
                  </div>
                </div>

                <div className="sales-meta-card">
                  <div className="sales-meta-card-label">Customer Link</div>
                  <div className="sales-meta-card-value">
                    {activity.customer?.name ||
                      activity.customer?.companyName ||
                      activity.customerId ||
                      "Unlinked"}
                  </div>
                </div>

                <div className="sales-meta-card">
                  <div className="sales-meta-card-label">Associated Deal</div>
                  <div className="sales-meta-card-value">
                    {activity.deal?.title ||
                      activity.deal?.name ||
                      activity.dealId ||
                      "None"}
                  </div>
                </div>
              </div>

              {/* Participants */}
              {activity.participants && activity.participants.length > 0 && (
                <div>
                  <label className="sales-label">
                    Participants ({activity.participants.length})
                  </label>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                    }}
                  >
                    {activity.participants.map((p, idx) => (
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
                          <span style={{ fontWeight: 600 }}>
                            {p.name || p.email || p.phone || "Participant"}
                          </span>
                        </div>
                        <span className="sales-source-pill">
                          {p.role || (p.isExternal ? "External" : "Internal")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw Payload Inspection */}
              {activity.rawPayload && (
                <div>
                  <label className="sales-label">Raw Ingestion Payload</label>
                  <pre className="sales-raw-payload-box">
                    {JSON.stringify(activity.rawPayload, null, 2)}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sales-modal-footer">
          <button
            type="button"
            className="sales-btn sales-btn-secondary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActivityDetailModal;
