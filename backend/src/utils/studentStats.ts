import mongoose from 'mongoose';
import type { AttendanceStatus } from '../models/Attendance';
import { Attendance } from '../models/Attendance';
import { Grade } from '../models/Grade';

export const ATTENDANCE_WINDOW_DAYS = 30;

export type StudentStatusValue = 'regular' | 'frequent_absence' | 'warning' | 'excellent';

export type AttendanceCalendarDay = {
  date: string;
  status: AttendanceStatus | null;
};

export type StudentStats = {
  attendancePercent: number | null;
  gradeAverage: number | null;
  status: StudentStatusValue;
  absentDays: number;
  attendanceCalendar: AttendanceCalendarDay[];
};

type StatsAccumulator = {
  attended: number;
  total: number;
  absentDays: Set<string>;
  byDate: Map<string, AttendanceStatus[]>;
};

function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getAttendanceWindow(): { start: Date; end: Date; days: string[] } {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - (ATTENDANCE_WINDOW_DAYS - 1));
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  const days: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(formatDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return { start, end, days };
}

function aggregateDayStatus(statuses: AttendanceStatus[]): AttendanceStatus | null {
  if (statuses.length === 0) return null;
  if (statuses.some((status) => status === 'absent')) return 'absent';
  if (statuses.some((status) => status === 'late')) return 'late';
  return 'present';
}

export function deriveStudentStatus(
  attendancePercent: number | null,
  gradeAverage: number | null
): StudentStatusValue {
  if (attendancePercent != null && attendancePercent < 70) {
    return 'frequent_absence';
  }

  if (
    gradeAverage != null &&
    gradeAverage >= 90 &&
    (attendancePercent == null || attendancePercent >= 85)
  ) {
    return 'excellent';
  }

  if (
    (attendancePercent != null && attendancePercent < 85) ||
    (gradeAverage != null && gradeAverage < 70)
  ) {
    return 'warning';
  }

  return 'regular';
}

function buildStatsFromAccumulator(
  accumulator: StatsAccumulator | undefined,
  days: string[],
  gradeAverage: number | null
): StudentStats {
  const attendancePercent =
    accumulator && accumulator.total > 0
      ? Math.round((accumulator.attended / accumulator.total) * 100)
      : null;

  const attendanceCalendar = days.map((date) => ({
    date,
    status: aggregateDayStatus(accumulator?.byDate.get(date) ?? []),
  }));

  const absentDays = accumulator?.absentDays.size ?? 0;

  return {
    attendancePercent,
    gradeAverage,
    status: deriveStudentStatus(attendancePercent, gradeAverage),
    absentDays,
    attendanceCalendar,
  };
}

export async function getStudentStats(
  studentId: mongoose.Types.ObjectId,
  centerId: mongoose.Types.ObjectId
): Promise<StudentStats> {
  const map = await getStudentsStatsMap([studentId], centerId);
  const { days } = getAttendanceWindow();
  return map.get(studentId.toString()) ?? buildStatsFromAccumulator(undefined, days, null);
}

export async function getStudentsStatsMap(
  studentIds: mongoose.Types.ObjectId[],
  centerId: mongoose.Types.ObjectId
): Promise<Map<string, StudentStats>> {
  const result = new Map<string, StudentStats>();
  if (studentIds.length === 0) return result;

  const { start, end, days } = getAttendanceWindow();

  const attendanceRecords = await Attendance.find({
    studentId: { $in: studentIds },
    centerId,
    date: { $gte: start, $lte: end },
  })
    .select('studentId date status')
    .lean();

  const gradeRecords = await Grade.find({
    studentId: { $in: studentIds },
    centerId,
  })
    .select('studentId total')
    .lean();

  const attendanceByStudent = new Map<string, StatsAccumulator>();
  const gradeTotalsByStudent = new Map<string, { sum: number; count: number }>();

  for (const studentId of studentIds) {
    attendanceByStudent.set(studentId.toString(), {
      attended: 0,
      total: 0,
      absentDays: new Set<string>(),
      byDate: new Map<string, AttendanceStatus[]>(),
    });
  }

  for (const record of attendanceRecords) {
    const studentKey = record.studentId.toString();
    const accumulator = attendanceByStudent.get(studentKey);
    if (!accumulator) continue;

    accumulator.total += 1;
    if (record.status === 'present' || record.status === 'late') {
      accumulator.attended += 1;
    }

    const dateKey = formatDateKey(record.date);
    const dayStatuses = accumulator.byDate.get(dateKey) ?? [];
    dayStatuses.push(record.status);
    accumulator.byDate.set(dateKey, dayStatuses);

    if (record.status === 'absent') {
      accumulator.absentDays.add(dateKey);
    }
  }

  for (const grade of gradeRecords) {
    const studentKey = grade.studentId.toString();
    const current = gradeTotalsByStudent.get(studentKey) ?? { sum: 0, count: 0 };
    current.sum += grade.total;
    current.count += 1;
    gradeTotalsByStudent.set(studentKey, current);
  }

  for (const studentId of studentIds) {
    const studentKey = studentId.toString();
    const gradeTotals = gradeTotalsByStudent.get(studentKey);
    const gradeAverage =
      gradeTotals && gradeTotals.count > 0
        ? Math.round(gradeTotals.sum / gradeTotals.count)
        : null;

    result.set(
      studentKey,
      buildStatsFromAccumulator(attendanceByStudent.get(studentKey), days, gradeAverage)
    );
  }

  return result;
}
