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

export const fetchNotifications = async (params?: { read?: string; limit?: number; offset?: number }): Promise<FetchNotificationsResponse> => {
  const response = await api.get("/api/notifications", { params });
  const raw = response.data;

  // Support multiple response shapes
  let notifications: NotificationDto[] =
    Array.isArray(raw) ? raw :
    Array.isArray(raw.data) ? raw.data :
    Array.isArray(raw.notifications) ? raw.notifications :
    Array.isArray(raw.data?.notifications) ? raw.data.notifications :
    [];

  const total: number =
    typeof raw.pagination?.total === "number" ? raw.pagination.total :
    typeof raw.meta?.total === "number" ? raw.meta.total :
    typeof raw.total === "number" ? raw.total :
    typeof raw.data?.total === "number" ? raw.data.total :
    notifications.length;

  const unreadCount: number =
    typeof raw.unreadCount === "number" ? raw.unreadCount :
    typeof raw.data?.unreadCount === "number" ? raw.data.unreadCount :
    notifications.filter(n => !n.read).length;

  const limit: number =
    typeof raw.limit === "number" ? raw.limit :
    typeof raw.data?.limit === "number" ? raw.data.limit :
    params?.limit ?? 50;

  const offset: number =
    typeof raw.offset === "number" ? raw.offset :
    typeof raw.data?.offset === "number" ? raw.data.offset :
    params?.offset ?? 0;

  return {
    total,
    unreadCount,
    limit,
    offset,
    data: notifications
  };
};

export const createNotification = async (payload: CreateNotificationPayload) => {
  const response = await api.post<NotificationDto>("/api/notifications", payload);
  // Handle multiple response shapes
  if (response.data?.data) return response.data.data;
  return response.data;
};

export const markNotificationAsRead = async (id: string) => {
  const response = await api.patch<NotificationDto>(`/api/notifications/${id}/read`);
  if (response.data?.data) return response.data.data;
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
