import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import {
  isClassTrack,
  isMutorLevelOrder,
  nextOccurrence,
  parseTimeHHMM,
  WEEKDAY_LABELS_AR,
  type ClassTrack,
} from '../constants/classOffers';
import { SUBJECT_COUNT } from '../constants/subjects';
import { ClassOffer } from '../models/ClassOffer';
import { Level } from '../models/Level';
import { Session } from '../models/Session';
import type { GradeWeights } from '../constants/grades';
import { sendError, sendSuccess } from '../utils/response';

const SUBJECT_NAMES_AR = [
  'السيرة',
  'العقيدة',
  'الحديث',
  'التجويد',
  'القران',
  'التفسير',
  'النحو',
] as const;

function resolveSubjectIndex(subjectName: string): number {
  const trimmed = subjectName.trim();
  const exact = SUBJECT_NAMES_AR.findIndex((name) => name === trimmed);
  if (exact >= 0) return exact;
  const partial = SUBJECT_NAMES_AR.findIndex(
    (name) => trimmed.includes(name) || name.includes(trimmed)
  );
  return partial >= 0 ? partial : 0;
}

function parseClassGradeWeights(raw: unknown): GradeWeights | null {
  if (!raw || typeof raw !== 'object') return null;
  const weights = raw as Record<string, unknown>;
  const fields = ['attendance', 'shortExam', 'participation', 'final'] as const;
  const normalized: GradeWeights = {
    attendance: 0,
    shortExam: 0,
    participation: 0,
    final: 0,
  };
  for (const field of fields) {
    const value = weights[field];
    if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
      return null;
    }
    if (value < 0 || value > 100) return null;
    normalized[field] = value;
  }
  const total =
    normalized.attendance +
    normalized.shortExam +
    normalized.participation +
    normalized.final;
  if (total !== 100) return null;
  return normalized;
}

function formatClassOffer(
  offer: {
    _id: mongoose.Types.ObjectId;
    centerId: mongoose.Types.ObjectId;
    track: string;
    levelId?: mongoose.Types.ObjectId | null;
    subjectName: string;
    subjectIndex: number;
    mode: string;
    weekday: number;
    startTime: string;
    endTime: string;
    teacherName: string;
    gradeWeights: GradeWeights;
    createdBy: mongoose.Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
  },
  extras?: { levelLabel?: string | null; nextSessionId?: string | null }
) {
  return {
    id: offer._id.toString(),
    centerId: offer.centerId.toString(),
    track: offer.track,
    levelId: offer.levelId ? offer.levelId.toString() : null,
    levelLabel: extras?.levelLabel ?? null,
    subjectName: offer.subjectName,
    subjectIndex: offer.subjectIndex,
    mode: offer.mode,
    weekday: offer.weekday,
    weekdayLabel: WEEKDAY_LABELS_AR[offer.weekday] ?? String(offer.weekday),
    startTime: offer.startTime,
    endTime: offer.endTime,
    teacherName: offer.teacherName,
    gradeWeights: {
      attendance: offer.gradeWeights.attendance,
      shortExam: offer.gradeWeights.shortExam,
      participation: offer.gradeWeights.participation,
      final: offer.gradeWeights.final,
    },
    nextSessionId: extras?.nextSessionId ?? null,
    createdBy: offer.createdBy.toString(),
    createdAt: offer.createdAt?.toISOString(),
    updatedAt: offer.updatedAt?.toISOString(),
  };
}

async function resolveLevelLabel(
  levelId: mongoose.Types.ObjectId | null | undefined
): Promise<string | null> {
  if (!levelId) return null;
  const level = await Level.findById(levelId).select('shortName fullName').lean();
  if (!level) return null;
  return level.shortName || level.fullName || null;
}

async function latestSessionIdForOffer(
  classOfferId: mongoose.Types.ObjectId
): Promise<string | null> {
  const session = await Session.findOne({ classOfferId })
    .sort({ startAt: 1 })
    .select('_id')
    .lean();
  return session?._id.toString() ?? null;
}

