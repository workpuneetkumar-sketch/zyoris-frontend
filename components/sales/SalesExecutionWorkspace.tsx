"use client";

import React, { useState } from "react";
import {
  Activity,
  CalendarCheck,
  Brain,
  ListTree,
  FileCheck2,
} from "lucide-react";
import ActivityCaptureWorkspace from "./ActivityCaptureWorkspace";
import MeetingPrepInterface from "./MeetingPrepInterface";
import MeetingIntelligenceInterface from "./MeetingIntelligenceInterface";
import SequencesPlaybooksWorkspace from "./SequencesPlaybooksWorkspace";
import QuotesEsignWorkspace from "./QuotesEsignWorkspace";

export type SalesExecutionTab =
  | "activities"
  | "prep"
  | "intelligence"
  | "sequences"
  | "quotes";

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
              Unified CRM hub integrating Activity Capture, AI Meeting Prep, Transcript Extraction, Sequences, Playbooks, Quotes & E-Signature.
            </p>
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
          </button>

          <button
            type="button"
            className={`sales-exec-tab-btn ${
              activeTab === "prep" ? "sales-exec-tab-btn-active" : ""
            }`}
            onClick={() => setActiveTab("prep")}
          >
            <CalendarCheck size={16} />
            <span>AI Meeting Prep</span>
          </button>

          <button
            type="button"
            className={`sales-exec-tab-btn ${
              activeTab === "intelligence" ? "sales-exec-tab-btn-active" : ""
            }`}
            onClick={() => setActiveTab("intelligence")}
          >
            <Brain size={16} />
            <span>Meeting Intelligence</span>
          </button>

          <button
            type="button"
            className={`sales-exec-tab-btn ${
              activeTab === "sequences" ? "sales-exec-tab-btn-active" : ""
            }`}
            onClick={() => setActiveTab("sequences")}
          >
            <ListTree size={16} />
            <span>Sequences & Playbooks</span>
          </button>

          <button
            type="button"
            className={`sales-exec-tab-btn ${
              activeTab === "quotes" ? "sales-exec-tab-btn-active" : ""
            }`}
            onClick={() => setActiveTab("quotes")}
          >
            <FileCheck2 size={16} />
            <span>Quotes & E-Sign</span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === "activities" && (
          <ActivityCaptureWorkspace customerId={customerId} dealId={dealId} />
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

        {activeTab === "sequences" && (
          <SequencesPlaybooksWorkspace customerId={customerId} dealId={dealId} />
        )}

        {activeTab === "quotes" && (
          <QuotesEsignWorkspace customerId={customerId} dealId={dealId} />
        )}
      </div>
    </div>
  );
};

export default SalesExecutionWorkspace;
