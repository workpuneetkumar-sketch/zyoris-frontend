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