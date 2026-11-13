/**
 * myCompanyApi.ts
 *
 * Client for the /api/my-company backend endpoints.
 *
 * Backend routes (backend-latest/src/routes/my-company.ts):
 *   GET    /api/my-company/profile  – get existing profile (404 if none)
 *   POST   /api/my-company/create   – create first-time profile
 *   PATCH  /api/my-company/update   – partial update of existing profile
 *   DELETE /api/my-company/delete   – reset / clear profile
 *
 * Backend expects nested shape:
 *   { companyName, legalName?, businessType, incorporationDate?,
 *     isGstRegistered,
 *     address: { line1, line2?, city, state, pincode, country },
 *     contact: { phone, email, website? },
 *     tax:     { gstNumber?, panNumber?, cinNumber? },
 *     bank:    { bankName, accountHolderName, accountNumber, ifscCode } }
 *
 * The flat CompanyFormData used by the UI is mapped to/from this shape here.
 */

import api from "@/lib/api/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MyCompanyAddress {
  line1: string | null;
  line2?: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  country: string | null;
}

export interface MyCompanyContact {
  phone: string | null;
  email: string | null;
  website?: string | null;
}

export interface MyCompanyTax {
  gstNumber?: string | null;
  panNumber?: string | null;
  cinNumber?: string | null;
}

export interface MyCompanyBank {
  bankName: string | null;
  accountHolderName: string | null;
  accountNumber: string | null;
  ifscCode: string | null;
}

export interface MyCompanyProfile {
  id: string;
  isGstRegistered: boolean;
  companyName: string;
  legalName?: string | null;
  businessType?: string | null;
  incorporationDate?: string | null;
  address: MyCompanyAddress;
  contact: MyCompanyContact;
  tax: MyCompanyTax;
  bank: MyCompanyBank;
  createdAt: string;
  updatedAt: string;
}

/** Flat form shape used by the UI — mirrors CompanyFormData in SettingsUI.tsx */
export interface CompanyFormFlat {
  companyName: string;
  legalName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  gstNumber: string;
  panNumber: string;
  cinNumber: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountHolderName: string;
  businessType: string;
  incorporationDate: string;
  isGstRegistered: boolean;
}

// ── Shape converters ──────────────────────────────────────────────────────────

/** Flat UI form → nested backend payload */
function toPayload(flat: CompanyFormFlat) {
  return {
    isGstRegistered: flat.isGstRegistered,
    companyName: flat.companyName,
    legalName: flat.legalName || null,
    businessType: flat.businessType || null,
    incorporationDate: flat.incorporationDate || null,
    address: {
      line1: flat.addressLine1,
      line2: flat.addressLine2 || null,
      city: flat.city,
      state: flat.state,
      pincode: flat.pincode,
      country: flat.country,
    },
    contact: {
      phone: flat.phone,
      email: flat.email,
      website: flat.website || null,
    },
    tax: {
      gstNumber: flat.gstNumber || null,
      panNumber: flat.panNumber || null,
      cinNumber: flat.cinNumber || null,
    },
    bank: {
      bankName: flat.bankName,
      accountHolderName: flat.accountHolderName,
      accountNumber: flat.accountNumber,
      ifscCode: flat.ifscCode,
    },
  };
}

/** Nested backend profile → flat UI form */
export function profileToFlat(p: MyCompanyProfile): CompanyFormFlat {
  return {
    isGstRegistered: p.isGstRegistered,
    companyName: p.companyName ?? "",
    legalName: p.legalName ?? "",
    businessType: p.businessType ?? "",
    incorporationDate: p.incorporationDate
      ? p.incorporationDate.slice(0, 10)   // keep only YYYY-MM-DD for <input type="date">
      : "",
    addressLine1: p.address?.line1 ?? "",
    addressLine2: p.address?.line2 ?? "",
    city: p.address?.city ?? "",
    state: p.address?.state ?? "",
    pincode: p.address?.pincode ?? "",
    country: p.address?.country ?? "India",
    phone: p.contact?.phone ?? "",
    email: p.contact?.email ?? "",
    website: p.contact?.website ?? "",
    gstNumber: p.tax?.gstNumber ?? "",
    panNumber: p.tax?.panNumber ?? "",
    cinNumber: p.tax?.cinNumber ?? "",
    bankName: p.bank?.bankName ?? "",
    accountHolderName: p.bank?.accountHolderName ?? "",
    accountNumber: p.bank?.accountNumber ?? "",
    ifscCode: p.bank?.ifscCode ?? "",
  };
}

// ── API calls ─────────────────────────────────────────────────────────────────

/**
 * GET /api/my-company/profile
 * Returns the profile, or null if no profile exists yet (404).
 * Any other error is re-thrown.
 */
export async function fetchMyCompanyProfile(): Promise<MyCompanyProfile | null> {
  try {
    const res = await api.get<MyCompanyProfile>("/api/my-company/profile");
    return res.data;
  } catch (err: any) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
}

/**
 * POST /api/my-company/create
 * Creates the company profile for the first time.
 * Returns { success, message, data: { id } }.
 */
export async function createMyCompanyProfile(flat: CompanyFormFlat): Promise<void> {
  await api.post("/api/my-company/create", toPayload(flat));
}

/**
 * PATCH /api/my-company/update
 * Partially updates an existing profile.
 * Returns { success, message }.
 */
export async function updateMyCompanyProfile(flat: CompanyFormFlat): Promise<void> {
  await api.patch("/api/my-company/update", toPayload(flat));
}

/**
 * DELETE /api/my-company/delete
 * Clears all profile fields (keeps the workspace).
 */
export async function deleteMyCompanyProfile(): Promise<void> {
  await api.delete("/api/my-company/delete");
}
