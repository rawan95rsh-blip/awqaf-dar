import { apiClient, request, type ApiSuccess } from "@/src/api/client";
import type { LevelDetail, LevelListItem } from "@/src/types/level";
import type { StudentListItem } from "@/src/types/student";
import type { LevelTrack } from "@/src/constants/domain";

export const levelQueryKeys = {
  list: (centerId: string) => ["levels", centerId] as const,
  detail: (levelId: string) => ["level", levelId] as const,
  students: (levelId: string) => ["level-students", levelId] as const,
};

export async function fetchLevelsByCenter(centerId: string, track?: LevelTrack): Promise<LevelListItem[]> {
  return (
    (await request(() =>
      apiClient.get<ApiSuccess<LevelListItem[]>>("/api/levels", { params: { centerId, track } })
    )) ?? []
  );
}

export function fetchLevelById(levelId: string): Promise<LevelDetail> {
  return request(() => apiClient.get<ApiSuccess<LevelDetail>>(`/api/levels/${levelId}`));
}

export async function fetchLevelStudents(levelId: string): Promise<StudentListItem[]> {
  return (await request(() => apiClient.get<ApiSuccess<StudentListItem[]>>(`/api/levels/${levelId}/students`))) ?? [];
}

export type CreateLevelPayload = {
  fullName: string;
  shortName?: string;
  order: number;
  track: LevelTrack;
};

export function createLevel(payload: CreateLevelPayload): Promise<LevelDetail> {
  return request(() => apiClient.post<ApiSuccess<LevelDetail>>("/api/levels", payload));
}
