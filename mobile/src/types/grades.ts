export interface GradeBreakdown {
  attendance: number;
  shortExam: number;
  participation: number;
  final: number;
}

export interface GradeRecord {
  studentId: string;
  breakdown: GradeBreakdown;
  total: number;
  label: string;
}

export interface GradesSheet {
  levelId: string;
  subjectIndex: number;
  records: GradeRecord[];
}

export interface SaveGradesBulkPayload {
  levelId: string;
  subjectIndex: number;
  records: Array<{
    studentId: string;
    breakdown: GradeBreakdown;
  }>;
}

export interface SaveGradesBulkResult {
  levelId: string;
  subjectIndex: number;
  savedCount: number;
  message: string;
}

export interface StudentGradesResponse {
  studentId: string;
  levelId: string;
  grades: Array<{
    subjectIndex: number;
    levelId: string;
    breakdown: GradeBreakdown;
    total: number;
    label: string;
  }>;
}

export interface StudentAttendanceResponse {
  studentId: string;
  attendancePercent: number | null;
  absentDays: number;
  calendar: Array<{
    date: string;
    status: 'present' | 'absent' | 'late' | null;
  }>;
}
