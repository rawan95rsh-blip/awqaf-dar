import { apiClient, getApiErrorMessage, type ApiSuccess } from '@/src/api/client';

export async function registerDeviceApi(
  expoPushToken: string,
  platform: 'ios' | 'android' | 'web' | 'unknown'
): Promise<void> {
  try {
    await apiClient.post<ApiSuccess<{ message: string }>>('/api/devices/register', {
      expoPushToken,
      platform,
    });
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}
