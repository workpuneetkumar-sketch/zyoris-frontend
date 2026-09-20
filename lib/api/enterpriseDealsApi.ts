// lib/api/enterpriseDealsApi.ts
// Network services for BE-2 Day 5 (Enterprise Opportunity & Shared Owners)
// and BE-2 Day 6 (Manager Inspection, Pipeline Summary, Deal Summary, & NBA Decisions)

import api from "@/lib/api/api";
import {
  SharedOwner,
  CreateSharedOwnerPayload,
  ManagerInspectionDeal,
  ManagerInspectionFilters,
  PipelineSummary,
  ManagerDealSummary,
  NbaDecisionPayload,
} from "@/types/enterpriseDeals";

// ── Day 5: Shared Owners APIs ────────────────────────────────────────────────

export async function fetchSharedOwners(dealId: string): Promise<SharedOwner[]> {
  try {
    const res = await api.get(`/api/deals/${dealId}/shared-owners`);
    const data = res.data?.data || res.data?.sharedOwners || res.data;
    return Array.isArray(data) ? data : [];
  } catch (err: any) {
    if (err?.response?.status === 404) {
      try {
        const fallback = await api.get(`/deals/${dealId}/shared-owners`);
        const d = fallback.data?.data || fallback.data?.sharedOwners || fallback.data;
        return Array.isArray(d) ? d : [];
      } catch {
        return [];
      }
    }
    console.warn(`Could not fetch shared owners for deal ${dealId}:`, err);
    return [];
  }
}

export async function addOrUpdateSharedOwner(
  dealId: string,
  payload: CreateSharedOwnerPayload
): Promise<SharedOwner> {
  const body = {
    userId: payload.userId,
    role: payload.role || "CO_OWNER",
    splitPercentage: Number(payload.splitPercentage),
  };

  try {
    // Try POST as defined in Swagger spec
    const res = await api.post(`/api/deals/${dealId}/shared-owners`, body);
    return res.data?.data || res.data;
  } catch (err: any) {
    // Try PUT as mentioned in prompt
    if (err?.response?.status === 404 || err?.response?.status === 405) {
      try {
        const putRes = await api.put(`/api/deals/${dealId}/shared-owners`, body);
        return putRes.data?.data || putRes.data;
      } catch {
        const fallback = await api.post(`/deals/${dealId}/shared-owners`, body);
        return fallback.data?.data || fallback.data;
      }
    }
    throw err;
  }
}

export async function deleteSharedOwner(
  dealId: string,
  sharedOwnerId: string
): Promise<boolean> {
  try {
    await api.delete(`/api/deals/${dealId}/shared-owners/${sharedOwnerId}`);
    return true;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      try {
        await api.delete(`/deals/${dealId}/shared-owners/${sharedOwnerId}`);
        return true;
      } catch {
        return false;
      }
    }
    throw err;
  }
}

// ── Day 6: Manager Inspection & Pipeline Summary ─────────────────────────────

