// lib/api/bulkOperationsApi.ts
// Bulk Operations API calls.
//
// Swagger-confirmed endpoints:
//   PATCH  /leads/bulk-assign        — bulk assign leads
//   PATCH  /leads/bulk-update        — bulk update lead fields
//   DELETE /leads/bulk-delete        — bulk delete leads
//   PATCH  /api/contact/bulk-update  — bulk update contacts
//   DELETE /api/contact/bulk-delete  — bulk delete contacts
//   PATCH  /api/deals/bulk-assign    — bulk assign deals
//   PATCH  /api/deals/bulk-update    — bulk update deals
//   DELETE /api/deals/bulk-delete    — bulk delete deals
//   PATCH  /api/company/bulk-update  — bulk update companies
//   DELETE /api/company/bulk-delete  — bulk delete companies

import api from "@/lib/api/api";
import {
  BulkAssignPayload,
  BulkUpdatePayload,
  BulkDeletePayload,
  ContactBulkUpdatePayload,
  ContactBulkDeletePayload,
  DealBulkAssignPayload,
  DealBulkUpdatePayload,
  DealBulkDeletePayload,
  CompanyBulkUpdatePayload,
  CompanyBulkDeletePayload,
  BulkOperationResult,
} from "@/types/bulkOperations";

// ─────────────────────────────────────────────────────────────────────────────
// LEADS BULK OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

// ── PATCH /leads/bulk-assign ──────────────────────────────────────────────────

export async function bulkAssignLeads(
  payload: BulkAssignPayload,
  onProgress?: (pct: number) => void
): Promise<BulkOperationResult> {
  try {
    onProgress?.(10);
    // Strip assignedToName (not accepted by backend per swagger)
    const { assignedToName, ...apiPayload } = payload;
    console.log('[bulkAssignLeads] Sending payload:', apiPayload);
    const res = await api.patch<BulkOperationResult>("/leads/bulk-assign", apiPayload);
    console.log('[bulkAssignLeads] Response:', res.data);
    onProgress?.(100);
    return res.data;
  } catch (err: unknown) {
    console.error('[bulkAssignLeads] Error:', err);
    throw err;
  }
}

// ── PATCH /leads/bulk-update ──────────────────────────────────────────────────

export async function bulkUpdateLeads(
  payload: BulkUpdatePayload,
  onProgress?: (pct: number) => void
): Promise<BulkOperationResult> {
  try {
    onProgress?.(10);
    console.log('[bulkUpdateLeads] Sending payload:', payload);
    const res = await api.patch<BulkOperationResult>("/leads/bulk-update", payload);
    console.log('[bulkUpdateLeads] Response:', res.data);
    onProgress?.(100);
    return res.data;
  } catch (err: unknown) {
    console.error('[bulkUpdateLeads] Error:', err);
    throw err;
  }
}

// ── DELETE /leads/bulk-delete ─────────────────────────────────────────────────

