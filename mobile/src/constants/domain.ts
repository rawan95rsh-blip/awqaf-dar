/**
 * ثوابت المجال — مطابقة للخادم.
 * المسارات: تمهيدي (١–٦) / مطور (١–٨) / دورات / أخرى
 */
import type { MaterialCommunityIcons } from "@expo/vector-icons";
import type { Tone } from "@/src/theme";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

export type SelectOption = { id: string; label: string; description?: string };

// ———— المسارات والمستويات ————

export type LevelTrack = "preparatory" | "mutor";
export type StudentTrack = LevelTrack | "courses" | "other";
export type ClassTrack = LevelTrack | "courses";

export const TRACK_LABELS: Record<StudentTrack, string> = {
  preparatory: "تمهيدي",
  mutor: "مطور",
  courses: "دورات",
  other: "أخرى",
};

export const TRACK_OPTIONS: Array<{ id: StudentTrack; label: string; description: string; icon: IconName }> = [
  { id: "preparatory", label: "تمهيدي", description: "من تمهيدي أول إلى سادس", icon: "sprout-outline" },
  { id: "mutor", label: "مطور", description: "من مطور أول إلى ثامن", icon: "book-open-page-variant-outline" },
  { id: "courses", label: "دورات", description: "دورات علمية قصيرة", icon: "certificate-outline" },
  { id: "other", label: "أخرى", description: "مسار آخر توضّحينه", icon: "dots-horizontal-circle-outline" },
];

export const CLASS_TRACK_LABELS: Record<ClassTrack, string> = {
  preparatory: "تمهيدي",
  mutor: "مطور",
  courses: "دورة",
};

export function trackRequiresLevel(track: StudentTrack | null | undefined): track is LevelTrack {
  return track === "preparatory" || track === "mutor";
}

// ———— المؤهل الدراسي ————

export const ACADEMIC_LEVEL_OPTIONS: SelectOption[] = [
  { id: "none", label: "لا يوجد" },
  { id: "primary", label: "ابتدائي" },
  { id: "middle", label: "متوسط" },
  { id: "high", label: "ثانوي" },
  { id: "diploma", label: "دبلوم" },
  { id: "university", label: "بكالوريوس" },
  { id: "masters", label: "ماجستير" },
  { id: "phd", label: "دكتوراه" },
  { id: "other", label: "أخرى" },
];

const LEGACY_ACADEMIC: Record<string, string> = { postgraduate: "دراسات عليا" };

export function academicLevelLabel(id?: string | null): string {
  if (!id) return "—";
  return ACADEMIC_LEVEL_OPTIONS.find((o) => o.id === id)?.label ?? LEGACY_ACADEMIC[id] ?? id;
}

// ———— الجنسية ————

export const NATIONALITY_OPTIONS: SelectOption[] = [
  { id: "KW", label: "كويتية" },
  { id: "BIDOON", label: "غير محددي الجنسية" },
  { id: "SA", label: "سعودية" },
  { id: "AE", label: "إماراتية" },
  { id: "QA", label: "قطرية" },
  { id: "BH", label: "بحرينية" },
  { id: "OM", label: "عُمانية" },
  { id: "EG", label: "مصرية" },
  { id: "JO", label: "أردنية" },
  { id: "SY", label: "سورية" },
  { id: "IQ", label: "عراقية" },
  { id: "PS", label: "فلسطينية" },
  { id: "LB", label: "لبنانية" },
  { id: "YE", label: "يمنية" },
  { id: "SD", label: "سودانية" },
  { id: "MA", label: "مغربية" },
  { id: "TN", label: "تونسية" },
  { id: "DZ", label: "جزائرية" },
  { id: "OTHER", label: "أخرى" },
];

