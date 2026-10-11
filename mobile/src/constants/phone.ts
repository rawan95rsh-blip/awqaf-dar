/** مفاتيح الدول وأطوال الأرقام — مطابقة للخادم (backend/src/utils/phone.ts) */
export type PhoneCountry = {
  iso: string;
  dialCode: string;
  nameAr: string;
  flag: string;
  lengths: number[];
  example: string;
};

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { iso: "KW", dialCode: "965", nameAr: "الكويت", flag: "🇰🇼", lengths: [8], example: "5XXXXXXX" },
  { iso: "SA", dialCode: "966", nameAr: "السعودية", flag: "🇸🇦", lengths: [9], example: "5XXXXXXXX" },
  { iso: "AE", dialCode: "971", nameAr: "الإمارات", flag: "🇦🇪", lengths: [9], example: "5XXXXXXXX" },
  { iso: "QA", dialCode: "974", nameAr: "قطر", flag: "🇶🇦", lengths: [8], example: "XXXXXXXX" },
  { iso: "BH", dialCode: "973", nameAr: "البحرين", flag: "🇧🇭", lengths: [8], example: "XXXXXXXX" },
  { iso: "OM", dialCode: "968", nameAr: "عُمان", flag: "🇴🇲", lengths: [8], example: "9XXXXXXX" },
  { iso: "EG", dialCode: "20", nameAr: "مصر", flag: "🇪🇬", lengths: [10], example: "1XXXXXXXXX" },
  { iso: "JO", dialCode: "962", nameAr: "الأردن", flag: "🇯🇴", lengths: [9], example: "7XXXXXXXX" },
  { iso: "SY", dialCode: "963", nameAr: "سوريا", flag: "🇸🇾", lengths: [9], example: "9XXXXXXXX" },
  { iso: "LB", dialCode: "961", nameAr: "لبنان", flag: "🇱🇧", lengths: [7, 8], example: "XXXXXXXX" },
  { iso: "IQ", dialCode: "964", nameAr: "العراق", flag: "🇮🇶", lengths: [10], example: "7XXXXXXXXX" },
  { iso: "PS", dialCode: "970", nameAr: "فلسطين", flag: "🇵🇸", lengths: [9], example: "5XXXXXXXX" },
  { iso: "YE", dialCode: "967", nameAr: "اليمن", flag: "🇾🇪", lengths: [9], example: "7XXXXXXXX" },
  { iso: "SD", dialCode: "249", nameAr: "السودان", flag: "🇸🇩", lengths: [9], example: "9XXXXXXXX" },
];

export const DEFAULT_COUNTRY = PHONE_COUNTRIES[0];

export function findCountry(dialCode: string): PhoneCountry {
  return PHONE_COUNTRIES.find((c) => c.dialCode === dialCode) ?? DEFAULT_COUNTRY;
}

/** تحويل الأرقام العربية إلى لاتينية وحذف غير الأرقام */
export function toLatinDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/\D/g, "");
}

export function validatePhone(national: string, country: PhoneCountry): string | null {
  const digits = toLatinDigits(national);
  if (!digits) return "أدخلي رقم الهاتف";
  if (!country.lengths.includes(digits.length)) {
    return `رقم ${country.nameAr} يتكون من ${country.lengths.join(" أو ")} أرقام`;
  }
  if (country.iso === "KW" && !/^[124569]/.test(digits)) return "رقم الهاتف الكويتي غير صالح";
  return null;
}

/** الصيغة الدولية المخزنة في الخادم: 96551234567 */
export function toInternational(national: string, country: PhoneCountry): string {
  return `${country.dialCode}${toLatinDigits(national)}`;
}

/** عرض: ‎+965 5123 4567 */
export function formatPhone(stored: string | null | undefined): string {
  if (!stored) return "—";
  const country = PHONE_COUNTRIES.find(
    (c) => stored.startsWith(c.dialCode) && c.lengths.includes(stored.length - c.dialCode.length)
  );
  if (!country) return stored;
  const national = stored.slice(country.dialCode.length);
  const grouped = national.length === 8 ? `${national.slice(0, 4)} ${national.slice(4)}` : national;
  return `‎+${country.dialCode} ${grouped}`;
}

/** يفصل الرقم المخزن إلى مفتاح دولة + رقم محلي (للتعديل) */
export function splitStoredPhone(stored: string | null | undefined): { country: PhoneCountry; national: string } {
  if (!stored) return { country: DEFAULT_COUNTRY, national: "" };
  const country = PHONE_COUNTRIES.find(
    (c) => stored.startsWith(c.dialCode) && c.lengths.includes(stored.length - c.dialCode.length)
  );
  if (!country) return { country: DEFAULT_COUNTRY, national: stored };
  return { country, national: stored.slice(country.dialCode.length) };
}
