// tests/sales_execution_day1.test.ts
// Automated Integration Test for FE-1 Day 1 Sales Execution Endpoints

import assert from "node:assert";

const BACKEND_URL = "https://zyoris.onrender.com";

async function runIntegrationTests() {
  console.log("=== STARTING SALES EXECUTION DAY 1 TESTS ===");

  // 1. Authenticate / Register test user
  const email = `fe1_runner_${Date.now()}@zyoris.test`;
  const regRes = await fetch(`${BACKEND_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "FE1 Test Runner",
      email,
      password: "Password123!",
      role: "ADMIN",
    }),
  });

  const authData = await regRes.json();
  assert.strictEqual(regRes.status, 201, "Registration should succeed");
  const token = authData.token;
  assert.ok(token, "Auth token must be returned");
  console.log("✓ Authenticated successfully with token");

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // 2. Ingest activities across all 5 channels: EMAIL, CALENDAR, CALLS, MEETINGS, WHATSAPP
  const channelPayloads: Record<string, any> = {
    EMAIL: {
      subject: "Enterprise Proposal Discussion",
      body: "Looking forward to reviewing the contract.",
      from: "buyer@acme.corp",
      to: ["sales@zyoris.com"],
    },
    CALENDAR: {
      title: "Quarterly Strategy Review",
      organizer: "sales@zyoris.com",
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 3600000).toISOString(),
    },
    CALLS: {
      caller: "+15551234567",
      callee: "+15559876543",
      summary: "Discovery call discussing seat tiers and SOC2",
    },
    MEETINGS: {
      title: "Executive Product Demo",
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 3600000).toISOString(),
    },
    WHATSAPP: {
      from: "+15551234567",
      to: "+15559876543",
      text: "Hi team, please share the updated security whitepaper.",
    },
  };

  const createdActivityIds: string[] = [];

  for (const [ch, payload] of Object.entries(channelPayloads)) {
    const actRes = await fetch(`${BACKEND_URL}/api/sales/activities`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        channel: ch,
        source: ch === "EMAIL" ? "GMAIL" : ch === "CALLS" ? "TWILIO" : "DIRECT",
        payload,
      }),
    });

    assert.ok(
      actRes.status === 200 || actRes.status === 201,
      `POST /api/sales/activities for ${ch} should return 200 or 201, got ${actRes.status}`
    );
    const actJson = await actRes.json();
    assert.strictEqual(actJson.success, true, "Response must be successful");
    const id = actJson.data?.activity?.id;
    assert.ok(id, `Created activity must have an ID for channel ${ch}`);
    createdActivityIds.push(id);
    console.log(`✓ Ingested activity for channel: ${ch} (ID: ${id})`);
  }

  // 3. Test GET /api/sales/activities with channel filtering
  for (const ch of Object.keys(channelPayloads)) {
    const listRes = await fetch(`${BACKEND_URL}/api/sales/activities?channel=${ch}`, {
      headers,
    });
    assert.strictEqual(listRes.status, 200, `GET /api/sales/activities?channel=${ch} must return 200`);
    const listJson = await listRes.json();
    assert.strictEqual(listJson.success, true, "List response must be successful");
    assert.ok(Array.isArray(listJson.data), "Data must be an array");
    const matches = listJson.data.filter((a: any) => a.channel === ch);
    assert.ok(matches.length > 0, `Filtered activities must contain channel ${ch}`);
    console.log(`✓ Channel filter ${ch} verified: returned ${matches.length} matching activities`);
  }

  // 4. Test GET /api/sales/activities/:id
  const targetId = createdActivityIds[0];
  const detailRes = await fetch(`${BACKEND_URL}/api/sales/activities/${targetId}`, {
    headers,
  });
  assert.strictEqual(detailRes.status, 200, "GET /api/sales/activities/:id must return 200");
  const detailJson = await detailRes.json();
  assert.strictEqual(detailJson.success, true, "Detail response must be successful");
  assert.strictEqual(detailJson.data.id, targetId, "Returned activity ID must match requested ID");
  assert.ok(detailJson.data.channel, "Activity must have channel property");
  assert.ok(detailJson.data.duplicateStatus, "Activity must have duplicateStatus property");
  console.log(`✓ GET /api/sales/activities/:id verified for ID: ${targetId}`);

  // 5. Create a real meeting and test GET /api/sales/meetings/:id/prep
  const meetRes = await fetch(`${BACKEND_URL}/api/meetings/create`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      title: "Executive Strategic Partnership Review",
      date: new Date().toISOString(),
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 3600000).toISOString(),
    }),
  });
  const meetJson = await meetRes.json();
  const realMeetingId = meetJson.data?.id || meetJson.id;
  assert.ok(realMeetingId, "Created meeting must have an ID");
  console.log(`✓ Created test meeting: ${realMeetingId}`);

  const prepRes = await fetch(`${BACKEND_URL}/api/sales/meetings/${realMeetingId}/prep`, {
    headers,
  });
  assert.strictEqual(prepRes.status, 200, "GET /api/sales/meetings/:id/prep must return 200");
  const prepJson = await prepRes.json();
  assert.strictEqual(prepJson.success, true, "Prep response must be successful");
  assert.ok(prepJson.data.meetingContext, "Prep must include meetingContext");
  assert.ok(prepJson.data.observedFacts, "Prep must include observedFacts");
  assert.ok(prepJson.data.recommendations?.suggestedAgenda, "Prep must include suggestedAgenda");
  console.log("✓ GET /api/sales/meetings/:id/prep verified with grounded agenda and context");

  // 6. Test POST /api/sales/meetings/transcript and GET /api/sales/meetings/:id/intelligence
  const transRes = await fetch(`${BACKEND_URL}/api/sales/meetings/transcript`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      meetingId: realMeetingId,
      transcript:
        "Client: We need multi-region data residency and a pilot of 100 seats starting October 15. " +
        "Sales: We can guarantee EU data residency with full SOC2 compliance. " +
        "Client: Our security team requires the audit package by Friday. " +
        "Sales: I will send the complete security audit report to your team by Thursday 5pm.",
    }),
  });
  assert.strictEqual(transRes.status, 200, "POST /api/sales/meetings/transcript must return 200");
  const transJson = await transRes.json();
  assert.strictEqual(transJson.success, true, "Transcript submission must be successful");
  assert.ok(transJson.data?.id, "Intelligence record must have an ID");
  assert.ok(transJson.data.summary, "Intelligence must have an executive summary");
  assert.ok(Array.isArray(transJson.data.actionItems), "Action items must be an array");
  assert.ok(Array.isArray(transJson.data.commitments), "Commitments must be an array");
  assert.ok(Array.isArray(transJson.data.objections), "Objections must be an array");
  assert.ok(Array.isArray(transJson.data.requirements), "Requirements must be an array");
  console.log("✓ Transcript pipeline extracted actions, commitments, objections, and requirements");

  // 7. Test GET /api/sales/meetings/:id/intelligence
  const intelRes = await fetch(`${BACKEND_URL}/api/sales/meetings/${realMeetingId}/intelligence`, {
    headers,
  });
  assert.strictEqual(intelRes.status, 200, "GET /api/sales/meetings/:id/intelligence must return 200");
  const intelJson = await intelRes.json();
  assert.strictEqual(intelJson.success, true, "Intelligence response must be successful");
  assert.strictEqual(intelJson.data.meetingId, realMeetingId, "Intelligence must be linked to meeting ID");
  console.log("✓ GET /api/sales/meetings/:id/intelligence verified and linked to meeting context");

  console.log("=== ALL SALES EXECUTION DAY 1 INTEGRATION TESTS PASSED! ===");
}

runIntegrationTests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
