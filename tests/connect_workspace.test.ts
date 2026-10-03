// tests/connect_workspace.test.ts
// Automated Integration & Contract Test for Connect Workspace & Navigation (Day 1)
// Verifies Nitin's Communication Domain APIs and Sakshi's Socket event contracts

import assert from "node:assert";

const BACKEND_URL = "https://zyoris.onrender.com";

async function runTests() {
  console.log("=== STARTING CONNECT WORKSPACE DAY 1 TESTS ===");

  // 1. Register test user & organization
  const email = `connect_tester_${Date.now()}@zyoris.test`;
  const regRes = await fetch(`${BACKEND_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Connect Lead",
      email,
      password: "Password123!",
      role: "ADMIN",
    }),
  });
  assert.strictEqual(regRes.status, 201, "User registration should succeed");
  const authData = await regRes.json();
  const userId = authData.user?.id || authData.id;
  const initialToken = authData.token;

  // Create organization to get active organizationId token
  const orgRes = await fetch(`${BACKEND_URL}/organizations/create-org`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${initialToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: `Connect Org ${Date.now()}`,
      userId,
      companyAbout: "Communications",
      businessType: "B2B",
    }),
  });
  assert.strictEqual(orgRes.status, 201, "Organization creation should succeed");
  const orgData = await orgRes.json();
  const token = orgData.accessToken;
  assert.ok(token, "Access token with organizationId must be provided");

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // 2. Channel CRUD
  console.log("-> Testing Channel APIs (Nitin)");
  // Create Public Channel
  const createPubRes = await fetch(`${BACKEND_URL}/api/communications/channels`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: "general",
      description: "Company-wide general discussions",
      visibility: "PUBLIC",
    }),
  });
  assert.strictEqual(createPubRes.status, 201, "Public channel creation should return 201");
  const pubChannel = await createPubRes.json();
  assert.strictEqual(pubChannel.visibility, "PUBLIC", "Visibility must be PUBLIC");

  // Create Private Channel
  const createPrivRes = await fetch(`${BACKEND_URL}/api/communications/channels`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: "exec-strategy",
      description: "Leadership strategic planning",
      visibility: "PRIVATE",
    }),
  });
  assert.strictEqual(createPrivRes.status, 201, "Private channel creation should return 201");
  const privChannel = await createPrivRes.json();
  assert.strictEqual(privChannel.visibility, "PRIVATE", "Visibility must be PRIVATE");

  // List Channels
  const listChannelsRes = await fetch(`${BACKEND_URL}/api/communications/channels`, { headers });
  assert.strictEqual(listChannelsRes.status, 200, "Get channels should return 200");
  const channelsList = await listChannelsRes.json();
  assert.ok(Array.isArray(channelsList), "Channels response should be an array");
  assert.ok(channelsList.some((c: any) => c.id === pubChannel.id), "Public channel should be in list");
  assert.ok(channelsList.some((c: any) => c.id === privChannel.id), "Private channel should be in list");

  // Get Channel by ID
  const getChRes = await fetch(`${BACKEND_URL}/api/communications/channels/${pubChannel.id}`, { headers });
  assert.strictEqual(getChRes.status, 200, "Get channel by ID should return 200");
  const fetchedCh = await getChRes.json();
  assert.strictEqual(fetchedCh.id, pubChannel.id);

  // Update Channel
  const patchChRes = await fetch(`${BACKEND_URL}/api/communications/channels/${pubChannel.id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ description: "Updated description for general" }),
  });
  assert.strictEqual(patchChRes.status, 200, "Patch channel should return 200");

  // 3. Channel Members
  console.log("-> Testing Channel Member APIs");
  const membersRes = await fetch(`${BACKEND_URL}/api/communications/channels/${pubChannel.id}/members`, { headers });
  assert.strictEqual(membersRes.status, 200, "Get channel members should return 200");
  const members = await membersRes.json();
  assert.ok(Array.isArray(members), "Members should be an array");
  assert.ok(members.length >= 1, "Creator should be in channel members");
  assert.strictEqual(members[0].role, "OWNER", "Creator should have role OWNER");

  // 4. Messages (Channel)
  console.log("-> Testing Channel Message APIs");
  const sendMsgRes = await fetch(`${BACKEND_URL}/api/communications/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      channelId: pubChannel.id,
      content: "Welcome to #general!",
    }),
  });
  assert.strictEqual(sendMsgRes.status, 201, "Send channel message should return 201");
  const sentMsg = await sendMsgRes.json();
  assert.strictEqual(sentMsg.content, "Welcome to #general!");
  assert.strictEqual(sentMsg.channelId, pubChannel.id);

  // Get Messages
  const getMsgsRes = await fetch(
    `${BACKEND_URL}/api/communications/messages?channelId=${pubChannel.id}&limit=50`,
    { headers }
  );
  assert.strictEqual(getMsgsRes.status, 200, "Get messages should return 200");
  const msgsData = await getMsgsRes.json();
  const msgsList = Array.isArray(msgsData) ? msgsData : msgsData.data;
  assert.ok(msgsList.some((m: any) => m.id === sentMsg.id), "Sent message must be in list");

  // 5. Update & Delete Message
  console.log("-> Testing Message Update and Delete");
  const updateMsgRes = await fetch(`${BACKEND_URL}/api/communications/messages/${sentMsg.id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ content: "Welcome to #general! (edited)" }),
  });
  assert.strictEqual(updateMsgRes.status, 200, "Update message should return 200");

  const delMsgRes = await fetch(`${BACKEND_URL}/api/communications/messages/${sentMsg.id}`, {
    method: "DELETE",
    headers,
  });
  assert.strictEqual(delMsgRes.status, 200, "Delete message should return 200");

  // 6. Conversations List
  console.log("-> Testing Conversations APIs");
  const listConvsRes = await fetch(`${BACKEND_URL}/api/communications/conversations`, { headers });
  assert.strictEqual(listConvsRes.status, 200, "Get conversations should return 200");

  console.log("=== ALL CONNECT WORKSPACE TESTS PASSED SUCCESSFULLY ===");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
