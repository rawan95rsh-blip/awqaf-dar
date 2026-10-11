/** تنسيقات العرض الموحّدة (تواريخ عربية بأرقام لاتينية — مألوفة في الكويت) */

const LOCALE = "ar-KW-u-nu-latn";

export function formatDateLong(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(LOCALE, { year: "numeric", month: "long", day: "numeric" });
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(LOCALE, { day: "numeric", month: "short" });
}

export function formatWeekday(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(LOCALE, { weekday: "long" });
}

export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString(LOCALE, { hour: "numeric", minute: "2-digit" });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return `${formatWeekday(d)} ${formatDateShort(d)} · ${formatTime(d)}`;
}

/** "14:30" → "2:30 م" */
export function formatHHMM(value: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return value;
  const h = Number(match[1]);
  const period = h >= 12 ? "م" : "ص";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${match[2]} ${period}`;
}

/** YYYY-MM-DD بالتوقيت المحلي */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `قبل ${minutes} د`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `قبل ${hours} س`;
  const days = Math.round(hours / 24);
  if (days < 7) return `قبل ${days} يوم`;
  return formatDateShort(iso);
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 12) return "صباح الخير";
  return "مساء الخير";
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function percent(value: number | null | undefined): string {
  return value == null ? "—" : `${value}%`;
}
