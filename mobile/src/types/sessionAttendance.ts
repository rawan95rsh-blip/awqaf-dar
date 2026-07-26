import type { AttendanceStatus } from '@/src/types/attendance';

export interface MySessionAttendance {
  sessionId: string;
  status: AttendanceStatus | null;
  checkedInAt: string | null;
  canCheckIn: boolean;
  checkInMessage?: string;
  allowedCheckInStatuses: Array<'present'>;
}

export interface CheckInResult {
  sessionId: string;
  studentId: string;
  status: AttendanceStatus;
  checkedInAt?: string;
  message: string;
}
