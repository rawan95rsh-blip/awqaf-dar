import { apiClient, request, type ApiSuccess } from "@/src/api/client";
import { fetchLevelsByCenter } from "@/src/api/levels";
import { buildStudentFormData, type DocumentFiles, type StudentPayload } from "@/src/api/students";
import type { DocumentKind, Gender, Occupation, StudentTrack, StudentType } from "@/src/constants/domain";
import type { DocumentEntry, HomeAddress } from "@/src/types/student";

export interface PublicCenter {
  id: string;
  nameAr: string;
  addressText: string;
  city: string;
  genderAudience: Gender;
}

export { fetchLevelsByCenter };

export const registrationQueryKeys = {
  pending: ["registration-requests", "pending"] as const,
  centers: (audience: string) => ["public-centers", audience] as const,
};

export async function fetchPublicCenters(audience: Gender | "all" = "all"): Promise<PublicCenter[]> {
  return (
    (await request(() =>
      apiClient.get<ApiSuccess<PublicCenter[]>>("/api/centers/public", {
        params: audience === "all" ? undefined : { audience },
      })
    )) ?? []
  );
}

export type SubmitRegistrationPayload = StudentPayload & {
  centerId: string;
  password: string;
};

export async function submitRegistrationRequest(
  payload: SubmitRegistrationPayload,
  documents: DocumentFiles
): Promise<{ id: string; message: string; status: string }> {
  const form = await buildStudentFormData(payload as unknown as Record<string, unknown>, documents);
  return request(() =>
    apiClient.post<ApiSuccess<{ id: string; message: string; status: string }>>("/api/registration-requests", form, {
      headers: { "Content-Type": "multipart/form-data" },
      transformRequest: (data: unknown) => data,
      timeout: 90000,
    })
  );
}

export interface RegistrationRequestItem {
  id: string;
  fullName: string;
  idNumber: string;
  gender: Gender;
  nationality: string;
  academicLevel: string;
  track: StudentTrack;
  trackNote: string;
  phone: string;
  phoneDisplay: string;
  dob: string;
  centerId: string;
  requestedLevelId: string | null;
  requestedLevelName: string;
  courses: Array<{ id: string; name: string }>;
  occupation: Occupation | null;
  occupationOther: string;
  studentType: StudentType;
  homeAddress: HomeAddress;
  notes: string;
  documents: Record<DocumentKind, DocumentEntry>;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  studentId?: string;
  createdAt?: string;
}

export async function listPendingRequests(): Promise<RegistrationRequestItem[]> {
  return (
    (await request(() =>
      apiClient.get<ApiSuccess<RegistrationRequestItem[]>>("/api/registration-requests", {
        params: { status: "pending" },
      })
    )) ?? []
  );
}

export function getRegistrationRequest(id: string): Promise<RegistrationRequestItem> {
  return request(() => apiClient.get<ApiSuccess<RegistrationRequestItem>>(`/api/registration-requests/${id}`));
}

export function approveRequest(
  id: string,
  body: { levelId?: string; track?: StudentTrack } = {}
): Promise<{ studentId: string; message: string }> {
  return request(() =>
    apiClient.patch<ApiSuccess<{ studentId: string; message: string }>>(`/api/registration-requests/${id}/approve`, body)
  );
}

export function rejectRequest(id: string, reason: string): Promise<{ id: string; message: string }> {
  return request(() =>
    apiClient.patch<ApiSuccess<{ id: string; message: string }>>(`/api/registration-requests/${id}/reject`, { reason })
  );
}

export interface PublicCourse {
  id: string;
  name: string;
  description: string;
}

export async function fetchCenterCourses(centerId: string): Promise<PublicCourse[]> {
  return (await request(() => apiClient.get<ApiSuccess<PublicCourse[]>>(`/api/centers/${centerId}/courses`))) ?? [];
}
