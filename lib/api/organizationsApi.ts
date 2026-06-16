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
