import { apiClient, getApiErrorMessage, type ApiSuccess } from '@/src/api/client';
import type {
  GradesSheet,
  SaveGradesBulkPayload,
  SaveGradesBulkResult,
  StudentAttendanceResponse,
  StudentGradesResponse,
} from '@/src/types/grades';

export const gradesQueryKeys = {
  sheet: (levelId: string, subjectIndex: number) =>
    ['grades', levelId, subjectIndex] as const,
  student: (studentId: string) => ['student-grades', studentId] as const,
  studentAttendance: (studentId: string) => ['student-attendance', studentId] as const,
};

export async function fetchGrades(
  levelId: string,
  subjectIndex: number
): Promise<GradesSheet> {
  try {
    const response = await apiClient.get<ApiSuccess<GradesSheet>>('/api/grades', {
      params: { levelId, subjectIndex },
    });
    return response.data.data;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function saveGradesBulk(
  payload: SaveGradesBulkPayload
): Promise<SaveGradesBulkResult> {
  try {
    const response = await apiClient.post<ApiSuccess<SaveGradesBulkResult>>(
      '/api/grades/bulk',
      payload
    );
    return response.data.data;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function fetchStudentGrades(studentId: string): Promise<StudentGradesResponse> {
  try {
    const response = await apiClient.get<ApiSuccess<StudentGradesResponse>>(
      `/api/students/${studentId}/grades`
    );
    return response.data.data;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function fetchStudentAttendance(
  studentId: string
): Promise<StudentAttendanceResponse> {
  try {
    const response = await apiClient.get<ApiSuccess<StudentAttendanceResponse>>(
      `/api/students/${studentId}/attendance`
    );
    return response.data.data;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}
