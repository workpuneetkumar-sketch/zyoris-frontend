const BACKEND_URL = "https://zyoris.onrender.com";

async function testRead() {
  const email = `read_tester_${Date.now()}@zyoris.test`;
  const regRes = await fetch(`${BACKEND_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Read Tester",
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
      companyAbout: "Read Test",
      businessType: "B2B",
    }),
  });
  const orgData = await orgRes.json();
  const token = orgData.accessToken;

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "x-organization-id": orgData.organization?.id || orgData.id,
  };

  // Create an empty channel
  const chRes = await fetch(`${BACKEND_URL}/api/communications/channels`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: `read-test-${Date.now()}`,
      visibility: "PUBLIC",
    }),
  });
  const channel = await chRes.json();
  console.log("Created channel:", channel.id);

  // Try read with {} on empty channel
  const readEmptyRes = await fetch(`${BACKEND_URL}/api/communications/channels/${channel.id}/read`, {
    method: "POST",
    headers,
    body: JSON.stringify({}),
  });
  console.log("Read with {} on empty channel status:", readEmptyRes.status);
  const readEmptyBody = await readEmptyRes.text();
  console.log("Read with {} body:", readEmptyBody);

  // Send a message
  const msgRes = await fetch(`${BACKEND_URL}/api/communications/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      channelId: channel.id,
      content: "Hello read test",
    }),
  });
  const msg = await msgRes.json();
  console.log("Created message:", msg.id);

  // Read with valid message ID
  const readWithMsgRes = await fetch(`${BACKEND_URL}/api/communications/channels/${channel.id}/read`, {
    method: "POST",
    headers,
    body: JSON.stringify({ lastReadMessageId: msg.id }),
  });
  console.log("Read with valid lastReadMessageId status:", readWithMsgRes.status);
  const readWithMsgBody = await readWithMsgRes.text();
  console.log("Read with valid lastReadMessageId body:", readWithMsgBody);

  // Read conversation with {} vs with message ID
  const user2Res = await fetch(`${BACKEND_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Partner",
      email: `partner_${Date.now()}@zyoris.test`,
      password: "Password123!",
      role: "EMPLOYEE",
    }),
  });
  const user2 = await user2Res.json();

  const convRes = await fetch(`${BACKEND_URL}/api/communications/conversations`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      type: "DIRECT",
      participantIds: [user2.user?.id || user2.id],
    }),
  });
  const conv = await convRes.json();
  console.log("Created conversation:", conv.id);

  const readEmptyConvRes = await fetch(`${BACKEND_URL}/api/communications/conversations/${conv.id}/read`, {
    method: "POST",
    headers,
    body: JSON.stringify({}),
  });
  console.log("Read empty conversation status:", readEmptyConvRes.status);
  console.log("Read empty conversation body:", await readEmptyConvRes.text());
}

testRead().catch(console.error);
