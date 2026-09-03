/**
 * Zyoris Transformation Engine
 * Pure, deterministic, sandboxed transformation execution layer.
 * Strictly guarantees ZERO arbitrary code execution paths.
 */

import type {
  TransformationRuleType,
  MappingTransformation,
  TransformationRuleItem,
  TransformationStepTrace,
} from "../../types/integrations.ts";

/**
 * Sanitizes regex flags to prevent unexpected behavior.
 */
function sanitizeRegexFlags(flags?: string): string {
  if (!flags) return "g";
  const allowed = new Set(["g", "i", "m", "s", "u"]);
  const filtered = flags
    .split("")
    .filter((f) => allowed.has(f))
    .join("");
  // Ensure unique flags
  return Array.from(new Set(filtered.split(""))).join("") || "g";
}

/**
 * Safely converts any input value to string without invoking user-controlled methods.
 */
export function safeString(value: any): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? "" : value.toISOString();
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "[Object]";
    }
  }
  return String(value);
}

/**
 * TRIM: Strips leading and trailing whitespace.
 */
export function trimTransformation(value: any): string {
  return safeString(value).trim();
}

/**
 * UPPERCASE: Converts string to uppercase.
 */
export function uppercaseTransformation(value: any): string {
  return safeString(value).toUpperCase();
}

/**
 * LOWERCASE: Converts string to lowercase.
 */
export function lowercaseTransformation(value: any): string {
  return safeString(value).toLowerCase();
}

/**
 * PARSE_DATE: Formats valid date/time strings into ISO 8601 or requested format.
 * Gracefully returns original value if invalid date.
 */
export function parseDateTransformation(
  value: any,
  config?: { format?: string; timezone?: string }
): string {
  const str = safeString(value).trim();
  if (!str) return "";

  // Support numeric timestamps (ms or seconds)
  const isNumeric = /^\d+$/.test(str);
  const date = isNumeric
    ? new Date(str.length <= 10 ? parseInt(str, 10) * 1000 : parseInt(str, 10))
    : new Date(str);

  if (isNaN(date.getTime())) {
    return str; // Return original string without crashing
  }

  const format = (config?.format || "ISO_8601").toUpperCase();

  if (format === "YYYY-MM-DD") {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  if (format === "MM/DD/YYYY") {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${month}/${day}/${year}`;
  }

  if (format === "DD/MM/YYYY") {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${day}/${month}/${year}`;
  }

  return date.toISOString();
}

/**
 * DEFAULT_VALUE: If input is null, undefined, or empty/whitespace-only, returns defaultValue.
 */
export function defaultValueTransformation(value: any, defaultValue: any): string {
  if (value === null || value === undefined) {
    return safeString(defaultValue);
  }
  const str = safeString(value);
  if (str.trim() === "") {
    return safeString(defaultValue);
  }
  return str;
}

/**
 * REGEX_REPLACE: Executes regular expression replacement safely with strict validation.
 * Guaranteed no arbitrary execution paths.
 */
export function regexReplaceTransformation(
  value: any,
  config?: { pattern?: string; replacement?: string; flags?: string }
): string {
  const str = safeString(value);
  if (!config?.pattern) {
    return str;
  }

  try {
    const flags = sanitizeRegexFlags(config.flags);
    const regex = new RegExp(config.pattern, flags);
    const replacement = config.replacement !== undefined ? String(config.replacement) : "";
    return str.replace(regex, replacement);
  } catch {
    // Malformed regex pattern is handled gracefully without crashing
    return str;
  }
}

/**
 * SPLIT: Splits string by delimiter and returns the element at specified index.
 */
export function splitTransformation(
  value: any,
  config?: { delimiter?: string; index?: number }
): string {
  const str = safeString(value);
  const delimiter = config?.delimiter ?? " ";
  const index = Math.max(0, config?.index ?? 0);

  const parts = str.split(delimiter);
  if (index >= parts.length) {
    return "";
  }
  return parts[index] ?? "";
}

/**
 * COMBINE: Prepends prefix and appends suffix to value.
 */
export function combineTransformation(
  value: any,
  config?: { prefix?: string; suffix?: string; delimiter?: string }
): string {
  const str = safeString(value);
  const prefix = config?.prefix ? String(config.prefix) : "";
  const suffix = config?.suffix ? String(config.suffix) : "";
  return `${prefix}${str}${suffix}`;
}

/**
 * PHONE_NORMALIZATION: Strips non-digit formatting characters and standardizes phone number.
 */
export function phoneNormalizationTransformation(
  value: any,
  config?: { countryCode?: string }
): string {
  const str = safeString(value).trim();
  if (!str) return "";

  const defaultCountry = (config?.countryCode || "+1").trim();
  const digits = str.replace(/[^\d+]/g, "");

  if (digits.startsWith("+")) {
    return digits;
  }

  // Prepend country code if missing
  const cleanPrefix = defaultCountry.startsWith("+") ? defaultCountry : `+${defaultCountry}`;
  return `${cleanPrefix}${digits}`;
}

/**
 * Execute a single mapping transformation rule.
 */
export function executeTransformation(
  value: any,
  transformation?: MappingTransformation | { type: TransformationRuleType; config?: any; defaultValue?: any }
): string {
  if (!transformation || transformation.type === "none") {
    return safeString(value);
  }

  switch (transformation.type) {
    case "TRIM":
      return trimTransformation(value);
    case "UPPERCASE":
      return uppercaseTransformation(value);
    case "LOWERCASE":
      return lowercaseTransformation(value);
    case "PARSE_DATE":
      return parseDateTransformation(value, transformation.config);
    case "DEFAULT_VALUE":
      return defaultValueTransformation(
        value,
        transformation.defaultValue ?? transformation.config?.defaultValue
      );
    case "REGEX_REPLACE":
      return regexReplaceTransformation(value, transformation.config);
    case "SPLIT":
      return splitTransformation(value, transformation.config);
    case "COMBINE":
      return combineTransformation(value, transformation.config);
    case "PHONE_NORMALIZATION":
      return phoneNormalizationTransformation(value, transformation.config);
    default:
      return safeString(value);
  }
}

/**
 * Sequential multi-step transformation pipeline with execution tracing.
 */
export function executeTransformationPipeline(
  value: any,
  rules: TransformationRuleItem[]
): {
  originalValue: string;
  transformedValue: string;
  steps: TransformationStepTrace[];
  appliedRulesCount: number;
} {
  const original = safeString(value);
  let current = original;
  const steps: TransformationStepTrace[] = [];

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    try {
      current = executeTransformation(current, {
        type: rule.type,
        config: rule.params,
        defaultValue: rule.params?.defaultValue,
      });
      steps.push({
        ruleIndex: i,
        ruleType: rule.type,
        output: current,
        success: true,
      });
    } catch (err: any) {
      steps.push({
        ruleIndex: i,
        ruleType: rule.type,
        output: current,
        success: false,
        error: err?.message || "Execution error",
      });
    }
  }

  return {
    originalValue: original,
    transformedValue: current,
    steps,
    appliedRulesCount: steps.filter((s) => s.success).length,
  };
}
