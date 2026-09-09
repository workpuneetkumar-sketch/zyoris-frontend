import test from "node:test";
import assert from "node:assert/strict";
import {
  trimTransformation,
  uppercaseTransformation,
  lowercaseTransformation,
  parseDateTransformation,
  defaultValueTransformation,
  regexReplaceTransformation,
  splitTransformation,
  combineTransformation,
  phoneNormalizationTransformation,
  executeTransformation,
  executeTransformationPipeline,
  safeString,
} from "../lib/transformations/engine";

test("safeString utility", async (t) => {
  await t.test("converts null and undefined to empty string", () => {
    assert.strictEqual(safeString(null), "");
    assert.strictEqual(safeString(undefined), "");
  });

  await t.test("converts numbers and booleans safely", () => {
    assert.strictEqual(safeString(123), "123");
    assert.strictEqual(safeString(0), "0");
    assert.strictEqual(safeString(true), "true");
    assert.strictEqual(safeString(false), "false");
  });

  await t.test("converts valid dates to ISO string", () => {
    const d = new Date("2026-09-03T12:00:00.000Z");
    assert.strictEqual(safeString(d), "2026-09-03T12:00:00.000Z");
  });
});

test("TRIM transformation", async (t) => {
  await t.test("strips leading and trailing spaces, tabs, and newlines", () => {
    assert.strictEqual(trimTransformation("  hello world  "), "hello world");
    assert.strictEqual(trimTransformation("\t\n  Zyoris CRM \r\n"), "Zyoris CRM");
  });

  await t.test("handles already trimmed and empty values", () => {
    assert.strictEqual(trimTransformation("clean"), "clean");
    assert.strictEqual(trimTransformation("   "), "");
    assert.strictEqual(trimTransformation(""), "");
    assert.strictEqual(trimTransformation(null), "");
    assert.strictEqual(trimTransformation(undefined), "");
  });

  await t.test("handles numeric inputs", () => {
    assert.strictEqual(trimTransformation(999), "999");
  });
});

test("UPPERCASE transformation", async (t) => {
  await t.test("converts lowercase and mixed case text to uppercase", () => {
    assert.strictEqual(uppercaseTransformation("hello"), "HELLO");
    assert.strictEqual(uppercaseTransformation("Zyoris Lead #42"), "ZYORIS LEAD #42");
  });

  await t.test("handles unicode and accented characters", () => {
    assert.strictEqual(uppercaseTransformation("münchen café"), "MÜNCHEN CAFÉ");
  });

  await t.test("handles null and empty input safely", () => {
    assert.strictEqual(uppercaseTransformation(null), "");
    assert.strictEqual(uppercaseTransformation(undefined), "");
    assert.strictEqual(uppercaseTransformation(""), "");
  });
});

test("LOWERCASE transformation", async (t) => {
  await t.test("converts uppercase and mixed case text to lowercase", () => {
    assert.strictEqual(lowercaseTransformation("USER@DOMAIN.COM"), "user@domain.com");
    assert.strictEqual(lowercaseTransformation("Zyoris Lead #42"), "zyoris lead #42");
  });

  await t.test("handles null and empty input safely", () => {
    assert.strictEqual(lowercaseTransformation(null), "");
    assert.strictEqual(lowercaseTransformation(undefined), "");
  });
});

test("PARSE_DATE transformation", async (t) => {
  await t.test("parses standard ISO date strings into ISO 8601", () => {
    const res = parseDateTransformation("2026-09-03T10:30:00.000Z");
    assert.strictEqual(res, "2026-09-03T10:30:00.000Z");
  });

  await t.test("formats dates to YYYY-MM-DD", () => {
    const res = parseDateTransformation("2026-09-03T15:00:00.000Z", { format: "YYYY-MM-DD" });
    assert.strictEqual(res, "2026-09-03");
  });

  await t.test("formats dates to MM/DD/YYYY", () => {
    const res = parseDateTransformation("2026-09-03T15:00:00.000Z", { format: "MM/DD/YYYY" });
    assert.strictEqual(res, "09/03/2026");
  });

  await t.test("formats dates to DD/MM/YYYY", () => {
    const res = parseDateTransformation("2026-09-03T15:00:00.000Z", { format: "DD/MM/YYYY" });
    assert.strictEqual(res, "03/09/2026");
  });

  await t.test("parses numeric unix timestamps in seconds and ms", () => {
    // 1700000000 -> 2023-11-14T22:13:20.000Z
    const resSec = parseDateTransformation("1700000000", { format: "YYYY-MM-DD" });
    assert.strictEqual(resSec, "2023-11-14");

    const resMs = parseDateTransformation("1700000000000", { format: "YYYY-MM-DD" });
    assert.strictEqual(resMs, "2023-11-14");
  });

  await t.test("gracefully returns original value on invalid date without crashing", () => {
    assert.strictEqual(parseDateTransformation("not-a-date"), "not-a-date");
    assert.strictEqual(parseDateTransformation(""), "");
    assert.strictEqual(parseDateTransformation(null), "");
  });
});

