import test from "node:test";
import assert from "node:assert/strict";
import { normalizeMarkdownContent, sanitizeUrl } from "../lib/markdownSanitizer.ts";

test("Task Validation: AI Chatbot Markdown Rendering & Formatting Tests", async (t) => {
  // 1. Headings, Bold Text, and Paragraphs
  await t.test("1. Normalizes headings, bold, italic, and paragraphs", () => {
    const raw = "## Revenue Overview\n\nThis is a **major update** for *Q4 sales*.\n\n### Lead Pipeline\nAll leads are moving forward.";
    const cleaned = normalizeMarkdownContent(raw);
    assert.ok(cleaned.includes("## Revenue Overview"));
    assert.ok(cleaned.includes("### Lead Pipeline"));
    assert.ok(cleaned.includes("**major update**"));
    assert.ok(cleaned.includes("*Q4 sales*"));
  });

  // 2. Nested Bullet Points and Numbered Lists
  await t.test("2. Preserves bullet points and nested structure", () => {
    const raw = "• Stage 1: Discovery\n  - Subtask A: Schedule call\n  - Subtask B: Review needs\n• Stage 2: Proposal\n  1. Draft pricing\n  2. Executive approval";
    const cleaned = normalizeMarkdownContent(raw);
    assert.ok(cleaned.includes("• Stage 1: Discovery"));
    assert.ok(cleaned.includes("  - Subtask A: Schedule call"));
    assert.ok(cleaned.includes("  1. Draft pricing"));
  });

  // 3. Markdown Tables Containing Multiple Columns & Alignment
  await t.test("3. Preserves and cleans Markdown tables", () => {
    const raw = "| Deal Name | Stage | Value | Win Prob |\n| :--- | :---: | ---: | ---: |\n| Enterprise Cloud | Negotiation | $120,000 | 78% |\n| Security Suite | Discovery | $45,000 | 45% |";
    const cleaned = normalizeMarkdownContent(raw);
    assert.ok(cleaned.includes("| Deal Name | Stage | Value | Win Prob |"));
    assert.ok(cleaned.includes("| Enterprise Cloud | Negotiation | $120,000 | 78% |"));
  });

  // 4. Code Snippets & JSON
  await t.test("4. Preserves fenced code blocks with language and raw code intact", () => {
    const jsonSnippet = "```json\n{\n  \"status\": \"success\",\n  \"leadCount\": 15,\n  \"path\": \"/leads/get-leads\"\n}\n```";
    const cleaned = normalizeMarkdownContent(jsonSnippet);
    assert.strictEqual(cleaned, jsonSnippet);
  });

  await t.test("4b. Preserves Python and TypeScript code with backslashes and symbols", () => {
    const code = "```python\nimport re\npattern = re.compile(r'\\<br\\>')\nprint(\"Code &amp; Entities\")\n```";
    const cleaned = normalizeMarkdownContent(code);
    assert.strictEqual(cleaned, code, "Code blocks must NOT have entities or backslashes decoded/stripped");
  });

  // 5. HTML Entities and Escaped Line Breaks
  await t.test("5. Eliminates escaped HTML tags and visible HTML entities in prose", () => {
    const input = "Executive Brief\\<br>• Total Revenue: $420,000&nbsp;&nbsp;USD<br/>• Win Rate &gt; 75% &amp; growing\\<br/>• Status: &quot;EXCELLENT&quot;";
    const cleaned = normalizeMarkdownContent(input);
    assert.ok(!cleaned.includes("\\<br>"), "Must remove \\<br>");
    assert.ok(!cleaned.includes("<br/>"), "Must remove <br/>");
    assert.ok(!cleaned.includes("&nbsp;"), "Must decode &nbsp;");
    assert.ok(!cleaned.includes("&gt;"), "Must decode &gt;");
    assert.ok(!cleaned.includes("&amp;"), "Must decode &amp;");
    assert.ok(!cleaned.includes("&quot;"), "Must decode &quot;");
    assert.ok(cleaned.includes("Win Rate > 75% & growing"));
    assert.ok(cleaned.includes('Status: "EXCELLENT"'));
  });

  // 6. Long Responses with Multiple Sections
  await t.test("6. Handles long responses with headings, lists, tables, and blockquotes", () => {
    const longResponse = `
# Executive CRM Report

> "Pipeline momentum has reached an all-time quarterly high."

## 1. Key Performance Indicators
**Total Pipeline**: $310,000 YTD
**Win Probability**: 78%

## 2. Active Deals Breakdown
| Deal | Stage | Value |
| --- | --- | --- |
| ERP Suite | Proposal | $120,000 |
| Cloud Sync | Negotiation | $85,000 |

## 3. Recommended Actions
1. Follow up with Astralpipes contact regarding Q4 contract.
2. Review pending CSV import deduplication results.
    `.trim();

    const cleaned = normalizeMarkdownContent(longResponse);
    assert.ok(cleaned.startsWith("# Executive CRM Report"));
    assert.ok(cleaned.includes('> "Pipeline momentum has reached an all-time quarterly high."'));
    assert.ok(cleaned.includes("| ERP Suite | Proposal | $120,000 |"));
  });

  // 7. Streaming Incomplete Markdown Responses
  await t.test("7. Safely handles streaming responses with unclosed code blocks", () => {
    const partialStream = "Here is the SQL query:\n```sql\nSELECT * FROM leads WHERE status = 'HOT';";
    const cleaned = normalizeMarkdownContent(partialStream);
    assert.ok(cleaned.endsWith("```"), "Must auto-close stream fence to prevent UI glitches");
  });

  // 8. Responses with URLs, Mathematical Expressions, Currencies, and Percentages
  await t.test("8. Correctly validates and sanitizes URLs while preserving currencies & math", () => {
    const input = "Visit [Zyoris Docs](https://zyoris.com/docs) or [Local Guide](/dashboard/guide). Total deal: $145,000 (+12.5% increase). Math: 5 × $25,000 = $125,000.";
    const cleaned = normalizeMarkdownContent(input);
    assert.ok(cleaned.includes("[Zyoris Docs](https://zyoris.com/docs)"));
    assert.ok(cleaned.includes("$145,000"));
    assert.ok(cleaned.includes("+12.5%"));
    assert.ok(cleaned.includes("5 × $25,000 = $125,000"));

    // URL security check
    assert.strictEqual(sanitizeUrl("javascript:evilCode()"), "#");
    assert.strictEqual(sanitizeUrl("https://zyoris.com/docs"), "https://zyoris.com/docs");
  });

  // 9. Backslash Unescaping in Prose
  await t.test("9. Unescapes unnecessary backslashes outside code", () => {
    const input = "The deal stage is \\[Negotiation\\] with \\*Astralpipes\\* and \\#1 priority.";
    const cleaned = normalizeMarkdownContent(input);
    assert.strictEqual(cleaned, "The deal stage is [Negotiation] with *Astralpipes* and #1 priority.");
  });

  // 10. Inline Token Verification
  await t.test("10. Normalizes bold, italic, inline code, and status tokens properly", () => {
    const input = "**Bold** and *Italic* and `HOT` status and [Link](https://zyoris.com)";
    const cleaned = normalizeMarkdownContent(input);
    assert.ok(cleaned.includes("**Bold**"));
    assert.ok(cleaned.includes("*Italic*"));
    assert.ok(cleaned.includes("`HOT`"));
    assert.ok(cleaned.includes("[Link](https://zyoris.com)"));
  });
});
