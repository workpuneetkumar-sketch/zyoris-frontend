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
  const res = await api.get<any>("/audit", {
    params: { page, limit },
  });
  const data = res.data;
  if (Array.isArray(data)) {
    return {
      logs: data,
      pagination: {
        page,
        limit,
        total: data.length,
        totalPages: 1
      }
    };
  }
  return {
    logs: data.logs || [],
    pagination: data.pagination || {
      page,
      limit,
      total: 0,
      totalPages: 1
    }
  };
};

export const getAuditLog = async (auditLogId: string): Promise<AuditLog> => {
  const res = await api.get<AuditLog>(`/audit/${auditLogId}`);
  return res.data;
};
