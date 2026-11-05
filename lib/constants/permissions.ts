/**
 * Canonical permissions constants for Zyoris Frontend.
 * Perfectly mirrors backend src/shared/constants/permissions.ts.
 */
export const PERMISSIONS = {
  DASHBOARD_VIEW: "dashboard.view",

  CRM_VIEW: "crm.view",
  CRM_CREATE: "crm.create",
  CRM_UPDATE: "crm.update",
  CRM_DELETE: "crm.delete",

  LEADS_VIEW: "leads.view",
  LEADS_CREATE: "leads.create",
  LEADS_UPDATE: "leads.update",
  LEADS_DELETE: "leads.delete",
  LEADS_ASSIGN: "leads.assign",
  LEADS_IMPORT: "leads.import",
  LEADS_EXPORT: "leads.export",

  CONTACTS_VIEW: "contacts.view",
  CONTACTS_CREATE: "contacts.create",
  CONTACTS_UPDATE: "contacts.update",
  CONTACTS_DELETE: "contacts.delete",
  CONTACTS_IMPORT: "contacts.import",
  CONTACTS_EXPORT: "contacts.export",

  COMPANIES_VIEW: "companies.view",
  COMPANIES_CREATE: "companies.create",
  COMPANIES_UPDATE: "companies.update",
  COMPANIES_DELETE: "companies.delete",

  CUSTOMERS_VIEW: "customers.view",
  CUSTOMERS_CREATE: "customers.create",
  CUSTOMERS_UPDATE: "customers.update",
  CUSTOMERS_DELETE: "customers.delete",

  DEALS_VIEW: "deals.view",
  DEALS_CREATE: "deals.create",
  DEALS_UPDATE: "deals.update",
  DEALS_DELETE: "deals.delete",
  DEALS_ASSIGN: "deals.assign",
  DEALS_EXPORT: "deals.export",

  TASKS_VIEW: "tasks.view",
  TASKS_CREATE: "tasks.create",
  TASKS_UPDATE: "tasks.update",
  TASKS_DELETE: "tasks.delete",
  TASKS_ASSIGN: "tasks.assign",

  PROJECTS_VIEW: "projects.view",
  PROJECTS_CREATE: "projects.create",
  PROJECTS_UPDATE: "projects.update",
  PROJECTS_DELETE: "projects.delete",

  DOCUMENTS_VIEW: "documents.view",
  DOCUMENTS_CREATE: "documents.create",
  DOCUMENTS_UPDATE: "documents.update",
  DOCUMENTS_DELETE: "documents.delete",

  KNOWLEDGE_VIEW: "knowledge.view",
  KNOWLEDGE_CREATE: "knowledge.create",
  KNOWLEDGE_UPDATE: "knowledge.update",
  KNOWLEDGE_DELETE: "knowledge.delete",

  EMPLOYEES_VIEW: "employees.view",
  EMPLOYEES_CREATE: "employees.create",
  EMPLOYEES_UPDATE: "employees.update",
  EMPLOYEES_DELETE: "employees.delete",

  ATTENDANCE_VIEW: "attendance.view",
  ATTENDANCE_CREATE: "attendance.create",
  ATTENDANCE_UPDATE: "attendance.update",

  LEAVES_VIEW: "leaves.view",
  LEAVES_CREATE: "leaves.create",
  LEAVES_APPROVE: "leaves.approve",

  PAYSLIPS_VIEW: "payslips.view",
  PAYSLIPS_CREATE: "payslips.create",

  SHIFTS_VIEW: "shifts.view",
  SHIFTS_CREATE: "shifts.create",
  SHIFTS_UPDATE: "shifts.update",
  SHIFTS_DELETE: "shifts.delete",

  FINANCE_VIEW: "finance.view",

  INVOICES_VIEW: "invoices.view",
  INVOICES_CREATE: "invoices.create",
  INVOICES_UPDATE: "invoices.update",
  INVOICES_DELETE: "invoices.delete",

  EXPENSES_VIEW: "expenses.view",
  EXPENSES_CREATE: "expenses.create",
  EXPENSES_UPDATE: "expenses.update",
  EXPENSES_APPROVE: "expenses.approve",
  EXPENSES_DELETE: "expenses.delete",

  REPORTS_VIEW: "reports.view",
  REPORTS_EXPORT: "reports.export",

  ANALYTICS_VIEW: "analytics.view",

  MARKETING_VIEW: "marketing.view",

  CAMPAIGNS_VIEW: "campaigns.view",
  CAMPAIGNS_CREATE: "campaigns.create",
  CAMPAIGNS_UPDATE: "campaigns.update",
  CAMPAIGNS_DELETE: "campaigns.delete",

  AUTOMATION_VIEW: "automation.view",
  AUTOMATION_MANAGE: "automation.manage",

  SETTINGS_VIEW: "settings.view",
  SETTINGS_MANAGE: "settings.manage",

  USERS_VIEW: "users.view",
  USERS_CREATE: "users.create",
  USERS_UPDATE: "users.update",
  USERS_DELETE: "users.delete",

  ROLES_VIEW: "roles.view",
  ROLES_CREATE: "roles.create",
  ROLES_UPDATE: "roles.update",
  ROLES_DELETE: "roles.delete",

  AUDIT_VIEW: "audit.view",

  NOTIFICATIONS_VIEW: "notifications.view",

  INTEGRATIONS_VIEW: "integrations.view",
  INTEGRATIONS_CREATE: "integrations.create",
  INTEGRATIONS_UPDATE: "integrations.update",
  INTEGRATIONS_DELETE: "integrations.delete",

  EMAIL_ACCESS: "email.access",
  EMAIL_SEND: "email.send",
  WHATSAPP_ACCESS: "whatsapp.access",
  WHATSAPP_SEND: "whatsapp.send",
  CALLS_ACCESS: "calls.access",
  CALLS_INITIATE: "calls.initiate",
  MEETINGS_ACCESS: "meetings.access",
  MESSAGES_ACCESS: "messages.access",
  COMMUNICATION_ACCESS: "communication.access",
  HR_VIEW: "hr.view",
  ACTIVITIES_VIEW: "activities.view",

  AI_COPILOT_ACCESS: "ai_copilot.access",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
