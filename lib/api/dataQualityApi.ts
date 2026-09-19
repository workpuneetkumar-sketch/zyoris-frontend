/**
 * lib/api/dataQualityApi.ts
 * ─────────────────────────────────────────────────────────────
 * Service layer for the Data Quality Agent.
 *
 * Endpoints:
 *   GET /api/data-quality/issues          — list, filterable
 *   GET /api/data-quality/issues/:issueId — single issue with evidence
 *   PATCH /api/data-quality/issues/:id    — resolve / ignore an issue
 *
 * Mock flag: NEXT_PUBLIC_USE_MOCKS !== "false"
 * Swapping to live is a one-line env change — zero component edits.
 *
 * Bug-1 lesson: normalise list under every plausible backend key.
 * Bug-2 lesson: normalise issueType / status / severity to uppercase
 *               at THIS layer, never in components.
 */

import api from "@/lib/api/api";
import type {
  DataQualityIssue,
  DataQualityIssueListResult,
  DataQualityListFilters,
  DataQualityListResponse,
  DataQualityIssueType,
  DataQualityIssueSeverity,
  DataQualityIssueStatus,
  DataQualityObjectType,
} from "@/lib/types/agent-results";

// ─── Mock flag ────────────────────────────────────────────────────────────────

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_ISSUES: DataQualityIssue[] = [
  {
    id: "dq-001",
    issueType: "DUPLICATE",
    objectType: "lead",
    severity: "HIGH",
    status: "OPEN",
    affectedRecordIds: ["lead-abc", "lead-xyz"],
    fieldName: "email",
    conflictDetail:
      'Two lead records share the email "john.doe@acme.com". Record lead-abc was created 2024-01-10, lead-xyz on 2024-02-15.',
    evidence: [
      {
        source: "CRM Deduplication Engine",
        label: "Email match — exact",
        snippet: "john.doe@acme.com appears in both records with ≥95% field overlap.",
      },
      {
        source: "Activity Log",
        label: "Separate activity timelines",
        snippet: "lead-abc has 3 email activities, lead-xyz has 1 call. Both are unresolved.",
      },
    ],
    detectedAt: new Date(Date.now() - 86_400_000).toISOString(),
  },
  {
    id: "dq-002",
    issueType: "STALE",
    objectType: "contact",
    severity: "MEDIUM",
    status: "OPEN",
    affectedRecordIds: ["contact-555"],
    fieldName: "lastContactedAt",
    conflictDetail: "Contact has not been touched for 180+ days with no follow-up scheduled.",
    evidence: [
      {
        source: "Activity Timeline",
        label: "Last activity: 183 days ago",
        snippet: "Final logged interaction was an outbound call on 2024-03-08.",
      },
    ],
    detectedAt: new Date(Date.now() - 3_600_000 * 6).toISOString(),
  },
  {
    id: "dq-003",
    issueType: "MISSING",
    objectType: "deal",
    severity: "LOW",
    status: "OPEN",
    affectedRecordIds: ["deal-789"],
    fieldName: "closeDate",
    conflictDetail: "Deal in NEGOTIATION stage has no close date set.",
    evidence: [
      {
        source: "Pipeline Validation Rule",
        label: "Required field missing",
        snippet: "Deals entering NEGOTIATION require a projected close date per pipeline policy.",
      },
    ],
    detectedAt: new Date(Date.now() - 3_600_000 * 2).toISOString(),
  },
  {
    id: "dq-004",
    issueType: "CONFLICTING",
    objectType: "account",
    severity: "HIGH",
    status: "OPEN",
    affectedRecordIds: ["account-111"],
    fieldName: "industry",
    conflictDetail:
      'Account "Acme Corp" has industry set to "SaaS" in CRM but "Manufacturing" in the enrichment database.',
    evidence: [
      {
        source: "CRM Record",
        label: "CRM value: SaaS",
        snippet: "Last edited by user@zyoris.com on 2024-01-20.",
      },
      {
        source: "Clearbit Enrichment",
        label: "Enrichment value: Manufacturing",
        snippet: "Clearbit confidence: 92%. Data sourced from LinkedIn company page.",
      },
    ],
    detectedAt: new Date(Date.now() - 3_600_000 * 48).toISOString(),
  },
  {
    id: "dq-005",
    issueType: "DUPLICATE",
    objectType: "contact",
    severity: "MEDIUM",
    status: "RESOLVED",
    affectedRecordIds: ["contact-222", "contact-333"],
    fieldName: "phone",
    conflictDetail: "Two contacts share the same phone number +1-555-0123.",
    evidence: [
      {
        source: "CRM Deduplication Engine",
        label: "Phone match — exact",
        snippet: "+1-555-0123 appears on both records.",
      },
    ],
    detectedAt: new Date(Date.now() - 86_400_000 * 3).toISOString(),
  },
  {
    id: "dq-006",
    issueType: "STALE",
    objectType: "lead",
    severity: "LOW",
    status: "IGNORED",
    affectedRecordIds: ["lead-999"],
    fieldName: "assignedTo",
    conflictDetail: "Lead is assigned to a user account that was deactivated.",
    evidence: [
      {
        source: "User Directory",
        label: "Assigned user deactivated",
        snippet: "User bob@zyoris.com was deactivated on 2024-02-01. Lead is orphaned.",
      },
    ],
    detectedAt: new Date(Date.now() - 86_400_000 * 7).toISOString(),
  },
];

