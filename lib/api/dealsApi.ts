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
    leadId?: string;
    [key: string]: unknown;
}

// ── Map BackendDeal → frontend Deal ───────────────────────────────────────

function mapDeal(raw: BackendDeal): Deal {
  const mappedStage = raw.stage ? raw.stage.toUpperCase() : "NEW";
  return {
    ...raw,
    dealId: raw.id,
    externalId: raw.externalId ?? null,
    name: raw.name,
    stage: mappedStage,
    amount: raw.amount ?? 0,
    currency: (raw.currency as string) || "USD",
    conversionProbability: typeof raw.conversionProbability === "number"
      ? raw.conversionProbability
      : 0.5,
    owner: raw.owner ?? undefined,
    companyName: raw.companyName ?? undefined,
    closeDate: raw.closeDate ?? null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    leadId: raw.leadId ?? undefined,
    pipelineId: (raw.pipelineId as string) ?? undefined,
    healthScore: typeof raw.healthScore === "number" ? raw.healthScore : undefined,
    healthStatus: (raw.healthStatus as string) ?? undefined,
    riskLevel: (raw.riskLevel as string) ?? undefined,
    forecastCategory: (raw.forecastCategory as string) ?? undefined,
    contactId: (raw.contactId as string) ?? null,
    companyId: (raw.companyId as string) ?? null,
    // Enterprise BE-2 Day 5 fields
    opportunityType: (raw.opportunityType as any) || "NEW_BUSINESS",
    region: (raw.region as string) || undefined,
    legalEntity: (raw.legalEntity as string) || undefined,
    channel: (raw.channel as string) || "DIRECT",
    partnerId: (raw.partnerId as string) || null,
    partnerName: (raw.partnerName as string) || null,
    partnerSplitPercentage: typeof raw.partnerSplitPercentage === "number" ? raw.partnerSplitPercentage : null,
    productId: (raw.productId as string) || null,
    productName: (raw.productName as string) || null,
    subscriptionId: (raw.subscriptionId as string) || null,
    parentSubscriptionId: (raw.parentSubscriptionId as string) || null,
    subscriptionRelationship: (raw.subscriptionRelationship as string) || null,
    sharedOwners: Array.isArray(raw.sharedOwners) ? (raw.sharedOwners as any) : undefined,
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
    const res = await api.get("/api/deals/get-deals?limit=1000");
    // Backend returns { data: deals[], pagination: {...} }
    return (res.data.data || []).map(mapDeal);
}

// ── GET single deal ───────────────────────────────────────────────────────
// Swagger: GET /api/deals/get-deal/{id}

export async function fetchDealById(
    dealId: string
): Promise<Deal> {

    const res = await api.get(
        `/api/deals/get-deal/${dealId}`
    );

    const raw =
        res.data?.data ||
        res.data?.deal ||
        res.data;

    return mapDeal(raw);
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
    pipelineId?: string | null;
    currency?: string | null;
    opportunityType?: string | null;
    region?: string | null;
    legalEntity?: string | null;
    channel?: string | null;
    partnerId?: string | null;
    partnerName?: string | null;
    partnerSplitPercentage?: number | null;
    productId?: string | null;
    subscriptionId?: string | null;
    parentSubscriptionId?: string | null;
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
    if (data.pipelineId?.trim())   payload.pipelineId   = data.pipelineId.trim();
    if (data.currency?.trim())     payload.currency     = data.currency.trim();
    if (data.opportunityType?.trim()) payload.opportunityType = data.opportunityType.trim();
    if (data.region?.trim())       payload.region       = data.region.trim();
    if (data.legalEntity?.trim())  payload.legalEntity  = data.legalEntity.trim();
    if (data.channel?.trim())      payload.channel      = data.channel.trim();
    if (data.partnerId?.trim())    payload.partnerId    = data.partnerId.trim();
    if (data.partnerName?.trim())  payload.partnerName  = data.partnerName.trim();
    if (typeof data.partnerSplitPercentage === "number") payload.partnerSplitPercentage = data.partnerSplitPercentage;
    if (data.productId?.trim())    payload.productId    = data.productId.trim();
    if (data.subscriptionId?.trim()) payload.subscriptionId = data.subscriptionId.trim();
    if (data.parentSubscriptionId?.trim()) payload.parentSubscriptionId = data.parentSubscriptionId.trim();

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
    currency?: string | null;
    opportunityType?: string | null;
    region?: string | null;
    legalEntity?: string | null;
    channel?: string | null;
    partnerId?: string | null;
    partnerName?: string | null;
    partnerSplitPercentage?: number | null;
    productId?: string | null;
    subscriptionId?: string | null;
    parentSubscriptionId?: string | null;
    subscriptionRelationship?: string | null;
}

export async function updateDeal(
    dealId: string,
    data: UpdateDealPayload
): Promise<Deal> {

    const payload = {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.stage !== undefined && {
            stage: String(data.stage).toUpperCase(),
        }),
        ...(data.amount !== undefined && {
            amount: Number(data.amount),
        }),
        ...(data.assignedToId !== undefined && {
            assignedToId: data.assignedToId,
        }),
        ...(data.contactId !== undefined && {
            contactId: data.contactId,
        }),
        ...(data.companyId !== undefined && {
            companyId: data.companyId,
        }),
        ...(data.closeDate !== undefined && {
            closeDate: data.closeDate,
        }),
        ...(data.currency !== undefined && {
            currency: data.currency,
        }),
        ...(data.opportunityType !== undefined && {
            opportunityType: data.opportunityType,
        }),
        ...(data.region !== undefined && {
            region: data.region,
        }),
        ...(data.legalEntity !== undefined && {
            legalEntity: data.legalEntity,
        }),
        ...(data.channel !== undefined && {
            channel: data.channel,
        }),
        ...(data.partnerId !== undefined && {
            partnerId: data.partnerId,
        }),
        ...(data.partnerName !== undefined && {
            partnerName: data.partnerName,
        }),
        ...(data.partnerSplitPercentage !== undefined && {
            partnerSplitPercentage: data.partnerSplitPercentage,
        }),
        ...(data.productId !== undefined && {
            productId: data.productId,
        }),
        ...(data.subscriptionId !== undefined && {
            subscriptionId: data.subscriptionId,
        }),
        ...(data.parentSubscriptionId !== undefined && {
            parentSubscriptionId: data.parentSubscriptionId,
        }),
        ...(data.subscriptionRelationship !== undefined && {
            subscriptionRelationship: data.subscriptionRelationship,
        }),
    };

    const res = await api.patch(
        `/api/deals/update-deal/${dealId}`,
        payload
    );

    return mapDeal(res.data);
}

// ── GET pipeline stats ─────────────────────────────────────
export interface PipelineStageStat {
    stage?: string;
    amount?: number;
    totalAmount?: number;
    value?: number;
    [key: string]: unknown;
}

export interface PipelineStatsResponse {
    stages?: PipelineStageStat[];
    pipeline?: PipelineStageStat[];
    data?: PipelineStageStat[];
    totalValue?: number;
    [key: string]: unknown;
}

export async function fetchPipelineStats(): Promise<PipelineStatsResponse> {
    const res = await api.get<PipelineStatsResponse>("/api/deals/pipeline-stats");
    return res.data;
}

// ── POST assign deal ───────────────────────────────────────
export async function assignDeal(
    dealId: string,
    assignedToId: string
): Promise<Deal> {
    const res = await api.post<BackendDeal>(`/api/deals/assign-deal/${dealId}`, {
        assignedToId,
    });
    return mapDeal(res.data);
}

// ── POST add note to deal ───────────────────────────────────
export async function addDealNote(
    dealId: string,
    note: string
): Promise<any> {
    const res = await api.post(`/api/deals/add-note/${dealId}`, { note });
    return res.data;
}
