const axios = require("axios");
const fs = require("fs");
const path = require("path");

const BASE_URL = "https://zyoris.onrender.com";
const REPORT_FILE = path.join(__dirname, "RBAC_VERIFICATION_REPORT.json");

// Test credentials
const testUsers = [
  { email: "admin@zyoris.local", password: "ChangeMe123!" },
  { email: "Demo@zyoris.local", password: "Zyoris!" },
  { email: "ceo@zyoris.local", password: "ChangeMe123!" },
  { email: "cfo@zyoris.local", password: "ChangeMe123!" },
  { email: "sales@zyoris.local", password: "ChangeMe123!" },
  { email: "ops@zyoris.local", password: "ChangeMe123!" },
];

// All endpoints to test (RBAC, Roles, Frontend, Audit, Permission Matrix, User Roles)
const allEndpoints = [
  // RBAC endpoints
  { method: "GET", url: "/rbac/me", name: "Get RBAC Me", category: "RBAC" },
  { method: "GET", url: "/rbac/modules", name: "Get RBAC Modules", category: "RBAC" },
  { method: "GET", url: "/rbac/visible-modules", name: "Get RBAC Visible Modules", category: "RBAC" },
  { method: "GET", url: "/rbac/roles", name: "Get RBAC Roles", category: "RBAC" },
  { method: "GET", url: "/rbac/health", name: "Get RBAC Health", category: "RBAC" },
  
  // Roles endpoints
  { method: "GET", url: "/roles", name: "Get Roles", category: "Roles" },
  { method: "GET", url: "/roles/get-roles", name: "Get Roles (Paginated)", category: "Roles" },
  { method: "GET", url: "/roles/get-org-owner-roles", name: "Get Org Owner Roles", category: "Roles" },
  
  // Frontend endpoints
  { method: "GET", url: "/frontend/permissions", name: "Get Frontend Permissions", category: "Frontend" },
  { method: "GET", url: "/frontend/sidebar", name: "Get Frontend Sidebar", category: "Frontend" },
  { method: "GET", url: "/frontend/dashboards", name: "Get Frontend Dashboards", category: "Frontend" },
  
  // Audit endpoints
  { method: "GET", url: "/audit", name: "Get Audit Logs", category: "Audit" },
  
  // Permission Matrix endpoints
  { method: "GET", url: "/permission-matrix", name: "Get Permission Matrix", category: "Permission Matrix" },
  { method: "GET", url: "/permission-matrix/templates", name: "Get Permission Templates", category: "Permission Matrix" },
  
  // User Roles endpoints (for completeness)
];

