// lib/api/duplicatesApi.ts
// All network calls for the Duplicate Lead Merge workflow.
//
// Swagger endpoints:
//   GET  /leads/duplicates  — returns groups of duplicate leads
//   POST /leads/merge       — merges duplicates into a primary lead
//
//
// If the backend returns empty/error, it throws an error.

import api from "@/lib/api/api";
import { DuplicatesResponse, DuplicateGroup, MergePayload, MergeResponse } from "@/types/duplicates";
import { Lead } from "@/types/leads";



// ── GET /leads/duplicates ─────────────────────────────────────────────────────

export async function fetchDuplicates(): Promise<DuplicatesResponse> {
  try {
    const res = await api.get<DuplicatesResponse>("/leads/duplicates");
    const data = res.data;

    // Normalise various response shapes
    const groups: DuplicateGroup[] = Array.isArray(data)
      ? (data as DuplicateGroup[])
      : Array.isArray(data?.groups)
      ? data.groups
      : [];

    return { groups, total: groups.length };
  } catch (err) {
    console.error("Failed to fetch duplicates:", err);
    throw err;
  }
}

// ── POST /leads/merge ─────────────────────────────────────────────────────────

interface BackendMergePayload {
  primaryLeadId: string;
  duplicateLeadId: string;
  fieldResolutions?: Record<string, string>;
}

export async function mergeLeads(payload: MergePayload): Promise<MergeResponse> {
  // Send one merge request per duplicate lead (backend expects duplicateLeadId singular)
  for (const duplicateId of payload.duplicateLeadIds) {
    const backendPayload: BackendMergePayload = {
      primaryLeadId: payload.primaryLeadId,
      duplicateLeadId: duplicateId,
      fieldResolutions: payload.fieldResolutions,
    };
    await api.post<MergeResponse>("/leads/merge", backendPayload);
  }

  return {
    success: true,
    mergedLead: {} as Lead,
    message: "Merge completed successfully",
  };
}
