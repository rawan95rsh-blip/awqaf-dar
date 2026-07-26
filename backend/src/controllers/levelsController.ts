import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Center } from '../models/Center';
import { Level } from '../models/Level';
import { Student } from '../models/Student';
import { ensureGeneralLevelsForCenter } from '../utils/centerLevels';
import { sendError, sendSuccess } from '../utils/response';
import { formatStudentListItem, type StudentWithLevel } from '../utils/studentFormat';

function formatLevel(
  level: {
    _id: mongoose.Types.ObjectId;
    fullName: string;
    shortName?: string | null;
    order: number;
    centerId: mongoose.Types.ObjectId;
  },
  studentCount: number
) {
  return {
    id: level._id.toString(),
    fullName: level.fullName,
    shortName: level.shortName,
    order: level.order,
    centerId: level.centerId.toString(),
    studentCount,
  };
}

async function getStudentCountsByLevel(
  centerId: mongoose.Types.ObjectId,
  levelIds: mongoose.Types.ObjectId[]
): Promise<Map<string, number>> {
  if (levelIds.length === 0) {
    return new Map();
  }

  const counts = await Student.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
    { $match: { centerId, levelId: { $in: levelIds } } },
    { $group: { _id: '$levelId', count: { $sum: 1 } } },
  ]);

  return new Map(counts.map((item) => [item._id.toString(), item.count]));
}

export async function getLevelsByCenter(req: Request, res: Response): Promise<void> {
  try {
    const centerId = typeof req.query.centerId === 'string' ? req.query.centerId.trim() : '';

    if (!centerId) {
      sendError(res, 'معرّف المركز مطلوب', 400);
      return;
    }

    if (!mongoose.isValidObjectId(centerId)) {
      sendError(res, 'معرّف المركز غير صالح', 400);
      return;
    }

    const center = await Center.findOne({ _id: centerId, status: 'active' });
    if (!center) {
      sendError(res, 'المركز غير موجود أو غير نشط', 404);
      return;
    }

    const levels = await Level.find({ centerId: center._id })
      .select('fullName shortName order centerId')
      .sort({ order: 1 })
      .lean();

    const levelIds = levels.map((level) => level._id);
    const countMap = await getStudentCountsByLevel(center._id, levelIds);

    sendSuccess(
      res,
      levels.map((level) =>
        formatLevel(level, countMap.get(level._id.toString()) ?? 0)
      )
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

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      sendError(res, 'معرّف المستوى غير صالح', 400);
      return;
    }

    const level = await Level.findOne({
      _id: id,
      centerId: req.user.centerId,
    })
      .select('fullName shortName order centerId')
      .lean();

    if (!level) {
      sendError(res, 'لم يُعثر على المستوى', 404);
      return;
    }

    const studentCount = await Student.countDocuments({
      levelId: level._id,
      centerId: req.user.centerId,
    });

    sendSuccess(res, formatLevel(level, studentCount));
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

    const { levelId } = req.params;
    if (!mongoose.isValidObjectId(levelId)) {
      sendError(res, 'معرّف المستوى غير صالح', 400);
      return;
    }

    const level = await Level.findOne({
      _id: levelId,
      centerId: req.user.centerId,
    });

    if (!level) {
      sendError(res, 'لم يُعثر على المستوى', 404);
      return;
    }

    const students = await Student.find({
      levelId: level._id,
      centerId: req.user.centerId,
    })
      .populate({ path: 'levelId', select: 'fullName shortName order' })
      .sort({ fullName: 1 })
      .lean();

    sendSuccess(
      res,
      students.map((student) => formatStudentListItem(student as StudentWithLevel))
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

    const { fullName, shortName, order } = req.body as {
      fullName?: string;
      shortName?: string;
      order?: number | string;
    };

    const trimmedFullName = typeof fullName === 'string' ? fullName.trim() : '';
    if (!trimmedFullName) {
      sendError(res, 'اسم المستوى مطلوب', 400);
      return;
    }

    const parsedOrder =
      typeof order === 'number' ? order : Number.parseInt(String(order ?? ''), 10);
    if (!Number.isInteger(parsedOrder) || parsedOrder < 1) {
      sendError(res, 'ترتيب المستوى يجب أن يكون رقماً صحيحاً موجباً', 400);
      return;
    }

    const trimmedShortName =
      typeof shortName === 'string' && shortName.trim() ? shortName.trim() : undefined;

    const centerId = req.user.centerId;

    const existing = await Level.findOne({ centerId, order: parsedOrder });
    if (existing) {
      sendError(res, 'يوجد مستوى بنفس الترتيب مسبقاً', 409);
      return;
    }

    const level = await Level.create({
      centerId,
      fullName: trimmedFullName,
      shortName: trimmedShortName,
      order: parsedOrder,
    });

    await ensureGeneralLevelsForCenter(centerId);

    sendSuccess(res, formatLevel(level, 0), 201);
  } catch (err) {
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code?: number }).code === 11000
    ) {
      sendError(res, 'يوجد مستوى بنفس الترتيب مسبقاً', 409);
      return;
    }
    console.error('[createLevel]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}
