export async function createOrganization(data: {
    name: string;
    userId: string;
    companyAbout: string;
    businessType: string;
}) {
    const res = await fetch("https://zyoris.onrender.com/organizations/create-org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create organization");
    }

    return res.json();
}