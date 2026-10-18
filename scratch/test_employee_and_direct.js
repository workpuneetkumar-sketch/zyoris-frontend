const BACKEND_URL = "https://zyoris.onrender.com";

async function main() {
  const ts = Date.now();
  // 1. Register Admin
  const u1Res = await fetch(`${BACKEND_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Admin Lead", email: `admin_${ts}@zyoris.test`, password: "Password123!", role: "ADMIN" }),
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

  // 2. Create Employee
  const empRes = await fetch(`${BACKEND_URL}/hr/employees/create`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: "Demo User",
      email: `demo_${ts}@zyoris.test`,
      password: "Password123!",
      roleId: "USER",
      designation: "Developer",
      department: "Engineering",
      salary: 50000,
      joinDate: "2026-01-01",
    }),
  });
  console.log("Create employee status:", empRes.status);
  const empData = await empRes.json();
  console.log("Employee data:", JSON.stringify(empData, null, 2));

  const empUserId = empData.data?.userId || empData.userId || empData.data?.id || empData.id;
  console.log("Employee User ID:", empUserId);

  if (empUserId) {
    // 3. Create Direct Conversation
    const convRes = await fetch(`${BACKEND_URL}/api/communications/conversations/direct/${empUserId}`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    console.log("POST /conversations/direct/:userId status:", convRes.status);
    const conv = await convRes.json();
    console.log("Conversation created:", conv.id);

    // 4. Send Message in direct conversation
    const msgRes = await fetch(`${BACKEND_URL}/api/communications/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify({ conversationId: conv.id, content: "hello" }),
    });
    console.log("Send msg status:", msgRes.status);
    const msg = await msgRes.json();
    console.log("Direct message ID:", msg.id);

    // 5. Pin direct message
    const pinRes = await fetch(`${BACKEND_URL}/api/communications/messages/${msg.id}/pin`, {
      method: "POST",
      headers,
    });
    console.log("Pin direct message status:", pinRes.status);
    console.log("Pin direct message body:", await pinRes.text());

    // 6. Get conversation pins
    const convPinsRes = await fetch(`${BACKEND_URL}/api/communications/conversations/${conv.id}/pins`, { headers });
    console.log("GET /conversations/:id/pins status:", convPinsRes.status);
    console.log("GET /conversations/:id/pins body:", await convPinsRes.text());

    // 7. Save direct message
    const saveRes = await fetch(`${BACKEND_URL}/api/communications/messages/${msg.id}/save`, {
      method: "POST",
      headers,
    });
    console.log("Save direct message status:", saveRes.status);
    console.log("Save direct message body:", await saveRes.text());

    // 8. Get saved messages
    const savedRes = await fetch(`${BACKEND_URL}/api/communications/saved`, { headers });
    console.log("GET /saved status:", savedRes.status);
    console.log("GET /saved body:", await savedRes.text());
  }
}

main().catch(console.error);
