import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { Center } from '../models/Center';
import { Level } from '../models/Level';
import { RegistrationRequest } from '../models/RegistrationRequest';
import { Student } from '../models/Student';
import { User } from '../models/User';
import { sendError, sendSuccess } from '../utils/response';
import { notifyUsers } from '../services/pushService';
import {
  isValidAcademicLevel,
  isValidNationality,
} from '../constants/registration';
import {
  isGenderCompatibleWithCenter,
  isStudentGender,
} from '../constants/genderAudience';
import { isClassTrack } from '../constants/classOffers';
import {
  isDigitsOnlyPassword,
  PASSWORD_DIGITS_ERROR_AR,
} from '../utils/password';

import {
  isKuwaitCivilId,
  KUWAIT_CIVIL_ID_ERROR_AR,
  KUWAIT_CIVIL_ID_LABEL_AR,
  normalizeIdNumber,
} from '../utils/idNumber';

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

function formatRequest(request: {
  _id: mongoose.Types.ObjectId;
  fullName: string;
  idNumber: string;
  gender: string;
  nationality: string;
  academicLevel: string;
  track: string;
  phone: string;
  dob: Date;
  centerId: mongoose.Types.ObjectId;
  requestedLevelId: mongoose.Types.ObjectId;
  status: string;
  rejectionReason?: string | null;
  studentId?: mongoose.Types.ObjectId | null;
  createdAt?: Date;
}) {
  return {
    id: request._id.toString(),
    fullName: request.fullName,
    idNumber: request.idNumber,
    gender: request.gender,
    nationality: request.nationality,
    academicLevel: request.academicLevel,
    track: request.track,
    phone: request.phone,
    dob: request.dob.toISOString().slice(0, 10),
    centerId: request.centerId.toString(),
    requestedLevelId: request.requestedLevelId.toString(),
    status: request.status,
    rejectionReason: request.rejectionReason ?? undefined,
    studentId: request.studentId?.toString(),
    createdAt: request.createdAt?.toISOString(),
  };
}

async function validateCenterAndLevel(
  centerId: string,
  levelId: string
): Promise<{ center: NonNullable<Awaited<ReturnType<typeof Center.findOne>>>; level: NonNullable<Awaited<ReturnType<typeof Level.findOne>>> } | null> {
  if (!mongoose.isValidObjectId(centerId) || !mongoose.isValidObjectId(levelId)) {
    return null;
  }

  const center = await Center.findOne({ _id: centerId, status: 'active' });
  if (!center) {
    return null;
  }

  const level = await Level.findOne({ _id: levelId, centerId: center._id });
  if (!level) {
    return null;
  }

  return { center, level };
}

export async function submitRegistrationRequest(req: Request, res: Response): Promise<void> {
  try {
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
      centerId,
      requestedLevelId,
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
      centerId?: string;
      requestedLevelId?: string;
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

    if (!track || typeof track !== 'string' || !isClassTrack(track)) {
      sendError(res, 'مسار الانضمام مطلوب — اختاري مطور أو دورة', 400);
      return;
    }

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

    if (!centerId || typeof centerId !== 'string') {
      sendError(res, 'معرّف المركز مطلوب', 400);
      return;
    }

    if (!requestedLevelId || typeof requestedLevelId !== 'string') {
      sendError(res, 'المستوى المطلوب مطلوب', 400);
      return;
    }

    const existingStudent = await Student.findOne({
      idNumber: normalizedIdNumber,
      deletedAt: null,
    });
    if (existingStudent) {
      sendError(
        res,
        'رقم الهوية المدنية مسجل مسبقاً في مركز — لا يمكن التسجيل في مركز آخر قبل الحذف الكلي',
        409
      );
      return;
    }

    const pendingRequest = await RegistrationRequest.findOne({
      idNumber: normalizedIdNumber,
      status: 'pending',
    });
    if (pendingRequest) {
      sendError(res, 'يوجد طلب تسجيل معلق لهذه الهوية', 409);
      return;
    }

    const existingUser = await User.findOne({ phone: normalizedPhone });
    if (existingUser) {
      sendError(res, 'رقم الهاتف مسجل مسبقاً', 409);
      return;
    }

    const centerLevel = await validateCenterAndLevel(centerId, requestedLevelId);
    if (!centerLevel) {
      sendError(res, 'المركز أو المستوى غير صالح', 400);
      return;
    }

    if (!isGenderCompatibleWithCenter(gender, centerLevel.center.genderAudience)) {
      sendError(
        res,
        gender === 'female'
          ? 'هذا المركز رجالي — اختاري مركزاً نسائياً'
          : 'هذا المركز نسائي — اختر مركزاً رجالياً',
        400
      );
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const request = await RegistrationRequest.create({
      fullName: fullName.trim(),
      idNumber: normalizedIdNumber,
      gender,
      nationality,
      academicLevel,
      track,
      phone: normalizedPhone,
      dob: parsedDob,
      passwordHash,
      centerId: centerLevel.center._id,
      requestedLevelId: centerLevel.level._id,
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

    const requestStatus = status as 'pending' | 'approved' | 'rejected';

    const requests = await RegistrationRequest.find({
      centerId: req.user.centerId,
      status: requestStatus,
    })
      .sort({ createdAt: -1 })
      .lean();

    sendSuccess(res, requests.map((request) => formatRequest(request)));
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

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      sendError(res, 'معرّف الطلب غير صالح', 400);
      return;
    }

    const request = await RegistrationRequest.findOne({
      _id: id,
      centerId: req.user.centerId,
    }).lean();

    if (!request) {
      sendError(res, 'لم يُعثر على الطلب', 404);
      return;
    }

    sendSuccess(res, formatRequest(request));
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

    const { id } = req.params;
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

    const levelId =
      typeof req.body?.levelId === 'string' && req.body.levelId.trim()
        ? req.body.levelId.trim()
        : request.requestedLevelId.toString();

    const centerLevel = await validateCenterAndLevel(
      request.centerId.toString(),
      levelId
    );
    if (!centerLevel) {
      sendError(res, 'المستوى غير صالح لهذا المركز', 400);
      return;
    }

    const existingStudent = await Student.findOne({
      idNumber: request.idNumber,
      deletedAt: null,
    });
    if (existingStudent) {
      sendError(
        res,
        'رقم الهوية المدنية مسجل مسبقاً في مركز — لا يمكن التسجيل في مركز آخر قبل الحذف الكلي',
        409
      );
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
      track: request.track ?? 'mutor',
      phone: request.phone,
      dob: request.dob,
      levelId: centerLevel.level._id,
      centerId: request.centerId,
      deletedAt: null,
      enrollmentStatus: 'enrolled',
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

    const notifyResult = await notifyUsers([user._id], {
      type: 'registration_approved',
      title: 'تم قبولك في المركز',
      body: 'تمت الموافقة على طلب تسجيلك. يمكنكِ تسجيل الدخول الآن.',
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

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      sendError(res, 'معرّف الطلب غير صالح', 400);
      return;
    }

    const reason =
      typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
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
