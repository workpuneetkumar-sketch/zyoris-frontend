// lib/rbacChatGuard.ts
/**
 * Role-Based Access Control (RBAC) Guard for ZII BOT CRM Chatbot.
 * Ensures users cannot access CRM modules or records they are not authorized for.
 */

export interface ModuleSecurityContext {
  role?: string;
  userPermissions?: Record<string, boolean>;
  visibleModules?: string[];
}

export interface PermissionCheckResult {
  authorized: boolean;
  moduleLabel?: string;
  message?: string;
}

export const MODULE_DEFINITIONS: Record<
  string,
  {
    label: string;
    moduleKey: string;
    permKeys: string[];
    blockedRoles?: string[];
  }
> = {
  leads: {
    label: "Leads",
    moduleKey: "leads",
    permKeys: ["leads:read", "leads:view", "leads"],
    blockedRoles: ["HR", "HR_MANAGER", "CLIENT", "CUSTOMER", "GUEST", "PORTAL"],
  },
  imports: {
    label: "Lead Import & Extraction",
    moduleKey: "leads",
    permKeys: ["leads:read", "leads:view", "leads"],
    blockedRoles: ["HR", "HR_MANAGER", "CLIENT", "CUSTOMER", "GUEST", "PORTAL"],
  },
  deals: {
    label: "Deals & Pipelines",
    moduleKey: "deals",
    permKeys: ["deals:read", "deals:view", "deals"],
    blockedRoles: ["HR", "HR_MANAGER", "CLIENT", "CUSTOMER", "GUEST", "PORTAL", "MARKETING"],
  },
  contacts: {
    label: "Contacts",
    moduleKey: "contacts",
    permKeys: ["contacts:read", "contacts:view", "contacts"],
    blockedRoles: ["GUEST", "PORTAL", "HR"],
  },
  companies: {
    label: "Companies",
    moduleKey: "companies",
    permKeys: ["companies:read", "companies:view", "companies"],
    blockedRoles: ["GUEST", "PORTAL", "HR"],
  },
  revenue: {
    label: "Revenue & Financial Forecasts",
    moduleKey: "finance",
    permKeys: ["finance:read", "revenue:view", "finance"],
    blockedRoles: ["SALES_REP", "HR", "CLIENT", "CUSTOMER", "GUEST", "PORTAL", "MARKETING"],
  },
  finance: {
    label: "Finance & Accounting",
    moduleKey: "finance",
    permKeys: ["finance:read", "finance"],
    blockedRoles: ["SALES", "SALES_REP", "HR", "CLIENT", "CUSTOMER", "GUEST", "PORTAL", "MARKETING"],
  },
  expenses: {
    label: "Expenses & Budgets",
    moduleKey: "finance",
    permKeys: ["finance:read", "expenses:view", "finance"],
    blockedRoles: ["SALES", "SALES_REP", "CLIENT", "CUSTOMER", "GUEST", "PORTAL"],
  },
  invoices: {
    label: "Invoices",
    moduleKey: "finance",
    permKeys: ["invoices:read", "finance:read", "finance"],
    blockedRoles: ["HR", "CLIENT", "GUEST", "PORTAL"],
  },
  hr: {
    label: "Human Resources (HR)",
    moduleKey: "hr",
    permKeys: ["hr:read", "hr"],
    blockedRoles: ["SALES", "SALES_REP", "CLIENT", "CUSTOMER", "GUEST", "PORTAL", "MARKETING"],
  },
  employees: {
    label: "Employees & HR",
    moduleKey: "hr",
    permKeys: ["hr:read", "employees:read", "hr"],
    blockedRoles: ["SALES", "SALES_REP", "CLIENT", "CUSTOMER", "GUEST", "PORTAL", "MARKETING"],
  },
  attendance: {
    label: "Attendance",
    moduleKey: "hr",
    permKeys: ["attendance:read", "hr:read", "hr"],
    blockedRoles: ["SALES", "SALES_REP", "CLIENT", "CUSTOMER", "GUEST", "PORTAL"],
  },
  leaves: {
    label: "Leave Records",
    moduleKey: "hr",
    permKeys: ["leaves:read", "hr:read", "hr"],
    blockedRoles: ["SALES", "SALES_REP", "CLIENT", "CUSTOMER", "GUEST", "PORTAL"],
  },
  campaigns: {
    label: "Marketing Campaigns",
    moduleKey: "marketing",
    permKeys: ["marketing:read", "campaigns:view", "marketing"],
    blockedRoles: ["HR", "CLIENT", "CUSTOMER", "GUEST"],
  },
  tasks: {
    label: "Tasks",
    moduleKey: "tasks",
    permKeys: ["tasks:read", "tasks:view", "tasks"],
    blockedRoles: ["GUEST"],
  },
  datasets: {
    label: "CRM Datasets & Schemas",
    moduleKey: "analytics",
    permKeys: ["analytics:read", "reports:view", "analytics"],
    blockedRoles: ["SALES_REP", "HR", "CLIENT", "CUSTOMER", "GUEST"],
  },
  insights: {
    label: "Executive Briefing Insights",
    moduleKey: "analytics",
    permKeys: ["analytics:read", "reports:view", "analytics"],
    blockedRoles: ["CLIENT", "CUSTOMER", "GUEST"],
  },
  segments: {
    label: "Audience Segments",
    moduleKey: "analytics",
    permKeys: ["analytics:read", "analytics"],
    blockedRoles: ["HR", "CLIENT", "CUSTOMER", "GUEST"],
  },
  conversion: {
    label: "Conversion & Win Rate Analytics",
    moduleKey: "analytics",
    permKeys: ["analytics:read", "analytics"],
    blockedRoles: ["HR", "CLIENT", "CUSTOMER", "GUEST"],
  },
  projects: {
    label: "Projects",
    moduleKey: "projects",
    permKeys: ["projects:read", "projects"],
    blockedRoles: ["GUEST", "PORTAL"],
  },
};

