import { apiClient, getApiErrorMessage, type ApiSuccess } from '@/src/api/client';
import { mapAccountToUser } from '@/src/types/account';
import type {
  AccountResponse,
  ChangePasswordPayload,
  UpdateAccountPayload,
} from '@/src/types/account';

export { mapAccountToUser };
export type { AccountResponse, UpdateAccountPayload, ChangePasswordPayload };

export async function fetchAccount(): Promise<AccountResponse> {
  try {
    const response = await apiClient.get<ApiSuccess<AccountResponse>>('/api/account');
    return response.data.data;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function updateAccount(payload: UpdateAccountPayload): Promise<AccountResponse> {
  try {
    const response = await apiClient.put<ApiSuccess<AccountResponse>>('/api/account', payload);
    return response.data.data;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function changePassword(payload: ChangePasswordPayload): Promise<{ message: string }> {
  try {
    const response = await apiClient.put<ApiSuccess<{ message: string }>>(
      '/api/account/password',
      payload
    );
    return response.data.data;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}
