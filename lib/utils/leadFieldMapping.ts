/**
 * lib/utils/leadFieldMapping.ts
 *
 * Lightweight field auto-mapping, schema definitions, and CSV serializer
 * for bulk lead ingestion. Completely decoupled from heavy document parsers.
 */

export const TARGET_LEAD_FIELDS = [
  { key: "name", label: "Full Name", required: true },
  { key: "email", label: "Email Address", required: true },
  { key: "phone", label: "Phone Number", required: false },
  { key: "company", label: "Company / Org", required: false },
  { key: "jobTitle", label: "Job Title / Role", required: false },
  { key: "industry", label: "Industry", required: false },
  { key: "city", label: "City / Location", required: false },
  { key: "state", label: "State / Province", required: false },
  { key: "country", label: "Country", required: false },
  { key: "status", label: "Lead Status", required: false },
  { key: "source", label: "Lead Source", required: false },
  { key: "estimatedValue", label: "Deal Value / Budget", required: false },
  { key: "tags", label: "Tags", required: false },
  { key: "note", label: "Notes / Details", required: false },
] as const;

export type TargetLeadFieldKey = (typeof TARGET_LEAD_FIELDS)[number]["key"] | "__skip__";

/**
 * Suggests the best matching standard lead attribute for any detected column name.
 */
export function autoMapField(detectedHeader: string): TargetLeadFieldKey {
  const h = detectedHeader.toLowerCase().trim().replace(/[_\s.-]+/g, "");

  // Serial numbers or row counters should be skipped
  if (
    h === "sno" ||
    h === "srno" ||
    h === "serial" ||
    h === "serialno" ||
    h === "id" ||
    h === "index" ||
    h === "slno" ||
    h === "row" ||
    h === "no" ||
    h === "#"
  ) {
    return "__skip__";
  }

  // Name
  if (
    /^(name|fullname|leadname|contactname|clientname|person|lead|client|attendee|customer|candidate|participant|member|user|student|contact)$/.test(h) ||
    h.includes("fullname") ||
    (h.includes("name") && !h.includes("company") && !h.includes("firm") && !h.includes("org"))
  ) {
    return "name";
  }

  // Email
  if (h.includes("email") || h.includes("mail")) {
    return "email";
  }

  // Phone / Mobile / Number / Contact
  if (
    h === "number" ||
    (h.includes("number") && !h.includes("sno") && !h.includes("serial") && !h.includes("index")) ||
    h.includes("phone") ||
    h.includes("mobile") ||
    h.includes("cell") ||
    h.includes("tel") ||
    h.includes("contactno") ||
    h.includes("contactnumber") ||
    h.includes("whatsapp")
  ) {
    return "phone";
  }

  // Company / Org
  if (
    h.includes("company") ||
    h.includes("org") ||
    h.includes("firm") ||
    h.includes("business") ||
    h.includes("account") ||
    h.includes("employer") ||
    h.includes("college") ||
    h.includes("university") ||
    h.includes("institute") ||
    h.includes("school")
  ) {
    return "company";
  }

  // Job Title / Role
  if (
    h.includes("title") ||
    h.includes("designation") ||
    h.includes("position") ||
    h.includes("role") ||
    h.includes("occupation") ||
    h.includes("job")
  ) {
    return "jobTitle";
  }

  // Industry
  if (h.includes("industry") || h.includes("sector") || h.includes("domain") || h.includes("vertical")) {
    return "industry";
  }

  // City / Location
  if (h.includes("city") || h.includes("location") || h.includes("town") || h.includes("address") || h.includes("place")) {
    return "city";
  }

  // State
  if (h.includes("state") || h.includes("province") || h.includes("region")) {
    return "state";
  }

  // Country
  if (h.includes("country") || h.includes("nation")) {
    return "country";
  }

  // Status
  if (h.includes("status") || h.includes("stage")) {
    return "status";
  }

  // Source
  if (h.includes("source") || h.includes("channel") || h.includes("origin")) {
    return "source";
  }

  // Budget / Estimated Value
  if (
    h.includes("value") ||
    h.includes("budget") ||
    h.includes("amount") ||
    h.includes("revenue") ||
    h.includes("dealvalue") ||
    h.includes("price") ||
    h.includes("fee")
  ) {
    return "estimatedValue";
  }

  // Tags
  if (h.includes("tag") || h.includes("label") || h.includes("keyword")) {
    return "tags";
  }

  // Notes
  if (h.includes("note") || h.includes("comment") || h.includes("remark") || h.includes("description") || h.includes("detail")) {
    return "note";
  }

  return "__skip__";
}

/**
 * Converts user-mapped preview rows into standard normalized CSV string for server ingestion.
 */
export function convertMappedRowsToCsv(
  rows: Record<string, string>[],
  fieldMapping: Record<string, TargetLeadFieldKey>
): string {
  const targetKeys: (typeof TARGET_LEAD_FIELDS)[number]["key"][] = [
    "name",
    "email",
    "phone",
    "company",
    "jobTitle",
    "industry",
    "city",
    "state",
    "country",
    "status",
    "source",
    "estimatedValue",
    "tags",
    "note",
  ];

  // Header row
  const csvLines = [targetKeys.join(",")];

  rows.forEach((row) => {
    const rowObj: Record<string, string> = {};

    // Apply user field mapping
    for (const [sourceCol, targetKey] of Object.entries(fieldMapping)) {
      if (targetKey && targetKey !== "__skip__") {
        const val = row[sourceCol] || "";
        if (val) {
          rowObj[targetKey] = val;
        }
      }
    }

    // Must have at least a name, email, or phone to be worth sending
    if (!rowObj.name && !rowObj.email && !rowObj.phone) return;

    // Build comma-delimited row respecting CSV escaping rules
    const line = targetKeys
      .map((k) => {
        let v = rowObj[k] || "";
        // Sanitize string
        v = v.replace(/"/g, '""').trim();
        if (v.includes(",") || v.includes("\n") || v.includes('"')) {
          return `"${v}"`;
        }
        return v;
      })
      .join(",");

    csvLines.push(line);
  });

  return csvLines.join("\n");
}
