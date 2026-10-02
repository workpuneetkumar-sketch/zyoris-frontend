/**
 * Task 1 — Issue 13: Customer-facing Source Page Sanitization Utility
 *
 * Strips raw workspace URLs, CUIDs, and technical markdown from customer-facing
 * activity titles, descriptions, and metadata while preserving internal IDs
 * for application navigation and state.
 */

export function sanitizeSourcePageText(
  text?: string | null,
  knownTitle?: string | null
): string {
  if (!text) return "";

  let result = text;

  // 1. Markdown link: [Title](/workspace/pages/cmxxxxxxxx) or [Title](https://.../workspace/pages/cmxxxxxxxx)
  // Example: "[Project Requirements](/workspace/pages/cmxxxxxxxx)" -> "Project Requirements"
  result = result.replace(/\[([^\]]+)\]\((?:https?:\/\/[^\/]+)?\/workspace\/pages\/[^\)]+\)/gi, (_, linkText) => {
    const trimmed = linkText.trim();
    if (
      trimmed.startsWith("/workspace/pages") ||
      trimmed.startsWith("http") ||
      /^cm[a-z0-9]{5,}$/i.test(trimmed) ||
      /^c[a-z0-9]{20,}$/i.test(trimmed)
    ) {
      return knownTitle?.trim() || "Workspace Page";
    }
    return trimmed;
  });

  // 2. Explicit "Source Page: /workspace/pages/cmxxxxxxxx" or "Source Page: https://.../workspace/pages/cm..."
  result = result.replace(
    /(?:Source\s+Page|sourcePageId|pageId)[:\s]+(?:https?:\/\/[^\s]+)?\/workspace\/pages\/[a-z0-9_-]+/gi,
    () => {
      return knownTitle?.trim() ? `Source Page: ${knownTitle.trim()}` : "Source Page: Workspace Page";
    }
  );

  // 3. Raw workspace page URL alone: "https://app.zyoris.com/workspace/pages/cmxxxxxxxx" or "/workspace/pages/cmxxxxxxxx"
  result = result.replace(
    /(?:https?:\/\/[^\s\/]+)?\/workspace\/pages\/(?:cm[a-z0-9]{5,}|c[a-z0-9]{20,}|[a-z0-9_-]{10,})/gi,
    () => {
      return knownTitle?.trim() ? knownTitle.trim() : "Workspace Page";
    }
  );

  // 4. "sourcePageId: cmxxxxxxxx" or "pageId: cmxxxxxxxx"
  result = result.replace(
    /(?:sourcePageId|pageId)[:\s]+(?:cm[a-z0-9]{5,}|c[a-z0-9]{20,}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi,
    () => {
      return knownTitle?.trim() ? `Source Page: ${knownTitle.trim()}` : "";
    }
  );

  // 5. Clean any remaining standalone raw database CUIDs (20+ chars) in source page contexts
  result = result.replace(/\b(?:sourcePage|page)[_\s-]*(?:id)?[:\s]*(?:c[a-z0-9]{20,}|cm[a-z0-9]{5,})\b/gi, () => {
    return knownTitle?.trim() ? `Source Page: ${knownTitle.trim()}` : "";
  });

  return result.replace(/\s{2,}/g, " ").trim();
}

export function extractSourcePageInfo(activity: {
  title?: string | null;
  description?: string | null;
  sourcePageId?: string | null;
  sourcePageTitle?: string | null;
  metadata?: Record<string, any> | null;
}): { sourcePageId: string | null; sourcePageTitle: string | null } {
  let pageId =
    activity.sourcePageId ||
    activity.metadata?.sourcePageId ||
    activity.metadata?.pageId ||
    null;

  let pageTitle =
    activity.sourcePageTitle ||
    activity.metadata?.pageTitle ||
    activity.metadata?.sourcePageTitle ||
    null;

  const combined = `${activity.title || ""} ${activity.description || ""}`;

  // Check for markdown link: [Title](/workspace/pages/:id)
  const mdMatch = combined.match(
    /\[([^\]]+)\]\((?:https?:\/\/[^\/]+)?\/workspace\/pages\/([a-z0-9_-]+)\)/i
  );
  if (mdMatch) {
    if (!pageTitle) {
      const extractedTitle = mdMatch[1].trim();
      if (
        !extractedTitle.startsWith("/workspace/pages") &&
        !extractedTitle.startsWith("http") &&
        !/^cm[a-z0-9]{5,}$/i.test(extractedTitle) &&
        !/^c[a-z0-9]{20,}$/i.test(extractedTitle)
      ) {
        pageTitle = extractedTitle;
      }
    }
    if (!pageId) {
      pageId = mdMatch[2].trim();
    }
  }

  // Check for raw URL: /workspace/pages/:id
  if (!pageId) {
    const urlMatch = combined.match(
      /(?:https?:\/\/[^\s\/]+)?\/workspace\/pages\/([a-z0-9_-]+)/i
    );
    if (urlMatch) {
      pageId = urlMatch[1].trim();
    }
  }

  return {
    sourcePageId: pageId,
    sourcePageTitle: pageTitle || (pageId ? "Workspace Page" : null),
  };
}
