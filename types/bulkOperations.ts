// types/bulkOperations.ts
// Types for Bulk Operations (Task 5)

export interface BulkAssignPayload {
  leadIds: string[];
  assignedToId: string;
  assignedToName?: string;
}

export interface BulkUpdatePayload {
  leadIds: string[];
  updates: {
    status?: string;
    source?: string;
    tags?: string[];
    owner?: string;
  };
}

export interface BulkDeletePayload {
  leadIds: string[];
}

export interface BulkOperationResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  message: string;
  errors?: Array<{ leadId: string; error: string }>;
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
