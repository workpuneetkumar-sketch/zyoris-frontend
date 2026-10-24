import type { Lead } from "../../types/leads";

/**
 * Sanitizes and resolves single-lead fields to ensure no multiple concatenated
 * contact/lead records appear within a single lead page or card.
 */

interface ExtractedRecord {
  person: string;
  company: string;
  jobTitle: string;
  city: string;
  phone: string;
  raw: string;
}

const KNOWN_COMPANIES = [
  "Kotak Securities",
  "Nomura Services India Private Limited",
  "Nomura Services India",
  "Nomura",
  "Broadcomm India Pvt Ltd",
  "Broadcomm India",
  "Broadcomm",
  "Nirlon Knowledge Park",
  "Tata Consultancy Services",
  "Infosys Limited",
  "Wipro Limited",
  "HCL Technologies",
  "Reliance Industries",
  "HDFC Bank",
  "ICICI Bank",
];

const KNOWN_CITIES = [
  "Mumbai",
  "Bangalore",
  "Bengaluru",
  "Delhi",
  "New Delhi",
  "Pune",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Gurgaon",
  "Noida",
  "Powai",
  "Goregaon",
  "Bellandur",
];

const JOB_TITLES = [
  "Executive Vice President & Head of HR",
  "Executive Vice President",
  "Vice President",
  "Executive Human Resources",
  "Director HR",
  "Director",
  "Head of HR",
  "Service Head",
  "Manager",
  "Lead",
  "Executive",
];

/**
 * Splits a concatenated multi-lead text blob into candidate segments
 */
function parseBlobSegments(text: string): string[] {
  const delim = /(?=(?:(?:Mr|Ms|Mrs|Dr|Shri)\s+[A-Z][a-z]+|Phone:\s+[A-Z][a-z]+|\n{2,}|;\s*(?:Mr|Ms|Mrs)))/i;
  const parts = text.split(delim).map((s) => s.trim()).filter(Boolean);
  return parts.length > 0 ? parts : [text];
}

/**
 * Extracts a clean company name from a segment
 */
