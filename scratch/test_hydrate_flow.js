const BACKEND_URL = "https://zyoris.onrender.com";

async function testHydration() {
  const ts = Date.now();
  // Register User
  const regRes = await fetch(`${BACKEND_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Hydrate Tester", email: `hydrate_${ts}@zyoris.test`, password: "Password123!", role: "ADMIN" }),
  });
  const u1 = await regRes.json();
  const userId = u1.user?.id || u1.id;

  const orgRes = await fetch(`${BACKEND_URL}/organizations/create-org`, {
    method: "POST",
    headers: { Authorization: `Bearer ${u1.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: `Org ${ts}`, userId, companyAbout: "Test", businessType: "B2B" }),
  });
  const org = await orgRes.json();
  const token = org.accessToken;
  const orgId = org.organization?.id || org.id;

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "x-organization-id": orgId,
  };

  // Create channel
  const chRes = await fetch(`${BACKEND_URL}/api/communications/channels`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name: `ch-hyd-${ts}`, visibility: "PUBLIC" }),
  });
  const ch = await chRes.json();

  // Send 2 messages
  const m1Res = await fetch(`${BACKEND_URL}/api/communications/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify({ channelId: ch.id, content: "First message to pin & save" }),
  });
  const m1 = await m1Res.json();

  const m2Res = await fetch(`${BACKEND_URL}/api/communications/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify({ channelId: ch.id, content: "Second regular message" }),
  });
  const m2 = await m2Res.json();

  // Pin m1
  const pinRes = await fetch(`${BACKEND_URL}/api/communications/messages/${m1.id}/pin`, { method: "POST", headers });
  console.log("Pin m1 status:", pinRes.status);

  // Save m1
  const saveRes = await fetch(`${BACKEND_URL}/api/communications/messages/${m1.id}/save`, { method: "POST", headers });
  console.log("Save m1 status:", saveRes.status);

  // Now simulate page refresh:
  // 1. Fetch channel messages
  const msgsRes = await fetch(`${BACKEND_URL}/api/communications/messages?channelId=${ch.id}&limit=50`, { headers });
  const msgsData = await msgsRes.json();
  const rawMessages = msgsData.data || msgsData;

  // 2. Fetch channel pins
  const pinsRes = await fetch(`${BACKEND_URL}/api/communications/channels/${ch.id}/pins`, { headers });
  const rawPins = await pinsRes.json();

  // 3. Fetch user saved messages
  const savedRes = await fetch(`${BACKEND_URL}/api/communications/saved`, { headers });
  const rawSaved = await savedRes.json();

  console.log("\nRaw pins response sample:", JSON.stringify(rawPins, null, 2));
  console.log("\nRaw saved response sample:", JSON.stringify(rawSaved, null, 2));

  // Extract pinned message IDs
  const pinnedMessageIds = new Set(
    (Array.isArray(rawPins) ? rawPins : rawPins.data || []).map((p) => p.messageId || p.message?.id || p.id)
  );

  // Extract saved message IDs
  const savedList = Array.isArray(rawSaved) ? rawSaved : (rawSaved.data || []);
  const savedMessageIds = new Set(
    savedList.map((s) => s.messageId || s.message?.id || s.id)
  );

  console.log("\nPinned IDs:", Array.from(pinnedMessageIds));
  console.log("Saved IDs:", Array.from(savedMessageIds));

  // Hydrate messages
  const hydratedMessages = rawMessages.map((m) => ({
    ...m,
    isPinned: pinnedMessageIds.has(m.id),
    isSaved: savedMessageIds.has(m.id),
  }));

  console.log("\nHydrated m1 isPinned:", hydratedMessages.find(m => m.id === m1.id)?.isPinned);
  console.log("Hydrated m1 isSaved:", hydratedMessages.find(m => m.id === m1.id)?.isSaved);
  console.log("Hydrated m2 isPinned:", hydratedMessages.find(m => m.id === m2.id)?.isPinned);
  console.log("Hydrated m2 isSaved:", hydratedMessages.find(m => m.id === m2.id)?.isSaved);
}

testHydration().catch(console.error);
