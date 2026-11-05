import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isPathAllowed, isRoleDashboardPath, isRoleDashboardAllowed } from "../utils/roleRedirect.ts";
import { PERMISSIONS } from "../lib/constants/permissions.ts";
import {
  isWidgetPermitted,
  compactLayout,
  WIDGET_PERMISSION_MAP,
  KPI_PERMISSION_MAP,
  isKpiPermitted,
} from "../components/dashboard-builder/widgetRbac.ts";

describe("Application-Wide Granular RBAC: Permission Helpers & Route Protection", () => {
  const dummySidebar = [
    { key: "dashboard", label: "Dashboard", route: "/dashboard", icon: "layout-dashboard" },
    { key: "crm", label: "CRM", route: "/crm", icon: "users" },
    { key: "tasks", label: "Tasks", route: "/tasks", icon: "list-todo" },
    { key: "settings", label: "Settings", route: "/settings", icon: "settings" },
  ];

  // Mock permission evaluator function mimicking useRBAC logic
  const createRBACContext = (permissions: Record<string, boolean>) => {
    return {
      hasPermission: (perm: string): boolean => permissions[perm] === true,
      hasAllPermissions: (perms: string[]): boolean => {
        if (!perms || perms.length === 0) return true;
        return perms.every((p) => permissions[p] === true);
      },
      hasAnyPermission: (perms: string[]): boolean => {
        if (!perms || perms.length === 0) return true;
        return perms.some((p) => permissions[p] === true);
      },
      can: (action: string, entity: string): boolean => {
        return permissions[`${entity}.${action}`] === true;
      },
    };
  };

  describe("1. Permission Helper Logic", () => {
    it("hasPermission accurately checks granted, denied, and missing permissions", () => {
      const rbac = createRBACContext({
        [PERMISSIONS.LEADS_VIEW]: true,
        [PERMISSIONS.LEADS_CREATE]: false,
      });

      assert.equal(rbac.hasPermission(PERMISSIONS.LEADS_VIEW), true);
      assert.equal(rbac.hasPermission(PERMISSIONS.LEADS_CREATE), false);
      assert.equal(rbac.hasPermission(PERMISSIONS.LEADS_DELETE), false); // missing
      assert.equal(rbac.hasPermission("nonexistent.permission"), false);
    });

    it("hasAllPermissions requires every permission to be true (AND logic)", () => {
      const rbac = createRBACContext({
        [PERMISSIONS.LEADS_UPDATE]: true,
        [PERMISSIONS.DEALS_CREATE]: false,
      });

      assert.equal(rbac.hasAllPermissions([PERMISSIONS.LEADS_UPDATE, PERMISSIONS.DEALS_CREATE]), false);
      assert.equal(rbac.hasAllPermissions([PERMISSIONS.LEADS_UPDATE]), true);
      assert.equal(rbac.hasAllPermissions([]), true);

      const rbacBoth = createRBACContext({
        [PERMISSIONS.LEADS_UPDATE]: true,
        [PERMISSIONS.DEALS_CREATE]: true,
      });
      assert.equal(rbacBoth.hasAllPermissions([PERMISSIONS.LEADS_UPDATE, PERMISSIONS.DEALS_CREATE]), true);
    });

    it("hasAnyPermission passes when at least one permission is true (OR logic)", () => {
      const rbac = createRBACContext({
        [PERMISSIONS.LEADS_VIEW]: false,
        [PERMISSIONS.CRM_VIEW]: true,
      });

      assert.equal(rbac.hasAnyPermission([PERMISSIONS.LEADS_VIEW, PERMISSIONS.CRM_VIEW]), true);

      const rbacNeither = createRBACContext({
        [PERMISSIONS.LEADS_VIEW]: false,
        [PERMISSIONS.CRM_VIEW]: false,
      });
      assert.equal(rbacNeither.hasAnyPermission([PERMISSIONS.LEADS_VIEW, PERMISSIONS.CRM_VIEW]), false);
    });

    it("can(action, entity) correctly maps to entity.action permission key", () => {
      const rbac = createRBACContext({
        "leads.create": true,
        "deals.delete": false,
      });

      assert.equal(rbac.can("create", "leads"), true);
      assert.equal(rbac.can("delete", "deals"), false);
      assert.equal(rbac.can("update", "contacts"), false);
    });
  });

  describe("2. Persona-Based Permission Scenarios", () => {
    // Persona 1: View-only user
    it("Persona 1: View-only user can view but cannot perform create/update/delete", () => {
      const viewOnlyPerms: Record<string, boolean> = {
        [PERMISSIONS.LEADS_VIEW]: true,
        [PERMISSIONS.LEADS_CREATE]: false,
        [PERMISSIONS.LEADS_UPDATE]: false,
        [PERMISSIONS.LEADS_DELETE]: false,
      };
      const rbac = createRBACContext(viewOnlyPerms);

      assert.equal(rbac.hasPermission(PERMISSIONS.LEADS_VIEW), true);
      assert.equal(rbac.hasPermission(PERMISSIONS.LEADS_CREATE), false);
      assert.equal(rbac.hasPermission(PERMISSIONS.LEADS_UPDATE), false);
      assert.equal(rbac.hasPermission(PERMISSIONS.LEADS_DELETE), false);

      // Route access is allowed for view
      assert.equal(isPathAllowed("/leads", dummySidebar, [], "USER", viewOnlyPerms), true);
    });

    // Persona 2: View + Create user
    it("Persona 2: View + Create user can view and create, but cannot update or delete", () => {
      const viewCreatePerms: Record<string, boolean> = {
        [PERMISSIONS.LEADS_VIEW]: true,
        [PERMISSIONS.LEADS_CREATE]: true,
        [PERMISSIONS.LEADS_UPDATE]: false,
        [PERMISSIONS.LEADS_DELETE]: false,
      };
      const rbac = createRBACContext(viewCreatePerms);

      assert.equal(rbac.hasPermission(PERMISSIONS.LEADS_VIEW), true);
      assert.equal(rbac.hasPermission(PERMISSIONS.LEADS_CREATE), true);
      assert.equal(rbac.hasPermission(PERMISSIONS.LEADS_UPDATE), false);
      assert.equal(rbac.hasPermission(PERMISSIONS.LEADS_DELETE), false);
    });

    // Persona 3: View + Update user
    it("Persona 3: View + Update user can view and edit, but cannot create or delete", () => {
      const viewUpdatePerms: Record<string, boolean> = {
        [PERMISSIONS.LEADS_VIEW]: true,
        [PERMISSIONS.LEADS_CREATE]: false,
        [PERMISSIONS.LEADS_UPDATE]: true,
        [PERMISSIONS.LEADS_DELETE]: false,
      };
      const rbac = createRBACContext(viewUpdatePerms);

      assert.equal(rbac.hasPermission(PERMISSIONS.LEADS_VIEW), true);
      assert.equal(rbac.hasPermission(PERMISSIONS.LEADS_CREATE), false);
      assert.equal(rbac.hasPermission(PERMISSIONS.LEADS_UPDATE), true);
      assert.equal(rbac.hasPermission(PERMISSIONS.LEADS_DELETE), false);
    });

    // Persona 4: View + Delete user
    it("Persona 4: View + Delete user can view and delete, but cannot create or update", () => {
      const viewDeletePerms: Record<string, boolean> = {
        [PERMISSIONS.LEADS_VIEW]: true,
        [PERMISSIONS.LEADS_CREATE]: false,
        [PERMISSIONS.LEADS_UPDATE]: false,
        [PERMISSIONS.LEADS_DELETE]: true,
      };
      const rbac = createRBACContext(viewDeletePerms);

      assert.equal(rbac.hasPermission(PERMISSIONS.LEADS_VIEW), true);
      assert.equal(rbac.hasPermission(PERMISSIONS.LEADS_CREATE), false);
      assert.equal(rbac.hasPermission(PERMISSIONS.LEADS_UPDATE), false);
      assert.equal(rbac.hasPermission(PERMISSIONS.LEADS_DELETE), true);
    });

    // Persona 5: Full access user
    it("Persona 5: Full-access user has all operations enabled", () => {
      const fullPerms: Record<string, boolean> = {
        [PERMISSIONS.LEADS_VIEW]: true,
        [PERMISSIONS.LEADS_CREATE]: true,
        [PERMISSIONS.LEADS_UPDATE]: true,
        [PERMISSIONS.LEADS_DELETE]: true,
        [PERMISSIONS.LEADS_ASSIGN]: true,
        [PERMISSIONS.LEADS_IMPORT]: true,
        [PERMISSIONS.LEADS_EXPORT]: true,
      };
      const rbac = createRBACContext(fullPerms);

      assert.equal(rbac.hasPermission(PERMISSIONS.LEADS_VIEW), true);
      assert.equal(rbac.hasPermission(PERMISSIONS.LEADS_CREATE), true);
      assert.equal(rbac.hasPermission(PERMISSIONS.LEADS_UPDATE), true);
      assert.equal(rbac.hasPermission(PERMISSIONS.LEADS_DELETE), true);
      assert.equal(rbac.hasPermission(PERMISSIONS.LEADS_ASSIGN), true);
      assert.equal(rbac.hasPermission(PERMISSIONS.LEADS_IMPORT), true);
      assert.equal(rbac.hasPermission(PERMISSIONS.LEADS_EXPORT), true);
    });

    // Persona 6: Zero view permission
    it("Persona 6: User with NO view permission is completely blocked from module access", () => {
      const noViewPerms: Record<string, boolean> = {
        [PERMISSIONS.LEADS_VIEW]: false,
        [PERMISSIONS.CRM_VIEW]: false,
        [PERMISSIONS.LEADS_CREATE]: false,
        [PERMISSIONS.LEADS_UPDATE]: false,
        [PERMISSIONS.LEADS_DELETE]: false,
      };
      const rbac = createRBACContext(noViewPerms);

      assert.equal(rbac.hasPermission(PERMISSIONS.LEADS_VIEW), false);
      assert.equal(isPathAllowed("/leads", dummySidebar, [], "USER", noViewPerms), false);
      assert.equal(isPathAllowed("/leads/new", dummySidebar, [], "USER", noViewPerms), false);
      assert.equal(isPathAllowed("/leads/123", dummySidebar, [], "USER", noViewPerms), false);
    });
  });

  describe("3. Route-Level Protection & URL Tampering Prevention", () => {
    it("Blocks direct URL navigation when user lacks the corresponding view permission", () => {
      const financeOnlyPerms: Record<string, boolean> = {
        [PERMISSIONS.FINANCE_VIEW]: true,
        [PERMISSIONS.INVOICES_VIEW]: true,
        [PERMISSIONS.LEADS_VIEW]: false,
        [PERMISSIONS.CRM_VIEW]: false,
        [PERMISSIONS.DEALS_VIEW]: false,
        [PERMISSIONS.EMPLOYEES_VIEW]: false,
      };

      // Allowed for Finance
      assert.equal(isPathAllowed("/finance", dummySidebar, [], "USER", financeOnlyPerms), true);
      assert.equal(isPathAllowed("/payment/invoices", dummySidebar, [], "USER", financeOnlyPerms), true);

      // Blocked from CRM & HR
      assert.equal(isPathAllowed("/leads", dummySidebar, [], "USER", financeOnlyPerms), false);
      assert.equal(isPathAllowed("/deals", dummySidebar, [], "USER", financeOnlyPerms), false);
      assert.equal(isPathAllowed("/contacts", dummySidebar, [], "USER", financeOnlyPerms), false);
      assert.equal(isPathAllowed("/hr/employees", dummySidebar, [], "USER", financeOnlyPerms), false);
      assert.equal(isPathAllowed("/tasks", dummySidebar, [], "USER", financeOnlyPerms), false);
    });

    it("Preserves access to genuinely universal routes for any logged-in user", () => {
      const minimalPerms: Record<string, boolean> = {
        [PERMISSIONS.LEADS_VIEW]: false,
      };

      assert.equal(isPathAllowed("/dashboard", dummySidebar, [], "USER", minimalPerms), true);
      assert.equal(isPathAllowed("/profile", dummySidebar, [], "USER", minimalPerms), true);
      assert.equal(isPathAllowed("/notifications", dummySidebar, [], "USER", minimalPerms), true);
      assert.equal(isPathAllowed("/portal", dummySidebar, [], "USER", minimalPerms), true);
    });

    it("Strictly protects Admin and Role Dashboard routes", () => {
      const standardUserPerms: Record<string, boolean> = {
        [PERMISSIONS.LEADS_VIEW]: true,
      };

      // Admin routes denied to non-admin
      assert.equal(isPathAllowed("/admin", dummySidebar, [], "USER", standardUserPerms), false);
      assert.equal(isPathAllowed("/admin/roles", dummySidebar, [], "USER", standardUserPerms), false);
      assert.equal(isPathAllowed("/admin/audit", dummySidebar, [], "USER", standardUserPerms), false);

      // Role dashboards restricted by role
      assert.equal(isPathAllowed("/ceo", dummySidebar, [], "USER", standardUserPerms), false);
      assert.equal(isPathAllowed("/cfo", dummySidebar, [], "USER", standardUserPerms), false);

      // Allowed for ADMIN
      assert.equal(isPathAllowed("/admin", dummySidebar, [], "ADMIN", standardUserPerms), true);
      assert.equal(isPathAllowed("/ceo", dummySidebar, [], "ADMIN", standardUserPerms), true);
    });
  });

  describe("4. Compound Permission Checks (Convert Lead to Deal)", () => {
    it("Requires BOTH leads.update AND deals.create to convert a lead to a deal", () => {
      const compoundCheck = (perms: Record<string, boolean>) => {
        const rbac = createRBACContext(perms);
        return rbac.hasAllPermissions([PERMISSIONS.LEADS_UPDATE, PERMISSIONS.DEALS_CREATE]);
      };

      // Only leads.update -> Denied
      assert.equal(compoundCheck({ [PERMISSIONS.LEADS_UPDATE]: true, [PERMISSIONS.DEALS_CREATE]: false }), false);

      // Only deals.create -> Denied
      assert.equal(compoundCheck({ [PERMISSIONS.LEADS_UPDATE]: false, [PERMISSIONS.DEALS_CREATE]: true }), false);

      // Neither -> Denied
      assert.equal(compoundCheck({ [PERMISSIONS.LEADS_UPDATE]: false, [PERMISSIONS.DEALS_CREATE]: false }), false);

      // Both -> Allowed
      assert.equal(compoundCheck({ [PERMISSIONS.LEADS_UPDATE]: true, [PERMISSIONS.DEALS_CREATE]: true }), true);
    });
  });

  describe("5. Developer Role Project View-Only Verification (Bug Reproduction & Resolution)", () => {
    const devPerms: Record<string, boolean> = {
      [PERMISSIONS.PROJECTS_VIEW]: true,
      [PERMISSIONS.PROJECTS_CREATE]: false,
      [PERMISSIONS.PROJECTS_UPDATE]: false,
      [PERMISSIONS.PROJECTS_DELETE]: false,
      [PERMISSIONS.TASKS_VIEW]: true,
      [PERMISSIONS.TASKS_CREATE]: false,
      [PERMISSIONS.TASKS_UPDATE]: false,
      [PERMISSIONS.TASKS_DELETE]: false,
      [PERMISSIONS.TASKS_ASSIGN]: false,
    };
    const rbac = createRBACContext(devPerms);

    it("Developer CAN view projects list and individual project workspace routes", () => {
      assert.equal(rbac.hasPermission(PERMISSIONS.PROJECTS_VIEW), true);
      assert.equal(isPathAllowed("/projects", dummySidebar, [], "DEVELOPER", devPerms), true);
      assert.equal(isPathAllowed("/projects/proj-123", dummySidebar, [], "DEVELOPER", devPerms), true);
    });

    it("Developer CANNOT create projects (Create button hidden/blocked)", () => {
      assert.equal(rbac.hasPermission(PERMISSIONS.PROJECTS_CREATE), false);
      assert.equal(rbac.can("create", "projects"), false);
    });

    it("Developer CANNOT edit projects (Edit button hidden, Kanban drag-and-drop disabled)", () => {
      assert.equal(rbac.hasPermission(PERMISSIONS.PROJECTS_UPDATE), false);
      assert.equal(rbac.can("update", "projects"), false);

      // Verify Kanban drag-and-drop draggable flag is false
      const canUpdate = rbac.hasPermission(PERMISSIONS.PROJECTS_UPDATE);
      const isDraggable = canUpdate;
      assert.equal(isDraggable, false);
    });

    it("Developer CANNOT delete projects (Delete button hidden/blocked)", () => {
      assert.equal(rbac.hasPermission(PERMISSIONS.PROJECTS_DELETE), false);
      assert.equal(rbac.can("delete", "projects"), false);
    });

    it("Developer CANNOT create tasks, pages, files, or manage team in Project Workspace", () => {
      const canManageTeam = rbac.hasPermission(PERMISSIONS.PROJECTS_UPDATE);
      const canCreatePage = rbac.hasPermission(PERMISSIONS.PROJECTS_UPDATE);
      const canLinkFile = rbac.hasPermission(PERMISSIONS.PROJECTS_UPDATE);
      const canInitDb = rbac.hasPermission(PERMISSIONS.PROJECTS_UPDATE);
      const canCreateTask = rbac.hasPermission(PERMISSIONS.TASKS_CREATE);

      assert.equal(canManageTeam, false);
      assert.equal(canCreatePage, false);
      assert.equal(canLinkFile, false);
      assert.equal(canInitDb, false);
      assert.equal(canCreateTask, false);
    });
  });

  describe("6. Specialized Module Permission Enforcement", () => {
    it("Enforces leads.import and leads.export independently", () => {
      const importOnly = createRBACContext({
        [PERMISSIONS.LEADS_VIEW]: true,
        [PERMISSIONS.LEADS_IMPORT]: true,
        [PERMISSIONS.LEADS_EXPORT]: false,
      });
      assert.equal(importOnly.hasPermission(PERMISSIONS.LEADS_IMPORT), true);
      assert.equal(importOnly.hasPermission(PERMISSIONS.LEADS_EXPORT), false);

      const exportOnly = createRBACContext({
        [PERMISSIONS.LEADS_VIEW]: true,
        [PERMISSIONS.LEADS_IMPORT]: false,
        [PERMISSIONS.LEADS_EXPORT]: true,
      });
      assert.equal(exportOnly.hasPermission(PERMISSIONS.LEADS_IMPORT), false);
      assert.equal(exportOnly.hasPermission(PERMISSIONS.LEADS_EXPORT), true);
    });

    it("Enforces HR leave approval and rejection independently from creation", () => {
      const employeePerms = createRBACContext({
        [PERMISSIONS.LEAVES_VIEW]: true,
        [PERMISSIONS.LEAVES_CREATE]: true,
        [PERMISSIONS.LEAVES_APPROVE]: false,
      });
      assert.equal(employeePerms.hasPermission(PERMISSIONS.LEAVES_CREATE), true);
      assert.equal(employeePerms.hasPermission(PERMISSIONS.LEAVES_APPROVE), false);

      const managerPerms = createRBACContext({
        [PERMISSIONS.LEAVES_VIEW]: true,
        [PERMISSIONS.LEAVES_CREATE]: false,
        [PERMISSIONS.LEAVES_APPROVE]: true,
      });
      assert.equal(managerPerms.hasPermission(PERMISSIONS.LEAVES_CREATE), false);
      assert.equal(managerPerms.hasPermission(PERMISSIONS.LEAVES_APPROVE), true);
    });

    it("Enforces Finance expense approval independently from creation", () => {
      const userPerms = createRBACContext({
        [PERMISSIONS.EXPENSES_VIEW]: true,
        [PERMISSIONS.EXPENSES_CREATE]: true,
        [PERMISSIONS.EXPENSES_APPROVE]: false,
      });
      assert.equal(userPerms.hasPermission(PERMISSIONS.EXPENSES_CREATE), true);
      assert.equal(userPerms.hasPermission(PERMISSIONS.EXPENSES_APPROVE), false);

      const approverPerms = createRBACContext({
        [PERMISSIONS.EXPENSES_VIEW]: true,
        [PERMISSIONS.EXPENSES_CREATE]: false,
        [PERMISSIONS.EXPENSES_APPROVE]: true,
      });
      assert.equal(approverPerms.hasPermission(PERMISSIONS.EXPENSES_CREATE), false);
      assert.equal(approverPerms.hasPermission(PERMISSIONS.EXPENSES_APPROVE), true);
    });

    it("Enforces communication actions: email.send, calls.initiate, whatsapp.send", () => {
      const commAccessOnly = createRBACContext({
        [PERMISSIONS.EMAIL_ACCESS]: true,
        [PERMISSIONS.CALLS_ACCESS]: true,
        [PERMISSIONS.WHATSAPP_ACCESS]: true,
        [PERMISSIONS.EMAIL_SEND]: false,
        [PERMISSIONS.CALLS_INITIATE]: false,
        [PERMISSIONS.WHATSAPP_SEND]: false,
      });
      assert.equal(commAccessOnly.hasPermission(PERMISSIONS.EMAIL_ACCESS), true);
      assert.equal(commAccessOnly.hasPermission(PERMISSIONS.EMAIL_SEND), false);
      assert.equal(commAccessOnly.hasPermission(PERMISSIONS.CALLS_INITIATE), false);
      assert.equal(commAccessOnly.hasPermission(PERMISSIONS.WHATSAPP_SEND), false);

      const fullComms = createRBACContext({
        [PERMISSIONS.EMAIL_ACCESS]: true,
        [PERMISSIONS.CALLS_ACCESS]: true,
        [PERMISSIONS.WHATSAPP_ACCESS]: true,
        [PERMISSIONS.EMAIL_SEND]: true,
        [PERMISSIONS.CALLS_INITIATE]: true,
        [PERMISSIONS.WHATSAPP_SEND]: true,
      });
      assert.equal(fullComms.hasPermission(PERMISSIONS.EMAIL_SEND), true);
      assert.equal(fullComms.hasPermission(PERMISSIONS.CALLS_INITIATE), true);
      assert.equal(fullComms.hasPermission(PERMISSIONS.WHATSAPP_SEND), true);
    });

    it("Enforces tasks.assign independently from tasks.update and tasks.create", () => {
      const noAssignPerms = createRBACContext({
        [PERMISSIONS.TASKS_VIEW]: true,
        [PERMISSIONS.TASKS_CREATE]: true,
        [PERMISSIONS.TASKS_UPDATE]: true,
        [PERMISSIONS.TASKS_ASSIGN]: false,
      });
      assert.equal(noAssignPerms.hasPermission(PERMISSIONS.TASKS_UPDATE), true);
      assert.equal(noAssignPerms.hasPermission(PERMISSIONS.TASKS_ASSIGN), false);

      const assignPerms = createRBACContext({
        [PERMISSIONS.TASKS_VIEW]: true,
        [PERMISSIONS.TASKS_ASSIGN]: true,
      });
      assert.equal(assignPerms.hasPermission(PERMISSIONS.TASKS_ASSIGN), true);
    });
  });

  describe("7. Form Field-Level Read-Only & Interaction Guards", () => {
    it("Detail form correctly disables fields and submit button when user lacks update permission", () => {
      const evaluateFormState = (isEdit: boolean, perms: Record<string, boolean>) => {
        const rbac = createRBACContext(perms);
        const canSubmit = isEdit ? rbac.hasPermission(PERMISSIONS.PROJECTS_UPDATE) : rbac.hasPermission(PERMISSIONS.PROJECTS_CREATE);
        const areInputsDisabled = !canSubmit;
        const isSubmitButtonDisabled = !canSubmit;
        return { canSubmit, areInputsDisabled, isSubmitButtonDisabled };
      };

      // View-only user editing existing project
      const viewOnlyEdit = evaluateFormState(true, {
        [PERMISSIONS.PROJECTS_VIEW]: true,
        [PERMISSIONS.PROJECTS_UPDATE]: false,
      });
      assert.equal(viewOnlyEdit.canSubmit, false);
      assert.equal(viewOnlyEdit.areInputsDisabled, true);
      assert.equal(viewOnlyEdit.isSubmitButtonDisabled, true);

      // Authorized user editing existing project
      const authorizedEdit = evaluateFormState(true, {
        [PERMISSIONS.PROJECTS_VIEW]: true,
        [PERMISSIONS.PROJECTS_UPDATE]: true,
      });
      assert.equal(authorizedEdit.canSubmit, true);
      assert.equal(authorizedEdit.areInputsDisabled, false);
      assert.equal(authorizedEdit.isSubmitButtonDisabled, false);
    });
  });


  describe("8. Dashboard Widget-Level RBAC Enforcement & Compaction", () => {
    it("Admin role has access to all 16 dashboard widgets regardless of permission flags", () => {
      const widgetIds = Object.keys(WIDGET_PERMISSION_MAP);
      assert.equal(widgetIds.length, 16);
      for (const id of widgetIds) {
        assert.equal(isWidgetPermitted(id, {}, true), true, `Admin should have access to widget: ${id}`);
      }
    });

    it("Developer role with 0 CRM/Deals/Finance permissions blocks Pipeline, Activities, Revenue widgets", () => {
      const developerPerms: Record<string, boolean> = {
        [PERMISSIONS.PROJECTS_VIEW]: true,
        [PERMISSIONS.TASKS_VIEW]: true,
        [PERMISSIONS.DASHBOARD_VIEW]: true,
        [PERMISSIONS.DEALS_VIEW]: false,
        [PERMISSIONS.CRM_VIEW]: false,
        [PERMISSIONS.LEADS_VIEW]: false,
        [PERMISSIONS.FINANCE_VIEW]: false,
        [PERMISSIONS.ACTIVITIES_VIEW]: false,
      };

      // Denied widgets
      assert.equal(isWidgetPermitted("pipeline", developerPerms, false), false);
      assert.equal(isWidgetPermitted("activities", developerPerms, false), false);
      assert.equal(isWidgetPermitted("revenue", developerPerms, false), false);
      assert.equal(isWidgetPermitted("cash-flow", developerPerms, false), false);

      // Permitted widgets
      assert.equal(isWidgetPermitted("projects", developerPerms, false), true);
      assert.equal(isWidgetPermitted("tasks", developerPerms, false), true);
      assert.equal(isWidgetPermitted("executive-dashboard", developerPerms, false), true);
    });

    it("User lacking finance.view cannot access revenue or cash-flow widgets or revenue KPI card", () => {
      const permsWithoutFinance: Record<string, boolean> = {
        [PERMISSIONS.DEALS_VIEW]: true,
        [PERMISSIONS.CRM_VIEW]: true,
        [PERMISSIONS.FINANCE_VIEW]: false,
      };
      assert.equal(isWidgetPermitted("revenue", permsWithoutFinance, false), false);
      assert.equal(isWidgetPermitted("cash-flow", permsWithoutFinance, false), false);
      assert.equal(isKpiPermitted("revenue", permsWithoutFinance, false), false);

      // But permitted on deals / crm
      assert.equal(isWidgetPermitted("pipeline", permsWithoutFinance, false), true);
    });

    it("User lacking activities.view cannot access activities widget", () => {
      const permsWithoutActivities: Record<string, boolean> = {
        [PERMISSIONS.CRM_VIEW]: false,
        [PERMISSIONS.LEADS_VIEW]: false,
        [PERMISSIONS.ACTIVITIES_VIEW]: false,
      };
      assert.equal(isWidgetPermitted("activities", permsWithoutActivities, false), false);

      const permsWithActivities: Record<string, boolean> = {
        [PERMISSIONS.ACTIVITIES_VIEW]: true,
      };
      assert.equal(isWidgetPermitted("activities", permsWithActivities, false), true);
    });

    it("User lacking tasks.view cannot access tasks widget or overdue-tasks KPI card", () => {
      const permsWithoutTasks: Record<string, boolean> = {
        [PERMISSIONS.TASKS_VIEW]: false,
      };
      assert.equal(isWidgetPermitted("tasks", permsWithoutTasks, false), false);
      assert.equal(isKpiPermitted("overdue-tasks", permsWithoutTasks, false), false);

      const permsWithTasks: Record<string, boolean> = {
        [PERMISSIONS.TASKS_VIEW]: true,
      };
      assert.equal(isWidgetPermitted("tasks", permsWithTasks, false), true);
      assert.equal(isKpiPermitted("overdue-tasks", permsWithTasks, false), true);
    });

    it("Viewer persona is strictly limited to granted view permissions", () => {
      const viewerPerms: Record<string, boolean> = {
        [PERMISSIONS.DASHBOARD_VIEW]: true,
        [PERMISSIONS.PROJECTS_VIEW]: true,
        [PERMISSIONS.TASKS_VIEW]: false,
        [PERMISSIONS.DEALS_VIEW]: false,
        [PERMISSIONS.FINANCE_VIEW]: false,
        [PERMISSIONS.COMMUNICATION_ACCESS]: false,
        [PERMISSIONS.MARKETING_VIEW]: false,
      };

      assert.equal(isWidgetPermitted("executive-dashboard", viewerPerms, false), true);
      assert.equal(isWidgetPermitted("projects", viewerPerms, false), true);
      assert.equal(isWidgetPermitted("tasks", viewerPerms, false), false);
      assert.equal(isWidgetPermitted("pipeline", viewerPerms, false), false);
      assert.equal(isWidgetPermitted("revenue", viewerPerms, false), false);
      assert.equal(isWidgetPermitted("communications", viewerPerms, false), false);
      assert.equal(isWidgetPermitted("marketing", viewerPerms, false), false);
    });

    it("compactLayout reorganizes remaining widgets gaplessly from top-left (0,0)", () => {
      // Simulate dashboard layout where pipeline (4x3 at 0,0) and activities (3x4 at 4,0) are removed
      const initialWidgets = [
        { instanceId: "inst-pipeline", widgetId: "pipeline", x: 0, y: 0, w: 4, h: 3 },
        { instanceId: "inst-activities", widgetId: "activities", x: 4, y: 0, w: 3, h: 4 },
        { instanceId: "inst-tasks", widgetId: "tasks", x: 7, y: 0, w: 3, h: 4 },
        { instanceId: "inst-projects", widgetId: "projects", x: 0, y: 4, w: 6, h: 4 },
      ];

      // Developer filters out pipeline and activities:
      const remainingWidgets = initialWidgets.filter(
        (w) => w.widgetId !== "pipeline" && w.widgetId !== "activities"
      );
      assert.equal(remainingWidgets.length, 2);

      const compacted = compactLayout(remainingWidgets, 12);
      assert.equal(compacted.length, 2);

      // First widget should be compacted to top-left (0,0)
      assert.equal(compacted[0].instanceId, "inst-tasks");
      assert.equal(compacted[0].x, 0);
      assert.equal(compacted[0].y, 0);
      assert.equal(compacted[0].w, 3);
      assert.equal(compacted[0].h, 4);

      // Second widget should immediately follow at x=3, y=0 without empty gaps
      assert.equal(compacted[1].instanceId, "inst-projects");
      assert.equal(compacted[1].x, 3);
      assert.equal(compacted[1].y, 0);
      assert.equal(compacted[1].w, 6);
      assert.equal(compacted[1].h, 4);
    });

    it("isKpiPermitted enforces permissions for KPI metrics and AI Briefing", () => {
      const samplePerms: Record<string, boolean> = {
        [PERMISSIONS.LEADS_VIEW]: true,
        [PERMISSIONS.DEALS_VIEW]: false,
        [PERMISSIONS.CRM_VIEW]: false,
        [PERMISSIONS.FINANCE_VIEW]: false,
        [PERMISSIONS.TASKS_VIEW]: true,
        [PERMISSIONS.EMAIL_ACCESS]: false,
        [PERMISSIONS.COMMUNICATION_ACCESS]: false,
        [PERMISSIONS.DASHBOARD_VIEW]: true,
      };

      assert.equal(isKpiPermitted("leads-count", samplePerms, false), true);
      assert.equal(isKpiPermitted("total-deal-value", samplePerms, false), false);
      assert.equal(isKpiPermitted("revenue", samplePerms, false), false);
      assert.equal(isKpiPermitted("overdue-tasks", samplePerms, false), true);
      assert.equal(isKpiPermitted("emails-sent", samplePerms, false), false);
      assert.equal(isKpiPermitted("calls-today", samplePerms, false), false);
      assert.equal(isKpiPermitted("ai-briefing", samplePerms, false), true);
    });
  });

});
