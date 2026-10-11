/**
 * توقيت المراكز — الكويت UTC+03:00 بلا توقيت صيفي.
 * يمكن تغييره عبر CENTER_TZ_OFFSET_MINUTES.
 */
export function centerOffsetMinutes(): number {
  const raw = Number(process.env.CENTER_TZ_OFFSET_MINUTES);
  return Number.isFinite(raw) ? raw : 180;
}

export type CenterDateParts = {
  year: number;
  /** 0-based */
  month: number;
  day: number;
  weekday: number;
  hours: number;
  minutes: number;
};

/** مكونات التاريخ كما تظهر على ساعة المركز */
export function centerDateParts(date: Date): CenterDateParts {
  const shifted = new Date(date.getTime() + centerOffsetMinutes() * 60 * 1000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
  };
}

/** تحويل وقت محلي (بتوقيت المركز) إلى Date بتوقيت UTC */
export function zonedDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hours = 0,
  minutes = 0
): Date {
  const utcMs = Date.UTC(year, month, day, hours, minutes) - centerOffsetMinutes() * 60 * 1000;
  return new Date(utcMs);
}

/** مفتاح اليوم YYYY-MM-DD بتوقيت المركز */
export function centerDateKey(date: Date): string {
  const p = centerDateParts(date);
  return `${p.year}-${String(p.month + 1).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** بداية اليوم (بتوقيت المركز) لتاريخ معيّن */
export function startOfCenterDay(date: Date): Date {
  const p = centerDateParts(date);
  return zonedDateTimeToUtc(p.year, p.month, p.day);
}

/** يحوّل "YYYY-MM-DD" إلى بداية اليوم بتوقيت المركز */
export function parseCenterDateKey(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = zonedDateTimeToUtc(year, month, day);
  return Number.isNaN(date.getTime()) ? null : date;
}
