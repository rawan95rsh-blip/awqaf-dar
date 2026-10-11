import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Center } from '../models/Center';
import { Course } from '../models/Course';
import { genderAudienceFilter } from '../constants/genderAudience';
import { sendError, sendSuccess } from '../utils/response';

export async function getPublicCenters(req: Request, res: Response): Promise<void> {
  try {
    const audienceRaw = typeof req.query.audience === 'string' ? req.query.audience.trim() : 'all';

    let audienceFilter: ReturnType<typeof genderAudienceFilter>;
    try {
      audienceFilter = genderAudienceFilter(audienceRaw);
    } catch {
      sendError(res, 'قيمة audience غير صالحة — استخدمى all أو female أو male', 400);
      return;
    }

    const centers = await Center.find({ status: 'active', ...audienceFilter })
      .select('nameAr addressText city genderAudience')
      .sort({ nameAr: 1 })
      .lean();

    sendSuccess(
      res,
      centers.map((center) => ({
        id: center._id.toString(),
        nameAr: center.nameAr,
        addressText: center.addressText ?? '',
        city: center.city ?? '',
        genderAudience: center.genderAudience ?? 'female',
      }))
    );
  } catch (err) {
    console.error('[getPublicCenters]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}

/** الدورات العلمية المتاحة في مركز — عام (لصفحة تسجيل الطالبات) */
export async function getPublicCenterCourses(req: Request, res: Response): Promise<void> {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    if (!mongoose.isValidObjectId(id)) {
      sendError(res, 'معرّف المركز غير صالح', 400);
      return;
    }
    const center = await Center.exists({ _id: id, status: 'active' });
    if (!center) {
      sendError(res, 'المركز غير موجود', 404);
      return;
    }
    const courses = await Course.find({ centerId: id }).select('name description').sort({ name: 1 }).lean();
    sendSuccess(
      res,
      courses.map((course) => ({
        id: course._id.toString(),
        name: course.name,
        description: course.description ?? '',
      }))
    );
  } catch (err) {
    console.error('[getPublicCenterCourses]', err);
    sendError(res, 'حدث خطأ في الخادم', 500);
  }
}