export function nationalityLabel(id?: string | null): string {
  if (!id) return "—";
  return NATIONALITY_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

// ———— الوظيفة الحالية ————

export type Occupation = "housewife" | "employee" | "retired" | "student" | "other";

export const OCCUPATION_OPTIONS: Array<{ id: Occupation; label: string; icon: IconName }> = [
  { id: "housewife", label: "ربة منزل", icon: "home-heart" },
  { id: "employee", label: "موظفة", icon: "briefcase-outline" },
  { id: "retired", label: "متقاعدة", icon: "sofa-outline" },
  { id: "student", label: "طالبة", icon: "school-outline" },
  { id: "other", label: "أخرى", icon: "dots-horizontal" },
];

export function occupationLabel(id?: string | null, other?: string | null): string {
  if (!id) return "—";
  if (id === "other") return other?.trim() ? other : "أخرى";
  return OCCUPATION_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

// ———— مستجدة / مستمرة ————

export type StudentType = "new" | "continuing";

export const STUDENT_TYPE_OPTIONS: Array<{ id: StudentType; label: string; icon: IconName }> = [
  { id: "new", label: "مستجدة", icon: "star-four-points-outline" },
  { id: "continuing", label: "مستمرة", icon: "progress-check" },
];

export const STUDENT_TYPE_LABELS: Record<StudentType, string> = { new: "مستجدة", continuing: "مستمرة" };

// ———— حالة القيد ————

export type EnrollmentStatus = "enrolled" | "graduated" | "suspended";

export const ENROLLMENT_LABELS: Record<EnrollmentStatus, string> = {
  enrolled: "مسجّلة",
  graduated: "خريجة",
  suspended: "موقوفة القيد",
};

export const ENROLLMENT_TONES: Record<EnrollmentStatus, Tone> = {
  enrolled: "success",
  graduated: "accent",
  suspended: "danger",
};

export const ENROLLMENT_ACTION_LABELS: Record<string, string> = {
  registered: "تسجيل في المركز",
  suspended: "وقف القيد",
  reinstated: "إعادة القيد",
  graduated: "تخرّج",
  promoted: "ترقية مستوى",
  level_changed: "تغيير المستوى",
  transferred_in: "نقل إلى المركز",
  transferred_out: "نقل من المركز",
};

// ———— الأداء ————

export type StudentStatus = "regular" | "frequent_absence" | "warning" | "excellent";

export const PERFORMANCE: Record<StudentStatus, { label: string; tone: Tone; icon: IconName }> = {
  excellent: { label: "متفوقة", tone: "accent", icon: "star" },
  regular: { label: "منتظمة", tone: "success", icon: "check" },
  warning: { label: "تحتاج متابعة", tone: "warning", icon: "alert-outline" },
  frequent_absence: { label: "غياب متكرر", tone: "danger", icon: "calendar-remove-outline" },
};

// ———— الجنس ————

export type Gender = "female" | "male";

export const GENDER_OPTIONS: Array<{ id: Gender; label: string; icon: IconName }> = [
  { id: "female", label: "أنثى", icon: "human-female" },
  { id: "male", label: "ذكر", icon: "human-male" },
];

export const CENTER_AUDIENCE_LABELS: Record<Gender, string> = { female: "نسائي", male: "رجالي" };

// ———— المواد ————

export const SUBJECT_NAMES = ["السيرة", "العقيدة", "الحديث", "التجويد", "القرآن", "التفسير", "النحو"] as const;

export const SUBJECT_ICONS: IconName[] = [
  "account-star-outline",
  "star-crescent",
  "script-text-outline",
  "microphone-outline",
  "book-open-variant",
  "lightbulb-on-outline",
  "format-letter-case",
];

export function subjectName(index: number): string {
  return SUBJECT_NAMES[index] ?? SUBJECT_NAMES[0];
}

export const WEEKDAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"] as const;
export const WEEKDAYS_SHORT = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"] as const;

// ———— المرفقات ————

export type DocumentKind = "civilId" | "photo" | "qualification";

export const DOCUMENT_META: Record<DocumentKind, { label: string; description: string; icon: IconName }> = {
  civilId: {
    label: "صورة البطاقة المدنية",
    description: "الوجه الأمامي واضح وكامل",
    icon: "card-account-details-outline",
  },
  photo: {
    label: "الصورة الشخصية",
    description: "صورة حديثة بخلفية فاتحة",
    icon: "account-box-outline",
  },
  qualification: {
    label: "صورة آخر مؤهل دراسي",
    description: "الشهادة أو كشف الدرجات",
    icon: "school-outline",
  },
};

export const CIVIL_ID_LENGTH = 12;

export function validateCivilId(value: string): string | null {
  if (!value) return "أدخلي الرقم المدني";
  if (!/^\d{12}$/.test(value)) return "الرقم المدني يتكون من 12 رقماً";
  return null;
}

export const PASSWORD_HINT = "6 أرقام على الأقل";

export function validatePassword(value: string): string | null {
  if (!value) return "أدخلي كلمة المرور";
  if (!/^\d{6,}$/.test(value)) return "كلمة المرور أرقام فقط — 6 أرقام على الأقل";
  return null;
}