const KEYWORD_TO_MODULE_MAP: Array<{ keywords: string[]; moduleKey: string }> = [
  { keywords: ["lead", "leads", "prospect", "import", "extraction", "extract", "parser"], moduleKey: "leads" },
  { keywords: ["deal", "deals", "pipeline", "won", "lost", "win rate"], moduleKey: "deals" },
  { keywords: ["revenue", "financial", "forecast", "arr", "mrr", "income"], moduleKey: "revenue" },
  { keywords: ["finance", "expense", "expenses", "cost", "spend", "budget", "invoice", "invoices", "bill", "accounting"], moduleKey: "finance" },
  { keywords: ["employee", "employees", "staff", "attendance", "leave", "leaves", "payroll", "salary", "salaries", "hr", "human resource"], moduleKey: "hr" },
  { keywords: ["contact", "contacts"], moduleKey: "contacts" },
  { keywords: ["company", "companies", "organization"], moduleKey: "companies" },
  { keywords: ["campaign", "campaigns", "marketing"], moduleKey: "campaigns" },
  { keywords: ["dataset", "datasets", "schema"], moduleKey: "datasets" },
  { keywords: ["insight", "insights", "executive briefing"], moduleKey: "insights" },
  { keywords: ["project", "projects"], moduleKey: "projects" },
  { keywords: ["task", "tasks", "todo"], moduleKey: "tasks" },
];

/**
 * Checks if the user is authorized to query a specific CRM module/intent.
 */
export function checkModulePermission(
  intent: string,
  security?: ModuleSecurityContext
): PermissionCheckResult {
  let role = (security?.role || "").toUpperCase();
  if (!role && typeof window !== "undefined") {
    try {
      role = (localStorage.getItem("userRole") || "").toUpperCase();
    } catch {}
    if (!role) {
      try {
        const rawUser = localStorage.getItem("user");
        if (rawUser) {
          const u = JSON.parse(rawUser);
          role = (u.role || u.roleName || "").toUpperCase();
        }
      } catch {}
    }
  }
  if (!role) role = "USER";

  // Admins, Super Admins, Owners, and Developers have universal CRM authorization
  if (
    role.includes("ADMIN") ||
    role.includes("DEVELOP") ||
    role === "OWNER" ||
    role === "SUPER_ADMIN"
  ) {
    return { authorized: true };
  }

  const perms = security?.userPermissions || {};
  const visible = security?.visibleModules || [];

  const target = MODULE_DEFINITIONS[intent];
  if (!target) {
    return { authorized: true };
  }

  // 1. Check if module is in visibleModules (when visibleModules is populated)
  if (Array.isArray(visible) && visible.length > 0) {
    const isVisible = visible.some(
      (m) =>
        m.toLowerCase() === target.moduleKey.toLowerCase() ||
        m.toLowerCase() === intent.toLowerCase()
    );
    if (!isVisible) {
      return {
        authorized: false,
        moduleLabel: target.label,
        message: `🔒 **Access Restricted**\n\nYou do not have permission to access **${target.label}** records with your current role (**${role}**).\n\nPlease contact your organization administrator to request access to the ${target.label} module.`,
      };
    }
  }

  // 2. Check if explicitly blocked for role
  if (target.blockedRoles) {
    const isBlocked = target.blockedRoles.some(
      (blocked) => role.includes(blocked) || role === blocked
    );
    if (isBlocked) {
      return {
        authorized: false,
        moduleLabel: target.label,
        message: `🔒 **Access Restricted**\n\nYou do not have permission to access **${target.label}** records with your current role (**${role}**).\n\nPlease contact your organization administrator to request access.`,
      };
    }
  }

  // 3. Check explicit userPermissions false
  for (const p of target.permKeys) {
    if (perms[p] === false) {
      return {
        authorized: false,
        moduleLabel: target.label,
        message: `🔒 **Access Restricted**\n\nYou do not have permission to access **${target.label}** records with your current role (**${role}**).\n\nPlease contact your organization administrator to request access.`,
      };
    }
  }

  return { authorized: true };
}

/**
 * Inspects a natural language user query and verifies that the user has
 * permissions for ALL CRM modules mentioned or implicated in the query.
 */
export function checkQueryPermissions(
  query: string,
  security?: ModuleSecurityContext
): PermissionCheckResult {
  const text = (query || "").toLowerCase();

  let role = (security?.role || "").toUpperCase();
  if (!role && typeof window !== "undefined") {
    try {
      role = (localStorage.getItem("userRole") || "").toUpperCase();
    } catch {}
    if (!role) {
      try {
        const rawUser = localStorage.getItem("user");
        if (rawUser) {
          const u = JSON.parse(rawUser);
          role = (u.role || u.roleName || "").toUpperCase();
        }
      } catch {}
    }
  }
  if (!role) role = "USER";

  // Admins, Super Admins, Owners, and Developers have universal CRM authorization
  if (
    role.includes("ADMIN") ||
    role.includes("DEVELOP") ||
    role === "OWNER" ||
    role === "SUPER_ADMIN"
  ) {
    return { authorized: true };
  }

  // Check all keyword mappings against user's permissions
  for (const mapping of KEYWORD_TO_MODULE_MAP) {
    const matches = mapping.keywords.some((k) => text.includes(k));
    if (matches) {
      const permCheck = checkModulePermission(mapping.moduleKey, security);
      if (!permCheck.authorized) {
        return permCheck;
      }
    }
  }

  return { authorized: true };
}
