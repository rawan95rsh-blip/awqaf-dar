import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { Level } from '../models/Level';
import { Center } from '../models/Center';
import { Student } from '../models/Student';
import { User } from '../models/User';
import { sendError, sendSuccess } from '../utils/response';
import {
  formatStudentListItem,
  formatStudentProfile,
  type StudentWithLevel,
} from '../utils/studentFormat';
import { getStudentStats, getStudentsStatsMap } from '../utils/studentStats';
import { canAccessStudentRecord, getCenterIdForStudentAccess } from '../utils/studentAccess';
import { ACTIVE_STUDENT_FILTER } from '../utils/studentActive';
import {
  isDigitsOnlyPassword,
  PASSWORD_DIGITS_ERROR_AR,
} from '../utils/password';
import {
  isValidAcademicLevel,
  isValidNationality,
} from '../constants/registration';
import { isStudentGender } from '../constants/genderAudience';
import { isClassTrack } from '../constants/classOffers';
import {
  MUTOR_LEVEL_ORDER_MAX,
  PREPARATORY_LEVEL_ORDER,
} from '../utils/centerLevels';
import {
  isKuwaitCivilId,
  KUWAIT_CIVIL_ID_ERROR_AR,
  KUWAIT_CIVIL_ID_LABEL_AR,
  normalizeIdNumber,
} from '../utils/idNumber';
import {
  isEnrollmentStatus,
  type EnrollmentStatus,
} from '../constants/enrollment';

function normalizePhone(phone: string): string {
  return phone.trim().replace(/\s/g, '');
}

