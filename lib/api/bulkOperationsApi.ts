// lib/api/bulkOperationsApi.ts
// Bulk Operations API calls (Task 5).
//
// Backend bulk endpoints are NOT in the current Swagger spec.
// These are service placeholders using the expected endpoint names.
// When backend developer (Waqar) implements them, only replace the
// mock implementations below — interfaces stay the same.
//
// Expected endpoints (to be implemented):
//   POST /leads/bulk-assign  — bulk assign leads to a user
//   POST /leads/bulk-update  — bulk update lead fields
//   POST /leads/bulk-delete  — bulk delete leads
//
// All mock responses are marked with isMock: true

import api from "@/lib/api/api";
import {
  BulkAssignPayload,
  BulkUpdatePayload,
  BulkDeletePayload,
  BulkOperationResult,
} from "@/types/bulkOperations";

// ── Helper: simulate progress delay ──────────────────────────────────────────

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

// ── POST /leads/bulk-assign ───────────────────────────────────────────────────

export async function bulkAssignLeads(
  payload: BulkAssignPayload,
  onProgress?: (pct: number) => void
): Promise<BulkOperationResult> {
  try {
    const res = await api.post<BulkOperationResult>("/leads/bulk-assign", payload);
    return res.data;
  } catch {
    // MOCK DATA — backend bulk-assign not yet implemented
    // Simulate progress
    for (let i = 0; i <= 100; i += 20) {
      onProgress?.(i);
      await delay(150);
    }
    return {
      success: true,
      processedCount: payload.leadIds.length,
      failedCount: 0,
      message: `${payload.leadIds.length} lead(s) assigned to ${payload.assignedToName ?? "selected user"}.`,
      // @ts-expect-error mock flag
      isMock: true,
    };
  }
}

// ── POST /leads/bulk-update ───────────────────────────────────────────────────

export async function bulkUpdateLeads(
  payload: BulkUpdatePayload,
  onProgress?: (pct: number) => void
): Promise<BulkOperationResult> {
  try {
    const res = await api.post<BulkOperationResult>("/leads/bulk-update", payload);
    return res.data;
  } catch {
    // MOCK DATA — backend bulk-update not yet implemented
    for (let i = 0; i <= 100; i += 25) {
      onProgress?.(i);
      await delay(150);
    }
    const updatedFields = Object.keys(payload.updates)
      .filter((k) => payload.updates[k as keyof typeof payload.updates] != null)
      .join(", ");
    return {
      success: true,
      processedCount: payload.leadIds.length,
      failedCount: 0,
      message: `${payload.leadIds.length} lead(s) updated. Fields: ${updatedFields}.`,
      // @ts-expect-error mock flag
      isMock: true,
    };
  }
}

// ── POST /leads/bulk-delete ───────────────────────────────────────────────────

export async function bulkDeleteLeads(
  payload: BulkDeletePayload,
  onProgress?: (pct: number) => void
): Promise<BulkOperationResult> {
  try {
    const res = await api.post<BulkOperationResult>("/leads/bulk-delete", payload);
    return res.data;
  } catch {
    // MOCK DATA — backend bulk-delete not yet implemented
    for (let i = 0; i <= 100; i += 20) {
      onProgress?.(i);
      await delay(120);
    }
    return {
      success: true,
      processedCount: payload.leadIds.length,
      failedCount: 0,
      message: `${payload.leadIds.length} lead(s) deleted.`,
      // @ts-expect-error mock flag
      isMock: true,
    };
  }
}
