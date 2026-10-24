import assert from "node:assert";

const BACKEND_URL = "https://zyoris.onrender.com";

async function runBusinessLinkPersistenceTest() {
  console.log("=== STARTING BUSINESS LINK PERSISTENCE & HYDRATION TEST ===");

  const timestamp = Date.now();
  const email = `pers_tester_${timestamp}@zyoris.test`;

  // 1. Register test user
  console.log("1. Registering test user...");
  const regRes = await fetch(`${BACKEND_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Link Tester Lead",
      email,
      password: "Password123!",
      role: "ADMIN",
    }),
  });
  assert.strictEqual(regRes.status, 201, "Registration should succeed");
  const regData = await regRes.json();
  const initialToken = regData.token;
  const userId = regData.user?.id || regData.id;

  // 2. Create organization
  console.log("2. Creating organization...");
  const orgRes = await fetch(`${BACKEND_URL}/organizations/create-org`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${initialToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: `Link Org ${timestamp}`,
      userId,
      companyAbout: "QA Testing",
      businessType: "Technology",
    }),
  });
  assert.strictEqual(orgRes.status, 201, "Org creation should succeed");
  const orgData = await orgRes.json();
  const token = orgData.token || initialToken;
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // 3. Create a channel
  console.log("3. Creating test channel...");
  const chanRes = await fetch(`${BACKEND_URL}/api/communications/channels`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: `persist-${timestamp.toString().slice(-4)}`,
      type: "PUBLIC",
      description: "Testing business links persistence",
    }),
  });
  assert.strictEqual(chanRes.status, 201, "Channel creation should succeed");
  const chanData = await chanRes.json();
  const channel = chanData.data || chanData;

  // 4. Send a message
  console.log("4. Sending message...");
  const msgRes = await fetch(`${BACKEND_URL}/api/communications/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      channelId: channel.id,
      content: "Please complete the task for Q3 review.",
    }),
  });
  assert.strictEqual(msgRes.status, 201, "Send message should return 201");
  const msgData = await msgRes.json();
  const message = msgData.data || msgData;

  // 5. Create a real Task in the database
  console.log("5. Creating business object (Task)...");
  const taskRes = await fetch(`${BACKEND_URL}/tasks`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      title: "Q3 Strategy Proposal",
      priority: "HIGH",
      status: "TODO",
    }),
  });
  assert.strictEqual(taskRes.status, 201, "Task creation should return 201");
  const task = await taskRes.json();
  console.log("Task created with ID:", task.id, "Title:", task.title);

  // 6. Test Linking with INVALID targetId (verifying error is NOT masked)
  console.log("6. Verifying that invalid targetId is rejected by backend (404)...");
  const badLinkRes = await fetch(
    `${BACKEND_URL}/api/communications/messages/${message.id}/links`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        targetType: "TASK",
        targetId: "non-existent-id-hello",
      }),
    }
  );
  assert.strictEqual(badLinkRes.status, 404, "Invalid targetId must return 404 Not Found");
  const badData = await badLinkRes.json();
  assert.strictEqual(badData.error, "NOT_FOUND", "Error code must be NOT_FOUND");
  console.log("✓ Invalid target correctly rejected with 404 without false positive badge");

  // 7. Test Linking with VALID targetId (Task)
  console.log("7. Creating real business link on message...");
  const createLinkRes = await fetch(
    `${BACKEND_URL}/api/communications/messages/${message.id}/links`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        targetType: "TASK",
        targetId: task.id,
      }),
    }
  );
  assert.strictEqual(createLinkRes.status, 201, "Create link must return 201 Created");
  const link = await createLinkRes.json();
  assert.ok(link.id, "Link must have an ID");
  assert.strictEqual(link.messageId, message.id, "Link messageId must match");
  assert.strictEqual(link.targetType, "TASK", "targetType must match");
  assert.strictEqual(link.targetId, task.id, "targetId must match");
  console.log("✓ Real business link persisted in backend with ID:", link.id);

  // 8. Test Fetching message links via GET /api/communications/messages/:messageId/links
  console.log("8. Retrieving message links directly from backend...");
  const getLinksRes = await fetch(
    `${BACKEND_URL}/api/communications/messages/${message.id}/links`,
    { headers }
  );
  assert.strictEqual(getLinksRes.status, 200, "Get links must return 200");
  const linksList = await getLinksRes.json();
  assert.ok(Array.isArray(linksList), "Links must be an array");
  assert.strictEqual(linksList.length, 1, "Must contain exactly 1 link");
  assert.strictEqual(linksList[0].id, link.id, "Link ID must match");
  assert.strictEqual(linksList[0].target?.title, "Q3 Strategy Proposal", "Target title must be returned");
  console.log("✓ Backend successfully returns persisted link with target title:", linksList[0].target.title);

  // 9. Simulating page refresh hydration
  console.log("9. Simulating browser refresh message fetch & link hydration...");
  const messagesRes = await fetch(
    `${BACKEND_URL}/api/communications/messages?channelId=${channel.id}&limit=50`,
    { headers }
  );
  assert.strictEqual(messagesRes.status, 200, "Get messages must return 200");
  const msgsJson = await messagesRes.json();
  const rawMessages = msgsJson.data || msgsJson;

  // Hydrate links as done in ConnectWorkspace / getChannelMessages
  const hydrated = await Promise.all(
    rawMessages.map(async (m: any) => {
      const links = await fetch(
        `${BACKEND_URL}/api/communications/messages/${m.id}/links`,
        { headers }
      ).then((r) => r.json());
      return {
        ...m,
        businessLinks: (Array.isArray(links) ? links : []).map((l: any) => ({
          id: l.id,
          messageId: l.messageId,
          targetType: l.targetType,
          targetId: l.targetId,
          title: l.title || l.target?.title || l.target?.name || l.targetId,
        })),
      };
    })
  );

  const reloadedTargetMsg = hydrated.find((m: any) => m.id === message.id);
  assert.ok(reloadedTargetMsg, "Message must exist after refresh");
  assert.ok(reloadedTargetMsg.businessLinks, "Message must have businessLinks after refresh");
  assert.strictEqual(reloadedTargetMsg.businessLinks.length, 1, "Must have 1 business link after refresh");
  assert.strictEqual(reloadedTargetMsg.businessLinks[0].targetType, "TASK", "Target type must be TASK");
  assert.strictEqual(reloadedTargetMsg.businessLinks[0].targetId, task.id, "Target ID must match task ID");
  assert.strictEqual(reloadedTargetMsg.businessLinks[0].title, "Q3 Strategy Proposal", "Label must match task title");
  console.log("✓ Hydration after refresh verified: Badge retains TASK: Q3 Strategy Proposal correctly!");

  // 10. Delete the link
  console.log("10. Testing delete link...");
  const delRes = await fetch(
    `${BACKEND_URL}/api/communications/messages/${message.id}/links/${link.id}`,
    {
      method: "DELETE",
      headers,
    }
  );
  assert.ok(delRes.status === 200 || delRes.status === 204, "Delete link must succeed");
  console.log("✓ Business link deleted successfully");

  console.log("\n=== ALL BUSINESS LINK PERSISTENCE TESTS PASSED SUCCESSFULLY! ===");
}

runBusinessLinkPersistenceTest().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
