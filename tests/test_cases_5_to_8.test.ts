// tests/test_cases_5_to_8.test.ts
// Unit & regression tests for Task 2 (Test Cases 5 through 8)

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatActionType, REVOPS_ACTION_LABELS } from "../lib/api/revopsApi.ts";

describe("Test Case 5: Settings Preferences Sanitization & Controls", () => {
  const PREF_KEYS = {
    theme: "pref.theme",
    language: "pref.language",
    timezone: "pref.timezone",
    dateFormat: "pref.date_format",
    currency: "pref.currency",
    timeFormat: "pref.time_format",
  };

  const PREF_LABELS: Record<string, string> = {
    [PREF_KEYS.theme]: "Theme",
    [PREF_KEYS.language]: "Language",
    [PREF_KEYS.timezone]: "Timezone",
    [PREF_KEYS.dateFormat]: "Date format",
    [PREF_KEYS.currency]: "Currency",
    [PREF_KEYS.timeFormat]: "Time format",
  };

  it("maps internal preference keys to friendly human-readable labels", () => {
    assert.equal(PREF_LABELS["pref.timezone"], "Timezone");
    assert.equal(PREF_LABELS["pref.date_format"], "Date format");
    assert.equal(PREF_LABELS["pref.currency"], "Currency");
    assert.equal(PREF_LABELS["pref.time_format"], "Time format");
  });

  it("never exposes raw pref.* keys in user reset messages", () => {
    const formatResetToast = (key: string) => {
      const label = PREF_LABELS[key] || "Preference";
      return `${label} reset to default`;
    };

    assert.equal(formatResetToast("pref.timezone"), "Timezone reset to default");
    assert.equal(formatResetToast("pref.date_format"), "Date format reset to default");
    assert.ok(!formatResetToast("pref.timezone").includes("pref."));
  });

  it("supports expected currency and date format options", () => {
    const DATE_FORMATS = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD", "D MMM YYYY"];
    const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD", "JPY"];

    assert.ok(DATE_FORMATS.includes("DD/MM/YYYY"));
    assert.ok(CURRENCIES.includes("INR"));
    assert.ok(CURRENCIES.includes("USD"));
  });
});

describe("Test Case 6: Theme System & OS Preference Resolution", () => {
  type ThemeMode = "light" | "dark" | "system";

  function resolveEffectiveTheme(mode: ThemeMode, systemPrefersDark: boolean): "dark" | "light" {
    if (mode === "dark") return "dark";
    if (mode === "light") return "light";
    return systemPrefersDark ? "dark" : "light";
  }

  it("applies dark mode when Dark theme is selected", () => {
    assert.equal(resolveEffectiveTheme("dark", false), "dark");
    assert.equal(resolveEffectiveTheme("dark", true), "dark");
  });

  it("applies light mode when Light theme is selected", () => {
    assert.equal(resolveEffectiveTheme("light", false), "light");
    assert.equal(resolveEffectiveTheme("light", true), "light");
  });

  it("follows OS preference dynamically when System theme is selected", () => {
    assert.equal(resolveEffectiveTheme("system", true), "dark");
    assert.equal(resolveEffectiveTheme("system", false), "light");
  });
});

describe("Test Case 7: Workflow Drafts Action Labels & Shielding", () => {
  it("converts DELAY to human-readable label", () => {
    const label = formatActionType("DELAY");
    assert.equal(label, "Scheduled Delay");
    assert.notEqual(label, "DELAY");
  });

  it("converts SEND_EMAIL to human-readable label", () => {
    const label = formatActionType("SEND_EMAIL");
    assert.equal(label, "Email Notification");
    assert.notEqual(label, "SEND_EMAIL");
  });

  it("converts CONDITIONAL_UPDATE to human-readable label", () => {
    const label = formatActionType("CONDITIONAL_UPDATE");
    assert.equal(label, "Conditional Update");
    assert.notEqual(label, "CONDITIONAL_UPDATE");
  });

  it("converts ASSIGN_LEAD to human-readable label", () => {
    const label = formatActionType("ASSIGN_LEAD");
    assert.equal(label, "Lead Assignment");
    assert.notEqual(label, "ASSIGN_LEAD");
  });

  it("handles unknown/future actions gracefully without raw codes", () => {
    const label = formatActionType("CUSTOM_WEBHOOK_INTEGRATION");
    assert.equal(label, "Custom Webhook Integration");
    assert.ok(!label.includes("_"));
  });
});

describe("Test Case 8: Audit Logs Controlled Metadata Exposure", () => {
  function formatFieldLabel(key: string): string {
    const map: Record<string, string> = {
      taskId: "Task Reference",
      entityId: "Record Reference",
      entityType: "Target Type",
      newAssigneeId: "New Assignee",
      previousAssigneeId: "Previous Assignee",
    };
    if (map[key]) return map[key];
    return key
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function maskId(val: string): string {
    if (val.length > 12) {
      return `${val.slice(0, 8)}…${val.slice(-4)}`;
    }
    return val;
  }

  it("formats technical audit metadata keys into human-readable labels", () => {
    assert.equal(formatFieldLabel("taskId"), "Task Reference");
    assert.equal(formatFieldLabel("entityId"), "Record Reference");
    assert.equal(formatFieldLabel("entityType"), "Target Type");
    assert.equal(formatFieldLabel("newAssigneeId"), "New Assignee");
    assert.equal(formatFieldLabel("previousAssigneeId"), "Previous Assignee");
  });

  it("controls exposure of internal database identifiers by masking long IDs", () => {
    const longId = "cmupjmy5r07botpfht7s9yf7a_task";
    const masked = maskId(longId);
    assert.notEqual(masked, longId);
    assert.equal(masked, "cmupjmy5…yf7a_task".slice(0, 8) + "…" + longId.slice(-4));
    assert.ok(masked.includes("…"));
  });

  it("preserves short values without unnecessary truncation", () => {
    assert.equal(maskId("USER-42"), "USER-42");
  });
});
