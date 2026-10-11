import mongoose from 'mongoose';
import { ClassOffer } from '../models/ClassOffer';
import { Session } from '../models/Session';
import { CLASS_TRACK_LABELS_AR, parseTimeHHMM, minutesOf, WEEKDAY_LABELS_AR, type ClassTrack } from '../constants/classOffers';
import { centerDateParts, startOfCenterDay, zonedDateTimeToUtc } from './timezone';

const DAY_MS = 24 * 60 * 60 * 1000;
/** أقصى مدى لتوليد الحصص في طلب واحد */
export const MAX_MATERIALIZE_DAYS = 62;

/**
 * الجدول الأسبوعي متكرر: كل فصل له يوم ووقت ثابت.
 * عند طلب نطاق تاريخ، تُنشأ الحصص الناقصة لكل فصل (مرة واحدة فقط بفضل الفهرس الفريد)
 * حتى تعمل الاعتذارات والتحضير على كل أسبوع وليس الأسبوع الأول فقط.
 */
export async function materializeOfferSessions(
  centerId: mongoose.Types.ObjectId,
  from: Date,
  to: Date,
  options: { levelId?: mongoose.Types.ObjectId | string | null; createdBy?: mongoose.Types.ObjectId } = {}
): Promise<void> {
  if (to.getTime() < from.getTime()) return;
  const cappedTo = new Date(Math.min(to.getTime(), from.getTime() + MAX_MATERIALIZE_DAYS * DAY_MS));

  const filter: Record<string, unknown> = { centerId };
  if (options.levelId) filter.levelId = options.levelId;
  const offers = await ClassOffer.find(filter).lean();
  if (!offers.length) return;

  const operations: mongoose.AnyBulkWriteOperation[] = [];
  const firstDay = startOfCenterDay(from);

  for (const offer of offers) {
    const start = parseTimeHHMM(offer.startTime);
    const end = parseTimeHHMM(offer.endTime);
    if (!start || !end) continue;
    const durationMinutes = (minutesOf(end) - minutesOf(start) + 24 * 60) % (24 * 60) || 60;
    const offerStartDay = startOfCenterDay(offer.createdAt ?? new Date());
    const trackLabel = CLASS_TRACK_LABELS_AR[offer.track as ClassTrack] ?? '';

    for (let day = firstDay.getTime(); day <= cappedTo.getTime(); day += DAY_MS) {
      const dayDate = new Date(day);
      const parts = centerDateParts(dayDate);
      if (parts.weekday !== offer.weekday) continue;
      if (day < offerStartDay.getTime()) continue;

      const startAt = zonedDateTimeToUtc(parts.year, parts.month, parts.day, start.hours, start.minutes);
      if (startAt.getTime() < from.getTime() - DAY_MS || startAt.getTime() > cappedTo.getTime()) continue;
      const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);

      operations.push({
        updateOne: {
          filter: { classOfferId: offer._id, startAt },
          update: {
            $setOnInsert: {
              centerId: offer.centerId,
              levelId: offer.levelId ?? null,
              classOfferId: offer._id,
              subjectIndex: offer.subjectIndex,
              title: `${offer.subjectName} — ${trackLabel}`,
              startAt,
              endAt,
              mode: offer.mode,
              teacherName: offer.teacherName,
              notes: `فصل ${trackLabel} | ${WEEKDAY_LABELS_AR[offer.weekday]} | ${offer.startTime}–${offer.endTime}`,
              status: 'scheduled',
              createdBy: options.createdBy ?? offer.createdBy,
            },
          },
          upsert: true,
        },
      });
    }
  }

  if (!operations.length) return;
  try {
    await Session.bulkWrite(operations, { ordered: false });
  } catch (err) {
    // تكرار مفتاح عند طلبين متزامنين — آمن تجاهله
    const code = (err as { code?: number }).code;
    if (code !== 11000) {
      console.warn('[materializeOfferSessions]', (err as Error).message);
    }
  }
}