// ─── Normalisation helpers ────────────────────────────────────────────────────

function normaliseIssue(raw: DataQualityIssue): DataQualityIssue {
  return {
    ...raw,
    issueType: (typeof raw.issueType === "string"
      ? raw.issueType.toUpperCase()
      : raw.issueType) as DataQualityIssueType,
    severity: (typeof raw.severity === "string"
      ? raw.severity.toUpperCase()
      : raw.severity) as DataQualityIssueSeverity,
    status: (typeof raw.status === "string"
      ? raw.status.toUpperCase()
      : raw.status) as DataQualityIssueStatus,
    objectType: (typeof raw.objectType === "string"
      ? raw.objectType.toLowerCase()
      : raw.objectType) as DataQualityObjectType,
    evidence: Array.isArray(raw.evidence) ? raw.evidence : [],
    affectedRecordIds: Array.isArray(raw.affectedRecordIds)
      ? raw.affectedRecordIds
      : [],
  };
}

/**
 * Bug-1 lesson: handle every plausible list key from the backend.
 */
function normaliseList(raw: unknown): DataQualityListResponse {
  // Strip { data: ... } envelope
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    if (r.data && typeof r.data === "object") {
      return normaliseList(r.data);
    }
  }

  if (Array.isArray(raw)) {
    const issues = (raw as DataQualityIssue[]).map(normaliseIssue);
    return { issues, totalCount: issues.length };
  }

  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const list: DataQualityIssue[] | null =
      Array.isArray(obj.issues)  ? (obj.issues as DataQualityIssue[]) :
      Array.isArray(obj.items)   ? (obj.items as DataQualityIssue[])  :
      Array.isArray(obj.records) ? (obj.records as DataQualityIssue[]):
      Array.isArray(obj.results) ? (obj.results as DataQualityIssue[]):
      Array.isArray(obj.data)    ? (obj.data as DataQualityIssue[])   :
      null;

    if (list !== null) {
      const issues = list.map(normaliseIssue);
      return {
        issues,
        totalCount:
          typeof obj.totalCount === "number" ? obj.totalCount :
          typeof obj.total      === "number" ? obj.total      :
          issues.length,
      };
    }
  }

  console.warn("[dataQualityApi] Unexpected list response shape:", raw);
  return { issues: [], totalCount: 0 };
}