async function testUser(user, report) {
  console.log(`\n=== Testing ${user.email} ===`);
  const userReport = {
    email: user.email,
    loginSuccess: false,
    loginError: null,
    user: null,
    token: null,
    sidebar: null,
    visibleDashboards: null,
    endpoints: [],
  };

  try {
    // 1. Login
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: user.email,
      password: user.password,
    });
    userReport.loginSuccess = true;
    userReport.user = loginResponse.data.user;
    userReport.token = loginResponse.data.token;
    console.log(`✅ Login successful (role: ${loginResponse.data.user.role})`);

    const authenticatedAxios = axios.create({
      baseURL: BASE_URL,
      headers: { Authorization: `Bearer ${userReport.token}` },
    });

    // 2. Fetch Frontend Permissions (sidebar, dashboards)
    try {
      const frontendPermsRes = await authenticatedAxios.get("/frontend/permissions");
      userReport.sidebar = frontendPermsRes.data.sidebar;
      userReport.visibleDashboards = frontendPermsRes.data.dashboards;
      console.log("✅ Fetched frontend permissions");
    } catch (err) {
      console.log("❌ Failed to fetch frontend permissions");
    }

    // 3. Test all endpoints
    for (const endpoint of allEndpoints) {
      const endpointReport = {
        ...endpoint,
        success: false,
        status: null,
        data: null,
        error: null,
        verdict: null,
      };

      try {
        const response = await authenticatedAxios({
          method: endpoint.method,
          url: endpoint.url,
        });
        endpointReport.success = true;
        endpointReport.status = response.status;
        endpointReport.data = response.data;
        endpointReport.verdict = "PASS";
        console.log(`✅ ${endpoint.name} (Status: ${response.status})`);
      } catch (err) {
        if (err.response) {
          endpointReport.status = err.response.status;
          endpointReport.error = err.response.data;
          if (err.response.status === 403) {
            endpointReport.verdict = "Expected RBAC denial";
            console.log(`⚠️ ${endpoint.name} - Permission Denied (Status: 403)`);
          } else if (err.response.status === 401) {
            endpointReport.verdict = "Expected auth issue";
            console.log(`⚠️ ${endpoint.name} - Unauthorized (Status: 401)`);
          } else {
            endpointReport.verdict = "Backend bug";
            console.log(`❌ ${endpoint.name} - Error (Status: ${err.response.status}): ${JSON.stringify(err.response.data)}`);
          }
        } else {
          endpointReport.verdict = "Network error";
          console.log(`❌ ${endpoint.name} - Network Error`);
        }
      }
      userReport.endpoints.push(endpointReport);
    }

    // 4. Test role-specific endpoints (if we have role/user ID)
    const userId = userReport.user.id;
    const roleName = userReport.user.role;

    // Try GET /rbac/roles/:roleId (but roleName might not be an ID, so try both with name and first role from /rbac/roles)
    let roleId = null;
    try {
      const rolesRes = await authenticatedAxios.get("/rbac/roles");
      if (rolesRes.data && rolesRes.data.length > 0) {
        roleId = rolesRes.data[0].id; // Use first role's ID for testing
      }
    } catch {
      // Ignore if we can't get roles
    }

    if (roleId) {
      // Test GET /rbac/roles/:roleId
      const roleDetailsReport = {
        method: "GET",
        url: `/rbac/roles/${roleId}`,
        name: "Get Role Details",
        category: "RBAC",
      };
      try {
        const res = await authenticatedAxios.get(`/rbac/roles/${roleId}`);
        userReport.endpoints.push({
          ...roleDetailsReport,
          success: true,
          status: res.status,
          data: res.data,
          verdict: "PASS",
        });
        console.log(`✅ Get Role Details (roleId: ${roleId})`);
      } catch (err) {
        const report = { ...roleDetailsReport, success: false };
        if (err.response) {
          report.status = err.response.status;
          report.error = err.response.data;
          report.verdict = err.response.status === 403 ? "Expected RBAC denial" : "Backend bug";
        } else {
          report.verdict = "Network error";
        }
        userReport.endpoints.push(report);
      }
    }

    // Test GET /rbac/users/permissions?userId=
    const userPermsReport = {
      method: "GET",
      url: `/rbac/users/permissions?userId=${userId}`,
      name: "Get User Permissions",
      category: "RBAC",
    };
    try {
      const res = await authenticatedAxios.get("/rbac/users/permissions", { params: { userId } });
      userReport.endpoints.push({
        ...userPermsReport,
        success: true,
        status: res.status,
        data: res.data,
        verdict: "PASS",
      });
      console.log(`✅ Get User Permissions (userId: ${userId})`);
    } catch (err) {
      const report = { ...userPermsReport, success: false };
      if (err.response) {
        report.status = err.response.status;
        report.error = err.response.data;
        report.verdict = err.response.status === 403 ? "Expected RBAC denial" : "Backend bug";
      } else {
        report.verdict = "Network error";
      }
      userReport.endpoints.push(report);
    }

    // Test GET /user-roles/:userId
    const userRoleReport = {
      method: "GET",
      url: `/user-roles/${userId}`,
      name: "Get User Role",
      category: "User Roles",
    };
    try {
      const res = await authenticatedAxios.get(`/user-roles/${userId}`);
      userReport.endpoints.push({
        ...userRoleReport,
        success: true,
        status: res.status,
        data: res.data,
        verdict: "PASS",
      });
      console.log(`✅ Get User Role (userId: ${userId})`);
    } catch (err) {
      const report = { ...userRoleReport, success: false };
      if (err.response) {
        report.status = err.response.status;
        report.error = err.response.data;
        report.verdict = err.response.status === 403 ? "Expected RBAC denial" : "Backend bug";
      } else {
        report.verdict = "Network error";
      }
      userReport.endpoints.push(report);
    }

    // Test GET /user-roles/role/:roleId (if we have a roleId)
    if (roleId) {
      const usersByRoleReport = {
        method: "GET",
        url: `/user-roles/role/${roleId}`,
        name: "Get Users by Role",
        category: "User Roles",
      };
      try {
        const res = await authenticatedAxios.get(`/user-roles/role/${roleId}`);
        userReport.endpoints.push({
          ...usersByRoleReport,
          success: true,
          status: res.status,
          data: res.data,
          verdict: "PASS",
        });
        console.log(`✅ Get Users by Role (roleId: ${roleId})`);
      } catch (err) {
        const report = { ...usersByRoleReport, success: false };
        if (err.response) {
          report.status = err.response.status;
          report.error = err.response.data;
          report.verdict = err.response.status === 403 ? "Expected RBAC denial" : "Backend bug";
        } else {
          report.verdict = "Network error";
        }
        userReport.endpoints.push(report);
      }
    }

    // Test GET /permission-matrix/:roleId (if we have roleId)
    if (roleId) {
      const permMatrixRoleReport = {
        method: "GET",
        url: `/permission-matrix/${roleId}`,
        name: "Get Role Permission Matrix",
        category: "Permission Matrix",
      };
      try {
        const res = await authenticatedAxios.get(`/permission-matrix/${roleId}`);
        userReport.endpoints.push({
          ...permMatrixRoleReport,
          success: true,
          status: res.status,
          data: res.data,
          verdict: "PASS",
        });
        console.log(`✅ Get Role Permission Matrix (roleId: ${roleId})`);
      } catch (err) {
        const report = { ...permMatrixRoleReport, success: false };
        if (err.response) {
          report.status = err.response.status;
          report.error = err.response.data;
          report.verdict = err.response.status === 403 ? "Expected RBAC denial" : "Backend bug";
        } else {
          report.verdict = "Network error";
        }
        userReport.endpoints.push(report);
      }
    }
  } catch (err) {
    userReport.loginSuccess = false;
    if (err.response) {
      userReport.loginError = { status: err.response.status, data: err.response.data };
      console.log(`❌ Login failed for ${user.email} (Status: ${err.response.status}): ${JSON.stringify(err.response.data)}`);
    } else {
      userReport.loginError = { message: err.message, code: err.code };
      console.log(`❌ Login failed for ${user.email}: Network Error`);
    }
  }

  report.users.push(userReport);
  return userReport;
}

async function main() {
  console.log("=== Starting RBAC Production Verification ===\n");
  const report = {
    generatedAt: new Date().toISOString(),
    users: [],
  };

  for (const user of testUsers) {
    await testUser(user, report);
  }

  // Save report to file
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
  console.log(`\n=== Verification Complete! Report saved to ${REPORT_FILE} ===`);
}

main().catch((err) => {
  console.error("Fatal error during verification:", err);
  process.exit(1);
});
