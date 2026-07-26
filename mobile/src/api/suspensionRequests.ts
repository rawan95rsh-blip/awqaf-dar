import { apiClient, getApiErrorMessage, type ApiSuccess } from '@/src/api/client';

export interface SuspensionRequestItem {
  id: string;
  studentId: string;
  centerId: string;
  userId: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  studentName?: string;
  studentIdNumber?: string;
  createdAt?: string;
}

export const suspensionRequestQueryKeys = {
  list: (status = 'pending') => ['suspension-requests', status] as const,
};

export async function submitSuspensionRequest(
  reason?: string
): Promise<{ id: string; message: string; status: string }> {
  try {
    const response = await apiClient.post<
      ApiSuccess<{ id: string; message: string; status: string }>
    >('/api/suspension-requests', reason ? { reason } : {});
    const payload = response.data.data;
    if (!payload?.id) {
      throw new Error('استجابة غير صالحة من الخادم');
    }
    return payload;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function listSuspensionRequests(
  status = 'pending'
): Promise<SuspensionRequestItem[]> {
  try {
    const response = await apiClient.get<ApiSuccess<SuspensionRequestItem[]>>(
      '/api/suspension-requests',
      { params: { status } }
    );
    return response.data.data ?? [];
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function approveSuspensionRequest(
  id: string
): Promise<{ id: string; message: string }> {
  try {
    const response = await apiClient.patch<ApiSuccess<{ id: string; message: string }>>(
      `/api/suspension-requests/${id}/approve`
    );
    const payload = response.data.data;
    if (!payload?.id) {
      throw new Error('استجابة غير صالحة من الخادم');
    }
    return payload;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function rejectSuspensionRequest(
  id: string,
  reason?: string
): Promise<{ id: string; message: string }> {
  try {
    const response = await apiClient.patch<ApiSuccess<{ id: string; message: string }>>(
      `/api/suspension-requests/${id}/reject`,
      reason ? { reason } : {}
    );
    const payload = response.data.data;
    if (!payload?.id) {
      throw new Error('استجابة غير صالحة من الخادم');
    }
    return payload;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}
