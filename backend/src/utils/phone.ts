/**
 * أرقام الهواتف — تُخزَّن بصيغة دولية أرقام فقط (مثال: 96551234567).
 * الكويت هي الافتراضية (8 أرقام)، مع دعم مفاتيح دول الخليج والدول العربية الشائعة.
 */
export type PhoneCountry = {
  iso: string;
  dialCode: string;
  nameAr: string;
  /** أطوال الرقم المحلي المسموحة (بدون مفتاح الدولة) */
  lengths: number[];
};

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { iso: 'KW', dialCode: '965', nameAr: 'الكويت', lengths: [8] },
  { iso: 'SA', dialCode: '966', nameAr: 'السعودية', lengths: [9] },
  { iso: 'AE', dialCode: '971', nameAr: 'الإمارات', lengths: [9] },
  { iso: 'QA', dialCode: '974', nameAr: 'قطر', lengths: [8] },
  { iso: 'BH', dialCode: '973', nameAr: 'البحرين', lengths: [8] },
  { iso: 'OM', dialCode: '968', nameAr: 'عُمان', lengths: [8] },
  { iso: 'EG', dialCode: '20', nameAr: 'مصر', lengths: [10] },
  { iso: 'JO', dialCode: '962', nameAr: 'الأردن', lengths: [9] },
  { iso: 'SY', dialCode: '963', nameAr: 'سوريا', lengths: [9] },
  { iso: 'LB', dialCode: '961', nameAr: 'لبنان', lengths: [7, 8] },
  { iso: 'IQ', dialCode: '964', nameAr: 'العراق', lengths: [10] },
  { iso: 'PS', dialCode: '970', nameAr: 'فلسطين', lengths: [9] },
  { iso: 'YE', dialCode: '967', nameAr: 'اليمن', lengths: [9] },
  { iso: 'SD', dialCode: '249', nameAr: 'السودان', lengths: [9] },
];

export const DEFAULT_DIAL_CODE = '965';

export const PHONE_STORED_REGEX = /^\d{8,15}$/;

function digitsOnly(value: string): string {
  // يحوّل الأرقام العربية/الفارسية إلى لاتينية ثم يحذف غير الأرقام
  return value
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/\D/g, '');
}

export type PhoneParseResult =
  | { ok: true; phone: string; dialCode: string; national: string }
  | { ok: false; error: string };

/**
 * يقبل: { countryCode: '965', phone: '51234567' } أو phone يبدأ بـ + / 00،
 * أو رقم كويتي محلي من 8 أرقام.
 */
export function parsePhoneInput(rawPhone: unknown, rawCountryCode?: unknown): PhoneParseResult {
  if (typeof rawPhone !== 'string' || !rawPhone.trim()) {
    return { ok: false, error: 'رقم الهاتف مطلوب' };
  }

  const trimmed = rawPhone.trim();
  let dialCode =
    typeof rawCountryCode === 'string' && digitsOnly(rawCountryCode)
      ? digitsOnly(rawCountryCode)
      : '';
  let national = digitsOnly(trimmed);

  const isInternational = trimmed.startsWith('+') || national.startsWith('00');
  if (!dialCode && isInternational) {
    const withoutPrefix = national.startsWith('00') ? national.slice(2) : national;
    const country = PHONE_COUNTRIES.find((c) => withoutPrefix.startsWith(c.dialCode));
    if (!country) {
      return { ok: false, error: 'مفتاح الدولة غير مدعوم' };
    }
    dialCode = country.dialCode;
    national = withoutPrefix.slice(country.dialCode.length);
  }

  if (!dialCode) dialCode = DEFAULT_DIAL_CODE;

  const country = PHONE_COUNTRIES.find((c) => c.dialCode === dialCode);
  if (!country) {
    return { ok: false, error: 'مفتاح الدولة غير مدعوم' };
  }

  // إزالة الصفر المحلي (مثل 05xxxxxxxx في السعودية)
  if (national.length === Math.max(...country.lengths) + 1 && national.startsWith('0')) {
    national = national.slice(1);
  }
  // إن أُدخل الرقم مع المفتاح داخل الحقل المحلي
  if (national.startsWith(country.dialCode) && !country.lengths.includes(national.length)) {
    national = national.slice(country.dialCode.length);
  }

  if (!country.lengths.includes(national.length)) {
    const len = country.lengths.join(' أو ');
    return {
      ok: false,
      error: `رقم الهاتف في ${country.nameAr} يجب أن يكون ${len} أرقام`,
    };
  }

  if (country.iso === 'KW' && !/^[124569]/.test(national)) {
    return { ok: false, error: 'رقم الهاتف الكويتي غير صالح' };
  }

  return { ok: true, phone: `${country.dialCode}${national}`, dialCode: country.dialCode, national };
}

/**
 * قيم البحث عند تسجيل الدخول — تدعم الأرقام القديمة المخزنة بدون مفتاح الدولة.
 */
export function phoneLookupCandidates(rawPhone: unknown, rawCountryCode?: unknown): string[] {
  const candidates = new Set<string>();
  const parsed = parsePhoneInput(rawPhone, rawCountryCode);
  if (parsed.ok) {
    candidates.add(parsed.phone);
    candidates.add(parsed.national);
    candidates.add(`0${parsed.national}`);
  }
  if (typeof rawPhone === 'string') {
    const raw = digitsOnly(rawPhone);
    if (raw) candidates.add(raw);
  }
  return Array.from(candidates);
}

/** عرض الرقم: +965 5123 4567 */
export function formatPhoneForDisplay(stored: string): string {
  const country = PHONE_COUNTRIES.find((c) =>
    stored.startsWith(c.dialCode) && c.lengths.includes(stored.length - c.dialCode.length)
  );
  if (!country) return stored;
  return `+${country.dialCode} ${stored.slice(country.dialCode.length)}`;
}
