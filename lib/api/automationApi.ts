import api from "@/lib/api/api";

// ─── Types ──────────────────────────────────────────────────────────────

export type TriggerType = 
  | "LEAD_CREATED" 
  | "DEAL_WON" 
  | "LEAVE_APPLIED" 
  | "TASK_OVERDUE";

export type ActionType = 
  | "ASSIGN_USER" 
  | "ROUND_ROBIN_ASSIGN" 
  | "AI_RECOMMENDATION_ASSIGN"
  | "SEND_NOTIFICATION" 
  | "NOTIFY_MANAGER" 
  | "SEND_REMINDER";

export interface AutomationRule {
  id: string;
  organizationId: string;
  name: string;
  trigger: TriggerType;
  action: ActionType;
  config: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRulePayload {
  name: string;
  trigger: TriggerType;
  action: ActionType;
  config: Record<string, any>;
}

export interface ToggleRulePayload {
  isActive: boolean;
}

// ─── Helper Functions ──────────────────────────────────────────────────

export const getTriggerLabel = (trigger: TriggerType): string => {
  const labels: Record<TriggerType, string> = {
    LEAD_CREATED: "Lead Created",
    DEAL_WON: "Deal Won",
    LEAVE_APPLIED: "Leave Applied",
    TASK_OVERDUE: "Task Overdue",
  };
  return labels[trigger] || trigger || "Unknown";
};

export const getActionLabel = (action: ActionType): string => {
  const labels: Record<ActionType, string> = {
    ASSIGN_USER: "Assign User",
    ROUND_ROBIN_ASSIGN: "Round Robin Assign",
    AI_RECOMMENDATION_ASSIGN: "✨ AI Recommendation Strategy",
    SEND_NOTIFICATION: "Send Notification",
    NOTIFY_MANAGER: "Notify Manager",
    SEND_REMINDER: "Send Reminder",
  };
  return labels[action] || action || "Unknown";
};

export const getTriggerIcon = (trigger: TriggerType): string => {
  const icons: Record<TriggerType, string> = {
    LEAD_CREATED: "👤",
    DEAL_WON: "🏆",
    LEAVE_APPLIED: "📋",
    TASK_OVERDUE: "⏰",
  };
  return icons[trigger] || "⚡";
};

export const getActionIcon = (action: ActionType): string => {
  const icons: Record<ActionType, string> = {
    ASSIGN_USER: "👤",
    ROUND_ROBIN_ASSIGN: "🔄",
    AI_RECOMMENDATION_ASSIGN: "✨",
    SEND_NOTIFICATION: "🔔",
    NOTIFY_MANAGER: "👔",
    SEND_REMINDER: "⏰",
  };
  return icons[action] || "⚡";
};

// ─── Config Field Definitions ──────────────────────────────────────────

export interface ConfigField {
  key: string;
  label: string;
  placeholder: string;
  helperText: string;
  type: "string" | "number";
  required: boolean;
}

export const getConfigFields = (action: ActionType): ConfigField[] => {
  const configMap: Record<ActionType, ConfigField[]> = {
    ASSIGN_USER: [
      {
        key: "assignedUserId",
        label: "Assigned User ID",
        placeholder: "Enter user ID, example: cmpzf9mh301njk5k4pq9ga0vn",
        helperText: "The user ID of the person to assign this to",
        type: "string",
        required: true,
      },
    ],
    ROUND_ROBIN_ASSIGN: [
      {
        key: "team",
        label: "Team Name",
        placeholder: "Enter team name, example: sales",
        helperText: "The team to assign this to in round-robin fashion",
        type: "string",
        required: true,
      },
    ],
    AI_RECOMMENDATION_ASSIGN: [
      {
        key: "aiStrategyNote",
        label: "AI Strategy Configuration",
        placeholder: "Auto-routes using 3-Pillar scoring matrix (conversion, load, territory)",
        helperText: "No manual ID required. AI dynamically scores and assigns the top representative.",
        type: "string",
        required: false,
      },
    ],
    SEND_NOTIFICATION: [
      {
        key: "message",
        label: "Notification Message",
        placeholder: "Enter notification message, example: New lead created",
        helperText: "The message to send in the notification",
        type: "string",
        required: true,
      },
    ],
    NOTIFY_MANAGER: [
      {
        key: "managerId",
        label: "Manager ID",
        placeholder: "Enter manager user ID, example: cmpzf9mh301njk5k4pq9ga0vn",
        helperText: "The user ID of the manager to notify",
        type: "string",
        required: true,
      },
    ],
    SEND_REMINDER: [
      {
        key: "hours",
        label: "Reminder Hours",
        placeholder: "Enter reminder time in hours, example: 24",
        helperText: "Number of hours before the reminder should be sent",
        type: "number",
        required: true,
      },
    ],
  };
  return configMap[action] || [];
};

// ─── Valid Action Mapping by Trigger ──────────────────────────────────

export const getValidActionsForTrigger = (trigger: TriggerType): ActionType[] => {
  const mapping: Record<TriggerType, ActionType[]> = {
    LEAD_CREATED: [
      "ASSIGN_USER",
      "ROUND_ROBIN_ASSIGN",
      "AI_RECOMMENDATION_ASSIGN",
      "SEND_NOTIFICATION",
      "NOTIFY_MANAGER",
      "SEND_REMINDER",
    ],
    DEAL_WON: [
      "SEND_NOTIFICATION",
      "NOTIFY_MANAGER",
      "SEND_REMINDER",
    ],
    LEAVE_APPLIED: [
      "NOTIFY_MANAGER",
      "SEND_NOTIFICATION",
    ],
    TASK_OVERDUE: [
      "SEND_REMINDER",
      "NOTIFY_MANAGER",
      "SEND_NOTIFICATION",
    ],
  };
  return mapping[trigger] || [];
};

// ─── API Methods ───────────────────────────────────────────────────────

export async function getRules(): Promise<AutomationRule[]> {
  try {
    const res = await api.get("/automation/rules");
    let data = res.data?.data || res.data;
    if (!Array.isArray(data)) data = [];
    // Ensure config is always an object
    return data.map((rule: any) => ({
      ...rule,
      config: rule.config || {},
    }));
  } catch (error: any) {
    console.error("Error fetching rules:", error);
    throw new Error(error.response?.data?.message || "Failed to fetch rules");
  }
}

export async function createRule(payload: CreateRulePayload): Promise<AutomationRule> {
  try {
    const res = await api.post("/automation/rules", payload);
    const rule = res.data?.data || res.data;
    return {
      ...rule,
      config: rule.config || {},
    };
  } catch (error: any) {
    console.error("Error creating rule:", error);
    throw new Error(error.response?.data?.message || "Failed to create rule");
  }
}

export async function toggleRule(id: string, isActive: boolean): Promise<{ success: boolean }> {
  try {
    const res = await api.patch(`/automation/rules/${id}/toggle`, { isActive });
    return res.data;
  } catch (error: any) {
    console.error("Error toggling rule:", error);
    throw new Error(error.response?.data?.message || "Failed to toggle rule");
  }
}

export async function deleteRule(id: string): Promise<{ success: boolean }> {
  try {
    const res = await api.delete(`/automation/rules/${id}`);
    return res.data;
  } catch (error: any) {
    console.error("Error deleting rule:", error);
    throw new Error(error.response?.data?.message || "Failed to delete rule");
  }
}

export function getRuleStats(rules: AutomationRule[]) {
  const total = rules.length;
  const active = rules.filter(r => r.isActive).length;
  const disabled = total - active;
  
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentlyCreated = rules.filter(r => new Date(r.createdAt) >= sevenDaysAgo).length;

  return { total, active, disabled, recentlyCreated };
}

// ─── Validate Config ───────────────────────────────────────────────────

export function validateConfig(action: ActionType, config: Record<string, any>): { valid: boolean; errors: string[] } {
  const fields = getConfigFields(action);
  const errors: string[] = [];

  fields.forEach((field) => {
    if (field.required) {
      const value = config[field.key];
      if (value === undefined || value === null || value === "") {
        errors.push(`${field.label} is required`);
      }
      if (field.type === "number" && value !== undefined && value !== null && value !== "") {
        if (isNaN(Number(value)) || Number(value) <= 0) {
          errors.push(`${field.label} must be a positive number`);
        }
      }
    }
  });

  return { valid: errors.length === 0, errors };
}