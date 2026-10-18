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
  const u1Id = u1.user?.id || u1.id;

  const orgRes = await fetch(`${BACKEND_URL}/organizations/create-org`, {
    method: "POST",
    headers: { Authorization: `Bearer ${u1.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: `Org ${ts}`, userId: u1Id, companyAbout: "Test", businessType: "B2B" }),
  });
  const org = await orgRes.json();
  const token = org.accessToken;
  const orgId = org.organization?.id || org.id;

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "x-organization-id": orgId,
  };

  // Add a team member directly to the organization
  const addMemRes = await fetch(`${BACKEND_URL}/organizations/${orgId}/members`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name: "Demo User", email: `demo_${ts}@zyoris.test`, role: "EMPLOYEE" }),
  });
  let u2Id = null;
  if (addMemRes.ok) {
    const memData = await addMemRes.json();
    u2Id = memData.userId || memData.id || memData.user?.id;
  }
  console.log("Add member to org status:", addMemRes.status, "u2Id:", u2Id);

  // If not, let's register user 2 with token and invite/add
  if (!u2Id) {
    const u2Res = await fetch(`${BACKEND_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Demo User", email: `demo_${ts}@zyoris.test`, password: "Password123!", role: "USER" }),
    });
    const u2 = await u2Res.json();
    u2Id = u2.user?.id || u2.id;
    // Add u2 to org
    await fetch(`${BACKEND_URL}/organizations/${orgId}/add-member`, {
      method: "POST",
      headers,
      body: JSON.stringify({ userId: u2Id, role: "USER" }),
    });
  }

  // Create Direct Conversation
  const convRes = await fetch(`${BACKEND_URL}/api/communications/conversations/direct/${u2Id}`, {
    method: "POST",
    headers,
    body: JSON.stringify({}),
  });
  console.log("POST /conversations/direct/:userId status:", convRes.status);
  const convBody = await convRes.text();
  console.log("POST /conversations/direct/:userId body:", convBody);

  if (convRes.ok) {
    const conv = JSON.parse(convBody);
    // Send a message
    const msgRes = await fetch(`${BACKEND_URL}/api/communications/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify({ conversationId: conv.id, content: "Direct message hello" }),
    });
    const msg = await msgRes.json();
    console.log("Direct message ID:", msg.id);

    // Pin the message
    const pinRes = await fetch(`${BACKEND_URL}/api/communications/messages/${msg.id}/pin`, {
      method: "POST",
      headers,
    });
    console.log("Pin message in conversation status:", pinRes.status);
    console.log("Pin message body:", await pinRes.text());

    // Get conversation pins
    const convPinsRes = await fetch(`${BACKEND_URL}/api/communications/conversations/${conv.id}/pins`, { headers });
    console.log("GET /conversations/:id/pins status:", convPinsRes.status);
    console.log("GET /conversations/:id/pins body:", await convPinsRes.text());

    // Save message
    const saveRes = await fetch(`${BACKEND_URL}/api/communications/messages/${msg.id}/save`, {
      method: "POST",
      headers,
    });
    console.log("Save message in conversation status:", saveRes.status);
    console.log("Save message body:", await saveRes.text());

    // Get saved messages
    const savedRes = await fetch(`${BACKEND_URL}/api/communications/saved`, { headers });
    console.log("GET /saved status:", savedRes.status);
    console.log("GET /saved body:", await savedRes.text());
  }
}

main().catch(console.error);
