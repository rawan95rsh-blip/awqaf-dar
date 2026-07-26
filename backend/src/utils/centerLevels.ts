import type { Types } from 'mongoose';
import { Level } from '../models/Level';

export const MEMORIZATION_LEVELS = [
  { shortName: 'تمهيدي', fullName: 'المستوى التمهيدي', order: 0 },
  { shortName: 'مستوى مطور ١', fullName: 'المستوى الأول مطور', order: 1 },
  { shortName: 'مستوى مطور ٢', fullName: 'المستوى الثاني مطور', order: 2 },
  { shortName: 'مستوى مطور ٣', fullName: 'المستوى الثالث مطور', order: 3 },
  { shortName: 'مستوى مطور ٤', fullName: 'المستوى الرابع مطور', order: 4 },
  { shortName: 'مستوى مطور ٥', fullName: 'المستوى الخامس مطور', order: 5 },
  { shortName: 'مستوى مطور ٦', fullName: 'المستوى السادس مطور', order: 6 },
  { shortName: 'مستوى مطور ٧', fullName: 'المستوى السابع مطور', order: 7 },
  { shortName: 'مستوى مطور ٨', fullName: 'المستوى الثامن مطور', order: 8 },
] as const;

/** ترتيب المستوى التمهيدي — الافتراضي عند الإضافة اليدوية */
export const PREPARATORY_LEVEL_ORDER = 0;

/** مدة الترم في مسار المطور (أشهر) — قاعدة منتج؛ الترقية يدوية وليست تلقائية */
export const MUTOR_TERM_MONTHS = 3;

export const MUTOR_LEVEL_ORDER_MIN = 1;
export const MUTOR_LEVEL_ORDER_MAX = 8;

/** لم يعد يُنشئ مستويات «دورات/استماع» — الدورات العلمية كيان Course منفصل */
export const GENERAL_LEVELS: readonly {
  shortName: string;
  fullName: string;
  order: number;
}[] = [];

type LevelSeed = {
  shortName: string;
  fullName: string;
  order: number;
};

async function upsertLevelsForCenter(
  centerId: Types.ObjectId,
  levels: readonly LevelSeed[]
): Promise<void> {
  for (const level of levels) {
    const existing = await Level.findOne({ centerId, order: level.order });
    if (existing) {
      existing.fullName = level.fullName;
      existing.shortName = level.shortName;
      await existing.save();
      continue;
    }

    await Level.create({
      centerId,
      fullName: level.fullName,
      shortName: level.shortName,
      order: level.order,
    });
  }
}

export async function ensureMemorizationLevelsForCenter(
  centerId: Types.ObjectId
): Promise<void> {
  await upsertLevelsForCenter(centerId, MEMORIZATION_LEVELS);
}

export async function ensureGeneralLevelsForCenter(
  _centerId: Types.ObjectId
): Promise<void> {
  // no-op: الدورات العلمية عبر Course وليست Level
}

export async function ensureAllDefaultLevelsForCenter(
  centerId: Types.ObjectId
): Promise<void> {
  await ensureMemorizationLevelsForCenter(centerId);
  await ensureGeneralLevelsForCenter(centerId);
}
