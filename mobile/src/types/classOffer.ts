import type { ClassTrack } from "@/src/constants/domain";

export type { ClassTrack };
export type ClassMode = "in_person" | "online";

export const MODE_LABELS: Record<ClassMode, string> = {
  in_person: "حضوري",
  online: "أونلاين",
};

export { CLASS_TRACK_LABELS as TRACK_LABELS } from "@/src/constants/domain";

export interface ClassOfferItem {
  id: string;
  centerId: string;
  track: ClassTrack;
  levelId: string | null;
  levelLabel: string | null;
  subjectName: string;
  subjectIndex: number;
  mode: ClassMode;
  weekday: number;
  weekdayLabel: string;
  startTime: string;
  endTime: string;
  teacherName: string;
  gradeWeights: {
    attendance: number;
    shortExam: number;
    participation: number;
    final: number;
  };
  nextSessionId: string | null;
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateClassOfferPayload {
  track: ClassTrack;
  levelId?: string | null;
  subjectName: string;
  /** رقم المادة (0–6) — يُرسل صراحةً حتى لا يعتمد الخادم على تهجئة الاسم */
  subjectIndex?: number;
  mode: ClassMode;
  weekday: number;
  startTime: string;
  endTime: string;
  teacherName: string;
  gradeWeights: {
    attendance: number;
    shortExam: number;
    participation: number;
    final: number;
  };
}

export interface ListClassOffersParams {
  levelId?: string;
  track?: ClassTrack;
}
