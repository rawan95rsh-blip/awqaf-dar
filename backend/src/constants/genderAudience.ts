/** نوع المركز (نسائي / رجالي فقط — لا مختلط) */
export const GENDER_AUDIENCE_VALUES = ['female', 'male'] as const;

export type GenderAudience = (typeof GENDER_AUDIENCE_VALUES)[number];

/** جنس المتقدم للتسجيل */
export const STUDENT_GENDER_VALUES = ['female', 'male'] as const;

export type StudentGender = (typeof STUDENT_GENDER_VALUES)[number];

export const GENDER_AUDIENCE_LABELS: Record<GenderAudience, string> = {
  female: 'نسائي',
  male: 'رجالي',
};

export const STUDENT_GENDER_LABELS: Record<StudentGender, string> = {
  female: 'أنثى',
  male: 'ذكر',
};

export function isGenderAudience(value: unknown): value is GenderAudience {
  return (
    typeof value === 'string' &&
    (GENDER_AUDIENCE_VALUES as readonly string[]).includes(value)
  );
}

export function isStudentGender(value: unknown): value is StudentGender {
  return (
    typeof value === 'string' &&
    (STUDENT_GENDER_VALUES as readonly string[]).includes(value)
  );
}

/** فلتر المراكز: تطابق مباشر — أنثى→نسائي، ذكر→رجالي */
export function genderAudienceFilter(
  audience: string | undefined
): { genderAudience: GenderAudience } | Record<string, never> {
  if (!audience || audience === 'all') {
    return {};
  }

  if (audience === 'female' || audience === 'male') {
    return { genderAudience: audience };
  }

  throw new Error('INVALID_AUDIENCE');
}

/** هل جنس المتقدم متوافق مع نوع المركز؟ */
export function isGenderCompatibleWithCenter(
  gender: StudentGender,
  centerAudience: string | null | undefined
): boolean {
  return centerAudience === gender;
}
