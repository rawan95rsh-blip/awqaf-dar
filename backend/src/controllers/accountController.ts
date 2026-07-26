import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { Center, type CenterDocument } from '../models/Center';
import { User } from '../models/User';
import { sendError, sendSuccess } from '../utils/response';
import {
  isDigitsOnlyPassword,
  PASSWORD_DIGITS_ERROR_AR,
} from '../utils/password';

function formatAccountResponse(user: NonNullable<Request['user']>, center: CenterDocument | null) {
  return {
    user: {
      id: user._id.toString(),
      phone: user.phone,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    },
    center: center
      ? {
          id: center._id.toString(),
          nameAr: center.nameAr,
          supervisorName: center.supervisorName,
          specializations: center.specializations,
          status: center.status,
        }
      : null,
  };
}

export async function getAccount(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 'يجب تسجيل الدخول', 401);
      return;
    }

    let center: CenterDocument | null = null;
    if (req.user.centerId) {
      center = await Center.findById(req.user.centerId);
    }

    sendSuccess(res, formatAccountResponse(req.user, center));
  } catch (err) {
    console.error('[getAccount]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

export async function updateAccount(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 'يجب تسجيل الدخول', 401);
      return;
    }

    if (req.user.role !== 'center_admin' || !req.user.centerId) {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const { supervisorName, email } = req.body as {
      supervisorName?: string;
      email?: string;
    };

    if (!supervisorName?.trim() && !email?.trim()) {
      sendError(res, 'لا توجد بيانات للتحديث', 400);
      return;
    }

    const center = await Center.findById(req.user.centerId);
    if (!center) {
      sendError(res, 'المركز غير موجود', 404);
      return;
    }

    if (supervisorName?.trim()) {
      center.supervisorName = supervisorName.trim();
      await center.save();
    }

    if (email !== undefined) {
      const normalizedEmail = email.trim().toLowerCase();
      if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        sendError(res, 'البريد الإلكتروني غير صالح', 400);
        return;
      }

      await User.findByIdAndUpdate(req.user._id, {
        email: normalizedEmail || undefined,
      });
      req.user.email = normalizedEmail || undefined;
    }

    sendSuccess(res, formatAccountResponse(req.user, center));
  } catch (err) {
    console.error('[updateAccount]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 'يجب تسجيل الدخول', 401);
      return;
    }

    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!currentPassword || !newPassword) {
      sendError(res, 'كلمة المرور الحالية والجديدة مطلوبتان', 400);
      return;
    }

    if (!isDigitsOnlyPassword(newPassword)) {
      sendError(res, PASSWORD_DIGITS_ERROR_AR, 400);
      return;
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      sendError(res, 'المستخدم غير موجود', 404);
      return;
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!passwordMatch) {
      sendError(res, 'كلمة المرور الحالية غير صحيحة', 400);
      return;
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    sendSuccess(res, { message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (err) {
    console.error('[changePassword]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}
