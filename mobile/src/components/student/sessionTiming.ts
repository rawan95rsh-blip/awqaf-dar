import type { Tone } from "@/src/theme";
import type { SessionItem } from "@/src/types/session";
import { formatTime, formatWeekday, formatDateShort, toDateKey, addDays } from "@/src/utils/format";

/** مطابق للخادم: التحضير متاح قبل الحصة بـ 15 دقيقة وحتى نهايتها */
export const CHECK_IN_EARLY_MINUTES = 15;

export type SessionPhase = "cancelled" | "upcoming" | "checkin" | "live" | "ended";

export function sessionPhase(session: Pick<SessionItem, "status" | "startAt" | "endAt">, now = new Date()): SessionPhase {
  if (session.status === "cancelled") return "cancelled";
  const start = new Date(session.startAt).getTime();
  const end = new Date(session.endAt).getTime();
  const ts = now.getTime();
  if (session.status === "completed" || ts > end) return "ended";
  if (ts >= start) return "live";
  if (ts >= start - CHECK_IN_EARLY_MINUTES * 60_000) return "checkin";
  return "upcoming";
}

/** نافذة التحضير الذاتي مفتوحة الآن؟ (تقدير محلي — الخادم هو المرجع) */
export function isCheckInWindowOpen(session: Pick<SessionItem, "status" | "startAt" | "endAt">, now = new Date()) {
  const phase = sessionPhase(session, now);
  return phase === "checkin" || phase === "live";
}

/** «دقيقة / دقيقتان / 3 دقائق / 15 دقيقة» */
export function minutesLabel(n: number): string {
  if (n <= 1) return "دقيقة";
  if (n === 2) return "دقيقتين";
  if (n <= 10) return `${n} دقائق`;
  return `${n} دقيقة`;
}

function hoursLabel(n: number): string {
  if (n <= 1) return "ساعة";
  if (n === 2) return "ساعتين";
  if (n <= 10) return `${n} ساعات`;
  return `${n} ساعة`;
}

/** متى الحصة؟ «اليوم» / «غداً» / «الإثنين 14 أكتوبر» */
export function dayLabel(iso: string, now = new Date()): string {
  const key = toDateKey(new Date(iso));
  if (key === toDateKey(now)) return "اليوم";
  if (key === toDateKey(addDays(now, 1))) return "غداً";
  return `${formatWeekday(iso)} ${formatDateShort(iso)}`;
}

/** وصف حيّ للحالة الزمنية للحصة */
export function countdownLabel(session: Pick<SessionItem, "status" | "startAt" | "endAt">, now = new Date()): {
  text: string;
  tone: Tone;
} {
  const phase = sessionPhase(session, now);
  const start = new Date(session.startAt).getTime();
  const end = new Date(session.endAt).getTime();
  switch (phase) {
    case "cancelled":
      return { text: "ملغاة", tone: "danger" };
    case "ended":
      return { text: "انتهت", tone: "neutral" };
    case "live": {
      const left = Math.max(1, Math.round((end - now.getTime()) / 60_000));
      return { text: `جارية الآن · تنتهي بعد ${minutesLabel(left)}`, tone: "success" };
    }
    case "checkin": {
      const until = Math.max(1, Math.round((start - now.getTime()) / 60_000));
      return { text: `تبدأ بعد ${minutesLabel(until)}`, tone: "accent" };
    }
    default: {
      const minutes = Math.round((start - now.getTime()) / 60_000);
      if (minutes < 60) return { text: `تبدأ بعد ${minutesLabel(minutes)}`, tone: "primary" };
      if (minutes < 6 * 60) return { text: `تبدأ بعد ${hoursLabel(Math.round(minutes / 60))}`, tone: "primary" };
      return { text: `${dayLabel(session.startAt, now)} · ${formatTime(session.startAt)}`, tone: "primary" };
    }
  }
}
