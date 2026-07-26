import { apiClient, getApiErrorMessage, type ApiSuccess } from '@/src/api/client';

export type AppNotificationType = 'registration_approved' | 'session_cancelled';

export interface AppNotification {
  id: string;
  type: AppNotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt?: string;
}

export interface NotificationsList {
  items: AppNotification[];
  unreadCount: number;
}

export const notificationsQueryKeys = {
  mine: ['notifications', 'me'] as const,
};

function normalizeNotificationsList(raw: unknown): NotificationsList {
  if (!raw || typeof raw !== 'object') {
    return { items: [], unreadCount: 0 };
  }
  const data = raw as Partial<NotificationsList>;
  const items = Array.isArray(data.items) ? data.items : [];
  const unreadCount =
    typeof data.unreadCount === 'number' && Number.isFinite(data.unreadCount)
      ? data.unreadCount
      : items.filter((n) => n && n.readAt == null).length;

  return {
    items: items.filter(
      (n): n is AppNotification =>
        !!n &&
        typeof n === 'object' &&
        typeof n.id === 'string' &&
        typeof n.title === 'string' &&
        typeof n.body === 'string'
    ),
    unreadCount,
  };
}

export async function fetchMyNotifications(): Promise<NotificationsList> {
  try {
    const response = await apiClient.get<ApiSuccess<NotificationsList>>(
      '/api/notifications/me'
    );
    return normalizeNotificationsList(response.data?.data);
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function markNotificationReadApi(
  id: string
): Promise<AppNotification> {
  try {
    const response = await apiClient.patch<ApiSuccess<AppNotification>>(
      `/api/notifications/${id}/read`
    );
    const data = response.data?.data;
    if (!data?.id) {
      throw new Error('استجابة غير صالحة من الخادم');
    }
    return data;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}
