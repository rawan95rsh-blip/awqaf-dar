import { apiClient, getApiErrorMessage, type ApiSuccess } from '@/src/api/client';

export interface AccountDeletionRequestItem {
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

export const deletionRequestQueryKeys = {
  list: (status = 'pending') => ['account-deletion-requests', status] as const,
};

export async function submitAccountDeletionRequest(
  reason?: string
): Promise<{ id: string; message: string; status: string }> {
  try {
    const response = await apiClient.post<
      ApiSuccess<{ id: string; message: string; status: string }>
    >('/api/account-deletion-requests', reason ? { reason } : {});
    const payload = response.data.data;
    if (!payload?.id) {
      throw new Error('استجابة غير صالحة من الخادم');
    }
    return payload;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function listAccountDeletionRequests(
  status = 'pending'
): Promise<AccountDeletionRequestItem[]> {
  try {
    const response = await apiClient.get<ApiSuccess<AccountDeletionRequestItem[]>>(
      '/api/account-deletion-requests',
      { params: { status } }
    );
    return response.data.data ?? [];
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function approveAccountDeletionRequest(
  id: string
): Promise<{ id: string; message: string }> {
  try {
    const response = await apiClient.patch<ApiSuccess<{ id: string; message: string }>>(
      `/api/account-deletion-requests/${id}/approve`
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

export async function rejectAccountDeletionRequest(
  id: string,
  reason?: string
): Promise<{ id: string; message: string }> {
  try {
    const response = await apiClient.patch<ApiSuccess<{ id: string; message: string }>>(
      `/api/account-deletion-requests/${id}/reject`,
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
