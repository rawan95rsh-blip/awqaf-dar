import type { AttendanceStatus } from '../models/Attendance';

export const STUDENT_CHECK_IN_STATUSES = ['present'] as const;
export type StudentCheckInStatus = (typeof STUDENT_CHECK_IN_STATUSES)[number];

export const CHECK_IN_EARLY_MINUTES = 15;

export function isStudentCheckInStatus(value: unknown): value is StudentCheckInStatus {
  return (
    typeof value === 'string' &&
    (STUDENT_CHECK_IN_STATUSES as readonly string[]).includes(value)
  );
}

export function isWithinSessionCheckInWindow(startAt: Date, endAt: Date, now = new Date()): boolean {
  const windowStart = startAt.getTime() - CHECK_IN_EARLY_MINUTES * 60 * 1000;
  const windowEnd = endAt.getTime();
  const ts = now.getTime();
  return ts >= windowStart && ts <= windowEnd;
}

/** يُخزَّن في كشف التحضير الموحّد */
export function mapCheckInToAttendanceStatus(status: StudentCheckInStatus): AttendanceStatus {
  return status;
}
