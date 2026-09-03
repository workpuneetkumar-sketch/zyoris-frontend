import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateMatchConfidence,
  generateMappingSuggestions,
  validateFieldAcceptance,
  mergeBackendMappingsWithSuggestions,
  normalizeIdentifier,
} from "../lib/transformations/suggestions.ts";
import type { TargetFieldDefinition } from "../types/integrations.ts";

test("normalizeIdentifier", async (t) => {
  await t.test("cleans symbols, spaces and converts to lowercase", () => {
    assert.strictEqual(normalizeIdentifier("First Name"), "firstname");
    assert.strictEqual(normalizeIdentifier("lead_email_address!"), "leademailaddress");
    assert.strictEqual(normalizeIdentifier("data.contact[0].phone"), "datacontact0phone");
  });
});

test("calculateMatchConfidence scoring algorithm", async (t) => {
  await t.test("scores exact key matches with high confidence (>= 0.95)", () => {
    const target: TargetFieldDefinition = { key: "email", label: "Email Address", type: "string" };
    const source = { name: "email", path: "email", type: "string" };

    const match = calculateMatchConfidence(target, source);
    assert.strictEqual(match.tier, "high");
    assert.ok(match.confidence >= 0.95, `Expected >= 0.95, got ${match.confidence}`);
  });

  await t.test("scores exact label matches with high confidence", () => {
    const target: TargetFieldDefinition = { key: "name", label: "Full Name", type: "string" };
    const source = { name: "Full Name", path: "Full Name", type: "string" };

    const match = calculateMatchConfidence(target, source);
    assert.strictEqual(match.tier, "high");
    assert.ok(match.confidence >= 0.95, `Expected >= 0.95, got ${match.confidence}`);
  });

  await t.test("scores semantic aliases with high confidence (e.g. email_address -> email)", () => {
    const target: TargetFieldDefinition = { key: "email", label: "Email Address", type: "string" };
    const source = { name: "email_address", path: "user.email_address", type: "string" };

    const match = calculateMatchConfidence(target, source);
    assert.strictEqual(match.tier, "high");
    assert.ok(match.confidence >= 0.85, `Expected >= 0.85, got ${match.confidence}`);
  });

  await t.test("scores nested path suffix matches with high confidence (e.g. data.lead.phone -> phone)", () => {
    const target: TargetFieldDefinition = { key: "phone", label: "Phone", type: "string" };
    const source = { name: "phone", path: "data.lead.phone", type: "string" };

    const match = calculateMatchConfidence(target, source);
    assert.strictEqual(match.tier, "high");
    assert.ok(match.confidence >= 0.90, `Expected >= 0.90, got ${match.confidence}`);
  });

  await t.test("scores sub-token similarity with medium confidence", () => {
    const target: TargetFieldDefinition = { key: "company", label: "Company", type: "string" };
    const source = { name: "company_registration", path: "company_registration", type: "string" };

    const match = calculateMatchConfidence(target, source);
    assert.strictEqual(match.tier, "medium");
    assert.ok(match.confidence >= 0.65, `Expected >= 0.65, got ${match.confidence}`);
  });

  await t.test("scores completely unrelated fields as low/zero confidence", () => {
    const target: TargetFieldDefinition = { key: "email", label: "Email Address", type: "string" };
    const source = { name: "postal_zip", path: "postal_zip", type: "string" };

    const match = calculateMatchConfidence(target, source);
    assert.strictEqual(match.confidence, 0);
  });
});

