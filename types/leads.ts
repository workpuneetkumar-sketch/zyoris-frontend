// types/leads.ts

export type LeadStatus =
    | "NEW"
    | "WARM"
    | "HOT"
    | "DEAD"
    | "CONTACTED"
    | "QUALIFIED"
    | "PROPOSAL"
    | "NEGOTIATION"
    | "CLOSED";

export type LeadSource =
    | "Website"
    | "Referral"
    | "LinkedIn"
    | "Cold Call";



export interface LeadsFilters {
    status: string;
    source: string;
    owner: string;
    search: string;
}

export interface LeadsResponse {
    leads: Lead[];
    total: number;
}

export const DEFAULT_FILTERS: LeadsFilters = {
    status: "All Status",
    source: "All Sources",
    owner: "All Owners",
    search: "",
};

export const PER_PAGE = 8;

// ── Lead score computation ─────────────────────────────────────────────────
// Used when the backend returns score = 0 / null / undefined.
// Factors: status (40 pts), estimatedValue (30 pts), source (20 pts), completeness (10 pts)

const STATUS_SCORE: Record<string, number> = {
    CLOSED:      40,
    NEGOTIATION: 36,
    PROPOSAL:    30,
    QUALIFIED:   24,
    HOT:         20,
    CONTACTED:   14,
    WARM:        10,
    NEW:          6,
    DEAD:         0,
};

const SOURCE_SCORE: Record<string, number> = {
    Referral:   20,
    LinkedIn:   16,
    Website:    12,
    "Cold Call": 8,
};

export function computeLeadScore(lead: {
    status?: string;
    estimatedValue?: number | null;
    source?: string;
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
}): number {
    // Status component (0–40)
    const statusPts = STATUS_SCORE[lead.status ?? ""] ?? 6;

    // Value component (0–30): log-scaled against a $100k reference
    const val = typeof lead.estimatedValue === "number" && lead.estimatedValue > 0
        ? lead.estimatedValue : 0;
    const valuePts = val > 0
        ? Math.min(30, Math.round((Math.log10(val + 1) / Math.log10(100_001)) * 30))
        : 0;

    // Source component (0–20)
    const sourcePts = SOURCE_SCORE[lead.source ?? ""] ?? 8;

    // Profile completeness (0–10): 2 pts each for name, email, phone, company, status
    const completePts =
        (lead.name    ? 2 : 0) +
        (lead.email   ? 2 : 0) +
        (lead.phone   ? 2 : 0) +
        (lead.company ? 2 : 0) +
        (lead.status  ? 2 : 0);

    return Math.min(100, statusPts + valuePts + sourcePts + completePts);
}

export interface Lead {
    id: string;

    name: string;

    company: string;

    source: LeadSource;

    owner: string;

    ownerAvatar: string;

    status: LeadStatus;

    score: number;

    createdAt: string;

    email?: string;

    phone?: string;

    city?: string;

    estimatedValue?: number;

    assignedToId?: string | null;

    assignedTo?: {
        id: string;
        name: string;
        email?: string;
    };

    tags?: string[];

    note?: string;

    [key: string]: unknown;
}