import { centerDateParts, zonedDateTimeToUtc } from '../utils/timezone';

/** نوع الفصل: تمهيدي / مطور مرتبطان بمستوى، والدورة عامة */
export const CLASS_TRACKS = ['preparatory', 'mutor', 'courses'] as const;
export type ClassTrack = (typeof CLASS_TRACKS)[number];

export function isClassTrack(value: unknown): value is ClassTrack {
  return typeof value === 'string' && (CLASS_TRACKS as readonly string[]).includes(value);
}

export const CLASS_TRACK_LABELS_AR: Record<ClassTrack, string> = {
  preparatory: 'تمهيدي',
  mutor: 'مطور',
  courses: 'دورة',
};

export const WEEKDAY_LABELS_AR = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
] as const;

export type TimeOfDay = { hours: number; minutes: number; formatted: string };

export function parseTimeHHMM(value: unknown): TimeOfDay | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return {
    hours,
    minutes,
    formatted: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
  };
}

export function minutesOf(time: { hours: number; minutes: number }): number {
  return time.hours * 60 + time.minutes;
}

/**
 * أقرب وقوع قادم ليوم الأسبوع والوقت — محسوب بتوقيت المركز (الكويت)
 * وليس بتوقيت الخادم، حتى لا تنزاح الحصص ٣ ساعات على خوادم UTC.
 */
export function nextOccurrence(
  weekday: number,
  start: { hours: number; minutes: number },
  end: { hours: number; minutes: number },
  now = new Date()
): { startAt: Date; endAt: Date } {
  const today = centerDateParts(now);
  const dayDiff = (weekday - today.weekday + 7) % 7;
  let startAt = zonedDateTimeToUtc(today.year, today.month, today.day + dayDiff, start.hours, start.minutes);
  if (startAt.getTime() <= now.getTime()) {
    startAt = new Date(startAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
  const durationMinutes = (minutesOf(end) - minutesOf(start) + 24 * 60) % (24 * 60) || 60;
  const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);
  return { startAt, endAt };
}
