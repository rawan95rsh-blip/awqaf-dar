/** رقم الهوية المدنية الكويتية: 12 رقماً */
export const KUWAIT_CIVIL_ID_REGEX = /^\d{12}$/;
export const KUWAIT_CIVIL_ID_LENGTH = 12;

export const KUWAIT_CIVIL_ID_ERROR_AR =
  'رقم الهوية المدنية يجب أن يكون 12 رقماً';

export const KUWAIT_CIVIL_ID_LABEL_AR = 'رقم الهوية المدنية';

export function isKuwaitCivilId(value: string): boolean {
  return KUWAIT_CIVIL_ID_REGEX.test(value);
}

export function normalizeIdNumber(idNumber: string): string {
  return idNumber.trim().replace(/\s/g, '');
}
