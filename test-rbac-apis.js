const axios = require("axios");

const BASE_URL = "https://zyoris.onrender.com";

// Test credentials
const testUsers = [
  { email: "admin@zyoris.local", password: "ChangeMe123!" },
  { email: "ceo@zyoris.local", password: "ChangeMe123!" },
  { email: "cfo@zyoris.local", password: "ChangeMe123!" },
  { email: "sales@zyoris.local", password: "ChangeMe123!" },
  { email: "ops@zyoris.local", password: "ChangeMe123!" },
  { email: "Demo@zyoris.local", password: "Zyoris!" },
];

// Test endpoints
const endpoints = [
  // RBAC endpoints
  { method: "GET", url: "/rbac/me", name: "Get RBAC Me" },
  { method: "GET", url: "/rbac/modules", name: "Get RBAC Modules" },
  { method: "GET", url: "/rbac/visible-modules", name: "Get RBAC Visible Modules" },
  { method: "GET", url: "/rbac/roles", name: "Get RBAC Roles" },
  { method: "GET", url: "/rbac/health", name: "Get RBAC Health" },
  
  // Roles endpoints
  { method: "GET", url: "/roles", name: "Get Roles" },
  { method: "GET", url: "/roles/get-roles", name: "Get Roles (Paginated)" },
  { method: "GET", url: "/roles/get-org-owner-roles", name: "Get Org Owner Roles" },
  
  // Frontend endpoints
  { method: "GET", url: "/frontend/permissions", name: "Get Frontend Permissions" },
  { method: "GET", url: "/frontend/sidebar", name: "Get Frontend Sidebar" },
  { method: "GET", url: "/frontend/dashboards", name: "Get Frontend Dashboards" },
  
  // Audit endpoints
  { method: "GET", url: "/audit", name: "Get Audit Logs" },
  
  // Permission Matrix endpoints
  { method: "GET", url: "/permission-matrix", name: "Get Permission Matrix" },
  { method: "GET", url: "/permission-matrix/templates", name: "Get Permission Templates" },
];

async function testUser(user) {
  console.log(`\n=== Testing ${user.email} ===`);
  try {
    // 1. Login
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: user.email,
      password: user.password,
    });
    const token = loginResponse.data.token;
    const userId = loginResponse.data.user.id;
    const roleId = loginResponse.data.user.role;
    console.log(`✅ Login successful (role: ${loginResponse.data.user.role})`);

    // Configure axios to use token
    const authenticatedAxios = axios.create({
      baseURL: BASE_URL,
      headers: { Authorization: `Bearer ${token}` },
    });

    // Test all endpoints
    for (const endpoint of endpoints) {
      try {
        const response = await authenticatedAxios({
          method: endpoint.method,
          url: endpoint.url,
        });
        console.log(`✅ ${endpoint.name} (Status: ${response.status})`);
      } catch (err) {
        if (err.response) {
          if (err.response.status === 403) {
            console.log(`⚠️ ${endpoint.name} - Permission Denied (Status: ${err.response.status})`);
          } else {
            console.log(`❌ ${endpoint.name} - Error (Status: ${err.response.status})`);
          }
        } else {
          console.log(`❌ ${endpoint.name} - Network Error`);
        }
      }
    }

    // Test role-specific endpoints
    if (roleId) {
      try {
        const roleDetailsRes = await authenticatedAxios.get(`/rbac/roles/${roleId}`);
        console.log(`✅ Get Role Details (roleId: ${roleId})`);
      } catch (err) {
        console.log(`⚠️ Get Role Details (roleId: ${roleId}) - ${err.response?.status || "Error"}`);
      }
      try {
        const userPermsRes = await authenticatedAxios.get(`/rbac/users/permissions`, {
          params: { userId },
        });
        console.log(`✅ Get User Permissions (userId: ${userId})`);
      } catch (err) {
        console.log(`⚠️ Get User Permissions (userId: ${userId}) - ${err.response?.status || "Error"}`);
      }
    }
  } catch (err) {
    if (err.response) {
      console.log(`❌ Login failed for ${user.email} (Status: ${err.response.status}): ${JSON.stringify(err.response.data)}`);
    } else {
      console.log(`❌ Login failed for ${user.email}: Network Error`);
    }
  }
}

async function main() {
  console.log("Starting RBAC API verification...");
  for (const user of testUsers) {
    await testUser(user);
  }
  console.log("\n=== Verification complete ===");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
