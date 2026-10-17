"use client";

import React, { useState } from "react";
import {
  Activity,
  CalendarCheck,
  Brain,
  ListTree,
  FileCheck2,
  Sparkles,
} from "lucide-react";
import ActivityCaptureWorkspace from "./ActivityCaptureWorkspace";
import MeetingPrepInterface from "./MeetingPrepInterface";
import MeetingIntelligenceInterface from "./MeetingIntelligenceInterface";
import ProposalsWorkspace from "./ProposalsWorkspace";
import OutreachGeneratorWorkspace from "./OutreachGeneratorWorkspace";
import SequencesCadenceWorkspace from "./SequencesCadenceWorkspace";

export type SalesExecutionTab =
  | "activities"
  | "prep"
  | "intelligence"
  | "proposals"
  | "outreach"
  | "sequences";

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
            <div className="sales-exec-badge-row">
              <div className="sales-exec-live-badge">
                <span className="sales-exec-live-dot" />
                <span>Real-time Sales Execution OS</span>
              </div>
              <span
                className="sales-source-pill"
                style={{
                  background: "rgba(99, 102, 241, 0.08)",
                  color: "#6366f1",
                  borderColor: "rgba(99, 102, 241, 0.2)",
                  fontWeight: 600,
                }}
              >
                v2.4 Enterprise
              </span>
            </div>
            <h1 className="sales-exec-title">Sales Execution Workspace</h1>
            <p className="sales-exec-subtitle">
              Unified sales cockpit connecting multi-channel activity streaming, AI meeting preparation, transcription intelligence, governance rules, grounded outreach, and cadences.
            </p>
          </div>

          <div className="sales-exec-header-stats">
            <div
              className="sales-exec-stat-pill"
              title="5 Connected Channels: Email, Calendar, Calls, Meetings, WhatsApp"
            >
              <Activity size={13} style={{ color: "#6366f1" }} />
              <span>5 Ingest Channels</span>
            </div>
            <div
              className="sales-exec-stat-pill"
              title="AI Transcription & Meeting Prep Grounded in CRM Context"
            >
              <Brain size={13} style={{ color: "#8b5cf6" }} />
              <span>AI Grounding</span>
            </div>
            <div
              className="sales-exec-stat-pill"
              title="Strict Deal Governance & Discount Approvals"
            >
              <FileCheck2 size={13} style={{ color: "#10b981" }} />
              <span>Governance</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs covering All 6 Modules */}
        <div className="sales-exec-tabs-container">
          <div className="sales-exec-tabs">
            {/* MODULE 1: Activity Capture & Reviews */}
            <button
              type="button"
              className={`sales-exec-tab-btn ${
                activeTab === "activities" ? "sales-exec-tab-btn-active" : ""
              }`}
              onClick={() => setActiveTab("activities")}
            >
              <Activity size={15} />
              <span>Activity Capture & Reviews</span>
              <span className="sales-exec-tab-badge">Omnichannel</span>
            </button>

            {/* MODULE 2: AI Meeting Prep */}
            <button
              type="button"
              className={`sales-exec-tab-btn ${
                activeTab === "prep" ? "sales-exec-tab-btn-active" : ""
              }`}
              onClick={() => setActiveTab("prep")}
            >
              <CalendarCheck size={15} />
              <span>AI Meeting Prep</span>
              <span className="sales-exec-tab-badge">Briefing</span>
            </button>

            {/* MODULE 3: Meeting Intelligence */}
            <button
              type="button"
              className={`sales-exec-tab-btn ${
                activeTab === "intelligence" ? "sales-exec-tab-btn-active" : ""
              }`}
              onClick={() => setActiveTab("intelligence")}
            >
              <Brain size={15} />
              <span>Meeting Intelligence</span>
              <span className="sales-exec-tab-badge">Extract</span>
            </button>

            {/* MODULE 4: Proposals & Governance */}
            <button
              type="button"
              className={`sales-exec-tab-btn ${
                activeTab === "proposals" ? "sales-exec-tab-btn-active" : ""
              }`}
              onClick={() => setActiveTab("proposals")}
            >
              <FileCheck2 size={15} />
              <span>Proposals & Governance</span>
              <span className="sales-exec-tab-badge">Rules</span>
            </button>

            {/* MODULE 5: Grounded AI Outreach */}
            <button
              type="button"
              className={`sales-exec-tab-btn ${
                activeTab === "outreach" ? "sales-exec-tab-btn-active" : ""
              }`}
              onClick={() => setActiveTab("outreach")}
            >
              <Sparkles size={15} />
              <span>Grounded AI Outreach</span>
              <span className="sales-exec-tab-badge">Smart Drafts</span>
            </button>

            {/* MODULE 6: Sequences & Cadence */}
            <button
              type="button"
              className={`sales-exec-tab-btn ${
                activeTab === "sequences" ? "sales-exec-tab-btn-active" : ""
              }`}
              onClick={() => setActiveTab("sequences")}
            >
              <ListTree size={15} />
              <span>Sequences & Cadence</span>
              <span className="sales-exec-tab-badge">Automations</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Panels */}
      <div>
        {/* TASK 1: Activity Capture Workspace & Reviews */}
        {activeTab === "activities" && (
          <ActivityCaptureWorkspace customerId={customerId} dealId={dealId} />
        )}

        {/* TASK 1: AI Meeting Prep */}
        {activeTab === "prep" && (
          <MeetingPrepInterface initialMeetingId={initialMeetingId} />
        )}

        {/* TASK 1: Meeting Transcription & Intelligence */}
        {activeTab === "intelligence" && (
          <MeetingIntelligenceInterface
            initialMeetingId={initialMeetingId}
            initialDealId={dealId}
            initialCustomerId={customerId}
          />
        )}

        {/* TASK 2: Proposals & Rules Workspace */}
        {activeTab === "proposals" && (
          <ProposalsWorkspace dealId={dealId} customerId={customerId} />
        )}

        {/* TASK 2: Grounded Outreach Generator & Drafts */}
        {activeTab === "outreach" && (
          <OutreachGeneratorWorkspace
            dealId={dealId}
            customerId={customerId}
          />
        )}

        {/* TASK 2: Sequences, Builder & Cadence Enrollments */}
        {activeTab === "sequences" && (
          <SequencesCadenceWorkspace customerId={customerId} dealId={dealId} />
        )}
      </div>
    </div>
  );
};

export default SalesExecutionWorkspace;
