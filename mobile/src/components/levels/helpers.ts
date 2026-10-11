/**
 * أدوات مشتركة لشاشات المستويات والفصول والمواد (عرض فقط — لا منطق خادم).
 */
import type { MaterialCommunityIcons } from "@expo/vector-icons";
import type { Tone } from "@/src/theme";
import { GRADE_LABELS, GRADE_WEIGHTS, type GradeWeights } from "@/src/constants/grades";
import type { LevelTrack } from "@/src/constants/domain";
import { formatHHMM } from "@/src/utils/format";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

// ———— العدّ بالعربية ————

/** «طالبة واحدة» / «طالبتان» / «5 طالبات» / «12 طالبة» */
export function studentsCountLabel(count: number): string {
  if (count <= 0) return "لا طالبات";
  if (count === 1) return "طالبة واحدة";
  if (count === 2) return "طالبتان";
  if (count <= 10) return `${count} طالبات`;
  return `${count} طالبة`;
}

// ———— المستويات ————

export const TRACK_ICONS: Record<LevelTrack, IconName> = {
  preparatory: "sprout-outline",
  mutor: "book-open-page-variant-outline",
};

export const TRACK_RANGES: Record<LevelTrack, number> = { preparatory: 6, mutor: 8 };

const ORDINALS = ["أول", "ثاني", "ثالث", "رابع", "خامس", "سادس", "سابع", "ثامن", "تاسع", "عاشر"] as const;

/** مطابق لتسمية الخادم: «تمهيدي أول» / «مطور ثامن» */
export function suggestedShortName(track: LevelTrack, order: number): string {
  const prefix = track === "preparatory" ? "تمهيدي" : "مطور";
  return `${prefix} ${ORDINALS[order - 1] ?? order}`;
}

/** مطابق لتسمية الخادم: «المستوى التمهيدي الأول» / «المستوى الأول مطور» */
export function suggestedFullName(track: LevelTrack, order: number): string {
  const ordinal = ORDINALS[order - 1] ?? String(order);
  return track === "preparatory" ? `المستوى التمهيدي ال${ordinal}` : `المستوى ال${ordinal} مطور`;
}

// ———— الدرجات ————

export const WEIGHT_FIELDS: Array<{ key: keyof GradeWeights; label: string; short: string; icon: IconName }> = [
  { key: "attendance", label: "الحضور", short: "حضور", icon: "account-check-outline" },
  { key: "shortExam", label: "اختبار قصير", short: "قصير", icon: "file-document-edit-outline" },
  { key: "participation", label: "المشاركة", short: "مشاركة", icon: "hand-back-right-outline" },
  { key: "final", label: "الاختبار النهائي", short: "نهائي", icon: "certificate-outline" },
];

export const DEFAULT_WEIGHTS: GradeWeights = { ...GRADE_WEIGHTS };

export function sumWeights(w: GradeWeights): number {
  return w.attendance + w.shortExam + w.participation + w.final;
}

export function gradeLabel(total: number): string {
  return (GRADE_LABELS.find((g) => total >= g.min) ?? GRADE_LABELS[GRADE_LABELS.length - 1]).label;
}

/** لون التقدير من رموز النظام (بدل ألوان مكتوبة يدوياً) */
export function gradeTone(total: number | null | undefined): Tone {
  if (total == null) return "neutral";
  if (total >= 90) return "success";
  if (total >= 80) return "primary";
  if (total >= 70) return "info";
  if (total >= 60) return "warning";
  return "danger";
}

/** يحوّل نص الإدخال (يقبل الأرقام العربية) إلى رقم صحيح بين 0 والحد الأعلى */
export function parseScore(text: string, max: number): number {
  const digits = text
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/\D/g, "");
  if (!digits) return 0;
  return Math.min(max, Math.max(0, Number.parseInt(digits, 10)));
}

// ———— الأوقات ————

const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

export function isValidTime(value: string): boolean {
  return TIME_RE.test(value.trim());
}

export function minutesOf(value: string): number {
  const match = TIME_RE.exec(value.trim());
  if (!match) return NaN;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** "9:5" ← لا؛ "9:05" → "09:05" */
export function normalizeTime(value: string): string {
  const match = TIME_RE.exec(value.trim());
  if (!match) return value.trim();
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

export function timeRangeLabel(start: string, end: string): string {
  return `${formatHHMM(start)} – ${formatHHMM(end)}`;
}

export function durationLabel(start: string, end: string): string | null {
  const diff = minutesOf(end) - minutesOf(start);
  if (!Number.isFinite(diff) || diff <= 0) return null;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  if (h && m) return `${h} س و ${m} د`;
  if (h) return h === 1 ? "ساعة" : h === 2 ? "ساعتان" : `${h} ساعات`;
  return `${m} دقيقة`;
}

// ———— التواريخ (مفتاح YYYY-MM-DD) ————

/** منتصف النهار المحلي — يتجنّب انزياح اليوم عند التحويل إلى UTC */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12);
}

export function isDateKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}
