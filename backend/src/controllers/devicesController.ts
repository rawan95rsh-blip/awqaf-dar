import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { DeviceToken } from '../models/DeviceToken';
import { sendError, sendSuccess } from '../utils/response';

const PLATFORMS = ['ios', 'android', 'web', 'unknown'] as const;

function isExpoPushToken(value: string): boolean {
  return (
    value.startsWith('ExponentPushToken[') || value.startsWith('ExpoPushToken[')
  );
}

/** POST /api/devices/register */
export async function registerDevice(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?._id) {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const { expoPushToken, platform } = req.body as {
      expoPushToken?: string;
      platform?: string;
    };

    if (typeof expoPushToken !== 'string' || !expoPushToken.trim()) {
      sendError(res, 'رمز الجهاز مطلوب', 400);
      return;
    }

    const token = expoPushToken.trim();
    if (!isExpoPushToken(token)) {
      sendError(res, 'رمز Expo Push غير صالح', 400);
      return;
    }

    const resolvedPlatform =
      typeof platform === 'string' &&
      (PLATFORMS as readonly string[]).includes(platform)
        ? platform
        : 'unknown';

    const doc = await DeviceToken.findOneAndUpdate(
      { expoPushToken: token },
      {
        $set: {
          userId: req.user._id,
          centerId: req.user.centerId ?? null,
          platform: resolvedPlatform,
          lastSeenAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    sendSuccess(res, {
      id: doc._id.toString(),
      expoPushToken: doc.expoPushToken,
      platform: doc.platform,
      message: 'تم تسجيل الجهاز للإشعارات',
    });
  } catch (err) {
    console.error('[registerDevice]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

/** DELETE /api/devices/me — إزالة توكنات المستخدم الحالي (اختياري عند الخروج) */
export async function unregisterMyDevices(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?._id) {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const { expoPushToken } = req.body as { expoPushToken?: string };
    const filter: { userId: mongoose.Types.ObjectId; expoPushToken?: string } = {
      userId: req.user._id,
    };
    if (typeof expoPushToken === 'string' && expoPushToken.trim()) {
      filter.expoPushToken = expoPushToken.trim();
    }

    const result = await DeviceToken.deleteMany(filter);
    sendSuccess(res, {
      deletedCount: result.deletedCount,
      message: 'تم إلغاء تسجيل الجهاز',
    });
  } catch (err) {
    console.error('[unregisterMyDevices]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}
