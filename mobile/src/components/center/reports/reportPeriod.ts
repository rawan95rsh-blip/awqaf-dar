import { addDays, formatDateLong, formatDateShort, startOfWeek, toDateKey } from "@/src/utils/format";

export type ReportPeriod = "daily" | "weekly" | "monthly";

export const PERIOD_LABELS: Record<ReportPeriod, string> = {
  daily: "يومي",
  weekly: "أسبوعي",
  monthly: "شهري",
};

export const PERIOD_ANCHOR_LABELS: Record<ReportPeriod, string> = {
  daily: "اليوم",
  weekly: "أي يوم من الأسبوع",
  monthly: "أي يوم من الشهر",
};

export type PeriodRange = { from: Date; to: Date; fromKey: string; toKey: string; label: string };

/**
 * نطاق التقرير من تاريخ مرجعي:
 * يومي = ذلك اليوم · أسبوعي = الأحد → السبت · شهري = أول الشهر → آخره
 */
export function periodRange(period: ReportPeriod, anchor: Date): PeriodRange {
  let from: Date;
  let to: Date;
  if (period === "daily") {
    from = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
    to = from;
  } else if (period === "weekly") {
    from = startOfWeek(anchor);
    to = addDays(from, 6);
  } else {
    from = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    to = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  }
  const label =
    period === "daily" ? formatDateLong(from) : `${formatDateShort(from)} — ${formatDateLong(to)}`;
  return { from, to, fromKey: toDateKey(from), toKey: toDateKey(to), label };
}
