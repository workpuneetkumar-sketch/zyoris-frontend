/**
 * Sanitizes task descriptions by removing internal technical metadata
 * such as raw source-page markdown links, workspace page URLs/IDs,
 * and assignment scope labels so they are never exposed to non-technical customers.
 */
export function cleanTaskDescription(description?: string | null): string {
  if (!description) return "";

  const cleaned = description
    .replace(/(?:\r?\n)*---\s*(?:\r?\n)+\*\*Source Page\*\*:[^\r\n]*(?:\r?\n)+\*\*Assignment Scope\*\*:[^\r\n]*/gi, "")
    .replace(/(?:\r?\n)*\*\*Source Page\*\*:[^\r\n]*/gi, "")
    .replace(/(?:\r?\n)*\*\*Assignment Scope\*\*:[^\r\n]*/gi, "")
    .replace(/(?:\r?\n)*---\s*$/g, "")
    .trim();

  return cleaned;
}
