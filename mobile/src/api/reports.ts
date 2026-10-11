import { apiClient, request, type ApiSuccess } from "@/src/api/client";
import type { LevelTrack } from "@/src/constants/domain";

type ReportLevel = { id: string; fullName: string; shortName: string; track: LevelTrack };

export interface GradesheetRow {
  index: number;
  studentId: string;
  fullName: string;
  idNumber: string;
  subjects: Array<{
    subjectIndex: number;
    total: number;
    label: string;
    breakdown: { attendance: number; shortExam: number; participation: number; final: number };
  } | null>;
  recordedCount: number;
  sum: number;
  average: number | null;
  label: string | null;
  complete: boolean;
}

export interface Gradesheet {
  level: ReportLevel;
  subjects: Array<{ subjectIndex: number; name: string }>;
  isFinal: boolean;
  generatedAt: string;
  rows: GradesheetRow[];
}

export type AttendanceMark = "present" | "absent" | "late" | null;

export interface AttendanceReport {
  level: ReportLevel;
  from: string;
  to: string;
  days: string[];
  rows: Array<{
    index: number;
    studentId: string;
    fullName: string;
    idNumber: string;
    enrollmentStatus: string;
    byDay: Record<string, AttendanceMark>;
    present: number;
    absent: number;
    late: number;
    percent: number | null;
  }>;
  totals: { present: number; absent: number; late: number };
}

export const reportQueryKeys = {
  gradesheet: (levelId: string) => ["reports", "gradesheet", levelId] as const,
  attendance: (levelId: string, from: string, to: string) => ["reports", "attendance", levelId, from, to] as const,
};

export function fetchGradesheet(levelId: string): Promise<Gradesheet> {
  return request(() => apiClient.get<ApiSuccess<Gradesheet>>("/api/reports/gradesheet", { params: { levelId } }));
}

export function fetchAttendanceReport(levelId: string, from: string, to: string): Promise<AttendanceReport> {
  return request(() =>
    apiClient.get<ApiSuccess<AttendanceReport>>("/api/reports/attendance", { params: { levelId, from, to } })
  );
}
