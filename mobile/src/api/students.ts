import { Platform } from "react-native";
import { apiClient, request, type ApiSuccess } from "@/src/api/client";
import type { StudentListItem, StudentProfile, HomeAddress } from "@/src/types/student";
import type {
  DocumentKind,
  EnrollmentStatus,
  Gender,
  Occupation,
  StudentStatus,
  StudentTrack,
  StudentType,
} from "@/src/constants/domain";
import type { PickedImage } from "@/src/ui/ImagePickerField";

export interface FetchStudentsParams {
  search?: string;
  levelId?: string;
  track?: StudentTrack;
  enrollmentStatus?: EnrollmentStatus;
  studentType?: StudentType;
  status?: StudentStatus;
}

export const studentQueryKeys = {
  all: ["students"] as const,
  list: (filters: FetchStudentsParams = {}) => ["students", "list", filters] as const,
  detail: (studentId: string) => ["students", "detail", studentId] as const,
  me: () => ["student-me"] as const,
};

export async function fetchStudents(params: FetchStudentsParams = {}): Promise<StudentListItem[]> {
  const cleaned = Object.fromEntries(
    Object.entries(params).filter(([, v]) => typeof v === "string" && v.trim())
  );
  return (await request(() => apiClient.get<ApiSuccess<StudentListItem[]>>("/api/students", { params: cleaned }))) ?? [];
}

export function fetchStudentById(studentId: string): Promise<StudentProfile> {
  return request(() => apiClient.get<ApiSuccess<StudentProfile>>(`/api/students/${studentId}`));
}

export function fetchCurrentStudent(): Promise<StudentProfile> {
  return request(() => apiClient.get<ApiSuccess<StudentProfile>>("/api/students/me"));
}

export interface StudentPayload {
  fullName?: string;
  idNumber?: string;
  gender?: Gender;
  nationality?: string;
  academicLevel?: string;
  track?: StudentTrack;
  trackNote?: string;
  phone?: string;
  countryCode?: string;
  password?: string;
  dob?: string;
  levelId?: string | null;
  courseIds?: string[];
  occupation?: Occupation | null;
  occupationOther?: string;
  studentType?: StudentType;
  homeAddress?: HomeAddress;
  notes?: string;
}

export type DocumentFiles = Partial<Record<DocumentKind, PickedImage | null>>;

/** يبني FormData للبيانات + المرفقات (يُستخدم في التسجيل والتعديل) */
export async function buildStudentFormData(
  payload: Record<string, unknown>,
  documents: DocumentFiles
): Promise<FormData> {
  const form = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value) || typeof value === "object") {
      form.append(key, JSON.stringify(value));
    } else {
      form.append(key, String(value));
    }
  }
  for (const [kind, image] of Object.entries(documents)) {
    if (!image) continue;
    if (Platform.OS === "web") {
      const blob = await (await fetch(image.uri)).blob();
      form.append(kind, blob, image.name);
    } else {
      // React Native FormData يقبل {uri, name, type}
      form.append(kind, { uri: image.uri, name: image.name, type: image.type } as unknown as Blob);
    }
  }
  return form;
}

const multipartConfig = {
  headers: { "Content-Type": "multipart/form-data" },
  transformRequest: (data: unknown) => data,
  timeout: 90000,
};

function hasFiles(documents?: DocumentFiles): boolean {
  return !!documents && Object.values(documents).some(Boolean);
}

export async function createStudent(
  payload: StudentPayload,
  documents?: DocumentFiles
): Promise<StudentProfile & { message?: string }> {
  if (hasFiles(documents)) {
    const form = await buildStudentFormData(payload as unknown as Record<string, unknown>, documents!);
    return request(() => apiClient.post<ApiSuccess<StudentProfile & { message?: string }>>("/api/students", form, multipartConfig));
  }
  return request(() => apiClient.post<ApiSuccess<StudentProfile & { message?: string }>>("/api/students", payload));
}

export async function updateStudent(
  studentId: string,
  payload: StudentPayload,
  documents?: DocumentFiles
): Promise<StudentProfile & { message?: string }> {
  if (hasFiles(documents)) {
    const form = await buildStudentFormData(payload as unknown as Record<string, unknown>, documents!);
    return request(() =>
      apiClient.put<ApiSuccess<StudentProfile & { message?: string }>>(`/api/students/${studentId}`, form, multipartConfig)
    );
  }
  return request(() =>
    apiClient.put<ApiSuccess<StudentProfile & { message?: string }>>(`/api/students/${studentId}`, payload)
  );
}

export function suspendStudent(studentId: string, reason: string): Promise<StudentProfile & { message?: string }> {
  return request(() =>
    apiClient.post<ApiSuccess<StudentProfile & { message?: string }>>(`/api/students/${studentId}/suspend`, { reason })
  );
}

export function reinstateStudent(
  studentId: string,
  body: { reason?: string; levelId?: string }
): Promise<StudentProfile & { message?: string }> {
  return request(() =>
    apiClient.post<ApiSuccess<StudentProfile & { message?: string }>>(`/api/students/${studentId}/reinstate`, body)
  );
}

export function updateStudentEnrollmentStatus(
  studentId: string,
  enrollmentStatus: EnrollmentStatus,
  reason?: string
): Promise<StudentProfile & { message?: string }> {
  return request(() =>
    apiClient.patch<ApiSuccess<StudentProfile & { message?: string }>>(
      `/api/students/${studentId}/enrollment-status`,
      { enrollmentStatus, reason }
    )
  );
}

/** ترقية يدوية للمستوى التالي (تمهيدي سادس ← مطور أول) */
export function promoteStudent(studentId: string): Promise<StudentProfile & { message?: string }> {
  return request(() =>
    apiClient.patch<ApiSuccess<StudentProfile & { message?: string }>>(`/api/students/${studentId}/promote`)
  );
}
