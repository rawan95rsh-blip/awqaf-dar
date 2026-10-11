import type { LevelTrack } from "@/src/constants/domain";

export interface LevelListItem {
  id: string;
  fullName: string;
  shortName: string;
  order: number;
  track: LevelTrack;
  centerId?: string;
  studentCount?: number;
}

export type LevelDetail = LevelListItem & { centerId: string; studentCount: number };
