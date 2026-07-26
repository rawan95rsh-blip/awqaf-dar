import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { User } from '../models/User';
import { Center } from '../models/Center';
import { Student } from '../models/Student';
import { RegistrationRequest } from '../models/RegistrationRequest';
import { VerificationCode } from '../models/VerificationCode';
import { sendError, sendSuccess } from '../utils/response';
import { signToken } from '../utils/token';
import type { UserDocument } from '../models/User';
import { ensureGeneralLevelsForCenter } from '../utils/centerLevels';
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
import { SUSPENDED_LOGIN_ERROR_AR } from '../constants/enrollment';

function normalizePhone(phone: string): string {
  return phone.trim().replace(/\s/g, '');
}

async function buildLoginResponse(user: UserDocument) {
  let centerProfile: { id: string; nameAr: string } | undefined;
  if (user.centerId) {
    const center = await Center.findById(user.centerId);
    if (center) {
      centerProfile = { id: center._id.toString(), nameAr: center.nameAr };
    }
  }

  let studentProfile:
    | {
        id: string;
        fullName: string;
        idNumber: string;
        nationality: string;
        academicLevel: string;
        levelId: string;
      }
    | undefined;
  if (user.studentId) {
    const student = await Student.findById(user.studentId);
    if (student) {
      studentProfile = {
        id: student._id.toString(),
        fullName: student.fullName,
        idNumber: student.idNumber,
        nationality: student.nationality,
        academicLevel: student.academicLevel,
        levelId: student.levelId.toString(),
      };
    }
  }

  const token = signToken({
    userId: user._id.toString(),
    role: user.role,
    centerId: user.centerId?.toString(),
  });

  return {
    token,
    user: {
      id: user._id.toString(),
      phone: user.phone,
      email: user.email,
      role: user.role,
      centerProfile,
      studentProfile,
    },
  };
}

function generateVerificationCode(): string {
  if (process.env.NODE_ENV === 'development') {
    return process.env.DEV_VERIFICATION_CODE ?? '7890';
  }
  return String(Math.floor(1000 + Math.random() * 9000));
}

const VALID_SPECIALIZATIONS = ['mutor', 'dawa', 'atruja', 'courses', 'siraj'] as const;

type RegisterCenterBody = {
  email?: string;
  phone?: string;
  password?: string;
  centerName?: string;
  supervisorName?: string;
  specializations?: unknown;
};

type VerifyCenterBody = {
  phone?: string;
  code?: string;
};

