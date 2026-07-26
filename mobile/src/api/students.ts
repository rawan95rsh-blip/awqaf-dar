import { apiClient, getApiErrorMessage, type ApiSuccess } from '@/src/api/client';
import type { StudentListItem, StudentProfile } from '@/src/types/student';

export interface FetchStudentsParams {
  search?: string;
  levelId?: string;
}

export const studentQueryKeys = {
  list: (filters: FetchStudentsParams = {}) => ['students', filters] as const,
  detail: (studentId: string) => ['student', studentId] as const,
  me: () => ['student-me'] as const,
};

export async function fetchStudents(
  params: FetchStudentsParams = {}
): Promise<StudentListItem[]> {
  try {
    const response = await apiClient.get<ApiSuccess<StudentListItem[]>>('/api/students', {
      params: {
        search: params.search?.trim() || undefined,
        levelId: params.levelId?.trim() || undefined,
      },
    });
    return response.data.data ?? [];
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function fetchStudentById(studentId: string): Promise<StudentProfile> {
  try {
    const response = await apiClient.get<ApiSuccess<StudentProfile>>(
      `/api/students/${studentId}`
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

export async function fetchCurrentStudent(): Promise<StudentProfile> {
  try {
    const response = await apiClient.get<ApiSuccess<StudentProfile>>('/api/students/me');
    const payload = response.data.data;
    if (!payload?.id) {
      throw new Error('استجابة غير صالحة من الخادم');
    }
    return payload;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export interface CreateStudentPayload {
  fullName: string;
  idNumber: string;
  gender: 'female' | 'male';
  nationality: string;
  academicLevel: string;
  track?: 'mutor' | 'courses';
  phone: string;
  password: string;
  dob: string;
  levelId?: string;
}

export async function createStudent(
  data: CreateStudentPayload
): Promise<StudentListItem & { userId?: string; message?: string }> {
  try {
    const response = await apiClient.post<
      ApiSuccess<StudentListItem & { userId?: string; message?: string }>
    >('/api/students', data);
    const payload = response.data.data;
    if (!payload?.id) {
      throw new Error('استجابة غير صالحة من الخادم');
    }
    return payload;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function updateStudentEnrollmentStatus(
  studentId: string,
  enrollmentStatus: 'enrolled' | 'graduated' | 'suspended'
): Promise<StudentProfile> {
  try {
    const response = await apiClient.patch<ApiSuccess<StudentProfile>>(
      `/api/students/${studentId}/enrollment-status`,
      { enrollmentStatus }
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

/** ترقية يدوية لمسار المطور — المستوى التالي */
export async function promoteStudent(studentId: string): Promise<StudentProfile> {
  try {
    const response = await apiClient.patch<ApiSuccess<StudentProfile>>(
      `/api/students/${studentId}/promote`
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
