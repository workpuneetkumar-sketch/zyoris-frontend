const BACKEND_URL = "https://zyoris.onrender.com";

async function main() {
  const ts = Date.now();
  const res = await fetch(`${BACKEND_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Demo User", email: `demo_${ts}@zyoris.test`, password: "Password123!", role: "EMPLOYEE" }),
  });
  console.log("Status:", res.status);
  console.log("Body:", await res.text());
}
main();
