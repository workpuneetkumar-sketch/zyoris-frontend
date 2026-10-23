const BACKEND_URL = "https://zyoris.onrender.com";

async function main() {
  const ts = Date.now();
  // 1. Register User 1
  const u1Res = await fetch(`${BACKEND_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "User 1", email: `u1_${ts}@zyoris.test`, password: "Password123!", role: "ADMIN" }),
  });
  const u1 = await u1Res.json();

  const orgRes = await fetch(`${BACKEND_URL}/organizations/create-org`, {
    method: "POST",
    headers: { Authorization: `Bearer ${u1.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: `Org ${ts}`, userId: u1.user?.id || u1.id, companyAbout: "Test", businessType: "B2B" }),
  });
  const org = await orgRes.json();
  const token = org.accessToken;
  const orgId = org.organization?.id || org.id;

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "x-organization-id": orgId,
  };

  // 2. Register User 2
  const u2Res = await fetch(`${BACKEND_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Demo User", email: `demo_${ts}@zyoris.test`, password: "Password123!", role: "USER" }),
  });
  const u2 = await u2Res.json();
  const u2Id = u2.user?.id || u2.id;

  // Let's find out how group / direct conversations are created.
  // What about POST /api/communications/conversations/group ?
  const grpRes = await fetch(`${BACKEND_URL}/api/communications/conversations/group`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name: "Group 1", memberIds: [u2Id] }),
  });
  console.log("POST /conversations/group status:", grpRes.status);
  console.log("POST /conversations/group body:", await grpRes.text());

  // How about sending a message with conversationId or creating a direct message?
  // Let's test if there is an endpoint like POST /api/communications/conversations/direct/:userId
  const dirRes = await fetch(`${BACKEND_URL}/api/communications/conversations/direct/${u2Id}`, {
    method: "POST",
    headers,
    body: JSON.stringify({}),
  });
  console.log("POST /conversations/direct/:userId status:", dirRes.status);
  console.log("POST /conversations/direct/:userId body:", await dirRes.text());
}

main().catch(console.error);
