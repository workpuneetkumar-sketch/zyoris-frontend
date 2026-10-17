const BACKEND_URL = "https://zyoris.onrender.com";

async function main() {
  const ts = Date.now();
  // 1. Admin user
  const u1Res = await fetch(`${BACKEND_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Admin Lead", email: `admin_${ts}@zyoris.test`, password: "Password123!", role: "ADMIN" }),
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

  // 2. Demo User
  const u2Res = await fetch(`${BACKEND_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Demo User", email: `demo_${ts}@zyoris.test`, password: "Password123!", role: "USER" }),
  });
  const u2Data = await u2Res.json();
  const u2Id = u2Data.user?.id || u2Data.id;
  console.log("Registered u1:", u1Id, "u2:", u2Id);

  // 3. Create direct conversation
  const convRes = await fetch(`${BACKEND_URL}/api/communications/conversations/direct/${u2Id}`, {
    method: "POST",
    headers,
    body: JSON.stringify({}),
  });
  console.log("POST /conversations/direct/:userId status:", convRes.status);
  const conv = await convRes.json();
  console.log("Conversation created:", conv.id);

  // 4. Send message in direct conversation
  const sendRes = await fetch(`${BACKEND_URL}/api/communications/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify({ conversationId: conv.id, content: "hello direct message" }),
  });
  console.log("Send message status:", sendRes.status);
  const msg = await sendRes.json();
  console.log("Message created:", msg.id);

  // 5. Pin the direct message
  const pinRes = await fetch(`${BACKEND_URL}/api/communications/messages/${msg.id}/pin`, {
    method: "POST",
    headers,
  });
  console.log("POST /messages/:id/pin (direct message) status:", pinRes.status);
  const pinData = await pinRes.json();
  console.log("POST /messages/:id/pin (direct message) response:", JSON.stringify(pinData, null, 2));

  // 6. Fetch conversation pins
  const getPinsRes = await fetch(`${BACKEND_URL}/api/communications/conversations/${conv.id}/pins`, { headers });
  console.log("GET /conversations/:id/pins status:", getPinsRes.status);
  const pinsData = await getPinsRes.json();
  console.log("GET /conversations/:id/pins body:", JSON.stringify(pinsData, null, 2));

  // 7. Save the direct message
  const saveRes = await fetch(`${BACKEND_URL}/api/communications/messages/${msg.id}/save`, {
    method: "POST",
    headers,
  });
  console.log("POST /messages/:id/save (direct message) status:", saveRes.status);
  const saveData = await saveRes.json();
  console.log("POST /messages/:id/save (direct message) response:", JSON.stringify(saveData, null, 2));

  // 8. Fetch saved messages
  const getSavedRes = await fetch(`${BACKEND_URL}/api/communications/saved`, { headers });
  console.log("GET /saved status:", getSavedRes.status);
  const savedData = await getSavedRes.json();
  console.log("GET /saved body:", JSON.stringify(savedData, null, 2));

  // 9. Fetch messages of the conversation
  const getMsgsRes = await fetch(`${BACKEND_URL}/api/communications/messages?conversationId=${conv.id}&limit=50`, { headers });
  console.log("GET /messages?conversationId=... status:", getMsgsRes.status);
  const msgsData = await getMsgsRes.json();
  console.log("GET /messages list sample:", JSON.stringify(msgsData.data?.[0] || msgsData[0], null, 2));
}

main().catch(console.error);