export async function fetchManagerInspectionQueue(
  filters?: ManagerInspectionFilters
): Promise<{
  deals: ManagerInspectionDeal[];
  total?: number;
  averageHealthScore?: number;
  highRiskCount?: number;
}> {
  const params: Record<string, string | number> = {};
  if (filters?.pipelineId) params.pipelineId = filters.pipelineId;
  if (filters?.stage && filters.stage !== "All Stages") params.stage = filters.stage;
  if (filters?.ownerId && filters.ownerId !== "All Owners") params.ownerId = filters.ownerId;
  if (filters?.riskSeverity && filters.riskSeverity !== "ALL") params.riskSeverity = filters.riskSeverity;
  if (typeof filters?.minScore === "number") params.minScore = filters.minScore;
  if (typeof filters?.maxScore === "number") params.maxScore = filters.maxScore;
  if (filters?.limit) params.limit = filters.limit;

  try {
    const res = await api.get("/api/deals/manager-inspection", { params });
    const raw = res.data?.data || res.data;

    const dealsList: ManagerInspectionDeal[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.deals)
      ? raw.deals
      : Array.isArray(raw?.queue)
      ? raw.queue
      : [];

    const mapped = dealsList.map((d: any) => ({
      id: d.id || d.dealId,
      dealId: d.dealId || d.id,
      name: d.name || d.dealName || "Untitled Deal",
      amount: Number(d.amount || 0),
      currency: d.currency || "USD",
      stage: d.stage || "NEW",
      opportunityType: d.opportunityType || "NEW_BUSINESS",
      owner: d.owner || d.ownerName || null,
      ownerId: d.ownerId || null,
      healthScore: typeof d.healthScore === "number" ? d.healthScore : null,
      riskSeverity: d.riskSeverity || (d.healthScore && d.healthScore < 40 ? "HIGH" : d.healthScore && d.healthScore < 70 ? "MEDIUM" : "LOW"),
      daysSlipped: typeof d.daysSlipped === "number" ? d.daysSlipped : 0,
      stageDwellDays: typeof d.stageDwellDays === "number" ? d.stageDwellDays : typeof d.dwellDays === "number" ? d.dwellDays : 0,
      closeDate: d.closeDate || null,
      keyRisk: d.keyRisk || d.topRisk || null,
      nbaCount: typeof d.nbaCount === "number" ? d.nbaCount : (d.nbaProposals?.length ?? 0),
    }));

    return {
      deals: mapped,
      total: raw?.total ?? mapped.length,
      averageHealthScore: raw?.averageHealthScore,
      highRiskCount: raw?.highRiskCount ?? mapped.filter((d) => d.riskSeverity === "HIGH").length,
    };
  } catch (err: any) {
    if (err?.response?.status === 404) {
      try {
        const fallback = await api.get("/deals/manager-inspection", { params });
        const raw = fallback.data?.data || fallback.data;
        const dealsList = Array.isArray(raw) ? raw : raw?.deals || [];
        return {
          deals: dealsList.map((d: any) => ({
            id: d.id || d.dealId,
            dealId: d.dealId || d.id,
            name: d.name || "Untitled Deal",
            amount: Number(d.amount || 0),
            currency: d.currency || "USD",
            stage: d.stage || "NEW",
            opportunityType: d.opportunityType || "NEW_BUSINESS",
            owner: d.owner || null,
            ownerId: d.ownerId || null,
            healthScore: d.healthScore ?? null,
            riskSeverity: d.riskSeverity || "LOW",
            daysSlipped: d.daysSlipped || 0,
            stageDwellDays: d.stageDwellDays || 0,
            closeDate: d.closeDate || null,
            keyRisk: d.keyRisk || null,
            nbaCount: d.nbaCount || 0,
          })),
          total: dealsList.length,
        };
      } catch {
        return { deals: [] };
      }
    }
    console.warn("Could not fetch manager inspection queue:", err);
    return { deals: [] };
  }
}

export async function fetchPipelineSummary(): Promise<PipelineSummary | null> {
  try {
    const res = await api.get("/api/deals/pipeline-summary");
    const raw = res.data?.data || res.data;
    if (!raw) return null;

    // Normalise opportunityTypeBreakdown
    let breakdown: Array<{ type: string; count: number; amount: number }> = [];
    if (Array.isArray(raw.opportunityTypeBreakdown)) {
      breakdown = raw.opportunityTypeBreakdown;
    } else if (raw.opportunityTypeBreakdown && typeof raw.opportunityTypeBreakdown === "object") {
      breakdown = Object.entries(raw.opportunityTypeBreakdown).map(([type, stats]: [string, any]) => ({
        type,
        count: stats?.count ?? (typeof stats === "number" ? stats : 0),
        amount: stats?.amount ?? 0,
      }));
    }

    // Normalise riskDrivers
    let riskDrivers: Array<{ risk: string; severity: "LOW" | "MEDIUM" | "HIGH" | string; affectedDealsCount: number; exposureAmount?: number }> = [];
    if (Array.isArray(raw.riskDrivers)) {
      riskDrivers = raw.riskDrivers.map((r: any) =>
        typeof r === "string"
          ? { risk: r, severity: "HIGH", affectedDealsCount: 1 }
          : {
              risk: r.risk || r.name || "Identified Pipeline Risk",
              severity: r.severity || "MEDIUM",
              affectedDealsCount: r.affectedDealsCount || r.count || 1,
              exposureAmount: r.exposureAmount,
            }
      );
    }

    return {
      totalDeals: Number(raw.totalDeals || raw.dealCount || 0),
      totalPipelineAmount: Number(raw.totalPipelineAmount || raw.pipelineValue || 0),
      currency: raw.currency || "USD",
      opportunityTypeBreakdown: breakdown,
      riskDrivers,
      executiveNarrative: raw.executiveNarrative || raw.narrative || raw.summary || "Pipeline health and velocity analysis generated from live deal inspection telemetry.",
      generatedAt: raw.generatedAt || raw.timestamp || new Date().toISOString(),
      timestamp: raw.timestamp || raw.generatedAt || new Date().toISOString(),
    };
  } catch (err: any) {
    if (err?.response?.status === 404) {
      try {
        const fallback = await api.get("/deals/pipeline-summary");
        const raw = fallback.data?.data || fallback.data;
        if (!raw) return null;
        return {
          totalDeals: Number(raw.totalDeals || 0),
          totalPipelineAmount: Number(raw.totalPipelineAmount || 0),
          currency: raw.currency || "USD",
          opportunityTypeBreakdown: Array.isArray(raw.opportunityTypeBreakdown) ? raw.opportunityTypeBreakdown : [],
          riskDrivers: Array.isArray(raw.riskDrivers) ? raw.riskDrivers : [],
          executiveNarrative: raw.executiveNarrative || "Pipeline analysis generated from live opportunity metrics.",
          generatedAt: raw.generatedAt || new Date().toISOString(),
          timestamp: raw.timestamp || new Date().toISOString(),
        };
      } catch {
        return null;
      }
    }
    console.warn("Could not fetch pipeline summary:", err);
    return null;
  }
}