export async function listClassOffers(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.centerId) {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const filter: Record<string, unknown> = { centerId: req.user.centerId };

    const track = typeof req.query.track === 'string' ? req.query.track.trim() : '';
    if (track) {
      if (!isClassTrack(track)) {
        sendError(res, 'نوع الفصل غير صالح', 400);
        return;
      }
      filter.track = track;
    }

    const levelId = typeof req.query.levelId === 'string' ? req.query.levelId.trim() : '';
    if (levelId) {
      if (!mongoose.isValidObjectId(levelId)) {
        sendError(res, 'معرّف المستوى غير صالح', 400);
        return;
      }
      filter.levelId = levelId;
      filter.track = 'mutor';
    }

    const offers = await ClassOffer.find(filter).sort({ createdAt: -1 }).lean();
    const payload = await Promise.all(
      offers.map(async (offer) =>
        formatClassOffer(offer, {
          levelLabel: await resolveLevelLabel(offer.levelId),
          nextSessionId: await latestSessionIdForOffer(offer._id),
        })
      )
    );
    sendSuccess(res, payload);
  } catch (err) {
    console.error('[listClassOffers]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

export async function getClassOfferById(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.centerId) {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      sendError(res, 'معرّف الفصل غير صالح', 400);
      return;
    }

    const offer = await ClassOffer.findOne({ _id: id, centerId: req.user.centerId }).lean();
    if (!offer) {
      sendError(res, 'الفصل غير موجود', 404);
      return;
    }

    sendSuccess(
      res,
      formatClassOffer(offer, {
        levelLabel: await resolveLevelLabel(offer.levelId),
        nextSessionId: await latestSessionIdForOffer(offer._id),
      })
    );
  } catch (err) {
    console.error('[getClassOfferById]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

export async function createClassOffer(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.centerId || !req.user._id) {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const {
      track,
      levelId,
      subjectName,
      mode,
      weekday,
      startTime,
      endTime,
      teacherName,
      gradeWeights,
    } = req.body as {
      track?: string;
      levelId?: string | null;
      subjectName?: string;
      mode?: string;
      weekday?: number;
      startTime?: string;
      endTime?: string;
      teacherName?: string;
      gradeWeights?: unknown;
    };

    if (!track || !isClassTrack(track)) {
      sendError(res, 'نوع الفصل مطلوب — مطور أو دورة', 400);
      return;
    }

    if (!subjectName || typeof subjectName !== 'string' || !subjectName.trim()) {
      sendError(res, 'اسم المادة مطلوب', 400);
      return;
    }

    if (mode !== 'in_person' && mode !== 'online') {
      sendError(res, 'الوضع يجب أن يكون حضوري أو أونلاين', 400);
      return;
    }

    if (typeof weekday !== 'number' || !Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
      sendError(res, 'يوم الأسبوع غير صالح', 400);
      return;
    }

    const parsedStart = parseTimeHHMM(startTime);
    const parsedEnd = parseTimeHHMM(endTime);
    if (!parsedStart || !parsedEnd) {
      sendError(res, 'صيغة الوقت غير صالحة — استخدمي مثل 10:00', 400);
      return;
    }

    if (!teacherName || typeof teacherName !== 'string' || !teacherName.trim()) {
      sendError(res, 'اسم المعلمة مطلوب', 400);
      return;
    }

    const weights = parseClassGradeWeights(gradeWeights);
    if (!weights) {
      sendError(res, 'أوزان الدرجات غير صالحة — المجموع يجب أن يساوي 100', 400);
      return;
    }

    let levelObjectId: mongoose.Types.ObjectId | null = null;
    let levelLabel: string | null = null;

    if (track === 'mutor') {
      if (!levelId || typeof levelId !== 'string' || !mongoose.isValidObjectId(levelId)) {
        sendError(res, 'فصل المطور يتطلب اختيار مستوى مطور (١–٨)', 400);
        return;
      }
      const level = await Level.findOne({ _id: levelId, centerId: req.user.centerId });
      if (!level) {
        sendError(res, 'المستوى غير موجود في هذا المركز', 400);
        return;
      }
      if (!isMutorLevelOrder(level.order)) {
        sendError(res, 'يجب اختيار مستوى مطور من ١ إلى ٨', 400);
        return;
      }
      levelObjectId = level._id;
      levelLabel = level.shortName || level.fullName;
    } else if (levelId) {
      sendError(res, 'فصل الدورة لا يُربط بمستوى', 400);
      return;
    }

    const subjectIndex = resolveSubjectIndex(subjectName);
    if (subjectIndex < 0 || subjectIndex >= SUBJECT_COUNT) {
      sendError(res, 'فهرس المادة غير صالح', 400);
      return;
    }

    const offer = await ClassOffer.create({
      centerId: req.user.centerId,
      track: track as ClassTrack,
      levelId: levelObjectId,
      subjectName: subjectName.trim(),
      subjectIndex,
      mode,
      weekday,
      startTime: parsedStart.formatted,
      endTime: parsedEnd.formatted,
      teacherName: teacherName.trim(),
      gradeWeights: weights,
      createdBy: req.user._id,
    });

    const { startAt, endAt } = nextOccurrence(weekday, parsedStart, parsedEnd);
    const trackLabel = track === 'mutor' ? 'مطور' : 'دورة';
    const session = await Session.create({
      centerId: req.user.centerId,
      levelId: levelObjectId,
      classOfferId: offer._id,
      subjectIndex,
      title: `${subjectName.trim()} — ${trackLabel}`,
      startAt,
      endAt,
      mode,
      teacherName: teacherName.trim(),
      notes: `فصل ${trackLabel} | ${WEEKDAY_LABELS_AR[weekday]} | ${parsedStart.formatted}–${parsedEnd.formatted}`,
      status: 'scheduled',
      createdBy: req.user._id,
    });

    sendSuccess(
      res,
      formatClassOffer(offer, {
        levelLabel,
        nextSessionId: session._id.toString(),
      }),
      201
    );
  } catch (err) {
    console.error('[createClassOffer]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

export async function deleteClassOffer(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.centerId) {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      sendError(res, 'معرّف الفصل غير صالح', 400);
      return;
    }

    const offer = await ClassOffer.findOneAndDelete({
      _id: id,
      centerId: req.user.centerId,
    });
    if (!offer) {
      sendError(res, 'الفصل غير موجود', 404);
      return;
    }

    await Session.deleteMany({ classOfferId: offer._id, centerId: req.user.centerId });

    sendSuccess(res, {
      id: offer._id.toString(),
      message: 'تم حذف الفصل وحصصه المرتبطة',
    });
  } catch (err) {
    console.error('[deleteClassOffer]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}
