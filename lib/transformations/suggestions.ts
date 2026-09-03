/**
 * Mapping Suggestions and Confidence Engine
 * Computes, consumes, and manages intelligent field mapping suggestions,
 * confidence scoring, and strict required-field validation safeguards.
 */

import type {
  TargetFieldDefinition,
  DiscoveredField,
  MappingTransformation,
  IntegrationMapping,
  FieldMapping,
} from "../../types/integrations.ts";

export interface FlatSourceFieldCandidate {
  path?: string;
  name?: string;
  type?: string;
  label?: string;
  required?: boolean;
  sampleValue?: any;
  description?: string;
}

export type ConfidenceTier = "high" | "medium" | "low";

export interface SuggestedMapping {
  targetFieldKey: string;
  sourceFieldPath: string;
  sourceType?: string;
  targetType?: string;
  confidence: number; // 0.0 to 1.0 (percentage: 0 - 100%)
  confidenceTier: ConfidenceTier;
  reason: string;
  transformation?: MappingTransformation;
  defaultValue?: any;
  status: "SUGGESTED" | "CONFIRMED" | "REJECTED";
  isConfirmed?: boolean;
}

export interface FieldAcceptanceResult {
  canAccept: boolean;
  error?: string;
  reason?: string;
}

/**
 * Common semantic alias dictionary for cross-provider mapping inference.
 */
const SEMANTIC_ALIASES: Record<string, string[]> = {
  name: ["fullname", "full_name", "contactname", "contact_name", "displayname", "display_name", "title"],
  firstname: ["first_name", "fname", "givenname", "given_name", "forename"],
  lastname: ["last_name", "lname", "surname", "familyname", "family_name"],
  email: ["emailaddress", "email_address", "mail", "contact_email", "primary_email", "work_email"],
  phone: ["phonenumber", "phone_number", "telephone", "mobile", "cell", "tel", "contact_phone", "work_phone"],
  company: ["companyname", "company_name", "organization", "org_name", "account", "account_name", "business"],
  companyname: ["company", "organization", "org_name", "account", "account_name", "business"],
  value: ["amount", "deal_value", "price", "revenue", "cost", "total", "budget"],
  amount: ["value", "deal_value", "price", "revenue", "cost", "total", "budget"],
  title: ["deal_title", "dealname", "deal_name", "opportunity_name", "name"],
  closedate: ["close_date", "expected_close", "closing_date", "target_date", "due_date"],
  stage: ["pipeline_stage", "deal_stage", "status", "phase", "state"],
  status: ["lead_status", "stage", "state", "current_status"],
  notes: ["description", "comments", "summary", "details", "message", "body"],
  description: ["notes", "comments", "summary", "details", "message", "body"],
  domain: ["website", "url", "web_address", "site"],
  industry: ["sector", "vertical", "business_type", "category"],
  size: ["employees", "employee_count", "headcount", "company_size", "team_size"],
  city: ["locality", "town", "metro"],
  country: ["nation", "country_code", "location_country"],
  jobtitle: ["job_title", "role", "designation", "position", "occupation"],
  department: ["dept", "division", "team", "business_unit"],
  source: ["lead_source", "campaign", "channel", "medium", "origin"],
  id: ["record_id", "external_id", "source_id", "lead_id", "uid"],
};

/**
 * Normalizes text for similarity comparison.
 */
