#!/usr/bin/env node
/**
 * RBAC Frontend Implementation — Full API Verification Script
 * Backend: https://zyoris.onrender.com
 */

const https = require("https");
const http = require("http");

const BASE = "https://zyoris.onrender.com";
const EMAIL = "admin@zyoris.local";
const PASS = "ChangeMe123!";

// ─── HTTP helper ──────────────────────────────────────────────────────────────
function request(method, url, body, token) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === "https:";
    const lib = isHttps ? https : http;
    const payload = body ? JSON.stringify(body) : null;

    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method,
      headers: {
        "Content-Type": "application/json",
        ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      timeout: 60000,
    };

    const req = lib.request(options, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        let parsed_data;
        try { parsed_data = JSON.parse(data); } catch { parsed_data = data; }
        resolve({ status: res.statusCode, data: parsed_data, raw: data });
      });
    });

    req.on("error", (e) => resolve({ status: 0, data: null, error: e.message }));
    req.on("timeout", () => { req.destroy(); resolve({ status: 0, data: null, error: "TIMEOUT" }); });

    if (payload) req.write(payload);
    req.end();
  });
}

// ─── Result tracker ───────────────────────────────────────────────────────────
const results = [];
function log(endpoint, method, status, responseData, notes = "") {
  const ok = status >= 200 && status < 300;
  const emoji = ok ? "✅" : status === 0 ? "⏱️" : "❌";
  const row = {
    endpoint,
    method,
    status,
    pass: ok,
    preview: JSON.stringify(responseData)?.slice(0, 120),
    notes,
  };
  results.push(row);
  console.log(`${emoji} [${status}] ${method} ${endpoint}`);
  if (notes) console.log(`   ℹ️  ${notes}`);
  if (!ok && responseData) console.log(`   ⚠️  Response: ${JSON.stringify(responseData)?.slice(0, 200)}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("=".repeat(70));
  console.log("  ZYORIS RBAC — FULL API VERIFICATION");
  console.log(`  Backend: ${BASE}`);
  console.log(`  Time:    ${new Date().toISOString()}`);
  console.log("=".repeat(70));
  console.log();

  // ── STEP 1: Login ────────────────────────────────────────────────────────
  console.log("── AUTHENTICATION ──────────────────────────────────────────────");
  const loginRes = await request("POST", `${BASE}/auth/login`, { email: EMAIL, password: PASS });
  const token = loginRes.data?.token || loginRes.data?.accessToken;
  const userId = loginRes.data?.user?.id;

  if (!token) {
    console.log(`❌ LOGIN FAILED — cannot proceed. Response: ${JSON.stringify(loginRes.data)}`);
    process.exit(1);
  }
  console.log(`✅ [${loginRes.status}] POST /auth/login — token acquired, userId: ${userId}`);
  console.log(`   Token prefix: ${token.slice(0, 40)}...`);
  console.log();

  // ── STEP 2: RBAC endpoints ───────────────────────────────────────────────
  console.log("── RBAC ────────────────────────────────────────────────────────");

  const rbacMe = await request("GET", `${BASE}/rbac/me`, null, token);
  log("/rbac/me", "GET", rbacMe.status, rbacMe.data,
    rbacMe.status === 200
      ? `role=${rbacMe.data?.role?.name}, permissions=${Object.keys(rbacMe.data?.permissions || {}).length} keys`
      : "");

  const rbacModules = await request("GET", `${BASE}/rbac/modules`, null, token);
  log("/rbac/modules", "GET", rbacModules.status, rbacModules.data,
    rbacModules.status === 200 ? `${Array.isArray(rbacModules.data) ? rbacModules.data.length : "?"} modules returned` : "");

  const rbacVisible = await request("GET", `${BASE}/rbac/visible-modules`, null, token);
  log("/rbac/visible-modules", "GET", rbacVisible.status, rbacVisible.data,
    rbacVisible.status === 200 ? `${Array.isArray(rbacVisible.data) ? rbacVisible.data.length : "?"} items` : "");

  const rbacRoles = await request("GET", `${BASE}/rbac/roles`, null, token);
  log("/rbac/roles", "GET", rbacRoles.status, rbacRoles.data,
    rbacRoles.status === 200 ? `${Array.isArray(rbacRoles.data) ? rbacRoles.data.length : "?"} roles` : "");

  // Get first role id for subsequent tests
  const firstRbacRole = Array.isArray(rbacRoles.data) ? rbacRoles.data[0] : null;
  const rbacRoleId = firstRbacRole?.id;

  if (rbacRoleId) {
    const rbacRoleDetail = await request("GET", `${BASE}/rbac/roles/${rbacRoleId}`, null, token);
    log(`/rbac/roles/:roleId`, "GET", rbacRoleDetail.status, rbacRoleDetail.data,
      `roleId=${rbacRoleId}, name=${rbacRoleDetail.data?.name}`);
  } else {
    log("/rbac/roles/:roleId", "GET", 0, null, "SKIPPED — no roleId available from /rbac/roles");
  }

  const rbacUserPerms = await request("GET", `${BASE}/rbac/users/permissions?userId=${userId}`, null, token);
  log("/rbac/users/permissions", "GET", rbacUserPerms.status, rbacUserPerms.data,
    rbacUserPerms.status === 200 ? `${Array.isArray(rbacUserPerms.data) ? rbacUserPerms.data.length : "?"} permissions` : "");

  console.log();

  // ── STEP 3: Roles CRUD ───────────────────────────────────────────────────
  console.log("── ROLES ───────────────────────────────────────────────────────");

  const rolesGet = await request("GET", `${BASE}/roles`, null, token);
  log("/roles", "GET", rolesGet.status, rolesGet.data,
    rolesGet.status === 200 ? `${Array.isArray(rolesGet.data) ? rolesGet.data.length : "?"} roles` : "");

  // Create a test role
  const testRoleName = `TEST_ROLE_${Date.now()}`;
  const roleCreate = await request("POST", `${BASE}/roles`, { name: testRoleName, description: "Automated test role" }, token);
  const createdRoleId = roleCreate.data?.id;
  log("/roles", "POST", roleCreate.status, roleCreate.data,
    roleCreate.status === 200 || roleCreate.status === 201 ? `created id=${createdRoleId}` : "");

  if (createdRoleId) {
    // GET single role
    const roleGet = await request("GET", `${BASE}/roles/${createdRoleId}`, null, token);
    log("/roles/:roleId", "GET", roleGet.status, roleGet.data, `name=${roleGet.data?.name}`);

    // PATCH role
    const rolePatch = await request("PATCH", `${BASE}/roles/${createdRoleId}`, { description: "Updated by test" }, token);
    log("/roles/:roleId", "PATCH", rolePatch.status, rolePatch.data, "");

    // ── Role Permissions ─────────────────────────────────────────────────
    console.log();
    console.log("── ROLE PERMISSIONS ────────────────────────────────────────────");

    const rolePermsGet = await request("GET", `${BASE}/roles/${createdRoleId}/permissions`, null, token);
    log("/roles/:roleId/permissions", "GET", rolePermsGet.status, rolePermsGet.data,
      rolePermsGet.status === 200 ? `${Array.isArray(rolePermsGet.data) ? rolePermsGet.data.length : "?"} perms` : "");

    // Assign permissions — use first available module
    const availableModules = Array.isArray(rbacModules.data) ? rbacModules.data : [];
    const testPerm = availableModules[0] || "leads.read";
    const rolePermsAssign = await request("POST", `${BASE}/roles/${createdRoleId}/permissions`, { permissions: [testPerm] }, token);
    log("/roles/:roleId/permissions", "POST", rolePermsAssign.status, rolePermsAssign.data, `assigned: [${testPerm}]`);

    // Remove permissions
    const rolePermsRemove = await request("DELETE", `${BASE}/roles/${createdRoleId}/permissions`, { permissions: [testPerm] }, token);
    log("/roles/:roleId/permissions", "DELETE", rolePermsRemove.status, rolePermsRemove.data, `removed: [${testPerm}]`);

    // DELETE role (cleanup)
    console.log();
    console.log("── ROLES (continued) ───────────────────────────────────────────");
    const roleDelete = await request("DELETE", `${BASE}/roles/${createdRoleId}`, null, token);
    log("/roles/:roleId", "DELETE", roleDelete.status, roleDelete.data, `deleted test role ${testRoleName}`);
  } else {
    ["GET /roles/:roleId", "PATCH /roles/:roleId", "DELETE /roles/:roleId",
     "GET /roles/:roleId/permissions", "POST /roles/:roleId/permissions", "DELETE /roles/:roleId/permissions"]
      .forEach(e => log(e.split(" ")[1], e.split(" ")[0], 0, null, "SKIPPED — role creation failed"));
  }

  console.log();

  // ── STEP 4: User Roles ───────────────────────────────────────────────────
  console.log("── USER ROLES ──────────────────────────────────────────────────");

  const userRoleGet = await request("GET", `${BASE}/user-roles/${userId}`, null, token);
  log("/user-roles/:userId", "GET", userRoleGet.status, userRoleGet.data,
    userRoleGet.status === 200 ? `role=${userRoleGet.data?.role?.name}` : "");

  // Use first available role for assignment test
  const allRoles = Array.isArray(rolesGet.data) ? rolesGet.data : [];
  const firstRole = allRoles[0];
  if (firstRole) {
    const userRolePatch = await request("PATCH", `${BASE}/user-roles/${userId}`, { roleId: firstRole.id }, token);
    log("/user-roles/:userId", "PATCH", userRolePatch.status, userRolePatch.data,
      `assigned roleId=${firstRole.id} (${firstRole.name})`);

    const usersByRole = await request("GET", `${BASE}/user-roles/role/${firstRole.id}`, null, token);
    log("/user-roles/role/:roleId", "GET", usersByRole.status, usersByRole.data,
      usersByRole.status === 200 ? `${Array.isArray(usersByRole.data) ? usersByRole.data.length : "?"} users` : "");
  } else {
    log("/user-roles/:userId", "PATCH", 0, null, "SKIPPED — no roles available");
    log("/user-roles/role/:roleId", "GET", 0, null, "SKIPPED — no roles available");
  }

  console.log();

  // ── STEP 5: Frontend Permissions ─────────────────────────────────────────
  console.log("── FRONTEND PERMISSIONS ────────────────────────────────────────");

  const frontendPerms = await request("GET", `${BASE}/frontend/permissions`, null, token);
  log("/frontend/permissions", "GET", frontendPerms.status, frontendPerms.data,
    frontendPerms.status === 200
      ? `sidebar=${frontendPerms.data?.sidebar?.length ?? 0}, dashboards=${frontendPerms.data?.dashboards?.length ?? 0}, modules=${frontendPerms.data?.modules?.length ?? 0}`
      : "");

  const frontendSidebar = await request("GET", `${BASE}/frontend/sidebar`, null, token);
  log("/frontend/sidebar", "GET", frontendSidebar.status, frontendSidebar.data,
    frontendSidebar.status === 200 ? `${Array.isArray(frontendSidebar.data) ? frontendSidebar.data.length : "?"} items` : "");

  const frontendDashboards = await request("GET", `${BASE}/frontend/dashboards`, null, token);
  log("/frontend/dashboards", "GET", frontendDashboards.status, frontendDashboards.data,
    frontendDashboards.status === 200 ? `${Array.isArray(frontendDashboards.data) ? frontendDashboards.data.length : "?"} items` : "");

  console.log();

  // ── STEP 6: Audit Logs ───────────────────────────────────────────────────
  console.log("── AUDIT LOGS ──────────────────────────────────────────────────");

  const auditList = await request("GET", `${BASE}/audit?page=1&limit=20`, null, token);
  const firstLogId = auditList.data?.logs?.[0]?.id;
  log("/audit", "GET", auditList.status, auditList.data,
    auditList.status === 200 ? `total=${auditList.data?.pagination?.total}, firstLogId=${firstLogId}` : "");

  if (firstLogId) {
    const auditDetail = await request("GET", `${BASE}/audit/${firstLogId}`, null, token);
    log("/audit/:auditLogId", "GET", auditDetail.status, auditDetail.data,
      auditDetail.status === 200 ? `action=${auditDetail.data?.action}` : "");
  } else {
    log("/audit/:auditLogId", "GET", 0, null, "SKIPPED — no audit logs exist yet");
  }

  // ── FINAL REPORT ─────────────────────────────────────────────────────────
  console.log();
  console.log("=".repeat(70));
  console.log("  VERIFICATION REPORT");
  console.log("=".repeat(70));

  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass && r.status !== 0).length;
  const skipped = results.filter(r => r.status === 0).length;

  console.log();
  console.log("┌─────────────────────────────────────────────────────────────┐");
  console.log("│ Endpoint                              Status  Result  Notes  │");
  console.log("├─────────────────────────────────────────────────────────────┤");
  results.forEach(r => {
    const endpt = `${r.method} ${r.endpoint}`.padEnd(38);
    const stat = String(r.status || "SKIP").padEnd(7);
    const res = (r.pass ? "PASS" : r.status === 0 ? "SKIP" : "FAIL").padEnd(7);
    const note = (r.notes || "").slice(0, 20);
    console.log(`│ ${endpt} ${stat} ${res} ${note}`);
  });
  console.log("└─────────────────────────────────────────────────────────────┘");
  console.log();
  console.log(`Total endpoints tested : ${results.length}`);
  console.log(`✅ Passed              : ${passed}`);
  console.log(`❌ Failed              : ${failed}`);
  console.log(`⏭️  Skipped/Timeout    : ${skipped}`);
  console.log();

  if (failed > 0) {
    console.log("── FAILED ENDPOINTS ────────────────────────────────────────────");
    results.filter(r => !r.pass && r.status !== 0).forEach(r => {
      console.log(`  ❌ ${r.method} ${r.endpoint} [${r.status}]`);
      console.log(`     Response preview: ${r.preview}`);
    });
  }
}

main().catch(console.error);
