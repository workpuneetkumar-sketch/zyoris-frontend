import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGroundingPrompt,
  generateDeterministicFallback,
} from "../lib/aiService.ts";
import {
  detectIntent,
  formatDataForResponse,
} from "../lib/chatDataService.ts";

test("ZII BOT Grounding & Intent System", async (t) => {
  await t.test("Temporal Grounding: Current date and year are present in prompt", () => {
    const prompt = buildGroundingPrompt(
      { name: "Puneet Kumar", role: "Admin", email: "admin@zyoris.com" },
      "CRM test context"
    );
    const currentYear = new Date().getFullYear().toString();
    assert.ok(prompt.includes(currentYear), "Prompt should include current year");
    assert.ok(prompt.includes("Puneet Kumar"), "Prompt should include user name");
    assert.ok(prompt.includes("Admin"), "Prompt should include user role");
  });

  await t.test("Deterministic Fallback: Answers 'What is today\'s date?' accurately", () => {
    const reply = generateDeterministicFallback("What is today's date?");
    const currentYear = new Date().getFullYear().toString();
    assert.ok(reply.includes(currentYear), "Response must state current year");
    assert.ok(reply.toLowerCase().includes("today's date is"), "Response must mention today's date");
  });

  await t.test("Deterministic Fallback: Answers 'Who am I?' with profile details", () => {
    const user = {
      name: "Puneet Kumar",
      email: "puneet@zyoris.com",
      role: "Sales Director",
      organization: "Zyoris Tech",
    };
    const reply = generateDeterministicFallback("who am i?", user);
    assert.ok(reply.includes("Puneet Kumar"), "Should state user name");
    assert.ok(reply.includes("Sales Director"), "Should state user role");
    assert.ok(reply.includes("puneet@zyoris.com"), "Should state user email");
  });

  await t.test("Deterministic Fallback: Handles 'who m i' typo", () => {
    const user = { name: "Alex", role: "Manager" };
    const reply = generateDeterministicFallback("who m i", user);
    assert.ok(reply.includes("Alex"), "Should state user name even with 'who m i' typo");
  });

  await t.test("Deterministic Fallback: Answers 'What insights have been generated?' with CRM signals", () => {
    const reply = generateDeterministicFallback("What insights have been generated?");
    assert.ok(reply.includes("Win Probability") || reply.includes("Insights"), "Must give CRM insights");
    assert.ok(reply.includes("78%"), "Must include win probability score");
  });

  await t.test("Deterministic Fallback: Answers 'What is the status of recent lead import and extraction jobs?'", () => {
    const reply = generateDeterministicFallback("What is the status of recent lead import and extraction jobs?");
    assert.ok(reply.includes("Import"), "Must answer import status");
    assert.ok(reply.includes("Extraction"), "Must answer extraction status");
  });

  await t.test("Intent Detection: Correctly categorizes CRM queries", () => {
    assert.strictEqual(detectIntent("What insights have been generated?"), "insights");
    assert.strictEqual(detectIntent("Show me recent extraction jobs"), "imports");
    assert.strictEqual(detectIntent("What datasets are available?"), "datasets");
    assert.strictEqual(detectIntent("Show recent leads"), "leads");
    assert.strictEqual(detectIntent("What is our total deal value?"), "deals");
    assert.strictEqual(detectIntent("What is our revenue forecast?"), "revenue");
    assert.strictEqual(detectIntent("Hello ZII BOT"), "general");
  });

  await t.test("Format Data: formats insights and imports properly", () => {
    const insightFormatted = formatDataForResponse("insights", {});
    assert.ok(insightFormatted.includes("Executive Insights"));

    const importFormatted = formatDataForResponse("imports", { data: [{ name: "Lead 1" }] });
    assert.ok(importFormatted.includes("Lead Import"));

    const leadsFormatted = formatDataForResponse("leads", {
      data: [
        { name: "Nitin Tiwari", status: "NEW", company: "Astralpipes" },
        { name: "Testing lead 23", status: "NEW", company: "TechCorp" },
      ],
    });
    assert.ok(leadsFormatted.includes("Nitin Tiwari"), "Must include lead name");
    assert.ok(leadsFormatted.includes("Astralpipes"), "Must include company");
  });

  await t.test("Deterministic Fallback: Answers 'show me active leads' with lead records", () => {
    const reply = generateDeterministicFallback("show me active leads");
    assert.ok(reply.includes("Leads"), "Must mention Leads");
    assert.ok(reply.includes("Nitin Tiwari"), "Must include active lead sample");
    assert.ok(!reply.includes("How can I help you today?"), "Must NOT give generic greeting");
  });

  await t.test("Deterministic Fallback: Answers 'just show me the top 10 leads'", () => {
    const reply = generateDeterministicFallback("just show me the top 10 leads");
    assert.ok(reply.includes("Leads"), "Must mention Leads");
    assert.ok(reply.includes("10"), "Must mention top 10 leads");
  });
});

