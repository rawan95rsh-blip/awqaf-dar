/**
 * المسارات والمستويات
 * - تمهيدي: ٦ مستويات (تمهيدي أول … تمهيدي سادس)
 * - مطور: ٨ مستويات (مطور أول … مطور ثامن)
 * - دورات / أخرى: مسارات بلا سلّم مستويات
 */

/** مسارات لها سلّم مستويات */
export const LEVEL_TRACKS = ['preparatory', 'mutor'] as const;
export type LevelTrack = (typeof LEVEL_TRACKS)[number];

/** مسار انضمام الطالبة */
export const STUDENT_TRACKS = ['preparatory', 'mutor', 'courses', 'other'] as const;
export type StudentTrack = (typeof STUDENT_TRACKS)[number];

export const TRACK_LABELS_AR: Record<StudentTrack, string> = {
  preparatory: 'تمهيدي',
  mutor: 'مطور',
  courses: 'دورات',
  other: 'أخرى',
};

export const LEVEL_TRACK_RANGES: Record<LevelTrack, { min: number; max: number }> = {
  preparatory: { min: 1, max: 6 },
  mutor: { min: 1, max: 8 },
};

const ORDINALS_AR = ['أول', 'ثاني', 'ثالث', 'رابع', 'خامس', 'سادس', 'سابع', 'ثامن'] as const;

export function levelShortName(track: LevelTrack, order: number): string {
  const prefix = track === 'preparatory' ? 'تمهيدي' : 'مطور';
  return `${prefix} ${ORDINALS_AR[order - 1] ?? order}`;
}

export function levelFullName(track: LevelTrack, order: number): string {
  const ordinal = ORDINALS_AR[order - 1] ?? String(order);
  return track === 'preparatory'
    ? `المستوى التمهيدي ال${ordinal}`
    : `المستوى ال${ordinal} مطور`;
}

export function isLevelTrack(value: unknown): value is LevelTrack {
  return typeof value === 'string' && (LEVEL_TRACKS as readonly string[]).includes(value);
}

export function isStudentTrack(value: unknown): value is StudentTrack {
  return typeof value === 'string' && (STUDENT_TRACKS as readonly string[]).includes(value);
}

/** هل يتطلب المسار اختيار مستوى؟ */
export function trackRequiresLevel(track: StudentTrack): track is LevelTrack {
  return track === 'preparatory' || track === 'mutor';
}

export function isValidLevelOrder(track: LevelTrack, order: number): boolean {
  const range = LEVEL_TRACK_RANGES[track];
  return Number.isInteger(order) && order >= range.min && order <= range.max;
}
