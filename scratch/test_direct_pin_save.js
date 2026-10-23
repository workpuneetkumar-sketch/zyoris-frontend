const BACKEND_URL = "https://zyoris.onrender.com";

async function testDirect() {
  const ts = Date.now();
  // Register User 1
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

  // Register User 2
  const u2Res = await fetch(`${BACKEND_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Demo User", email: `demo_${ts}@zyoris.test`, password: "Password123!", role: "USER" }),
  });
  const u2Data = await u2Res.json();
  const u2Id = u2Data.user?.id || u2Data.id;

  console.log("User 1:", u1Id, "User 2:", u2Id);

  // Create Direct Conversation
  const convRes = await fetch(`${BACKEND_URL}/api/communications/conversations/direct/${u2Id}`, {
    method: "POST",
    headers,
    body: JSON.stringify({}),
  });
  console.log("Create conv status:", convRes.status);
  const conv = await convRes.json();
  console.log("Conversation:", conv.id);

  // Send message in direct conversation
  const msgRes = await fetch(`${BACKEND_URL}/api/communications/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify({ conversationId: conv.id, content: "hello direct" }),
  });
  console.log("Send msg status:", msgRes.status);
  const msg = await msgRes.json();
  console.log("Direct message ID:", msg.id);

  // Try to Pin the direct message
  const pinRes = await fetch(`${BACKEND_URL}/api/communications/messages/${msg.id}/pin`, {
    method: "POST",
    headers,
  });
  console.log("POST /messages/:id/pin (direct message) status:", pinRes.status);
  const pinBody = await pinRes.text();
  console.log("POST /messages/:id/pin (direct message) body:", pinBody);

  // Try GET /api/communications/conversations/:id/pins
  const convPinsRes = await fetch(`${BACKEND_URL}/api/communications/conversations/${conv.id}/pins`, { headers });
  console.log("GET /conversations/:id/pins status:", convPinsRes.status);
  const convPinsBody = await convPinsRes.text();
  console.log("GET /conversations/:id/pins body:", convPinsBody);

  // Save the direct message
  const saveRes = await fetch(`${BACKEND_URL}/api/communications/messages/${msg.id}/save`, {
    method: "POST",
    headers,
  });
  console.log("POST /messages/:id/save (direct message) status:", saveRes.status);
  const saveBody = await saveRes.text();
  console.log("POST /messages/:id/save (direct message) body:", saveBody);

  // GET /api/communications/saved
  const savedRes = await fetch(`${BACKEND_URL}/api/communications/saved`, { headers });
  console.log("GET /saved status:", savedRes.status);
  const savedBody = await savedRes.text();
  console.log("GET /saved body:", savedBody);

  // Fetch messages of conversation: what fields are present on messages?
  const msgsRes = await fetch(`${BACKEND_URL}/api/communications/messages?conversationId=${conv.id}&limit=50`, { headers });
  console.log("GET messages status:", msgsRes.status);
  const msgsBody = await msgsRes.json();
  console.log("Direct messages item sample:", JSON.stringify(msgsBody.data?.[0] || msgsBody[0], null, 2));
}

testDirect().catch(console.error);
