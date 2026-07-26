export type ClassTrack = "mutor" | "courses";
export type ClassMode = "in_person" | "online";

export const MUTOR_LEVEL_ORDER_MIN = 1;
export const MUTOR_LEVEL_ORDER_MAX = 8;

export const TRACK_LABELS: Record<ClassTrack, string> = {
  mutor: "مطور",
  courses: "دورة",
};

export const MODE_LABELS: Record<ClassMode, string> = {
  in_person: "حضوري",
  online: "أونلاين",
};

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
