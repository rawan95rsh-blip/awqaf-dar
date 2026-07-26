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
  'OTHER',
] as const;

export type NationalityCode = (typeof VALID_NATIONALITIES)[number];

export const VALID_ACADEMIC_LEVELS = [
  'none',
  'middle',
  'high',
  'university',
  'postgraduate',
  'other',
] as const;

export type AcademicLevel = (typeof VALID_ACADEMIC_LEVELS)[number];

export function isValidNationality(value: string): value is NationalityCode {
  return (VALID_NATIONALITIES as readonly string[]).includes(value);
}

export function isValidAcademicLevel(value: string): value is AcademicLevel {
  return (VALID_ACADEMIC_LEVELS as readonly string[]).includes(value);
}
