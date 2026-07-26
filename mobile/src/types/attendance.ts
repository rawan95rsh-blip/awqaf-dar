export type AttendanceStatus = 'present' | 'absent' | 'late';

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'حاضرة',
  absent: 'غائبة',
  late: 'متأخرة',
};

export interface AttendanceRecord {
  studentId: string;
  status: AttendanceStatus;
}

export interface AttendanceSheet {
  levelId: string;
  subjectIndex: number;
  date: string;
  records: AttendanceRecord[];
}

export interface SaveAttendanceBulkPayload {
  levelId: string;
  subjectIndex: number;
  date: string;
  records: AttendanceRecord[];
}

export interface SaveAttendanceBulkResult {
  levelId: string;
  subjectIndex: number;
  date: string;
  savedCount: number;
  message: string;
}
