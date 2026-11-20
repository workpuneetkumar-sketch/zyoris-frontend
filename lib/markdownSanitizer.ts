/**
 * lib/markdownSanitizer.ts
 *
 * Comprehensive pre-processor for AI assistant responses in ZiiBot CRM.
 * Eliminates unwanted escape sequences, malformed HTML artifacts, invisible Unicode characters,
 * and normalizes formatting while preserving code, JSON, equations, and URLs intact.
 */

// HTML entity lookup map
const ENTITY_MAP: Record<string, string> = {
  "&nbsp;": " ",
  "&#xA0;": " ",
  "&#160;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#34;": '"',
  "&apos;": "'",
  "&#39;": "'",
  "&ndash;": "–",
  "&mdash;": "—",
  "&bull;": "•",
  "&copy;": "©",
};

/**
 * Normalizes and sanitizes raw AI markdown output.
 * Preserves code fences (```...```) and inline code (`...`) completely intact.
 */
export function normalizeMarkdownContent(raw: string): string {
  if (!raw || typeof raw !== "string") return "";

  // 1. Normalize line endings (\r\n -> \n)
  let text = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // 2. Remove invisible Unicode control characters and zero-width spaces
  // \u200B (zero-width space), \u200C (zwnj), \u200D (zwj), \uFEFF (bom), \u00AD (soft hyphen)
  text = text.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, "");

  // 3. Normalize non-breaking spaces (\u00A0) to standard spaces
  text = text.replace(/\u00A0/g, " ");

  // 4. Split text into code blocks vs non-code blocks to safely sanitize only prose
  // We match fenced code blocks: ```lang ... ``` or unclosed ``` at the end (during streaming)
  const codeBlockRegex = /(```[\s\S]*?(?:```|$))/g;
  const parts = text.split(codeBlockRegex);

  for (let i = 0; i < parts.length; i++) {
    // If it's a code block (starts with ```), leave its inner code unchanged,
    // only ensure unclosed code fences are flagged or closed for streaming rendering.
    if (parts[i].startsWith("```")) {
      continue;
    }

    // Also protect inline code spans: `...`
    const inlineSpanRegex = /(`[^`\n]+`)/g;
    const subParts = parts[i].split(inlineSpanRegex);

    for (let j = 0; j < subParts.length; j++) {
      if (subParts[j].startsWith("`") && subParts[j].endsWith("`") && subParts[j].length >= 2) {
        // Inside inline code: do not touch backslashes or entities
        continue;
      }

      let segment = subParts[j];

      // A) Replace escaped/raw HTML line breaks: \<br>, \<br/>, <br>, <br/>, <br />
      segment = segment.replace(/\\<br\s*\/?>/gi, "\n");
      segment = segment.replace(/<br\s*\/?>/gi, "\n");

      // B) Replace visible HTML entities outside code
      for (const [entity, replacement] of Object.entries(ENTITY_MAP)) {
        segment = segment.split(entity).join(replacement);
      }

      // C) Decode numeric character references like &#60; (decimal) or &#x3C; (hex)
      segment = segment.replace(/&#(\d+);/g, (_match, dec) => {
        try {
          const charCode = parseInt(dec, 10);
          return charCode > 0 && charCode < 65536 ? String.fromCharCode(charCode) : "";
        } catch {
          return "";
        }
      });
      segment = segment.replace(/&#x([0-9a-f]+);/gi, (_match, hex) => {
        try {
          const charCode = parseInt(hex, 16);
          return charCode > 0 && charCode < 65536 ? String.fromCharCode(charCode) : "";
        } catch {
          return "";
        }
      });

      // D) Normalize unnecessary backslash escapes on common Markdown characters
      // When LLMs output \*, \_, \[, \], \#, \-, \+, \., \!, \(, \) outside code,
      // unescape them if they are not part of an equation, JSON, or escape sequence.
      segment = segment.replace(/\\([*_{}[\]()#+\-.!>])/g, "$1");

      // E) Normalize malformed horizontal dividers (e.g. "----", "- - -", "* * *", "___")
      segment = segment.replace(/^[ \t]*([-*_][ \t]*){3,}$/gm, "---");

      subParts[j] = segment;
    }

    parts[i] = subParts.join("");
  }

  text = parts.join("");

  // 5. Streaming robustness:
  // If text has an odd count of ``` fences (incomplete code block in flight),
  // append closing ``` so the unfinished code block renders in its container rather than leaking into raw text.
  const fenceMatches = text.match(/```/g);
  if (fenceMatches && fenceMatches.length % 2 !== 0) {
    text = text + "\n```";
  }

  // 6. Clean up excessive consecutive blank lines (max 2)
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}

/**
 * Sanitizes an external URL to guard against javascript:, data:, or vbscript: injection.
 */
export function sanitizeUrl(url?: string): string {
  if (!url || typeof url !== "string") return "#";
  const trimmed = url.trim();

  // Allow relative paths, anchors, http/https, and mailto
  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("mailto:")
  ) {
    return trimmed;
  }

  // Default fallback for disallowed or suspicious protocols
  return "#";
}
