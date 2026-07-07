// lib/api/duplicatesApi.ts
// All network calls for the Duplicate Lead Merge workflow.
//
// Swagger endpoints:
//   GET  /leads/duplicates  — returns groups of duplicate leads
//   POST /leads/merge       — merges duplicates into a primary lead
//
// If the backend returns empty/error, falls back to MOCK DATA.
// Every mock object is marked with isMock: true.

import api from "@/lib/api/api";
import { DuplicatesResponse, DuplicateGroup, MergePayload, MergeResponse } from "@/types/duplicates";
import { Lead } from "@/types/leads";

// ── MOCK DATA ────────────────────────────────────────────────────────────────

const MOCK_LEADS_A: Lead[] = [
  {
    id: "dup-a-1",
    name: "James Carter",
    email: "james.carter@acmecorp.com",
    phone: "+1 555-0101",
    company: "Acme Corp",
    city: "New York",
    source: "LinkedIn",
    status: "HOT",
    score: 82,
    owner: "Alex Morgan",
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    estimatedValue: 25000,
    tags: ["enterprise", "q2"],
    // @ts-expect-error mock flag
    isMock: true,
  },
  {
    id: "dup-a-2",
    name: "James Carter",
    email: "j.carter@acme.com",
    phone: "+1 555-0102",
    company: "Acme Corporation",
    city: "NYC",
    source: "Referral",
    status: "WARM",
    score: 74,
    owner: "Jordan Lee",
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    estimatedValue: 22000,
    tags: ["enterprise"],
    // @ts-expect-error mock flag
    isMock: true,
  },
];

const MOCK_LEADS_B: Lead[] = [
  {
    id: "dup-b-1",
    name: "Sarah Mitchell",
    email: "sarah.mitchell@vertex.io",
    phone: "+1 555-0201",
    company: "Vertex Solutions",
    city: "Chicago",
    source: "Website",
    status: "NEW",
    score: 65,
    owner: "Taylor Smith",
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    estimatedValue: 15000,
    tags: ["smb"],
    // @ts-expect-error mock flag
    isMock: true,
  },
  {
    id: "dup-b-2",
    name: "Sarah Mitchel",
    email: "s.mitchell@vertex.io",
    phone: "+1 555-0202",
    company: "Vertex Solutions",
    city: "Chicago, IL",
    source: "Cold Call",
    status: "CONTACTED",
    score: 60,
    owner: "Taylor Smith",
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    estimatedValue: 14500,
    tags: [],
    // @ts-expect-error mock flag
    isMock: true,
  },
  {
    id: "dup-b-3",
    name: "Sarah Mitchell",
    email: "smitchell@vertexsolutions.com",
    phone: "",
    company: "Vertex Solutions Inc",
    city: "Chicago",
    source: "LinkedIn",
    status: "NEW",
    score: 58,
    owner: "Alex Morgan",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    estimatedValue: 0,
    tags: ["smb"],
    // @ts-expect-error mock flag
    isMock: true,
  },
];

const MOCK_LEADS_C: Lead[] = [
  {
    id: "dup-c-1",
    name: "Robert Chen",
    email: "robert.chen@techwave.com",
    phone: "+1 555-0301",
    company: "TechWave",
    city: "San Francisco",
    source: "Referral",
    status: "QUALIFIED",
    score: 88,
    owner: "Alex Morgan",
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    estimatedValue: 45000,
    tags: ["enterprise", "priority"],
    // @ts-expect-error mock flag
    isMock: true,
  },
  {
    id: "dup-c-2",
    name: "Robert Chen",
    email: "rchen@techwave.co",
    phone: "+1 555-0301",
    company: "TechWave Inc",
    city: "SF",
    source: "Website",
    status: "HOT",
    score: 80,
    owner: "Jordan Lee",
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    estimatedValue: 48000,
    tags: ["enterprise"],
    // @ts-expect-error mock flag
    isMock: true,
  },
];

// MOCK DATA — used as fallback when API is unavailable
const MOCK_DUPLICATES: DuplicateGroup[] = [
  { groupId: "group-a", similarityScore: 94, leads: MOCK_LEADS_A },
  { groupId: "group-b", similarityScore: 87, leads: MOCK_LEADS_B },
  { groupId: "group-c", similarityScore: 91, leads: MOCK_LEADS_C },
];

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

    if (groups.length > 0) {
      return { groups, total: groups.length };
    }

    // Empty or unexpected shape — fall back to mock
    return { groups: MOCK_DUPLICATES, total: MOCK_DUPLICATES.length };
  } catch {
    // API unavailable — return mock data
    return { groups: MOCK_DUPLICATES, total: MOCK_DUPLICATES.length };
  }
}

// ── POST /leads/merge ─────────────────────────────────────────────────────────

export async function mergeLeads(payload: MergePayload): Promise<MergeResponse> {
  const res = await api.post<MergeResponse>("/leads/merge", payload);
  const data = res.data;
  return {
    success: data?.success ?? true,
    mergedLead: data?.mergedLead ?? ({} as Lead),
    message: data?.message ?? "Merge completed successfully",
  };
}
