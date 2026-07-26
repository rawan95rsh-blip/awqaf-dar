export const SUBJECT_NAMES = [
  'السيرة',
  'العقيدة',
  'الحديث',
  'التجويد',
  'القران',
  'التفسير',
  'النحو',
] as const;

export type SubjectName = (typeof SUBJECT_NAMES)[number];

export const SUBJECT_COUNT = SUBJECT_NAMES.length;

export function getSubjectName(subjectIndex: number): string {
  return SUBJECT_NAMES[subjectIndex] ?? SUBJECT_NAMES[0];
}
