import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { isValidSubjectIndex } from '../constants/subjects';
import { Level } from '../models/Level';
import { Student } from '../models/Student';
import {
  ATTENDANCE_STATUSES,
  Attendance,
  type AttendanceStatus,
} from '../models/Attendance';
import { sendError, sendSuccess } from '../utils/response';
import { getStudentStats } from '../utils/studentStats';
import { canAccessStudentRecord } from '../utils/studentAccess';

function parseDateParam(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function isFutureDate(date: Date): boolean {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return date.getTime() > today.getTime();
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isAttendanceStatus(value: string): value is AttendanceStatus {
  return (ATTENDANCE_STATUSES as readonly string[]).includes(value);
}

async function getCenterLevel(levelId: string, centerId: mongoose.Types.ObjectId) {
  if (!mongoose.isValidObjectId(levelId)) {
    return null;
  }

  return Level.findOne({ _id: levelId, centerId });
}

export async function getAttendance(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.centerId) {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const levelId =
      typeof req.query.levelId === 'string' && req.query.levelId.trim()
        ? req.query.levelId.trim()
        : '';
    const dateParam =
      typeof req.query.date === 'string' && req.query.date.trim()
        ? req.query.date.trim()
        : '';
    const subjectIndexRaw =
      typeof req.query.subjectIndex === 'string' ? req.query.subjectIndex.trim() : '';

    if (!levelId) {
      sendError(res, 'معرّف المستوى مطلوب', 400);
      return;
    }

    if (!dateParam) {
      sendError(res, 'التاريخ مطلوب', 400);
      return;
    }

    if (subjectIndexRaw === '') {
      sendError(res, 'معرّف المادة مطلوب', 400);
      return;
    }

    const subjectIndex = Number(subjectIndexRaw);
    if (!Number.isInteger(subjectIndex) || !isValidSubjectIndex(subjectIndex)) {
      sendError(res, 'معرّف المادة غير صالح', 400);
      return;
    }

    const parsedDate = parseDateParam(dateParam);
    if (!parsedDate) {
      sendError(res, 'صيغة التاريخ غير صالحة', 400);
      return;
    }

    if (isFutureDate(parsedDate)) {
      sendError(res, 'لا يمكن تسجيل تحضير لتاريخ مستقبلي', 400);
      return;
    }

    const level = await getCenterLevel(levelId, req.user.centerId);
    if (!level) {
      sendError(res, 'المستوى غير موجود في هذا المركز', 404);
      return;
    }

    const records = await Attendance.find({
      centerId: req.user.centerId,
      levelId: level._id,
      subjectIndex,
      date: parsedDate,
    })
      .select('studentId status')
      .lean();

    sendSuccess(res, {
      levelId: level._id.toString(),
      subjectIndex,
      date: formatDate(parsedDate),
      records: records.map((record) => ({
        studentId: record.studentId.toString(),
        status: record.status,
      })),
    });
  } catch (err) {
    console.error('[getAttendance]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

export async function saveAttendanceBulk(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.centerId) {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const { levelId, subjectIndex, date, records } = req.body as {
      levelId?: string;
      subjectIndex?: number;
      date?: string;
      records?: Array<{ studentId?: string; status?: string }>;
    };

    if (!levelId || typeof levelId !== 'string') {
      sendError(res, 'معرّف المستوى مطلوب', 400);
      return;
    }

    if (!Number.isInteger(subjectIndex) || !isValidSubjectIndex(subjectIndex!)) {
      sendError(res, 'معرّف المادة غير صالح', 400);
      return;
    }

    if (!date || typeof date !== 'string') {
      sendError(res, 'التاريخ مطلوب', 400);
      return;
    }

    if (!Array.isArray(records) || records.length === 0) {
      sendError(res, 'يجب إرسال سجل تحضير واحد على الأقل', 400);
      return;
    }

    const parsedDate = parseDateParam(date.trim());
    if (!parsedDate) {
      sendError(res, 'صيغة التاريخ غير صالحة', 400);
      return;
    }

    if (isFutureDate(parsedDate)) {
      sendError(res, 'لا يمكن تسجيل تحضير لتاريخ مستقبلي', 400);
      return;
    }

    const level = await getCenterLevel(levelId, req.user.centerId);
    if (!level) {
      sendError(res, 'المستوى غير موجود في هذا المركز', 404);
      return;
    }

    const studentIds = records.map((record) => record.studentId?.trim()).filter(Boolean) as string[];
    const uniqueStudentIds = [...new Set(studentIds)];

    if (uniqueStudentIds.length !== records.length) {
      sendError(res, 'يوجد تكرار أو معرّف طالبة مفقود في السجلات', 400);
      return;
    }

    for (const studentId of uniqueStudentIds) {
      if (!mongoose.isValidObjectId(studentId)) {
        sendError(res, 'معرّف الطالبة غير صالح', 400);
        return;
      }
    }

    for (const record of records) {
      if (!record.status || !isAttendanceStatus(record.status)) {
        sendError(res, 'حالة التحضير غير صالحة', 400);
        return;
      }
    }

    const students = await Student.find({
      _id: { $in: uniqueStudentIds },
      centerId: req.user.centerId,
      levelId: level._id,
    }).select('_id');

    if (students.length !== uniqueStudentIds.length) {
      sendError(res, 'إحدى الطالبات ليست في هذا المستوى', 400);
      return;
    }

    const validSubjectIndex = subjectIndex as number;
    const centerId = req.user.centerId;
    const recordedBy = req.user._id;

    const bulkOps = records.map((record) => {
      const status = record.status as AttendanceStatus;
      return {
        updateOne: {
          filter: {
            studentId: new mongoose.Types.ObjectId(record.studentId),
            levelId: level._id,
            subjectIndex: validSubjectIndex,
            date: parsedDate,
          },
          update: {
            $set: {
              centerId,
              status,
              recordedBy,
            },
          },
          upsert: true,
        },
      };
    });

    await Attendance.bulkWrite(bulkOps);

    sendSuccess(res, {
      levelId: level._id.toString(),
      subjectIndex,
      date: formatDate(parsedDate),
      savedCount: records.length,
      message: 'تم حفظ التحضير بنجاح',
    });
  } catch (err) {
    console.error('[saveAttendanceBulk]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

export async function getStudentAttendance(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.centerId) {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      sendError(res, 'معرّف الطالبة غير صالح', 400);
      return;
    }

    if (!canAccessStudentRecord(req, id)) {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const student = await Student.findOne({
      _id: id,
      centerId: req.user.centerId,
    }).select('_id');

    if (!student) {
      sendError(res, 'لم يُعثر على الطالبة', 404);
      return;
    }

    const stats = await getStudentStats(student._id, req.user.centerId);

    sendSuccess(res, {
      studentId: student._id.toString(),
      attendancePercent: stats.attendancePercent,
      absentDays: stats.absentDays,
      calendar: stats.attendanceCalendar,
    });
  } catch (err) {
    console.error('[getStudentAttendance]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}
