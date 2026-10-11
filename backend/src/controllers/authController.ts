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
import { ensureDefaultLevelsForCenter } from '../utils/centerLevels';
import { parsePhoneInput, phoneLookupCandidates } from '../utils/phone';
import { sendSms } from '../services/smsService';
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
        levelId: string | null;
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
        levelId: student.levelId ? student.levelId.toString() : null,
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
  countryCode?: string;
  password?: string;
  centerName?: string;
  supervisorName?: string;
  specializations?: unknown;
};

type VerifyCenterBody = {
  phone?: string;
  countryCode?: string;
  code?: string;
};

export async function registerCenter(req: Request, res: Response): Promise<void> {
  try {
    const {
      phone,
      countryCode,
      password,
      centerName,
      supervisorName,
      specializations,
    } = req.body as RegisterCenterBody;

    const parsedPhone = parsePhoneInput(phone, countryCode);
    if (!parsedPhone.ok) {
      sendError(res, parsedPhone.error, 400);
      return;
    }
    const normalizedPhone = parsedPhone.phone;

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

    const trimmedCenterName = centerName.trim();
    const trimmedSupervisorName = supervisorName.trim();
    const validSpecs = specializations as string[];
    const passwordHash = await bcrypt.hash(password, 10);
    const email =
      typeof req.body.email === 'string' && req.body.email.trim()
        ? req.body.email.trim().toLowerCase()
        : undefined;

    const existingUser = await User.findOne({ phone: normalizedPhone });
    // تسجيل سابق لم يكتمل التحقق منه — نسمح بإعادة المحاولة بدل حظر الرقم للأبد
    const canResumePending =
      existingUser && !existingUser.isActive && existingUser.role === 'center_admin';
    if (existingUser && !canResumePending) {
      sendError(res, 'رقم الهاتف مسجل مسبقاً', 409);
      return;
    }

    let user;
    if (canResumePending && existingUser) {
      await Center.updateOne(
        { _id: existingUser.centerId },
        {
          $set: {
            nameAr: trimmedCenterName,
            supervisorName: trimmedSupervisorName,
            specializations: validSpecs,
          },
        }
      );
      existingUser.passwordHash = passwordHash;
      if (email) existingUser.email = email;
      await existingUser.save();
      user = existingUser;
    } else {
      const center = await Center.create({
        nameAr: trimmedCenterName,
        supervisorName: trimmedSupervisorName,
        specializations: validSpecs,
        status: 'pending',
      });

      user = await User.create({
        phone: normalizedPhone,
        passwordHash,
        role: 'center_admin',
        centerId: center._id,
        email,
        isActive: false,
      });
    }

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

    await sendSms(normalizedPhone, `كود تفعيل حساب المركز في تطبيق دور القرآن: ${code}`);

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
    const { phone, countryCode, code } = req.body as VerifyCenterBody;

    const parsedPhone = parsePhoneInput(phone, countryCode);
    if (!parsedPhone.ok) {
      sendError(res, parsedPhone.error, 400);
      return;
    }

    if (!code || typeof code !== 'string') {
      sendError(res, 'كود التحقق مطلوب', 400);
      return;
    }

    const normalizedPhone = parsedPhone.phone;
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
      await ensureDefaultLevelsForCenter(user.centerId);
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
    const { phone, countryCode, idNumber, password } = req.body as {
      phone?: string;
      countryCode?: string;
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
      sendError(res, 'رقم الهاتف أو الرقم المدني مطلوب', 400);
      return;
    }

    if (hasPhone && hasIdNumber) {
      sendError(res, 'استخدمي رقم الهاتف أو الرقم المدني — وليس الاثنين', 400);
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
        sendError(res, 'الرقم المدني أو كلمة المرور غير صحيحة', 401);
        return;
      }

      const user = await User.findOne({
        studentId: student._id,
        role: 'student',
      });

      if (!user || !user.isActive) {
        sendError(res, 'الرقم المدني أو كلمة المرور غير صحيحة', 401);
        return;
      }

      if (student.enrollmentStatus === 'suspended') {
        sendError(res, SUSPENDED_LOGIN_ERROR_AR, 403);
        return;
      }

      const passwordMatch = await bcrypt.compare(password, user.passwordHash);
      if (!passwordMatch) {
        sendError(res, 'الرقم المدني أو كلمة المرور غير صحيحة', 401);
        return;
      }

      sendSuccess(res, await buildLoginResponse(user));
      return;
    }

    const candidates = phoneLookupCandidates(phone, countryCode);
    const user = await User.findOne({ phone: { $in: candidates } });

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

/** إعادة إرسال كود التحقق لمركز لم يُفعَّل بعد */
export async function resendCenterCode(req: Request, res: Response): Promise<void> {
  try {
    const { phone, countryCode } = req.body as VerifyCenterBody;
    const parsedPhone = parsePhoneInput(phone, countryCode);
    if (!parsedPhone.ok) {
      sendError(res, parsedPhone.error, 400);
      return;
    }
    const user = await User.findOne({ phone: parsedPhone.phone, role: 'center_admin' });
    if (!user || user.isActive) {
      sendError(res, 'لا يوجد تسجيل بانتظار التحقق لهذا الرقم', 404);
      return;
    }

    const recent = await VerificationCode.findOne({
      phone: parsedPhone.phone,
      purpose: 'center_registration',
      createdAt: { $gt: new Date(Date.now() - 60 * 1000) },
    });
    if (recent) {
      sendError(res, 'انتظري دقيقة قبل طلب كود جديد', 429);
      return;
    }

    await VerificationCode.deleteMany({ phone: parsedPhone.phone, purpose: 'center_registration' });
    const code = generateVerificationCode();
    await VerificationCode.create({
      phone: parsedPhone.phone,
      code,
      purpose: 'center_registration',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      userId: user._id,
    });
    await sendSms(parsedPhone.phone, `كود تفعيل حساب المركز في تطبيق دور القرآن: ${code}`);

    sendSuccess(res, {
      message: 'تم إرسال كود جديد',
      ...(process.env.NODE_ENV === 'development' ? { devCode: code } : {}),
    });
  } catch (err) {
    console.error('[resendCenterCode]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}
