import test from "node:test";
import assert from "node:assert/strict";
import { normalizeMarkdownContent, sanitizeUrl } from "../lib/markdownSanitizer.ts";

test("Markdown Sanitizer & Normalization Pipeline", async (t) => {
  await t.test("Eliminates escaped and raw HTML line breaks (<br>, \\<br>, <br/>)", () => {
    const input = "Line 1\\<br>Line 2<br/>Line 3\\<br/>Line 4<br >Line 5";
    const expected = "Line 1\nLine 2\nLine 3\nLine 4\nLine 5";
    assert.strictEqual(normalizeMarkdownContent(input), expected);
  });

  await t.test("Decodes visible HTML entities in prose (&nbsp;, &gt;, &lt;, &amp;, &quot;)", () => {
    const input = "Sales &amp; Marketing &gt; Operations &nbsp; &quot;High Priority&quot;";
    const expected = 'Sales & Marketing > Operations   "High Priority"';
    assert.strictEqual(normalizeMarkdownContent(input), expected);
  });

  await t.test("Preserves code blocks and inline code exactly as written without unescaping", () => {
    const codeSnippet = "```python\ndef sanitize():\n    # HTML <br> &amp; entity inside code\n    pattern = r'\\d+\\.\\d+'\n    return pattern\n```";
    const result = normalizeMarkdownContent(codeSnippet);
    assert.strictEqual(result, codeSnippet);
  });

  await t.test("Preserves inline code spans `r'\\d+'` without removing backslashes", () => {
    const input = "Check this regex: `\\<br>` or `\\d+` in python.";
    const result = normalizeMarkdownContent(input);
    assert.strictEqual(result, "Check this regex: `\\<br>` or `\\d+` in python.");
  });

  await t.test("Removes unnecessary LLM backslash escapes in prose", () => {
    const input = "Here is an escaped title: \\# Overview with \\*italics\\* and \\[link\\] and \\_variable\\_";
    const expected = "Here is an escaped title: # Overview with *italics* and [link] and _variable_";
    assert.strictEqual(normalizeMarkdownContent(input), expected);
  });

  await t.test("Strips invisible Unicode control characters and zero-width spaces", () => {
    const input = "Hello\u200BWorld\uFEFFWith\u200CInvisible\u00A0Spaces";
    const expected = "HelloWorldWithInvisible Spaces";
    assert.strictEqual(normalizeMarkdownContent(input), expected);
  });

  await t.test("Normalizes messy horizontal rules (---, - - -, ***, ___)", () => {
    const input = "Section 1\n\n- - -\n\nSection 2\n\n***\n\nSection 3";
    const result = normalizeMarkdownContent(input);
    assert.ok(result.includes("Section 1\n\n---\n\nSection 2\n\n---\n\nSection 3"));
  });

  await t.test("Streaming robustness: auto-closes unclosed code fence", () => {
    const input = "Here is the code:\n```typescript\nconst a = 1;";
    const result = normalizeMarkdownContent(input);
    assert.ok(result.endsWith("```"), "Must append closing fence when stream is cut off mid-code-block");
  });

  await t.test("sanitizeUrl blocks javascript: and dangerous schemes", () => {
    assert.strictEqual(sanitizeUrl("javascript:alert(1)"), "#");
    assert.strictEqual(sanitizeUrl("data:text/html,<script>"), "#");
    assert.strictEqual(sanitizeUrl("https://example.com/crm"), "https://example.com/crm");
    assert.strictEqual(sanitizeUrl("/dashboard/leads"), "/dashboard/leads");
    assert.strictEqual(sanitizeUrl("mailto:admin@zyoris.com"), "mailto:admin@zyoris.com");
  });
});
