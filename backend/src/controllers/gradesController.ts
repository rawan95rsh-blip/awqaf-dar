import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import {
  calculateGradeTotal,
  getGradeLabel,
  type GradeBreakdown,
} from '../constants/grades';
import { isValidSubjectIndex } from '../constants/subjects';
import { Grade } from '../models/Grade';
import { Level } from '../models/Level';
import { Student } from '../models/Student';
import { sendError, sendSuccess } from '../utils/response';
import { canAccessStudentRecord } from '../utils/studentAccess';
import {
  getCenterGradeWeights,
  validateBreakdownAgainstWeights,
} from '../utils/gradeWeights';

type GradeRecordResponse = {
  studentId: string;
  breakdown: GradeBreakdown;
  total: number;
  label: string;
};

function formatGradeRecord(record: {
  studentId: mongoose.Types.ObjectId;
  breakdown: GradeBreakdown;
  total: number;
  label: string;
}): GradeRecordResponse {
  return {
    studentId: record.studentId.toString(),
    breakdown: record.breakdown,
    total: record.total,
    label: record.label,
  };
}

async function getCenterLevel(levelId: string, centerId: mongoose.Types.ObjectId) {
  if (!mongoose.isValidObjectId(levelId)) {
    return null;
  }

  return Level.findOne({ _id: levelId, centerId });
}

function parseBreakdown(value: unknown): GradeBreakdown | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const fields = ['attendance', 'shortExam', 'participation', 'final'] as const;
  const breakdown: Partial<GradeBreakdown> = {};

  for (const field of fields) {
    const score = raw[field];
    if (typeof score !== 'number' || !Number.isFinite(score)) {
      return null;
    }
    breakdown[field] = score;
  }

  return breakdown as GradeBreakdown;
}

export async function getGrades(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.centerId) {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const levelId =
      typeof req.query.levelId === 'string' && req.query.levelId.trim()
        ? req.query.levelId.trim()
        : '';
    const subjectIndexRaw =
      typeof req.query.subjectIndex === 'string' ? req.query.subjectIndex.trim() : '';

    if (!levelId) {
      sendError(res, 'معرّف المستوى مطلوب', 400);
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

    const level = await getCenterLevel(levelId, req.user.centerId);
    if (!level) {
      sendError(res, 'المستوى غير موجود في هذا المركز', 404);
      return;
    }

    const records = await Grade.find({
      centerId: req.user.centerId,
      levelId: level._id,
      subjectIndex,
    })
      .select('studentId breakdown total label')
      .lean();

    sendSuccess(res, {
      levelId: level._id.toString(),
      subjectIndex,
      records: records.map((record) => formatGradeRecord(record)),
    });
  } catch (err) {
    console.error('[getGrades]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

export async function saveGradesBulk(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.centerId) {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const { levelId, subjectIndex, records } = req.body as {
      levelId?: string;
      subjectIndex?: number;
      records?: Array<{ studentId?: string; breakdown?: unknown }>;
    };

    if (!levelId || typeof levelId !== 'string') {
      sendError(res, 'معرّف المستوى مطلوب', 400);
      return;
    }

    if (!Number.isInteger(subjectIndex) || !isValidSubjectIndex(subjectIndex!)) {
      sendError(res, 'معرّف المادة غير صالح', 400);
      return;
    }

    if (!Array.isArray(records) || records.length === 0) {
      sendError(res, 'يجب إرسال درجة واحدة على الأقل', 400);
      return;
    }

    const level = await getCenterLevel(levelId, req.user.centerId);
    if (!level) {
      sendError(res, 'المستوى غير موجود في هذا المركز', 404);
      return;
    }

    const gradeWeights = await getCenterGradeWeights(req.user.centerId);

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

    const parsedRecords: Array<{ studentId: string; breakdown: GradeBreakdown }> = [];

    for (const record of records) {
      const breakdown = parseBreakdown(record.breakdown);
      if (!breakdown) {
        sendError(res, 'تفاصيل الدرجة غير صالحة', 400);
        return;
      }

      const breakdownError = validateBreakdownAgainstWeights(breakdown, gradeWeights);
      if (breakdownError) {
        sendError(res, breakdownError, 400);
        return;
      }

      parsedRecords.push({
        studentId: record.studentId!.trim(),
        breakdown,
      });
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

    const bulkOps = parsedRecords.map((record) => {
      const total = calculateGradeTotal(record.breakdown);
      const label = getGradeLabel(total);

      return {
        updateOne: {
          filter: {
            studentId: new mongoose.Types.ObjectId(record.studentId),
            levelId: level._id,
            subjectIndex: validSubjectIndex,
          },
          update: {
            $set: {
              centerId,
              breakdown: record.breakdown,
              total,
              label,
              recordedBy,
            },
          },
          upsert: true,
        },
      };
    });

    await Grade.bulkWrite(bulkOps);

    sendSuccess(res, {
      levelId: level._id.toString(),
      subjectIndex: validSubjectIndex,
      savedCount: parsedRecords.length,
      message: 'تم حفظ الدرجات بنجاح',
    });
  } catch (err) {
    console.error('[saveGradesBulk]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

export async function getStudentGrades(req: Request, res: Response): Promise<void> {
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
    }).select('_id levelId');

    if (!student) {
      sendError(res, 'لم يُعثر على الطالبة', 404);
      return;
    }

    const grades = await Grade.find({
      centerId: req.user.centerId,
      studentId: student._id,
    })
      .select('subjectIndex levelId breakdown total label')
      .sort({ subjectIndex: 1 })
      .lean();

    sendSuccess(res, {
      studentId: student._id.toString(),
      levelId: student.levelId.toString(),
      grades: grades.map((grade) => ({
        subjectIndex: grade.subjectIndex,
        levelId: grade.levelId.toString(),
        breakdown: grade.breakdown,
        total: grade.total,
        label: grade.label,
      })),
    });
  } catch (err) {
    console.error('[getStudentGrades]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}