function buildParams(filters: DataQualityListFilters): Record<string, string> {
  const p: Record<string, string> = {};
  if (filters.issueType)  p.issueType  = filters.issueType;
  if (filters.objectType) p.objectType = filters.objectType;
  if (filters.severity)   p.severity   = filters.severity;
  if (filters.status)     p.status     = filters.status;
  if (filters.search?.trim()) p.search = filters.search.trim();
  return p;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * GET /api/data-quality/issues
 * List issues, optionally filtered by type / object / severity / status.
 * Filters are synced to URL params by the page component.
 */
export async function getDataQualityIssues(
  filters: DataQualityListFilters = {}
): Promise<DataQualityListResponse> {
  if (USE_MOCKS) {
    await new Promise((r) => setTimeout(r, 600));
    let issues = [...MOCK_ISSUES];
    if (filters.issueType)  issues = issues.filter((i) => i.issueType  === filters.issueType);
    if (filters.objectType) issues = issues.filter((i) => i.objectType === filters.objectType);
    if (filters.severity)   issues = issues.filter((i) => i.severity   === filters.severity);
    if (filters.status)     issues = issues.filter((i) => i.status     === filters.status);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      issues = issues.filter(
        (i) =>
          i.fieldName?.toLowerCase().includes(q) ||
          i.conflictDetail?.toLowerCase().includes(q) ||
          i.objectType.toLowerCase().includes(q)
      );
    }
    return { issues, totalCount: issues.length };
  }

  try {
    const res = await api.get("/api/data-quality/issues", {
      params: buildParams(filters),
    });
    return normaliseList(res.data);
  } catch (err: any) {
    throw new Error(
      err.response?.data?.message ||
        err.message ||
        "Failed to load Data Quality issues."
    );
  }
}

/**
 * GET /api/data-quality/issues/:issueId
 * Full detail for a single issue including evidence side-by-side.
 */
export async function getDataQualityIssue(
  issueId: string
): Promise<DataQualityIssue> {
  if (USE_MOCKS) {
    await new Promise((r) => setTimeout(r, 400));
    const found = MOCK_ISSUES.find((i) => i.id === issueId);
    if (!found) throw new Error(`Issue "${issueId}" not found.`);
    return normaliseIssue(found);
  }

  try {
    const res = await api.get(`/api/data-quality/issues/${issueId}`);
    const raw = res.data;
    // Strip envelope
    const issue = (
      raw?.data ?? raw
    ) as DataQualityIssue;
    return normaliseIssue(issue);
  } catch (err: any) {
    throw new Error(
      err.response?.data?.message ||
        err.message ||
        `Failed to load issue "${issueId}".`
    );
  }
}

/**
 * PATCH /api/data-quality/issues/:id
 * Resolve or ignore an issue. Always re-fetches after mutation —
 * no optimistic state.
 */
export async function updateDataQualityIssue(
  issueId: string,
  status: "RESOLVED" | "IGNORED"
): Promise<DataQualityIssue> {
  if (USE_MOCKS) {
    await new Promise((r) => setTimeout(r, 500));
    const found = MOCK_ISSUES.find((i) => i.id === issueId);
    if (!found) throw new Error(`Issue "${issueId}" not found.`);
    // Mutate mock in place so refetch reflects change in the same session
    found.status = status;
    return normaliseIssue(found);
  }

  try {
    const res = await api.patch(`/api/data-quality/issues/${issueId}`, {
      status,
    });
    const raw = res.data;
    const issue = (raw?.data ?? raw) as DataQualityIssue;
    return normaliseIssue(issue);
  } catch (err: any) {
    throw new Error(
      err.response?.data?.message ||
        err.message ||
        `Failed to update issue "${issueId}".`
    );
  }
}

// Re-export types
export type {
  DataQualityIssue,
  DataQualityIssueListResult,
  DataQualityListFilters,
  DataQualityListResponse,
} from "@/lib/types/agent-results";
