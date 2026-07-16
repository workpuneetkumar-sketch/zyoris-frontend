import api from "./api";

export interface AuditLogUser {
  id: string;
  name: string;
  email: string;
}

export interface AuditLog {
  id: string;
  action: string;
  metadata: Record<string, any>;
  createdAt: string;
  user: AuditLogUser | null;
}

export interface AuditLogsResponse {
  logs: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const getAuditLogs = async (page = 1, limit = 20): Promise<AuditLogsResponse> => {
  const res = await api.get<AuditLogsResponse>("/audit", {
    params: { page, limit },
  });
  return res.data;
};

export const getAuditLog = async (auditLogId: string): Promise<AuditLog> => {
  const res = await api.get<AuditLog>(`/audit/${auditLogId}`);
  return res.data;
};