export async function registerCenter(req: Request, res: Response): Promise<void> {
  try {
    const {
      phone,
      password,
      centerName,
      supervisorName,
      specializations,
    } = req.body as RegisterCenterBody;

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

    if (!centerName || typeof centerName !== 'string' || !centerName.trim()) {
      sendError(res, 'اسم المركز مطلوب', 400);
      return;
    }

    if (!supervisorName || typeof supervisorName !== 'string' || !supervisorName.trim()) {
      sendError(res, 'اسم المشرف مطلوب', 400);
      return;
    }

    if (!Array.isArray(specializations) || specializations.length === 0) {
      sendError(res, 'يجب اختيار تخصص واحد على الأقل', 400);
      return;
    }

    const hasInvalidSpec = specializations.some(
      (spec) =>
        typeof spec !== 'string' ||
        !VALID_SPECIALIZATIONS.includes(spec as (typeof VALID_SPECIALIZATIONS)[number])
    );

    if (hasInvalidSpec) {
      sendError(res, 'تخصص غير صالح', 400);
      return;
    }

    const existingUser = await User.findOne({ phone: normalizedPhone });
    if (existingUser) {
      sendError(res, 'رقم الهاتف مسجل مسبقاً', 409);
      return;
    }

    const trimmedCenterName = centerName.trim();
    const trimmedSupervisorName = supervisorName.trim();
    const validSpecs = specializations as string[];

    const center = await Center.create({
      nameAr: trimmedCenterName,
      supervisorName: trimmedSupervisorName,
      specializations: validSpecs,
      status: 'pending',
    });

    const passwordHash = await bcrypt.hash(password, 10);
    const email =
      typeof req.body.email === 'string' && req.body.email.trim()
        ? req.body.email.trim().toLowerCase()
        : undefined;

    const user = await User.create({
      phone: normalizedPhone,
      passwordHash,
      role: 'center_admin',
      centerId: center._id,
      email,
      isActive: false,
    });

    await VerificationCode.deleteMany({
      phone: normalizedPhone,
      purpose: 'center_registration',
    });

    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await VerificationCode.create({
      phone: normalizedPhone,
      code,
      purpose: 'center_registration',
      expiresAt,
      userId: user._id,
    });

    const data: { message: string; phone: string; devCode?: string } = {
      message: 'تم إرسال كود التحقق',
      phone: normalizedPhone,
    };

    if (process.env.NODE_ENV === 'development') {
      data.devCode = code;
    }

    sendSuccess(res, data, 201);
  } catch (err) {
    console.error('[registerCenter]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

export async function verifyCenter(req: Request, res: Response): Promise<void> {
  try {
    const { phone, code } = req.body as VerifyCenterBody;

    if (!phone || typeof phone !== 'string') {
      sendError(res, 'رقم الهاتف مطلوب', 400);
      return;
    }

    if (!code || typeof code !== 'string') {
      sendError(res, 'كود التحقق مطلوب', 400);
      return;
    }

    const normalizedPhone = normalizePhone(phone);
    const user = await User.findOne({ phone: normalizedPhone });

    if (!user) {
      sendError(res, 'لم يُعثر على طلب تسجيل', 404);
      return;
    }

    if (user.isActive) {
      sendError(res, 'الحساب مفعّل بالفعل', 409);
      return;
    }

    const verificationCode = await VerificationCode.findOne({
      phone: normalizedPhone,
      purpose: 'center_registration',
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!verificationCode) {
      sendError(res, 'انتهت صلاحية الكود', 400);
      return;
    }

    if (verificationCode.code !== code.trim()) {
      sendError(res, 'الكود غير صحيح', 400);
      return;
    }

    if (user.centerId) {
      await Center.findByIdAndUpdate(user.centerId, { status: 'active' });
      await ensureGeneralLevelsForCenter(user.centerId);
    }

    user.isActive = true;
    await user.save();

    await VerificationCode.deleteMany({
      phone: normalizedPhone,
      purpose: 'center_registration',
    });

    sendSuccess(res, await buildLoginResponse(user));
  } catch (err) {
    console.error('[verifyCenter]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { phone, idNumber, password } = req.body as {
      phone?: string;
      idNumber?: string;
      password?: string;
    };

    if (!password || typeof password !== 'string') {
      sendError(res, 'كلمة المرور مطلوبة', 400);
      return;
    }

    const hasPhone = typeof phone === 'string' && phone.trim().length > 0;
    const hasIdNumber = typeof idNumber === 'string' && idNumber.trim().length > 0;

    if (!hasPhone && !hasIdNumber) {
      sendError(res, 'رقم الهاتف أو رقم الهوية مطلوب', 400);
      return;
    }

    if (hasPhone && hasIdNumber) {
      sendError(res, 'أدخل رقم الهاتف أو رقم الهوية فقط', 400);
      return;
    }

    if (hasIdNumber) {
      const normalizedIdNumber = normalizeIdNumber(idNumber!);
      if (!isKuwaitCivilId(normalizedIdNumber)) {
        sendError(res, KUWAIT_CIVIL_ID_ERROR_AR, 400);
        return;
      }

      const student = await Student.findOne({
        idNumber: normalizedIdNumber,
        deletedAt: null,
      });
      if (!student) {
        const pendingRequest = await RegistrationRequest.findOne({
          idNumber: normalizedIdNumber,
          status: 'pending',
        });
        if (pendingRequest) {
          sendError(res, 'طلب التسجيل بانتظار موافقة المركز', 403);
          return;
        }
        sendError(res, 'رقم الهوية أو كلمة المرور غير صحيحة', 401);
        return;
      }

      const user = await User.findOne({
        studentId: student._id,
        role: 'student',
      });

      if (!user || !user.isActive) {
        sendError(res, 'رقم الهوية أو كلمة المرور غير صحيحة', 401);
        return;
      }

      if (student.enrollmentStatus === 'suspended') {
        sendError(res, SUSPENDED_LOGIN_ERROR_AR, 403);
        return;
      }

      const passwordMatch = await bcrypt.compare(password, user.passwordHash);
      if (!passwordMatch) {
        sendError(res, 'رقم الهوية أو كلمة المرور غير صحيحة', 401);
        return;
      }

      sendSuccess(res, await buildLoginResponse(user));
      return;
    }

    const normalizedPhone = normalizePhone(phone!);
    const user = await User.findOne({ phone: normalizedPhone });

    if (!user) {
      sendError(res, 'رقم الهاتف أو كلمة المرور غير صحيحة', 401);
      return;
    }

    if (!user.isActive) {
      sendError(res, 'الحساب غير مفعّل — أكمل التحقق', 403);
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      sendError(res, 'رقم الهاتف أو كلمة المرور غير صحيحة', 401);
      return;
    }

    if (user.role === 'student' && user.studentId) {
      const student = await Student.findOne({
        _id: user.studentId,
        deletedAt: null,
      });
      if (student?.enrollmentStatus === 'suspended') {
        sendError(res, SUSPENDED_LOGIN_ERROR_AR, 403);
        return;
      }
    }

    sendSuccess(res, await buildLoginResponse(user));
  } catch (err) {
    console.error('[login]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}
