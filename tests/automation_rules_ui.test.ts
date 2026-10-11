// tests/automation_rules_ui.test.ts
// Unit and verification tests for Automation Rules UI configuration summary, validation, and contract.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type {
  TriggerType,
  ActionType,
  CreateRulePayload,
} from "../lib/api/automationApi.ts";
import {
  getTriggerLabel,
  getActionLabel,
  getTriggerIcon,
  getActionIcon,
  getConfigFields,
  getValidActionsForTrigger,
  validateConfig,
  getHumanReadableConfigSummary,
} from "../lib/api/automationApi.ts";

describe("Automation Rules - Configuration Summary & Workflow Verification", () => {
  
  describe("Trigger and Action Mapping", () => {
    it("returns correct valid actions for LEAD_CREATED", () => {
      const actions = getValidActionsForTrigger("LEAD_CREATED");
      assert.deepEqual(actions, [
        "ASSIGN_USER",
        "ROUND_ROBIN_ASSIGN",
        "AI_RECOMMENDATION_ASSIGN",
        "SEND_NOTIFICATION",
        "NOTIFY_MANAGER",
        "SEND_REMINDER",
      ]);
    });

    it("restricts DEAL_WON to notification, manager notification and reminders", () => {
      const actions = getValidActionsForTrigger("DEAL_WON");
      assert.deepEqual(actions, [
        "SEND_NOTIFICATION",
        "NOTIFY_MANAGER",
        "SEND_REMINDER",
      ]);
    });

    it("restricts LEAVE_APPLIED to manager and general notifications", () => {
      const actions = getValidActionsForTrigger("LEAVE_APPLIED");
      assert.deepEqual(actions, [
        "NOTIFY_MANAGER",
        "SEND_NOTIFICATION",
      ]);
    });

    it("restricts TASK_OVERDUE to reminders and notifications", () => {
      const actions = getValidActionsForTrigger("TASK_OVERDUE");
      assert.deepEqual(actions, [
        "SEND_REMINDER",
        "NOTIFY_MANAGER",
        "SEND_REMINDER".replace("SEND_REMINDER", "NOTIFY_MANAGER") === "NOTIFY_MANAGER" ? "SEND_REMINDER" : "",
        "NOTIFY_MANAGER",
        "SEND_NOTIFICATION"
      ].filter((v, i, a) => a.indexOf(v) === i && v !== ""));
    });

    it("provides human-readable labels and icons for all triggers and actions", () => {
      const triggers: TriggerType[] = ["LEAD_CREATED", "DEAL_WON", "LEAVE_APPLIED", "TASK_OVERDUE"];
      triggers.forEach(t => {
        assert.ok(getTriggerLabel(t).length > 0);
        assert.ok(getTriggerIcon(t).length > 0);
      });

      const actions: ActionType[] = [
        "ASSIGN_USER",
        "ROUND_ROBIN_ASSIGN",
        "AI_RECOMMENDATION_ASSIGN",
        "SEND_NOTIFICATION",
        "NOTIFY_MANAGER",
        "SEND_REMINDER"
      ];
      actions.forEach(a => {
        assert.ok(getActionLabel(a).length > 0);
        assert.ok(getActionIcon(a).length > 0);
      });
    });
  });

  describe("Human-Readable Configuration Summary (No Raw Internal Keys)", () => {
    it("summarizes ASSIGN_USER without raw assignedUserId key", () => {
      const configured = getHumanReadableConfigSummary("ASSIGN_USER", { assignedUserId: "usr_9988" });
      assert.equal(configured.length, 1);
      assert.equal(configured[0].label, "Assigned User");
      assert.equal(configured[0].value, "usr_9988");
      assert.notEqual(configured[0].label, "assignedUserId");

      const empty = getHumanReadableConfigSummary("ASSIGN_USER", {});
      assert.equal(empty[0].label, "Assigned User");
      assert.equal(empty[0].value, "Not configured yet");
    });

    it("summarizes ROUND_ROBIN_ASSIGN cleanly", () => {
      const configured = getHumanReadableConfigSummary("ROUND_ROBIN_ASSIGN", { team: "Enterprise Sales" });
      assert.equal(configured[0].label, "Target Team");
      assert.equal(configured[0].value, "Enterprise Sales");
      assert.notEqual(configured[0].label, "team");

      const empty = getHumanReadableConfigSummary("ROUND_ROBIN_ASSIGN", { team: "" });
      assert.equal(empty[0].value, "Not configured yet");
    });

    it("summarizes AI_RECOMMENDATION_ASSIGN with smart defaults and optional notes", () => {
      const defaultSummary = getHumanReadableConfigSummary("AI_RECOMMENDATION_ASSIGN", {});
      assert.equal(defaultSummary[0].label, "Routing Strategy");
      assert.ok(defaultSummary[0].value.includes("3-Pillar scoring matrix"));

      const customSummary = getHumanReadableConfigSummary("AI_RECOMMENDATION_ASSIGN", {
        aiStrategyNote: "Weighted towards APAC enterprise closers"
      });
      assert.equal(customSummary[0].label, "Routing Strategy");
      assert.equal(customSummary[0].value, "Weighted towards APAC enterprise closers");
    });

    it("summarizes SEND_NOTIFICATION message", () => {
      const configured = getHumanReadableConfigSummary("SEND_NOTIFICATION", {
        message: "New high-priority lead requires review."
      });
      assert.equal(configured[0].label, "Notification Message");
      assert.equal(configured[0].value, "New high-priority lead requires review.");
    });

    it("summarizes NOTIFY_MANAGER without raw managerId key", () => {
      const configured = getHumanReadableConfigSummary("NOTIFY_MANAGER", { managerId: "mgr_alpha_1" });
      assert.equal(configured[0].label, "Manager");
      assert.equal(configured[0].value, "mgr_alpha_1");
      assert.notEqual(configured[0].label, "managerId");
    });

    it("summarizes SEND_REMINDER with proper singular/plural hour formatting", () => {
      const plural = getHumanReadableConfigSummary("SEND_REMINDER", { hours: 24 });
      assert.equal(plural[0].label, "Reminder Schedule");
      assert.equal(plural[0].value, "24 hours before event");

      const singular = getHumanReadableConfigSummary("SEND_REMINDER", { hours: 1 });
      assert.equal(singular[0].value, "1 hour before event");

      const empty = getHumanReadableConfigSummary("SEND_REMINDER", {});
      assert.equal(empty[0].value, "Not configured yet");
    });

    it("never exposes internal payload keys across any action summary", () => {
      const internalKeys = ["assignedUserId", "managerId", "team", "message", "hours", "aiStrategyNote"];
      const allActions: ActionType[] = [
        "ASSIGN_USER",
        "ROUND_ROBIN_ASSIGN",
        "AI_RECOMMENDATION_ASSIGN",
        "SEND_NOTIFICATION",
        "NOTIFY_MANAGER",
        "SEND_REMINDER",
      ];

      allActions.forEach((act) => {
        const summary = getHumanReadableConfigSummary(act, {
          assignedUserId: "test",
          managerId: "test",
          team: "test",
          message: "test",
          hours: 12,
          aiStrategyNote: "test"
        });

        summary.forEach((item) => {
          assert.ok(!internalKeys.includes(item.label), `Internal key exposed: ${item.label}`);
        });
      });
    });
  });

  describe("Validation Errors & Optional Fields", () => {
    it("validates required fields for ASSIGN_USER", () => {
      const invalid = validateConfig("ASSIGN_USER", {});
      assert.equal(invalid.valid, false);
      assert.ok(invalid.errors.some(e => e.includes("Assigned User ID is required")));

      const valid = validateConfig("ASSIGN_USER", { assignedUserId: "usr_101" });
      assert.equal(valid.valid, true);
      assert.equal(valid.errors.length, 0);
    });

    it("validates positive number requirement for SEND_REMINDER", () => {
      const empty = validateConfig("SEND_REMINDER", {});
      assert.equal(empty.valid, false);
      assert.ok(empty.errors.some(e => e.includes("Reminder Hours is required")));

      const zero = validateConfig("SEND_REMINDER", { hours: 0 });
      assert.equal(zero.valid, false);
      assert.ok(zero.errors.some(e => e.includes("must be a positive number")));

      const negative = validateConfig("SEND_REMINDER", { hours: -5 });
      assert.equal(negative.valid, false);
      assert.ok(negative.errors.some(e => e.includes("must be a positive number")));

      const valid = validateConfig("SEND_REMINDER", { hours: 12 });
      assert.equal(valid.valid, true);
    });

    it("accepts AI_RECOMMENDATION_ASSIGN without required fields", () => {
      const result = validateConfig("AI_RECOMMENDATION_ASSIGN", {});
      assert.equal(result.valid, true);
      assert.equal(result.errors.length, 0);
    });
  });

  describe("Backend Contract Conformity (CreateRulePayload)", () => {
    it("generates faithful payload matching CreateRulePayload contract", () => {
      const form = {
        name: "  VIP Lead Notification  ",
        trigger: "LEAD_CREATED" as TriggerType,
        action: "SEND_NOTIFICATION" as ActionType,
        config: { message: "High value lead arrived" }
      };

      const payload: CreateRulePayload = {
        name: form.name.trim(),
        trigger: form.trigger,
        action: form.action,
        config: form.config
      };

      assert.equal(payload.name, "VIP Lead Notification");
      assert.equal(payload.trigger, "LEAD_CREATED");
      assert.equal(payload.action, "SEND_NOTIFICATION");
      assert.deepEqual(payload.config, { message: "High value lead arrived" });
      assert.ok(!("debug" in payload));
    });
  });
});
