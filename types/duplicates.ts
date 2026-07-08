// types/duplicates.ts
// Types for the Duplicate Lead Merge workflow (Task 1)

import { Lead } from "./leads";

export interface DuplicateGroup {
  groupId: string;
  similarityScore: number;
  leads: Lead[];
}

export interface DuplicatesResponse {
  groups: DuplicateGroup[];
  total: number;
}

export interface FieldConflict {
  field: string;
  label: string;
  values: Array<{
    leadId: string;
    value: string | number | null | undefined;
  }>;
  winningLeadId: string | null;
}

export interface MergePayload {
  primaryLeadId: string;
  duplicateLeadIds: string[];
  fieldResolutions: Record<string, string>; // field -> leadId whose value wins
}

export interface MergeResponse {
  success: boolean;
  mergedLead: Lead;
  message: string;
}

export type MergeStep = "select" | "compare" | "resolve" | "preview" | "success";