function extractCompanyFromSegment(seg: string): string {
  // 1. Check known company names
  for (const kc of KNOWN_COMPANIES) {
    if (new RegExp("\\b" + kc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i").test(seg)) {
      return kc;
    }
  }

  // 2. Look for company suffix patterns
  const match = seg.match(
    /([A-Z][A-Za-z0-9&.,\s]{2,45}?(?:Private Limited|Pvt\.?\s*Ltd\.?|Limited|Ltd\.?|LLP|Inc\.?|Corp\.?|Corporation|Securities|Technologies|Services India|Broadcomm|Nomura))\b/i
  );

  if (match) {
    let comp = match[1].trim();
    // Strip leading address or job noise
    comp = comp.replace(/^(?:nd\s+Floor\s+\[.*?\]\s+Block\s+[A-Za-z0-9\s]+Phase\s+[I|V|X\d]+\s+)?/i, "");
    comp = comp.replace(/^.*?\bat\s+/i, "");
    for (const jt of JOB_TITLES) {
      comp = comp.replace(new RegExp("^(?:.*?\\b)?" + jt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*(?:&\\s*)?", "i"), "");
    }
    // Remove repeated consecutive identical words (e.g. "Nomura Nomura" -> "Nomura")
    const words = comp.split(/\s+/).filter(Boolean);
    const deduped: string[] = [];
    for (const w of words) {
      if (!deduped.length || w.toLowerCase() !== deduped[deduped.length - 1].toLowerCase()) {
        deduped.push(w);
      }
    }
    const cleanComp = deduped.join(" ").trim();
    if (cleanComp.length > 2) return cleanComp;
  }

  // 3. Fall back to the first line or first 50 chars
  const firstLine = seg.split("\n")[0].trim();
  return firstLine.length > 50 ? firstLine.slice(0, 50).trim() : firstLine;
}

function extractPersonFromSegment(seg: string): string {
  const match = seg.match(/(?:(?:Mr|Ms|Mrs|Dr|Shri)\s+|Phone:\s+)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i);
  if (!match) return "";
  let name = match[1].trim();
  for (const jt of JOB_TITLES) {
    name = name.replace(new RegExp("\\s+" + jt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ".*", "i"), "");
  }
  return name.trim();
}

function extractCityFromSegment(seg: string): string {
  for (const city of KNOWN_CITIES) {
    if (new RegExp("\\b" + city + "\\b", "i").test(seg)) {
      return city;
    }
  }
  return "";
}

function extractPhoneFromSegment(seg: string): string {
  const match = seg.match(/(?:(?:Tel|Phone|Fax|Mobile)[:\s]+|\+91\s*|\b0\d{2,4}\s*)(\+?[0-9\s-]{8,16})/i);
  if (!match) return "";
  return match[0].replace(/^(?:Tel|Phone|Fax|Mobile)[:\s]+/i, "").trim();
}

function extractJobTitleFromSegment(seg: string): string {
  for (const jt of JOB_TITLES) {
    if (new RegExp("\\b" + jt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i").test(seg)) {
      return jt;
    }
  }
  return "";
}

/**
 * Checks whether a company string contains multiple concatenated lead entries
 */
export function isMultiLeadBlob(text: string | undefined | null): boolean {
  if (!text || typeof text !== "string") return false;
  const t = text.trim();
  if (t.length < 70) return false;

  const contactMatches = (t.match(/(?:(?:Mr|Ms|Mrs|Dr|Shri)\s+[A-Z][a-z]+|Phone:\s+[A-Z][a-z]+)/gi) || []).length;
  const companyMatches = (t.match(/(?:Private Limited|Pvt\.?\s*Ltd\.?|Limited|Securities|Broadcomm|Nomura)/gi) || []).length;
  const phoneMatches = (t.match(/(?:Tel:|Fax:|Phone:|\+91\s*\d|\b0\d{9,11}\b)/gi) || []).length;

  return contactMatches >= 2 || (contactMatches >= 1 && companyMatches >= 2) || (companyMatches >= 2 && phoneMatches >= 2) || t.length > 180;
}

/**
 * Cleans multi-lead company text and extracts the single relevant company
 */
export function cleanSingleLeadCompany(
  rawCompany: string | undefined | null,
  leadName: string = ""
): { company: string; city?: string; phone?: string; jobTitle?: string } {
  if (!rawCompany || typeof rawCompany !== "string") {
    return { company: "" };
  }

  const text = rawCompany.trim();
  if (!isMultiLeadBlob(text)) {
    return { company: text };
  }

  const parts = parseBlobSegments(text);
  const generalCity = KNOWN_CITIES.find((c) => new RegExp("\\b" + c + "\\b", "i").test(parts[0])) || "";

  const records: ExtractedRecord[] = parts
    .map((p) => ({
      person: extractPersonFromSegment(p),
      company: extractCompanyFromSegment(p),
      jobTitle: extractJobTitleFromSegment(p),
      city: extractCityFromSegment(p) || generalCity,
      phone: extractPhoneFromSegment(p),
      raw: p,
    }))
    .filter((r) => Boolean(r.company || r.person));

  if (records.length === 0) {
    return { company: text.slice(0, 50).trim() };
  }

  const nameLower = (leadName || "").toLowerCase().trim();
  let matched: ExtractedRecord | undefined;

  // 1. Person name match
  if (nameLower) {
    matched = records.find(
      (r) => r.person && (nameLower.includes(r.person.toLowerCase()) || r.person.toLowerCase().includes(nameLower))
    );

    // 2. Company acronym match (e.g. "ks" -> "Kotak Securities")
    if (!matched) {
      matched = records.find((r) => {
        const words = r.company.split(/\s+/).filter(Boolean);
        const acronym = words.map((w) => w[0].toLowerCase()).join("");
        if (acronym && nameLower.includes(acronym)) return true;
        if (words.length >= 2) {
          const shortAcronym = words[0][0].toLowerCase() + words[1][0].toLowerCase();
          if (nameLower.includes(shortAcronym)) return true;
        }
        return words.some((w) => w.length > 3 && nameLower.includes(w.toLowerCase()));
      });
    }

    // 3. Job role keyword match (e.g. "servicehead" -> Head of HR)
    if (!matched && nameLower.includes("head")) {
      matched = records.find((r) => /head/i.test(r.raw));
    }
  }

  // 4. Default to first valid company with actual name
  if (!matched) {
    matched = records.find((r) => r.company && r.company.length > 3) || records[0];
  }

  return {
    company: matched.company || text.slice(0, 50).trim(),
    city: matched.city || undefined,
    phone: matched.phone || undefined,
    jobTitle: matched.jobTitle || undefined,
  };
}

/**
 * Cleans multiple emails to keep single primary email
 */
export function cleanSingleEmail(rawEmail: string | undefined | null): string {
  if (!rawEmail || typeof rawEmail !== "string") return "";
  const parts = rawEmail.split(/[,;\s]+/).filter((p) => p.includes("@"));
  return parts[0] || rawEmail.trim();
}

/**
 * Cleans multiple phone numbers to keep single primary phone
 */
export function cleanSinglePhone(rawPhone: string | undefined | null): string {
  if (!rawPhone || typeof rawPhone !== "string") return "";
  const parts = rawPhone.split(/[,;\/|]+/).map((p) => p.trim()).filter((p) => p.length >= 7);
  return parts[0] || rawPhone.trim();
}

/**
 * Cleans multiple names to keep single primary name
 */
export function cleanSingleName(rawName: string | undefined | null): string {
  if (!rawName || typeof rawName !== "string") return "";
  const t = rawName.trim();
  if (t.includes("/") || t.includes(";")) {
    return t.split(/[\/;]/)[0].trim();
  }
  return t;
}

/**
 * Resolves a complete lead object into a clean single lead record
 */
export function resolveSingleLeadData<T extends Partial<Lead>>(lead: T): T {
  if (!lead) return lead;

  const rawCompany = typeof lead.company === "string" ? lead.company : "";
  const leadName = typeof lead.name === "string" ? cleanSingleName(lead.name) : "";

  const resolved = cleanSingleLeadCompany(rawCompany, leadName);

  return {
    ...lead,
    name: leadName || lead.name,
    company: resolved.company || lead.company,
    city: lead.city || resolved.city || "",
    phone: cleanSinglePhone(lead.phone) || resolved.phone || "",
    email: cleanSingleEmail(lead.email) || lead.email || "",
    jobTitle: lead.jobTitle || resolved.jobTitle || "",
  };
}
