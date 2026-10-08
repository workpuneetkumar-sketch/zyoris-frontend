import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isPathAllowed,
  isRoleDashboardPath,
  isRoleDashboardAllowed,
  normalizeDashboardPath,
} from "../utils/roleRedirect.ts";
import type { SidebarItem } from "../lib/api/frontendApi.ts";

describe("Role Dashboards RBAC & Route Protection", () => {
  const dummySidebar: SidebarItem[] = [
    { key: "dashboard", label: "Dashboard", route: "/dashboard", icon: "layout-dashboard" },
    { key: "crm", label: "CRM", route: "/crm", icon: "users" },
    { key: "settings", label: "Settings", route: "/settings", icon: "settings" },
  ];

  describe("Route Normalization", () => {
    it("normalizes /dashboard/* alias routes to root role dashboard routes", () => {
      assert.equal(normalizeDashboardPath("/dashboard/ceo"), "/ceo");
      assert.equal(normalizeDashboardPath("/dashboard/cfo"), "/cfo");
      assert.equal(normalizeDashboardPath("/dashboard/sales"), "/sales");
      assert.equal(normalizeDashboardPath("/dashboard/operations"), "/operations");
      assert.equal(normalizeDashboardPath("/dashboard"), "/dashboard");
    });

    it("identifies role dashboard paths correctly", () => {
      assert.equal(isRoleDashboardPath("/ceo"), true);
      assert.equal(isRoleDashboardPath("/dashboard/ceo"), true);
      assert.equal(isRoleDashboardPath("/cfo"), true);
      assert.equal(isRoleDashboardPath("/dashboard/cfo"), true);
      assert.equal(isRoleDashboardPath("/sales"), true);
      assert.equal(isRoleDashboardPath("/dashboard/sales"), true);
      assert.equal(isRoleDashboardPath("/operations"), true);
      assert.equal(isRoleDashboardPath("/dashboard/operations"), true);

      // CRM subroutes under /sales are NOT role dashboards
      assert.equal(isRoleDashboardPath("/sales/execution"), false);
      assert.equal(isRoleDashboardPath("/sales/activities"), false);

      // Normal routes are NOT role dashboards
      assert.equal(isRoleDashboardPath("/dashboard"), false);
      assert.equal(isRoleDashboardPath("/settings"), false);
      assert.equal(isRoleDashboardPath("/admin"), false);
    });
  });

  describe("Dashboard Visibility & Access Matrix", () => {
    const roles = [
      { role: "ADMIN", ceo: true, cfo: true, sales: true, ops: true },
      { role: "CEO", ceo: true, cfo: false, sales: false, ops: false },
      { role: "CFO", ceo: false, cfo: true, sales: false, ops: false },
      { role: "SALES_HEAD", ceo: false, cfo: false, sales: true, ops: false },
      { role: "SALES_USER", ceo: false, cfo: false, sales: true, ops: false },
      { role: "OPERATIONS_HEAD", ceo: false, cfo: false, sales: false, ops: true },
      { role: "OPS", ceo: false, cfo: false, sales: false, ops: true },
      { role: "OPERATIONS", ceo: false, cfo: false, sales: false, ops: true },
      { role: "USER", ceo: false, cfo: false, sales: false, ops: false },
    ];

    roles.forEach(({ role, ceo, cfo, sales, ops }) => {
      it(`verifies access matrix for role: ${role}`, () => {
        // Direct route checks via isRoleDashboardAllowed
        assert.equal(isRoleDashboardAllowed("/ceo", role), ceo);
        assert.equal(isRoleDashboardAllowed("/cfo", role), cfo);
        assert.equal(isRoleDashboardAllowed("/sales", role), sales);
        assert.equal(isRoleDashboardAllowed("/operations", role), ops);

        // Alias route checks (/dashboard/ceo, etc.)
        assert.equal(isRoleDashboardAllowed("/dashboard/ceo", role), ceo);
        assert.equal(isRoleDashboardAllowed("/dashboard/cfo", role), cfo);
        assert.equal(isRoleDashboardAllowed("/dashboard/sales", role), sales);
        assert.equal(isRoleDashboardAllowed("/dashboard/operations", role), ops);

        // Full isPathAllowed check with sidebar items loaded
        assert.equal(isPathAllowed("/ceo", dummySidebar, [], role), ceo);
        assert.equal(isPathAllowed("/cfo", dummySidebar, [], role), cfo);
        assert.equal(isPathAllowed("/sales", dummySidebar, [], role), sales);
        assert.equal(isPathAllowed("/operations", dummySidebar, [], role), ops);

        assert.equal(isPathAllowed("/dashboard/ceo", dummySidebar, [], role), ceo);
        assert.equal(isPathAllowed("/dashboard/cfo", dummySidebar, [], role), cfo);
        assert.equal(isPathAllowed("/dashboard/sales", dummySidebar, [], role), sales);
        assert.equal(isPathAllowed("/dashboard/operations", dummySidebar, [], role), ops);
      });
    });
  });

  describe("Specific test2 (USER) role behavior", () => {
    const userRole = "USER";

    it("test2 CAN access main dashboard", () => {
      assert.equal(isPathAllowed("/dashboard", dummySidebar, [], userRole), true);
    });

    it("test2 CAN access settings", () => {
      assert.equal(isPathAllowed("/settings", dummySidebar, [], userRole), true);
    });

    it("test2 CAN access notifications", () => {
      assert.equal(isPathAllowed("/notifications", dummySidebar, [], userRole), true);
    });

    it("test2 CAN access CRM routes (e.g. leads, deals, sales/execution)", () => {
      assert.equal(isPathAllowed("/leads", dummySidebar, [], userRole), true);
      assert.equal(isPathAllowed("/deals", dummySidebar, [], userRole), true);
      assert.equal(isPathAllowed("/sales/execution", dummySidebar, [], userRole), true);
    });

    it("test2 CANNOT access any role dashboards", () => {
      assert.equal(isPathAllowed("/ceo", dummySidebar, [], userRole), false);
      assert.equal(isPathAllowed("/cfo", dummySidebar, [], userRole), false);
      assert.equal(isPathAllowed("/sales", dummySidebar, [], userRole), false);
      assert.equal(isPathAllowed("/operations", dummySidebar, [], userRole), false);
      assert.equal(isPathAllowed("/dashboard/ceo", dummySidebar, [], userRole), false);
      assert.equal(isPathAllowed("/dashboard/cfo", dummySidebar, [], userRole), false);
      assert.equal(isPathAllowed("/dashboard/sales", dummySidebar, [], userRole), false);
      assert.equal(isPathAllowed("/dashboard/operations", dummySidebar, [], userRole), false);
    });

    it("test2 CANNOT access Admin Tools (previous fix preserved)", () => {
      assert.equal(isPathAllowed("/admin", dummySidebar, [], userRole), false);
      assert.equal(isPathAllowed("/admin/roles", dummySidebar, [], userRole), false);
      assert.equal(isPathAllowed("/admin/rbac", dummySidebar, [], userRole), false);
      assert.equal(isPathAllowed("/admin/user-roles", dummySidebar, [], userRole), false);
      assert.equal(isPathAllowed("/admin/audit", dummySidebar, [], userRole), false);
      assert.equal(isPathAllowed("/admin/permission-matrix", dummySidebar, [], userRole), false);
    });
  });

  describe("ADMIN role behavior", () => {
    const adminRole = "ADMIN";

    it("admin CAN access main dashboard", () => {
      assert.equal(isPathAllowed("/dashboard", dummySidebar, [], adminRole), true);
    });

    it("admin CAN access all 4 role dashboards", () => {
      assert.equal(isPathAllowed("/ceo", dummySidebar, [], adminRole), true);
      assert.equal(isPathAllowed("/cfo", dummySidebar, [], adminRole), true);
      assert.equal(isPathAllowed("/sales", dummySidebar, [], adminRole), true);
      assert.equal(isPathAllowed("/operations", dummySidebar, [], adminRole), true);
    });

    it("admin CAN access Admin Tools", () => {
      assert.equal(isPathAllowed("/admin", dummySidebar, [], adminRole), true);
      assert.equal(isPathAllowed("/admin/roles", dummySidebar, [], adminRole), true);
      assert.equal(isPathAllowed("/admin/rbac", dummySidebar, [], adminRole), true);
    });
  });
});
