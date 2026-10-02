import React from "react";

/**
 * Customer-friendly formatting utilities for Sales Execution, Sequences,
 * Outreach channels, Proposals, and Customer Preferences.
 * Ensures internal API enums and developer template syntax are never
 * exposed directly to business users.
 */

export const STEP_TYPE_LABELS: Record<string, string> = {
  EMAIL: "Send Email",
  SEND_EMAIL: "Send Email",
  CALL: "Phone Call",
  CALL_TASK: "Phone Call",
  TASK: "Create Task",
  WAIT: "Wait Delay",
  WAIT_DELAY: "Wait Delay",
  LINKEDIN: "LinkedIn Touchpoint",
  WHATSAPP: "WhatsApp Message",
  SEND_WHATSAPP: "WhatsApp Message",
  WAIT_CONDITION: "Wait for Condition",
  BRANCH_CONDITION: "Branching Decision",
};

export function formatStepTypeLabel(stepType: string | null | undefined): string {
  if (!stepType) return "Step Action";
  const upper = stepType.trim().toUpperCase();
  return STEP_TYPE_LABELS[upper] || stepType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export const OUTREACH_CHANNEL_LABELS: Record<string, string> = {
  EMAIL: "Email",
  WHATSAPP: "WhatsApp",
  CALL_SCRIPT: "Phone Call Script",
  LINKEDIN: "LinkedIn Message",
};

export function formatOutreachChannel(channel: string | null | undefined): string {
  if (!channel) return "Channel";
  const upper = channel.trim().toUpperCase();
  if (upper === "ALL") return "All Channels";
  return OUTREACH_CHANNEL_LABELS[upper] || channel.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export const PROPOSAL_ACTION_LABELS: Record<string, string> = {
  AUTO_APPROVE: "Auto Approve",
  REQUIRE_VP_APPROVAL: "Require VP Approval",
  FLAG_COMPLIANCE: "Flag Compliance",
};

export function formatProposalAction(action: string | null | undefined): string {
  if (!action) return "Action";
  const upper = action.trim().toUpperCase();
  return PROPOSAL_ACTION_LABELS[upper] || action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export const PREFERENCE_CHANNEL_LABELS: Record<string, string> = {
  EMAIL: "Email",
  PHONE: "Phone",
  SMS: "SMS",
  WHATSAPP: "WhatsApp",
  IN_APP: "In-App",
  NONE: "None",
};

export function formatPreferenceChannel(channel: string | null | undefined): string {
  if (!channel) return "";
  const upper = channel.trim().toUpperCase();
  return PREFERENCE_CHANNEL_LABELS[upper] || channel;
}

export const CONSENT_STATUS_LABELS: Record<string, string> = {
  GRANTED: "Granted",
  PENDING: "Pending",
  WITHDRAWN: "Withdrawn",
  NOT_SET: "Not Set",
};

export function formatConsentStatus(status: string | null | undefined): string {
  if (!status) return "";
  const upper = status.trim().toUpperCase();
  return CONSENT_STATUS_LABELS[upper] || status;
}

export const TEMPLATE_VARIABLE_LABELS: Record<string, string> = {
  firstName: "First Name",
  company: "Company",
  name: "Full Name",
  jobTitle: "Job Title",
  email: "Email",
  phone: "Phone",
};

/**
 * Returns plain-text customer-friendly preview by replacing {{var}} tokens with [Friendly Label].
 * E.g. "Hi {{firstName}}, thanks for connecting." -> "Hi [First Name], thanks for connecting."
 */
export function formatTemplateDisplayText(text: string | null | undefined): string {
  if (!text) return "";
  return text.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_match, varName) => {
    const label = TEMPLATE_VARIABLE_LABELS[varName] || varName;
    return `[${label}]`;
  });
}

/**
 * Converts raw template text containing {{variable}} into user-friendly JSX
 * with styled badges representing personalization tokens.
 * E.g. "Hi {{firstName}}, thanks for connecting." -> "Hi [First Name], thanks for connecting."
 */
export function renderTemplatePreview(text: string | null | undefined): React.ReactNode {
  if (!text) return null;

  const parts = text.split(/(\{\{[a-zA-Z0-9_]+\}\})/g);

  return React.createElement(
    React.Fragment,
    null,
    ...parts.map((part, index) => {
      const match = part.match(/^\{\{([a-zA-Z0-9_]+)\}\}$/);
      if (match) {
        const varName = match[1];
        const friendlyLabel = TEMPLATE_VARIABLE_LABELS[varName] || varName;
        return React.createElement(
          "span",
          {
            key: index,
            className: "sales-variable-chip",
            title: `Personalization variable: {{${varName}}}`,
            style: {
              display: "inline-flex",
              alignItems: "center",
              padding: "0.08rem 0.38rem",
              margin: "0 0.15rem",
              borderRadius: "4px",
              background: "rgba(37, 99, 235, 0.12)",
              color: "var(--color-primary)",
              fontWeight: 600,
              fontSize: "0.75rem",
              border: "1px solid rgba(37, 99, 235, 0.25)",
              verticalAlign: "baseline",
              userSelect: "none",
            },
          },
          `[${friendlyLabel}]`
        );
      }
      return React.createElement(React.Fragment, { key: index }, part);
    })
  );
}
