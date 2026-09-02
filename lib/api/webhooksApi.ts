import api from "@/lib/api/api";
import {
  WebhookIngressPayload,
  WebhookIngressResponse,
  WebhookProvider,
} from "@/types/integrations";

/**
 * Computes an HMAC-SHA256 hex digest for a webhook payload string.
 * Supports Web Crypto API (browser) and falls back to CryptoJS or SHA256 if needed.
 */
export async function computeHmacSha256Hex(
  payloadStr: string,
  secret: string
): Promise<string> {
  if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const key = await window.crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await window.crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payloadStr)
    );
    return Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  // Node environment fallback
  try {
    const crypto = require("crypto");
    return crypto.createHmac("sha256", secret).update(payloadStr).digest("hex");
  } catch {
    return "";
  }
}

/**
 * Ingest an external webhook event with HMAC-SHA256 signature verification.
 * POST /webhooks/ingress/{provider} (or /webhooks/{provider})
 */
export async function ingestWebhookEventApi(
  provider: WebhookProvider | string,
  payload: WebhookIngressPayload,
  options?: {
    signature?: string;
    secret?: string;
  }
): Promise<WebhookIngressResponse> {
  const normalizedProvider = encodeURIComponent(
    provider.toLowerCase().trim()
  );

  let signature = options?.signature;
  const payloadJson = JSON.stringify(payload);

  if (!signature && options?.secret) {
    signature = await computeHmacSha256Hex(payloadJson, options.secret);
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (signature) {
    headers["x-webhook-signature"] = signature;
  }

  try {
    const response = await api.post(
      `/webhooks/ingress/${normalizedProvider}`,
      payload,
      { headers }
    );
    return response.data;
  } catch (err: any) {
    // If /webhooks/ingress/:provider returns 404, fallback to /webhooks/:provider
    if (err?.response?.status === 404) {
      const fallbackResponse = await api.post(
        `/webhooks/${normalizedProvider}`,
        payload,
        { headers }
      );
      return fallbackResponse.data;
    }
    throw err;
  }
}

/**
 * List of officially supported webhook providers in Zyoris.
 */
export const SUPPORTED_WEBHOOK_PROVIDERS: { id: string; label: string; description: string }[] = [
  { id: "CRM", label: "CRM", description: "Inbound CRM leads, contacts, and account events" },
  { id: "FACEBOOK", label: "Facebook Lead Ads", description: "Ad campaign submissions and instant forms" },
  { id: "GOOGLE", label: "Google Ads / Forms", description: "Google Ads lead extensions and forms" },
  { id: "WEBSITE", label: "Website Contact / Form", description: "Web landing page forms and live chat" },
  { id: "FINANCE", label: "Finance & Accounting", description: "Billing triggers, accounts ledger events" },
  { id: "PAYMENTS", label: "Payments Gateway", description: "Payment settlements, charges, refunds" },
  { id: "INVOICE", label: "Invoices", description: "Invoice payment updates and overdue alerts" },
  { id: "HR", label: "HR System", description: "Employee onboarding and status changes" },
  { id: "ATTENDANCE", label: "Attendance Tracker", description: "Clock-in/out and biometric punches" },
  { id: "EMPLOYEE", label: "Employee Management", description: "Staff profile and position changes" },
  { id: "LEAVE", label: "Leave Management", description: "Time-off requests and approvals" },
  { id: "PROJECT", label: "Project Management", description: "Project status and milestone events" },
  { id: "TASK", label: "Task Tracker", description: "Task creations, assignments, and completions" },
  { id: "MEETING", label: "Calendar / Meetings", description: "Schedule bookings and attendee changes" },
  { id: "MARKETING", label: "Marketing Campaigns", description: "Campaign performance and audience events" },
  { id: "COMMUNICATION", label: "Communication / SMS", description: "Inbound messages and delivery receipts" },
  { id: "NOTIFICATION", label: "Notifications", description: "System alerts and broadcast triggers" },
  { id: "DASHBOARD", label: "Dashboard Metrics", description: "Metric rollups and KPI updates" },
  { id: "ANALYTICS", label: "Analytics & Telemetry", description: "Usage tracking and event streams" },
  { id: "INSIGHTS", label: "AI Insights", description: "Predictive signals and churn scores" },
];
