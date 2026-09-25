"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  RefreshCw,
  AlertCircle,
  Inbox,
  Filter,
  ChevronLeft,
  ChevronRight,
  Send,
  X,
} from "lucide-react";
import {
  CapturedActivity,
  ChannelFilterOption,
  SalesChannel,
  SalesActivitiesFilter,
} from "@/types/salesExecution";
import {
  getActivitiesTimeline,
  ingestActivity,
  createSalesActivity,
} from "@/lib/api/salesExecutionApi";
import ChannelFilterBar from "./ChannelFilterBar";
import ActivityTimelineItem from "./ActivityTimelineItem";
import ActivityDetailModal from "./ActivityDetailModal";

interface ActivityCaptureWorkspaceProps {
  initialChannel?: ChannelFilterOption;
  customerId?: string;
  dealId?: string;
}

export const ActivityCaptureWorkspace: React.FC<ActivityCaptureWorkspaceProps> = ({
  initialChannel = "ALL",
  customerId,
  dealId,
}) => {
  const [activities, setActivities] = useState<CapturedActivity[]>([]);
  const [channel, setChannel] = useState<ChannelFilterOption>(initialChannel);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Activity for Detail Modal
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<CapturedActivity | null>(null);

  // Quick Ingest Activity Modal
  const [isIngestOpen, setIsIngestOpen] = useState(false);
  const [ingestChannel, setIngestChannel] = useState<SalesChannel>("EMAIL");
  const [ingestSource, setIngestSource] = useState("GMAIL");
  const [ingestSubject, setIngestSubject] = useState("");
  const [ingestContent, setIngestContent] = useState("");
  const [ingestParticipantEmail, setIngestParticipantEmail] = useState("");
  const [ingestSubmitting, setIngestSubmitting] = useState(false);
  const [ingestError, setIngestError] = useState<string | null>(null);

  // Fetch activities from real backend
  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: SalesActivitiesFilter = {
        page,
        limit,
        customerId,
        dealId,
      };

      if (channel !== "ALL") {
        filters.channel = channel;
      }

      const res = await getActivitiesTimeline(filters);
      if (res.success && Array.isArray(res.data)) {
        setActivities(res.data);
        if (res.pagination) {
          setTotal(res.pagination.total);
          setTotalPages(res.pagination.totalPages || 1);
        }
      } else {
        setActivities([]);
        setTotal(0);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to load sales activities.";
      setError(msg);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [channel, page, limit, customerId, dealId]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Handle Channel filter change
  const handleChannelChange = (newChannel: ChannelFilterOption) => {
    setChannel(newChannel);
    setPage(1);
  };

  // Client-side search filtering across subject, content, participant, or activity type
  const filteredActivities = activities.filter((act) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const matchSubject = act.subject?.toLowerCase().includes(q);
    const matchContent = act.content?.toLowerCase().includes(q);
    const matchType = act.activityType?.toLowerCase().includes(q);
    const matchCustomer =
      act.customer?.name?.toLowerCase().includes(q) ||
      act.customer?.companyName?.toLowerCase().includes(q);
    const matchDeal =
      act.deal?.title?.toLowerCase().includes(q) ||
      act.deal?.name?.toLowerCase().includes(q);
    const matchParticipant = act.participants?.some(
      (p) =>
        p.email?.toLowerCase().includes(q) || p.name?.toLowerCase().includes(q)
    );
    return (
      matchSubject ||
      matchContent ||
      matchType ||
      matchCustomer ||
      matchDeal ||
      matchParticipant
    );
  });

  // Handle Ingest Activity Submission
  const handleIngestActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingestContent.trim() && !ingestSubject.trim()) {
      setIngestError("Please provide a subject or activity content.");
      return;
    }

    setIngestSubmitting(true);
    setIngestError(null);
    try {
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 3600000);
      const payload: Record<string, unknown> = {
        subject: ingestSubject.trim() || `${ingestChannel} Activity`,
        content: ingestContent.trim() || ingestSubject.trim(),
      };

      if (ingestChannel === "EMAIL") {
        payload.subject = ingestSubject.trim() || "Email correspondence";
        payload.body = ingestContent.trim() || ingestSubject.trim();
        payload.from = ingestParticipantEmail.trim() || "contact@client.com";
        payload.to = ["sales@zyoris.com"];
      } else if (ingestChannel === "CALENDAR") {
        payload.title = ingestSubject.trim() || "Calendar Event";
        payload.organizer = ingestParticipantEmail.trim() || "sales@zyoris.com";
        payload.startTime = now.toISOString();
        payload.endTime = oneHourLater.toISOString();
      } else if (ingestChannel === "CALLS") {
        payload.caller = ingestParticipantEmail.trim() || "+15551234567";
        payload.callee = "+15559876543";
        payload.summary = ingestContent.trim() || ingestSubject.trim();
      } else if (ingestChannel === "MEETINGS") {
        payload.title = ingestSubject.trim() || "Sales Meeting";
        payload.startTime = now.toISOString();
        payload.endTime = oneHourLater.toISOString();
      } else if (ingestChannel === "WHATSAPP") {
        payload.from = ingestParticipantEmail.trim() || "+15551234567";
        payload.to = "+15559876543";
        payload.text = ingestContent.trim() || ingestSubject.trim();
      }

      const getStandardEventType = (ch: SalesChannel): string => {
        switch (ch) {
          case "EMAIL":
            return "EMAIL_SENT";
          case "CALLS":
            return "CALL_COMPLETED";
          case "MEETINGS":
            return "MEETING_HELD";
          case "CALENDAR":
            return "CALENDAR_EVENT";
          case "WHATSAPP":
            return "WHATSAPP_SENT";
          default:
            return "ACTIVITY_LOGGED";
        }
      };

      await ingestActivity({
        idempotencyKey: `ik_${Date.now()}`,
        eventType: getStandardEventType(ingestChannel),
        entityType: dealId ? "DEAL" : customerId ? "CUSTOMER" : "LEAD",
        entityId: dealId || customerId || "lead_default",
        channel: ingestChannel,
        source: ingestSource || "MANUAL",
        payload,
        customerId,
        dealId,
      });

      setIsIngestOpen(false);
      setIngestSubject("");
      setIngestContent("");
      setIngestParticipantEmail("");
      fetchActivities();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to capture activity.";
      setIngestError(msg);
    } finally {
      setIngestSubmitting(false);
    }
  };

  return (
    <div className="sales-activity-workspace">
      {/* Filter and Search Toolbar */}
      <div className="sales-filter-toolbar">
        <ChannelFilterBar
          activeChannel={channel}
          onChange={handleChannelChange}
        />

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <div className="sales-search-wrap">
            <Search size={15} className="sales-search-icon" />
            <input
              type="text"
              placeholder="Search activities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sales-input sales-search-input"
            />
          </div>

          <button
            type="button"
            className="sales-btn sales-btn-icon"
            onClick={fetchActivities}
            title="Refresh activities"
            disabled={loading}
          >
            <RefreshCw size={15} />
          </button>

          <button
            type="button"
            className="sales-btn sales-btn-primary"
            onClick={() => setIsIngestOpen(true)}
          >
            <Plus size={15} />
            <span>Capture Activity</span>
          </button>
        </div>
      </div>

      {/* Error State with Retry */}
      {error && (
        <div className="sales-error-container">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <AlertCircle size={18} />
            <p className="sales-error-text">{error}</p>
          </div>
          <button
            type="button"
            className="sales-btn sales-btn-sm sales-btn-secondary"
            onClick={fetchActivities}
          >
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton State */}
      {loading && (
        <div className="sales-activity-timeline">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="sales-timeline-card"
              style={{ pointerEvents: "none", opacity: 0.7 }}
            >
              <div className="sales-timeline-avatar-wrap">
                <div
                  className="sales-channel-avatar"
                  style={{ background: "var(--color-surface-hover)" }}
                />
              </div>
              <div className="sales-timeline-body">
                <div className="sales-skeleton-line" style={{ width: "35%", height: "14px" }} />
                <div className="sales-skeleton-line" style={{ width: "80%", height: "12px", marginTop: "4px" }} />
                <div className="sales-skeleton-line" style={{ width: "50%", height: "12px" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredActivities.length === 0 && (
        <div className="sales-empty-container">
          <div className="sales-empty-icon">
            <Inbox size={24} />
          </div>
          <h3 className="sales-empty-title">No Sales Activities Found</h3>
          <p className="sales-empty-desc">
            {channel !== "ALL"
              ? `No activities captured for the ${channel} channel yet. Ingest an activity to see it appear in real time.`
              : "No activities have been captured yet across Email, Calendar, Calls, Meetings, or WhatsApp."}
          </p>
          <button
            type="button"
            className="sales-btn sales-btn-primary"
            style={{ marginTop: "1rem" }}
            onClick={() => setIsIngestOpen(true)}
          >
            <Plus size={15} /> Capture Activity
          </button>
        </div>
      )}

      {/* Populated Timeline List */}
      {!loading && !error && filteredActivities.length > 0 && (
        <>
          <div className="sales-activity-timeline">
            {filteredActivities.map((act) => (
              <ActivityTimelineItem
                key={act.id}
                activity={act}
                onClick={(item) => {
                  setSelectedActivity(item);
                  setSelectedActivityId(item.id);
                }}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="sales-pagination">
            <span style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>
              Showing {filteredActivities.length} of {total} activities
            </span>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <button
                type="button"
                className="sales-btn sales-btn-sm sales-btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <span style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="sales-btn sales-btn-sm sales-btn-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Activity Detail Modal */}
      <ActivityDetailModal
        activityId={selectedActivityId}
        initialActivity={selectedActivity}
        onClose={() => {
          setSelectedActivityId(null);
          setSelectedActivity(null);
        }}
      />

      {/* Capture Activity Modal */}
      {isIngestOpen && (
        <div
          className="sales-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsIngestOpen(false);
          }}
        >
          <div className="sales-modal-dialog" role="dialog" aria-modal="true">
            <div className="sales-modal-header">
              <h3 className="sales-modal-title">Capture Sales Activity</h3>
              <button
                type="button"
                className="sales-btn-icon"
                onClick={() => setIsIngestOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form className="sales-modal-form" onSubmit={handleIngestActivity}>
              <div className="sales-modal-body">
                {ingestError && (
                  <div className="sales-error-container">
                    <AlertCircle size={16} />
                    <p className="sales-error-text">{ingestError}</p>
                  </div>
                )}

                <div className="sales-form-group">
                  <label className="sales-label">Channel</label>
                  <select
                    className="sales-select"
                    value={ingestChannel}
                    onChange={(e) => {
                      const ch = e.target.value as SalesChannel;
                      setIngestChannel(ch);
                      if (ch === "EMAIL") setIngestSource("GMAIL");
                      else if (ch === "CALENDAR") setIngestSource("GOOGLE_CALENDAR");
                      else if (ch === "CALLS") setIngestSource("TWILIO");
                      else if (ch === "MEETINGS") setIngestSource("ZOOM");
                      else if (ch === "WHATSAPP") setIngestSource("WHATSAPP");
                    }}
                  >
                    <option value="EMAIL">Email</option>
                    <option value="CALENDAR">Calendar</option>
                    <option value="CALLS">Calls</option>
                    <option value="MEETINGS">Meetings</option>
                    <option value="WHATSAPP">WhatsApp</option>
                  </select>
                </div>

                <div className="sales-form-group">
                  <label className="sales-label">Source System</label>
                  <input
                    type="text"
                    className="sales-input"
                    value={ingestSource}
                    onChange={(e) => setIngestSource(e.target.value)}
                    placeholder="e.g. GMAIL, OUTLOOK, ZOOM, TWILIO"
                  />
                </div>

                <div className="sales-form-group">
                  <label className="sales-label">Subject / Title</label>
                  <input
                    type="text"
                    className="sales-input"
                    value={ingestSubject}
                    onChange={(e) => setIngestSubject(e.target.value)}
                    placeholder="e.g. Q4 Enterprise Architecture Review"
                  />
                </div>

                <div className="sales-form-group">
                  <label className="sales-label">Customer / Lead Contact Email</label>
                  <input
                    type="email"
                    className="sales-input"
                    value={ingestParticipantEmail}
                    onChange={(e) => setIngestParticipantEmail(e.target.value)}
                    placeholder="e.g. buyer@enterprise.corp"
                  />
                </div>

                <div className="sales-form-group">
                  <label className="sales-label">Content / Body / Notes</label>
                  <textarea
                    rows={4}
                    className="sales-textarea"
                    value={ingestContent}
                    onChange={(e) => setIngestContent(e.target.value)}
                    placeholder="Provide details of the conversation or meeting notes..."
                  />
                </div>
              </div>

              <div className="sales-modal-footer">
                <button
                  type="button"
                  className="sales-btn sales-btn-secondary"
                  onClick={() => setIsIngestOpen(false)}
                  disabled={ingestSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="sales-btn sales-btn-primary"
                  disabled={ingestSubmitting}
                >
                  {ingestSubmitting ? (
                    "Ingesting..."
                  ) : (
                    <>
                      <Send size={14} /> Submit Activity
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityCaptureWorkspace;