test("REQUIRED FIELD VALIDATION: Silent acceptance prevention", async (t) => {
  const requiredTarget: TargetFieldDefinition = {
    key: "name",
    label: "Full Name",
    type: "string",
    required: true,
  };

  const optionalTarget: TargetFieldDefinition = {
    key: "notes",
    label: "Notes",
    type: "string",
    required: false,
  };

  await t.test("allows non-required fields to be accepted without source field or default", () => {
    const result = validateFieldAcceptance(optionalTarget, {
      sourceFieldPath: "",
    });
    assert.strictEqual(result.canAccept, true);
  });

  await t.test("blocks required field without source mapping and without default value", () => {
    const result = validateFieldAcceptance(requiredTarget, {
      sourceFieldPath: "",
      defaultValue: "",
    });
    assert.strictEqual(result.canAccept, false);
    assert.ok(result.error?.includes("cannot be accepted without a valid source mapping"));
  });

  await t.test("allows required field with valid source mapping", () => {
    const result = validateFieldAcceptance(
      requiredTarget,
      { sourceFieldPath: "customer.full_name" },
      ["customer.full_name", "customer.email"]
    );
    assert.strictEqual(result.canAccept, true);
  });

  await t.test("allows required field with explicit default fallback value", () => {
    const result = validateFieldAcceptance(requiredTarget, {
      sourceFieldPath: "",
      defaultValue: "Unknown Lead",
    });
    assert.strictEqual(result.canAccept, true);
    assert.strictEqual(result.reason, "Configured with explicit default value fallback");
  });

  await t.test("allows required field with DEFAULT_VALUE transformation", () => {
    const result = validateFieldAcceptance(requiredTarget, {
      sourceFieldPath: "",
      transformation: {
        type: "DEFAULT_VALUE",
        defaultValue: "Default Organization",
      },
    });
    assert.strictEqual(result.canAccept, true);
  });
});

test("generateMappingSuggestions", async (t) => {
  const targetFields: TargetFieldDefinition[] = [
    { key: "name", label: "Full Name", type: "string", required: true },
    { key: "email", label: "Email Address", type: "string", required: true },
    { key: "phone", label: "Phone", type: "string", required: false },
  ];

  const sourceFields = [
    { name: "full_name", path: "user.full_name", type: "string" },
    { name: "email_address", path: "user.email_address", type: "string" },
    { name: "zip_code", path: "address.zip_code", type: "string" },
  ];

  await t.test("automatically matches fields and populates confidence and tier", () => {
    const suggestions = generateMappingSuggestions(targetFields, sourceFields);

    assert.strictEqual(suggestions.length, 2);

    const nameSugg = suggestions.find((s) => s.targetFieldKey === "name");
    assert.ok(nameSugg);
    assert.strictEqual(nameSugg?.sourceFieldPath, "user.full_name");
    assert.strictEqual(nameSugg?.status, "SUGGESTED");
    assert.strictEqual(nameSugg?.confidenceTier, "high");

    const emailSugg = suggestions.find((s) => s.targetFieldKey === "email");
    assert.ok(emailSugg);
    assert.strictEqual(emailSugg?.sourceFieldPath, "user.email_address");
    assert.strictEqual(emailSugg?.confidenceTier, "high");
  });

  await t.test("preserves existing confirmed mappings", () => {
    const existing = {
      name: { sourceField: "custom.name", isConfirmed: true, status: "CONFIRMED" },
    };

    const suggestions = generateMappingSuggestions(targetFields, sourceFields, existing);
    const nameSugg = suggestions.find((s) => s.targetFieldKey === "name");
    assert.ok(nameSugg);
    assert.strictEqual(nameSugg?.sourceFieldPath, "custom.name");
    assert.strictEqual(nameSugg?.status, "CONFIRMED");
    assert.strictEqual(nameSugg?.isConfirmed, true);
  });
});

test("mergeBackendMappingsWithSuggestions", async (t) => {
  const targetFields: TargetFieldDefinition[] = [
    { key: "name", label: "Full Name", type: "string", required: true },
    { key: "email", label: "Email Address", type: "string", required: true },
  ];

  const inferred = [
    {
      targetFieldKey: "email",
      sourceFieldPath: "inferred.email",
      confidence: 0.95,
      confidenceTier: "high" as const,
      reason: "Exact match",
      status: "SUGGESTED" as const,
    },
  ];

  const backend = [
    {
      targetField: "name",
      sourceField: "backend.full_name",
      confidence: 0.99,
      status: "ACTIVE" as const,
    },
  ];

  await t.test("combines backend mappings and inferred suggestions", () => {
    const merged = mergeBackendMappingsWithSuggestions(backend as any, inferred, targetFields);

    assert.ok(merged.email);
    assert.strictEqual(merged.email.sourceFieldPath, "inferred.email");
    assert.strictEqual(merged.email.status, "SUGGESTED");

    assert.ok(merged.name);
    assert.strictEqual(merged.name.sourceFieldPath, "backend.full_name");
    assert.strictEqual(merged.name.status, "CONFIRMED");
    assert.strictEqual(merged.name.confidence, 0.99);
  });
});
