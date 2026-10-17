const BACKEND_URL = "https://zyoris.onrender.com";

async function checkRoutes() {
  const ts = Date.now();
  const u1Res = await fetch(`${BACKEND_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "User One", email: `u1_${ts}@zyoris.test`, password: "Password123!", role: "ADMIN" }),
  });
  const u1Data = await u1Res.json();
  const u1Id = u1Data.user?.id || u1Data.id;

  const orgRes = await fetch(`${BACKEND_URL}/organizations/create-org`, {
    method: "POST",
    headers: { Authorization: `Bearer ${u1Data.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: `Org ${ts}`, userId: u1Id, companyAbout: "Test", businessType: "B2B" }),
  });
  const orgData = await orgRes.json();
  const token = orgData.accessToken;
  const orgId = orgData.organization?.id || orgData.id;

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "x-organization-id": orgId,
  };

  // Check GET /api/communications/conversations
  const getConv = await fetch(`${BACKEND_URL}/api/communications/conversations`, { headers });
  console.log("GET /conversations status:", getConv.status, await getConv.text());

  // Check POST /api/communications/conversations with various payloads
  const p1 = await fetch(`${BACKEND_URL}/api/communications/conversations`, {
    method: "POST",
    headers,
    body: JSON.stringify({ participantId: u1Id }),
  });
  console.log("POST /conversations (participantId) status:", p1.status, await p1.text());

  // Try direct route or query
  const p2 = await fetch(`${BACKEND_URL}/api/communications/conversations/direct`, {
    method: "POST",
    headers,
    body: JSON.stringify({ targetUserId: u1Id }),
  });
  console.log("POST /conversations/direct status:", p2.status, await p2.text());

  // Check GET swagger or openapi
  const swagger = await fetch(`${BACKEND_URL}/api/docs/json`);
  console.log("GET /api/docs/json status:", swagger.status);
  if (swagger.ok) {
    const json = await swagger.json();
    console.log("Paths matching communications:", Object.keys(json.paths || {}).filter(p => p.includes("communication") || p.includes("conversation") || p.includes("message")));
  }
}

checkRoutes();
