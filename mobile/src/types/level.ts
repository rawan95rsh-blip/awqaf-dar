export interface LevelListItem {
  id: string;
  fullName: string;
  shortName?: string;
  order: number;
  centerId?: string;
  studentCount?: number;
}

export interface LevelDetail {
  id: string;
  fullName: string;
  shortName?: string;
  order: number;
  centerId: string;
  studentCount: number;
}
