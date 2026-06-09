// lib/api/dealsApi.ts
// All network calls for the Deals module.
//
// Swagger (https://zyoris.onrender.com/docs.json) — Section: Deals
//   POST  /api/deals/create          — create a deal
//   GET   /api/deals/get-deals       — list all deals
//   GET   /api/deals/get-deal/{id}   — single deal
//   PATCH /api/deals/update-deal/{id} — update a deal

import api from "@/lib/api/api";
import { Deal, DealStage } from "@/types/deals";

// ── Backend response shape ─────────────────────────────────────────────────

interface BackendDeal {
    id: string;
    organizationId?: string;
    name: string;
    stage: string;
    amount: number;
    currency?: string;
    assignedToId?: string | null;
    contactId?: string | null;
    companyId?: string | null;
    closeDate?: string | null;
    owner?: string | null;
    externalId?: string | null;
    sourceSystem?: string;
    createdAt: string;
    updatedAt: string;
    // conversionProbability may come from analytics enrichment
    conversionProbability?: number;
    companyName?: string;
    [key: string]: unknown;
}

// ── Map BackendDeal → frontend Deal ───────────────────────────────────────

function mapDeal(raw: BackendDeal): Deal {
    return {
        dealId: raw.id,
        externalId: raw.externalId ?? null,
        name: raw.name,
        stage: raw.stage,
        amount: raw.amount ?? 0,
        conversionProbability: typeof raw.conversionProbability === "number"
            ? raw.conversionProbability
            : 0.5,
        owner: raw.owner ?? undefined,
        companyName: raw.companyName ?? undefined,
        closeDate: raw.closeDate ?? null,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
    };
}

// ── Normalise list response ────────────────────────────────────────────────
// GET /api/deals/get-deals may return:
//   - Deal[]                          (plain array)
//   - { data: Deal[], pagination: {} }
//   - { deals: Deal[], total: N }

function normaliseList(raw: unknown): BackendDeal[] {
    if (Array.isArray(raw)) return raw as BackendDeal[];
    const r = raw as Record<string, unknown>;
    if (Array.isArray(r.data))  return r.data  as BackendDeal[];
    if (Array.isArray(r.deals)) return r.deals as BackendDeal[];
    return [];
}

// ── GET all deals ─────────────────────────────────────────────────────────
// Swagger: GET /api/deals/get-deals

export async function fetchDeals(): Promise<Deal[]> {
    const res = await api.get("/api/deals/get-deals");
    return normaliseList(res.data).map(mapDeal);
}

// ── GET single deal ───────────────────────────────────────────────────────
// Swagger: GET /api/deals/get-deal/{id}

export async function fetchDealById(dealId: string): Promise<Deal> {
    const res = await api.get<BackendDeal>(`/api/deals/get-deal/${dealId}`);
    return mapDeal(res.data);
}

// ── POST create deal ──────────────────────────────────────────────────────
// Swagger: POST /api/deals/create
// Required fields: name, amount, stage

export interface CreateDealPayload {
    name: string;
    amount: number;
    stage: DealStage | string;
    assignedToId?: string | null;
    contactId?: string | null;
    companyId?: string | null;
}

export async function createDeal(data: CreateDealPayload): Promise<Deal> {
    const payload: Record<string, unknown> = {
        name: data.name,
        amount: data.amount,
        stage: data.stage,
    };
    if (data.assignedToId?.trim()) payload.assignedToId = data.assignedToId.trim();
    if (data.contactId?.trim())    payload.contactId    = data.contactId.trim();
    if (data.companyId?.trim())    payload.companyId    = data.companyId.trim();

    const res = await api.post<BackendDeal>("/api/deals/create", payload);
    return mapDeal(res.data);
}

// ── PATCH update deal ─────────────────────────────────────────────────────
// Swagger: PATCH /api/deals/update-deal/{id}

export async function updateDealStage(
    dealId: string,
    stage: DealStage | string
): Promise<Deal> {
    const res = await api.patch<BackendDeal>(`/api/deals/update-deal/${dealId}`, { stage });
    return mapDeal(res.data);
}

// ── PATCH update deal (General) ───────────────────────────────────────────
// Swagger: PATCH /api/deals/update-deal/{id}

export interface UpdateDealPayload {
    name?: string;
    amount?: number;
    stage?: string;
    assignedToId?: string | null;
    contactId?: string | null;
    companyId?: string | null;
    closeDate?: string | null;
}

export async function updateDeal(
    dealId: string,
    data: UpdateDealPayload
): Promise<Deal> {
    const payload: Record<string, unknown> = {};
    
    if (data.name !== undefined) payload.name = data.name;
    if (data.amount !== undefined) payload.amount = data.amount;
    if (data.stage !== undefined) payload.stage = data.stage;
    if (data.assignedToId !== undefined) payload.assignedToId = data.assignedToId;
    if (data.contactId !== undefined) payload.contactId = data.contactId;
    if (data.companyId !== undefined) payload.companyId = data.companyId;
    if (data.closeDate !== undefined) payload.closeDate = data.closeDate;

    const res = await api.patch<BackendDeal>(`/api/deals/update-deal/${dealId}`, payload);
    return mapDeal(res.data);
}
