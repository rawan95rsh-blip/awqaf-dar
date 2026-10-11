import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Attendance, type AttendanceStatus } from '../models/Attendance';
import { Grade } from '../models/Grade';
import { Level } from '../models/Level';
import { Student } from '../models/Student';
import { SUBJECT_COUNT } from '../constants/subjects';
import { getGradeLabel } from '../constants/grades';
import { sendError, sendSuccess } from '../utils/response';
import { ACTIVE_STUDENT_FILTER } from '../utils/studentActive';

const SUBJECT_NAMES_AR = ['السيرة', 'العقيدة', 'الحديث', 'التجويد', 'القرآن', 'التفسير', 'النحو'] as const;
const MAX_REPORT_DAYS = 120;

function parseDayKey(value: unknown): Date | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return Number.isNaN(date.getTime()) ? null : date;
}

async function loadLevel(req: Request, res: Response) {
  if (!req.user?.centerId) {
    sendError(res, 'غير مصرح', 403);
    return null;
  }
  const levelId = typeof req.query.levelId === 'string' ? req.query.levelId.trim() : '';
  if (!mongoose.isValidObjectId(levelId)) {
    sendError(res, 'اختاري المستوى', 400);
    return null;
  }
  const level = await Level.findOne({ _id: levelId, centerId: req.user.centerId }).lean();
  if (!level) {
    sendError(res, 'المستوى غير موجود', 404);
    return null;
  }
  return level;
}

/**
 * كشف الدرجات الشامل للمستوى: كل الطالبات × كل المواد
 * (للمطور: كشف نهائي شامل لجميع المواد)
 */
