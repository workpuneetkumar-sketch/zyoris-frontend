// tests/revops_action_labels.test.ts
// Unit and verification tests for RevOps Insights action labels, edge cases, and approval workflow.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatActionType,
  REVOPS_ACTION_LABELS,
} from "../lib/api/revopsApi.ts";
import type { RevOpsInsight } from "../lib/types/agent-results.ts";

describe("RevOps Insights - Human-Readable Action Labels & Identifier Shielding", () => {
  
  describe("Known Action Identifiers Mapping", () => {
    it("maps CAMPAIGN_TRIGGER to Campaign Automation (not raw identifier)", () => {
      const label = formatActionType("CAMPAIGN_TRIGGER");
      assert.equal(label, "Campaign Automation");
      assert.notEqual(label, "CAMPAIGN_TRIGGER");
    });

    it("maps WORKFLOW_ACTIVATION to Workflow Activation", () => {
      assert.equal(formatActionType("WORKFLOW_ACTIVATION"), "Workflow Activation");
    });

    it("maps PROCESS_GATE to Process Validation Gate", () => {
      assert.equal(formatActionType("PROCESS_GATE"), "Process Validation Gate");
    });

    it("maps DISCOUNT_APPROVAL to Discount Approval", () => {
      assert.equal(formatActionType("DISCOUNT_APPROVAL"), "Discount Approval");
    });

    it("maps pipeline, lead, task and reminder action codes to business labels", () => {
      assert.equal(formatActionType("ASSIGN_LEAD"), "Lead Assignment");
      assert.equal(formatActionType("ASSIGN_USER"), "User Assignment");
      assert.equal(formatActionType("SEND_NOTIFICATION"), "System Notification");
      assert.equal(formatActionType("SEND_REMINDER"), "Automated Reminder");
      assert.equal(formatActionType("PIPELINE_UPDATE"), "Pipeline Update");
      assert.equal(formatActionType("CREATE_TASK"), "Task Creation");
    });

    it("handles case-insensitive codes gracefully", () => {
      assert.equal(formatActionType("campaign_trigger"), "Campaign Automation");
      assert.equal(formatActionType("Campaign_Trigger"), "Campaign Automation");
      assert.equal(formatActionType("workflow_activation"), "Workflow Activation");
      assert.equal(formatActionType("process_gate"), "Process Validation Gate");
    });
  });

  describe("Dynamic and Unknown Action Identifiers Handling", () => {
    it("formats unknown snake_case identifiers into clean Title Case", () => {
      assert.equal(formatActionType("CUSTOM_EXPANSION_STRATEGY"), "Custom Expansion Strategy");
      assert.equal(formatActionType("lead_enrichment_action"), "Lead Enrichment Action");
    });

    it("formats camelCase identifiers cleanly", () => {
      assert.equal(formatActionType("dealAcceleration"), "Deal Acceleration");
    });

    it("preserves known business acronyms like CRM, AI, ARR, SaaS", () => {
      assert.equal(formatActionType("ai_deal_scoring"), "AI Deal Scoring");
      assert.equal(formatActionType("crm_sync_pipeline"), "CRM Sync Pipeline");
    });

    it("never returns raw uppercase underscores for unmapped actions", () => {
      const result = formatActionType("UNMAPPED_INTERNAL_TRIGGER_CODE");
      assert.ok(!result.includes("_"), "Result should not contain underscores");
      assert.equal(result, "Unmapped Internal Trigger Code");
    });
  });

  describe("Null, Undefined and Empty Action Handling", () => {
    it("safely handles null action type without throwing", () => {
      assert.equal(formatActionType(null), "Recommended Action");
    });

    it("safely handles undefined action type without throwing", () => {
      assert.equal(formatActionType(undefined), "Recommended Action");
    });

    it("safely handles empty string or whitespace", () => {
      assert.equal(formatActionType(""), "Recommended Action");
      assert.equal(formatActionType("   "), "Recommended Action");
    });

    it("safely handles non-string inputs", () => {
      assert.equal(formatActionType(123 as any), "Recommended Action");
      assert.equal(formatActionType({} as any), "Recommended Action");
    });
  });

  describe("Approval Workflow Preservation", () => {
    it("preserves raw type in proposedAction contract while UI presents business label", () => {
      const mockInsight: RevOpsInsight = {
        id: "revops-001",
        agentId: "revops-agent",
        agentName: "RevOps Analytics Agent",
        type: "RevOpsInsight",
        category: "COVERAGE",
        metricLabel: "Pipeline Coverage Ratio",
        metricValue: 2.1,
        severity: "HIGH",
        confidenceScore: 91,
        evidence: [],
        proposedAction: {
          label: "Launch pipeline gap campaign",
          type: "CAMPAIGN_TRIGGER",
          description: "Trigger outbound campaign",
          payload: { target: "CONTACTED_LEADS" }
        },
        createdAt: new Date().toISOString(),
      };

      // 1. UI renders human-readable business label:
      const uiLabel = formatActionType(mockInsight.proposedAction?.type);
      assert.equal(uiLabel, "Campaign Automation");
      assert.notEqual(uiLabel, "CAMPAIGN_TRIGGER");

      // 2. Underlying proposedAction contract remains untouched for backend /api/approvals:
      assert.equal(mockInsight.proposedAction?.type, "CAMPAIGN_TRIGGER");
      assert.equal(mockInsight.proposedAction?.label, "Launch pipeline gap campaign");
      assert.deepEqual(mockInsight.proposedAction?.payload, { target: "CONTACTED_LEADS" });
    });
  });
});
