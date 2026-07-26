import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import {
  isStudentCheckInStatus,
  isWithinSessionCheckInWindow,
  mapCheckInToAttendanceStatus,
} from '../constants/sessionAttendance';
import { Attendance, type AttendanceStatus } from '../models/Attendance';
import { Session } from '../models/Session';
import { Student } from '../models/Student';
import { sendError, sendSuccess } from '../utils/response';

async function getSessionForCenter(sessionId: string, centerId: mongoose.Types.ObjectId) {
  if (!mongoose.isValidObjectId(sessionId)) {
    return null;
  }
  return Session.findOne({ _id: sessionId, centerId }).lean();
}

/** تاريخ كشف التحضير (UTC) من وقت بداية الحصة */
function sessionSheetDate(startAt: Date): Date {
  return new Date(
    Date.UTC(startAt.getUTCFullYear(), startAt.getUTCMonth(), startAt.getUTCDate())
  );
}

function attendanceStatusLabel(status: AttendanceStatus): string {
  const labels: Record<AttendanceStatus, string> = {
    present: 'حاضرة',
    absent: 'غائبة',
    late: 'متأخرة',
  };
  return labels[status];
}

/** GET /api/sessions/:id/attendance/me — حالة الطالبة في كشف التحضير لهذه الحصة */
export async function getMySessionAttendance(req: Request, res: Response): Promise<void> {
  try {
    if (req.user?.role !== 'student' || !req.user.studentId || !req.user.centerId) {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const sessionId = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
    if (!sessionId) {
      sendError(res, 'معرّف الحصة مطلوب', 400);
      return;
    }

    const session = await getSessionForCenter(sessionId, req.user.centerId);
    if (!session) {
      sendError(res, 'الحصة غير موجودة', 404);
      return;
    }

    if (!session.levelId) {
      sendSuccess(res, {
        sessionId: session._id.toString(),
        status: null,
        checkedInAt: null,
        canCheckIn: false,
        checkInMessage: 'هذه الحصة غير مرتبطة بمستوى — التسجيل الذاتي غير متاح',
        allowedCheckInStatuses: [],
      });
      return;
    }

    const sheetDate = sessionSheetDate(session.startAt);
    const record = await Attendance.findOne({
      studentId: req.user.studentId,
      levelId: session.levelId,
      subjectIndex: session.subjectIndex,
      date: sheetDate,
      centerId: req.user.centerId,
    }).lean();

    const canCheckIn =
      !record &&
      session.status === 'scheduled' &&
      isWithinSessionCheckInWindow(session.startAt, session.endAt);

    let checkInMessage: string | undefined;
    if (record) {
      checkInMessage = `تم تسجيل حضورك: ${attendanceStatusLabel(record.status)}`;
    } else if (session.status !== 'scheduled') {
      checkInMessage = 'الحصة غير متاحة للتسجيل';
    } else if (!isWithinSessionCheckInWindow(session.startAt, session.endAt)) {
      checkInMessage = 'التسجيل متاح قبل الحصة بـ 15 دقيقة وحتى نهايتها';
    }

    sendSuccess(res, {
      sessionId: session._id.toString(),
      status: record?.status ?? null,
      checkedInAt: record?.updatedAt?.toISOString() ?? null,
      canCheckIn,
      checkInMessage,
      allowedCheckInStatuses: canCheckIn ? (['present'] as const) : [],
    });
  } catch (err) {
    console.error('[getMySessionAttendance]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

/** POST /api/sessions/:id/check-in — تسجيل ذاتي في كشف التحضير */
export async function checkInToSession(req: Request, res: Response): Promise<void> {
  try {
    if (req.user?.role !== 'student' || !req.user.studentId || !req.user.centerId) {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const sessionId = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
    if (!sessionId) {
      sendError(res, 'معرّف الحصة مطلوب', 400);
      return;
    }

    const { status } = req.body as { status?: string };

    if (!isStudentCheckInStatus(status)) {
      sendError(res, 'اختي حالة حضور صالحة (حاضرة)', 400);
      return;
    }

    const session = await getSessionForCenter(sessionId, req.user.centerId);
    if (!session) {
      sendError(res, 'الحصة غير موجودة', 404);
      return;
    }

    if (!session.levelId) {
      sendError(res, 'لا يمكن التسجيل — الحصة غير مرتبطة بمستوى', 400);
      return;
    }

    if (session.status !== 'scheduled') {
      sendError(res, 'لا يمكن التسجيل لهذه الحصة', 400);
      return;
    }

    if (!isWithinSessionCheckInWindow(session.startAt, session.endAt)) {
      sendError(res, 'التسجيل متاح قبل الحصة بـ 15 دقيقة وحتى نهايتها', 400);
      return;
    }

    const student = await Student.findOne({
      _id: req.user.studentId,
      centerId: req.user.centerId,
      levelId: session.levelId,
    }).lean();
    if (!student) {
      sendError(res, 'أنتِ غير مسجّلة في مستوى هذه الحصة', 403);
      return;
    }

    const sheetDate = sessionSheetDate(session.startAt);
    const attendanceStatus = mapCheckInToAttendanceStatus(status);

    const existing = await Attendance.findOne({
      studentId: req.user.studentId,
      levelId: session.levelId,
      subjectIndex: session.subjectIndex,
      date: sheetDate,
    }).lean();
    if (existing) {
      sendError(res, 'تم تسجيل حضورك مسبقاً لهذه الحصة', 409);
      return;
    }

    const record = await Attendance.create({
      studentId: req.user.studentId,
      levelId: session.levelId,
      centerId: req.user.centerId,
      subjectIndex: session.subjectIndex,
      date: sheetDate,
      status: attendanceStatus,
      recordedBy: req.user._id,
    });

    sendSuccess(res, {
      sessionId: session._id.toString(),
      studentId: req.user.studentId.toString(),
      status: record.status,
      checkedInAt: record.updatedAt?.toISOString(),
      message: 'تم تسجيل حضورك في كشف التحضير',
    });
  } catch (err) {
    console.error('[checkInToSession]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}
