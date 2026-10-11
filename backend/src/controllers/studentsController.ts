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
  STUDENT_POPULATE,
  type StudentWithLevel,
} from '../utils/studentFormat';
import { getStudentStats, getStudentsStatsMap, type StudentStatusValue } from '../utils/studentStats';
import { canAccessStudentRecord, getCenterIdForStudentAccess } from '../utils/studentAccess';
import { ACTIVE_STUDENT_FILTER } from '../utils/studentActive';
import { isDigitsOnlyPassword, PASSWORD_DIGITS_ERROR_AR } from '../utils/password';
import { isStudentType } from '../constants/registration';
import { isStudentTrack, type StudentTrack } from '../constants/tracks';
import { findNextLevel } from '../utils/centerLevels';
import { isEnrollmentStatus, type EnrollmentAction, type EnrollmentStatus } from '../constants/enrollment';
import {
  parseStudentInput,
  resolvePlacement,
  storeUploadedDocuments,
  type StudentInput,
} from '../utils/studentInput';
import { deleteFileSafe } from '../utils/fileStorage';
import { DOCUMENT_KINDS } from '../models/shared';
import { escapeRegex, optionalTrimmed, paramId } from '../utils/validation';
import { notifyUsers } from '../services/pushService';

const STATUS_FILTERS: StudentStatusValue[] = ['regular', 'frequent_absence', 'warning', 'excellent'];

function historyEvent(
  action: EnrollmentAction,
  by: mongoose.Types.ObjectId | undefined,
  reason = '',
  meta: Record<string, unknown> = {}
) {
  return { action, reason, meta, by: by ?? null, at: new Date() };
}

async function loadProfile(studentId: mongoose.Types.ObjectId, centerId: mongoose.Types.ObjectId) {
  const populated = await Student.findById(studentId).populate(STUDENT_POPULATE).lean();
  const stats = await getStudentStats(studentId, centerId);
  const center = await Center.findById(centerId).select('nameAr').lean();
  const centerSummary = center ? { id: center._id.toString(), nameAr: center.nameAr } : null;
  return populated
    ? formatStudentProfile(populated as unknown as StudentWithLevel, stats, centerSummary)
    : null;
}

async function findCenterStudent(req: Request, res: Response) {
  if (!req.user?.centerId || req.user.role !== 'center_admin') {
    sendError(res, 'غير مصرح', 403);
    return null;
  }
  const id = paramId(req.params.id);
  if (!mongoose.isValidObjectId(id)) {
    sendError(res, 'معرّف الطالبة غير صالح', 400);
    return null;
  }
  const student = await Student.findOne({
    _id: id,
    centerId: req.user.centerId,
    ...ACTIVE_STUDENT_FILTER,
  });
  if (!student) {
    sendError(res, 'لم يُعثر على الطالبة', 404);
    return null;
  }
  return student;
}

