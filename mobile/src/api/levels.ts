import { apiClient, getApiErrorMessage, type ApiSuccess } from '@/src/api/client';
import type { LevelDetail, LevelListItem } from '@/src/types/level';
import type { StudentListItem } from '@/src/types/student';

export const levelQueryKeys = {
  list: (centerId: string) => ['levels', centerId] as const,
  detail: (levelId: string) => ['level', levelId] as const,
  students: (levelId: string) => ['level-students', levelId] as const,
};

export async function fetchLevelsByCenter(centerId: string): Promise<LevelListItem[]> {
  try {
    const response = await apiClient.get<ApiSuccess<LevelListItem[]>>('/api/levels', {
      params: { centerId },
    });
    return response.data.data ?? [];
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function fetchLevelById(levelId: string): Promise<LevelDetail> {
  try {
    const response = await apiClient.get<ApiSuccess<LevelDetail>>(`/api/levels/${levelId}`);
    const payload = response.data.data;
    if (!payload?.id) {
      throw new Error('استجابة غير صالحة من الخادم');
    }
    return payload;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function fetchLevelStudents(levelId: string): Promise<StudentListItem[]> {
  try {
    const response = await apiClient.get<ApiSuccess<StudentListItem[]>>(
      `/api/levels/${levelId}/students`
    );
    return response.data.data ?? [];
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export type CreateLevelPayload = {
  fullName: string;
  shortName?: string;
  order: number;
};

export async function createLevel(payload: CreateLevelPayload): Promise<LevelDetail> {
  try {
    const response = await apiClient.post<ApiSuccess<LevelDetail>>('/api/levels', payload);
    const data = response.data.data;
    if (!data?.id) {
      throw new Error('استجابة غير صالحة من الخادم');
    }
    return data;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}