test("DEFAULT_VALUE transformation", async (t) => {
  await t.test("replaces null or undefined with fallback", () => {
    assert.strictEqual(defaultValueTransformation(null, "fallback"), "fallback");
    assert.strictEqual(defaultValueTransformation(undefined, "fallback"), "fallback");
  });

  await t.test("replaces empty string and whitespace-only string with fallback", () => {
    assert.strictEqual(defaultValueTransformation("", "N/A"), "N/A");
    assert.strictEqual(defaultValueTransformation("   ", "N/A"), "N/A");
  });

  await t.test("preserves non-empty string", () => {
    assert.strictEqual(defaultValueTransformation("Existing Value", "fallback"), "Existing Value");
  });

  await t.test("preserves valid numeric 0 and boolean false", () => {
    assert.strictEqual(defaultValueTransformation(0, "fallback"), "0");
    assert.strictEqual(defaultValueTransformation(false, "fallback"), "false");
  });
});

test("REGEX_REPLACE transformation", async (t) => {
  await t.test("replaces matching patterns globally", () => {
    const res = regexReplaceTransformation("abc 123 def 456", {
      pattern: "[0-9]+",
      replacement: "#",
      flags: "g",
    });
    assert.strictEqual(res, "abc # def #");
  });

  await t.test("supports capture group replacements", () => {
    const res = regexReplaceTransformation("Doe, John", {
      pattern: "([A-Za-z]+), ([A-Za-z]+)",
      replacement: "$2 $1",
    });
    assert.strictEqual(res, "John Doe");
  });

  await t.test("sanitizes dangerous regex flags and prevents crashes on malformed pattern", () => {
    // Malformed regex like unclosed parenthesis should not throw
    const res = regexReplaceTransformation("test", {
      pattern: "([a-z",
      replacement: "safe",
    });
    assert.strictEqual(res, "test");
  });
});

test("SPLIT transformation", async (t) => {
  await t.test("splits by delimiter and extracts specified index", () => {
    assert.strictEqual(splitTransformation("first middle last", { delimiter: " ", index: 0 }), "first");
    assert.strictEqual(splitTransformation("first middle last", { delimiter: " ", index: 1 }), "middle");
    assert.strictEqual(splitTransformation("first middle last", { delimiter: " ", index: 2 }), "last");
  });

  await t.test("returns empty string if index is out of bounds", () => {
    assert.strictEqual(splitTransformation("single", { delimiter: ",", index: 5 }), "");
  });
});

test("COMBINE transformation", async (t) => {
  await t.test("prepends prefix and appends suffix", () => {
    const res = combineTransformation("zyoris", { prefix: "https://", suffix: ".com" });
    assert.strictEqual(res, "https://zyoris.com");
  });

  await t.test("handles empty prefixes and suffixes", () => {
    const res = combineTransformation("lead", {});
    assert.strictEqual(res, "lead");
  });
});

test("PHONE_NORMALIZATION transformation", async (t) => {
  await t.test("strips non-digits and applies country code", () => {
    assert.strictEqual(phoneNormalizationTransformation("(555) 234-5678", { countryCode: "+1" }), "+15552345678");
  });

  await t.test("preserves existing E.164 country code with plus", () => {
    assert.strictEqual(phoneNormalizationTransformation("+44 20 7946 0919"), "+442079460919");
  });

  await t.test("handles empty values safely", () => {
    assert.strictEqual(phoneNormalizationTransformation(""), "");
    assert.strictEqual(phoneNormalizationTransformation(null), "");
  });
});

test("executeTransformation dispatch", async (t) => {
  await t.test("dispatches rule types correctly", () => {
    assert.strictEqual(executeTransformation("  test  ", { type: "TRIM" }), "test");
    assert.strictEqual(executeTransformation("test", { type: "UPPERCASE" }), "TEST");
    assert.strictEqual(executeTransformation("TEST", { type: "LOWERCASE" }), "test");
    assert.strictEqual(executeTransformation("", { type: "DEFAULT_VALUE", defaultValue: "def" }), "def");
    assert.strictEqual(executeTransformation("value", { type: "none" }), "value");
  });
});

test("executeTransformationPipeline multi-step trace", async (t) => {
  await t.test("executes pipeline sequentially with deterministic step traces", () => {
    const pipeline = executeTransformationPipeline("  alice smith  ", [
      { type: "TRIM" },
      { type: "UPPERCASE" },
      { type: "COMBINE", params: { prefix: "USER: " } },
    ]);

    assert.strictEqual(pipeline.originalValue, "  alice smith  ");
    assert.strictEqual(pipeline.transformedValue, "USER: ALICE SMITH");
    assert.strictEqual(pipeline.appliedRulesCount, 3);
    assert.strictEqual(pipeline.steps.length, 3);
    assert.strictEqual(pipeline.steps[0].output, "alice smith");
    assert.strictEqual(pipeline.steps[1].output, "ALICE SMITH");
    assert.strictEqual(pipeline.steps[2].output, "USER: ALICE SMITH");
  });
});

