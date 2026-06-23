import api from "./api";

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
  const authData = typeof window !== 'undefined' ? localStorage.getItem('zyoris-auth') : null;
  let orgName = 'Your Organization';
  
  if (authData) {
    try {
      const parsed = JSON.parse(authData);
      orgName = parsed.user?.organizationName || 'Your Organization';
    } catch (e) {
      // Ignore
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
    console.log('📡 Fetching org summary...');
    
    const authData = typeof window !== 'undefined' ? localStorage.getItem('zyoris-auth') : null;
    if (!authData) {
      console.log('⚠️ No auth data found');
      return getDefaultOrg();
    }
    
    const parsed = JSON.parse(authData);
    const token = parsed.token;
    const user = parsed.user;
    
    if (!token) {
      console.log('⚠️ No token found');
      return getDefaultOrg();
    }
    
    // ─── Get Organization Info ──────────────────────────────────
    const orgsRes = await api.get("/organizations/get-orgs", {
      headers: { 'Authorization': `Bearer ${token}` }
    }).catch(() => null);
    
    const org = orgsRes?.data?.organizations?.[0] || null;
    if (!org) {
      console.log('⚠️ No organization found');
      return getDefaultOrg();
    }
    console.log('✅ Organization found:', org.name);
    
    // ─── Get REAL Leads Count ──────────────────────────────────
    let leadsCount = 0;
    try {
      const leadsRes = await api.get("/leads/stats", {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('📊 Leads API Response:', leadsRes.data);
      
      leadsCount = leadsRes.data?.statusStats?.reduce((sum: number, stat: any) => sum + (stat.count || 0), 0) || 0;
      if (!leadsCount && leadsRes.data?.sourceStats) {
        leadsCount = leadsRes.data.sourceStats.reduce((sum: number, stat: any) => sum + (stat.count || 0), 0);
      }
      console.log('📊 Total Leads:', leadsCount);
    } catch (e) {
      console.warn('⚠️ Could not fetch leads stats:', e);
    }
    
    // ─── Get REAL Deals Count (FIXED ENDPOINT) ──────────────────
    let dealsCount = 0;
    try {
      // ✅ Use /api/deals/get-deals (from Swagger docs)
      const dealsRes = await api.get("/api/deals/get-deals", {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('📊 Deals API Response:', dealsRes.data);
      
      if (dealsRes?.data?.data && Array.isArray(dealsRes.data.data)) {
        dealsCount = dealsRes.data.data.length;
      } else if (dealsRes?.data?.deals && Array.isArray(dealsRes.data.deals)) {
        dealsCount = dealsRes.data.deals.length;
      } else if (Array.isArray(dealsRes?.data)) {
        dealsCount = dealsRes.data.length;
      }
      console.log('📊 Total Deals:', dealsCount);
    } catch (e) {
      console.warn('⚠️ Could not fetch deals stats:', e);
      // Fallback to pipeline-stats
      try {
        const fallbackRes = await api.get("/deals/pipeline-stats", {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (fallbackRes?.data?.totalCount) {
          dealsCount = fallbackRes.data.totalCount;
        } else if (fallbackRes?.data?.total) {
          dealsCount = fallbackRes.data.total;
        }
        console.log('📊 Total Deals (fallback):', dealsCount);
      } catch (fallbackError) {
        console.warn('⚠️ Fallback also failed:', fallbackError);
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