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
            <h1 className="sales-exec-title">Sales Execution Workspace</h1>
            <p className="sales-exec-subtitle">
              Unified enterprise sales operating system connecting Activity Capture & Reviews, AI Meeting Prep, Meeting Intelligence, CRM Proposals & Rules, Grounded Outreach, and Sequences.
            </p>
          </div>
        </div>

        {/* Navigation Tabs covering Task 1, Task 2, and Task 3 */}
        <div className="sales-exec-tabs">
          {/* TASK 1 TABS */}
          <button
            type="button"
            className={`sales-exec-tab-btn ${
              activeTab === "activities" ? "sales-exec-tab-btn-active" : ""
            }`}
            onClick={() => setActiveTab("activities")}
          >
            <Activity size={15} />
            <span>Activity Capture & Reviews</span>
          </button>

          <button
            type="button"
            className={`sales-exec-tab-btn ${
              activeTab === "prep" ? "sales-exec-tab-btn-active" : ""
            }`}
            onClick={() => setActiveTab("prep")}
          >
            <CalendarCheck size={15} />
            <span>AI Meeting Prep</span>
          </button>

          <button
            type="button"
            className={`sales-exec-tab-btn ${
              activeTab === "intelligence" ? "sales-exec-tab-btn-active" : ""
            }`}
            onClick={() => setActiveTab("intelligence")}
          >
            <Brain size={15} />
            <span>Meeting Intelligence</span>
          </button>

          {/* TASK 2 TABS */}
          <button
            type="button"
            className={`sales-exec-tab-btn ${
              activeTab === "proposals" ? "sales-exec-tab-btn-active" : ""
            }`}
            onClick={() => setActiveTab("proposals")}
          >
            <FileCheck2 size={15} />
            <span>Proposals & Governance</span>
          </button>

          <button
            type="button"
            className={`sales-exec-tab-btn ${
              activeTab === "outreach" ? "sales-exec-tab-btn-active" : ""
            }`}
            onClick={() => setActiveTab("outreach")}
          >
            <Sparkles size={15} />
            <span>Grounded AI Outreach</span>
          </button>

          <button
            type="button"
            className={`sales-exec-tab-btn ${
              activeTab === "sequences" ? "sales-exec-tab-btn-active" : ""
            }`}
            onClick={() => setActiveTab("sequences")}
          >
            <ListTree size={15} />
            <span>Sequences & Cadence</span>
          </button>

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