export async function createStudent(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.centerId) {
      sendError(res, 'غير مصرح', 403);
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;

    // الإضافة اليدوية من المشرفة: الحقول الإضافية اختيارية
    const parsed = parseStudentInput(
      { studentType: 'new', ...body },
      { requireExtended: false }
    );
    if (!parsed.ok) {
      sendError(res, parsed.error, 400);
      return;
    }
    const input = parsed.value as StudentInput;

    const password = body.password;
    if (typeof password !== 'string' || !isDigitsOnlyPassword(password)) {
      sendError(res, PASSWORD_DIGITS_ERROR_AR, 400);
      return;
    }

    const placement = await resolvePlacement(req.user.centerId, input.track, input.levelId, input.courseIds);
    if (!placement.ok) {
      sendError(res, placement.error, 400);
      return;
    }

    const existingActive = await Student.findOne({ idNumber: input.idNumber, ...ACTIVE_STUDENT_FILTER });
    if (existingActive) {
      sendError(res, 'الرقم المدني مسجل مسبقاً في مركز', 409);
      return;
    }

    const existingUser = await User.findOne({ phone: input.phone });
    if (existingUser) {
      sendError(res, 'رقم الهاتف مسجل مسبقاً', 409);
      return;
    }

    const studentId = new mongoose.Types.ObjectId();
    const documents = await storeUploadedDocuments(req, {
      centerId: req.user.centerId.toString(),
      studentId: studentId.toString(),
    });

    const passwordHash = await bcrypt.hash(password, 10);

    const student = await Student.create({
      _id: studentId,
      fullName: input.fullName,
      idNumber: input.idNumber,
      gender: input.gender,
      nationality: input.nationality,
      academicLevel: input.academicLevel,
      track: input.track,
      trackNote: input.trackNote ?? '',
      phone: input.phone,
      dob: input.dob,
      levelId: placement.value.levelId,
      courseIds: placement.value.courseIds,
      centerId: req.user.centerId,
      occupation: input.occupation ?? null,
      occupationOther: input.occupationOther ?? '',
      studentType: input.studentType ?? 'new',
      homeAddress: input.homeAddress ?? {},
      notes: input.notes ?? '',
      documents,
      deletedAt: null,
      enrollmentStatus: 'enrolled',
      enrollmentHistory: [historyEvent('registered', req.user._id)],
    });

    const user = await User.create({
      phone: input.phone,
      passwordHash,
      role: 'student',
      centerId: req.user.centerId,
      studentId: student._id,
      isActive: true,
    });

    const profile = await loadProfile(student._id, req.user.centerId);
    sendSuccess(
      res,
      { ...(profile ?? { id: student._id.toString() }), userId: user._id.toString(), message: 'تمت إضافة الطالبة بنجاح' },
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

    const q = req.query as Record<string, unknown>;
    const search = typeof q.search === 'string' ? q.search.trim() : '';
    const levelId = typeof q.levelId === 'string' ? q.levelId.trim() : '';
    const track = typeof q.track === 'string' ? q.track.trim() : '';
    const enrollmentStatus = typeof q.enrollmentStatus === 'string' ? q.enrollmentStatus.trim() : '';
    const studentType = typeof q.studentType === 'string' ? q.studentType.trim() : '';
    const status = typeof q.status === 'string' ? q.status.trim() : '';

    const filter: Record<string, unknown> = {
      centerId: req.user.centerId,
      ...ACTIVE_STUDENT_FILTER,
    };

    if (levelId) {
      if (!mongoose.isValidObjectId(levelId)) {
        sendError(res, 'معرّف المستوى غير صالح', 400);
        return;
      }
      filter.levelId = levelId;
    }
    if (track) {
      if (!isStudentTrack(track)) {
        sendError(res, 'المسار غير صالح', 400);
        return;
      }
      filter.track = track;
    }
    if (enrollmentStatus) {
      if (!isEnrollmentStatus(enrollmentStatus)) {
        sendError(res, 'حالة القيد غير صالحة', 400);
        return;
      }
      filter.enrollmentStatus = enrollmentStatus;
    }
    if (studentType) {
      if (!isStudentType(studentType)) {
        sendError(res, 'نوع الطالبة غير صالح', 400);
        return;
      }
      filter.studentType = studentType;
    }
    if (search) {
      const escaped = escapeRegex(search);
      filter.$or = [
        { fullName: { $regex: escaped, $options: 'i' } },
        { idNumber: { $regex: escaped } },
        { phone: { $regex: escaped } },
      ];
    }

    const students = await Student.find(filter)
      .populate(STUDENT_POPULATE)
      .sort({ fullName: 1 })
      .lean();

    const statsMap = await getStudentsStatsMap(
      students.map((student) => student._id),
      req.user.centerId
    );

    let items = students.map((student) =>
      formatStudentListItem(
        student as unknown as StudentWithLevel,
        statsMap.get(student._id.toString())
      )
    );

    if (status && (STATUS_FILTERS as string[]).includes(status)) {
      items = items.filter((item) => item.status === status);
    }

    sendSuccess(res, items);
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
    }).select('_id');

    if (!student) {
      sendError(res, 'لم يُعثر على بيانات الطالبة', 404);
      return;
    }

    sendSuccess(res, await loadProfile(student._id, req.user.centerId));
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

    const id = paramId(req.params.id);
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
    }).select('_id');

    if (!student) {
      sendError(res, 'لم يُعثر على الطالبة', 404);
      return;
    }

    sendSuccess(res, await loadProfile(student._id, new mongoose.Types.ObjectId(centerId)));
  } catch (err) {
    console.error('[getStudentById]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

/** تعديل بيانات الطالبة (المشرفة) — بما فيها الملاحظات والمسار والمستوى */
export async function updateStudent(req: Request, res: Response): Promise<void> {
  try {
    const student = await findCenterStudent(req, res);
    if (!student || !req.user?.centerId) return;

    const body = (req.body ?? {}) as Record<string, unknown>;
    const parsed = parseStudentInput(body, { partial: true, requireExtended: false });
    if (!parsed.ok) {
      sendError(res, parsed.error, 400);
      return;
    }
    const input = parsed.value;

    if (input.idNumber && input.idNumber !== student.idNumber) {
      const duplicate = await Student.findOne({
        idNumber: input.idNumber,
        _id: { $ne: student._id },
        ...ACTIVE_STUDENT_FILTER,
      });
      if (duplicate) {
        sendError(res, 'الرقم المدني مسجل لطالبة أخرى', 409);
        return;
      }
      student.idNumber = input.idNumber;
    }

    if (input.phone && input.phone !== student.phone) {
      const duplicateUser = await User.findOne({ phone: input.phone, studentId: { $ne: student._id } });
      if (duplicateUser) {
        sendError(res, 'رقم الهاتف مسجل لحساب آخر', 409);
        return;
      }
      student.phone = input.phone;
      await User.updateOne({ studentId: student._id, role: 'student' }, { $set: { phone: input.phone } });
    }

    const nextTrack = (input.track ?? student.track ?? 'mutor') as StudentTrack;
    const trackOrPlacementChanged =
      input.track !== undefined || input.levelId !== undefined || input.courseIds !== undefined;

    if (trackOrPlacementChanged) {
      const placement = await resolvePlacement(
        req.user.centerId,
        nextTrack,
        input.levelId !== undefined ? input.levelId : student.levelId?.toString() ?? null,
        input.courseIds ?? (student.courseIds ?? []).map((id) => id.toString())
      );
      if (!placement.ok) {
        sendError(res, placement.error, 400);
        return;
      }
      const previousLevel = student.levelId?.toString() ?? null;
      const nextLevel = placement.value.levelId?.toString() ?? null;
      if (previousLevel !== nextLevel) {
        student.enrollmentHistory.push(
          historyEvent('level_changed', req.user._id, '', { from: previousLevel, to: nextLevel })
        );
      }
      student.track = nextTrack;
      student.levelId = placement.value.levelId;
      student.set('courseIds', placement.value.courseIds);
    }

    if (input.fullName) student.fullName = input.fullName;
    if (input.nationality) student.nationality = input.nationality;
    if (input.academicLevel) student.academicLevel = input.academicLevel;
    if (input.dob) student.dob = input.dob;
    if (input.trackNote !== undefined) student.trackNote = input.trackNote;
    if (input.occupation) {
      student.occupation = input.occupation;
      student.occupationOther = input.occupationOther ?? '';
    }
    if (input.studentType) student.studentType = input.studentType;
    if (input.homeAddress) student.set('homeAddress', input.homeAddress);
    if (input.notes !== undefined) student.notes = input.notes;

    // مرفقات جديدة تستبدل القديمة
    const uploaded = await storeUploadedDocuments(req, {
      centerId: req.user.centerId.toString(),
      studentId: student._id.toString(),
    });
    for (const kind of DOCUMENT_KINDS) {
      const newId = uploaded[kind];
      if (!newId) continue;
      const previous = student.documents?.[kind];
      student.set(`documents.${kind}`, newId);
      await deleteFileSafe(previous ?? null);
    }

    await student.save();

    sendSuccess(res, {
      ...(await loadProfile(student._id, req.user.centerId)),
      message: 'تم حفظ بيانات الطالبة',
    });
  } catch (err) {
    console.error('[updateStudent]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

/** وقف قيد الطالبة — مع سبب يُحفظ في السجل */
export async function suspendStudent(req: Request, res: Response): Promise<void> {
  try {
    const student = await findCenterStudent(req, res);
    if (!student || !req.user?.centerId) return;

    const reason = optionalTrimmed(req.body?.reason, 500);
    if (!reason) {
      sendError(res, 'اكتبي سبب وقف القيد', 400);
      return;
    }
    if (student.enrollmentStatus === 'suspended') {
      sendError(res, 'قيد الطالبة موقوف مسبقاً', 409);
      return;
    }

    student.enrollmentStatus = 'suspended';
    student.enrollmentHistory.push(historyEvent('suspended', req.user._id, reason));
    await student.save();

    sendSuccess(res, {
      ...(await loadProfile(student._id, req.user.centerId)),
      message: 'تم وقف قيد الطالبة',
    });
  } catch (err) {
    console.error('[suspendStudent]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

/** إعادة قيد طالبة موقوفة أو خريجة — يمكن اختيار مستوى جديد */
export async function reinstateStudent(req: Request, res: Response): Promise<void> {
  try {
    const student = await findCenterStudent(req, res);
    if (!student || !req.user?.centerId) return;

    if (student.enrollmentStatus === 'enrolled') {
      sendError(res, 'الطالبة مسجّلة حالياً', 409);
      return;
    }

    const reason = optionalTrimmed(req.body?.reason, 500) ?? '';
    const levelIdRaw = typeof req.body?.levelId === 'string' ? req.body.levelId.trim() : '';
    if (levelIdRaw) {
      if (!mongoose.isValidObjectId(levelIdRaw)) {
        sendError(res, 'معرّف المستوى غير صالح', 400);
        return;
      }
      const level = await Level.findOne({ _id: levelIdRaw, centerId: req.user.centerId });
      if (!level) {
        sendError(res, 'المستوى غير موجود في هذا المركز', 400);
        return;
      }
      student.levelId = level._id;
      student.track = (level.track ?? 'mutor') as StudentTrack;
    }

    student.enrollmentStatus = 'enrolled';
    student.enrollmentHistory.push(
      historyEvent('reinstated', req.user._id, reason, levelIdRaw ? { levelId: levelIdRaw } : {})
    );
    await student.save();

    const user = await User.findOne({ studentId: student._id, role: 'student' }).select('_id');
    if (user) {
      await notifyUsers([user._id], {
        type: 'enrollment_updated',
        title: 'تمت إعادة قيدكِ',
        body: 'أعاد المركز تفعيل قيدكِ — يمكنكِ متابعة دروسكِ الآن.',
        centerId: req.user.centerId,
        data: { studentId: student._id.toString() },
      });
    }

    sendSuccess(res, {
      ...(await loadProfile(student._id, req.user.centerId)),
      message: 'تمت إعادة قيد الطالبة',
    });
  } catch (err) {
    console.error('[reinstateStudent]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

export async function updateStudentEnrollmentStatus(req: Request, res: Response): Promise<void> {
  try {
    const student = await findCenterStudent(req, res);
    if (!student || !req.user?.centerId) return;

    const { enrollmentStatus, reason } = req.body as { enrollmentStatus?: string; reason?: string };
    if (!isEnrollmentStatus(enrollmentStatus)) {
      sendError(res, 'حالة القيد غير صالحة — مسجّلة أو خريجة أو موقوفة', 400);
      return;
    }

    if (student.enrollmentStatus !== enrollmentStatus) {
      const action: EnrollmentAction =
        enrollmentStatus === 'graduated'
          ? 'graduated'
          : enrollmentStatus === 'suspended'
            ? 'suspended'
            : 'reinstated';
      student.enrollmentStatus = enrollmentStatus as EnrollmentStatus;
      student.enrollmentHistory.push(historyEvent(action, req.user._id, optionalTrimmed(reason) ?? ''));
      await student.save();
    }

    sendSuccess(res, {
      ...(await loadProfile(student._id, req.user.centerId)),
      message: 'تم تحديث حالة القيد',
    });
  } catch (err) {
    console.error('[updateStudentEnrollmentStatus]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

/** ترقية يدوية للمستوى التالي — تمهيدي سادس ← مطور أول */
export async function promoteStudent(req: Request, res: Response): Promise<void> {
  try {
    const student = await findCenterStudent(req, res);
    if (!student || !req.user?.centerId) return;

    if (student.enrollmentStatus !== 'enrolled') {
      sendError(res, 'لا يمكن ترقية طالبة غير مسجّلة حالياً', 400);
      return;
    }
    if (!student.levelId) {
      sendError(res, 'الطالبة غير مرتبطة بمستوى — عدّلي مسارها أولاً', 400);
      return;
    }

    const currentLevel = await Level.findOne({ _id: student.levelId, centerId: req.user.centerId });
    if (!currentLevel) {
      sendError(res, 'مستوى الطالبة غير موجود', 400);
      return;
    }

    const nextLevel = await findNextLevel(req.user.centerId, currentLevel);
    if (!nextLevel) {
      sendError(res, 'الطالبة في أعلى مستوى مطور — يمكن تعيينها خريجة', 400);
      return;
    }

    student.levelId = nextLevel._id;
    student.track = (nextLevel.track ?? 'mutor') as StudentTrack;
    student.enrollmentHistory.push(
      historyEvent('promoted', req.user._id, '', {
        from: currentLevel.shortName || currentLevel.fullName,
        to: nextLevel.shortName || nextLevel.fullName,
      })
    );
    await student.save();

    sendSuccess(res, {
      ...(await loadProfile(student._id, req.user.centerId)),
      message: `تمت الترقية إلى ${nextLevel.shortName || nextLevel.fullName}`,
    });
  } catch (err) {
    console.error('[promoteStudent]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}
