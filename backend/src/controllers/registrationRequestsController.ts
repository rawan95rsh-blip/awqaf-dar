import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { Center } from '../models/Center';
import { RegistrationRequest } from '../models/RegistrationRequest';
import { Student } from '../models/Student';
import { User } from '../models/User';
import { Level } from '../models/Level';
import { Course } from '../models/Course';
import { sendError, sendSuccess } from '../utils/response';
import { notifyUsers } from '../services/pushService';
import { isGenderCompatibleWithCenter } from '../constants/genderAudience';
import { isStudentTrack, type StudentTrack } from '../constants/tracks';
import { isDigitsOnlyPassword, PASSWORD_DIGITS_ERROR_AR } from '../utils/password';
import { formatPhoneForDisplay } from '../utils/phone';
import {
  missingRequiredDocuments,
  parseStudentInput,
  resolvePlacement,
  storeUploadedDocuments,
  type StudentInput,
} from '../utils/studentInput';
import { deleteFileSafe, updateFilesMetadata } from '../utils/fileStorage';
import { DOCUMENT_LABELS_AR } from '../models/shared';
import { paramId } from '../utils/validation';

type RequestLean = {
  _id: mongoose.Types.ObjectId;
  fullName: string;
  idNumber: string;
  gender: string;
  nationality: string;
  academicLevel: string;
  track: string;
  trackNote?: string | null;
  phone: string;
  dob: Date;
  centerId: mongoose.Types.ObjectId;
  requestedLevelId?: mongoose.Types.ObjectId | null;
  courseIds?: mongoose.Types.ObjectId[] | null;
  occupation?: string | null;
  occupationOther?: string | null;
  studentType?: string | null;
  homeAddress?: {
    area?: string | null;
    block?: string | null;
    street?: string | null;
    avenue?: string | null;
    house?: string | null;
  } | null;
  notes?: string | null;
  documents?: {
    civilId?: mongoose.Types.ObjectId | null;
    photo?: mongoose.Types.ObjectId | null;
    qualification?: mongoose.Types.ObjectId | null;
  } | null;
  status: string;
  rejectionReason?: string | null;
  studentId?: mongoose.Types.ObjectId | null;
  createdAt?: Date;
};

function fileEntry(id: mongoose.Types.ObjectId | null | undefined) {
  return id ? { id: id.toString(), url: `/api/files/${id.toString()}` } : null;
}

function formatRequest(
  request: RequestLean,
  lookups?: { levelNames?: Map<string, string>; courseNames?: Map<string, string> }
) {
  const levelId = request.requestedLevelId?.toString() ?? null;
  return {
    id: request._id.toString(),
    fullName: request.fullName,
    idNumber: request.idNumber,
    gender: request.gender,
    nationality: request.nationality,
    academicLevel: request.academicLevel,
    track: request.track,
    trackNote: request.trackNote ?? '',
    phone: request.phone,
    phoneDisplay: formatPhoneForDisplay(request.phone),
    dob: request.dob.toISOString().slice(0, 10),
    centerId: request.centerId.toString(),
    requestedLevelId: levelId,
    requestedLevelName: levelId ? lookups?.levelNames?.get(levelId) ?? '' : '',
    courses: (request.courseIds ?? []).map((id) => ({
      id: id.toString(),
      name: lookups?.courseNames?.get(id.toString()) ?? '',
    })),
    occupation: request.occupation ?? null,
    occupationOther: request.occupationOther ?? '',
    studentType: request.studentType ?? 'new',
    homeAddress: {
      area: request.homeAddress?.area ?? '',
      block: request.homeAddress?.block ?? '',
      street: request.homeAddress?.street ?? '',
      avenue: request.homeAddress?.avenue ?? '',
      house: request.homeAddress?.house ?? '',
    },
    notes: request.notes ?? '',
    documents: {
      civilId: fileEntry(request.documents?.civilId),
      photo: fileEntry(request.documents?.photo),
      qualification: fileEntry(request.documents?.qualification),
    },
    status: request.status,
    rejectionReason: request.rejectionReason ?? undefined,
    studentId: request.studentId?.toString(),
    createdAt: request.createdAt?.toISOString(),
  };
}

async function buildLookups(requests: RequestLean[]) {
  const levelIds = requests.map((r) => r.requestedLevelId).filter(Boolean);
  const courseIds = requests.flatMap((r) => r.courseIds ?? []);
  const [levels, courses] = await Promise.all([
    levelIds.length
      ? Level.find({ _id: { $in: levelIds } }).select('fullName shortName').lean()
      : Promise.resolve([]),
    courseIds.length
      ? Course.find({ _id: { $in: courseIds } }).select('name').lean()
      : Promise.resolve([]),
  ]);
  return {
    levelNames: new Map(levels.map((l) => [l._id.toString(), l.shortName || l.fullName])),
    courseNames: new Map(courses.map((c) => [c._id.toString(), c.name])),
  };
}

