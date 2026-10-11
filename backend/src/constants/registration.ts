export const VALID_NATIONALITIES = [
  'KW',
  'SA',
  'AE',
  'QA',
  'BH',
  'OM',
  'EG',
  'JO',
  'SY',
  'IQ',
  'PS',
  'LB',
  'YE',
  'SD',
  'MA',
  'TN',
  'DZ',
  'BIDOON',
  'OTHER',
] as const;

export type NationalityCode = (typeof VALID_NATIONALITIES)[number];

/** المؤهل الدراسي — القيم القديمة (middle/high/university/postgraduate) ما زالت صالحة */
export const VALID_ACADEMIC_LEVELS = [
  'none',
  'primary',
  'middle',
  'high',
  'diploma',
  'university',
  'masters',
  'phd',
  'postgraduate',
  'other',
] as const;

export type AcademicLevel = (typeof VALID_ACADEMIC_LEVELS)[number];

export const ACADEMIC_LEVEL_LABELS_AR: Record<AcademicLevel, string> = {
  none: 'لا يوجد',
  primary: 'ابتدائي',
  middle: 'متوسط',
  high: 'ثانوي',
  diploma: 'دبلوم',
  university: 'بكالوريوس',
  masters: 'ماجستير',
  phd: 'دكتوراه',
  postgraduate: 'دراسات عليا',
  other: 'أخرى',
};

/** الوظيفة الحالية */
export const OCCUPATIONS = ['housewife', 'employee', 'retired', 'student', 'other'] as const;
export type Occupation = (typeof OCCUPATIONS)[number];

export const OCCUPATION_LABELS_AR: Record<Occupation, string> = {
  housewife: 'ربة منزل',
  employee: 'موظفة',
  retired: 'متقاعدة',
  student: 'طالبة',
  other: 'أخرى',
};

/** مستجدة / مستمرة */
export const STUDENT_TYPES = ['new', 'continuing'] as const;
export type StudentType = (typeof STUDENT_TYPES)[number];

export const STUDENT_TYPE_LABELS_AR: Record<StudentType, string> = {
  new: 'مستجدة',
  continuing: 'مستمرة',
};

export function isValidNationality(value: unknown): value is NationalityCode {
  return typeof value === 'string' && (VALID_NATIONALITIES as readonly string[]).includes(value);
}

export function isValidAcademicLevel(value: unknown): value is AcademicLevel {
  return typeof value === 'string' && (VALID_ACADEMIC_LEVELS as readonly string[]).includes(value);
}

export function isOccupation(value: unknown): value is Occupation {
  return typeof value === 'string' && (OCCUPATIONS as readonly string[]).includes(value);
}

export function isStudentType(value: unknown): value is StudentType {
  return typeof value === 'string' && (STUDENT_TYPES as readonly string[]).includes(value);
}

/** عنوان السكن (صيغة الكويت: المنطقة / القطعة / الشارع / الجادة / المنزل) */
export type HomeAddress = {
  area: string;
  block?: string;
  street?: string;
  avenue?: string;
  house?: string;
};

export const NOTES_MAX_LENGTH = 1000;