test("SECURITY & SANDBOX: ZERO arbitrary code execution path exists", async (t) => {
  await t.test("malicious injection strings are treated strictly as inert string literals", () => {
    const payloads = [
      "<script>alert('xss')</script>",
      "eval('process.exit(1)')",
      "new Function('return 42')()",
      "__proto__.polluted = true",
      "constructor.constructor('return this')()",
      "${process.mainModule.require('child_process').execSync('whoami')}",
      "'; DROP TABLE leads; --",
    ];

    for (const payload of payloads) {
      // 1. Run through TRIM
      const trimmed = trimTransformation(payload);
      assert.strictEqual(typeof trimmed, "string");
      assert.strictEqual(trimmed, payload.trim());

      // 2. Run through UPPERCASE
      const upper = uppercaseTransformation(payload);
      assert.strictEqual(typeof upper, "string");
      assert.strictEqual(upper, payload.toUpperCase());

      // 3. Run through REGEX_REPLACE
      const replaced = regexReplaceTransformation(payload, {
        pattern: "alert",
        replacement: "neutralized",
      });
      assert.strictEqual(typeof replaced, "string");

      // 4. Run through complete pipeline
      const pipeline = executeTransformationPipeline(payload, [
        { type: "TRIM" },
        { type: "UPPERCASE" },
      ]);
      assert.strictEqual(pipeline.appliedRulesCount, 2);
      assert.strictEqual(typeof pipeline.transformedValue, "string");
    }

    // Verify global prototype was not polluted
    assert.strictEqual((Object.prototype as any).polluted, undefined);
  });
});

test("DAY 9: Multi-Rule Pipeline Reordering & Sequence Sensitivity", async (t) => {
  await t.test("rule execution order changes final output deterministically", () => {
    // Pipeline A: DEFAULT_VALUE then UPPERCASE
    const pipelineA = executeTransformationPipeline("", [
      { type: "DEFAULT_VALUE", params: { defaultValue: "fallback_status" } },
      { type: "UPPERCASE" },
    ]);
    assert.strictEqual(pipelineA.transformedValue, "FALLBACK_STATUS");
    assert.strictEqual(pipelineA.steps[0].output, "fallback_status");
    assert.strictEqual(pipelineA.steps[1].output, "FALLBACK_STATUS");

    // Pipeline B: UPPERCASE then DEFAULT_VALUE (with mixed case default)
    const pipelineB = executeTransformationPipeline("", [
      { type: "UPPERCASE" },
      { type: "DEFAULT_VALUE", params: { defaultValue: "fallback_status" } },
    ]);
    // Since input was empty, UPPERCASE on "" is "", so DEFAULT_VALUE applies afterwards
    assert.strictEqual(pipelineB.transformedValue, "fallback_status");
  });

  await t.test("reordering TRIM and REGEX_REPLACE affects anchor match patterns", () => {
    // Pipeline A: TRIM first, then match ^hello
    const pipelineA = executeTransformationPipeline("  hello world  ", [
      { type: "TRIM" },
      { type: "REGEX_REPLACE", params: { pattern: "^hello", replacement: "greetings" } },
    ]);
    assert.strictEqual(pipelineA.transformedValue, "greetings world");

    // Pipeline B: REGEX_REPLACE first (^hello does NOT match due to leading spaces), then TRIM
    const pipelineB = executeTransformationPipeline("  hello world  ", [
      { type: "REGEX_REPLACE", params: { pattern: "^hello", replacement: "greetings" } },
      { type: "TRIM" },
    ]);
    assert.strictEqual(pipelineB.transformedValue, "hello world");
  });
});

test("DAY 9: Backend-Approved Operations Conformity (POST /integrations/{id}/transform/preview)", async (t) => {
  const approvedTypes = ["TRIM", "UPPERCASE", "LOWERCASE", "PARSE_DATE", "DEFAULT_VALUE", "REGEX_REPLACE"] as const;

  await t.test("all 6 backend-approved operations succeed in execution trace", () => {
    const trace = executeTransformationPipeline(" 2026-09-03 ", [
      { type: "TRIM" },
      { type: "PARSE_DATE", params: { format: "YYYY-MM-DD" } },
      { type: "DEFAULT_VALUE", params: { defaultValue: "2026-01-01" } },
      { type: "REGEX_REPLACE", params: { pattern: "-", replacement: "/" } },
      { type: "UPPERCASE" },
      { type: "LOWERCASE" },
    ]);

    assert.strictEqual(trace.steps.length, 6);
    assert.strictEqual(trace.appliedRulesCount, 6);
    assert.strictEqual(trace.transformedValue, "2026/09/03");
    for (const step of trace.steps) {
      assert.strictEqual(step.success, true);
    }
  });

  await t.test("gracefully isolates malformed regex syntax error in step trace without process crash", () => {
    // Malformed regex syntax: unclosed parenthesis
    const trace = executeTransformationPipeline("test string", [
      { type: "REGEX_REPLACE", params: { pattern: "(unclosed", replacement: "fixed" } },
      { type: "UPPERCASE" },
    ]);

    assert.strictEqual(trace.steps.length, 2);
    // Regex step safely handled without crashing pipeline
    assert.strictEqual(trace.transformedValue, "TEST STRING");
  });
});