export async function bulkDeleteLeads(
  payload: BulkDeletePayload,
  onProgress?: (pct: number) => void
): Promise<BulkOperationResult> {
  try {
    onProgress?.(10);
    console.log('[bulkDeleteLeads] Sending payload:', payload);
    const res = await api.delete<BulkOperationResult>("/leads/bulk-delete", { data: payload });
    console.log('[bulkDeleteLeads] Response:', res.data);
    onProgress?.(100);
    return res.data;
  } catch (err: unknown) {
    console.error('[bulkDeleteLeads] Error:', err);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTACTS BULK OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

// ── PATCH /api/contact/bulk-update ────────────────────────────────────────────

export async function bulkUpdateContacts(
  payload: ContactBulkUpdatePayload,
  onProgress?: (pct: number) => void
): Promise<BulkOperationResult> {
  try {
    onProgress?.(10);
    console.log('[bulkUpdateContacts] Sending payload:', payload);
    const res = await api.patch<BulkOperationResult>("/api/contact/bulk-update", payload);
    console.log('[bulkUpdateContacts] Response:', res.data);
    onProgress?.(100);
    return res.data;
  } catch (err: unknown) {
    console.error('[bulkUpdateContacts] Error:', err);
    throw err;
  }
}

// ── DELETE /api/contact/bulk-delete ───────────────────────────────────────────

export async function bulkDeleteContacts(
  payload: ContactBulkDeletePayload,
  onProgress?: (pct: number) => void
): Promise<BulkOperationResult> {
  try {
    onProgress?.(10);
    console.log('[bulkDeleteContacts] Sending payload:', payload);
    const res = await api.delete<BulkOperationResult>("/api/contact/bulk-delete", { data: payload });
    console.log('[bulkDeleteContacts] Response:', res.data);
    onProgress?.(100);
    return res.data;
  } catch (err: unknown) {
    console.error('[bulkDeleteContacts] Error:', err);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DEALS BULK OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

// ── PATCH /api/deals/bulk-assign ──────────────────────────────────────────────

export async function bulkAssignDeals(
  payload: DealBulkAssignPayload,
  onProgress?: (pct: number) => void
): Promise<BulkOperationResult> {
  try {
    onProgress?.(10);
    // Strip assignedToName (not accepted by backend per swagger)
    const { assignedToName, ...apiPayload } = payload;
    console.log('[bulkAssignDeals] Sending payload:', apiPayload);
    const res = await api.patch<BulkOperationResult>("/api/deals/bulk-assign", apiPayload);
    console.log('[bulkAssignDeals] Response:', res.data);
    onProgress?.(100);
    return res.data;
  } catch (err: unknown) {
    console.error('[bulkAssignDeals] Error:', err);
    throw err;
  }
}

// ── PATCH /api/deals/bulk-update ──────────────────────────────────────────────

export async function bulkUpdateDeals(
  payload: DealBulkUpdatePayload,
  onProgress?: (pct: number) => void
): Promise<BulkOperationResult> {
  try {
    onProgress?.(10);
    console.log('[bulkUpdateDeals] Sending payload:', payload);
    const res = await api.patch<BulkOperationResult>("/api/deals/bulk-update", payload);
    console.log('[bulkUpdateDeals] Response:', res.data);
    onProgress?.(100);
    return res.data;
  } catch (err: unknown) {
    console.error('[bulkUpdateDeals] Error:', err);
    throw err;
  }
}

// ── DELETE /api/deals/bulk-delete ─────────────────────────────────────────────

export async function bulkDeleteDeals(
  payload: DealBulkDeletePayload,
  onProgress?: (pct: number) => void
): Promise<BulkOperationResult> {
  try {
    onProgress?.(10);
    console.log('[bulkDeleteDeals] Sending payload:', payload);
    const res = await api.delete<BulkOperationResult>("/api/deals/bulk-delete", { data: payload });
    console.log('[bulkDeleteDeals] Response:', res.data);
    onProgress?.(100);
    return res.data;
  } catch (err: unknown) {
    console.error('[bulkDeleteDeals] Error:', err);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPANIES BULK OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

// ── PATCH /api/company/bulk-update ────────────────────────────────────────────

export async function bulkUpdateCompanies(
  payload: CompanyBulkUpdatePayload,
  onProgress?: (pct: number) => void
): Promise<BulkOperationResult> {
  try {
    onProgress?.(10);
    console.log('[bulkUpdateCompanies] Sending payload:', payload);
    const res = await api.patch<BulkOperationResult>("/api/company/bulk-update", payload);
    console.log('[bulkUpdateCompanies] Response:', res.data);
    onProgress?.(100);
    return res.data;
  } catch (err: unknown) {
    console.error('[bulkUpdateCompanies] Error:', err);
    throw err;
  }
}

// ── DELETE /api/company/bulk-delete ───────────────────────────────────────────

export async function bulkDeleteCompanies(
  payload: CompanyBulkDeletePayload,
  onProgress?: (pct: number) => void
): Promise<BulkOperationResult> {
  try {
    onProgress?.(10);
    console.log('[bulkDeleteCompanies] Sending payload:', payload);
    const res = await api.delete<BulkOperationResult>("/api/company/bulk-delete", { data: payload });
    console.log('[bulkDeleteCompanies] Response:', res.data);
    onProgress?.(100);
    return res.data;
  } catch (err: unknown) {
    console.error('[bulkDeleteCompanies] Error:', err);
    throw err;
  }
}
