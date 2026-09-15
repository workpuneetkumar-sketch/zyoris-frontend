import api from "./api";

// ── Email Templates ───────────────────────────────────────────────────────────

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmailTemplatePayload {
  name: string;
  subject: string;
  body: string;
}

export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  const res = await api.get("/templates");
  // Some APIs wrap response in data or templates array
  if (Array.isArray(res.data)) return res.data;
  if (res.data && typeof res.data === "object") {
    if (Array.isArray((res.data as any).templates)) return (res.data as any).templates;
    if (Array.isArray((res.data as any).data)) return (res.data as any).data;
  }
  return [];
}

export async function createEmailTemplate(payload: EmailTemplatePayload): Promise<EmailTemplate> {
  const res = await api.post("/templates", payload);
  return res.data;
}

export async function updateEmailTemplate(id: string, payload: Partial<EmailTemplatePayload>): Promise<EmailTemplate> {
  const res = await api.put(`/templates/${id}`, payload);
  return res.data;
}

export async function deleteEmailTemplate(id: string): Promise<void> {
  await api.delete(`/templates/${id}`);
}

// ── WhatsApp Templates ────────────────────────────────────────────────────────

export interface WhatsAppTemplate {
  id: string;
  name: string;
  body: string;
  category?: string;
  language?: string;
  status?: "ACTIVE" | "INACTIVE" | "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
  createdAt?: string;
  updatedAt?: string;
}

export interface WhatsAppTemplatePayload {
  name: string;
  body: string;
  category?: string;
  language?: string;
  status?: string;
}

export async function getWhatsAppTemplates(): Promise<WhatsAppTemplate[]> {
  const res = await api.get("/whatsapp/templates");
  if (Array.isArray(res.data)) return res.data;
  if (res.data && typeof res.data === "object") {
    if (Array.isArray((res.data as any).templates)) return (res.data as any).templates;
    if (Array.isArray((res.data as any).data)) return (res.data as any).data;
  }
  return [];
}

export async function createWhatsAppTemplate(payload: WhatsAppTemplatePayload): Promise<WhatsAppTemplate> {
  const res = await api.post("/whatsapp/templates", payload);
  return res.data;
}

export async function updateWhatsAppTemplate(id: string, payload: Partial<WhatsAppTemplatePayload>): Promise<WhatsAppTemplate> {
  const res = await api.put(`/whatsapp/templates/${id}`, payload);
  return res.data;
}

export async function deleteWhatsAppTemplate(id: string): Promise<void> {
  await api.delete(`/whatsapp/templates/${id}`);
}

// ── Campaign Templates ────────────────────────────────────────────────────────

export interface CampaignTemplate {
  id: string;
  name: string;
  description?: string;
  channel: string;
  budget?: number;
  status?: "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED";
  createdAt?: string;
  updatedAt?: string;
}

export interface CampaignTemplatePayload {
  name: string;
  description?: string;
  channel: string;
  budget?: number;
  status?: string;
}

export async function getCampaignTemplates(): Promise<CampaignTemplate[]> {
  const res = await api.get("/campaigns/templates");
  if (Array.isArray(res.data)) return res.data;
  if (res.data && typeof res.data === "object") {
    if (Array.isArray((res.data as any).templates)) return (res.data as any).templates;
    if (Array.isArray((res.data as any).data)) return (res.data as any).data;
  }
  return [];
}

export async function createCampaignTemplate(payload: CampaignTemplatePayload): Promise<CampaignTemplate> {
  const res = await api.post("/campaigns/templates", payload);
  return res.data;
}

export async function updateCampaignTemplate(id: string, payload: Partial<CampaignTemplatePayload>): Promise<CampaignTemplate> {
  const res = await api.put(`/campaigns/templates/${id}`, payload);
  return res.data;
}

export async function deleteCampaignTemplate(id: string): Promise<void> {
  await api.delete(`/campaigns/templates/${id}`);
}
