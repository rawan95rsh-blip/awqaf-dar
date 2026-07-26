import type { Request, Response } from 'express';
import { Center } from '../models/Center';
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