function parseDob(dob: unknown): Date | null {
  if (typeof dob !== 'string' || !dob.trim()) {
    return null;
  }
  const parsed = new Date(dob);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

export async function createStudent(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.centerId) {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const {
      fullName,
      idNumber,
      gender,
      nationality,
      academicLevel,
      track,
      phone,
      password,
      dob,
      levelId,
    } = req.body as {
      fullName?: string;
      idNumber?: string;
      gender?: string;
      nationality?: string;
      academicLevel?: string;
      track?: string;
      phone?: string;
      password?: string;
      dob?: string;
      levelId?: string;
    };

    if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
      sendError(res, 'الاسم الكامل مطلوب', 400);
      return;
    }

    if (!idNumber || typeof idNumber !== 'string') {
      sendError(res, `${KUWAIT_CIVIL_ID_LABEL_AR} مطلوب`, 400);
      return;
    }

    const normalizedIdNumber = normalizeIdNumber(idNumber);
    if (!isKuwaitCivilId(normalizedIdNumber)) {
      sendError(res, KUWAIT_CIVIL_ID_ERROR_AR, 400);
      return;
    }

    if (!isStudentGender(gender)) {
      sendError(res, 'الجنس مطلوب — اختاري ذكر أو أنثى', 400);
      return;
    }

    if (!nationality || typeof nationality !== 'string' || !isValidNationality(nationality)) {
      sendError(res, 'الجنسية غير صالحة', 400);
      return;
    }

    if (
      !academicLevel ||
      typeof academicLevel !== 'string' ||
      !isValidAcademicLevel(academicLevel)
    ) {
      sendError(res, 'المستوى الدراسي غير صالح', 400);
      return;
    }

    const resolvedTrack =
      track && typeof track === 'string' && isClassTrack(track) ? track : 'mutor';

    if (!phone || typeof phone !== 'string') {
      sendError(res, 'رقم الهاتف مطلوب', 400);
      return;
    }

    const normalizedPhone = normalizePhone(phone);
    if (!/^\d{10}$/.test(normalizedPhone)) {
      sendError(res, 'رقم الهاتف يجب أن يكون 10 أرقام', 400);
      return;
    }

    if (!password || typeof password !== 'string') {
      sendError(res, 'كلمة المرور مطلوبة', 400);
      return;
    }

    if (!isDigitsOnlyPassword(password)) {
      sendError(res, PASSWORD_DIGITS_ERROR_AR, 400);
      return;
    }

    const parsedDob = parseDob(dob);
    if (!parsedDob) {
      sendError(res, 'تاريخ الميلاد غير صالح', 400);
      return;
    }

    const existingActive = await Student.findOne({
      idNumber: normalizedIdNumber,
      ...ACTIVE_STUDENT_FILTER,
    });
    if (existingActive) {
      sendError(res, 'رقم الهوية المدنية مسجل مسبقاً في مركز نشط', 409);
      return;
    }

    const existingUser = await User.findOne({ phone: normalizedPhone });
    if (existingUser) {
      sendError(res, 'رقم الهاتف مسجل مسبقاً', 409);
      return;
    }

    let level;
    if (levelId && typeof levelId === 'string') {
      if (!mongoose.isValidObjectId(levelId)) {
        sendError(res, 'معرّف المستوى غير صالح', 400);
        return;
      }
      level = await Level.findOne({
        _id: levelId,
        centerId: req.user.centerId,
      });
      if (!level) {
        sendError(res, 'المستوى غير موجود في هذا المركز', 400);
        return;
      }
    } else {
      level = await Level.findOne({
        centerId: req.user.centerId,
        order: PREPARATORY_LEVEL_ORDER,
      });
      if (!level) {
        sendError(
          res,
          'المستوى التمهيدي غير متوفر — أنشئي المستويات الافتراضية أولاً',
          400
        );
        return;
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const student = await Student.create({
      fullName: fullName.trim(),
      idNumber: normalizedIdNumber,
      gender,
      nationality,
      academicLevel,
      track: resolvedTrack,
      phone: normalizedPhone,
      dob: parsedDob,
      levelId: level._id,
      centerId: req.user.centerId,
      deletedAt: null,
      enrollmentStatus: 'enrolled',
    });

    const user = await User.create({
      phone: normalizedPhone,
      passwordHash,
      role: 'student',
      centerId: req.user.centerId,
      studentId: student._id,
      isActive: true,
    });

    const populated = await Student.findById(student._id)
      .populate({ path: 'levelId', select: 'fullName shortName order' })
      .lean();

    sendSuccess(
      res,
      {
        ...(populated
          ? formatStudentListItem(populated as StudentWithLevel)
          : { id: student._id.toString() }),
        userId: user._id.toString(),
        message: 'تم إنشاء الطالبة بنجاح',
      },
      201
    );
  } catch (err) {
    console.error('[createStudent]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

export async function listStudents(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.centerId) {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const search =
      typeof req.query.search === 'string' && req.query.search.trim()
        ? req.query.search.trim()
        : '';
    const levelId =
      typeof req.query.levelId === 'string' && req.query.levelId.trim()
        ? req.query.levelId.trim()
        : '';

    if (levelId && !mongoose.isValidObjectId(levelId)) {
      sendError(res, 'معرّف المستوى غير صالح', 400);
      return;
    }

    if (levelId) {
      const level = await Level.findOne({
        _id: levelId,
        centerId: req.user.centerId,
      });
      if (!level) {
        sendError(res, 'المستوى غير موجود في هذا المركز', 404);
        return;
      }
    }

    const filter: Record<string, unknown> = {
      centerId: req.user.centerId,
      ...ACTIVE_STUDENT_FILTER,
    };

    if (levelId) {
      filter.levelId = levelId;
    }

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { fullName: { $regex: escaped, $options: 'i' } },
        { idNumber: { $regex: escaped } },
      ];
    }

    const students = await Student.find(filter)
      .populate({ path: 'levelId', select: 'fullName shortName order' })
      .sort({ fullName: 1 })
      .lean();

    const studentIds = students.map((student) => student._id);
    const statsMap = await getStudentsStatsMap(studentIds, req.user.centerId);

    sendSuccess(
      res,
      students.map((student) =>
        formatStudentListItem(
          student as StudentWithLevel,
          statsMap.get(student._id.toString())
        )
      )
    );
  } catch (err) {
    console.error('[listStudents]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

export async function getCurrentStudent(req: Request, res: Response): Promise<void> {
  try {
    if (req.user?.role !== 'student' || !req.user.studentId || !req.user.centerId) {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const student = await Student.findOne({
      _id: req.user.studentId,
      centerId: req.user.centerId,
      ...ACTIVE_STUDENT_FILTER,
    })
      .populate({ path: 'levelId', select: 'fullName shortName order' })
      .lean();

    if (!student) {
      sendError(res, 'لم يُعثر على بيانات الطالبة', 404);
      return;
    }

    const stats = await getStudentStats(student._id, req.user.centerId);

    const center = await Center.findById(req.user.centerId).select('nameAr').lean();
    const centerSummary = center
      ? { id: center._id.toString(), nameAr: center.nameAr }
      : null;

    sendSuccess(
      res,
      formatStudentProfile(student as StudentWithLevel, stats, centerSummary)
    );
  } catch (err) {
    console.error('[getCurrentStudent]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

export async function getStudentById(req: Request, res: Response): Promise<void> {
  try {
    const centerId = getCenterIdForStudentAccess(req);
    if (!centerId) {
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
      centerId,
      ...ACTIVE_STUDENT_FILTER,
    })
      .populate({ path: 'levelId', select: 'fullName shortName order' })
      .lean();

    if (!student) {
      sendError(res, 'لم يُعثر على الطالبة', 404);
      return;
    }

    const stats = await getStudentStats(
      student._id,
      new mongoose.Types.ObjectId(centerId)
    );

    const center = await Center.findById(centerId).select('nameAr').lean();
    const centerSummary = center
      ? { id: center._id.toString(), nameAr: center.nameAr }
      : null;

    sendSuccess(
      res,
      formatStudentProfile(student as StudentWithLevel, stats, centerSummary)
    );
  } catch (err) {
    console.error('[getStudentById]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

export async function updateStudentEnrollmentStatus(
  req: Request,
  res: Response
): Promise<void> {
  try {
    if (!req.user?.centerId || req.user.role !== 'center_admin') {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      sendError(res, 'معرّف الطالبة غير صالح', 400);
      return;
    }

    const { enrollmentStatus } = req.body as { enrollmentStatus?: string };
    if (!enrollmentStatus || !isEnrollmentStatus(enrollmentStatus)) {
      sendError(
        res,
        'حالة القيد غير صالحة — اختاري مسجّلة أو خريجة أو موقوف القيد',
        400
      );
      return;
    }

    const student = await Student.findOne({
      _id: id,
      centerId: req.user.centerId,
      ...ACTIVE_STUDENT_FILTER,
    });
    if (!student) {
      sendError(res, 'لم يُعثر على الطالبة', 404);
      return;
    }

    student.enrollmentStatus = enrollmentStatus as EnrollmentStatus;
    await student.save();

    const populated = await Student.findById(student._id)
      .populate({ path: 'levelId', select: 'fullName shortName order' })
      .lean();

    const stats = await getStudentStats(student._id, req.user.centerId);
    const center = await Center.findById(req.user.centerId).select('nameAr').lean();
    const centerSummary = center
      ? { id: center._id.toString(), nameAr: center.nameAr }
      : null;

    sendSuccess(res, {
      ...(populated
        ? formatStudentProfile(populated as StudentWithLevel, stats, centerSummary)
        : { id: student._id.toString(), enrollmentStatus }),
      message: 'تم تحديث حالة القيد',
    });
  } catch (err) {
    console.error('[updateStudentEnrollmentStatus]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

/** ترقية يدوية لمسار المطور — المستوى التالي (ترم ≈ 3 أشهر؛ بدون أتمتة) */
export async function promoteStudent(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.centerId || req.user.role !== 'center_admin') {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      sendError(res, 'معرّف الطالبة غير صالح', 400);
      return;
    }

    const student = await Student.findOne({
      _id: id,
      centerId: req.user.centerId,
      ...ACTIVE_STUDENT_FILTER,
    });
    if (!student) {
      sendError(res, 'لم يُعثر على الطالبة', 404);
      return;
    }

    if ((student.track ?? 'mutor') !== 'mutor') {
      sendError(res, 'الترقية للمستوى التالي متاحة لمسار المطور فقط', 400);
      return;
    }

    if (student.enrollmentStatus !== 'enrolled') {
      sendError(res, 'لا يمكن ترقية طالبة غير مسجّلة حالياً', 400);
      return;
    }

    const currentLevel = await Level.findOne({
      _id: student.levelId,
      centerId: req.user.centerId,
    });
    if (!currentLevel) {
      sendError(res, 'مستوى الطالبة غير موجود', 400);
      return;
    }

    if (currentLevel.order >= MUTOR_LEVEL_ORDER_MAX) {
      sendError(
        res,
        'الطالبة في أعلى مستوى مطور — عيّني حالة القيد إلى خريجة إن اكتمل المسار',
        400
      );
      return;
    }

    const nextLevel = await Level.findOne({
      centerId: req.user.centerId,
      order: currentLevel.order + 1,
    });
    if (!nextLevel) {
      sendError(res, 'المستوى التالي غير متوفر في المركز', 400);
      return;
    }

    student.levelId = nextLevel._id;
    await student.save();

    const populated = await Student.findById(student._id)
      .populate({ path: 'levelId', select: 'fullName shortName order' })
      .lean();

    const stats = await getStudentStats(student._id, req.user.centerId);
    const center = await Center.findById(req.user.centerId).select('nameAr').lean();
    const centerSummary = center
      ? { id: center._id.toString(), nameAr: center.nameAr }
      : null;

    sendSuccess(res, {
      ...(populated
        ? formatStudentProfile(populated as StudentWithLevel, stats, centerSummary)
        : { id: student._id.toString(), levelId: nextLevel._id.toString() }),
      message: `تمت الترقية إلى ${nextLevel.fullName}`,
    });
  } catch (err) {
    console.error('[promoteStudent]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}