export async function fetchManagerDealSummary(
  dealId: string
): Promise<ManagerDealSummary | null> {
  try {
    const res = await api.get(`/api/deals/${dealId}/manager-summary`);
    const raw = res.data?.data || res.data;
    if (!raw) return null;

    // Normalise signals
    const signals = Array.isArray(raw.keySignals)
      ? raw.keySignals.map((s: any) =>
          typeof s === "string" ? { signal: s, sentiment: "NEUTRAL" } : s
        )
      : [];

    // Normalise risks
    const risks = Array.isArray(raw.activeRisks)
      ? raw.activeRisks.map((r: any) =>
          typeof r === "string" ? { risk: r, severity: "MEDIUM" } : r
        )
      : [];

    // Normalise proposals
    const proposals = Array.isArray(raw.nbaProposals)
      ? raw.nbaProposals.map((p: any) => ({
          id: p.id || String(Date.now()),
          dealId: p.dealId || dealId,
          action: p.action || p.title || "Review Opportunity Strategy",
          title: p.title || p.action,
          rationale: p.rationale || p.reason || "Recommended based on recent deal health indicators.",
          confidence: typeof p.confidence === "number" ? p.confidence : 0.85,
          priority: p.priority || "HIGH",
          status: p.status || "PENDING",
          suggestedExecution: p.suggestedExecution,
          category: p.category,
          notes: p.notes,
          decidedAt: p.decidedAt,
          createdAt: p.createdAt || new Date().toISOString(),
        }))
      : [];

    return {
      dealId: raw.dealId || dealId,
      dealName: raw.dealName || raw.name,
      summaryNarrative: raw.summaryNarrative || raw.narrative || raw.summary || "Executive analysis of deal velocity, engagement signals, and forecast position.",
      keySignals: signals,
      activeRisks: risks,
      nbaProposals: proposals,
      generatedAt: raw.generatedAt || raw.timestamp || new Date().toISOString(),
      timestamp: raw.timestamp || raw.generatedAt || new Date().toISOString(),
    };
  } catch (err: any) {
    if (err?.response?.status === 404) {
      try {
        const fallback = await api.get(`/deals/${dealId}/manager-summary`);
        const raw = fallback.data?.data || fallback.data;
        if (!raw) return null;
        return {
          dealId: raw.dealId || dealId,
          dealName: raw.dealName,
          summaryNarrative: raw.summaryNarrative || raw.narrative || "Summary not available.",
          keySignals: Array.isArray(raw.keySignals) ? raw.keySignals : [],
          activeRisks: Array.isArray(raw.activeRisks) ? raw.activeRisks : [],
          nbaProposals: Array.isArray(raw.nbaProposals) ? raw.nbaProposals : [],
          generatedAt: raw.generatedAt || new Date().toISOString(),
          timestamp: raw.timestamp || new Date().toISOString(),
        };
      } catch {
        return null;
      }
    }
    console.warn(`Could not fetch manager summary for deal ${dealId}:`, err);
    return null;
  }
}

export async function decideNbaProposal(
  proposalId: string,
  payload: NbaDecisionPayload
): Promise<{ success: boolean; message?: string; alreadyDecided?: boolean }> {
  try {
    const res = await api.post(`/api/deals/nba-proposals/${proposalId}/decision`, payload);
    return {
      success: true,
      message: res.data?.message || `Proposal ${payload.action.toLowerCase()}ed successfully.`,
    };
  } catch (err: any) {
    // 400 = Proposal already decided; 409 = Duplicate execution conflict
    if (err?.response?.status === 400 || err?.response?.status === 409) {
      const msg = err.response.data?.message || "Proposal has already been decided.";
      return {
        success: false,
        alreadyDecided: true,
        message: msg,
      };
    }
    if (err?.response?.status === 404) {
      try {
        const fallback = await api.post(`/deals/nba-proposals/${proposalId}/decision`, payload);
        return {
          success: true,
          message: fallback.data?.message || `Proposal ${payload.action.toLowerCase()}ed successfully.`,
        };
      } catch (fallbackErr: any) {
        if (fallbackErr?.response?.status === 400 || fallbackErr?.response?.status === 409) {
          return {
            success: false,
            alreadyDecided: true,
            message: fallbackErr.response.data?.message || "Proposal already decided.",
          };
        }
        throw fallbackErr;
      }
    }
    throw err;
  }
}
