const BACKEND_URL = "https://zyoris.onrender.com";

async function inspectMessageFields() {
  const ts = Date.now();
  const u1Res = await fetch(`${BACKEND_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Inspector", email: `insp_${ts}@zyoris.test`, password: "Password123!", role: "ADMIN" }),
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

  // Create Channel
  const chRes = await fetch(`${BACKEND_URL}/api/communications/channels`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name: `ch-${ts}`, visibility: "PUBLIC" }),
  });
  const ch = await chRes.json();

  // Send message
  const msgRes = await fetch(`${BACKEND_URL}/api/communications/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify({ channelId: ch.id, content: "Test message for fields" }),
  });
  const msg = await msgRes.json();
  console.log("Newly created message keys:", Object.keys(msg));

  // Pin message
  await fetch(`${BACKEND_URL}/api/communications/messages/${msg.id}/pin`, { method: "POST", headers });

  // Save message
  await fetch(`${BACKEND_URL}/api/communications/messages/${msg.id}/save`, { method: "POST", headers });

  // Fetch messages of channel
  const listRes = await fetch(`${BACKEND_URL}/api/communications/messages?channelId=${ch.id}&limit=50`, { headers });
  const listData = await listRes.json();
  const fetchedMsg = listData.data ? listData.data[0] : listData[0];
  console.log("Fetched message after pin and save:", JSON.stringify(fetchedMsg, null, 2));

  // Also test direct conversation:
  // How does direct conversation creation work?
  // Let's test if there is an endpoint or if conversations are created when sending a message with receiverId?
  console.log("\n--- Testing Direct Message Creation via receiverId ---");
  const u2Res = await fetch(`${BACKEND_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Peer", email: `peer_${ts}@zyoris.test`, password: "Password123!", role: "USER" }),
  });
  const u2Data = await u2Res.json();
  const u2Id = u2Data.user?.id || u2Data.id;

  // Try sending message with receiverId
  const dmRes1 = await fetch(`${BACKEND_URL}/api/communications/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify({ receiverId: u2Id, content: "Direct message via receiverId" }),
  });
  console.log("Send message with receiverId status:", dmRes1.status);
  const dm1Body = await dmRes1.text();
  console.log("Send message with receiverId body:", dm1Body);

  // Check GET /api/communications/conversations
  const convsRes = await fetch(`${BACKEND_URL}/api/communications/conversations`, { headers });
  console.log("GET /conversations status:", convsRes.status);
  console.log("GET /conversations body:", await convsRes.text());
}

inspectMessageFields().catch(console.error);
