import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Notification } from '../models/Notification';
import { sendError, sendSuccess } from '../utils/response';

function formatNotification(doc: {
  _id: mongoose.Types.ObjectId;
  type: string;
  title: string;
  body: string;
  data?: unknown;
  readAt?: Date | null;
  createdAt?: Date;
}) {
  return {
    id: doc._id.toString(),
    type: doc.type,
    title: doc.title,
    body: doc.body,
    data: doc.data ?? {},
    readAt: doc.readAt?.toISOString() ?? null,
    createdAt: doc.createdAt?.toISOString(),
  };
}

/** GET /api/notifications/me */
export async function listMyNotifications(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?._id) {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const limitRaw = typeof req.query.limit === 'string' ? Number(req.query.limit) : 30;
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(Math.floor(limitRaw), 1), 50)
      : 30;

    const items = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const unreadCount = await Notification.countDocuments({
      userId: req.user._id,
      readAt: null,
    });

    sendSuccess(res, {
      items: items.map(formatNotification),
      unreadCount,
    });
  } catch (err) {
    console.error('[listMyNotifications]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

/** PATCH /api/notifications/:id/read */
export async function markNotificationRead(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?._id) {
      sendError(res, 'غير مصرح', 403);
      return;
    }

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      sendError(res, 'معرّف الإشعار غير صالح', 400);
      return;
    }

    const doc = await Notification.findOne({ _id: id, userId: req.user._id });
    if (!doc) {
      sendError(res, 'الإشعار غير موجود', 404);
      return;
    }

    if (!doc.readAt) {
      doc.readAt = new Date();
      await doc.save();
    }

    sendSuccess(res, formatNotification(doc));
  } catch (err) {
    console.error('[markNotificationRead]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}
