import { apiClient, getApiErrorMessage, type ApiSuccess } from '@/src/api/client';
import type {
  AttendanceSheet,
  SaveAttendanceBulkPayload,
  SaveAttendanceBulkResult,
} from '@/src/types/attendance';

export const attendanceQueryKeys = {
  sheet: (levelId: string, subjectIndex: number, date: string) =>
    ['attendance', levelId, subjectIndex, date] as const,
};

export function formatAttendanceDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function fetchAttendance(
  levelId: string,
  subjectIndex: number,
  date: string
): Promise<AttendanceSheet> {
  try {
    const response = await apiClient.get<ApiSuccess<AttendanceSheet>>('/api/attendance', {
      params: { levelId, subjectIndex, date },
    });
    return response.data.data;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function saveAttendanceBulk(
  payload: SaveAttendanceBulkPayload
): Promise<SaveAttendanceBulkResult> {
  try {
    const response = await apiClient.post<ApiSuccess<SaveAttendanceBulkResult>>(
      '/api/attendance/bulk',
      payload
    );
    return response.data.data;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}