export function normalizeIdentifier(value: string): string {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Evaluates match confidence between a target field and candidate source field.
 */
export function calculateMatchConfidence(
  targetField: TargetFieldDefinition,
  sourceField: FlatSourceFieldCandidate | DiscoveredField
): { confidence: number; tier: ConfidenceTier; reason: string } {
  const targetKeyNorm = normalizeIdentifier(targetField.key);
  const targetLabelNorm = normalizeIdentifier(targetField.label);

  const sourceName = sourceField.name || "";
  const sourcePath = sourceField.path || sourceName;
  const sourceNameNorm = normalizeIdentifier(sourceName);
  const sourcePathNorm = normalizeIdentifier(sourcePath);

  // 1. Exact Key or Path match -> 0.98 - 1.0 (High)
  if (sourceNameNorm === targetKeyNorm || sourcePathNorm === targetKeyNorm) {
    return {
      confidence: 0.98,
      tier: "high",
      reason: "Exact field key match",
    };
  }

  // 2. Exact Label match -> 0.95 (High)
  if (sourceNameNorm === targetLabelNorm || sourcePathNorm === targetLabelNorm) {
    return {
      confidence: 0.95,
      tier: "high",
      reason: `Exact label match '${targetField.label}'`,
    };
  }

  // 3. Path suffix match (e.g. data.contact.email matching email) -> 0.90 (High)
  if (sourcePath.toLowerCase().endsWith(`.${targetKeyNorm}`) || sourcePath.toLowerCase().endsWith(`_${targetKeyNorm}`)) {
    return {
      confidence: 0.90,
      tier: "high",
      reason: `Nested path match '...${targetField.key}'`,
    };
  }

  // 4. Semantic alias dictionary match -> 0.85 - 0.88 (High)
  const aliases = SEMANTIC_ALIASES[targetKeyNorm] || [];
  for (const alias of aliases) {
    const aliasNorm = normalizeIdentifier(alias);
    if (sourceNameNorm === aliasNorm || sourcePathNorm.endsWith(aliasNorm)) {
      return {
        confidence: 0.88,
        tier: "high",
        reason: `Semantic alias match '${alias}'`,
      };
    }
  }

  // 5. Substring containment -> 0.70 - 0.75 (Medium)
  if (
    (targetKeyNorm.length >= 3 && sourceNameNorm.includes(targetKeyNorm)) ||
    (sourceNameNorm.length >= 3 && targetKeyNorm.includes(sourceNameNorm))
  ) {
    return {
      confidence: 0.72,
      tier: "medium",
      reason: "Sub-token name similarity",
    };
  }

  // 6. Type compatibility check if label or partial word overlaps -> 0.50 (Low)
  const targetType = (targetField.type || "string").toLowerCase();
  const sourceType = (sourceField.type || "string").toLowerCase();
  if (targetType === sourceType && (sourceNameNorm.includes(targetLabelNorm.substring(0, 3)))) {
    return {
      confidence: 0.55,
      tier: "low",
      reason: "Partial token and compatible data type",
    };
  }

  return {
    confidence: 0,
    tier: "low",
    reason: "No significant correlation detected",
  };
}

/**
 * Generates automated mapping suggestions for a list of target fields from discovered source fields.
 */
export function generateMappingSuggestions(
  targetFields: TargetFieldDefinition[],
  sourceFields: (FlatSourceFieldCandidate | DiscoveredField)[],
  existingMappings?: Record<string, { sourceField?: string; isConfirmed?: boolean; status?: string }>
): SuggestedMapping[] {
  const suggestions: SuggestedMapping[] = [];

  for (const tf of targetFields) {
    // If field is already explicitly user-confirmed, keep that status
    const existing = existingMappings?.[tf.key];
    if (existing?.isConfirmed && existing.sourceField) {
      suggestions.push({
        targetFieldKey: tf.key,
        sourceFieldPath: existing.sourceField,
        targetType: tf.type,
        confidence: 1.0,
        confidenceTier: "high",
        reason: "User confirmed mapping",
        status: "CONFIRMED",
        isConfirmed: true,
      });
      continue;
    }

    // Find best source candidate
    let bestCandidate: (FlatSourceFieldCandidate | DiscoveredField) | null = null;
    let bestScore = 0;
    let bestReason = "";
    let bestTier: ConfidenceTier = "low";

    for (const sf of sourceFields) {
      const match = calculateMatchConfidence(tf, sf);
      if (match.confidence > bestScore && match.confidence >= 0.60) {
        bestScore = match.confidence;
        bestReason = match.reason;
        bestTier = match.tier;
        bestCandidate = sf;
      }
    }

    if (bestCandidate && bestScore >= 0.60) {
      const sourcePath = bestCandidate.path || bestCandidate.name || "";
      const isAlreadyMapped = existing?.sourceField === sourcePath;

      suggestions.push({
        targetFieldKey: tf.key,
        sourceFieldPath: sourcePath,
        sourceType: bestCandidate.type,
        targetType: tf.type,
        confidence: bestScore,
        confidenceTier: bestTier,
        reason: bestReason,
        status: isAlreadyMapped && existing?.isConfirmed ? "CONFIRMED" : "SUGGESTED",
        isConfirmed: isAlreadyMapped && existing?.isConfirmed,
      });
    }
  }

  return suggestions;
}

/**
 * Strictly ensures required fields cannot be silently accepted without valid mapping
 * or explicit supported default handling.
 */
export function validateFieldAcceptance(
  targetField: TargetFieldDefinition,
  mappingCandidate?: {
    sourceFieldPath?: string;
    transformation?: MappingTransformation;
    defaultValue?: any;
  } | null,
  availableSourceFieldPaths?: string[]
): FieldAcceptanceResult {
  const isRequired = !!targetField.required;

  // Non-required fields can always be accepted or cleared
  if (!isRequired) {
    return { canAccept: true };
  }

  // Required Field Checks:
  const sourcePath = mappingCandidate?.sourceFieldPath?.trim();
  const hasSourceField = !!sourcePath;

  // Verify source field exists if source paths are provided
  const isSourceFieldValid =
    hasSourceField &&
    (!availableSourceFieldPaths || availableSourceFieldPaths.length === 0 || availableSourceFieldPaths.includes(sourcePath));

  // Explicit supported default value handling
  const defaultVal =
    mappingCandidate?.defaultValue !== undefined && mappingCandidate?.defaultValue !== null
      ? String(mappingCandidate.defaultValue).trim()
      : "";

  const hasExplicitDefault =
    defaultVal !== "" ||
    (mappingCandidate?.transformation?.type === "DEFAULT_VALUE" &&
      Boolean(mappingCandidate?.transformation?.defaultValue?.trim()));

  if (isSourceFieldValid || hasExplicitDefault) {
    return {
      canAccept: true,
      reason: isSourceFieldValid ? "Mapped to valid source field" : "Configured with explicit default value fallback",
    };
  }

  return {
    canAccept: false,
    error: `Required field '${targetField.label || targetField.key}' cannot be accepted without a valid source mapping or an explicit default fallback value.`,
    reason: "Missing required source mapping and default value",
  };
}

/**
 * Merge backend-returned active mappings (which might include confidence or status)
 * with frontend-inferred suggested mappings.
 */
export function mergeBackendMappingsWithSuggestions(
  backendMappings: (IntegrationMapping | FieldMapping)[],
  inferredSuggestions: SuggestedMapping[],
  targetFields: TargetFieldDefinition[]
): Record<string, SuggestedMapping> {
  const result: Record<string, SuggestedMapping> = {};

  // 1. Seed with inferred suggestions
  for (const s of inferredSuggestions) {
    result[s.targetFieldKey] = { ...s };
  }

  // 2. Overlay backend mappings
  for (const bm of backendMappings) {
    const targetKey = bm.targetField;
    if (!targetKey) continue;

    const targetDef = targetFields.find((tf) => tf.key === targetKey);
    const backendConfidence = typeof bm.confidence === "number" ? bm.confidence : undefined;

    const tier: ConfidenceTier =
      backendConfidence !== undefined
        ? backendConfidence >= 0.8
          ? "high"
          : backendConfidence >= 0.6
          ? "medium"
          : "low"
        : "high";

    const backendObj = bm as any;
    const isExplicitlyConfirmed =
      bm.status === "ACTIVE" || bm.status === "CONFIRMED" || !backendObj.isSuggested;

    result[targetKey] = {
      targetFieldKey: targetKey,
      sourceFieldPath: bm.sourceField,
      sourceType: backendObj.sourceType,
      targetType: targetDef?.type,
      confidence: backendConfidence ?? 1.0,
      confidenceTier: tier,
      reason: backendObj.isSuggested ? "Backend suggested mapping" : "Persisted integration mapping",
      status: isExplicitlyConfirmed ? "CONFIRMED" : "SUGGESTED",
      isConfirmed: isExplicitlyConfirmed,
      defaultValue: backendObj.defaultValue || (typeof bm.transformation === "object" ? (bm.transformation as any)?.defaultValue : undefined),
      transformation: typeof bm.transformation === "object" ? bm.transformation : undefined,
    };
  }

  return result;
}
