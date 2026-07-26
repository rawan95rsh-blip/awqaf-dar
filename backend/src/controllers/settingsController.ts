import type { Request, Response } from 'express';
import { Center } from '../models/Center';
import { DEFAULT_GRADE_WEIGHTS } from '../constants/grades';
import {
  isGenderAudience,
  type GenderAudience,
} from '../constants/genderAudience';
import {
  getCenterGradeWeights,
  normalizeGradeWeights,
  validateGradeWeightsInput,
} from '../utils/gradeWeights';
import { sendError, sendSuccess } from '../utils/response';

function formatCenterProfile(center: {
  _id: { toString(): string };
  nameAr: string;
  addressText?: string | null;
  city?: string | null;
  genderAudience?: string | null;
}) {
  return {
    id: center._id.toString(),
    nameAr: center.nameAr,
    addressText: center.addressText ?? '',
    city: center.city ?? '',
    genderAudience: (center.genderAudience as GenderAudience) ?? 'female',
  };
}

export async function getSettings(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.centerId) {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const [gradeWeights, center] = await Promise.all([
      getCenterGradeWeights(req.user.centerId),
      Center.findById(req.user.centerId).select('nameAr addressText city genderAudience'),
    ]);

    if (!center) {
      sendError(res, 'المركز غير موجود', 404);
      return;
    }

    sendSuccess(res, {
      gradeWeights,
      centerProfile: formatCenterProfile(center),
    });
  } catch (err) {
    console.error('[getSettings]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

export async function getCenterProfile(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.centerId) {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const center = await Center.findById(req.user.centerId).select(
      'nameAr addressText city genderAudience'
    );
    if (!center) {
      sendError(res, 'المركز غير موجود', 404);
      return;
    }

    sendSuccess(res, formatCenterProfile(center));
  } catch (err) {
    console.error('[getCenterProfile]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

export async function updateCenterProfile(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.centerId) {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const { addressText, city, genderAudience } = req.body as {
      addressText?: unknown;
      city?: unknown;
      genderAudience?: unknown;
    };

    if (addressText === undefined && city === undefined && genderAudience === undefined) {
      sendError(res, 'لا توجد بيانات للتحديث', 400);
      return;
    }

    if (addressText !== undefined && typeof addressText !== 'string') {
      sendError(res, 'العنوان غير صالح', 400);
      return;
    }

    if (city !== undefined && typeof city !== 'string') {
      sendError(res, 'المدينة غير صالحة', 400);
      return;
    }

    if (genderAudience !== undefined && !isGenderAudience(genderAudience)) {
      sendError(res, 'نوع المركز غير صالح — اختاري نسائي أو رجالي', 400);
      return;
    }

    const trimmedAddress = addressText !== undefined ? addressText.trim() : undefined;
    const trimmedCity = city !== undefined ? city.trim() : undefined;

    if (trimmedAddress !== undefined && trimmedAddress.length > 300) {
      sendError(res, 'العنوان طويل جداً (الحد 300 حرف)', 400);
      return;
    }

    if (trimmedCity !== undefined && trimmedCity.length > 100) {
      sendError(res, 'اسم المدينة طويل جداً (الحد 100 حرف)', 400);
      return;
    }

    const center = await Center.findById(req.user.centerId);
    if (!center) {
      sendError(res, 'المركز غير موجود', 404);
      return;
    }

    if (trimmedAddress !== undefined) {
      center.addressText = trimmedAddress;
    }
    if (trimmedCity !== undefined) {
      center.city = trimmedCity;
    }
    if (genderAudience !== undefined) {
      center.genderAudience = genderAudience;
    }

    await center.save();

    sendSuccess(res, {
      ...formatCenterProfile(center),
      message: 'تم حفظ بيانات المركز بنجاح',
    });
  } catch (err) {
    console.error('[updateCenterProfile]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

export async function getGradeWeights(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.centerId) {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const gradeWeights = await getCenterGradeWeights(req.user.centerId);
    sendSuccess(res, gradeWeights);
  } catch (err) {
    console.error('[getGradeWeights]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

export async function updateGradeWeights(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.centerId) {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const { attendance, shortExam, participation, final } = req.body as {
      attendance?: number;
      shortExam?: number;
      participation?: number;
      final?: number;
    };

    const validationError = validateGradeWeightsInput({
      attendance,
      shortExam,
      participation,
      final,
    });

    if (validationError) {
      sendError(res, validationError, 400);
      return;
    }

    const normalized = normalizeGradeWeights({
      attendance: attendance!,
      shortExam: shortExam!,
      participation: participation!,
      final: final!,
    });

    if (!normalized) {
      sendError(res, 'أوزان الدرجات غير صالحة', 400);
      return;
    }

    const center = await Center.findByIdAndUpdate(
      req.user.centerId,
      { gradeWeights: normalized },
      { new: true }
    ).select('gradeWeights');

    if (!center) {
      sendError(res, 'المركز غير موجود', 404);
      return;
    }

    sendSuccess(res, {
      gradeWeights: center.gradeWeights ?? { ...DEFAULT_GRADE_WEIGHTS },
      message: 'تم حفظ أوزان الدرجات بنجاح',
    });
  } catch (err) {
    console.error('[updateGradeWeights]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}
