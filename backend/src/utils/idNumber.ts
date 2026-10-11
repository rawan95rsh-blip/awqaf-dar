/** الرقم المدني الكويتي: 12 رقماً */
export const KUWAIT_CIVIL_ID_REGEX = /^\d{12}$/;
export const KUWAIT_CIVIL_ID_LENGTH = 12;

export const KUWAIT_CIVIL_ID_ERROR_AR = 'الرقم المدني يجب أن يكون 12 رقماً';

export const KUWAIT_CIVIL_ID_LABEL_AR = 'الرقم المدني';

export function isKuwaitCivilId(value: string): boolean {
  return KUWAIT_CIVIL_ID_REGEX.test(value);
}

export function normalizeIdNumber(idNumber: string): string {
  return idNumber
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/\D/g, '');
}
