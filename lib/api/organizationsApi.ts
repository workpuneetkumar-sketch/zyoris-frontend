import api, { getEffectiveAuthToken } from "./api";

export async function createOrganization(data: {
    name: string;
    userId: string;
    companyAbout: string;
    businessType: string;
}) {
    const res = await api.post("/organizations/create-org", data);
    return res.data;
}

export interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: string;
    department?: string;
    status?: string;
    avatar?: string;
    employeeId?: string;
}

interface BackendTeamMember {
    id: string;
    name: string;
    email: string;
    designation?: string;
    role: string;
    joinedAt?: string;
    isActive?: boolean;
}

interface BackendTeamResponse {
    members: BackendTeamMember[];
}

function normalizeTeamMember(member: BackendTeamMember): TeamMember {
    return {
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role,
        department: member.designation,
        status: member.isActive ? "Active" : "Inactive",
        employeeId: member.id,
    };
}

export async function getTeamMembers(): Promise<TeamMember[]> {
    const res = await api.get<BackendTeamResponse>("/organizations/team-members");
    const members = res.data?.members || [];
    return members.map(normalizeTeamMember);
}

// ===== NEW FUNCTIONS =====

export interface OrgSummary {
  id: string;
  name: string;
  industry?: string;
  totalRevenue?: number;
  activeDeals?: number;
  leadsCount?: number;
  employees?: number;
  recentActivity?: string;
}

// Helper function to return default org
function getDefaultOrg(): OrgSummary {
  // Read organizationName for display purposes only — NOT the auth token.
  // This is safe because it only affects the fallback UI label, not auth decisions.
  let orgName = 'Your Organization';
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('zyoris-auth');
      if (raw) {
        const parsed = JSON.parse(raw);
        orgName = parsed.user?.organizationName || 'Your Organization';
      }
    } catch {
      // ignore
    }
  }

  return {
    id: 'default',
    name: orgName,
    industry: 'Technology',
    totalRevenue: 0,
    activeDeals: 0,
    leadsCount: 0,
    employees: 0,
    recentActivity: 'Setup your organization in settings'
  };
}

export async function getOrgSummary(): Promise<OrgSummary | null> {
  try {
    // Use the central token resolver — same 6-tier waterfall used by every
    // other API call in the app.  This means getOrgSummary() is unauthenticated
    // if and only if the entire app is unauthenticated.
    const token = getEffectiveAuthToken();
    if (!token) {
      console.log('⚠️ No auth data found');
      return getDefaultOrg();
    }

    // Read the user object for display purposes only (organizationName fallback).
    // If zyoris-auth is gone but the cookie/in-memory token kept the app alive,
    // user will be null here and we fall back gracefully.
    let user: any = null;
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('zyoris-auth') : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        user = parsed?.user ?? null;
      }
    } catch {
      // ignore
    }

    // ─── Get Organization Info ──────────────────────────────────
    // The api axios instance has the Authorization header injected automatically
    // by the request interceptor — no need to pass it manually here.
    const orgsRes = await api.get("/organizations/get-orgs").catch(() => null);

    const org = orgsRes?.data?.organizations?.[0] || null;
    if (!org) {
      console.log('⚠️ No organization found');
      return getDefaultOrg();
    }
    console.log('✅ Organization found:', org.name);

    // ─── Get REAL Leads Count ──────────────────────────────────
    let leadsCount = 0;
    try {
      const leadsRes = await api.get("/leads/stats");
      leadsCount = leadsRes.data?.statusStats?.reduce((sum: number, stat: any) => sum + (stat.count || 0), 0) || 0;
      if (!leadsCount && leadsRes.data?.sourceStats) {
        leadsCount = leadsRes.data.sourceStats.reduce((sum: number, stat: any) => sum + (stat.count || 0), 0);
      }
    } catch {
      // non-fatal
    }

    // ─── Get REAL Deals Count ──────────────────────────────────
    let dealsCount = 0;
    try {
      const dealsRes = await api.get("/api/deals/get-deals");
      if (dealsRes?.data?.data && Array.isArray(dealsRes.data.data)) {
        dealsCount = dealsRes.data.data.length;
      } else if (dealsRes?.data?.deals && Array.isArray(dealsRes.data.deals)) {
        dealsCount = dealsRes.data.deals.length;
      } else if (Array.isArray(dealsRes?.data)) {
        dealsCount = dealsRes.data.length;
      }
    } catch {
      try {
        const fallbackRes = await api.get("/deals/pipeline-stats");
        dealsCount = fallbackRes?.data?.totalCount || fallbackRes?.data?.total || 0;
      } catch {
        // non-fatal
      }
    }

    // ─── Return Complete Summary ──────────────────────────────
    return {
      id: org.id || 'default',
      name: org.name || user?.organizationName || 'Your Organization',
      industry: org.industry || 'Technology',
      totalRevenue: org.totalRevenue || 0,
      activeDeals: dealsCount,
      leadsCount: leadsCount,
      employees: org.employeeCount || 0,
      recentActivity: `Last updated: ${new Date().toLocaleDateString()}`
    };

  } catch (error) {
    console.error("❌ Failed to fetch org summary:", error);
    return getDefaultOrg();
  }
}

export async function getRoleContext(role: string): Promise<string> {
  const contextMap: Record<string, string> = {
    "CEO": "You are speaking with a CEO. Focus on strategic growth, revenue optimization, company-wide metrics, and high-level decision making.",
    "CFO": "You are speaking with a CFO. Focus on financial metrics, cost optimization, ROI, revenue forecasting, and budget allocation.",
    "SALES_HEAD": "You are speaking with a Sales Head. Focus on pipeline velocity, win rates, deal conversion, lead quality, and team performance.",
    "OPERATIONS_HEAD": "You are speaking with an Operations Head. Focus on process efficiency, resource allocation, project delivery, and operational metrics.",
    "ADMIN": "You are speaking with an Admin. Focus on system health, user management, data integration, and platform capabilities."
  };
  return contextMap[role] || `You are speaking with a ${role || 'Zyoris'} user. Tailor your responses to their specific role.`;
}