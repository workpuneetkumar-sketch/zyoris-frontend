/**
 * validateReturnTo.ts
 *
 * Validates a `next` / `returnTo` path to prevent open-redirect attacks.
 * Exported from here and re-exported from context/AuthContext.tsx so callers
 * that already import from AuthContext don't need to change.
 *
 * Accepts ONLY strings that:
 *  - Are non-empty after trimming
 *  - Start with a single `/`
 *  - Are NOT a protocol-relative URL (//host)
 *  - Are NOT a backslash trick  (/\host, \\host)
 *  - Are NOT an absolute URL    (https://...)
 *
 * Returns the trimmed path on success, or null on rejection.
 */

const ABSOLUTE_URL_RE = /^https?:\/\//i;
const PROTOCOL_RELATIVE_RE = /^\/\//;
// Matches /\ or \\ — backslash tricks that some browsers normalise to //
const BACKSLASH_TRICK_RE = /^[/\\]{2}/;

export function validateReturnTo(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const trimmed = value.trim();
  if (ABSOLUTE_URL_RE.test(trimmed)) return null;      // https://evil.com
  if (PROTOCOL_RELATIVE_RE.test(trimmed)) return null; // //evil.com
  if (BACKSLASH_TRICK_RE.test(trimmed)) return null;   // /\evil.com or \\evil.com
  if (!trimmed.startsWith("/")) return null;           // must be an absolute path
  return trimmed;
}
