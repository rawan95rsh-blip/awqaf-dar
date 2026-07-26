import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Level } from '../models/Level';
import { Session } from '../models/Session';
import { Student } from '../models/Student';
import { User } from '../models/User';
import {
  isSessionMode,
  isSessionStatus,
  normalizeZoomUrl,
  parseSessionDate,
  type SessionMode,
  type SessionStatus,
} from '../constants/sessions';
import { isValidSubjectIndex } from '../constants/subjects';
import { sendError, sendSuccess } from '../utils/response';
import { notifyUsers } from '../services/pushService';

function formatSession(
  session: {
    _id: mongoose.Types.ObjectId;
    centerId: mongoose.Types.ObjectId;
    levelId?: mongoose.Types.ObjectId | null;
    classOfferId?: mongoose.Types.ObjectId | null;
    subjectIndex: number;
    title: string;
    startAt: Date;
    endAt: Date;
    mode: string;
    zoomUrl?: string | null;
    zoomMeetingId?: string | null;
    zoomPasscode?: string | null;
    teacherName?: string | null;
    notes?: string | null;
    status: string;
    cancelReason?: string | null;
    cancelledAt?: Date | null;
    cancelledBy?: mongoose.Types.ObjectId | null;
    createdBy: mongoose.Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
  },
  options?: { studentLevelId?: mongoose.Types.ObjectId | null }
) {
  const levelId = session.levelId ? session.levelId.toString() : null;
  const studentLevelId = options?.studentLevelId?.toString() ?? null;
  const isMyLevel =
    studentLevelId != null && levelId != null && levelId === studentLevelId;

  return {
    id: session._id.toString(),
    centerId: session.centerId.toString(),
    levelId,
    classOfferId: session.classOfferId ? session.classOfferId.toString() : null,
    subjectIndex: session.subjectIndex,
    title: session.title,
    startAt: session.startAt.toISOString(),
    endAt: session.endAt.toISOString(),
    mode: session.mode,
    zoomUrl: session.zoomUrl ?? undefined,
    zoomMeetingId: session.zoomMeetingId ?? undefined,
    zoomPasscode: session.zoomPasscode ?? undefined,
    teacherName: session.teacherName ?? undefined,
    notes: session.notes ?? undefined,
    status: session.status,
    cancelReason: session.cancelReason ?? undefined,
    cancelledAt: session.cancelledAt?.toISOString() ?? undefined,
    cancelledBy: session.cancelledBy ? session.cancelledBy.toString() : undefined,
    createdBy: session.createdBy.toString(),
    createdAt: session.createdAt?.toISOString(),
    updatedAt: session.updatedAt?.toISOString(),
    ...(options?.studentLevelId !== undefined ? { isMyLevel } : {}),
  };
}

async function assertLevelInCenter(
  levelId: string,
  centerId: mongoose.Types.ObjectId
): Promise<InstanceType<typeof Level> | null> {
  if (!mongoose.isValidObjectId(levelId)) {
    return null;
  }
  return Level.findOne({ _id: levelId, centerId });
}

