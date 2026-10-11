import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Center } from '../models/Center';
import { Level } from '../models/Level';
import { Student } from '../models/Student';
import { sendError, sendSuccess } from '../utils/response';
import {
  formatStudentListItem,
  STUDENT_POPULATE,
  type StudentWithLevel,
} from '../utils/studentFormat';
import { getStudentsStatsMap } from '../utils/studentStats';
import { ACTIVE_STUDENT_FILTER } from '../utils/studentActive';
import { isLevelTrack } from '../constants/tracks';
import { optionalTrimmed, paramId } from '../utils/validation';

type LevelLean = {
  _id: mongoose.Types.ObjectId;
  fullName: string;
  shortName?: string | null;
  order: number;
  track?: string | null;
  centerId: mongoose.Types.ObjectId;
};

function formatLevel(level: LevelLean, studentCount: number) {
  return {
    id: level._id.toString(),
    fullName: level.fullName,
    shortName: level.shortName ?? level.fullName,
    order: level.order,
    track: level.track ?? 'mutor',
    centerId: level.centerId.toString(),
    studentCount,
  };
}

const TRACK_SORT: Record<string, number> = { preparatory: 0, mutor: 1 };

function sortLevels<T extends { track?: string | null; order: number }>(levels: T[]): T[] {
  return [...levels].sort(
    (a, b) =>
      (TRACK_SORT[a.track ?? 'mutor'] ?? 9) - (TRACK_SORT[b.track ?? 'mutor'] ?? 9) ||
      a.order - b.order
  );
}

async function getStudentCountsByLevel(
  centerId: mongoose.Types.ObjectId,
  levelIds: mongoose.Types.ObjectId[]
): Promise<Map<string, number>> {
  if (levelIds.length === 0) return new Map();

  const counts = await Student.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
    {
      $match: {
        centerId,
        levelId: { $in: levelIds },
        deletedAt: null,
        enrollmentStatus: 'enrolled',
      },
    },
    { $group: { _id: '$levelId', count: { $sum: 1 } } },
  ]);

  return new Map(counts.map((item) => [item._id.toString(), item.count]));
}

/** عام: يُستخدم في صفحة تسجيل الطالبات لعرض مستويات المركز */
export async function getLevelsByCenter(req: Request, res: Response): Promise<void> {
  try {
    const centerId = typeof req.query.centerId === 'string' ? req.query.centerId.trim() : '';
    const track = typeof req.query.track === 'string' ? req.query.track.trim() : '';

    if (!centerId || !mongoose.isValidObjectId(centerId)) {
      sendError(res, 'معرّف المركز غير صالح', 400);
      return;
    }

    const center = await Center.findOne({ _id: centerId, status: 'active' });
    if (!center) {
      sendError(res, 'المركز غير موجود أو غير نشط', 404);
      return;
    }

    const filter: Record<string, unknown> = { centerId: center._id };
    if (track) {
      if (!isLevelTrack(track)) {
        sendError(res, 'المسار غير صالح', 400);
        return;
      }
      filter.track = track;
    }

    const levels = sortLevels(
      (await Level.find(filter).select('fullName shortName order track centerId').lean()) as LevelLean[]
    );

    const countMap = await getStudentCountsByLevel(
      center._id,
      levels.map((level) => level._id)
    );

    sendSuccess(
      res,
      levels.map((level) => formatLevel(level, countMap.get(level._id.toString()) ?? 0))
    );
  } catch (err) {
    console.error('[getLevelsByCenter]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

export async function getLevelById(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.centerId) {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const id = paramId(req.params.id);
    if (!mongoose.isValidObjectId(id)) {
      sendError(res, 'معرّف المستوى غير صالح', 400);
      return;
    }

    const level = (await Level.findOne({ _id: id, centerId: req.user.centerId })
      .select('fullName shortName order track centerId')
      .lean()) as LevelLean | null;

    if (!level) {
      sendError(res, 'لم يُعثر على المستوى', 404);
      return;
    }

    const counts = await getStudentCountsByLevel(req.user.centerId, [level._id]);
    sendSuccess(res, formatLevel(level, counts.get(level._id.toString()) ?? 0));
  } catch (err) {
    console.error('[getLevelById]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

export async function getLevelStudents(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.centerId) {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const levelId = paramId(req.params.levelId);
    if (!mongoose.isValidObjectId(levelId)) {
      sendError(res, 'معرّف المستوى غير صالح', 400);
      return;
    }

    const level = await Level.findOne({ _id: levelId, centerId: req.user.centerId });
    if (!level) {
      sendError(res, 'لم يُعثر على المستوى', 404);
      return;
    }

    const includeInactive = req.query.includeInactive === 'true';
    const students = await Student.find({
      levelId: level._id,
      centerId: req.user.centerId,
      ...ACTIVE_STUDENT_FILTER,
      ...(includeInactive ? {} : { enrollmentStatus: 'enrolled' }),
    })
      .populate(STUDENT_POPULATE)
      .sort({ fullName: 1 })
      .lean();

    const statsMap = await getStudentsStatsMap(
      students.map((student) => student._id),
      req.user.centerId
    );

    sendSuccess(
      res,
      students.map((student) =>
        formatStudentListItem(
          student as unknown as StudentWithLevel,
          statsMap.get(student._id.toString())
        )
      )
    );
  } catch (err) {
    console.error('[getLevelStudents]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

export async function createLevel(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.centerId) {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const { fullName, shortName, order, track } = req.body as {
      fullName?: string;
      shortName?: string;
      order?: number | string;
      track?: string;
    };

    const trimmedFullName = optionalTrimmed(fullName, 120);
    if (!trimmedFullName) {
      sendError(res, 'اسم المستوى مطلوب', 400);
      return;
    }

    const levelTrack = isLevelTrack(track) ? track : 'mutor';
    const parsedOrder =
      typeof order === 'number' ? order : Number.parseInt(String(order ?? ''), 10);
    if (!Number.isInteger(parsedOrder) || parsedOrder < 1) {
      sendError(res, 'ترتيب المستوى يجب أن يكون رقماً صحيحاً موجباً', 400);
      return;
    }

    const centerId = req.user.centerId;
    const existing = await Level.findOne({ centerId, track: levelTrack, order: parsedOrder });
    if (existing) {
      sendError(res, 'يوجد مستوى بنفس الترتيب في هذا المسار', 409);
      return;
    }

    const level = await Level.create({
      centerId,
      track: levelTrack,
      fullName: trimmedFullName,
      shortName: optionalTrimmed(shortName, 60),
      order: parsedOrder,
    });

    sendSuccess(res, formatLevel(level.toObject() as LevelLean, 0), 201);
  } catch (err) {
    if ((err as { code?: number })?.code === 11000) {
      sendError(res, 'يوجد مستوى بنفس الترتيب في هذا المسار', 409);
      return;
    }
    console.error('[createLevel]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}
