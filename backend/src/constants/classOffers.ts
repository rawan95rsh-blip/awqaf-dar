export const CLASS_TRACKS = ['mutor', 'courses'] as const;
export type ClassTrack = (typeof CLASS_TRACKS)[number];

export function isClassTrack(value: string): value is ClassTrack {
  return (CLASS_TRACKS as readonly string[]).includes(value);
}

export const MUTOR_LEVEL_ORDER_MIN = 1;
export const MUTOR_LEVEL_ORDER_MAX = 8;

export function isMutorLevelOrder(order: number): boolean {
  return (
    Number.isInteger(order) &&
    order >= MUTOR_LEVEL_ORDER_MIN &&
    order <= MUTOR_LEVEL_ORDER_MAX
  );
}

export const WEEKDAY_LABELS_AR = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
] as const;

export function parseTimeHHMM(
  value: unknown
): { hours: number; minutes: number; formatted: string } | null {
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

/** أقرب وقوع قادم ليوم الأسبوع والوقت */
export function nextOccurrence(
  weekday: number,
  start: { hours: number; minutes: number },
  end: { hours: number; minutes: number }
): { startAt: Date; endAt: Date } {
  const now = new Date();
  const startAt = new Date(now);
  const dayDiff = (weekday - now.getDay() + 7) % 7;
  startAt.setDate(now.getDate() + dayDiff);
  startAt.setHours(start.hours, start.minutes, 0, 0);
  if (startAt.getTime() <= now.getTime()) {
    startAt.setDate(startAt.getDate() + 7);
  }

  const endAt = new Date(startAt);
  endAt.setHours(end.hours, end.minutes, 0, 0);
  if (endAt.getTime() <= startAt.getTime()) {
    endAt.setDate(endAt.getDate() + 1);
  }
  return { startAt, endAt };
}
