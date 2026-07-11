// types/bulkOperations.ts
// Types for all Bulk Operations across Leads, Contacts, Deals, and Companies.

// ── Shared result type ────────────────────────────────────────────────────────

export interface BulkOperationResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  message: string;
  errors?: Array<{ id: string; error: string }>;
}

export type BulkOperationType = "assign" | "update" | "delete";

export interface BulkOperationState {
  type: BulkOperationType | null;
  isOpen: boolean;
  isProcessing: boolean;
  progress: number;
  result: BulkOperationResult | null;
  error: string | null;
}

export const INITIAL_BULK_STATE: BulkOperationState = {
  type: null,
  isOpen: false,
  isProcessing: false,
  progress: 0,
  result: null,
  error: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// LEADS  (PATCH /leads/bulk-assign, PATCH /leads/bulk-update, DELETE /leads/bulk-delete)
// ─────────────────────────────────────────────────────────────────────────────

export interface BulkAssignPayload {
  ids: string[];
  assignedToId: string;
  assignedToName?: string;
}

export interface BulkUpdatePayload {
  ids: string[];
  data: {
    name?: string;
    phone?: string | null;
    email?: string | null;
    company?: string | null;
    city?: string | null;
    source?: string | null;
    status?: string;
    assignedToId?: string | null;
    tags?: string[];
  };
}

export interface BulkDeletePayload {
  ids: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTACTS  (PATCH /api/contact/bulk-update, DELETE /api/contact/bulk-delete)
// ─────────────────────────────────────────────────────────────────────────────

export interface ContactBulkUpdatePayload {
  ids: string[];
  data: {
    companyId?: string | null;
  };
}

export interface ContactBulkDeletePayload {
  ids: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// DEALS  (PATCH /api/deals/bulk-assign, PATCH /api/deals/bulk-update, DELETE /api/deals/bulk-delete)
// ─────────────────────────────────────────────────────────────────────────────

export interface DealBulkAssignPayload {
  ids: string[];
  assignedToId: string;
  assignedToName?: string;
}

export interface DealBulkUpdatePayload {
  ids: string[];
  data: {
    stage?: string;
    assignedToId?: string | null;
    contactId?: string | null;
    companyId?: string | null;
  };
}

export interface DealBulkDeletePayload {
  ids: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPANIES  (PATCH /api/company/bulk-update, DELETE /api/company/bulk-delete)
// ─────────────────────────────────────────────────────────────────────────────

export interface CompanyBulkUpdatePayload {
  ids: string[];
  data: {
    industry?: string | null;
    website?: string | null;
  };
}

export interface CompanyBulkDeletePayload {
  ids: string[];
}
