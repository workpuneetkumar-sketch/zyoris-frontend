// types/leads.ts

export type LeadStatus =
    | "NEW"
    | "CONTACTED"
    | "QUALIFIED"
    | "CLOSED";

export type LeadSource =
    | "Website"
    | "Referral"
    | "LinkedIn"
    | "Cold Call";

export interface Lead {
    id: number;

    name: string;

    company: string;

    source: LeadSource;

    owner: string;

    ownerAvatar: string;

    status: LeadStatus;

    score: number;

    createdAt: string;

    [key: string]: unknown;
}

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