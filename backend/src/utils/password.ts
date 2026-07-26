/** كلمة المرور: أرقام فقط، 6 أرقام على الأقل */
export const PASSWORD_DIGITS_REGEX = /^\d{6,}$/;

export const PASSWORD_DIGITS_ERROR_AR =
  'كلمة المرور يجب أن تكون أرقاماً فقط وبحد أدنى 6 أرقام';

export function isDigitsOnlyPassword(password: string): boolean {
  return PASSWORD_DIGITS_REGEX.test(password);
}
