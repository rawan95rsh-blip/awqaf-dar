import { apiClient, getApiErrorMessage, type ApiSuccess } from '@/src/api/client';
import { fetchLevelsByCenter } from '@/src/api/levels';
import type { AudienceFilter, GenderAudience } from '@/src/constants/genderAudience';
import type { LevelListItem } from '@/src/types/level';

export interface PublicCenter {
  id: string;
  nameAr: string;
  addressText: string;
  city: string;
  genderAudience: GenderAudience;
}

export type LevelOption = LevelListItem;

export { fetchLevelsByCenter };

export interface SubmitRegistrationRequest {
  fullName: string;
  idNumber: string;
  gender: 'female' | 'male';
  nationality: string;
  academicLevel: string;
  track: 'mutor' | 'courses';
  phone: string;
  password: string;
  dob: string;
  centerId: string;
  requestedLevelId: string;
}

export interface SubmitRegistrationResponse {
  id: string;
  message: string;
  status: string;
}

export async function fetchPublicCenters(
  audience: AudienceFilter = 'all'
): Promise<PublicCenter[]> {
  try {
    const response = await apiClient.get<ApiSuccess<PublicCenter[]>>('/api/centers/public', {
      params: audience === 'all' ? undefined : { audience },
    });
    return response.data.data ?? [];
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function submitRegistrationRequest(
  data: SubmitRegistrationRequest
): Promise<SubmitRegistrationResponse> {
  try {
    const response = await apiClient.post<ApiSuccess<SubmitRegistrationResponse>>(
      '/api/registration-requests',
      data
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

export interface RegistrationRequestItem {
  id: string;
  fullName: string;
  idNumber: string;
  gender?: 'female' | 'male';
  nationality: string;
  academicLevel: string;
  track?: 'mutor' | 'courses';
  phone: string;
  dob: string;
  centerId: string;
  requestedLevelId: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  studentId?: string;
  createdAt?: string;
}

export interface ApproveRequestResponse {
  studentId: string;
  userId: string;
  message: string;
}

export interface RejectRequestResponse {
  id: string;
  status: string;
  message: string;
}

export async function listPendingRequests(): Promise<RegistrationRequestItem[]> {
  try {
    const response = await apiClient.get<ApiSuccess<RegistrationRequestItem[]>>(
      '/api/registration-requests',
      { params: { status: 'pending' } }
    );
    return response.data.data ?? [];
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function getRegistrationRequest(
  id: string
): Promise<RegistrationRequestItem> {
  try {
    const response = await apiClient.get<ApiSuccess<RegistrationRequestItem>>(
      `/api/registration-requests/${id}`
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

export async function approveRequest(
  id: string,
  levelId?: string
): Promise<ApproveRequestResponse> {
  try {
    const response = await apiClient.patch<ApiSuccess<ApproveRequestResponse>>(
      `/api/registration-requests/${id}/approve`,
      levelId ? { levelId } : {}
    );
    const payload = response.data.data;
    if (!payload?.studentId) {
      throw new Error('استجابة غير صالحة من الخادم');
    }
    return payload;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function rejectRequest(
  id: string,
  reason: string
): Promise<RejectRequestResponse> {
  try {
    const response = await apiClient.patch<ApiSuccess<RejectRequestResponse>>(
      `/api/registration-requests/${id}/reject`,
      { reason }
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