export async function submitRegistrationRequest(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as Record<string, unknown>;
  try {
    const parsed = parseStudentInput(body, { requireExtended: true });
    if (!parsed.ok) {
      sendError(res, parsed.error, 400);
      return;
    }
    const input = parsed.value as StudentInput;

    const password = body.password;
    if (typeof password !== 'string' || !password) {
      sendError(res, 'كلمة المرور مطلوبة', 400);
      return;
    }
    if (!isDigitsOnlyPassword(password)) {
      sendError(res, PASSWORD_DIGITS_ERROR_AR, 400);
      return;
    }

    const centerId = typeof body.centerId === 'string' ? body.centerId.trim() : '';
    if (!mongoose.isValidObjectId(centerId)) {
      sendError(res, 'اختاري المركز', 400);
      return;
    }
    const center = await Center.findOne({ _id: centerId, status: 'active' });
    if (!center) {
      sendError(res, 'المركز غير متاح', 400);
      return;
    }

    if (!isGenderCompatibleWithCenter(input.gender, center.genderAudience)) {
      sendError(
        res,
        input.gender === 'female'
          ? 'هذا المركز رجالي — اختاري مركزاً نسائياً'
          : 'هذا المركز نسائي — اختر مركزاً رجالياً',
        400
      );
      return;
    }

    const placement = await resolvePlacement(center._id, input.track, input.levelId, input.courseIds);
    if (!placement.ok) {
      sendError(res, placement.error, 400);
      return;
    }

    const existingStudent = await Student.findOne({ idNumber: input.idNumber, deletedAt: null });
    if (existingStudent) {
      sendError(
        res,
        'الرقم المدني مسجل مسبقاً في مركز — لا يمكن التسجيل في مركز آخر إلا بطلب نقل',
        409
      );
      return;
    }

    const pendingRequest = await RegistrationRequest.findOne({
      idNumber: input.idNumber,
      status: 'pending',
    });
    if (pendingRequest) {
      sendError(res, 'يوجد طلب تسجيل قيد المراجعة لهذا الرقم المدني', 409);
      return;
    }

    const existingUser = await User.findOne({ phone: input.phone });
    if (existingUser) {
      sendError(res, 'رقم الهاتف مسجل مسبقاً', 409);
      return;
    }

    const requestId = new mongoose.Types.ObjectId();
    const documents = await storeUploadedDocuments(req, {
      centerId: center._id.toString(),
      registrationRequestId: requestId.toString(),
    });

    const missing = missingRequiredDocuments(documents, input.academicLevel);
    if (missing.length) {
      await Promise.all(Object.values(documents).map((id) => deleteFileSafe(id)));
      sendError(res, `المرفقات المطلوبة: ${missing.map((k) => DOCUMENT_LABELS_AR[k]).join('، ')}`, 400);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const request = await RegistrationRequest.create({
      _id: requestId,
      fullName: input.fullName,
      idNumber: input.idNumber,
      gender: input.gender,
      nationality: input.nationality,
      academicLevel: input.academicLevel,
      track: input.track,
      trackNote: input.trackNote,
      phone: input.phone,
      dob: input.dob,
      passwordHash,
      centerId: center._id,
      requestedLevelId: placement.value.levelId,
      courseIds: placement.value.courseIds,
      occupation: input.occupation,
      occupationOther: input.occupationOther,
      studentType: input.studentType,
      homeAddress: input.homeAddress,
      notes: input.notes,
      documents,
      status: 'pending',
    });

    sendSuccess(
      res,
      {
        id: request._id.toString(),
        message: 'تم إرسال طلب التسجيل — بانتظار موافقة المركز',
        status: request.status,
      },
      201
    );
  } catch (err) {
    console.error('[submitRegistrationRequest]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

export async function listRegistrationRequests(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.centerId) {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const status =
      typeof req.query.status === 'string' && req.query.status.trim()
        ? req.query.status.trim()
        : 'pending';

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      sendError(res, 'حالة الطلب غير صالحة', 400);
      return;
    }

    const requests = (await RegistrationRequest.find({
      centerId: req.user.centerId,
      status: status as 'pending' | 'approved' | 'rejected',
    })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean()) as unknown as RequestLean[];

    const lookups = await buildLookups(requests);
    sendSuccess(res, requests.map((request) => formatRequest(request, lookups)));
  } catch (err) {
    console.error('[listRegistrationRequests]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

export async function getRegistrationRequest(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.centerId) {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const id = paramId(req.params.id);
    if (!mongoose.isValidObjectId(id)) {
      sendError(res, 'معرّف الطلب غير صالح', 400);
      return;
    }

    const request = (await RegistrationRequest.findOne({
      _id: id,
      centerId: req.user.centerId,
    }).lean()) as unknown as RequestLean | null;

    if (!request) {
      sendError(res, 'لم يُعثر على الطلب', 404);
      return;
    }

    const lookups = await buildLookups([request]);
    sendSuccess(res, formatRequest(request, lookups));
  } catch (err) {
    console.error('[getRegistrationRequest]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

export async function approveRegistrationRequest(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.centerId) {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const id = paramId(req.params.id);
    if (!mongoose.isValidObjectId(id)) {
      sendError(res, 'معرّف الطلب غير صالح', 400);
      return;
    }

    const request = await RegistrationRequest.findOne({
      _id: id,
      centerId: req.user.centerId,
    });

    if (!request) {
      sendError(res, 'لم يُعثر على الطلب', 404);
      return;
    }

    if (request.status !== 'pending') {
      sendError(res, 'تمت معالجة هذا الطلب مسبقاً', 409);
      return;
    }

    // يمكن للمشرفة تعديل المسار/المستوى عند القبول
    const body = (req.body ?? {}) as Record<string, unknown>;
    const track: StudentTrack = isStudentTrack(body.track)
      ? body.track
      : ((request.track ?? 'mutor') as StudentTrack);
    const levelId =
      typeof body.levelId === 'string' && body.levelId.trim()
        ? body.levelId.trim()
        : request.requestedLevelId?.toString() ?? null;

    const placement = await resolvePlacement(
      request.centerId,
      track,
      levelId,
      (request.courseIds ?? []).map((cid) => cid.toString())
    );
    if (!placement.ok) {
      sendError(res, placement.error, 400);
      return;
    }

    const existingStudent = await Student.findOne({ idNumber: request.idNumber, deletedAt: null });
    if (existingStudent) {
      sendError(res, 'الرقم المدني مسجل مسبقاً في مركز', 409);
      return;
    }

    const existingUser = await User.findOne({ phone: request.phone });
    if (existingUser) {
      sendError(res, 'رقم الهاتف مسجل مسبقاً', 409);
      return;
    }

    const student = await Student.create({
      fullName: request.fullName,
      idNumber: request.idNumber,
      gender: request.gender ?? 'female',
      nationality: request.nationality,
      academicLevel: request.academicLevel,
      track,
      trackNote: request.trackNote ?? '',
      phone: request.phone,
      dob: request.dob,
      levelId: placement.value.levelId,
      courseIds: placement.value.courseIds,
      centerId: request.centerId,
      occupation: request.occupation ?? null,
      occupationOther: request.occupationOther ?? '',
      studentType: request.studentType ?? 'new',
      homeAddress: request.homeAddress ?? {},
      notes: request.notes ?? '',
      documents: request.documents ?? {},
      deletedAt: null,
      enrollmentStatus: 'enrolled',
      enrollmentHistory: [{ action: 'registered', by: req.user._id, at: new Date() }],
    });

    const user = await User.create({
      phone: request.phone,
      passwordHash: request.passwordHash,
      role: 'student',
      centerId: request.centerId,
      studentId: student._id,
      isActive: true,
    });

    request.status = 'approved';
    request.studentId = student._id;
    request.reviewedAt = new Date();
    request.reviewedBy = req.user._id;
    await request.save();

    await updateFilesMetadata(
      [request.documents?.civilId, request.documents?.photo, request.documents?.qualification],
      { studentId: student._id.toString() }
    );

    const notifyResult = await notifyUsers([user._id], {
      type: 'registration_approved',
      title: 'تم قبولكِ في المركز',
      body: 'تمت الموافقة على طلب تسجيلكِ. يمكنكِ تسجيل الدخول الآن.',
      centerId: request.centerId,
      data: {
        studentId: student._id.toString(),
        centerId: request.centerId.toString(),
      },
    });

    sendSuccess(res, {
      studentId: student._id.toString(),
      userId: user._id.toString(),
      message: 'تمت الموافقة على الطلب وإنشاء حساب الطالبة',
      notification: notifyResult,
    });
  } catch (err) {
    console.error('[approveRegistrationRequest]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

export async function rejectRegistrationRequest(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.centerId) {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const id = paramId(req.params.id);
    if (!mongoose.isValidObjectId(id)) {
      sendError(res, 'معرّف الطلب غير صالح', 400);
      return;
    }

    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
    if (!reason) {
      sendError(res, 'سبب الرفض مطلوب', 400);
      return;
    }

    const request = await RegistrationRequest.findOne({
      _id: id,
      centerId: req.user.centerId,
    });

    if (!request) {
      sendError(res, 'لم يُعثر على الطلب', 404);
      return;
    }

    if (request.status !== 'pending') {
      sendError(res, 'تمت معالجة هذا الطلب مسبقاً', 409);
      return;
    }

    request.status = 'rejected';
    request.rejectionReason = reason;
    request.reviewedAt = new Date();
    request.reviewedBy = req.user._id;
    await request.save();

    sendSuccess(res, {
      id: request._id.toString(),
      status: request.status,
      message: 'تم رفض الطلب',
    });
  } catch (err) {
    console.error('[rejectRegistrationRequest]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}
