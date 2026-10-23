const BACKEND_URL = "https://zyoris.onrender.com";

async function testPinSave() {
  const email = `pinsave_tester_${Date.now()}@zyoris.test`;
  const regRes = await fetch(`${BACKEND_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "PinSave Tester",
      email,
      password: "Password123!",
      role: "ADMIN",
    }),
  });
  const authData = await regRes.json();
  const userId = authData.user?.id || authData.id;
  const initialToken = authData.token;

  const orgRes = await fetch(`${BACKEND_URL}/organizations/create-org`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${initialToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: `Org ${Date.now()}`,
      userId,
      companyAbout: "PinSave Test",
      businessType: "B2B",
    }),
  });
  const orgData = await orgRes.json();
  const token = orgData.accessToken;
  const orgId = orgData.organization?.id || orgData.id;

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "x-organization-id": orgId,
  };

  console.log("=== 1. TESTING CHANNEL MESSAGE PIN & SAVE ===");
  // Create channel
  const chRes = await fetch(`${BACKEND_URL}/api/communications/channels`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name: `pin-ch-${Date.now()}`, visibility: "PUBLIC" }),
  });
  const channel = await chRes.json();
  console.log("Channel created:", channel.id);

  // Send message in channel
  const chMsgRes = await fetch(`${BACKEND_URL}/api/communications/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify({ channelId: channel.id, content: "Channel message to pin & save" }),
  });
  const chMsg = await chMsgRes.json();
  console.log("Channel message created:", chMsg.id);

  // Pin channel message
  const pinChRes = await fetch(`${BACKEND_URL}/api/communications/messages/${chMsg.id}/pin`, {
    method: "POST",
    headers,
  });
  console.log("POST /messages/:id/pin (channel) status:", pinChRes.status);
  console.log("POST /messages/:id/pin (channel) body:", await pinChRes.text());

  // Get channel pins
  const getChPinsRes = await fetch(`${BACKEND_URL}/api/communications/channels/${channel.id}/pins`, { headers });
  console.log("GET /channels/:id/pins status:", getChPinsRes.status);
  console.log("GET /channels/:id/pins body:", await getChPinsRes.text());

  // Save channel message
  const saveChRes = await fetch(`${BACKEND_URL}/api/communications/messages/${chMsg.id}/save`, {
    method: "POST",
    headers,
  });
  console.log("POST /messages/:id/save (channel) status:", saveChRes.status);
  console.log("POST /messages/:id/save (channel) body:", await saveChRes.text());

  // Get saved messages
  const getSavedRes = await fetch(`${BACKEND_URL}/api/communications/saved`, { headers });
  console.log("GET /saved status:", getSavedRes.status);
  console.log("GET /saved body:", await getSavedRes.text());

  console.log("\n=== 2. TESTING DIRECT CONVERSATION MESSAGE PIN & SAVE ===");
  // Create partner
  const user2Res = await fetch(`${BACKEND_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Partner",
      email: `partner_ps_${Date.now()}@zyoris.test`,
      password: "Password123!",
      role: "EMPLOYEE",
    }),
  });
  let partnerId = null;
  if (user2Res.ok) {
    const user2 = await user2Res.json();
    partnerId = user2.user?.id || user2.id;
  }

  if (partnerId) {
    const convRes = await fetch(`${BACKEND_URL}/api/communications/conversations`, {
      method: "POST",
      headers,
      body: JSON.stringify({ type: "DIRECT", participantIds: [partnerId] }),
    });
    const conv = await convRes.json();
    console.log("Direct conversation created:", conv.id);

    // Send message in direct conversation
    const convMsgRes = await fetch(`${BACKEND_URL}/api/communications/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify({ conversationId: conv.id, content: "Direct message to pin & save" }),
    });
    const convMsg = await convMsgRes.json();
    console.log("Direct message created:", convMsg.id);

    // Pin direct conversation message
    const pinConvRes = await fetch(`${BACKEND_URL}/api/communications/messages/${convMsg.id}/pin`, {
      method: "POST",
      headers,
    });
    console.log("POST /messages/:id/pin (direct) status:", pinConvRes.status);
    console.log("POST /messages/:id/pin (direct) body:", await pinConvRes.text());

    // Try GET conversation pins
    const getConvPinsRes = await fetch(`${BACKEND_URL}/api/communications/conversations/${conv.id}/pins`, { headers });
    console.log("GET /conversations/:id/pins status:", getConvPinsRes.status);
    console.log("GET /conversations/:id/pins body:", await getConvPinsRes.text());

    // Save direct conversation message
    const saveConvRes = await fetch(`${BACKEND_URL}/api/communications/messages/${convMsg.id}/save`, {
      method: "POST",
      headers,
    });
    console.log("POST /messages/:id/save (direct) status:", saveConvRes.status);
    console.log("POST /messages/:id/save (direct) body:", await saveConvRes.text());

    // Get saved messages again
    const getSaved2Res = await fetch(`${BACKEND_URL}/api/communications/saved`, { headers });
    console.log("GET /saved after direct save status:", getSaved2Res.status);
    console.log("GET /saved after direct save body:", await getSaved2Res.text());

    // Fetch messages of conversation
    const getMsgsRes = await fetch(`${BACKEND_URL}/api/communications/conversations/${conv.id}/messages`, { headers });
    console.log("GET /conversations/:id/messages body:", await getMsgsRes.text());
  }
}

testPinSave().catch(console.error);
