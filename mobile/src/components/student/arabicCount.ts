/**
 * صياغة العدد مع المعدود بالعربية:
 * 1 → «مادة واحدة»، 2 → «مادتان»، 3–10 → «3 مواد»، 11+ → «11 مادة»
 */
export function countLabel(
  n: number,
  forms: { one: string; two: string; few: string; many: string }
): string {
  if (n === 1) return forms.one;
  if (n === 2) return forms.two;
  if (n >= 3 && n <= 10) return `${n} ${forms.few}`;
  return `${n} ${forms.many}`;
}

export const SUBJECT_FORMS = { one: "مادة واحدة", two: "مادتين", few: "مواد", many: "مادة" };
export const DAY_FORMS = { one: "يوماً واحداً", two: "يومين", few: "أيام", many: "يوماً" };
export const SESSION_FORMS = { one: "حصة واحدة", two: "حصتان", few: "حصص", many: "حصة" };
