import { apiClient, getApiErrorMessage, type ApiSuccess } from '@/src/api/client';
import type {
  CreateSessionPayload,
  ListSessionsParams,
  SessionItem,
  UpdateSessionPayload,
} from '@/src/types/session';

export const sessionsQueryKeys = {
  all: ['sessions'] as const,
  list: (params?: ListSessionsParams) => ['sessions', 'list', params ?? {}] as const,
  mine: (params?: ListSessionsParams) => ['sessions', 'me', params ?? {}] as const,
  detail: (id: string) => ['sessions', 'detail', id] as const,
};

export async function listMySessions(
  params?: ListSessionsParams
): Promise<SessionItem[]> {
  try {
    const response = await apiClient.get<ApiSuccess<SessionItem[]>>(
      '/api/sessions/me',
      { params }
    );
    return response.data.data ?? [];
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function listSessions(params?: ListSessionsParams): Promise<SessionItem[]> {
  try {
    const response = await apiClient.get<ApiSuccess<SessionItem[]>>('/api/sessions', {
      params,
    });
    return response.data.data ?? [];
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function getSession(id: string): Promise<SessionItem> {
  try {
    const response = await apiClient.get<ApiSuccess<SessionItem>>(`/api/sessions/${id}`);
    const payload = response.data.data;
    if (!payload?.id) {
      throw new Error('استجابة غير صالحة من الخادم');
    }
    return payload;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function createSession(payload: CreateSessionPayload): Promise<SessionItem> {
  try {
    const response = await apiClient.post<ApiSuccess<SessionItem>>('/api/sessions', payload);
    const data = response.data.data;
    if (!data?.id) {
      throw new Error('استجابة غير صالحة من الخادم');
    }
    return data;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function updateSession(
  id: string,
  payload: UpdateSessionPayload
): Promise<SessionItem> {
  try {
    const response = await apiClient.put<ApiSuccess<SessionItem>>(
      `/api/sessions/${id}`,
      payload
    );
    const data = response.data.data;
    if (!data?.id) {
      throw new Error('استجابة غير صالحة من الخادم');
    }
    return data;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function cancelSession(
  id: string,
  reason: string
): Promise<SessionItem> {
  try {
    const response = await apiClient.post<ApiSuccess<SessionItem>>(
      `/api/sessions/${id}/cancel`,
      { reason }
    );
    const data = response.data.data;
    if (!data?.id) {
      throw new Error('استجابة غير صالحة من الخادم');
    }
    return data;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function deleteSession(id: string): Promise<{ id: string; message: string }> {
  try {
    const response = await apiClient.delete<ApiSuccess<{ id: string; message: string }>>(
      `/api/sessions/${id}`
    );
    return response.data.data;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}
