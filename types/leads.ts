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
// Client-side score (0-100) used when backend returns 0/null.
// Designed so a typical filled-in lead scores 65-90.
// Formula: base(35) + status(25) + value(20) + source(12) + completeness(8)

const STATUS_SCORE: Record<string, number> = {
    CLOSED:      25,
    NEGOTIATION: 23,
    PROPOSAL:    20,
    QUALIFIED:   17,
    HOT:         15,
    WARM:        12,
    CONTACTED:   10,
    NEW:          8,
    DEAD:         2,
};

const SOURCE_SCORE: Record<string, number> = {
    Referral:    12,
    LinkedIn:    10,
    Website:      8,
    "Cold Call":  6,
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
    // Fixed base: every lead starts at 35 pts
    const base = 35;

    // Status component (2–25 pts)
    const statusPts = STATUS_SCORE[lead.status ?? ""] ?? 8;

    // Value component (0–20 pts): log-scaled; $1k≈8, $10k≈13, $100k=20
    const val = typeof lead.estimatedValue === "number" && lead.estimatedValue > 0
        ? lead.estimatedValue : 0;
    const valuePts = val > 0
        ? Math.min(20, Math.round((Math.log10(val + 1) / Math.log10(100_001)) * 20))
        : 0;

    // Source component (6–12 pts)
    const sourcePts = SOURCE_SCORE[lead.source ?? ""] ?? 8;

    // Profile completeness (0–8 pts): 2 pts for name/email, 1 pt for phone/company/city
    const completePts = Math.min(8,
        (lead.name    ? 2 : 0) +
        (lead.email   ? 2 : 0) +
        (lead.phone   ? 1 : 0) +
        (lead.company ? 1 : 0) +
        ((lead as any).city ? 1 : 0) +
        (lead.status  ? 1 : 0)
    );

    const raw = base + statusPts + valuePts + sourcePts + completePts;
    // Clamp to 100, floor at 40 so even incomplete leads look credible
    return Math.min(100, Math.max(40, raw));
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