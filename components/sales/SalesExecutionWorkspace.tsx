"use client";

import React, { useState } from "react";
import {
  Activity,
  CalendarCheck,
  Brain,
  Layers,
  Sparkles,
  Zap,
} from "lucide-react";
import ActivityCaptureWorkspace from "./ActivityCaptureWorkspace";
import MeetingPrepInterface from "./MeetingPrepInterface";
import MeetingIntelligenceInterface from "./MeetingIntelligenceInterface";

export type SalesExecutionTab = "activities" | "prep" | "intelligence";

interface SalesExecutionWorkspaceProps {
  initialTab?: SalesExecutionTab;
  initialMeetingId?: string;
  customerId?: string;
  dealId?: string;
}

export const SalesExecutionWorkspace: React.FC<SalesExecutionWorkspaceProps> = ({
  initialTab = "activities",
  initialMeetingId = "",
  customerId,
  dealId,
}) => {
  const [activeTab, setActiveTab] = useState<SalesExecutionTab>(initialTab);

  return (
    <div className="sales-exec-page">
      {/* Workspace Header */}
      <div className="sales-exec-header">
        <div className="sales-exec-title-row">
          <div className="sales-exec-title-wrap">
            <h1 className="sales-exec-title">Sales Execution Workspace</h1>
            <p className="sales-exec-subtitle">
              Automated multi-channel activity capture, AI-driven pre-meeting preparation, and structured meeting intelligence.
            </p>
          </div>

          <div className="sales-exec-header-actions">
            <span className="sales-context-chip sales-context-chip-customer">
              <Zap size={12} />
              <span>FE-1 Production Deliverables</span>
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="sales-exec-tabs">
          <button
            type="button"
            className={`sales-exec-tab-btn ${
              activeTab === "activities" ? "sales-exec-tab-btn-active" : ""
            }`}
            onClick={() => setActiveTab("activities")}
          >
            <Activity size={16} />
            <span>Activity Capture Timeline</span>
            <span className="sales-exec-tab-badge">Email, Calls, WA, Meetings</span>
          </button>

          <button
            type="button"
            className={`sales-exec-tab-btn ${
              activeTab === "prep" ? "sales-exec-tab-btn-active" : ""
            }`}
            onClick={() => setActiveTab("prep")}
          >
            <CalendarCheck size={16} />
            <span>AI Meeting Preparation</span>
            <span className="sales-exec-tab-badge">Grounded Brief</span>
          </button>

          <button
            type="button"
            className={`sales-exec-tab-btn ${
              activeTab === "intelligence" ? "sales-exec-tab-btn-active" : ""
            }`}
            onClick={() => setActiveTab("intelligence")}
          >
            <Brain size={16} />
            <span>Meeting Transcript & Intelligence</span>
            <span className="sales-exec-tab-badge">Actions & Commitments</span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === "activities" && (
          <ActivityCaptureWorkspace
            customerId={customerId}
            dealId={dealId}
          />
        )}

        {activeTab === "prep" && (
          <MeetingPrepInterface initialMeetingId={initialMeetingId} />
        )}

        {activeTab === "intelligence" && (
          <MeetingIntelligenceInterface
            initialMeetingId={initialMeetingId}
            initialDealId={dealId}
            initialCustomerId={customerId}
          />
        )}
      </div>
    </div>
  );
};

export default SalesExecutionWorkspace;
