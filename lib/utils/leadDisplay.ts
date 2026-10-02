/**
 * Utility for formatting human-readable lead representations
 * Ensures internal CUIDs / UUIDs are never exposed to customers.
 */

const CUID_REGEX = /^c[a-z0-9]{24}$/i;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TECHNICAL_ID_REGEX = /^(cm[a-z0-9]{20,}|c[a-z0-9]{24}|lead_[a-z0-9_-]+)$/i;

/**
 * Checks if a string represents an internal technical ID/CUID/UUID.
 */
export function isTechnicalId(val: string | null | undefined): boolean {
  if (!val || typeof val !== "string") return false;
  const trimmed = val.trim();
  return CUID_REGEX.test(trimmed) || UUID_REGEX.test(trimmed) || TECHNICAL_ID_REGEX.test(trimmed);
}

export interface LeadLike {
  id?: string | null;
  name?: string | null;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  details?: string | null;
  status?: string | null;
  source?: string | null;
}

/**
 * Returns a customer-facing display string for a lead.
 * Never outputs technical IDs/CUIDs.
 * Prefers Name, Name — Company, Company, Email, Phone, or safe fallback.
 */
export function formatLeadDisplayName(
  lead: LeadLike | null | undefined,
  fallbackText: string = "Selected Lead"
): string {
  if (!lead) return fallbackText;

  const name = lead.name?.trim();
  const company = lead.company?.trim();
  const email = lead.email?.trim();
  const phone = lead.phone?.trim();
  const details = lead.details?.trim();

  // If name is valid and not a technical ID
  if (name && !isTechnicalId(name)) {
    if (company && !isTechnicalId(company)) {
      return `${name} — ${company}`;
    }
    return name;
  }

  // Fallbacks: Company, Email, Phone, Details
  if (company && !isTechnicalId(company)) return company;
  if (email) return email;
  if (phone) return phone;
  if (details && !isTechnicalId(details)) return details;

  return fallbackText;
}

/**
 * Formats a lead option for dropdown selectors.
 * e.g., "Rahul Sharma (ABC Technologies)" or "Rahul Sharma (Website Lead)"
 * Never includes raw CUID/ID in the visible option text.
 */
export function formatLeadOptionLabel(
  lead: LeadLike,
  fallbackText: string = "Selected Lead"
): string {
  const name = lead.name?.trim();
  const company = lead.company?.trim();
  const email = lead.email?.trim();
  const details = lead.details?.trim();

  const primaryLabel = (name && !isTechnicalId(name))
    ? name
    : (company && !isTechnicalId(company))
    ? company
    : (email && !isTechnicalId(email))
    ? email
    : fallbackText;

  // Secondary contextual hint
  let secondary: string | null = null;
  if (company && company !== primaryLabel && !isTechnicalId(company)) {
    secondary = company;
  } else if (details && details !== primaryLabel && !isTechnicalId(details)) {
    secondary = details;
  } else if (email && email !== primaryLabel) {
    secondary = email;
  }

  return secondary ? `${primaryLabel} (${secondary})` : primaryLabel;
}

/**
 * Sanitizes any raw string to ensure CUIDs/IDs are not rendered.
 */
export function sanitizeLeadReference(
  text: string | null | undefined,
  fallback: string = "Selected Lead"
): string {
  if (!text) return fallback;
  if (isTechnicalId(text)) return fallback;
  return text
    .replace(/\bcm[a-z0-9]{20,}\b/gi, fallback)
    .replace(/Lead:\s*cm[a-z0-9]{20,}/gi, `Lead: ${fallback}`)
    .replace(/Lead ID:\s*cm[a-z0-9]{20,}/gi, fallback)
    .replace(/Selected Lead:\s*cm[a-z0-9]{20,}/gi, `Selected Lead: ${fallback}`);
}
