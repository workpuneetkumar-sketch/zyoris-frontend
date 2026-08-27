// types/customers.ts
// Canonical Customer & Identity Management domain types.
// Source of truth: backend contract at GET /api/customers.

export type LifecycleState =
  | "PROSPECT"
  | "LEAD"
  | "QUALIFIED"
  | "ACTIVE"
  | "CHURNED"
  | "INACTIVE";

export type CanonicalType =
  | "INDIVIDUAL"
  | "ORGANIZATION"
  | "ACCOUNT"
  | "CONTACT";

export interface CanonicalCustomer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  externalId?: string | null;
  externalSystem?: string | null;
  canonicalType: CanonicalType;
  ownerId?: string | null;
  lifecycleState: LifecycleState;
  companyId?: string | null;
  contactId?: string | null;
  leadId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  owner?: {
    id: string;
    name: string;
    email?: string | null;
    avatarUrl?: string | null;
  } | null;
}

export interface CustomersFilters {
  search: string;
  lifecycleState: LifecycleState | "All States";
  canonicalType: CanonicalType | "All Types";
  ownerId: string | "All Owners";
}

export interface CustomersResponse {
  customers: CanonicalCustomer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const DEFAULT_CUSTOMERS_FILTERS: CustomersFilters = {
  search: "",
  lifecycleState: "All States",
  canonicalType: "All Types",
  ownerId: "All Owners",
};

export const CUSTOMERS_PER_PAGE = 20;

export const LIFECYCLE_STATES: LifecycleState[] = [
  "PROSPECT",
  "LEAD",
  "QUALIFIED",
  "ACTIVE",
  "CHURNED",
  "INACTIVE",
];

export const CANONICAL_TYPES: CanonicalType[] = [
  "INDIVIDUAL",
  "ORGANIZATION",
  "ACCOUNT",
  "CONTACT",
];

export const LIFECYCLE_STATE_LABELS: Record<LifecycleState, string> = {
  PROSPECT: "Prospect",
  LEAD: "Lead",
  QUALIFIED: "Qualified",
  ACTIVE: "Active",
  CHURNED: "Churned",
  INACTIVE: "Inactive",
};

export const CANONICAL_TYPE_LABELS: Record<CanonicalType, string> = {
  INDIVIDUAL: "Individual",
  ORGANIZATION: "Organization",
  ACCOUNT: "Account",
  CONTACT: "Contact",
};

export interface CreateCustomerPayload {
  name: string;
  email?: string;
  phone?: string;
  externalId?: string;
  externalSystem?: string;
  canonicalType: CanonicalType;
  ownerId?: string;
  lifecycleState: LifecycleState;
  companyId?: string;
  contactId?: string;
  leadId?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateCustomerPayload {
  name?: string;
  email?: string;
  phone?: string;
  externalId?: string;
  externalSystem?: string;
  canonicalType?: string;
  ownerId?: string;
  lifecycleState?: string;
}

export interface IdentityResolvePayload {
  email?: string;
  phone?: string;
  externalId?: string;
  externalSystem?: string;
  contactId?: string;
  companyId?: string;
  leadId?: string;
}

export interface IdentityResolveMatch {
  customerId: string;
  customerName: string;
  confidence: number;
  matchedFields: string[];
}

export interface IdentityResolveResult {
  resolved: boolean;
  customer?: CanonicalCustomer | null;
  confidence?: number | null;
  matches?: IdentityResolveMatch[];
  metadata?: Record<string, unknown> | null;
}

export interface ConvertLeadPayload {
  leadId: string;
  companyId?: string;
  ownerId?: string;
  createDeal?: boolean;
  dealName?: string;
  dealAmount?: number;
}

export interface ConvertLeadResult {
  success: boolean;
  customerId?: string;
  contactId?: string;
  dealId?: string;
  message?: string;
}

export interface ConvertCompanyPayload {
  companyId: string;
  ownerId?: string;
  lifecycleState?: string;
  canonicalType?: string;
}

export interface ConvertCompanyResult {
  success: boolean;
  customerId?: string;
  message?: string;
}
