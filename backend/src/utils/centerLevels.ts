import type { Types } from 'mongoose';
import { Level } from '../models/Level';
import {
  LEVEL_TRACK_RANGES,
  LEVEL_TRACKS,
  levelFullName,
  levelShortName,
  type LevelTrack,
} from '../constants/tracks';

/** مدة الترم (أشهر) — قاعدة منتج؛ الترقية يدوية وليست تلقائية */
export const MUTOR_TERM_MONTHS = 3;

export type LevelSeed = {
  track: LevelTrack;
  order: number;
  shortName: string;
  fullName: string;
};

/** سلّم المستويات الافتراضي: تمهيدي ١–٦ ثم مطور ١–٨ */
export const DEFAULT_LEVELS: LevelSeed[] = LEVEL_TRACKS.flatMap((track) => {
  const { min, max } = LEVEL_TRACK_RANGES[track];
  const items: LevelSeed[] = [];
  for (let order = min; order <= max; order += 1) {
    items.push({
      track,
      order,
      shortName: levelShortName(track, order),
      fullName: levelFullName(track, order),
    });
  }
  return items;
});

/** ينشئ المستويات الناقصة فقط — لا يغيّر أسماء عدّلها المركز */
export async function ensureDefaultLevelsForCenter(centerId: Types.ObjectId): Promise<void> {
  const existing = await Level.find({ centerId }).select('track order').lean();
  const keys = new Set(existing.map((level) => `${level.track ?? 'mutor'}:${level.order}`));
  const missing = DEFAULT_LEVELS.filter((seed) => !keys.has(`${seed.track}:${seed.order}`));
  if (!missing.length) return;
  await Level.insertMany(
    missing.map((seed) => ({ ...seed, centerId })),
    { ordered: false }
  ).catch(() => undefined);
}

/** للتوافق مع الكود القديم */
export const ensureAllDefaultLevelsForCenter = ensureDefaultLevelsForCenter;
export const ensureGeneralLevelsForCenter = ensureDefaultLevelsForCenter;

/** المستوى التالي في السلّم: تمهيدي سادس ← مطور أول */
export async function findNextLevel(
  centerId: Types.ObjectId,
  current: { track?: string | null; order: number }
) {
  const track = (current.track ?? 'mutor') as LevelTrack;
  const range = LEVEL_TRACK_RANGES[track];
  if (current.order < range.max) {
    return Level.findOne({ centerId, track, order: current.order + 1 });
  }
  if (track === 'preparatory') {
    return Level.findOne({ centerId, track: 'mutor', order: LEVEL_TRACK_RANGES.mutor.min });
  }
  return null;
}
