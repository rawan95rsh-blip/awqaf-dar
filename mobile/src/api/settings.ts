import { apiClient, getApiErrorMessage, type ApiSuccess } from '@/src/api/client';
import { GRADE_WEIGHTS, type GradeWeights } from '@/src/constants/grades';
import type { GenderAudience } from '@/src/constants/genderAudience';

export type CenterProfile = {
  id: string;
  nameAr: string;
  addressText: string;
  city: string;
  genderAudience: GenderAudience;
};

export const settingsQueryKeys = {
  gradeWeights: ['settings', 'grade-weights'] as const,
  centerProfile: ['settings', 'center-profile'] as const,
};

export async function fetchGradeWeights(): Promise<GradeWeights> {
  try {
    const response = await apiClient.get<ApiSuccess<GradeWeights>>(
      '/api/settings/grade-weights'
    );
    return response.data.data;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function updateGradeWeights(
  weights: GradeWeights
): Promise<{ gradeWeights: GradeWeights; message: string }> {
  try {
    const response = await apiClient.put<
      ApiSuccess<{ gradeWeights: GradeWeights; message: string }>
    >('/api/settings/grade-weights', weights);
    return response.data.data;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function fetchCenterProfile(): Promise<CenterProfile> {
  try {
    const response = await apiClient.get<ApiSuccess<CenterProfile>>(
      '/api/settings/center-profile'
    );
    return response.data.data;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function updateCenterProfile(payload: {
  addressText: string;
  city: string;
  genderAudience: GenderAudience;
}): Promise<CenterProfile & { message: string }> {
  try {
    const response = await apiClient.put<ApiSuccess<CenterProfile & { message: string }>>(
      '/api/settings/center-profile',
      payload
    );
    return response.data.data;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export const DEFAULT_GRADE_WEIGHTS = { ...GRADE_WEIGHTS };
