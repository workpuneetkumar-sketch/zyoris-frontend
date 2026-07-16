import api from "@/lib/api/api";

export interface NotificationDto {
  id: string;
  organizationId?: string | null;
  userId: string;
  title: string;
  message: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "ERROR" | string;
  entityType?: string | null;
  entityId?: string | null;
  read: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface CreateNotificationPayload {
  userId: string;
  title: string;
  message: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "ERROR" | string;
  entityType?: string;
  entityId?: string;
}

export interface FetchNotificationsResponse {
  total: number;
  unreadCount: number;
  limit: number;
  offset: number;
  data: NotificationDto[];
}

export const fetchNotifications = async (params?: { read?: string; limit?: number; offset?: number }) => {
  const response = await api.get<FetchNotificationsResponse>("/api/notifications", { params });
  return response.data;
};

export const createNotification = async (payload: CreateNotificationPayload) => {
  const response = await api.post<NotificationDto>("/api/notifications", payload);
  return response.data;
};

export const markNotificationAsRead = async (id: string) => {
  const response = await api.patch<NotificationDto>(`/api/notifications/${id}/read`);
  return response.data;
};

export const markAllNotificationsAsRead = async () => {
  const response = await api.patch("/api/notifications/read-all");
  return response.data;
};

export const deleteNotification = async (id: string) => {
  const response = await api.delete(`/api/notifications/${id}`);
  return response.data;
};
