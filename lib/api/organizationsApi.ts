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