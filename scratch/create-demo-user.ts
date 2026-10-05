const BACKEND_URL = "https://zyoris.onrender.com";

async function main() {
  const ts = Date.now();
  const email = `demo_user_${ts}@zyoris.test`;
  const password = "Password123!";

  console.log("Registering demo user...");
  const regRes = await fetch(`${BACKEND_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Tithi Demo",
      email,
      password,
      role: "ADMIN",
    }),
  });
  const regData = await regRes.json();
  const initialToken = regData.token;
  const userId = regData.user?.id || regData.id;

  console.log("Creating demo org...");
  const orgRes = await fetch(`${BACKEND_URL}/organizations/create-org`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${initialToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: `Demo Org ${ts}`,
      userId,
      companyAbout: "Live Demonstration",
      businessType: "B2B",
    }),
  });
  const orgData = await orgRes.json();
  const token = orgData.accessToken;
  const orgId = orgData.organization?.id || orgData.id;

  // Also create a channel with initial welcome message
  const chRes = await fetch(`${BACKEND_URL}/api/communications/channels`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: `general-${ts}`,
      description: "Company-wide general discussions",
      visibility: "PUBLIC",
    }),
  });
  const ch = await chRes.json();

  // Send an initial message
  await fetch(`${BACKEND_URL}/api/communications/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channelId: ch.id,
      content: "Welcome everyone to our live Connect workspace! 👋",
    }),
  });

  const authSession = {
    token,
    user: {
      id: userId,
      email,
      name: "Tithi Demo",
      role: "ADMIN",
      organizationId: orgId,
    },
  };

  require('fs').writeFileSync('scratch/demo-credentials.json', JSON.stringify({
    email,
    password,
    token,
    authSession,
  }, null, 2));

  console.log("SUCCESS! Demo credentials written to scratch/demo-credentials.json");
  console.log("Email:", email, "Password:", password);
}

main().catch(console.error);
