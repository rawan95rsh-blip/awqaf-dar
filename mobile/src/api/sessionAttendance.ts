import { apiClient, getApiErrorMessage, type ApiSuccess } from '@/src/api/client';
import type { CheckInResult, MySessionAttendance } from '@/src/types/sessionAttendance';

export const sessionAttendanceQueryKeys = {
  mine: (sessionId: string) => ['sessionAttendance', 'me', sessionId] as const,
};

export async function fetchMySessionAttendance(
  sessionId: string
): Promise<MySessionAttendance> {
  try {
    const response = await apiClient.get<ApiSuccess<MySessionAttendance>>(
      `/api/sessions/${sessionId}/attendance/me`
    );
    return response.data.data;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function checkInToSession(
  sessionId: string,
  status: 'present'
): Promise<CheckInResult> {
  try {
    const response = await apiClient.post<ApiSuccess<CheckInResult>>(
      `/api/sessions/${sessionId}/check-in`,
      { status }
    );
    return response.data.data;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}