/** جدول الطالبة: كل حصص المركز مع تمييز حصص مستواها */
export async function listMySessions(req: Request, res: Response): Promise<void> {
  try {
    if (req.user?.role !== 'student' || !req.user.studentId || !req.user.centerId) {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const student = await Student.findOne({
      _id: req.user.studentId,
      centerId: req.user.centerId,
    }).lean();
    if (!student) {
      sendError(res, 'الطالبة غير موجودة', 404);
      return;
    }

    const filter: Record<string, unknown> = { centerId: req.user.centerId };

    const from = typeof req.query.from === 'string' ? parseSessionDate(req.query.from) : null;
    const to = typeof req.query.to === 'string' ? parseSessionDate(req.query.to) : null;
    if (req.query.from && !from) {
      sendError(res, 'تاريخ from غير صالح', 400);
      return;
    }
    if (req.query.to && !to) {
      sendError(res, 'تاريخ to غير صالح', 400);
      return;
    }
    if (from || to) {
      filter.startAt = {
        ...(from ? { $gte: from } : {}),
        ...(to ? { $lte: to } : {}),
      };
    }

    const sessions = await Session.find(filter).sort({ startAt: 1 }).lean();
    sendSuccess(
      res,
      sessions.map((session) =>
        formatSession(session, { studentLevelId: student.levelId })
      )
    );
  } catch (err) {
    console.error('[listMySessions]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

export async function listSessions(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.centerId) {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const filter: Record<string, unknown> = { centerId: req.user.centerId };

    const levelId = typeof req.query.levelId === 'string' ? req.query.levelId.trim() : '';
    if (levelId) {
      if (!mongoose.isValidObjectId(levelId)) {
        sendError(res, 'معرّف المستوى غير صالح', 400);
        return;
      }
      filter.levelId = levelId;
    }

    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    if (status) {
      if (!isSessionStatus(status)) {
        sendError(res, 'حالة الحصة غير صالحة', 400);
        return;
      }
      filter.status = status;
    }

    const from = typeof req.query.from === 'string' ? parseSessionDate(req.query.from) : null;
    const to = typeof req.query.to === 'string' ? parseSessionDate(req.query.to) : null;
    if (req.query.from && !from) {
      sendError(res, 'تاريخ from غير صالح', 400);
      return;
    }
    if (req.query.to && !to) {
      sendError(res, 'تاريخ to غير صالح', 400);
      return;
    }
    if (from || to) {
      filter.startAt = {
        ...(from ? { $gte: from } : {}),
        ...(to ? { $lte: to } : {}),
      };
    }

    const sessions = await Session.find(filter).sort({ startAt: 1 }).lean();
    sendSuccess(
      res,
      sessions.map((session) => formatSession(session))
    );
  } catch (err) {
    console.error('[listSessions]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

export async function getSessionById(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.centerId) {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      sendError(res, 'معرّف الحصة غير صالح', 400);
      return;
    }

    const session = await Session.findOne({ _id: id, centerId: req.user.centerId }).lean();
    if (!session) {
      sendError(res, 'الحصة غير موجودة', 404);
      return;
    }

    if (req.user.role === 'student') {
      if (!req.user.studentId) {
        sendError(res, 'غير مصرح', 403);
        return;
      }
      const student = await Student.findOne({
        _id: req.user.studentId,
        centerId: req.user.centerId,
      }).lean();
      if (!student) {
        sendError(res, 'الطالبة غير موجودة', 404);
        return;
      }
      sendSuccess(res, formatSession(session, { studentLevelId: student.levelId }));
      return;
    }

    sendSuccess(res, formatSession(session));
  } catch (err) {
    console.error('[getSessionById]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

export async function createSession(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.centerId || !req.user._id) {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const {
      levelId,
      subjectIndex,
      title,
      startAt,
      endAt,
      mode,
      zoomUrl,
      zoomMeetingId,
      zoomPasscode,
      teacherName,
      notes,
    } = req.body as {
      levelId?: string;
      subjectIndex?: number;
      title?: string;
      startAt?: string;
      endAt?: string;
      mode?: string;
      zoomUrl?: string;
      zoomMeetingId?: string;
      zoomPasscode?: string;
      teacherName?: string;
      notes?: string;
    };

    if (!levelId || typeof levelId !== 'string') {
      sendError(res, 'معرّف المستوى مطلوب', 400);
      return;
    }

    const level = await assertLevelInCenter(levelId, req.user.centerId);
    if (!level) {
      sendError(res, 'المستوى غير موجود في هذا المركز', 400);
      return;
    }

    if (typeof subjectIndex !== 'number' || !isValidSubjectIndex(subjectIndex)) {
      sendError(res, 'فهرس المادة غير صالح', 400);
      return;
    }

    if (!title || typeof title !== 'string' || !title.trim()) {
      sendError(res, 'عنوان الحصة مطلوب', 400);
      return;
    }
    if (title.trim().length > 200) {
      sendError(res, 'عنوان الحصة طويل جداً', 400);
      return;
    }

    const parsedStart = parseSessionDate(startAt);
    const parsedEnd = parseSessionDate(endAt);
    if (!parsedStart || !parsedEnd) {
      sendError(res, 'وقت البداية أو النهاية غير صالح', 400);
      return;
    }
    if (parsedEnd.getTime() <= parsedStart.getTime()) {
      sendError(res, 'وقت النهاية يجب أن يكون بعد وقت البداية', 400);
      return;
    }

    const sessionMode: SessionMode = mode === undefined ? 'in_person' : (mode as SessionMode);
    if (!isSessionMode(sessionMode)) {
      sendError(res, 'نوع الحصة غير صالح — حضوري أو أونلاين أو الاثنين', 400);
      return;
    }

    const normalizedZoom = normalizeZoomUrl(zoomUrl);
    if (normalizedZoom === 'invalid') {
      sendError(res, 'رابط Zoom غير صالح — يجب أن يبدأ بـ https://', 400);
      return;
    }

    if (sessionMode === 'online' && !normalizedZoom) {
      sendError(res, 'رابط Zoom مطلوب للحصص الأونلاين', 400);
      return;
    }

    const session = await Session.create({
      centerId: req.user.centerId,
      levelId: level._id,
      subjectIndex,
      title: title.trim(),
      startAt: parsedStart,
      endAt: parsedEnd,
      mode: sessionMode,
      zoomUrl: normalizedZoom,
      zoomMeetingId:
        typeof zoomMeetingId === 'string' && zoomMeetingId.trim()
          ? zoomMeetingId.trim()
          : undefined,
      zoomPasscode:
        typeof zoomPasscode === 'string' && zoomPasscode.trim()
          ? zoomPasscode.trim()
          : undefined,
      teacherName:
        typeof teacherName === 'string' && teacherName.trim()
          ? teacherName.trim()
          : undefined,
      notes: typeof notes === 'string' && notes.trim() ? notes.trim() : undefined,
      status: 'scheduled',
      createdBy: req.user._id,
    });

    sendSuccess(res, formatSession(session), 201);
  } catch (err) {
    console.error('[createSession]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

export async function updateSession(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.centerId) {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      sendError(res, 'معرّف الحصة غير صالح', 400);
      return;
    }

    const session = await Session.findOne({ _id: id, centerId: req.user.centerId });
    if (!session) {
      sendError(res, 'الحصة غير موجودة', 404);
      return;
    }

    const {
      levelId,
      subjectIndex,
      title,
      startAt,
      endAt,
      mode,
      zoomUrl,
      zoomMeetingId,
      zoomPasscode,
      teacherName,
      notes,
      status,
    } = req.body as {
      levelId?: string;
      subjectIndex?: number;
      title?: string;
      startAt?: string;
      endAt?: string;
      mode?: string;
      zoomUrl?: string | null;
      zoomMeetingId?: string | null;
      zoomPasscode?: string | null;
      teacherName?: string | null;
      notes?: string | null;
      status?: string;
    };

    if (levelId !== undefined) {
      const level = await assertLevelInCenter(levelId, req.user.centerId);
      if (!level) {
        sendError(res, 'المستوى غير موجود في هذا المركز', 400);
        return;
      }
      session.levelId = level._id;
    }

    if (subjectIndex !== undefined) {
      if (typeof subjectIndex !== 'number' || !isValidSubjectIndex(subjectIndex)) {
        sendError(res, 'فهرس المادة غير صالح', 400);
        return;
      }
      session.subjectIndex = subjectIndex;
    }

    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        sendError(res, 'عنوان الحصة مطلوب', 400);
        return;
      }
      if (title.trim().length > 200) {
        sendError(res, 'عنوان الحصة طويل جداً', 400);
        return;
      }
      session.title = title.trim();
    }

    let nextStart = session.startAt;
    let nextEnd = session.endAt;
    if (startAt !== undefined) {
      const parsedStart = parseSessionDate(startAt);
      if (!parsedStart) {
        sendError(res, 'وقت البداية غير صالح', 400);
        return;
      }
      nextStart = parsedStart;
    }
    if (endAt !== undefined) {
      const parsedEnd = parseSessionDate(endAt);
      if (!parsedEnd) {
        sendError(res, 'وقت النهاية غير صالح', 400);
        return;
      }
      nextEnd = parsedEnd;
    }
    if (nextEnd.getTime() <= nextStart.getTime()) {
      sendError(res, 'وقت النهاية يجب أن يكون بعد وقت البداية', 400);
      return;
    }
    session.startAt = nextStart;
    session.endAt = nextEnd;

    if (mode !== undefined) {
      if (!isSessionMode(mode)) {
        sendError(res, 'نوع الحصة غير صالح', 400);
        return;
      }
      session.mode = mode;
    }

    if (zoomUrl !== undefined) {
      if (zoomUrl === null || zoomUrl === '') {
        session.zoomUrl = undefined;
      } else {
        const normalizedZoom = normalizeZoomUrl(zoomUrl);
        if (normalizedZoom === 'invalid') {
          sendError(res, 'رابط Zoom غير صالح — يجب أن يبدأ بـ https://', 400);
          return;
        }
        session.zoomUrl = normalizedZoom;
      }
    }

    if (zoomMeetingId !== undefined) {
      session.zoomMeetingId =
        typeof zoomMeetingId === 'string' && zoomMeetingId.trim()
          ? zoomMeetingId.trim()
          : undefined;
    }
    if (zoomPasscode !== undefined) {
      session.zoomPasscode =
        typeof zoomPasscode === 'string' && zoomPasscode.trim()
          ? zoomPasscode.trim()
          : undefined;
    }
    if (teacherName !== undefined) {
      session.teacherName =
        typeof teacherName === 'string' && teacherName.trim()
          ? teacherName.trim()
          : undefined;
    }
    if (notes !== undefined) {
      session.notes =
        typeof notes === 'string' && notes.trim() ? notes.trim() : undefined;
    }

    if (status !== undefined) {
      if (!isSessionStatus(status)) {
        sendError(res, 'حالة الحصة غير صالحة', 400);
        return;
      }
      if (status === 'cancelled') {
        sendError(
          res,
          'لإلغاء الحصة استخدمي مسار اعتذار المعلمة POST /api/sessions/:id/cancel',
          400
        );
        return;
      }
      session.status = status as SessionStatus;
    }

    if (session.mode === 'online' && !session.zoomUrl) {
      sendError(res, 'رابط Zoom مطلوب للحصص الأونلاين', 400);
      return;
    }

    await session.save();
    sendSuccess(res, {
      ...formatSession(session),
      message: 'تم تحديث الحصة بنجاح',
    });
  } catch (err) {
    console.error('[updateSession]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

/** POST /api/sessions/:id/cancel — اعتذار المعلمة / إلغاء الحصة مع سبب */
export async function cancelSession(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.centerId || !req.user._id) {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      sendError(res, 'معرّف الحصة غير صالح', 400);
      return;
    }

    const { reason } = req.body as { reason?: string };
    if (typeof reason !== 'string' || !reason.trim()) {
      sendError(res, 'سبب الاعتذار مطلوب', 400);
      return;
    }
    const cancelReason = reason.trim();
    if (cancelReason.length < 3) {
      sendError(res, 'سبب الاعتذار قصير جداً', 400);
      return;
    }
    if (cancelReason.length > 500) {
      sendError(res, 'سبب الاعتذار طويل جداً', 400);
      return;
    }

    const session = await Session.findOne({ _id: id, centerId: req.user.centerId });
    if (!session) {
      sendError(res, 'الحصة غير موجودة', 404);
      return;
    }

    if (session.status === 'cancelled') {
      sendError(res, 'الحصة ملغاة مسبقاً', 409);
      return;
    }

    if (session.status === 'completed') {
      sendError(res, 'لا يمكن إلغاء حصة مكتملة', 400);
      return;
    }

    session.status = 'cancelled';
    session.cancelReason = cancelReason;
    session.cancelledAt = new Date();
    session.cancelledBy = req.user._id;
    await session.save();

    let notifyResult = { inboxCount: 0, pushAttempted: 0 };
    if (session.levelId) {
      const students = await Student.find({
        centerId: req.user.centerId,
        levelId: session.levelId,
      })
        .select('_id')
        .lean();
      const studentIds = students.map((s) => s._id);
      if (studentIds.length > 0) {
        const users = await User.find({
          role: 'student',
          studentId: { $in: studentIds },
          centerId: req.user.centerId,
          isActive: true,
        })
          .select('_id')
          .lean();
        notifyResult = await notifyUsers(
          users.map((u) => u._id),
          {
            type: 'session_cancelled',
            title: 'اعتذار المعلمة عن الحصة',
            body: `أُلغيت الحصة «${session.title}»: ${cancelReason}`,
            centerId: req.user.centerId,
            data: {
              sessionId: session._id.toString(),
              levelId: session.levelId.toString(),
            },
          }
        );
      }
    }

    sendSuccess(res, {
      ...formatSession(session),
      message: 'تم تسجيل اعتذار المعلمة وإلغاء الحصة',
      notifyAudience:
        session.levelId != null ? 'level_students' : 'none_no_level',
      notification: notifyResult,
    });
  } catch (err) {
    console.error('[cancelSession]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

export async function deleteSession(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.centerId) {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      sendError(res, 'معرّف الحصة غير صالح', 400);
      return;
    }

    const session = await Session.findOneAndDelete({
      _id: id,
      centerId: req.user.centerId,
    });

    if (!session) {
      sendError(res, 'الحصة غير موجودة', 404);
      return;
    }

    sendSuccess(res, {
      id: session._id.toString(),
      message: 'تم حذف الحصة بنجاح',
    });
  } catch (err) {
    console.error('[deleteSession]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}
