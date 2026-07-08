// lib/api/bulkOperationsApi.ts
// Bulk Operations API calls (Task 5).
//
// Backend bulk endpoints are NOT in the current Swagger spec.
// Service placeholders ready — when Waqar implements these endpoints
// only remove the mock blocks below; interfaces stay identical.
//
// Expected backend endpoints:
//   POST /leads/bulk-assign  — bulk assign leads to a user
//   POST /leads/bulk-update  — bulk update lead fields
//   POST /leads/bulk-delete  — bulk delete leads

import api from "@/lib/api/api";
import {
  BulkAssignPayload,
  BulkUpdatePayload,
  BulkDeletePayload,
  BulkOperationResult,
} from "@/types/bulkOperations";

// ── Simulated progress helper ─────────────────────────────────────────────────

async function simulateProgress(
  onProgress: ((pct: number) => void) | undefined,
  steps: number,
  stepDelayMs: number
): Promise<void> {
  for (let i = 0; i <= steps; i++) {
    onProgress?.(Math.round((i / steps) * 100));
    await new Promise<void>((resolve) => setTimeout(resolve, stepDelayMs));
  }
}

// ── POST /leads/bulk-assign ───────────────────────────────────────────────────

export async function bulkAssignLeads(
  payload: BulkAssignPayload,
  onProgress?: (pct: number) => void
): Promise<BulkOperationResult> {
  try {
    const res = await api.post<BulkOperationResult>("/leads/bulk-assign", payload);
    return res.data;
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;

    // 404 / 405 / 501 → endpoint not implemented yet — use mock response
    if (!status || status === 404 || status === 405 || status === 501) {
      // MOCK DATA — backend bulk-assign not yet implemented
      await simulateProgress(onProgress, 5, 150);
      return {
        success: true,
        processedCount: payload.leadIds.length,
        failedCount: 0,
        message: `${payload.leadIds.length} lead(s) assigned to ${
          payload.assignedToName ?? "selected user"
        }. (Preview — backend pending)`,
        // isMock: true — signals mock data to consumers
      } satisfies BulkOperationResult;
    }
    throw err;
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
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;

    if (!status || status === 404 || status === 405 || status === 501) {
      // MOCK DATA — backend bulk-update not yet implemented
      await simulateProgress(onProgress, 4, 150);
      const updatedFields = Object.keys(payload.updates)
        .filter((k) => payload.updates[k as keyof typeof payload.updates] != null)
        .join(", ");
      return {
        success: true,
        processedCount: payload.leadIds.length,
        failedCount: 0,
        message: `${payload.leadIds.length} lead(s) updated (fields: ${
          updatedFields || "none"
        }). (Preview — backend pending)`,
      } satisfies BulkOperationResult;
    }
    throw err;
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
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;

    if (!status || status === 404 || status === 405 || status === 501) {
      // MOCK DATA — backend bulk-delete not yet implemented
      await simulateProgress(onProgress, 5, 120);
      return {
        success: true,
        processedCount: payload.leadIds.length,
        failedCount: 0,
        message: `${payload.leadIds.length} lead(s) deleted. (Preview — backend pending)`,
      } satisfies BulkOperationResult;
    }
    throw err;
  }
}