export async function getGradesheet(req: Request, res: Response): Promise<void> {
  try {
    const level = await loadLevel(req, res);
    if (!level || !req.user?.centerId) return;

    const students = await Student.find({
      centerId: req.user.centerId,
      levelId: level._id,
      ...ACTIVE_STUDENT_FILTER,
      enrollmentStatus: { $ne: 'suspended' },
    })
      .select('fullName idNumber enrollmentStatus')
      .sort({ fullName: 1 })
      .lean();

    const grades = await Grade.find({
      centerId: req.user.centerId,
      levelId: level._id,
      studentId: { $in: students.map((s) => s._id) },
    })
      .select('studentId subjectIndex total label breakdown')
      .lean();

    const byStudent = new Map<string, Map<number, (typeof grades)[number]>>();
    for (const grade of grades) {
      const key = grade.studentId.toString();
      const map = byStudent.get(key) ?? new Map();
      map.set(grade.subjectIndex, grade);
      byStudent.set(key, map);
    }

    const rows = students.map((student, index) => {
      const map = byStudent.get(student._id.toString()) ?? new Map();
      const subjects = Array.from({ length: SUBJECT_COUNT }, (_, subjectIndex) => {
        const grade = map.get(subjectIndex);
        return grade
          ? { subjectIndex, total: grade.total, label: grade.label, breakdown: grade.breakdown }
          : null;
      });
      const recorded = subjects.filter((s): s is NonNullable<typeof s> => s !== null);
      const sum = recorded.reduce((acc, s) => acc + s.total, 0);
      const average = recorded.length ? Math.round((sum / recorded.length) * 10) / 10 : null;
      return {
        index: index + 1,
        studentId: student._id.toString(),
        fullName: student.fullName,
        idNumber: student.idNumber,
        subjects,
        recordedCount: recorded.length,
        sum,
        average,
        label: average == null ? null : getGradeLabel(average),
        complete: recorded.length === SUBJECT_COUNT,
      };
    });

    sendSuccess(res, {
      level: {
        id: level._id.toString(),
        fullName: level.fullName,
        shortName: level.shortName ?? level.fullName,
        track: level.track ?? 'mutor',
      },
      subjects: SUBJECT_NAMES_AR.map((name, subjectIndex) => ({ subjectIndex, name })),
      isFinal: (level.track ?? 'mutor') === 'mutor',
      generatedAt: new Date().toISOString(),
      rows,
    });
  } catch (err) {
    console.error('[getGradesheet]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

/** كشف الغياب: يومي / أسبوعي / شهري — حسب نطاق التاريخ */
export async function getAttendanceReport(req: Request, res: Response): Promise<void> {
  try {
    const level = await loadLevel(req, res);
    if (!level || !req.user?.centerId) return;

    const from = parseDayKey(req.query.from);
    const to = parseDayKey(req.query.to);
    if (!from || !to || to.getTime() < from.getTime()) {
      sendError(res, 'نطاق التاريخ غير صالح', 400);
      return;
    }
    const days = Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
    if (days > MAX_REPORT_DAYS) {
      sendError(res, `أقصى مدى للتقرير ${MAX_REPORT_DAYS} يوماً`, 400);
      return;
    }

    const subjectIndexRaw = typeof req.query.subjectIndex === 'string' ? req.query.subjectIndex : '';
    const subjectIndex = subjectIndexRaw === '' ? null : Number(subjectIndexRaw);

    const students = await Student.find({
      centerId: req.user.centerId,
      levelId: level._id,
      ...ACTIVE_STUDENT_FILTER,
    })
      .select('fullName idNumber enrollmentStatus')
      .sort({ fullName: 1 })
      .lean();

    const records = await Attendance.find({
      centerId: req.user.centerId,
      levelId: level._id,
      date: { $gte: from, $lte: to },
      ...(subjectIndex != null && Number.isInteger(subjectIndex) ? { subjectIndex } : {}),
    })
      .select('studentId date status subjectIndex')
      .lean();

    const dayKeys: string[] = [];
    for (let t = from.getTime(); t <= to.getTime(); t += 86400000) {
      dayKeys.push(new Date(t).toISOString().slice(0, 10));
    }

    // اليوم يُحتسب غياباً إن غابت عن أي مادة، ومتأخرة إن تأخرت
    const statusByStudentDay = new Map<string, Map<string, AttendanceStatus>>();
    const rank: Record<AttendanceStatus, number> = { present: 0, late: 1, absent: 2 };
    for (const record of records) {
      const studentKey = record.studentId.toString();
      const dayKey = record.date.toISOString().slice(0, 10);
      const map = statusByStudentDay.get(studentKey) ?? new Map<string, AttendanceStatus>();
      const prev = map.get(dayKey);
      if (!prev || rank[record.status] > rank[prev]) map.set(dayKey, record.status);
      statusByStudentDay.set(studentKey, map);
    }

    const sessionDays = dayKeys.filter((day) =>
      Array.from(statusByStudentDay.values()).some((map) => map.has(day))
    );

    const rows = students.map((student, index) => {
      const map = statusByStudentDay.get(student._id.toString()) ?? new Map();
      let present = 0;
      let absent = 0;
      let late = 0;
      const byDay: Record<string, AttendanceStatus | null> = {};
      for (const day of sessionDays) {
        const status = map.get(day) ?? null;
        byDay[day] = status;
        if (status === 'present') present += 1;
        if (status === 'absent') absent += 1;
        if (status === 'late') late += 1;
      }
      const recorded = present + absent + late;
      return {
        index: index + 1,
        studentId: student._id.toString(),
        fullName: student.fullName,
        idNumber: student.idNumber,
        enrollmentStatus: student.enrollmentStatus,
        byDay,
        present,
        absent,
        late,
        percent: recorded ? Math.round(((present + late) / recorded) * 100) : null,
      };
    });

    sendSuccess(res, {
      level: {
        id: level._id.toString(),
        fullName: level.fullName,
        shortName: level.shortName ?? level.fullName,
        track: level.track ?? 'mutor',
      },
      from: dayKeys[0],
      to: dayKeys[dayKeys.length - 1],
      days: sessionDays,
      rows,
      totals: {
        present: rows.reduce((a, r) => a + r.present, 0),
        absent: rows.reduce((a, r) => a + r.absent, 0),
        late: rows.reduce((a, r) => a + r.late, 0),
      },
    });
  } catch (err) {
    console.error('[getAttendanceReport]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}
