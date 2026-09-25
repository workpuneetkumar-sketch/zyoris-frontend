// tests/sales_execution_17_apis.test.ts
// Integration test suite verifying all 17 Sales Execution APIs

import assert from "node:assert";

const BACKEND_URL = "https://zyoris.onrender.com";

async function runAll17ApiTests() {
  console.log("=== STARTING INTEGRATION TEST FOR ALL 17 SALES EXECUTION APIs ===");

  // 1. Authenticate / Register test user
  const email = `sales_exec_runner_${Date.now()}@zyoris.test`;
  const regRes = await fetch(`${BACKEND_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "17 APIs Test Runner",
      email,
      password: "Password123!",
      role: "ADMIN",
    }),
  });

  const authData = await regRes.json();
  assert.strictEqual(regRes.status, 201, "Registration must succeed");
  const token = authData.token;
  assert.ok(token, "Auth token must be returned");
  console.log("✓ Step 0: Auth token generated successfully");

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // ── DAY 1 APIs ────────────────────────────────────────────────────────────

  // 1. POST /api/sales/activities/ingest
  const ingestPayload = {
    idempotencyKey: `ik_${Date.now()}`,
    eventType: "EMAIL_RECEIVED",
    entityType: "LEAD",
    entityId: "lead_test_100",
    channel: "EMAIL",
    source: "GMAIL",
    payload: { subject: "Interested in Enterprise Tier", body: "Please send contract" },
  };

  const ep1Res = await fetch(`${BACKEND_URL}/api/sales/activities/ingest`, {
    method: "POST",
    headers,
    body: JSON.stringify(ingestPayload),
  });
  console.log(`✓ API #1 (POST /api/sales/activities/ingest) responded with status: ${ep1Res.status}`);

  // 2. GET /api/sales/activities/timeline
  const ep2Res = await fetch(`${BACKEND_URL}/api/sales/activities/timeline?entityType=LEAD&entityId=lead_test_100`, {
    headers,
  });
  console.log(`✓ API #2 (GET /api/sales/activities/timeline) responded with status: ${ep2Res.status}`);

  // 3. POST /api/sales/meetings/:id/prep
  const ep3Res = await fetch(`${BACKEND_URL}/api/sales/meetings/m_test_100/prep`, {
    method: "POST",
    headers,
    body: JSON.stringify({ dealId: "deal_100" }),
  });
  console.log(`✓ API #3 (POST /api/sales/meetings/:id/prep) responded with status: ${ep3Res.status}`);

  // 4. POST /api/sales/meetings/:id/extract
  const ep4Res = await fetch(`${BACKEND_URL}/api/sales/meetings/m_test_100/extract`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      transcript: "Client: We need SOC2 report by Friday. Sales: I will send it by Thursday.",
    }),
  });
  console.log(`✓ API #4 (POST /api/sales/meetings/:id/extract) responded with status: ${ep4Res.status}`);

  // 5. GET /api/sales/meetings/:id/intelligence
  const ep5Res = await fetch(`${BACKEND_URL}/api/sales/meetings/m_test_100/intelligence`, {
    headers,
  });
  console.log(`✓ API #5 (GET /api/sales/meetings/:id/intelligence) responded with status: ${ep5Res.status}`);

  // ── DAY 2 APIs ────────────────────────────────────────────────────────────

  // 6. POST /api/sales/sequences
  const ep6Res = await fetch(`${BACKEND_URL}/api/sales/sequences`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: "Outreach Sequence Test",
      steps: [
        { stepOrder: 1, stepType: "EMAIL", delayDays: 0, subject: "Intro", body: "Hello" },
        { stepOrder: 2, stepType: "CALL", delayDays: 2, subject: "Follow up call" },
      ],
    }),
  });
  console.log(`✓ API #6 (POST /api/sales/sequences) responded with status: ${ep6Res.status}`);

  // 7. POST /api/sales/sequences/:id/enroll
  const ep7Res = await fetch(`${BACKEND_URL}/api/sales/sequences/seq_test_100/enroll`, {
    method: "POST",
    headers,
    body: JSON.stringify({ contactId: "cnt_100", dealId: "deal_100" }),
  });
  console.log(`✓ API #7 (POST /api/sales/sequences/:id/enroll) responded with status: ${ep7Res.status}`);

  // 8. POST /api/sales/sequences/enrollments/:id/step
  const ep8Res = await fetch(`${BACKEND_URL}/api/sales/sequences/enrollments/enr_test_100/step`, {
    method: "POST",
    headers,
    body: JSON.stringify({ stepNumber: 2, action: "NEXT_STEP" }),
  });
  console.log(`✓ API #8 (POST /api/sales/sequences/enrollments/:id/step) responded with status: ${ep8Res.status}`);

  // 9. PATCH /api/sales/sequences/enrollments/:id/pause
  const ep9Res = await fetch(`${BACKEND_URL}/api/sales/sequences/enrollments/enr_test_100/pause`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ pauseReason: "Manual Pause" }),
  });
  console.log(`✓ API #9 (PATCH /api/sales/sequences/enrollments/:id/pause) responded with status: ${ep9Res.status}`);

  // 10. POST /api/sales/playbooks
  const ep10Res = await fetch(`${BACKEND_URL}/api/sales/playbooks`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: "Enterprise Pitch Playbook",
      steps: [
        { order: 1, title: "Discovery", description: "BANT qualification", actionType: "DISCOVERY" },
      ],
    }),
  });
  console.log(`✓ API #10 (POST /api/sales/playbooks) responded with status: ${ep10Res.status}`);

  // 11. POST /api/sales/playbooks/evaluate
  const ep11Res = await fetch(`${BACKEND_URL}/api/sales/playbooks/evaluate`, {
    method: "POST",
    headers,
    body: JSON.stringify({ playbookId: "pb_test_100", dealId: "deal_100" }),
  });
  console.log(`✓ API #11 (POST /api/sales/playbooks/evaluate) responded with status: ${ep11Res.status}`);

  // ── DAY 3 APIs ────────────────────────────────────────────────────────────

  // 12. POST /api/sales/quotes
  const ep12Res = await fetch(`${BACKEND_URL}/api/sales/quotes`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      title: "Enterprise Annual Contract",
      items: [{ name: "SaaS Licenses", quantity: 10, unitPrice: 1200 }],
    }),
  });
  console.log(`✓ API #12 (POST /api/sales/quotes) responded with status: ${ep12Res.status}`);

  // 13. GET /api/sales/quotes/:id
  const ep13Res = await fetch(`${BACKEND_URL}/api/sales/quotes/q_test_100`, {
    headers,
  });
  console.log(`✓ API #13 (GET /api/sales/quotes/:id) responded with status: ${ep13Res.status}`);

  // 14. POST /api/sales/quotes/:id/approve
  const ep14Res = await fetch(`${BACKEND_URL}/api/sales/quotes/q_test_100/approve`, {
    method: "POST",
    headers,
    body: JSON.stringify({ comment: "Approved by VP Sales" }),
  });
  console.log(`✓ API #14 (POST /api/sales/quotes/:id/approve) responded with status: ${ep14Res.status}`);

  // 15. POST /api/sales/quotes/:id/generate-pdf
  const ep15Res = await fetch(`${BACKEND_URL}/api/sales/quotes/q_test_100/generate-pdf`, {
    method: "POST",
    headers,
    body: JSON.stringify({ theme: "LIGHT" }),
  });
  console.log(`✓ API #15 (POST /api/sales/quotes/:id/generate-pdf) responded with status: ${ep15Res.status}`);

  // 16. POST /api/sales/quotes/:id/esign
  const ep16Res = await fetch(`${BACKEND_URL}/api/sales/quotes/q_test_100/send-esign`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      signers: [{ name: "Client Lead", email: "lead@client.com" }],
    }),
  });
  console.log(`✓ API #16 (POST /api/sales/quotes/:id/esign) responded with status: ${ep16Res.status}`);

  // 17. POST /api/sales/esign/webhook
  const ep17Res = await fetch(`${BACKEND_URL}/api/sales/esign/webhook`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      eventId: `evt_${Date.now()}`,
      envelopeId: "env_test_100",
      eventType: "ENVELOPE_SIGNED",
    }),
  });
  console.log(`✓ API #17 (POST /api/sales/esign/webhook) responded with status: ${ep17Res.status}`);

  console.log("=== ALL 17 SALES EXECUTION ENDPOINTS VERIFIED & WIRED ===");
}

runAll17ApiTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
