import test from "node:test";
import assert from "node:assert/strict";

// Response parsing helper for Lead Score
export function parseScoreResponse(rawResponse: any) {
  const data = rawResponse?.data ?? rawResponse ?? {};
  return {
    score: typeof data.score === "number" ? data.score : 0,
    confidence: typeof data.confidence === "number" ? data.confidence : 0,
    scoringReasons: Array.isArray(data.scoringReasons) ? data.scoringReasons : [],
    scoringFactors: Array.isArray(data.scoringFactors) ? data.scoringFactors : [],
    ...data,
  };
}

// Response parsing helper for Lead Route
export function parseRouteResponse(rawResponse: any) {
  const data = rawResponse?.data ?? rawResponse ?? {};
  return {
    success: Boolean(data.success ?? data.assignedToId),
    assignedToId: data.assignedToId || undefined,
    assignedToName: data.assignedToName || undefined,
    strategy: data.strategy || "AI_RECOMMENDATION",
    message: data.message || "Lead routed successfully",
    ...data,
  };
}

// Response parsing helper for Lead Enrichment
export function parseEnrichmentResponse(rawResponse: any) {
  const data = rawResponse?.data ?? rawResponse ?? {};
  return {
    success: Boolean(data.success ?? data.enrichedFieldsCount ?? data.fields),
    leadId: data.leadId || "",
    organizationId: data.organizationId || "",
    provider: data.provider || "default",
    enrichedFieldsCount: typeof data.enrichedFieldsCount === "number" ? data.enrichedFieldsCount : Object.keys(data.fields || {}).length,
    fields: data.fields || {},
    skippedUserOverrides: Array.isArray(data.skippedUserOverrides) ? data.skippedUserOverrides : [],
    fetchedAt: data.fetchedAt || new Date().toISOString(),
    ...data,
  };
}

// Response parsing helper for Lead Qualification
export function parseQualifyResponse(rawResponse: any) {
  const data = rawResponse?.data ?? rawResponse ?? {};
  return {
    success: Boolean(data.success ?? data.status ?? data.fitScore),
    status: data.status || (data.fitScore >= 70 ? "QUALIFIED" : "REVIEW_NEEDED"),
    score: typeof data.score === "number" ? data.score : data.fitScore || 0,
    fitScore: typeof data.fitScore === "number" ? data.fitScore : 0,
    intentScore: typeof data.intentScore === "number" ? data.intentScore : 0,
    engagementScore: typeof data.engagementScore === "number" ? data.engagementScore : 0,
    intentLevel: data.intentLevel || "MEDIUM",
    timing: data.timing || "IMMEDIATE",
    riskFactors: Array.isArray(data.riskFactors) ? data.riskFactors : [],
    confidence: typeof data.confidence === "number" ? data.confidence : 0.8,
    reasons: data.reasons || [],
    evidence: Array.isArray(data.evidence) ? data.evidence : [],
    ...data,
  };
}

test("1. Lead Score API Response Parsing (POST /leads/:id/score)", () => {
  const sampleBackendResponse = {
    score: 85,
    confidence: 90,
    scoringReasons: ["High budget", "Decision maker identified"],
  };
  const parsed = parseScoreResponse(sampleBackendResponse);
  assert.equal(parsed.score, 85);
  assert.equal(parsed.confidence, 90);
  assert.equal(parsed.scoringReasons.length, 2);
  assert.equal(parsed.scoringReasons[0], "High budget");
});

test("2. Lead Route API Response Parsing (POST /leads/:id/route)", () => {
  const sampleBackendResponse = {
    success: true,
    assignedToId: "usr_999",
    assignedToName: "Alex Rivera",
    strategy: "ROUND_ROBIN",
    message: "Assigned to Alex Rivera",
  };
  const parsed = parseRouteResponse(sampleBackendResponse);
  assert.equal(parsed.success, true);
  assert.equal(parsed.assignedToId, "usr_999");
  assert.equal(parsed.assignedToName, "Alex Rivera");
  assert.equal(parsed.strategy, "ROUND_ROBIN");
});

test("3. Lead Enrichment API Response Parsing (POST /leads/:id/enrichment)", () => {
  const sampleBackendResponse = {
    success: true,
    data: {
      leadId: "lead_123",
      organizationId: "org_456",
      provider: "clearbit",
      enrichedFieldsCount: 3,
      fields: {
        company: "Acme Inc",
        industry: "Software",
        employees: "250",
      },
      skippedUserOverrides: [],
      fetchedAt: "2026-09-16T12:00:00Z",
    },
  };
  const parsed = parseEnrichmentResponse(sampleBackendResponse);
  assert.equal(parsed.success, true);
  assert.equal(parsed.leadId, "lead_123");
  assert.equal(parsed.provider, "clearbit");
  assert.equal(parsed.enrichedFieldsCount, 3);
  assert.equal(parsed.fields.company, "Acme Inc");
});

test("4. Lead Qualify API Response Parsing (POST /leads/:id/qualify)", () => {
  const sampleBackendResponse = {
    fitScore: 85,
    intentLevel: "HIGH",
    timing: "IMMEDIATE",
    riskFactors: ["Budget constraint"],
    confidence: 0.9,
    reasons: "Strong match with ICP",
  };
  const parsed = parseQualifyResponse(sampleBackendResponse);
  assert.equal(parsed.status, "QUALIFIED");
  assert.equal(parsed.fitScore, 85);
  assert.equal(parsed.intentLevel, "HIGH");
  assert.equal(parsed.timing, "IMMEDIATE");
  assert.equal(parsed.confidence, 0.9);
  assert.equal(parsed.riskFactors.length, 1);
});

test("5. Error fallback handling across all 4 APIs", () => {
  assert.equal(parseScoreResponse(null).score, 0);
  assert.equal(parseRouteResponse({ error: "SERVICE_UNAVAILABLE" }).success, false);
  assert.equal(parseEnrichmentResponse({}).provider, "default");
  assert.equal(parseQualifyResponse({ fitScore: 40 }).status, "REVIEW_NEEDED");
});
